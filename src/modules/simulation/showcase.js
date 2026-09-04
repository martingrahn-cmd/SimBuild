// Simulation showcase: a "civic data plaza" — PBR lawn, a bevelled concrete plaza, gravel paths and
// a tree ring as backdrop; on the plaza a 30-day history as three rows of instanced bars (population,
// jobs, treasury) with engraved labels, and four RCI demand pillars near the street camera. Bars and
// pillars glow with their series colour at night. Everything repeated is instanced or merged; ~8 draws.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RENDER_ORDER } from '../../core/constants.js';
import { ZONE_TYPES } from './economy.js';

export const CAMERAS = {
  stats: { yaw: 0.45, pitch: 0.40, distance: 250, target: [-6, 6, -8] },
  pillars: { yaw: 1.05, pitch: 0.22, distance: 70, target: [46, 6, 44] },
};

const DAYS = 30, BAR_PITCH = 4, BAR_X0 = -60;
const ROWS = [
  { key: 'population', z: -34, color: 0x36c8cc, label: 'POPULATION' },
  { key: 'jobs',       z: -18, color: 0x5fd06a, label: 'JOBS' },
  { key: 'money',      z: -2,  color: 0xf6c54a, label: 'TREASURY' },
];
const PILLAR_X0 = 34, PILLAR_Z = 44, PILLAR_DX = 8;
const RCI_COLOR = { residential: 0x4cc25a, commercial: 0x3a95f5, industrial: 0xf28c28, office: 0xa66cf5 };
const PLAZA_W = 180, PLAZA_D = 120, PLAZA_TOP = 0.5;

const U = { night: { value: 0 } };
const S = { bars: null, pillars: null, labels: null, labelTex: null, labelCtx: null, lastDays: -1, lastPillarTick: -1e9, objects: [], mats: [], geos: [], m4: new THREE.Matrix4(), q: new THREE.Quaternion(), v: new THREE.Vector3(), sc: new THREE.Vector3(), col: new THREE.Color(), max: [0, 0, 0] };

function lowAniso(set) { for (const k of ['map', 'normalMap', 'roughnessMap', 'aoMap', 'armMap', 'metalnessMap']) if (set[k]) { set[k].anisotropy = 2; set[k].needsUpdate = true; } return set; }
const HASH = /* glsl */`float simHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }`;
/** world-position varying for instanced/merged meshes (independent of three's guarded worldpos chunk) */
const WP_VERT = (s) => s
  .replace('#include <common>', '#include <common>\nvarying vec3 vSimW;')
  .replace('#include <begin_vertex>', '#include <begin_vertex>\nvec4 simWP = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\nsimWP = instanceMatrix * simWP;\n#endif\nsimWP = modelMatrix * simWP; vSimW = simWP.xyz;');

// ---------------------------------------------------------------- backdrop
async function makeGround(ctx) {
  const set = lowAniso(await ctx.assets.pbr('aerial_grass_rock', { repeat: [6000 / 13, 6000 / 13] }));
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
  ctx.assets.applyPbr(m, { map: set.map, normalMap: set.normalMap, roughnessMap: set.roughnessMap }, { normalScale: 1.1 });
  m.onBeforeCompile = (s) => {
    s.vertexShader = WP_VERT(s.vertexShader);
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vSimW;\n${HASH}`)
      .replace('#include <map_fragment>', `
        vec4 t1 = texture2D(map, vMapUv);
        vec4 t2 = texture2D(map, vMapUv * 0.31 + vec2(0.37, 0.61));
        float macro = texture2D(map, vSimW.xz * 0.00019 + vec2(0.2, 0.7)).g;
        float macro2 = texture2D(map, vSimW.xz * 0.0011 + vec2(0.8, 0.1)).r;
        vec3 lush = vec3(0.34, 0.56, 0.24), mid = vec3(0.50, 0.62, 0.30), dry = vec3(0.70, 0.66, 0.40);
        vec3 tint = mix(mix(lush, mid, smoothstep(0.3, 0.6, macro2)), dry, smoothstep(0.45, 0.85, macro) * 0.7);
        float dfade = smoothstep(350.0, 1700.0, length(vViewPosition));
        vec4 tex = mix(mix(t1, t2, 0.35), vec4(0.47, 0.45, 0.36, 1.0), dfade);
        diffuseColor *= tex;
        diffuseColor.rgb *= tint * 1.5;`)
      .replace('#include <normal_fragment_maps>', `
        #ifdef USE_NORMALMAP
          vec3 mapN = texture2D(normalMap, vNormalMapUv).xyz * 2.0 - 1.0;
          mapN.xy *= normalScale * (1.0 - smoothstep(200.0, 900.0, length(vViewPosition)));
          normal = normalize(tbn * mapN);
        #endif`);
  };
  const g = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000, 1, 1), m);
  g.rotation.x = -Math.PI / 2; g.receiveShadow = true; g.renderOrder = RENDER_ORDER.TERRAIN; g.name = 'sim-ground';
  return g;
}

