// Simulation showcase: a "civic data plaza" — PBR lawn with macro variation and dirt patches, a bevelled
// paved plaza, gravel paths, clipped hedges and mixed oak/pine groves as backdrop; on the plaza a 30-day
// history as three rows of instanced glass bars (population, jobs, treasury) on dark stone plinths with
// readable label strips, and four RCI demand pillars near the street camera. Bars and pillars glow with
// their series colour at night. Everything repeated is instanced or merged; ~10 draws + shadow passes.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RENDER_ORDER } from '../../core/constants.js';
import { ZONE_TYPES } from './economy.js';

export const CAMERAS = {
  stats: { yaw: 0.45, pitch: 0.40, distance: 250, target: [-6, 6, -8] },
  pillars: { yaw: 1.05, pitch: 0.22, distance: 70, target: [46, 6, 44] },
};

const DAYS = 30, BAR_PITCH = 4, BAR_X0 = -60, BAR_W = 2.4, BAR_MAX_H = 40;
const ROWS = [
  { key: 'population', z: -34, color: 0x1fb6c4, label: 'POPULATION' },
  { key: 'jobs',       z: -18, color: 0x4fc85c, label: 'JOBS' },
  { key: 'money',      z: -2,  color: 0xf2b632, label: 'TREASURY' },
];
const PILLAR_X0 = 34, PILLAR_Z = 44, PILLAR_DX = 8;
const RCI_COLOR = { residential: 0x4cc25a, commercial: 0x3a95f5, industrial: 0xf28c28, office: 0xa66cf5 };
const PLAZA_W = 180, PLAZA_D = 120, PLAZA_TOP = 0.5, PLINTH_H = 1.5, RCI_PLINTH_H = 1.4;
const LABEL_W = 4096, LABEL_H = 512, LABEL_ROWS = 4;

const U = { night: { value: 0 } };
const S = { bars: null, pillars: null, labels: null, labelTex: null, labelCtx: null, lastDays: -1, lastPillarTick: -1e9, lastLabelTick: -1e9, objects: [], m4: new THREE.Matrix4(), q: new THREE.Quaternion(), v: new THREE.Vector3(), sc: new THREE.Vector3(), col: new THREE.Color(), col2: new THREE.Color(), max: [0, 0, 0] };

function lowAniso(set) { for (const k of ['map', 'normalMap', 'roughnessMap', 'aoMap', 'armMap', 'metalnessMap']) if (set[k]) { set[k].anisotropy = 2; set[k].needsUpdate = true; } return set; }
const HASH = /* glsl */`float simHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }`;
/** world-position varying for instanced/merged meshes (independent of three's guarded worldpos chunk) */
const WP_VERT = (s) => s
  .replace('#include <common>', '#include <common>\nvarying vec3 vSimW;')
  .replace('#include <begin_vertex>', '#include <begin_vertex>\nvec4 simWP = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\nsimWP = instanceMatrix * simWP;\n#endif\nsimWP = modelMatrix * simWP; vSimW = simWP.xyz;');

