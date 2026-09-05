// Procedural trees: oak / pine / birch, each with a detailed near LOD, a cheap mid LOD and a
// crossed-card impostor for the far field. Trunks are swept tubes with real branching; canopies are
// alpha-cut leaf cards whose shading normals are spherical so the crown reads as a volume, not a
// pile of flat quads. All three LODs sway in the wind through one shared vertex-shader hook.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { tube, leafCard, groundCard } from './geom.js';
import { leafUV, barkUV, impostorUV, impostorTopUV, BARK_COLS } from './textures.js';

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _m = new THREE.Matrix4();
const UP = new THREE.Vector3(0, 1, 0);
const ZP = new THREE.Vector3(0, 0, 1);

export const SPECIES = ['oak', 'pine', 'birch'];

// ---------------------------------------------------------------- shared attribute helpers
function setFlex(geo, fn) {
  const n = geo.attributes.position.count;
  const p = geo.attributes.position.array;
  const a = new Float32Array(n);
  for (let i = 0; i < n; i++) a[i] = fn(p[i * 3], p[i * 3 + 1], p[i * 3 + 2], i);
  geo.setAttribute('aFlex', new THREE.BufferAttribute(a, 1));
  return geo;
}
function setColor(geo, fn) {
  const n = geo.attributes.position.count;
  const p = geo.attributes.position.array;
  const c = new Float32Array(n * 3);
  const out = [0, 0, 0];
  for (let i = 0; i < n; i++) { fn(p[i * 3], p[i * 3 + 1], p[i * 3 + 2], out, i); c[i * 3] = out[0]; c[i * 3 + 1] = out[1]; c[i * 3 + 2] = out[2]; }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}
function clean(geo) {
  for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv', 'color', 'aFlex'].includes(k)) geo.deleteAttribute(k);
  return geo;
}

// ---------------------------------------------------------------- trunk / branch skeleton
/**
 * Grow a branch skeleton. Returns {geos:[], tips:[{p,dir,r,depth}]}.
 */
function grow(rng, opts) {
  const { origin, dir, length, r0, r1, depth, maxDepth, sides, rings, curve, splits, spread, lengthK, radiusK, gravity } = opts;
  const geos = [], tips = [];
  const nodes = [];
  const d = dir.clone().normalize();
  const p = origin.clone();
  // a lateral bias so the branch curves rather than being a straight stick
  const lat = new THREE.Vector3(rng.range(-1, 1), 0, rng.range(-1, 1));
  if (lat.lengthSq() < 1e-4) lat.set(1, 0, 0);
  lat.normalize();
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    nodes.push({ p: p.clone(), r: r0 + (r1 - r0) * t });
    const step = length / rings;
    _v.copy(d).multiplyScalar(step);
    _v.addScaledVector(lat, curve * step * (t * 0.9 + 0.15));
    _v.y += gravity * step * t;
    p.add(_v);
    d.copy(_v).normalize();
  }
  const g = tube(nodes, sides, 3.4);
  geos.push(g);
  const tipP = nodes[nodes.length - 1].p;
  if (depth >= maxDepth) {
    tips.push({ p: tipP.clone(), dir: d.clone(), r: r1, depth });
  } else {
    const n = splits;
    const base = rng.float() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const a = base + (i / n) * Math.PI * 2 + rng.range(-0.4, 0.4);
      const tilt = spread * rng.range(0.7, 1.3);
      const nd = new THREE.Vector3(Math.cos(a) * Math.sin(tilt), Math.cos(tilt), Math.sin(a) * Math.sin(tilt));
      nd.lerp(d, 0.32).normalize();
      const sub = grow(rng, {
        ...opts,
        origin: tipP.clone().addScaledVector(d, -length * 0.06),
        dir: nd,
        length: length * lengthK * rng.range(0.78, 1.10),
        r0: r1 * 1.02, r1: r1 * radiusK,
        depth: depth + 1,
        rings: Math.max(2, rings - 1),
        sides: Math.max(4, sides - 1),
        curve: curve * rng.range(0.8, 1.5),
      });
      geos.push(...sub.geos); tips.push(...sub.tips);
    }
    // keep a couple of leaf anchors on the parent too, so the crown isn't hollow
    if (depth >= maxDepth - 1) tips.push({ p: tipP.clone(), dir: d.clone(), r: r1, depth });
  }
  return { geos, tips };
}