function roundedRect(w, d, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -d / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + d - r); s.absarc(x + w - r, y + d - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + d); s.absarc(x + r, y + d - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

async function makePlaza(ctx) {
  const set = lowAniso(await ctx.assets.pbr('concrete_floor_worn_001', {}));
  const geo = new THREE.ExtrudeGeometry(roundedRect(PLAZA_W, PLAZA_D, 14), { depth: 0.3, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.5, bevelSegments: 3, curveSegments: 24 });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, PLAZA_TOP - 0.5, 0);                 // top face at PLAZA_TOP
  const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 3.2, uv.getY(i) / 3.2);
  geo.computeVertexNormals();
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0 });
  ctx.assets.applyPbr(m, { map: set.map, normalMap: set.normalMap, roughnessMap: set.roughnessMap, aoMap: null }, { normalScale: 0.6 });
  m.onBeforeCompile = (s) => {
    s.vertexShader = WP_VERT(s.vertexShader);
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vSimW;\n${HASH}`)
      .replace('#include <map_fragment>', `
        vec4 c = texture2D(map, vMapUv);
        vec4 c2 = texture2D(map, vMapUv * 0.27 + vec2(0.5, 0.2));
        // 6 m paving slabs with dark joints, subtle per-slab tone, worn centre band
        vec2 slab = vSimW.xz / 6.0;
        vec2 f = abs(fract(slab) - 0.5);
        float joint = 1.0 - smoothstep(0.47, 0.495, max(f.x, f.y));
        float tone = 0.88 + 0.16 * simHash(floor(slab));
        diffuseColor *= mix(c, c2, 0.3) * vec4(0.80, 0.80, 0.79, 1.0) * tone * joint;
        diffuseColor.rgb *= mix(1.0, 0.72, 1.0 - joint);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = min(1.0, roughnessFactor * 0.9 + 0.05);');
  };
  const mesh = new THREE.Mesh(geo, m);
  mesh.receiveShadow = true; mesh.castShadow = true; mesh.renderOrder = RENDER_ORDER.ROADS; mesh.name = 'sim-plaza';
  return mesh;
}

