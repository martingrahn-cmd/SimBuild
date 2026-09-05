// Planar sea/river water at sea level: half-res planar reflection (oblique clip), depth-tinted body colour from the
// terrain height texture, shore transparency + animated foam, scrolling ripple normals, sun glints, scene fog.
import * as THREE from 'three';
import { LAYERS, RENDER_ORDER } from '../../core/constants.js';

const VERT = /* glsl */`
uniform mat4 uTexMat;
varying vec4 vRefUv;
varying vec3 vWPos;
#include <fog_pars_vertex>
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWPos = wp.xyz;
  vRefUv = uTexMat * wp;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const FRAG = /* glsl */`
uniform sampler2D tReflect;
uniform sampler2D uRipple;
uniform sampler2D uMacro;
uniform highp sampler2D uHeightTex;
uniform float uTime;
uniform float uWorldMin;
uniform float uCell;
uniform float uRes;
uniform float uSeaLevel;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uLightDir;
uniform vec3 uLightColor;
uniform sampler2D uSeaMask;
uniform vec3 uSkyColor;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform float uReflStrength;
uniform float uDay;
varying vec4 vRefUv;
varying vec3 vWPos;
#include <common>
#include <fog_pars_fragment>
#ifndef ENV_WORLDPOS
uniform sampler2D uEnvSky;
#endif
uniform float uHasEnvSky;
uniform vec2 uEdgeFade;

float terrainH(vec2 p) {
  // outside the map the sea continues: fade the (clamped) edge column to deep water over 80 m
  float worldMax = uWorldMin + uCell * (uRes - 1.0);
  float outside = max(max(uWorldMin - p.x, p.x - worldMax), max(uWorldMin - p.y, p.y - worldMax));
  float outK = smoothstep(0.0, 80.0, outside);
  vec2 g = (p - uWorldMin) / uCell;
  g = clamp(g, vec2(0.0), vec2(uRes - 1.001));
  ivec2 i = ivec2(floor(g));
  vec2 f = g - vec2(i);
  float h00 = texelFetch(uHeightTex, i, 0).r;
  float h10 = texelFetch(uHeightTex, i + ivec2(1, 0), 0).r;
  float h01 = texelFetch(uHeightTex, i + ivec2(0, 1), 0).r;
  float h11 = texelFetch(uHeightTex, i + ivec2(1, 1), 0).r;
  return mix(mix(mix(h00, h10, f.x), mix(h01, h11, f.x), f.y), -45.0, outK);
}