function barkGeometry(geos, species, height) {
  const g = mergeGeometries(geos, false);
  for (const x of geos) x.dispose();
  const bu = barkUV(species);
  const uv = g.attributes.uv.array;
  for (let i = 0; i < uv.length; i += 2) uv[i] = bu.u0 + uv[i] * bu.du;
  setFlex(g, (x, y) => Math.pow(Math.min(1, Math.max(0, y / height)), 2.2) * 0.32);
  setColor(g, (x, y, z, out) => {
    // subtle vertical AO: darker at the base where the canopy occludes
    const k = 0.76 + 0.24 * Math.min(1, y / (height * 0.7));
    out[0] = out[1] = out[2] = k;
  });
  return clean(g);
}

// ---------------------------------------------------------------- canopy cards
/**
 * Place a leaf card. `outward` gives both the shading normal and the base orientation.
 * The card is then randomly rolled/tilted so cards interpenetrate and give the crown depth.
 */
function pushCard(parts, rng, { pos, outward, w, h, uv, tiltMax, tint, ao, flex, up = 0.28 }) {
  const geo = leafCard(w, h, uv);
  const nrm = outward.clone().normalize();
  // orientation: face roughly along the outward normal, tilted randomly
  const face = nrm.clone();
  face.x += rng.range(-tiltMax, tiltMax); face.y += rng.range(-tiltMax, tiltMax) * 0.8; face.z += rng.range(-tiltMax, tiltMax);
  if (face.lengthSq() < 1e-6) face.copy(nrm);
  face.normalize();
  _m.lookAt(_v.set(0, 0, 0), face, UP);
  _q.setFromRotationMatrix(_m);
  _q.multiply(new THREE.Quaternion().setFromAxisAngle(ZP, rng.range(-0.6, 0.6)));
  _m.compose(pos, _q, _v2.set(1, 1, 1));
  geo.applyMatrix4(_m);
  // shading normal: spherical (outward) lifted toward the sky so canopy tops catch the sun
  const shade = nrm.clone().lerp(UP, up).normalize();
  const n = geo.attributes.normal.array;
  for (let i = 0; i < 4; i++) { n[i * 3] = shade.x; n[i * 3 + 1] = shade.y; n[i * 3 + 2] = shade.z; }
  setColor(geo, (x, y, z, out) => { out[0] = tint[0] * ao; out[1] = tint[1] * ao; out[2] = tint[2] * ao; });
  setFlex(geo, () => flex);
  parts.push(clean(geo));
}