async function makePaths(ctx) {
  const set = lowAniso(await ctx.assets.pbr('gravel_floor_02', {}));
  const parts = [];
  const strip = (x, z, len, w, ang) => {
    const g = new THREE.PlaneGeometry(len, w, 1, 1);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len / 3, uv.getY(i) * w / 3);
    g.rotateX(-Math.PI / 2); g.rotateY(ang); g.translate(x, 0.04, z);
    parts.push(g);
  };
  const L = 420;
  strip(PLAZA_W / 2 + L / 2 - 4, 8, L, 7, 0);
  strip(-PLAZA_W / 2 - L / 2 + 4, -12, L, 7, 0);
  strip(-20, PLAZA_D / 2 + L / 2 - 4, L, 6, Math.PI / 2);
  strip(24, -PLAZA_D / 2 - L / 2 + 4, L, 6, Math.PI / 2);
  const geo = mergeGeometries(parts, false);
  const m = new THREE.MeshStandardMaterial({ color: 0xd8cfc0, roughness: 0.95, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  ctx.assets.applyPbr(m, { map: set.map, normalMap: set.normalMap, roughnessMap: set.roughnessMap }, { normalScale: 0.8 });
  m.onBeforeCompile = (s) => {
    s.fragmentShader = s.fragmentShader.replace('#include <map_fragment>', `
      vec4 c = texture2D(map, vMapUv);
      float edge = smoothstep(0.0, 0.18, min(vMapUv.y * 3.0 / 6.0, 1.0 - vMapUv.y * 3.0 / 6.0));
      diffuseColor *= c;
      diffuseColor.a *= 0.55 + 0.45 * edge;`);
  };
  m.transparent = true; m.depthWrite = false;
  const mesh = new THREE.Mesh(geo, m);
  mesh.receiveShadow = true; mesh.renderOrder = RENDER_ORDER.ROADS + 1; mesh.name = 'sim-paths';
  return mesh;
}

function makeTrees(ctx, rng) {
  const trunk = new THREE.CylinderGeometry(0.25, 0.42, 3.2, 6, 1).toNonIndexed(); trunk.translate(0, 1.6, 0);
  const blobs = [];
  for (const [ox, oy, oz, r] of [[0, 5.6, 0, 3.1], [1.1, 4.2, 0.8, 2.2], [-1.0, 4.4, -0.6, 2.0]]) {
    const g = new THREE.IcosahedronGeometry(r, 2);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) { const j = 1 + (rng.float() - 0.5) * 0.26; pos.setXYZ(i, pos.getX(i) * j + ox, pos.getY(i) * j + oy, pos.getZ(i) * j + oz); }
    g.computeVertexNormals(); blobs.push(g);
  }
  const colour = (g, hex, jitter, dark) => {
    const c = new THREE.Color(hex), pos = g.attributes.position, arr = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) { const j = (1 + (rng.float() - 0.5) * jitter) * (dark ? 0.5 + 0.5 * Math.min(1, pos.getY(i) / 7.5) : 1); arr[i * 3] = c.r * j; arr[i * 3 + 1] = c.g * j; arr[i * 3 + 2] = c.b * j; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3)); return g;
  };
  const geo = mergeGeometries([colour(trunk, 0x4a3120, 0.2, false), colour(mergeGeometries(blobs, false), 0x4f9a3a, 0.4, true)], false);
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 });
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute float aTint; varying float vTint;').replace('#include <color_vertex>', '#include <color_vertex>\nvTint = aTint;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vTint;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 autumn = vec3(0.86, 0.55, 0.16);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * autumn * 1.6, smoothstep(0.62, 0.9, vTint) * step(0.35, diffuseColor.g));`);
  };
  // ring of trees around the plaza, gaps for the four paths, denser groves outward
  const list = [];
  for (let i = 0; i < 260; i++) {
    const a = rng.float() * Math.PI * 2, rr = 125 + rng.float() * rng.float() * 220;
    const x = Math.cos(a) * rr * 1.25, z = Math.sin(a) * rr;
    if (Math.abs(x) < PLAZA_W / 2 + 10 && Math.abs(z) < PLAZA_D / 2 + 10) continue;
    if (Math.abs(z - 8) < 9 && x > 0) continue; if (Math.abs(z + 12) < 9 && x < 0) continue;
    if (Math.abs(x + 20) < 9 && z > 0) continue; if (Math.abs(x - 24) < 9 && z < 0) continue;
    list.push({ x, z, s: 0.8 + rng.float() * 0.9, r: rng.float() * Math.PI * 2, t: rng.float() });
  }
  const n = list.length;
  const tint = new Float32Array(n); list.forEach((t, i) => { tint[i] = t.t; });
  geo.setAttribute('aTint', new THREE.InstancedBufferAttribute(tint, 1));
  const mesh = new THREE.InstancedMesh(geo, m, n);
  const { m4, q, v, sc } = S;
  list.forEach((t, i) => { q.setFromAxisAngle(v.set(0, 1, 0), t.r); sc.set(t.s, t.s * (0.9 + t.t * 0.3), t.s); m4.compose(v.set(t.x, 0, t.z), q, sc); mesh.setMatrixAt(i, m4); });
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.renderOrder = RENDER_ORDER.PROPS; mesh.name = 'sim-trees';
  return mesh;
}

