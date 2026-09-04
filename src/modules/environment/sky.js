// Sky: an equirectangular radiance LUT (physically based single scattering, re-rendered only when the
// sun moves / weather changes; also feeds PMREM) + a full-resolution dome that adds the sun disc,
// moon with phase, stars, milky way and two wind-driven cloud layers with sun-lit edges.
import * as THREE from 'three';
import { ATMOSPHERE_GLSL } from './atmosphere.js';
import { CLOUD_GLSL, U } from './shaders.js';

const LUT_W = 512, LUT_H = 256;

const LUT_VERT = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const LUT_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform vec3 uSunDir, uMoonDir;
uniform vec3 uSunI, uMoonI;
uniform float uCloud;
uniform float uNight;
${ATMOSPHERE_GLSL}
void main() {
  float phi = (vUv.x - 0.5) * 2.0 * ATM_PI;
  float lat = (vUv.y - 0.5) * ATM_PI;
  vec3 dir = vec3(cos(phi) * cos(lat), sin(lat), sin(phi) * cos(lat));
  vec3 sdir = dir;
  sdir.y = max(sdir.y, 0.003);
  sdir = normalize(sdir);
  vec3 ro = vec3(0.0, atmRe + 150.0, 0.0);
  float tMax = atmSphere(ro, sdir, atmRa).y;
  vec3 L = atmScatter(ro, sdir, tMax, uSunDir, uSunI, 0.9);
  L += atmScatter(ro, sdir, tMax, uMoonDir, uMoonI, 0.9);
  // night floor: airglow + light-pollution horizon glow (keeps the night sky deep blue, never black)
  L += uNight * (vec3(0.0030, 0.0046, 0.0105) * (0.75 + 0.25 * (1.0 - sdir.y)) + vec3(0.020, 0.013, 0.007) * exp(-sdir.y * 7.0));
  // overcast: desaturate and flatten toward a bright-zenith grey
  float lum = dot(L, vec3(0.2126, 0.7152, 0.0722));
  vec3 over = vec3(lum) * (0.85 + 0.55 * sdir.y) * vec3(0.97, 0.985, 1.0);
  L = mix(L, over, uCloud * uCloud * 0.85);
  if (dir.y < 0.0) {
    float k = smoothstep(0.0, 0.6, -dir.y);
    L *= mix(0.9, 0.32, k) * vec3(0.95, 0.93, 0.9);
  }
  gl_FragColor = vec4(L, 1.0);
}
`;

const DOME_VERT = /* glsl */`
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}
`;

const DOME_FRAG = /* glsl */`
precision highp float;
varying vec3 vDir;
uniform sampler2D tSky;
uniform vec3 uSunDir, uMoonDir, uLightDir;
uniform vec3 uSunDisc;      // sun disc radiance (transmitted)
uniform vec3 uMoonCol;
uniform float uNight;       // 0 day .. 1 night
uniform float uTime;
uniform float uCloudiness;
uniform vec3 uCloudSun;     // sun radiance reaching the clouds (irradiance/pi * albedo)
uniform vec3 uCloudAmb;     // sky ambient at the clouds
uniform float uCirrus;
uniform vec2 uCirrusOff;
uniform vec2 uWindDir;
uniform float uPlanet;
uniform float uStarBright;
${ATMOSPHERE_GLSL}
${CLOUD_GLSL}

vec2 equirectUv(vec3 d) {
  return vec2(atan(d.z, d.x) * 0.15915494309 + 0.5, asin(clamp(d.y, -1.0, 1.0)) * 0.31830988618 + 0.5);
}
vec3 hash3(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return fract(sin(p) * 43758.5453123);
}
float hgPhase(float mu, float g) { float g2 = g * g; return (1.0 - g2) / pow(1.0 + g2 - 2.0 * g * mu, 1.5); }