// ---------------------------------------------------------------- species
function buildOak(rng, lod) {
  const h = 1;                    // unit tree, scaled per instance (base height ~1 m => scale = metres)
  const trunkH = 0.34;
  const near = lod === 0;
  const sk = grow(rng, {
    origin: new THREE.Vector3(0, 0, 0), dir: new THREE.Vector3(rng.range(-0.06, 0.06), 1, rng.range(-0.06, 0.06)),
    length: trunkH, r0: 0.033, r1: 0.022, depth: 0, maxDepth: near ? 2 : 0,
    sides: near ? 5 : 4, rings: near ? 3 : 2, curve: rng.range(-0.06, 0.06),
    splits: near ? 2 : 3, spread: 0.78, lengthK: 0.64, radiusK: 0.50, gravity: 0.02,
  });
  const bark = barkGeometry(sk.geos, 'oak', 0.85);
  const leaves = [];
  const cards = near ? 84 : 30;
  const uvs = [leafUV('oakA'), leafUV('oakA'), leafUV('oakB')];
  const autumnUV = leafUV('maple');
  const centre = new THREE.Vector3(0, 0.66, 0);
  const R = 0.47;
  const tips = sk.tips;
  for (let i = 0; i < cards; i++) {
    // near LOD: bias placement toward real branch tips. far LOD: a shell on the crown ellipsoid.
    let pos;
    if (near) {
      const tip = tips.length ? tips[(rng.float() * tips.length) | 0] : { p: centre };
      pos = tip.p.clone();
      pos.x += rng.gauss() * R * 0.30; pos.z += rng.gauss() * R * 0.30; pos.y += rng.gauss() * R * 0.22;
    } else {
      const a = rng.float() * Math.PI * 2, u = rng.range(-0.62, 0.98);
      const rr = Math.sqrt(Math.max(0, 1 - u * u)) * R * rng.range(0.55, 1.0);
      pos = new THREE.Vector3(Math.cos(a) * rr, centre.y + u * R * 0.84, Math.sin(a) * rr);
    }
    pos.y = Math.max(0.34, pos.y);
    const outward = pos.clone().sub(centre);
    outward.y *= 1.5;
    if (outward.lengthSq() < 1e-5) outward.set(0, 1, 0);
    const d = Math.min(1, outward.length() / R);
    const w = (near ? 0.205 : 0.265) * rng.range(0.85, 1.18);
    const ao = 0.46 + 0.54 * d * (0.72 + 0.28 * THREE.MathUtils.clamp((pos.y - 0.4) / 0.5, 0, 1));
    const autumn = rng.float() < 0.10 ? 1 : 0;
    const tint = autumn ? [1.16, 0.90, 0.52] : [1, 1, 1];
    pushCard(leaves, rng, { pos, outward, w, h: w * rng.range(0.86, 1.02), uv: autumn ? autumnUV : uvs[(rng.float() * uvs.length) | 0], tiltMax: 0.30, tint, ao, flex: 0.9 + rng.float() * 0.4 });
  }
  return { bark, leaf: mergeGeometries(leaves, false), height: 1.0 };
}

function buildPine(rng, lod) {
  const near = lod === 0;
  const nodes = [];
  const rings = near ? 5 : 3;
  const lean = rng.range(-0.02, 0.02);
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    nodes.push({ p: new THREE.Vector3(lean * t * t, t * 0.98, lean * 0.5 * t * t), r: 0.030 * (1 - t * 0.88) + 0.004 });
  }
  const geos = [tube(nodes, near ? 6 : 4, 3.4)];
  if (near) {
    // a few dead lower branches
    for (let i = 0; i < 4; i++) {
      const y = rng.range(0.24, 0.46);
      const a = rng.float() * Math.PI * 2;
      const dir = new THREE.Vector3(Math.cos(a), rng.range(-0.35, -0.1), Math.sin(a)).normalize();
      const p0 = new THREE.Vector3(0, y, 0);
      const len = rng.range(0.10, 0.17);
      geos.push(tube([{ p: p0, r: 0.009 }, { p: p0.clone().addScaledVector(dir, len * 0.5), r: 0.006 }, { p: p0.clone().addScaledVector(dir, len), r: 0.002 }], 4, 3.4));
    }
  }
  const bark = barkGeometry(geos, 'pine', 0.9);
  const leaves = [];
  const tiers = near ? 11 : 5;
  const uvs = [leafUV('pineA'), leafUV('pineB')];
  const perTier = near ? 11 : 6;
  for (let t = 0; t < tiers; t++) {
    const f = t / (tiers - 1);
    const y = 0.30 + f * 0.70;
    const rad = 0.30 * Math.pow(1 - f, 0.72) + 0.028;
    const base = rng.float() * Math.PI * 2;
    for (let i = 0; i < perTier; i++) {
      const a = base + (i / perTier) * Math.PI * 2 + rng.range(-0.25, 0.25);
      const rr = rad * rng.range(0.55, 1.0);
      const pos = new THREE.Vector3(Math.cos(a) * rr, y + rng.range(-0.02, 0.02), Math.sin(a) * rr);
      const outward = new THREE.Vector3(Math.cos(a), 0.62, Math.sin(a));
      const w = (near ? 0.215 : 0.255) * (0.65 + (1 - f) * 0.75) * rng.range(0.85, 1.15);
      const ao = 0.42 + 0.58 * (0.35 + 0.65 * f) * rng.range(0.85, 1.1);
      pushCard(leaves, rng, { pos, outward, w, h: w * 0.85, uv: uvs[(rng.float() * uvs.length) | 0], tiltMax: 0.20, tint: [1.0, 1.0, 0.92], ao: Math.min(1.15, ao), flex: 0.5 + f * 0.7, up: 0.42 });
    }
  }
  return { bark, leaf: mergeGeometries(leaves, false), height: 1.0 };
}