void main() {
  vec3 toCam = cameraPosition - vWPos;
  float dist = length(toCam);
  vec3 V = toCam / max(dist, 1e-3);
  vec2 p = vWPos.xz;
  float depth = uSeaLevel - terrainH(p);
  if (depth < -0.05) discard;

  // ripples: three scrolling layers, damped with distance and in the shallows
  vec3 n1 = texture2D(uRipple, p / 21.0 + uTime * vec2(0.020, 0.012)).xyz * 2.0 - 1.0;
  vec3 n2 = texture2D(uRipple, p / 7.7 - uTime * vec2(0.018, 0.027) + 0.3).xyz * 2.0 - 1.0;
  vec3 n3 = texture2D(uRipple, p / 90.0 + uTime * vec2(0.005, -0.004)).xyz * 2.0 - 1.0;
  float att = 1.0 / (1.0 + dist / 180.0);
  float farW = smoothstep(150.0, 1200.0, dist);
  vec2 tilt = mix(n1.xy * 0.55 + n2.xy * 0.35 + n3.xy * 0.7, n3.xy * 0.5, farW) * 0.22 * att;
  tilt *= 0.45 + 0.55 * smoothstep(0.0, 3.0, depth);
  vec3 N = normalize(vec3(tilt.x, 1.0, tilt.y));

  // planar reflection (geometry, alpha-masked) over the sky radiance LUT (equirect) or a flat sky colour
  vec4 ruv = vRefUv;
  ruv.xy += tilt * 0.35 * ruv.w;   // small: a large offset scatters the reflected bank into confetti
  vec4 rt = texture2DProj(tReflect, ruv);
  vec3 Nsky = normalize(vec3(tilt.x * 2.5, 1.0, tilt.y * 2.5));   // facets reflect higher (bluer) sky than the mean plane
  vec3 R = reflect(-V, Nsky);
  R.y = max(R.y, 0.03);
  R = normalize(R);
  vec2 suv = vec2(atan(R.z, R.x) * 0.15915494309 + 0.5, asin(clamp(R.y, -1.0, 1.0)) * 0.31830988618 + 0.5);
  vec3 skyRefl = uHasEnvSky > 0.5 ? texture2D(uEnvSky, suv).rgb : uSkyColor * (0.9 + 0.6 * (1.0 - R.y));
  vec3 refl = mix(skyRefl, rt.rgb, clamp(rt.a, 0.0, 1.0)) * uReflStrength;

  // body colour: absorption with depth, lit by sky + sun
  float absorb = 1.0 - exp(-depth * 0.22);
  vec3 body = mix(uShallowColor, uDeepColor, absorb);
  vec3 light = uSkyColor * 0.85 + uSunColor * 0.35 * max(0.0, uSunDir.y);
  body *= light;

  float NdV = max(0.0, dot(N, V));
  float F = 0.02 + 0.98 * pow(1.0 - NdV, 5.0);
  vec3 col = mix(body, refl, clamp(F * 0.9 + 0.24, 0.0, 0.93));

  // sun / moon glints (the environment's current light: sun by day, moon at night)
  vec3 H = normalize(uLightDir + V);
  float NdH = max(0.0, dot(N, H));
  // glints: tight near the camera, a broad soft glitter path further out (no per-pixel confetti at 100-400 m)
  float midW = smoothstep(40.0, 320.0, dist);
  float spec = pow(NdH, mix(420.0, 70.0, max(midW, farW))) * mix(2.2, 0.4, max(midW, farW)) + pow(NdH, 24.0) * 0.05;
  col += uLightColor * spec * smoothstep(-0.02, 0.15, uLightDir.y);

  // shore foam + waterline
  float fn = texture2D(uMacro, p / 26.0 + uTime * vec2(0.012, 0.004)).r * 0.6
           + texture2D(uMacro, p / 8.5 - uTime * vec2(0.02, 0.011)).g * 0.4;
  float sea = texture2D(uSeaMask, (p - uWorldMin) / (uCell * (uRes - 1.0))).r;
  float band = smoothstep(2.4, 0.0, depth) * (0.25 + 0.75 * sea);
  float wave = 0.5 + 0.5 * sin(depth * 3.2 - uTime * 1.3 + fn * 4.0);
  float foam = band * smoothstep(0.45, 0.75, fn * 0.7 + wave * 0.3 + band * 0.15);
  float edge = smoothstep(0.3, 0.0, depth) * smoothstep(0.35, 0.65, fn) * (0.3 + 0.7 * sea);
  vec3 foamCol = vec3(0.85, 0.88, 0.88) * (uSkyColor * 0.5 + uSunColor * 0.4 * max(0.0, uSunDir.y) + 0.01);
  float foamK = clamp(foam * 0.6 + edge * 0.18, 0.0, 1.0);
  col = mix(col, foamCol, foamK);

  // horizon: blend into the sky so the plane edge / far clip never shows
  vec3 hd = -V; hd.y = 0.012; hd = normalize(hd);
  vec2 huv = vec2(atan(hd.z, hd.x) * 0.15915494309 + 0.5, asin(hd.y) * 0.31830988618 + 0.5);
  vec3 horizonCol = (uHasEnvSky > 0.5 ? texture2D(uEnvSky, huv).rgb : uSkyColor) * 0.9;   // matches the sky dome just below the horizon
  col = mix(col, horizonCol, smoothstep(1500.0, 4200.0, dist));

  float alpha = clamp(depth * 0.75 + 0.15, 0.0, 1.0);
  alpha = mix(alpha, 1.0, F);
  alpha = max(alpha, foamK * 0.9);
  alpha = mix(alpha, 1.0, smoothstep(uEdgeFade.x, uEdgeFade.y, dist));   // far: fully opaque (colour already converged to the sky)
  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export class Water {
  constructor(data, { ripple, macro, seaMask = null, size = 1024, mainCamera, seaLevel = 0, extent = 11000, onReflection = null }) {
    this.onReflection = onReflection;
    this.data = data;
    this.mainCamera = mainCamera;
    this.rt = new THREE.WebGLRenderTarget(size, Math.round(size / 2), { type: THREE.HalfFloatType, samples: 0, depthBuffer: true });
    this.rt.texture.minFilter = THREE.LinearFilter;
    this.rt.texture.magFilter = THREE.LinearFilter;
    this.rt.texture.generateMipmaps = false;
    this.texMat = new THREE.Matrix4();
    this.uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      tReflect: { value: null }, uRipple: { value: ripple }, uMacro: { value: macro }, uHeightTex: { value: data.heightTex },
      uTexMat: { value: this.texMat }, uTime: { value: 0 },
      uWorldMin: { value: -data.half }, uCell: { value: data.cell }, uRes: { value: data.res }, uSeaLevel: { value: seaLevel },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunColor: { value: new THREE.Color(1, 0.95, 0.85) },
      uLightDir: { value: new THREE.Vector3(0, 1, 0) }, uLightColor: { value: new THREE.Color(1, 0.95, 0.85) }, uSeaMask: { value: null },
      uSkyColor: { value: new THREE.Color(0.55, 0.7, 0.9) },
      uDeepColor: { value: new THREE.Color(0.014, 0.05, 0.085) }, uShallowColor: { value: new THREE.Color(0.09, 0.23, 0.245) },
      uReflStrength: { value: 1.0 }, uDay: { value: 1 }, uHasEnvSky: { value: 0 }, uEdgeFade: { value: new THREE.Vector2(2300, 4400) },
    }]);
    this.uniforms.tReflect.value = this.rt.texture;
    this.uniforms.uSeaMask.value = seaMask;
    this.uniforms.uHeightTex.value = data.heightTex;
    this.uniforms.uTexMat.value = this.texMat;
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: true, fog: true, side: THREE.FrontSide,
    });
    this.material.name = 'terrain-water';
    // a disc that follows the camera in xz: the far edge sits at a constant distance (< camera far) where the
    // shader has faded the water into the sky, so neither the plane edge nor the far clip can ever show
    this.radius = extent * 0.5;
    const geo = new THREE.CircleGeometry(this.radius, 96);
    geo.rotateX(-Math.PI / 2);
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.name = 'water';
    this.mesh.position.y = seaLevel;
    this.mesh.renderOrder = RENDER_ORDER.WATER;
    this.mesh.layers.enable(LAYERS.WATER);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.mesh.updateMatrixWorld();
    this.mesh.raycast = () => {};

    this.reflCam = new THREE.PerspectiveCamera();
    this.reflCam.layers.mask = 0xffffffff;
    this.reflCam.layers.disable(LAYERS.WATER);
    this.reflCam.layers.disable(LAYERS.HELPERS);
    this._plane = new THREE.Plane();
    this._normal = new THREE.Vector3(0, 1, 0);
    this._v = new THREE.Vector3(); this._t = new THREE.Vector3(); this._look = new THREE.Vector3(); this._camPos = new THREE.Vector3();
    this._rot = new THREE.Matrix4();
    this._clip = new THREE.Vector4(); this._q = new THREE.Vector4();
    this._clearCol = new THREE.Color();
    this._lastCamM = new THREE.Matrix4(); this._lastProjM = new THREE.Matrix4();
    this._dirty = true; this._animDirty = false; this._frame = 0;
    this.enabled = true;
    this.mesh.onBeforeRender = (renderer, scene, camera) => this._renderReflection(renderer, scene, camera);
  }
  setSun(dir, color, skyColor, day, lightDir = dir, lightColor = color) {
    this.uniforms.uSunDir.value.copy(dir);
    this.uniforms.uSunColor.value.copy(color);
    this.uniforms.uLightDir.value.copy(lightDir);
    this.uniforms.uLightColor.value.copy(lightColor);
    this.uniforms.uSkyColor.value.copy(skyColor);
    this.uniforms.uDay.value = day;
  }
  update(dt) { if (dt > 0) { this.uniforms.uTime.value += dt; this._animDirty = true; } }
  /** per frame: keep the disc centred under the camera (xz only) */
  follow(camera) {
    const p = camera.position;
    if (Math.abs(this.mesh.position.x - p.x) > 4 || Math.abs(this.mesh.position.z - p.z) > 4) {
      this.mesh.position.x = p.x; this.mesh.position.z = p.z;
      this.mesh.updateMatrixWorld();
    }
  }
  /** mark the reflection stale (terrain edit, weather/sun change) */
  invalidate() { this._dirty = true; }
  /** call each frame: picks up the environment's equirect sky LUT if it has been injected (uEnvSky) */
  refreshSky() {
    const u = this.uniforms.uEnvSky;
    this.uniforms.uHasEnvSky.value = (u && u.value && u.value.isTexture) ? 1 : 0;
  }

  _renderReflection(renderer, scene, camera) {
    if (!this.enabled || camera !== this.mainCamera) return;
    const seaY = this.mesh.position.y;
    this._camPos.setFromMatrixPosition(camera.matrixWorld);
    if (this._camPos.y <= seaY + 0.5) return; // below the surface: keep the last reflection
    // refresh policy: only when something changed (camera, water time, explicit invalidate) or every 8th frame
    this._frame = (this._frame || 0) + 1;
    const camSame = this._lastCamM.equals(camera.matrixWorld) && this._lastProjM.equals(camera.projectionMatrix);
    if (camSame && !this._dirty && !this._animDirty && (this._frame % 8) !== 0) return;
    this._lastCamM.copy(camera.matrixWorld); this._lastProjM.copy(camera.projectionMatrix);
    this._dirty = false; this._animDirty = false;
    const rc = this.reflCam;
    // mirror the camera across y = seaY
    this._v.copy(this._camPos); this._v.y = 2 * seaY - this._v.y;
    this._rot.extractRotation(camera.matrixWorld);
    this._look.set(0, 0, -1).applyMatrix4(this._rot).add(this._camPos);
    this._look.y = 2 * seaY - this._look.y;
    rc.position.copy(this._v);
    rc.up.set(0, 1, 0).applyMatrix4(this._rot); rc.up.y = -rc.up.y;
    rc.lookAt(this._look);
    rc.near = camera.near; rc.far = camera.far;
    rc.updateMatrixWorld();
    rc.projectionMatrix.copy(camera.projectionMatrix);
    rc.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
    this.texMat.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    this.texMat.multiply(rc.projectionMatrix).multiply(rc.matrixWorldInverse);
    // oblique near plane = water plane (Lengyel)
    this._plane.setFromNormalAndCoplanarPoint(this._normal, this.mesh.position).applyMatrix4(rc.matrixWorldInverse);
    const cp = this._clip.set(this._plane.normal.x, this._plane.normal.y, this._plane.normal.z, this._plane.constant);
    const pm = rc.projectionMatrix, q = this._q;
    q.x = (Math.sign(cp.x) + pm.elements[8]) / pm.elements[0];
    q.y = (Math.sign(cp.y) + pm.elements[9]) / pm.elements[5];
    q.z = -1.0;
    q.w = (1.0 + pm.elements[10]) / pm.elements[14];
    cp.multiplyScalar(2.0 / cp.dot(q));
    pm.elements[2] = cp.x; pm.elements[6] = cp.y; pm.elements[10] = cp.z + 1.0 - 0.002; pm.elements[14] = cp.w;

    this.mesh.visible = false;
    if (this.onReflection) this.onReflection(true);
    const prevRT = renderer.getRenderTarget();
    const prevXr = renderer.xr.enabled;
    const prevShadow = renderer.shadowMap.autoUpdate;
    renderer.xr.enabled = false;
    renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(this.rt);
    renderer.state.buffers.depth.setMask(true);
    renderer.getClearColor(this._clearCol);
    const prevAlpha = renderer.getClearAlpha();
    renderer.setClearColor(0x000000, 0);     // alpha 0 = "no geometry" → sky LUT fallback in the shader
    renderer.clear();
    renderer.render(scene, rc);
    renderer.setClearColor(this._clearCol, prevAlpha);
    renderer.xr.enabled = prevXr;
    renderer.shadowMap.autoUpdate = prevShadow;
    renderer.setRenderTarget(prevRT);
    const vp = camera.viewport;
    if (vp !== undefined) renderer.state.viewport(vp);
    if (this.onReflection) this.onReflection(false);
    this.mesh.visible = true;
  }
  dispose() { this.rt.dispose(); this.material.dispose(); this.mesh.geometry.dispose(); }
}

