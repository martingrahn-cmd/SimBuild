// Rain streaks: one InstancedBufferGeometry draw, fully GPU-animated (no per-frame JS work).
// Streaks are denser and thinner near the camera, longer/wider with distance so they stay readable
// at 1080p; colour comes from the real sky zenith radiance (the LUT), lightly boosted so they read.
import * as THREE from 'three';

const VERT = /* glsl */`
attribute vec3 aSeed;     // xyz in [0,1)
attribute float aSpeed;   // 0.7..1.3
uniform float uTime;
uniform vec3 uOrigin;     // box centre (camera)
uniform vec3 uBox;        // box size
uniform vec3 uFall;       // fall direction (unit, wind-tilted)
uniform float uLen;
uniform float uIntensity;
varying float vA;
varying float vY;
void main() {
  float t = uTime * aSpeed * 24.0;
  vec3 p = aSeed;
  // r -> r^2 radial remap: more drops near the camera, tapering with distance
  vec2 rad = (p.xz - 0.5) * 2.0;
  rad *= length(rad);
  p.xz = rad * 0.5 + 0.5;
  p.y = fract(p.y - t / uBox.y);
  p.x = fract(p.x + uFall.x * t / uBox.x * 0.5);
  p.z = fract(p.z + uFall.z * t / uBox.z * 0.5);
  vec3 base = uOrigin + (p - 0.5) * uBox;
  // billboard: quad spans along the fall direction, faces the camera
  vec3 toCam = cameraPosition - base;
  float dist = length(toCam);
  vec3 side = normalize(cross(uFall, toCam / max(dist, 1e-3)));
  float w = 0.03 + dist * 0.0022;
  float len = uLen * aSpeed * (0.7 + dist * 0.012);
  vec3 wp = base + side * position.x * w + uFall * position.y * len;
  float fadeNear = smoothstep(0.5, 3.0, dist);
  float fadeFar = 1.0 - smoothstep(uBox.x * 0.32, uBox.x * 0.5, length(base.xz - uOrigin.xz));
  vA = uIntensity * fadeNear * fadeFar * (0.45 + 0.55 * aSeed.z);
  vY = position.y + 0.5;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`;
const FRAG = /* glsl */`
precision highp float;
uniform vec3 uColor;
varying float vA;
varying float vY;
void main() {
  float tip = sin(vY * 3.14159);   // soft ends
  gl_FragColor = vec4(uColor, vA * 0.75 * tip);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export class Rain {
  constructor(ctx, count = 9000) {
    const rng = ctx.rng.fork('rain');
    const geo = new THREE.InstancedBufferGeometry();
    const quad = new THREE.PlaneGeometry(1, 1);
    geo.index = quad.index; geo.attributes.position = quad.attributes.position; geo.attributes.uv = quad.attributes.uv;
    const seed = new Float32Array(count * 3), speed = new Float32Array(count);
    for (let i = 0; i < count; i++) { seed[i * 3] = rng.float(); seed[i * 3 + 1] = rng.float(); seed[i * 3 + 2] = rng.float(); speed[i] = 0.7 + rng.float() * 0.6; }
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 3));
    geo.setAttribute('aSpeed', new THREE.InstancedBufferAttribute(speed, 1));
    geo.instanceCount = count;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, fog: false,
      blending: THREE.NormalBlending,
      uniforms: {
        uTime: { value: 0 }, uOrigin: { value: new THREE.Vector3() }, uBox: { value: new THREE.Vector3(110, 80, 110) },
        uFall: { value: new THREE.Vector3(0, -1, 0) }, uLen: { value: 1.1 }, uIntensity: { value: 0 },
        uColor: { value: new THREE.Color(0.7, 0.75, 0.85) },
      },
    });
    this.mat.userData.envSkip = true;
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false; this.mesh.receiveShadow = false;
    this.mesh.renderOrder = 150;
    this.mesh.visible = false;
    this.mesh.name = 'rain';
    ctx.group.add(this.mesh);
    this.time = 0;
    this._fall = new THREE.Vector3();
  }
  /** zenith: [r,g,b] linear sky radiance straight up (from the LUT samples). */
  update(dt, camera, weather, zenith, exposure) {
    const r = weather.rain;
    this.mesh.visible = r > 0.01;
    if (!this.mesh.visible) return;
    this.time += dt;
    const u = this.mat.uniforms;
    u.uTime.value = this.time;
    u.uIntensity.value = Math.min(1, r);
    const w = weather.wind;
    this._fall.set(w.x * w.speed * 0.06, -1, w.z * w.speed * 0.06).normalize();
    u.uFall.value.copy(this._fall);
    u.uOrigin.value.copy(camera.position);
    // drops scatter the whole sky: brighter than the sky behind them; floor keeps them visible at night
    const boost = 2.4 / Math.max(exposure || 1, 0.5);
    u.uColor.value.setRGB(zenith[0] * boost + 0.02, zenith[1] * boost + 0.02, zenith[2] * boost + 0.025);
  }
  dispose(ctx) { ctx.group.remove(this.mesh); this.mesh.geometry.dispose(); this.mat.dispose(); }
}
