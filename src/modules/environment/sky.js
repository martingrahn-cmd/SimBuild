// Sky: an equirectangular radiance LUT (physically based single scattering, re-rendered only when the
// sun moves / weather changes) plus a small sun-masked "ambient" LUT that feeds PMREM (so shadows stay
// sky-blue at golden hour instead of turning Mie-orange), and a full-resolution dome that adds the sun
// disc, moon with phase, stars, milky way, a raymarched cumulus slab with Beer-Powder lighting and a
// wind-driven cirrus sheet, all attenuated by the same height fog the ground uses.
import * as THREE from 'three';
import { ATMOSPHERE_GLSL } from './atmosphere.js';
import { CLOUD_GLSL, U } from './shaders.js';

const LUT_W = 512, LUT_H = 256;
const AMB_W = 128, AMB_H = 64;

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
uniform float uAmbient;   // 1 = ambient pass: isotropic Mie (no aureole), used for PMREM only
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
  float g = mix(0.76, 0.0, uAmbient);
  vec3 L = atmScatterG(ro, sdir, tMax, uSunDir, uSunI, 0.5, g);
  L += atmScatterG(ro, sdir, tMax, uMoonDir, uMoonI, 0.5, g);
  // higher-order scattering: single scattering loses the blue zenith at low sun; real twilight skies keep a
  // blue vault until civil dusk. Elevation-driven floor, strongest at the zenith, gone by night.
  float twilight = smoothstep(-0.09, 0.10, uSunDir.y) * (1.0 - 0.6 * smoothstep(0.15, 0.5, uSunDir.y));
  L += twilight * vec3(0.024, 0.044, 0.10) * (0.35 + 0.65 * sdir.y);
  // night floor: airglow + light-pollution horizon glow (keeps the night sky deep blue, never black)
  L += uNight * (vec3(0.0060, 0.0092, 0.0210) * (0.75 + 0.25 * (1.0 - sdir.y)) + vec3(0.024, 0.016, 0.009) * exp(-sdir.y * 7.0));
  // overcast: desaturate and flatten toward a bright-zenith grey
  float lum = dot(L, vec3(0.2126, 0.7152, 0.0722));
  vec3 over = vec3(lum) * (0.85 + 0.55 * sdir.y) * vec3(0.97, 0.985, 1.0);
  L = mix(L, over, uCloud * uCloud * uCloud * 0.9);
  if (dir.y < 0.0) {
    // below the horizon: ground bounce (darker, slightly warm) for PMREM's lower hemisphere
    float k = smoothstep(0.0, 0.6, -dir.y);
    L *= mix(1.0, 0.30, k) * mix(vec3(1.0), vec3(0.95, 0.93, 0.9), k);
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
uniform float uFogDensity;
uniform vec4 uEnvFogA;
uniform vec3 uEnvFogSun;
uniform vec3 uEnvFogSunCol;
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

// Height-fog transmittance along a sky ray (same model as the ground fog chunk: exp height falloff).
// dist <= 0 means "to infinity" (the integral converges because of the height falloff).
float domeFogAmount(vec3 dir, float dist) {
  float k = uEnvFogA.x;
  float dy = max(dir.y, 0.002);
  float base = uFogDensity * exp(-max(cameraPosition.y - uEnvFogA.y, 0.0) * k);
  float integ = (dist > 0.0) ? (1.0 - exp(-k * dy * dist)) / (k * dy) : 1.0 / (k * dy);
  return 1.0 - exp(-base * integ);
}
vec3 fogInScatter(vec3 dir) {
  float mu = max(dot(dir, uEnvFogSun), 0.0);
  return uEnvFogSunCol * (pow(mu, 8.0) * uEnvFogA.z + mu * mu * 0.08);
}

vec3 stars(vec3 d) {
  // 3D cell hashing of the direction: sub-pixel points whose size and brightness follow a magnitude
  // distribution (many faint, few bright), slow twinkle, colour temperature variety
  vec3 col = vec3(0.0);
  for (int layer = 0; layer < 2; layer++) {
    float s = layer == 0 ? 150.0 : 95.0;
    vec3 p = d * s + vec3(float(layer) * 17.3);
    vec3 c = floor(p);
    vec3 h = hash3(c);
    float thr = layer == 0 ? 0.16 : 0.07;
    if (h.x < thr) {
      vec3 sp = c + 0.5 + (h - 0.5) * 0.7;
      float dist = length(p - sp);
      float mag = pow(h.y, 3.0);                      // 0..1, heavily skewed to faint
      float r = (layer == 0 ? 0.085 : 0.06) + 0.06 * mag;   // ~1.3 px at 1080p, brighter stars a little larger
      float b = smoothstep(r, r * 0.2, dist);
      float tw = 0.8 + 0.2 * sin(uTime * (1.5 + h.z * 3.0) + h.z * 40.0);
      vec3 tint = mix(vec3(0.75, 0.82, 1.0), vec3(1.0, 0.86, 0.68), h.z);
      col += tint * b * (0.35 + 3.0 * mag) * tw * (layer == 0 ? 1.0 : 1.6);
    }
  }
  return col;
}

// Raymarched cumulus slab [H0, H0 + TH] with a rounded vertical profile, detail erosion, single light
// sample toward the sun (Beer-Powder), height-graded ambient and aerial perspective.
vec4 cumulus(vec3 dir, vec3 sky, vec3 camPos) {
  float H0 = uEnvCloudB.z;
  const float TH = 560.0;
  vec3 ro = vec3(0.0, uPlanet, 0.0);
  float t0 = atmSphere(ro, dir, uPlanet + H0).y;
  float t1 = atmSphere(ro, dir, uPlanet + H0 + TH).y;
  if (t0 <= 0.0 || t1 <= t0) return vec4(0.0);
  t1 = min(t1, t0 + 6000.0);
  // coverage at slab entry and exit (grazing rays cross several km of cloud field), shadowing column at mid
  vec2 p0 = camPos.xz + dir.xz * t0;
  vec2 p1 = camPos.xz + dir.xz * t1;
  vec2 pm = 0.5 * (p0 + p1);
  float c0 = envCloudDensity(p0);
  float c1 = envCloudDensity(p1);
  if (max(c0, c1) <= 0.004) return vec4(0.0);
  vec3 L = uLightDir;
  // coverage of the column above along the light (self-shadowing)
  float sc = envCloudDensity(pm + L.xz / max(L.y, 0.15) * (TH * 0.5));
  float mu = dot(dir, L);
  float phase = 0.55 * hgPhase(mu, 0.55) + 0.45 * hgPhase(mu, -0.15);
  const int N = 5;
  float dt = (t1 - t0) / float(N);
  float T = 1.0;
  vec3 acc = vec3(0.0);
  float sigma = 0.012 * dt;
  for (int i = 0; i < N; i++) {
    float hn = (float(i) + 0.5) / float(N);              // height fraction within the slab
    float c = mix(c0, c1, hn);
    float top = 0.30 + 0.70 * c;                          // denser cells build taller towers
    float prof = smoothstep(0.0, 0.10, hn) * (1.0 - smoothstep(top - 0.30, top, hn));
    vec2 wp = camPos.xz + dir.xz * (t0 + (hn) * (t1 - t0));
    vec2 wuv = wp * uEnvCloudA.z + uEnvCloudA.xy * uEnvCloudA.z * 0.3;
    float det = texture2D(uEnvNoise, wuv * 7.0 + vec2(hn * 0.31, -hn * 0.17)).b * 0.7
              + texture2D(uEnvNoise, wuv * 23.0 + vec2(-hn * 0.5, hn * 0.23)).a * 0.3;   // cauliflower erosion
    float dens = clamp((c * 1.5 - 0.10 - det * 0.40 * (1.0 - hn * 0.5)) * prof, 0.0, 1.0);
    if (dens <= 0.001) continue;
    // light: optical depth of the column above toward the sun grows toward the base
    // (a low sun lights the undersides: the shadowing column flips from "above" to "below")
    float lowL = 1.0 - smoothstep(0.05, 0.3, L.y);
    float odL = (sc * 0.85 + c * 0.35) * mix(1.0 - hn, 0.25 + 0.6 * hn, lowL) * 2.6 + dens * 0.7;
    float direct = exp(-odL) * (1.0 - 0.5 * exp(-odL * 2.5));                 // Beer-Powder, sharp rims
    float ms = 0.3 * exp(-odL * 0.25) + 0.2 * exp(-odL * 0.06);                 // multiple scattering glow
    vec3 amb = uCloudAmb * mix(0.32, 1.0, hn) * (0.8 + 0.2 * (1.0 - dens));
    vec3 col = uCloudSun * (phase * 0.7 * direct + 0.36 * ms) + amb;
    float a = 1.0 - exp(-dens * sigma);
    acc += T * a * col;
    T *= 1.0 - a;
    if (T < 0.02) break;
  }
  float alpha = 1.0 - T;
  if (alpha <= 0.002) return vec4(0.0);
  vec3 col = acc / max(alpha, 1e-3);
  col *= mix(1.0, 0.72, uCloudiness * uCloudiness);
  // aerial perspective: distant clouds dissolve into the sky + height fog
  float haze = 1.0 - exp(-t0 * 0.000022);
  col = mix(col, sky, haze);
  alpha *= 1.0 - haze * 0.5;
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
    float band = exp(-b * b * 18.0);
    vec2 mwUv = vec2(atan(dir.z, dir.x) * 0.5, dir.y * 0.9) * 0.55;
    vec4 mwN = texture2D(uEnvNoise, mwUv);
    vec4 mwN2 = texture2D(uEnvNoise, mwUv * 3.7 + 0.3);
    float mw = band * (0.2 + 0.8 * smoothstep(0.3, 0.8, mwN.r * 0.5 + mwN.g * 0.3 + mwN2.b * 0.2)) * (0.6 + 0.4 * mwN2.a);
    col += vec3(0.72, 0.76, 1.0) * mw * 0.03 * uNight * up;
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

  // clouds (only above the horizon; tiny lift avoids the seam), each faded by the height fog along its ray
  if (dir.y > 0.004) {
    vec3 camPos = cameraPosition;
    vec4 ci = cirrus(dir, sky, camPos);
    col = mix(col, ci.rgb, ci.a);
    vec4 cu = cumulus(dir, sky, camPos);
    vec3 ro = vec3(0.0, uPlanet, 0.0);
    float tc = atmSphere(ro, dir, uPlanet + uEnvCloudB.z).y;
    float fc = domeFogAmount(dir, tc);
    col = mix(col, mix(cu.rgb, sky, fc), cu.a * (1.0 - fc * 0.85));
  }
  // in-scattered sun glow of the haze layer (the same term the ground fog adds)
  float fa = domeFogAmount(dir, -1.0);
  col += fogInScatter(dir) * fa;
  // below the horizon (beyond the terrain's far plane): the same fogged-ground colour the ground fog chunk
  // converges to (LUT at the horizon), by the fog amount over ~7 km, so the far edge never shows a seam
  if (dir.y < 0.004) {
    vec3 hd = normalize(vec3(dir.x, 0.004, dir.z));
    vec3 hz = texture2D(tSky, equirectUv(hd)).rgb + fogInScatter(hd);
    col = mix(col, hz, domeFogAmount(hd, 7000.0));
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
  gl_FragColor = vec4(smoothstep(0.2, 0.75, d), d, 0.0, 1.0);   // r: shadow mask (cloud-shaped, not a blur)
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

function makeLutTarget(w, h) {
  const rt = new THREE.WebGLRenderTarget(w, h, {
    type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    wrapS: THREE.RepeatWrapping, wrapT: THREE.ClampToEdgeWrapping, depthBuffer: false, stencilBuffer: false, generateMipmaps: false,
  });
  rt.texture.mapping = THREE.EquirectangularReflectionMapping;
  return rt;
}

export class Sky {
  constructor(ctx, noiseTex) {
    this.ctx = ctx;
    this.renderer = ctx.renderer;
    this.lut = makeLutTarget(LUT_W, LUT_H);
    this.lut.texture.name = 'env-sky-lut';
    this.lutAmb = makeLutTarget(AMB_W, AMB_H);
    this.lutAmb.texture.name = 'env-sky-ambient';
    this.lutMat = new THREE.ShaderMaterial({
      vertexShader: LUT_VERT, fragmentShader: LUT_FRAG, depthTest: false, depthWrite: false,
      uniforms: {
        uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uMoonDir: { value: new THREE.Vector3(0, -1, 0) },
        uSunI: { value: new THREE.Vector3(5, 5, 5) }, uMoonI: { value: new THREE.Vector3(0, 0, 0) },
        uCloud: { value: 0 }, uNight: { value: 0 }, uAmbient: { value: 0 },
      },
    });
    this.lutMat.userData.envSkip = true;
    this.lutScene = new THREE.Scene();
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.lutMat);
    quad.frustumCulled = false;
    this.lutScene.add(quad);
    this.lutCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.mat = new THREE.ShaderMaterial({
      vertexShader: DOME_VERT, fragmentShader: DOME_FRAG, side: THREE.BackSide, depthWrite: false, depthTest: true, depthFunc: THREE.LessEqualDepth, fog: false,
      uniforms: {
        tSky: { value: this.lut.texture },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uMoonDir: { value: new THREE.Vector3(0, -1, 0) }, uLightDir: { value: new THREE.Vector3(0, 1, 0) },
        uSunDisc: { value: new THREE.Color(1, 1, 1) }, uMoonCol: { value: new THREE.Color(1, 0.97, 0.9) },
        uNight: { value: 0 }, uTime: { value: 0 }, uCloudiness: { value: 0.3 },
        uCloudSun: { value: new THREE.Color(1, 1, 1) }, uCloudAmb: { value: new THREE.Color(0.2, 0.25, 0.35) },
        uCirrus: { value: 0.3 }, uCirrusOff: { value: new THREE.Vector2() }, uWindDir: { value: new THREE.Vector2(1, 0) },
        uPlanet: { value: 320000 }, uStarBright: { value: 0.9 }, uFogDensity: { value: 0.0001 },
        uEnvNoise: U.noise, uEnvCloudA: U.cloudA, uEnvCloudB: U.cloudB,
        uEnvFogA: U.fogA, uEnvFogSun: U.fogSun, uEnvFogSunCol: U.fogSunCol,
      },
    });
    this.mat.userData.envSkip = true;
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 20), this.mat);
    this.mesh.name = 'sky-dome';
    // drawn after the other opaques: the vertex shader pins depth to the far plane, so the (expensive)
    // cloud march only runs on pixels nothing else covered
    this.mesh.renderOrder = 900;
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false; this.mesh.receiveShadow = false;
    this.mesh.matrixAutoUpdate = true;
    ctx.group.add(this.mesh);
    U.noise.value = noiseTex;
    U.sky.value = this.lut.texture;
  }

  /** Render the radiance LUT and the sun-masked ambient LUT (call only when sun/weather changed). */
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
    u.uAmbient.value = 0;
    r.setRenderTarget(this.lut);
    r.render(this.lutScene, this.lutCam);
    u.uAmbient.value = 1;
    r.setRenderTarget(this.lutAmb);
    r.render(this.lutScene, this.lutCam);
    u.uAmbient.value = 0;
    r.setRenderTarget(prevRT);
    r.toneMapping = prevTone;
    r.autoClear = prevAuto;
  }

  update(camPos) { this.mesh.position.copy(camPos); }

  dispose() {
    this.ctx.group.remove(this.mesh);
    this.mesh.geometry.dispose(); this.mat.dispose(); this.lutMat.dispose(); this.lut.dispose(); this.lutAmb.dispose();
  }
}