function buildBirch(rng, lod) {
  const near = lod === 0;
  const stems = near && rng.bool(0.45) ? 2 : 1;
  const geos = [];
  const tips = [];
  for (let s = 0; s < stems; s++) {
    const a0 = rng.float() * Math.PI * 2;
    const off = stems > 1 ? new THREE.Vector3(Math.cos(a0 + s * Math.PI) * 0.035, 0, Math.sin(a0 + s * Math.PI) * 0.035) : new THREE.Vector3();
    const sk = grow(rng, {
      origin: off, dir: new THREE.Vector3(off.x * 8 + rng.range(-0.10, 0.10), 1, off.z * 8 + rng.range(-0.10, 0.10)).normalize(),
      length: 0.60, r0: 0.019, r1: 0.010, depth: 0, maxDepth: near ? 2 : 0,
      sides: near ? 6 : 4, rings: near ? 3 : 2, curve: rng.range(-0.08, 0.08),
      splits: 3, spread: 0.66, lengthK: 0.50, radiusK: 0.46, gravity: -0.05,
    });
    geos.push(...sk.geos); tips.push(...sk.tips);
  }
  const bark = barkGeometry(geos, 'birch', 0.9);
  const leaves = [];
  const cards = near ? 60 : 26;
  const uv = leafUV('birch');
  const centre = new THREE.Vector3(0, 0.70, 0);
  for (let i = 0; i < cards; i++) {
    let pos;
    if (near) {
      const tip = tips[(rng.float() * tips.length) | 0];
      pos = tip.p.clone();
      pos.x += rng.gauss() * 0.13; pos.z += rng.gauss() * 0.13; pos.y += rng.gauss() * 0.10 - 0.04;
    } else {
      const a = rng.float() * Math.PI * 2, u = rng.range(-0.7, 0.95);
      const rr = Math.sqrt(Math.max(0, 1 - u * u)) * 0.40 * rng.range(0.55, 1.0);
      pos = new THREE.Vector3(Math.cos(a) * rr, centre.y + u * 0.34, Math.sin(a) * rr);
    }
    pos.y = Math.max(0.42, Math.min(1.03, pos.y));
    const outward = pos.clone().sub(centre); outward.y *= 1.2;
    if (outward.lengthSq() < 1e-5) outward.set(0, 1, 0);
    const d = Math.min(1, outward.length() / 0.34);
    const w = (near ? 0.165 : 0.205) * rng.range(0.85, 1.15);
    const ao = 0.52 + 0.48 * d;
    const autumn = rng.float() < 0.2 ? 1 : 0;
    pushCard(leaves, rng, { pos, outward, w, h: w * 1.0, uv, tiltMax: 0.32, tint: autumn ? [1.2, 1.02, 0.5] : [1.02, 1.06, 0.86], ao, flex: 1.1 + rng.float() * 0.5 });
  }
  return { bark, leaf: mergeGeometries(leaves, false), height: 1.05 };
}

const BUILDERS = { oak: buildOak, pine: buildPine, birch: buildBirch };