// ---------------------------------------------------------------- backdrop
async function makeGround(ctx) {
  const [set, dirt] = await Promise.all([ctx.assets.pbr('aerial_grass_rock', { repeat: [6000 / 13, 6000 / 13] }), ctx.assets.pbr('brown_mud_leaves_01', {})]);
  lowAniso(set); lowAniso(dirt);
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
  ctx.assets.applyPbr(m, { map: set.map, normalMap: set.normalMap, roughnessMap: set.roughnessMap }, { normalScale: 0.9 });
  m.onBeforeCompile = (s) => {
    s.uniforms.dirtMap = { value: dirt.map };
    s.vertexShader = WP_VERT(s.vertexShader);
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vSimW;\nuniform sampler2D dirtMap;\n${HASH}`)
      .replace('#include <map_fragment>', `
        // stochastic tiling: two rotated/offset samples of the same photo blended by a low-frequency mask
        vec2 uv = vMapUv;
        vec2 uvR = vec2(uv.x * 0.809 - uv.y * 0.588, uv.x * 0.588 + uv.y * 0.809) * 0.83 + vec2(0.37, 0.61);
        float macroA = texture2D(map, vSimW.xz * 0.00019 + vec2(0.2, 0.7)).g;   // 5 km tint
        float macroB = texture2D(map, vSimW.xz * 0.0011 + vec2(0.8, 0.1)).r;    // 900 m selector
        float macroC = texture2D(map, vSimW.xz * 0.0031 + vec2(0.45, 0.25)).b;  // 320 m dirt patches
        vec4 t1 = texture2D(map, uv), t2 = texture2D(map, uvR);
        vec4 grass = mix(t1, t2, smoothstep(0.3, 0.7, macroB));
        vec4 dirtC = texture2D(dirtMap, uv * 0.61 + vec2(0.13, 0.71));
        float dirtMask = smoothstep(0.52, 0.72, macroC + (t1.r - 0.45) * 0.25);
        vec3 lush = vec3(0.30, 0.54, 0.20), mid = vec3(0.50, 0.60, 0.27), dry = vec3(0.68, 0.63, 0.37);
        vec3 tint = mix(mix(lush, mid, smoothstep(0.3, 0.6, macroB)), dry, smoothstep(0.45, 0.85, macroA) * 0.7);
        vec4 tex = mix(grass * vec4(tint * 1.45, 1.0), dirtC * vec4(1.05, 0.98, 0.9, 1.0), dirtMask * 0.85);
        // far away the photo detail averages out; keep the hue, lose the micro contrast only
        float dfade = smoothstep(1100.0, 3600.0, length(vViewPosition)) * 0.45;
        tex.rgb = mix(tex.rgb, vec3(0.36, 0.42, 0.22) * (0.8 + 0.4 * macroA), dfade);
        diffuseColor *= tex;`)
      .replace('#include <normal_fragment_maps>', `
        #ifdef USE_NORMALMAP
          vec3 mapN = texture2D(normalMap, vNormalMapUv).xyz * 2.0 - 1.0;
          mapN.xy *= normalScale * (1.0 - smoothstep(150.0, 700.0, length(vViewPosition)));
          normal = normalize(tbn * mapN);
        #endif`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = max(roughnessFactor, 0.86);');
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
  ctx.assets.applyPbr(m, { map: set.map, normalMap: set.normalMap, roughnessMap: set.roughnessMap, aoMap: null }, { normalScale: 0.5 });
  m.onBeforeCompile = (s) => {
    s.vertexShader = WP_VERT(s.vertexShader);
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vSimW;\n${HASH}`)
      .replace('#include <map_fragment>', `
        vec4 c = texture2D(map, vMapUv);
        vec4 c2 = texture2D(map, vMapUv * 0.27 + vec2(0.5, 0.2));
        // 2 m paving slabs in running bond with 3 cm joints, per-slab tone, large-scale grime
        vec2 p = vSimW.xz / 2.0;
        p.x += 0.5 * step(0.5, fract(floor(p.y) * 0.5));
        vec2 f = abs(fract(p) - 0.5);
        float joint = 1.0 - smoothstep(0.478, 0.493, max(f.x, f.y));
        float tone = 0.90 + 0.14 * simHash(floor(p));
        float grime = 0.86 + 0.24 * texture2D(map, vSimW.xz * 0.0045 + vec2(0.3, 0.8)).g;
        float wearBars = 1.0 - 0.10 * (1.0 - smoothstep(4.0, 9.0, abs(vSimW.z + 18.0) - 16.0)) * step(-70.0, vSimW.x) * step(vSimW.x, 66.0);
        diffuseColor *= mix(c, c2, 0.3) * vec4(0.82, 0.82, 0.81, 1.0) * tone * grime * wearBars;
        diffuseColor.rgb *= mix(0.62, 1.0, joint);`)
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

// ---------------------------------------------------------------- vegetation
/** Leaf-cluster cut-out texture: alpha-tested on ellipsoid canopies it gives fluffy, back-lit silhouettes. */
function makeFoliageTexture(rng) {
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d');
  g.clearRect(0, 0, N, N);
  // opaque bark square in the corner for trunk UVs
  g.fillStyle = '#6b5236'; g.fillRect(0, 0, 40, 40);
  g.fillStyle = '#4e3b26'; for (let i = 0; i < 12; i++) g.fillRect(rng.int(0, 36), rng.int(0, 36), 3, rng.int(4, 14));
  // leaf clusters: overlapping ellipses with varied lightness; wrap-around so the texture tiles
  for (let i = 0; i < 230; i++) {
    const x = rng.range(0, N), y = rng.range(0, N), r = rng.range(5, 13), a = rng.range(0, Math.PI);
    const l = 0.55 + 0.5 * rng.float();
    g.fillStyle = `rgb(${Math.round(120 * l)},${Math.round(165 * l)},${Math.round(70 * l)})`;
    for (const [ox, oy] of [[0, 0], [N, 0], [-N, 0], [0, N], [0, -N]]) {
      g.save(); g.translate(x + ox, y + oy); g.rotate(a); g.beginPath(); g.ellipse(0, 0, r, r * 0.55, 0, 0, Math.PI * 2); g.fill(); g.restore();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}
function foliageMaterial(tex, { alphaTest = 0.5 } = {}) {
  const m = new THREE.MeshStandardMaterial({ map: tex, vertexColors: true, roughness: 0.94, metalness: 0, alphaTest, side: THREE.DoubleSide });
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aTint; attribute float aLeaf; varying float vTint; varying float vLeaf;')
      .replace('#include <color_vertex>', '#include <color_vertex>\n#ifdef USE_INSTANCING\nvTint = aTint;\n#else\nvTint = 0.0;\n#endif\nvLeaf = aLeaf;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vTint; varying float vLeaf;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        // species tint: green -> yellow-green -> orange by instance; trunk untouched
        vec3 yellow = vec3(0.86, 0.72, 0.22), orange = vec3(0.88, 0.46, 0.14);
        vec3 leaf = diffuseColor.rgb;
        leaf = mix(leaf, leaf * 1.15 * yellow / vec3(0.47, 0.65, 0.27), smoothstep(0.55, 0.78, vTint));
        leaf = mix(leaf, leaf * orange / max(leaf, vec3(0.05)) * 0.9, smoothstep(0.80, 0.97, vTint));
        diffuseColor.rgb = mix(diffuseColor.rgb, leaf, vLeaf);`)
      // leaves: lighter translucent look when back-lit
      .replace('#include <lights_fragment_begin>', '#include <lights_fragment_begin>\nreflectedLight.indirectDiffuse += diffuseColor.rgb * 0.08 * vLeaf;');
  };
  return m;
}
function withAttr(g, name, v) { const a = new Float32Array(g.attributes.position.count).fill(v); g.setAttribute(name, new THREE.BufferAttribute(a, 1)); return g; }
function colourGeo(g, rng, hex, jitter, gradY) {
  const c = new THREE.Color(hex), pos = g.attributes.position, arr = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const j = (1 + (rng.float() - 0.5) * jitter) * (gradY ? gradY[0] + (gradY[1] - gradY[0]) * Math.min(1, Math.max(0, pos.getY(i) / gradY[2])) : 1);
    arr[i * 3] = c.r * j; arr[i * 3 + 1] = c.g * j; arr[i * 3 + 2] = c.b * j;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3)); return g;
}
/** planar UVs from object-space xy/zy so no two canopies show the same cut-out pattern */
function planarUv(g, scale, ox, oy, axis = 0) {
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (axis ? pos.getZ(i) : pos.getX(i)) * scale + ox, pos.getY(i) * scale + oy);
  return g;
}
function trunkGeo(rng, h, r0, r1) {
  const t = new THREE.CylinderGeometry(r0, r1, h, 7, 1, true).toNonIndexed(); t.translate(0, h / 2, 0);
  const uv = t.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.06 + 0.04 * uv.getX(i), 0.06 + 0.04 * uv.getY(i));
  colourGeo(t, rng, 0x8a7458, 0.25, [0.75, 1.0, h]); withAttr(t, 'aLeaf', 0); return t;
}
function oakGeo(rng) {
  const parts = [trunkGeo(rng, 3.6, 0.22, 0.45)];
  const clusters = [[0, 5.8, 0, 3.3], [1.5, 4.6, 0.9, 2.3], [-1.4, 4.9, -0.8, 2.2], [0.3, 4.1, -1.7, 1.9]];
  clusters.forEach(([ox, oy, oz, r], k) => {
    const g = new THREE.IcosahedronGeometry(r, 1);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) { const j = 1 + (rng.float() - 0.5) * 0.3; pos.setXYZ(i, pos.getX(i) * j * 1.1 + ox, pos.getY(i) * j * 0.85 + oy, pos.getZ(i) * j + oz); }
    g.computeVertexNormals();
    planarUv(g, 0.42, k * 0.23, k * 0.31, k & 1);
    colourGeo(g, rng, 0x4f9a3c, 0.35, [0.55, 1.05, 8]); withAttr(g, 'aLeaf', 1);
    parts.push(g);
  });
  return mergeGeometries(parts, false);
}
function pineGeo(rng) {
  const parts = [trunkGeo(rng, 9, 0.16, 0.36)];
  const tiers = [[2.6, 3.0, 4.2], [4.9, 2.4, 3.6], [7.0, 1.7, 3.0], [8.9, 1.0, 2.2]];
  tiers.forEach(([y, r, h], k) => {
    const g = new THREE.ConeGeometry(r, h, 8, 1, true).toNonIndexed(); g.translate(0, y + h / 2, 0);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) { const j = 1 + (rng.float() - 0.5) * 0.22; pos.setXYZ(i, pos.getX(i) * j, pos.getY(i), pos.getZ(i) * j); }
    g.computeVertexNormals();
    planarUv(g, 0.55, k * 0.37, k * 0.19, k & 1);
    colourGeo(g, rng, 0x2f5f33, 0.3, [0.6, 1.0, 10]); withAttr(g, 'aLeaf', 1);
    parts.push(g);
  });
  return mergeGeometries(parts, false);
}
function scatterTrees(rng) {
  const oaks = [], pines = [];
  for (let i = 0; i < 300; i++) {
    const a = rng.float() * Math.PI * 2, rr = 125 + rng.float() * rng.float() * 230;
    const x = Math.cos(a) * rr * 1.25, z = Math.sin(a) * rr;
    if (Math.abs(x) < PLAZA_W / 2 + 12 && Math.abs(z) < PLAZA_D / 2 + 12) continue;
    if (Math.abs(z - 8) < 9 && x > 0) continue; if (Math.abs(z + 12) < 9 && x < 0) continue;
    if (Math.abs(x + 20) < 9 && z > 0) continue; if (Math.abs(x - 24) < 9 && z < 0) continue;
    const pine = rng.float() < 0.28 + 0.4 * Math.max(0, Math.cos(a - 2.4));   // pines cluster to the north-west
    (pine ? pines : oaks).push({ x, z, s: pine ? 0.9 + rng.float() * 0.8 : 0.75 + rng.float() * 0.9, r: rng.float() * Math.PI * 2, t: rng.float() });
  }
  return { oaks, pines };
}
function instanceTrees(geo, mat, list, name) {
  const n = list.length;
  const tint = new Float32Array(n); list.forEach((t, i) => { tint[i] = t.t; });
  geo.setAttribute('aTint', new THREE.InstancedBufferAttribute(tint, 1));
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  const { m4, q, v, sc } = S;
  list.forEach((t, i) => { q.setFromAxisAngle(v.set(0, 1, 0), t.r); sc.set(t.s, t.s * (0.92 + t.t * 0.25), t.s); m4.compose(v.set(t.x, 0, t.z), q, sc); mesh.setMatrixAt(i, m4); });
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.renderOrder = RENDER_ORDER.PROPS; mesh.name = name;
  if (mesh.computeBoundingSphere) { mesh.computeBoundingSphere(); mesh.frustumCulled = true; } else mesh.frustumCulled = false;
  return mesh;
}
function makeHedges(rng, tex) {
  const parts = [];
  const box = (x, z, len, ang) => {
    const g = new THREE.BoxGeometry(len, 1.25, 1.1, Math.max(2, Math.round(len / 2)), 2, 2);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) { const py = pos.getY(i); pos.setXYZ(i, pos.getX(i) + (rng.float() - 0.5) * 0.18, py > 0 ? py + (rng.float() - 0.5) * 0.16 : py, pos.getZ(i) + (rng.float() - 0.5) * 0.18); }
    g.computeVertexNormals();
    planarUv(g, 0.9, rng.float(), rng.float(), 0);
    colourGeo(g, rng, 0x5a9a46, 0.22, [0.6, 1.0, 1.25]); withAttr(g, 'aLeaf', 1);
    g.translate(0, 0.62, 0); g.rotateY(ang); g.translate(x, 0, z); parts.push(g);
  };
  // hedges outside the plaza rim, with gaps for the four path entries
  const hx = PLAZA_W / 2 + 6, hz = PLAZA_D / 2 + 6;
  box(-40, -hz, 70, 0); box(40, -hz, 70, 0);            // north edge (gap at x≈24 path)
  box(-58, hz, 60, 0); box(30, hz, 74, 0);              // south edge (gap at x≈-20 path)
  box(-hx, -40, 44, Math.PI / 2); box(-hx, 26, 52, Math.PI / 2);   // west
  box(hx, -34, 50, Math.PI / 2); box(hx, 36, 40, Math.PI / 2);     // east
  const mesh = new THREE.Mesh(mergeGeometries(parts, false), foliageMaterial(tex, { alphaTest: 0.08 }));
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.renderOrder = RENDER_ORDER.PROPS; mesh.name = 'sim-hedges';
  return mesh;
}