vec3 stars(vec3 d) {
  // 3D cell hashing of the direction: crisp sub-degree points, twinkling, colour temperature variety
  vec3 col = vec3(0.0);
  for (int layer = 0; layer < 2; layer++) {
    float s = layer == 0 ? 140.0 : 70.0;
    vec3 p = d * s + vec3(float(layer) * 17.3);
    vec3 c = floor(p);
    vec3 h = hash3(c);
    float thr = layer == 0 ? 0.075 : 0.09;
    if (h.x < thr) {
      vec3 sp = c + 0.5 + (h - 0.5) * 0.7;
      float dist = length(p - sp);
      float r = layer == 0 ? 0.11 : 0.19;
      float b = smoothstep(r, 0.0, dist);
      float mag = pow(h.y, 2.2);
      float tw = 0.75 + 0.25 * sin(uTime * (2.0 + h.z * 4.0) + h.z * 40.0);
      vec3 tint = mix(vec3(0.75, 0.82, 1.0), vec3(1.0, 0.86, 0.68), h.z);
      col += tint * b * mag * tw * (layer == 0 ? 1.0 : 1.9);
    }
  }
  return col;
}

vec4 cumulus(vec3 dir, vec3 sky, vec3 camPos) {
  float H = uEnvCloudB.z;
  vec3 ro = vec3(0.0, uPlanet, 0.0);
  float t = atmSphere(ro, dir, uPlanet + H).y;
  vec2 wp = camPos.xz + dir.xz * t;
  float d = envCloudDensity(wp);
  if (d <= 0.002) return vec4(0.0);
  vec3 L = uLightDir;
  vec2 st = L.xz / max(L.y, 0.2);
  float stl = length(st);
  st *= (min(stl, 1.5) / max(stl, 1e-3)) * 240.0;
  float d1 = envCloudDensity(wp + st);
  float occ = clamp(d1 * 1.3 - d * 0.25, 0.0, 1.6);
  float lit = exp(-occ * 2.2);
  float alpha = 1.0 - exp(-d * 5.0);
  float mu = dot(dir, L);
  float hg = hgPhase(mu, 0.58);
  vec3 sunL = uCloudSun;
  vec3 amb = uCloudAmb;
  // thin edges / tops bright and sun-lit, dense undersides shaded grey; forward-scatter silver lining
  vec3 bright = sunL * (0.5 + 0.5 * lit) + amb * 0.4;
  vec3 core = amb * 0.85 + sunL * (0.08 + 0.18 * lit);
  vec3 col = mix(bright, core, smoothstep(0.1, 0.8, d));
  col += sunL * hg * 0.05 * exp(-d * 3.0) * (0.3 + 0.7 * lit);
  col *= mix(1.0, 0.7, uCloudiness * uCloudiness * d);
  float haze = 1.0 - exp(-t * 0.000028);
  col = mix(col, sky, haze);
  alpha *= 1.0 - haze * 0.55;
  return vec4(col, alpha);
}

vec4 cirrus(vec3 dir, vec3 sky, vec3 camPos) {
  if (uCirrus <= 0.001) return vec4(0.0);
  float H = 6500.0;
  vec3 ro = vec3(0.0, uPlanet, 0.0);
  float t = atmSphere(ro, dir, uPlanet + H).y;
  vec2 wp = camPos.xz + dir.xz * t + uCirrusOff;
  vec2 w = uWindDir;
  vec2 uvr = vec2(dot(wp, w), dot(wp, vec2(-w.y, w.x)));
  vec2 uv = uvr * vec2(1.0 / 26000.0, 1.0 / 9000.0);
  vec4 n = texture2D(uEnvNoise, uv);
  vec4 n2 = texture2D(uEnvNoise, uv * 2.9 + vec2(0.41, 0.17));
  float s = n.r * 0.4 + n.g * 0.3 + n2.b * 0.2 + n2.a * 0.1;
  float d = smoothstep(0.50, 0.78, s) * uCirrus;
  if (d <= 0.002) return vec4(0.0);
  float mu = dot(dir, uLightDir);
  float hg = hgPhase(mu, 0.5);
  vec3 col = uCloudSun * (0.75 + 0.03 * hg) + uCloudAmb * 0.55;
  float haze = 1.0 - exp(-t * 0.00002);
  col = mix(col, sky, haze);
  return vec4(col, d * 0.5 * (1.0 - haze * 0.5));
}

