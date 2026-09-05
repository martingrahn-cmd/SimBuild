// Near-camera ground clutter in two instanced layers, both coloured from the SAME grass palette the terrain
// surface uses (sampled at the instance root from the land-cover / macro textures) and lit with the ground
// normal, so they never look pasted on or self-lit at night:
//   * blades  (< ~42 m): clumps of tapered blade geometry, varied height/width/lean, wind, root AO
//   * tufts   (28-140 m): the same clump geometry, larger and sparser (reads as grass tufts at mid range)
// Instances shrink into the ground at the fade edge (per-instance dithered radius) instead of alpha-popping.
// Placement is a deterministic hash of the world cell (stable as the camera moves, no rng at runtime).
import * as THREE from 'three';
import { hash2 } from '../../core/rng.js';
import { GRASS_PALETTE_GLSL } from './material.js';

const BLADE = { max: 9500, spacing: 0.66, radius: 33, fade: [23, 32] };
const TUFT = { max: 8000, spacing: 2.4, inner: 28, radius: 140, fade: [108, 138] };

/** clump of tapered blades: 3 rows (root/mid/tip) x 2 columns per blade, leaning outward, rotated around the pivot */
function makeBladeGeometry(rng, blades = 5) {
  const pos = [], uv = [], idx = [];
  for (let b = 0; b < blades; b++) {
    const ang = (b / blades) * Math.PI * 2 + rng.float() * 0.8;
    const lean = 0.15 + rng.float() * 0.45;         // horizontal drift at the tip (m per m of height)
    const h = 0.30 + rng.float() * 0.32;
    const w = 0.05 + rng.float() * 0.04;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const rx = 0.05 * rng.float(), rz = 0.05 * rng.float();
    const base = pos.length / 3;
    for (let r = 0; r < 3; r++) {
      const t = r / 2;
      const y = h * t;
      const drift = lean * h * t * t;
      const hw = w * (1 - 0.75 * t);
      // blade plane faces sideways relative to its lean direction
      const cx = rx + ca * drift, cz = rz + sa * drift;
      pos.push(cx - sa * hw, y, cz + ca * hw, cx + sa * hw, y, cz - ca * hw);
      uv.push(0, t, 1, t);
    }
    // two quads
    idx.push(base, base + 1, base + 3, base, base + 3, base + 2, base + 2, base + 3, base + 5, base + 2, base + 5, base + 4);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  return geo;
}

function makeMaterial(shared, { name, fade, sway }) {
  const mat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8, metalness: 0 });
  mat.name = name;
  const uniforms = { ...shared, uFade: { value: new THREE.Vector2(fade[0], fade[1]) }, uSway: { value: sway }, uDryMul: { value: 0.7 } };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', /* glsl */`#include <common>
uniform float uTime; uniform vec2 uFade; uniform float uSway; uniform float uDryMul;
uniform sampler2D uLandTex; uniform sampler2D uMacro; uniform sampler2D uNormalTex;
uniform float uWorldMin; uniform float uWorldSize; uniform float uCell; uniform float uRes; uniform float uSeaLevel;
varying vec3 vTint; varying vec3 vGN; varying float vRoot; varying float vAcross;
${GRASS_PALETTE_GLSL}`)
      .replace('#include <beginnormal_vertex>', /* glsl */`