// ---------------------------------------------------------------- data objects
function glowMaterial(rough = 0.24) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: rough, metalness: 0.05 });
  m.onBeforeCompile = (s) => {
    s.uniforms.uNight = U.night;
    s.vertexShader = WP_VERT(s.vertexShader)
      .replace('varying vec3 vSimW;', 'varying vec3 vSimW; varying float vBarV; varying vec3 vBarN;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvBarV = uv.y; vBarN = normal;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform float uNight; varying vec3 vSimW; varying float vBarV; varying vec3 vBarN;\n${HASH}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        // tinted glass: saturated at the base, lighter toward the top, pale cap, fine floor lines every 2 m
        vec3 tintC = diffuseColor.rgb;
        float up = clamp((vSimW.y - 2.0) / 36.0, 0.0, 1.0);
        float cap = step(0.5, vBarN.y);
        vec3 body = mix(tintC * 0.6, mix(tintC, vec3(0.92, 0.95, 0.97), 0.3), up);
        body = mix(body, mix(tintC, vec3(1.0), 0.5), cap);
        float line = 1.0 - 0.12 * step(0.94, fract(vSimW.y * 0.5)) * (1.0 - cap);
        diffuseColor.rgb = body * line;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.5, 0.3 * step(0.94, fract(vSimW.y * 0.5)));')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float pulse = 0.85 + 0.15 * step(0.94, fract(vSimW.y * 0.5));
        totalEmissiveRadiance += tintC * uNight * (0.10 + 0.32 * vBarV) * pulse;`);
  };
  return m;
}
function stoneMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: 0x2a2d31, roughness: 0.62, metalness: 0.12 });
  m.onBeforeCompile = (s) => {
    s.uniforms.uNight = U.night;
    s.vertexShader = WP_VERT(s.vertexShader);
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform float uNight; varying vec3 vSimW;\n${HASH}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        // honed basalt: fine speckle + faint 1 m panel seams
        float speck = 0.92 + 0.16 * simHash(floor(vSimW.xz * 9.0));
        vec2 f = abs(fract(vSimW.xz) - 0.5);
        float seam = 1.0 - 0.18 * (1.0 - smoothstep(0.485, 0.5, max(f.x, f.y)));
        diffuseColor.rgb *= speck * seam;`)
      ;
  };
  return m;
}