// ---------------------------------------------------------------- data objects
function glowMaterial(rough = 0.3) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: rough, metalness: 0.08 });
  m.onBeforeCompile = (s) => {
    s.uniforms.uNight = U.night;
    s.vertexShader = WP_VERT(s.vertexShader)
      .replace('varying vec3 vSimW;', 'varying vec3 vSimW; varying float vBarV;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvBarV = uv.y;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform float uNight; varying vec3 vSimW; varying float vBarV;\n${HASH}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        // frosted glass look: pale body, saturated tint toward the top, fine floor lines every 2 m
        vec3 tintC = diffuseColor.rgb;
        float up = clamp((vSimW.y - 0.5) / 40.0, 0.0, 1.0);
        vec3 body = mix(vec3(0.86, 0.9, 0.92), tintC, 0.35 + 0.55 * up);
        float line = 1.0 - 0.10 * step(0.93, fract(vSimW.y * 0.5));
        diffuseColor.rgb = body * line;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.55, 0.25 * step(0.93, fract(vSimW.y * 0.5)));')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float pulse = 0.85 + 0.15 * step(0.93, fract(vSimW.y * 0.5));
        totalEmissiveRadiance += tintC * uNight * (0.25 + 0.75 * vBarV) * 0.9 * pulse;`);
  };
  return m;
}
function darkMaterial() { return new THREE.MeshStandardMaterial({ color: 0x24272b, roughness: 0.55, metalness: 0.2 }); }

function makeBars() {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mesh = new THREE.InstancedMesh(geo, glowMaterial(0.3), ROWS.length * DAYS);
  const { m4, q, v, sc, col } = S;
  q.identity();
  ROWS.forEach((row, r) => {
    const base = new THREE.Color(row.color);
    for (let i = 0; i < DAYS; i++) {
      const k = r * DAYS + i;
      sc.set(2.9, 0.6, 2.9); m4.compose(v.set(BAR_X0 + i * BAR_PITCH, PLAZA_TOP + 0.3, row.z), q, sc); mesh.setMatrixAt(k, m4);
      col.copy(base).lerp(new THREE.Color(0xffffff), 0.35 * (1 - i / (DAYS - 1)));   // older days paler
      mesh.setColorAt(k, col);
    }
  });
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.renderOrder = RENDER_ORDER.BUILDINGS; mesh.name = 'sim-bars';
  return mesh;
}
function makePillars() {
  const geo = new THREE.CylinderGeometry(2.4, 2.4, 1, 40, 1);
  geo.translate(0, 0.5, 0);      // base at y=0 so scaling y grows upward
  const mesh = new THREE.InstancedMesh(geo, glowMaterial(0.25), 4);
  const { m4, q, v, sc, col } = S;
  q.identity();
  ZONE_TYPES.forEach((k, i) => {
    sc.set(1, 3, 1); m4.compose(v.set(PILLAR_X0 + i * PILLAR_DX, PLAZA_TOP + 1.0, PILLAR_Z), q, sc); mesh.setMatrixAt(i, m4);
    col.setHex(RCI_COLOR[k]); mesh.setColorAt(i, col);
  });
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.renderOrder = RENDER_ORDER.BUILDINGS; mesh.name = 'sim-pillars';
  return mesh;
}
function makeRails() {
  const parts = [];
  for (const row of ROWS) { const g = new THREE.BoxGeometry(DAYS * BAR_PITCH + 4, 0.25, 4.4); g.translate(BAR_X0 + (DAYS - 1) * BAR_PITCH / 2, PLAZA_TOP + 0.125, row.z); parts.push(g); }
  const plinth = new THREE.BoxGeometry(38, 1.0, 11); plinth.translate(PILLAR_X0 + 1.5 * PILLAR_DX, PLAZA_TOP + 0.5, PILLAR_Z); parts.push(plinth);
  // low seating walls along the plaza's long edges
  for (const z of [-PLAZA_D / 2 + 6, PLAZA_D / 2 - 6]) { const g = new THREE.BoxGeometry(110, 0.9, 1.4); g.translate(-10, PLAZA_TOP + 0.45, z); parts.push(g); }
  const mesh = new THREE.Mesh(mergeGeometries(parts, false), darkMaterial());
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.renderOrder = RENDER_ORDER.BUILDINGS; mesh.name = 'sim-rails';
  return mesh;
}
async function makeLabels() {
  const c = document.createElement('canvas'); c.width = 2048; c.height = 1024;
  const g = c.getContext('2d');
  try { await Promise.race([document.fonts.load('700 130px Aileron'), new Promise((r) => setTimeout(r, 1500))]); } catch (e) { /* fallback font */ }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  const m = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.25, depthWrite: false, roughness: 0.6, metalness: 0, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, side: THREE.DoubleSide });
  const parts = [];
  const plane = (x, z, w, h, row, rot = 0) => {
    const p = new THREE.PlaneGeometry(w, h, 1, 1);
    const uv = p.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i), 0.75 - row * 0.25 + uv.getY(i) * 0.25);
    p.rotateX(-Math.PI / 2); p.rotateY(rot); p.translate(x, PLAZA_TOP + 0.03, z); parts.push(p);
  };
  ROWS.forEach((row, r) => plane(BAR_X0 + (DAYS - 1) * BAR_PITCH / 2, row.z + 7.5, 64, 8, r));
  plane(PILLAR_X0 + 1.5 * PILLAR_DX, PILLAR_Z + 12, 64, 8, 3);
  const mesh = new THREE.Mesh(mergeGeometries(parts, false), m);
  mesh.receiveShadow = true; mesh.renderOrder = RENDER_ORDER.MARKINGS; mesh.name = 'sim-labels'; mesh.frustumCulled = false;
  S.labelTex = tex; S.labelCtx = g;
  return mesh;
}
const fmtInt = (n) => Math.round(n).toLocaleString('en-US');
const fmtMoney = (n) => (n < 0 ? '−¢' : '¢') + Math.abs(Math.round(n)).toLocaleString('en-US');
function drawLabels(eco) {
  const g = S.labelCtx; if (!g) return;
  const e = eco.econ;
  g.clearRect(0, 0, 2048, 1024);
  const font = "700 118px Aileron, Inter, 'Segoe UI', sans-serif";
  const rowText = (r, title, value, sub) => {
    const y = r * 256 + 128;
    g.textBaseline = 'middle'; g.font = font;
    g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = 6; g.shadowOffsetY = 4;
    g.fillStyle = 'rgba(28,32,38,0.95)'; g.textAlign = 'left'; g.fillText(title, 40, y);
    g.fillStyle = '#f4f6f8'; g.textAlign = 'right'; g.fillText(value, 2008, y);
    g.shadowBlur = 0; g.shadowOffsetY = 0;
    if (sub) { g.font = "600 54px Aileron, Inter, 'Segoe UI', sans-serif"; g.fillStyle = 'rgba(28,32,38,0.9)'; g.textAlign = 'left'; g.fillText(sub, 40 + g.measureText(title).width * 118 / 54 * 0.0 + titleWidth(g, title) + 40, y + 6); }
  };
  const titleWidth = (ctx, t) => { const f = ctx.font; ctx.font = font; const w = ctx.measureText(t).width; ctx.font = f; return w; };
  rowText(0, 'POPULATION', fmtInt(e.population), `${DAYS} DAYS`);
  rowText(1, 'JOBS', fmtInt(e.jobs), `${(e.unemployment * 100).toFixed(1)}% UNEMPLOYED`);
  rowText(2, 'TREASURY', fmtMoney(e.money), `${e.net >= 0 ? '+' : '−'}${fmtMoney(Math.abs(e.net))} / DAY`);
  const d = e.demand;
  rowText(3, 'ZONE DEMAND', `R ${Math.round(d.residential * 100)}%   C ${Math.round(d.commercial * 100)}%   I ${Math.round(d.industrial * 100)}%   O ${Math.round(d.office * 100)}%`, '');
  S.labelTex.needsUpdate = true;
}

function updateBars(eco) {
  const h = eco.econ.history, mesh = S.bars; if (!mesh) return;
  const { m4, q, v, sc } = S; q.identity();
  const start = Math.max(0, h.length - DAYS);
  ROWS.forEach((row, r) => {
    let max = 1e-6;
    for (let i = start; i < h.length; i++) max = Math.max(max, h[i][row.key]);
    S.max[r] = max;
    for (let i = 0; i < DAYS; i++) {
      const s = h[start + i];
      const val = s ? Math.max(0, s[row.key]) : 0;
      const height = s ? 0.6 + 40 * (val / max) : 0.15;
      sc.set(2.9, height, 2.9); m4.compose(v.set(BAR_X0 + i * BAR_PITCH, PLAZA_TOP + 0.25 + height / 2, row.z), q, sc); mesh.setMatrixAt(r * DAYS + i, m4);
    }
  });
  mesh.instanceMatrix.needsUpdate = true;
}
function updatePillars(eco) {
  const mesh = S.pillars; if (!mesh) return;
  const { m4, q, v, sc } = S; q.identity();
  ZONE_TYPES.forEach((k, i) => {
    const hgt = 1.5 + 30 * eco.econ.demand[k];
    sc.set(1, hgt, 1); m4.compose(v.set(PILLAR_X0 + i * PILLAR_DX, PLAZA_TOP + 1.0, PILLAR_Z), q, sc); mesh.setMatrixAt(i, m4);
  });
  mesh.instanceMatrix.needsUpdate = true;
}

// ---------------------------------------------------------------- lifecycle
export async function stageScene(ctx, eco) {
  const rng = ctx.rng.fork('showcase');
  const [ground, plaza, paths, labels] = await Promise.all([makeGround(ctx), makePlaza(ctx), makePaths(ctx), makeLabels()]);
  const trees = makeTrees(ctx, rng);
  S.bars = makeBars(); S.pillars = makePillars(); S.labels = labels;
  const rails = makeRails();
  for (const o of [ground, plaza, paths, trees, rails, S.bars, S.pillars, labels]) { ctx.group.add(o); S.objects.push(o); }
  S.lastDays = -1; S.lastPillarTick = -1e9;
  updateScene(ctx, eco, 0);
}
export function updateScene(ctx, eco, dt) {
  const w = ctx.world.weather;
  const night = typeof w.night === 'number' ? w.night : (ctx.clock.isNight() ? 1 : 0);
  U.night.value = night;
  if (S.labels) S.labels.material.emissiveIntensity = 0.7 * night;
  if (!eco) return;
  const days = eco.econ.history.length;
  if (days !== S.lastDays) { S.lastDays = days; updateBars(eco); }
  if (eco.tick - S.lastPillarTick >= 25 || eco.tick < S.lastPillarTick) { S.lastPillarTick = eco.tick; updatePillars(eco); drawLabels(eco); }
}
export function disposeScene(ctx) {
  for (const o of S.objects) { ctx.group.remove(o); o.geometry?.dispose?.(); if (o.material) { o.material.map?.dispose?.(); o.material.dispose?.(); } }
  S.objects.length = 0; S.bars = null; S.pillars = null; S.labels = null; S.labelTex = null; S.labelCtx = null;
}