// ---------------------------------------------------------------- impostor
function buildImpostor(species) {
  const uv = impostorUV(species);
  const conifer = species === 'pine';
  const w = conifer ? 0.62 : 0.94;
  const parts = [];
  for (let i = 0; i < 2; i++) {
    const g = leafCard(w, 1.0, uv);
    _m.makeRotationY(i * Math.PI * 0.5);
    _m.setPosition(0, 0.5, 0);
    g.applyMatrix4(_m);
    // billboard-ish shading: normal points up-and-out so distant trees are lit like volumes
    const n = g.attributes.normal.array;
    for (let k = 0; k < 4; k++) { n[k * 3] = n[k * 3] * 0.5; n[k * 3 + 1] = 0.8; n[k * 3 + 2] = n[k * 3 + 2] * 0.5; }
    parts.push(g);
  }
  const cap = groundCard(w * 0.92, w * 0.92, impostorTopUV(conifer));
  _m.makeTranslation(0, conifer ? 0.80 : 0.68, 0);
  cap.applyMatrix4(_m);
  parts.push(cap);
  const g = mergeGeometries(parts, false);
  setColor(g, (x, y, z, out) => { out[0] = out[1] = out[2] = 1; });
  setFlex(g, (x, y) => y * 0.04);
  return clean(g);
}

// ---------------------------------------------------------------- materials
export function makeTreeMaterials(barkSet, leafMap, impostorMap, wind) {
  const bark = new THREE.MeshStandardMaterial({
    map: barkSet.map, normalMap: barkSet.normalMap, vertexColors: true,
    roughness: 0.92, metalness: 0, normalScale: new THREE.Vector2(0.9, 0.9),
  });
  bark.map.wrapS = bark.map.wrapT = THREE.RepeatWrapping;
  bark.normalMap.wrapS = bark.normalMap.wrapT = THREE.RepeatWrapping;
  const leaf = new THREE.MeshStandardMaterial({
    map: leafMap, vertexColors: true, alphaTest: 0.42, side: THREE.DoubleSide,
    roughness: 0.78, metalness: 0,
  });
  const impostor = new THREE.MeshStandardMaterial({
    map: impostorMap, vertexColors: true, alphaTest: 0.45, side: THREE.DoubleSide,
    roughness: 0.85, metalness: 0,
  });
  applyWind(bark, wind, false);
  applyWind(leaf, wind, true);
  applyWind(impostor, wind, false);
  return { bark, leaf, impostor };
}

/** Shared vertex-shader wind hook. Chains ahead of the environment's CSM/fog hook. */
export function applyWind(material, wind, isLeaf) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = wind.uTime;
    shader.uniforms.uWind = wind.uWind;
    shader.vertexShader = 'attribute float aFlex;\nuniform float uTime;\nuniform vec3 uWind;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
#ifdef USE_INSTANCING
  vec2 iOrg = vec2( instanceMatrix[3][0], instanceMatrix[3][2] );
#else
  vec2 iOrg = vec2( 0.0 );
#endif
  float wPh = uTime * uWind.z + iOrg.x * 0.13 + iOrg.y * 0.09;
  float wS = sin( wPh ) * 0.72 + sin( wPh * 2.31 + 1.3 ) * 0.28;
  transformed.x += wS * aFlex * uWind.x;
  transformed.z += wS * aFlex * uWind.y;
${isLeaf ? '  float wF = sin( wPh * 4.7 + transformed.y * 9.0 + transformed.x * 7.0 );\n  transformed.y += wF * aFlex * 0.035 * length( uWind.xy );' : ''}
`);
  };
  material.customProgramCacheKey = () => (isLeaf ? 'props-wind-leaf' : 'props-wind-bark');
  return material;
}

// ---------------------------------------------------------------- public build
/**
 * Build geometry for every species x LOD, plus the impostors.
 * Each species gets `variants` distinct shapes merged into one geometry set? No — one shape per
 * species/LOD keeps instancing to a single mesh; per-instance scale/rotation/tint supply the variety.
 */
export function buildTreeGeometries(rng) {
  const out = {};
  for (const sp of SPECIES) {
    out[sp] = {
      lod: [0, 1].map((l) => {
        const r = rng.fork(`${sp}-lod${l}`);
        const b = BUILDERS[sp](r, l);
        return { bark: b.bark, leaf: b.leaf, height: b.height };
      }),
      impostor: buildImpostor(sp),
    };
  }
  return out;
}