/** R8 mask (world-aligned): 1 on the open sea / estuary (surf), 0 on the river and lakes */
export function makeSeaMask(gen, size = 64) {
  const data = new Uint8Array(size * size);
  const res = gen.res, cell = gen.cell, half = gen.size / 2;
  for (let ty = 0; ty < size; ty++) for (let tx = 0; tx < size; tx++) {
    const x = -half + (tx + 0.5) * (gen.size / size), z = -half + (ty + 0.5) * (gen.size / size);
    const iz = Math.max(0, Math.min(res - 1, Math.round((z + half) / cell)));
    const ix = Math.max(0, Math.min(res - 1, Math.round((x + half) / cell)));
    const coastX = gen.coast ? gen.coast.xAt[iz] : -1e9;
    let v = x < coastX + 40 ? 1 : 0;
    if (!v && gen.river && x < -420) {
      const dr = Math.abs(z - gen.river.zAt[ix]);
      v = dr < gen.river.halfWidth[ix] + 60 ? Math.max(0, Math.min(1, (-420 - x) / 200)) : 0;
    }
    data[ty * size + tx] = Math.round(v * 255);
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RedFormat, THREE.UnsignedByteType);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}

/** tileable ripple normal map (fbm-based) */
export function makeRippleNormal(noise, size = 256, strength = 1.6) {
  const h = new Float32Array(size * size);
  const sc = 6;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    const a = noise.fbm(u * sc, v * sc * 1.7, 4, 2.2, 0.55), b = noise.fbm((u + 1) * sc, (v + 1) * sc * 1.7, 4, 2.2, 0.55);
    const w = Math.min(1 - Math.abs(u * 2 - 1), 1 - Math.abs(v * 2 - 1));
    const wk = w * w * (3 - 2 * w);
    h[y * size + x] = a * wk + b * (1 - wk);
  }
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const l = h[y * size + ((x - 1 + size) % size)], r = h[y * size + ((x + 1) % size)];
    const u = h[((y - 1 + size) % size) * size + x], d = h[((y + 1) % size) * size + x];
    const nx = (l - r) * strength, ny = (u - d) * strength;
    const len = Math.hypot(nx, ny, 1);
    const i = (y * size + x) * 4;
    data[i] = (nx / len * 0.5 + 0.5) * 255; data[i + 1] = (ny / len * 0.5 + 0.5) * 255; data[i + 2] = (1 / len * 0.5 + 0.5) * 255; data[i + 3] = 255;
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}