vec3 objectNormal = vec3(0.0, 1.0, 0.0);
#ifdef USE_TANGENT
vec3 objectTangent = vec3( tangent.xyz );
#endif`)
      .replace('#include <begin_vertex>', /* glsl */`
vec3 transformed = vec3(position);
vec3 wpos0 = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
// palette + ground normal at the root (same maps as the terrain surface)
vec2 lp = (wpos0.xz - uWorldMin) / uWorldSize;
vec4 land = texture2D(uLandTex, lp);
vec4 mac2 = texture2D(uMacro, wpos0.xz / 170.0 + 0.37);
vec4 mac3 = texture2D(uMacro, wpos0.xz / 41.0 + 0.71);
float alt = smoothstep(140.0, 330.0, wpos0.y - uSeaLevel);
vTint = terrainGrassTint(vec4(land.r, land.g * uDryMul, land.b, land.a), mac2, mac3, alt);
vec4 ntex = texture2D(uNormalTex, ((wpos0.xz - uWorldMin) / uCell + 0.5) / uRes);
vGN = vec3(ntex.r * 2.0 - 1.0, 0.0, ntex.g * 2.0 - 1.0);
vGN.y = sqrt(max(0.0, 1.0 - dot(vGN.xz, vGN.xz)));
vTint *= 0.82 + 0.18 * ntex.b;
// dithered distance fade: shrink into the ground (no alpha pop, no pale blobs at the edge)
float hsh = fract(sin(dot(floor(wpos0.xz * 3.0), vec2(12.9898, 78.233))) * 43758.5453);
float d = distance(cameraPosition, wpos0);
float k = 1.0 - smoothstep(uFade.x, uFade.y, d + (hsh - 0.5) * (uFade.y - uFade.x) * 0.9);
// wind: tips sway, roots stay
float sw = sin(uTime * 1.7 + wpos0.x * 0.35 + wpos0.z * 0.27) * 0.08 + sin(uTime * 2.9 + wpos0.z * 0.8 + wpos0.x * 0.4) * 0.035;
float vv = uv.y * uv.y;
transformed.x += sw * uSway * vv;
transformed.z += sw * 0.6 * uSway * vv;
transformed *= k;
vRoot = uv.y; vAcross = uv.x;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTint; varying vec3 vGN; varying float vRoot; varying float vAcross;')
      // ground normal on both faces: the clutter is lit exactly like the ground it grows from
      .replace('#include <normal_fragment_begin>', 'float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;\nvec3 normal = normalize((viewMatrix * vec4(vGN, 0.0)).xyz);\nvec3 nonPerturbedNormal = normal;')
      .replace('#include <map_fragment>', /* glsl */`
diffuseColor.rgb *= vTint * vec3(0.85, 1.0, 0.9) * (0.35 + 0.55 * vRoot) * (0.9 + 0.2 * abs(vAcross - 0.5) * 2.0);`);
  };
  mat.customProgramCacheKey = () => 'terrain-clutter-v3';
  return mat;
}

class Layer {
  constructor(geo, material, max, opts) {
    this.opts = opts;
    this.mesh = new THREE.InstancedMesh(geo, material, max);
    this.mesh.name = material.name;
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = true;
    this.mesh.raycast = () => {};
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.max = max;
  }
}

export class GrassScatter {
  constructor(data, rng, { seaLevel = 0, layer = 1, macro = null, land = null } = {}) {
    this.data = data;
    this.seaLevel = seaLevel;
    const shared = {
      uTime: { value: 0 }, uLandTex: { value: land }, uMacro: { value: macro }, uNormalTex: { value: data.normalTex },
      uWorldMin: { value: -data.half }, uWorldSize: { value: data.size }, uCell: { value: data.cell }, uRes: { value: data.res }, uSeaLevel: { value: seaLevel },
    };
    this.uTime = shared.uTime;
    this.bladeMat = makeMaterial(shared, { name: 'terrain-grass-blades', fade: BLADE.fade, sway: 1.0 });
    this.tuftMat = makeMaterial(shared, { name: 'terrain-grass-tufts', fade: TUFT.fade, sway: 0.7 });
    this.blades = new Layer(makeBladeGeometry(rng.fork('blade'), 5), this.bladeMat, BLADE.max, BLADE);
    this.tufts = new Layer(makeBladeGeometry(rng.fork('clump'), 7), this.tuftMat, TUFT.max, TUFT);
    this.group = new THREE.Group();
    this.group.name = 'grass-clutter';
    for (const l of [this.blades, this.tufts]) { l.mesh.layers.enable(layer); this.group.add(l.mesh); }
    this.materials = [this.bladeMat, this.tuftMat];
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._p = new THREE.Vector3();
    this._s = new THREE.Vector3();
    this._axis = new THREE.Vector3(0, 1, 0);
    this._lastX = 1e9; this._lastZ = 1e9;
    this._version = -1;
    this.enabled = true;
  }
  /** call per frame; rebuilds when the camera moved > 4 m or the terrain changed */
  update(camera, dt, terrainVersion) {
    if (dt > 0) this.uTime.value += dt;
    if (!this.enabled) { this.blades.mesh.count = 0; this.tufts.mesh.count = 0; return; }
    const cx = camera.position.x, cz = camera.position.z;
    if (Math.abs(cx - this._lastX) < 4 && Math.abs(cz - this._lastZ) < 4 && terrainVersion === this._version) return;
    this._lastX = cx; this._lastZ = cz; this._version = terrainVersion;
    this._fill(this.blades, cx, cz, 0, BLADE.radius, BLADE.spacing, 1);
    this._fill(this.tufts, cx, cz, TUFT.inner, TUFT.radius, TUFT.spacing, 2);
  }
  _fill(layer, cx, cz, inner, radius, spacing, seed) {
    const d = this.data, mesh = layer.mesh, max = layer.max;
    const i0 = Math.floor((cx - radius) / spacing), i1 = Math.ceil((cx + radius) / spacing);
    const j0 = Math.floor((cz - radius) / spacing), j1 = Math.ceil((cz + radius) / spacing);
    const r2 = radius * radius, in2 = inner * inner;
    let n = 0;
    for (let j = j0; j <= j1 && n < max; j++) for (let i = i0; i <= i1 && n < max; i++) {
      const h0 = hash2(i, j, 11 + seed), h1 = hash2(i, j, 23 + seed), h2 = hash2(i, j, 37 + seed), h3 = hash2(i, j, 51 + seed);
      const x = (i + h0) * spacing, z = (j + h1) * spacing;
      const dx = x - cx, dz = z - cz, dd = dx * dx + dz * dz;
      if (dd > r2 || dd < in2) continue;
      if (x < -d.half + 8 || x > d.half - 8 || z < -d.half + 8 || z > d.half - 8) continue;
      const y = d.getHeight(x, z);
      if (y < this.seaLevel + 1.8) continue;
      const nrm = d.getNormal(x, z, this._p);
      if (nrm.y < 0.88) continue;                 // no clutter on rock/steep dirt
      // patchy density: a coarse world-hash "meadow" mask plus per-cell thinning; blades thin out toward 30 m
      const patch = hash2(i >> 3, j >> 3, 77);
      const keep = seed === 1 ? 0.78 + patch * 0.25 : 0.5 + patch * 0.4;
      if (h2 > keep) continue;
      const s = seed === 1 ? 0.55 + h3 * h3 * 1.3 : 1.1 + h3 * 0.9;
      this._q.setFromAxisAngle(this._axis, h2 * Math.PI * 2);
      this._s.set(s, s * (0.75 + 0.55 * h0), s);
      this._m.compose(this._p.set(x, y - 0.03, z), this._q, this._s);
      mesh.setMatrixAt(n, this._m);
      n++;
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
  }
  dispose() {
    for (const l of [this.blades, this.tufts]) l.mesh.geometry.dispose();
    this.bladeMat.dispose(); this.tuftMat.dispose();
  }
}