void main() {
  vec3 dir = normalize(vDir);
  vec3 sky = texture2D(tSky, equirectUv(dir)).rgb;
  vec3 col = sky;
  float up = smoothstep(-0.02, 0.12, dir.y);

  // stars + milky way (fade with daylight and near the horizon)
  if (uNight > 0.001 && dir.y > -0.05) {
    vec3 mwAxis = normalize(vec3(0.32, 0.5, 0.81));
    float b = dot(dir, mwAxis);
    float band = exp(-b * b * 22.0);
    vec2 mwUv = vec2(atan(dir.z, dir.x) * 0.5, dir.y * 0.9) * 0.55;
    vec4 mwN = texture2D(uEnvNoise, mwUv);
    float mw = band * (0.25 + 0.75 * smoothstep(0.35, 0.8, mwN.r * 0.5 + mwN.g * 0.3 + mwN.b * 0.2));
    col += vec3(0.68, 0.74, 1.0) * mw * 0.0075 * uNight * up;
    col += stars(dir) * uStarBright * uNight * up;
  }

  // moon with phase (lit by the real sun direction) and maria from noise
  {
    float mm = dot(dir, uMoonDir);
    float cosR = cos(0.0122);
    if (mm > cosR - 0.002) {
      vec3 t = normalize(cross(uMoonDir, vec3(0.0, 1.0, 0.0)));
      vec3 bb = cross(uMoonDir, t);
      vec3 o = dir - uMoonDir * mm;
      float sinR = sin(0.0122);
      float x = dot(o, t) / sinR, y = dot(o, bb) / sinR;
      float r2 = x * x + y * y;
      float disc = 1.0 - smoothstep(0.9, 1.02, sqrt(r2));
      float z = sqrt(max(0.0, 1.0 - min(r2, 1.0)));
      vec3 n = t * x + bb * y - uMoonDir * z;
      float lit = max(dot(n, uSunDir), 0.0);
      vec4 mn = texture2D(uEnvNoise, vec2(x, y) * 0.5 + 0.5);
      float albedo = 0.55 + 0.45 * smoothstep(0.35, 0.7, mn.g * 0.6 + mn.b * 0.4);
      vec3 moon = uMoonCol * (lit * albedo * 1.4 + 0.02);
      col = mix(col, moon, disc * smoothstep(-0.03, 0.05, dir.y));
    }
    // soft halo in haze
    col += uMoonCol * pow(max(mm, 0.0), 900.0) * 0.06 * up;
  }

  // sun disc + aureole
  {
    float mu = dot(dir, uSunDir);
    float disc = smoothstep(cos(0.0055), cos(0.0043), mu);
    col += uSunDisc * (disc * 12.0 + pow(max(mu, 0.0), 1800.0) * 0.8 + pow(max(mu, 0.0), 300.0) * 0.14 + pow(max(mu, 0.0), 80.0) * 0.035) * smoothstep(-0.06, 0.0, dir.y);
  }

  // clouds (only above the horizon; tiny lift avoids the seam)
  if (dir.y > 0.004) {
    vec3 camPos = cameraPosition;
    vec4 ci = cirrus(dir, sky, camPos);
    col = mix(col, ci.rgb, ci.a);
    vec4 cu = cumulus(dir, sky, camPos);
    col = mix(col, cu.rgb, cu.a);
  }
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const CLOUDMAP_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform vec4 uEnvCloudC;
${CLOUD_GLSL}
void main() {
  vec2 p = uEnvCloudC.xy + (vUv - 0.5) / uEnvCloudC.z;
  float d = envCloudDensity(p);
  gl_FragColor = vec4(1.0 - exp(-d * 3.5), d, 0.0, 1.0);
}
`;

/** Cloud thickness map over a fixed world square (for cloud shadows in every lit material). */
export class CloudMap {
  constructor(ctx, size = 256, worldSize = 6000) {
    this.renderer = ctx.renderer;
    this.rt = new THREE.WebGLRenderTarget(size, size, {
      type: THREE.UnsignedByteType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping, depthBuffer: false, stencilBuffer: false, generateMipmaps: false,
    });
    this.rt.texture.name = 'env-cloud-map';
    U.cloudC.value.set(0, 0, 1 / worldSize, 0);
    U.cloudMap.value = this.rt.texture;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: LUT_VERT, fragmentShader: CLOUDMAP_FRAG, depthTest: false, depthWrite: false,
      uniforms: { uEnvNoise: U.noise, uEnvCloudA: U.cloudA, uEnvCloudC: U.cloudC },
    });
    this.mat.userData.envSkip = true;
    this.scene = new THREE.Scene();
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    quad.frustumCulled = false;
    this.scene.add(quad);
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  render() {
    const r = this.renderer;
    const prevRT = r.getRenderTarget();
    const prevTone = r.toneMapping;
    r.toneMapping = THREE.NoToneMapping;
    r.setRenderTarget(this.rt);
    r.render(this.scene, this.cam);
    r.setRenderTarget(prevRT);
    r.toneMapping = prevTone;
  }
  dispose() { this.rt.dispose(); this.mat.dispose(); }
}

export class Sky {
  constructor(ctx, noiseTex) {
    this.ctx = ctx;
    this.renderer = ctx.renderer;
    this.lut = new THREE.WebGLRenderTarget(LUT_W, LUT_H, {
      type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      wrapS: THREE.RepeatWrapping, wrapT: THREE.ClampToEdgeWrapping, depthBuffer: false, stencilBuffer: false, generateMipmaps: false,
    });
    this.lut.texture.mapping = THREE.EquirectangularReflectionMapping;
    this.lut.texture.name = 'env-sky-lut';
    this.lutMat = new THREE.ShaderMaterial({
      vertexShader: LUT_VERT, fragmentShader: LUT_FRAG, depthTest: false, depthWrite: false,
      uniforms: {
        uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uMoonDir: { value: new THREE.Vector3(0, -1, 0) },
        uSunI: { value: new THREE.Vector3(5, 5, 5) }, uMoonI: { value: new THREE.Vector3(0, 0, 0) },
        uCloud: { value: 0 }, uNight: { value: 0 },
      },
    });
    this.lutMat.userData.envSkip = true;
    this.lutScene = new THREE.Scene();
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.lutMat);
    quad.frustumCulled = false;
    this.lutScene.add(quad);
    this.lutCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.mat = new THREE.ShaderMaterial({
      vertexShader: DOME_VERT, fragmentShader: DOME_FRAG, side: THREE.BackSide, depthWrite: false, depthTest: true, fog: false,
      uniforms: {
        tSky: { value: this.lut.texture },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uMoonDir: { value: new THREE.Vector3(0, -1, 0) }, uLightDir: { value: new THREE.Vector3(0, 1, 0) },
        uSunDisc: { value: new THREE.Color(1, 1, 1) }, uMoonCol: { value: new THREE.Color(1, 0.97, 0.9) },
        uNight: { value: 0 }, uTime: { value: 0 }, uCloudiness: { value: 0.3 },
        uCloudSun: { value: new THREE.Color(1, 1, 1) }, uCloudAmb: { value: new THREE.Color(0.2, 0.25, 0.35) },
        uCirrus: { value: 0.3 }, uCirrusOff: { value: new THREE.Vector2() }, uWindDir: { value: new THREE.Vector2(1, 0) },
        uPlanet: { value: 320000 }, uStarBright: { value: 0.9 },
        uEnvNoise: U.noise, uEnvCloudA: U.cloudA, uEnvCloudB: U.cloudB,
      },
    });
    this.mat.userData.envSkip = true;
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(10, 48, 32), this.mat);
    this.mesh.name = 'sky-dome';
    this.mesh.renderOrder = -1000;
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false; this.mesh.receiveShadow = false;
    this.mesh.matrixAutoUpdate = true;
    ctx.group.add(this.mesh);
    U.noise.value = noiseTex;
    U.sky.value = this.lut.texture;
  }

  /** Render the LUT (call only when sun/weather changed). */
  renderLut(sunDir, moonDir, sunI, moonI, cloud, night) {
    const u = this.lutMat.uniforms;
    u.uSunDir.value.copy(sunDir); u.uMoonDir.value.copy(moonDir);
    u.uSunI.value.fromArray(sunI); u.uMoonI.value.fromArray(moonI);
    u.uCloud.value = cloud; u.uNight.value = night;
    const r = this.renderer;
    const prevRT = r.getRenderTarget();
    const prevTone = r.toneMapping;
    const prevAuto = r.autoClear;
    r.toneMapping = THREE.NoToneMapping;
    r.autoClear = true;
    r.setRenderTarget(this.lut);
    r.render(this.lutScene, this.lutCam);
    r.setRenderTarget(prevRT);
    r.toneMapping = prevTone;
    r.autoClear = prevAuto;
  }

  update(camPos) { this.mesh.position.copy(camPos); }

  dispose() {
    this.ctx.group.remove(this.mesh);
    this.mesh.geometry.dispose(); this.mat.dispose(); this.lutMat.dispose(); this.lut.dispose();
  }
}