function makeBars() {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mesh = new THREE.InstancedMesh(geo, glowMaterial(0.24), ROWS.length * DAYS);
  const { m4, q, v, sc, col, col2 } = S;
  q.identity();
  ROWS.forEach((row, r) => {
    const base = new THREE.Color(row.color);
    col2.copy(base).lerp(new THREE.Color(0x5a6470), 0.55);   // older days: same hue, dimmer and greyer
    for (let i = 0; i < DAYS; i++) {
      const k = r * DAYS + i;
      sc.set(BAR_W, 0.6, BAR_W); m4.compose(v.set(BAR_X0 + i * BAR_PITCH, PLAZA_TOP + PLINTH_H + 0.3, row.z), q, sc); mesh.setMatrixAt(k, m4);
      col.copy(col2).lerp(base, Math.pow(i / (DAYS - 1), 0.8));
      mesh.setColorAt(k, col);
    }
  });
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.renderOrder = RENDER_ORDER.BUILDINGS; mesh.name = 'sim-bars';
  return mesh;
}
function makePillars() {
  const geo = new THREE.CylinderGeometry(2.4, 2.4, 1, 40, 1);
  geo.translate(0, 0.5, 0);      // base at y=0 so scaling y grows upward
  const mesh = new THREE.InstancedMesh(geo, glowMaterial(0.22), 4);
  const { m4, q, v, sc, col } = S;
  q.identity();
  ZONE_TYPES.forEach((k, i) => {
    sc.set(1, 3, 1); m4.compose(v.set(PILLAR_X0 + i * PILLAR_DX, PLAZA_TOP + RCI_PLINTH_H, PILLAR_Z), q, sc); mesh.setMatrixAt(i, m4);
    col.setHex(RCI_COLOR[k]); mesh.setColorAt(i, col);
  });
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.renderOrder = RENDER_ORDER.BUILDINGS; mesh.name = 'sim-pillars';
  return mesh;
}
function makePlinths() {
  const parts = [];
  for (const row of ROWS) { const g = new THREE.BoxGeometry(DAYS * BAR_PITCH + 4, PLINTH_H, 4.6); g.translate(BAR_X0 + (DAYS - 1) * BAR_PITCH / 2, PLAZA_TOP + PLINTH_H / 2, row.z); parts.push(g); }
  const plinth = new THREE.BoxGeometry(38, RCI_PLINTH_H, 11); plinth.translate(PILLAR_X0 + 1.5 * PILLAR_DX, PLAZA_TOP + RCI_PLINTH_H / 2, PILLAR_Z); parts.push(plinth);
  // low seating walls along the plaza's long edges
  for (const z of [-PLAZA_D / 2 + 6, PLAZA_D / 2 - 6]) { const g = new THREE.BoxGeometry(110, 0.9, 1.4); g.translate(-10, PLAZA_TOP + 0.45, z); parts.push(g); }
  const mesh = new THREE.Mesh(mergeGeometries(parts, false), stoneMaterial());
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.renderOrder = RENDER_ORDER.BUILDINGS; mesh.name = 'sim-plinths';
  return mesh;
}
async function makeLabels() {
  const c = document.createElement('canvas'); c.width = LABEL_W; c.height = LABEL_H;
  const g = c.getContext('2d');
  try { await Promise.race([document.fonts.load('700 96px Aileron'), new Promise((r) => setTimeout(r, 1500))]); } catch (e) { /* fallback font */ }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  const m = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.3, depthWrite: false, roughness: 0.5, metalness: 0, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const parts = [];
  // vertical strips on the +Z faces of the plinths (the side every standard camera looks at); 32:1 like the canvas rows
  const strip = (cx, cy, cz, w, row) => {
    const p = new THREE.PlaneGeometry(w, w / 32, 1, 1);
    const uv = p.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i), 1 - (row + 1) / LABEL_ROWS + uv.getY(i) / LABEL_ROWS);
    p.translate(cx, cy, cz); parts.push(p);
  };
  const rowEnd = BAR_X0 + (DAYS - 1) * BAR_PITCH + 2;
  ROWS.forEach((row, r) => strip(rowEnd - 22, PLAZA_TOP + PLINTH_H * 0.5, row.z + 2.3 + 0.03, 44, r));
  strip(PILLAR_X0 + 1.5 * PILLAR_DX, PLAZA_TOP + RCI_PLINTH_H * 0.5, PILLAR_Z + 5.5 + 0.03, 36, 3);
  const mesh = new THREE.Mesh(mergeGeometries(parts, false), m);
  mesh.renderOrder = RENDER_ORDER.MARKINGS; mesh.name = 'sim-labels'; mesh.frustumCulled = false;
  S.labelTex = tex; S.labelCtx = g;
  return mesh;
}
const fmtInt = (n) => Math.round(n).toLocaleString('en-US');
const fmtMoney = (n) => (n < 0 ? '−¢' : '¢') + Math.abs(Math.round(n)).toLocaleString('en-US');
function drawLabels(eco) {
  const g = S.labelCtx; if (!g) return;
  const e = eco.econ;
  g.clearRect(0, 0, LABEL_W, LABEL_H);
  const RH = LABEL_H / LABEL_ROWS;
  const rowText = (r, title, value, sub, accent) => {
    const y = r * RH + RH / 2;
    g.textBaseline = 'middle';
    g.font = "700 78px Aileron, Inter, 'Segoe UI', sans-serif"; g.fillStyle = accent; g.textAlign = 'left';
    g.fillText(title, 60, y);
    const tw = g.measureText(title).width;
    g.font = "700 88px Aileron, Inter, 'Segoe UI', sans-serif"; g.fillStyle = '#f4f6f8';
    g.fillText(value, 60 + tw + 70, y);
    if (sub) { g.font = "600 58px Aileron, Inter, 'Segoe UI', sans-serif"; g.fillStyle = 'rgba(230,236,244,0.72)'; g.textAlign = 'right'; g.fillText(sub, LABEL_W - 70, y + 2); }
  };
  const d = e.demand;
  rowText(0, 'POPULATION', fmtInt(e.population), `${fmtInt(e.households)} HOUSEHOLDS  ·  ${DAYS} DAYS`, '#5fd9e4');
  rowText(1, 'JOBS', fmtInt(e.jobs), `${fmtInt(e.employed)} EMPLOYED  ·  ${(e.unemployment * 100).toFixed(1)}% UNEMPLOYED`, '#7fe58a');
  rowText(2, 'TREASURY', fmtMoney(e.money), `${e.net >= 0 ? '+' : '−'}${fmtMoney(Math.abs(e.net))} / DAY  ·  TAX ${Math.round(e.taxRate * 100)}%`, '#ffd166');
  rowText(3, 'ZONE DEMAND', `R ${Math.round(d.residential * 100)}%   C ${Math.round(d.commercial * 100)}%   I ${Math.round(d.industrial * 100)}%   O ${Math.round(d.office * 100)}%`, e.milestone.name.toUpperCase(), '#cfd8e3');
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
      const height = s ? 0.6 + BAR_MAX_H * (val / max) : 0.15;
      sc.set(BAR_W, height, BAR_W); m4.compose(v.set(BAR_X0 + i * BAR_PITCH, PLAZA_TOP + PLINTH_H + height / 2, row.z), q, sc); mesh.setMatrixAt(r * DAYS + i, m4);
    }
  });
  mesh.instanceMatrix.needsUpdate = true;
}
function updatePillars(eco) {
  const mesh = S.pillars; if (!mesh) return;
  const { m4, q, v, sc } = S; q.identity();
  ZONE_TYPES.forEach((k, i) => {
    const hgt = 1.2 + 30 * eco.econ.demand[k];
    sc.set(1, hgt, 1); m4.compose(v.set(PILLAR_X0 + i * PILLAR_DX, PLAZA_TOP + RCI_PLINTH_H, PILLAR_Z), q, sc); mesh.setMatrixAt(i, m4);
  });
  mesh.instanceMatrix.needsUpdate = true;
}

