// Near-camera ground clutter: instanced grass tufts (3 crossed quads, procedural blade texture) scattered on
// grassy ground within ~90 m of the camera. One draw call, positions are a deterministic hash of the world
// cell so the field is stable as the camera moves; rebuilt only when the camera has moved a few metres.
import * as THREE from 'three';
import { hash2 } from '../../core/rng.js';

const MAX = 6000;
const SPACING = 3.0;
const RADIUS = 140;

const VARIANTS = 3;
function makeTuftTexture(rng, size = 256) {
  const c = document.createElement('canvas'); c.width = size * VARIANTS; c.height = size;
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, size);
  const palettes = [
    ['#3f6a1e', '#4f7f26', '#5f8f2c', '#6f9a34', '#587a2a', '#476d22'],
    ['#4a7a22', '#6b9330', '#84a03a', '#9aa845', '#5e8a2a', '#b3b04e'],
    ['#365c1a', '#4d7326', '#5c8a2c', '#7a9438', '#8a8f3a', '#42661f'],
  ];
  for (let v = 0; v < VARIANTS; v++) {
    const ox = v * size;
    const greens = palettes[v];
    const blades = 45 + v * 20;
    const hMul = [0.9, 1.0, 0.75][v];
    for (let i = 0; i < blades; i++) {
      const x0 = ox + size * (0.18 + 0.64 * rng.float());
      const y0 = size;
      const h = size * (0.3 + 0.62 * rng.float()) * hMul;
      const lean = (rng.float() - 0.5) * size * 0.6;
      const w = 2.0 + rng.float() * 4.0;
      g.strokeStyle = greens[rng.int(0, greens.length - 1)];
      g.lineWidth = w;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(x0, y0);
      g.quadraticCurveTo(x0 + lean * 0.35, y0 - h * 0.55, x0 + lean, y0 - h);
      g.stroke();
      // thinner, lighter tip
      g.strokeStyle = 'rgba(180,200,110,0.7)';
      g.lineWidth = w * 0.35;
      g.beginPath();
      g.moveTo(x0 + lean * 0.5, y0 - h * 0.7);
      g.quadraticCurveTo(x0 + lean * 0.8, y0 - h * 0.9, x0 + lean, y0 - h);
      g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = 4;
  return t;
}

function makeTuftGeometry() {
  // three quads crossed at 60°, 1.4 m wide, 0.7 m tall, pivot at the ground; normals point up for soft lighting
  const w = 0.7, h = 0.75;
  const pos = [], uv = [], nrm = [], idx = [];
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI;
    const dx = Math.cos(a) * w, dz = Math.sin(a) * w;
    const b = pos.length / 3;
    pos.push(-dx, 0, -dz, dx, 0, dz, dx, h, dz, -dx, h, -dz);
    const u0 = k / VARIANTS, u1 = (k + 1) / VARIANTS;   // each quad shows a different atlas variant
    uv.push(u0, 0, u1, 0, u1, 1, u0, 1);
    for (let i = 0; i < 4; i++) nrm.push(0, 1, 0);
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setIndex(idx);
  return geo;
}

export class GrassScatter {
  constructor(data, rng, { seaLevel = 0, layer = 1 } = {}) {
    this.data = data;
    this.seaLevel = seaLevel;
    this.tex = makeTuftTexture(rng.fork('tuft'));
    this.material = new THREE.MeshStandardMaterial({
      map: this.tex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.9, metalness: 0, transparent: false,
    });
    this.material.name = 'terrain-grass-tufts';
    this.uTime = { value: 0 };
    this.uFade = { value: new THREE.Vector2(RADIUS * 0.72, RADIUS * 0.98) };
    const uTime = this.uTime, uFade = this.uFade;
    this.material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uTime; shader.uniforms.uFade = uFade;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying float vDist;')
        .replace('#include <begin_vertex>', /* glsl */`
vec3 transformed = vec3(position);
// wind sway on the tips
vec4 wpos0 = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
float sway = sin(uTime * 1.7 + wpos0.x * 0.35 + wpos0.z * 0.27) * 0.08 + sin(uTime * 2.9 + wpos0.z * 0.8) * 0.03;
transformed.x += sway * position.y;
transformed.z += sway * 0.6 * position.y;
vDist = distance(cameraPosition, wpos0.xyz);`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec2 uFade;\nvarying float vDist;')
        // keep the up-facing normal on back faces too (blades are lit like the ground they grow from)
        .replace('#include <normal_fragment_begin>', 'float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;\nvec3 normal = normalize( vNormal );\nvec3 nonPerturbedNormal = normal;')
        .replace('#include <alphatest_fragment>', /* glsl */`
diffuseColor.a *= 1.0 - smoothstep(uFade.x, uFade.y, vDist);
#include <alphatest_fragment>`);
    };
    this.material.customProgramCacheKey = () => 'terrain-tufts-v1';
    this.mesh = new THREE.InstancedMesh(makeTuftGeometry(), this.material, MAX);
    this.mesh.name = 'grass-tufts';
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = true;
    this.mesh.layers.enable(layer);
    this.mesh.raycast = () => {};
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
    this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._p = new THREE.Vector3();
    this._s = new THREE.Vector3();
    this._axis = new THREE.Vector3(0, 1, 0);
    this._lastX = 1e9; this._lastZ = 1e9;
    this._version = -1;
    this.enabled = true;
  }
  /** call per frame; rebuilds when the camera moved > 5 m or the terrain changed */
  update(camera, dt, terrainVersion) {
    if (dt > 0) this.uTime.value += dt;
    if (!this.enabled) { this.mesh.count = 0; return; }
    const cx = camera.position.x, cz = camera.position.z;
    if (Math.abs(cx - this._lastX) < 5 && Math.abs(cz - this._lastZ) < 5 && terrainVersion === this._version) return;
    this._lastX = cx; this._lastZ = cz; this._version = terrainVersion;
    const d = this.data;
    const i0 = Math.floor((cx - RADIUS) / SPACING), i1 = Math.ceil((cx + RADIUS) / SPACING);
    const j0 = Math.floor((cz - RADIUS) / SPACING), j1 = Math.ceil((cz + RADIUS) / SPACING);
    let n = 0;
    const col = this.mesh.instanceColor.array;
    for (let j = j0; j <= j1 && n < MAX; j++) for (let i = i0; i <= i1 && n < MAX; i++) {
      const h0 = hash2(i, j, 11), h1 = hash2(i, j, 23), h2 = hash2(i, j, 37), h3 = hash2(i, j, 51);
      const x = (i + h0) * SPACING, z = (j + h1) * SPACING;
      const dx = x - cx, dz = z - cz;
      if (dx * dx + dz * dz > RADIUS * RADIUS) continue;
      if (x < -d.half + 8 || x > d.half - 8 || z < -d.half + 8 || z > d.half - 8) continue;
      const y = d.getHeight(x, z);
      if (y < this.seaLevel + 1.6) continue;
      const nrm = d.getNormal(x, z, this._p);
      if (nrm.y < 0.86) continue;                 // no tufts on rock/steep dirt
      // patchy density: skip some cells by hash + a coarse world-hash "meadow" mask
      const patch = hash2(i >> 3, j >> 3, 77);
      if (h2 > 0.62 + patch * 0.35) continue;
      const s = 0.75 + h3 * 0.9;
      this._q.setFromAxisAngle(this._axis, h2 * Math.PI * 2);
      this._s.set(s, s * (0.8 + 0.5 * h0), s);
      this._m.compose(this._p.set(x, y - 0.05, z), this._q, this._s);
      this.mesh.setMatrixAt(n, this._m);
      const g = 0.5 + 0.28 * h1, yel = 0.75 + 0.3 * patch;
      col[n * 3] = 0.6 * yel; col[n * 3 + 1] = g; col[n * 3 + 2] = 0.45;
      n++;
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;
  }
  dispose() { this.mesh.geometry.dispose(); this.material.dispose(); this.tex.dispose(); }
}