// ---------------------------------------------------------------- lifecycle
export async function stageScene(ctx, eco) {
  const rng = ctx.rng.fork('showcase');
  const [ground, plaza, paths, labels] = await Promise.all([makeGround(ctx), makePlaza(ctx), makePaths(ctx), makeLabels()]);
  const foliage = makeFoliageTexture(rng.fork('foliage'));
  const { oaks, pines } = scatterTrees(rng.fork('scatter'));
  const oakMesh = instanceTrees(oakGeo(rng.fork('oak')), foliageMaterial(foliage), oaks, 'sim-oaks');
  const pineMesh = instanceTrees(pineGeo(rng.fork('pine')), foliageMaterial(foliage, { alphaTest: 0.42 }), pines, 'sim-pines');
  const hedges = makeHedges(rng.fork('hedge'), foliage);
  S.bars = makeBars(); S.pillars = makePillars(); S.labels = labels;
  const plinths = makePlinths();
  for (const o of [ground, plaza, paths, oakMesh, pineMesh, hedges, plinths, S.bars, S.pillars, labels]) { ctx.group.add(o); S.objects.push(o); }
  S.foliage = foliage;
  S.lastDays = -1; S.lastPillarTick = -1e9; S.lastLabelTick = -1e9;
  updateScene(ctx, eco, 0);
}
export function updateScene(ctx, eco, dt) {
  const w = ctx.world.weather;
  const night = typeof w.night === 'number' ? w.night : (ctx.clock.isNight() ? 1 : 0);
  U.night.value = night;
  if (S.labels) S.labels.material.emissiveIntensity = 0.6 * night;
  if (!eco) return;
  const days = eco.econ.history.length;
  if (days !== S.lastDays) { S.lastDays = days; updateBars(eco); }
  if (eco.tick - S.lastPillarTick >= 25 || eco.tick < S.lastPillarTick) { S.lastPillarTick = eco.tick; updatePillars(eco); }
  if (eco.tick - S.lastLabelTick >= 100 || eco.tick < S.lastLabelTick) { S.lastLabelTick = eco.tick; drawLabels(eco); }
}
export function disposeScene(ctx) {
  for (const o of S.objects) { ctx.group.remove(o); o.geometry?.dispose?.(); if (o.material) { o.material.dispose?.(); } }
  S.foliage?.dispose?.(); S.labelTex?.dispose?.();
  S.objects.length = 0; S.bars = null; S.pillars = null; S.labels = null; S.labelTex = null; S.labelCtx = null; S.foliage = null;
}
