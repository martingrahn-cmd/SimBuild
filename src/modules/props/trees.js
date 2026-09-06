// One canonical unit tree per LOD tier, morphed into eight species by per-instance attributes.
//
// The spec's geometry rule is one InstancedMesh per (kind-class x LOD tier x 256 m chunk) with
// "species as an instance attribute, never a mesh of its own". So the geometry stores, per vertex,
// an anchor in a canonical crown space plus a local offset, and the vertex shader rebuilds the real
// position from the species' crown envelope:
//
//   leaf card:  y = crownBot + t*(1-crownBot-leafK*0.55)
//               r = crownR * (t+0.02)^profB * (1-t)^profA        (crownR pre-divided by the max)
//   trunk:      xz *= spread ,  tube radius *= trunkK
//
// so a spruce spire, an oak dome, a poplar column, a willow parasol and a blossom bush all come out
// of the same buffer, one draw call, and the shadow map cuts the same leaf shapes.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LEAF_CELL, LEAF_GRID, cellRect, IMP_GRID, IMP_QUAD } from './textures.js';

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _m = new THREE.Matrix4();
const UP = new THREE.Vector3(0, 1, 0);
const ZP = new THREE.Vector3(0, 0, 1);

// ------------------------------------------------------------------ geometry helpers
/**
 * Sweep a tapered tube along [{p,r}] nodes. Returns raw arrays so the caller can decide what goes
 * into `position` (the offset from the spine) and what goes into `aCenter` (the spine point itself).
 */
function tubeParts(nodes, sides, arc0 = 0) {
  const rings = nodes.length;
  const n = rings * (sides + 1);
  const center = new Float32Array(n * 3);
  const offset = new Float32Array(n * 3);
  const normal = new Float32Array(n * 3);
  const uv = new Float32Array(n * 2);
  const idx = [];
  const dir = new THREE.Vector3(), tx = new THREE.Vector3(), ty = new THREE.Vector3();
  let arc = arc0;
  for (let i = 0; i < rings; i++) {
    const a = nodes[i].p;
    if (i < rings - 1) dir.copy(nodes[i + 1].p).sub(a).normalize();
    else dir.copy(a).sub(nodes[i - 1].p).normalize();
    if (i > 0) arc += nodes[i].p.distanceTo(nodes[i - 1].p);
    tx.crossVectors(Math.abs(dir.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : UP, dir).normalize();
    ty.crossVectors(dir, tx).normalize();
    for (let s = 0; s <= sides; s++) {
      const ang = (s / sides) * Math.PI * 2;
      const cx = Math.cos(ang), sy = Math.sin(ang);
      const nx = tx.x * cx + ty.x * sy, ny = tx.y * cx + ty.y * sy, nz = tx.z * cx + ty.z * sy;
      const o = i * (sides + 1) + s;
      center[o * 3] = a.x; center[o * 3 + 1] = a.y; center[o * 3 + 2] = a.z;
      offset[o * 3] = nx * nodes[i].r; offset[o * 3 + 1] = ny * nodes[i].r; offset[o * 3 + 2] = nz * nodes[i].r;
      normal[o * 3] = nx; normal[o * 3 + 1] = ny; normal[o * 3 + 2] = nz;
      uv[o * 2] = s / sides; uv[o * 2 + 1] = arc;
    }
  }
  for (let i = 0; i < rings - 1; i++) for (let s = 0; s < sides; s++) {
    const a = i * (sides + 1) + s, b = a + 1, c = a + sides + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  return { center, offset, normal, uv, idx, count: n, arcEnd: arc };
}

/** Accumulates canonical tree parts into one indexed BufferGeometry. */
class TreeAccum {
  constructor() {
    this.center = []; this.offset = []; this.normal = []; this.uv = [];
    this.data = []; this.color = []; this.index = [];
    this.n = 0;
  }
  pushTube(parts, flex, aoTop, height) {
    const base = this.n;
    for (let i = 0; i < parts.count; i++) {
      const y = parts.center[i * 3 + 1];
      this.center.push(parts.center[i * 3], y, parts.center[i * 3 + 2]);
      this.offset.push(parts.offset[i * 3], parts.offset[i * 3 + 1], parts.offset[i * 3 + 2]);
      this.normal.push(parts.normal[i * 3], parts.normal[i * 3 + 1], parts.normal[i * 3 + 2]);
      this.uv.push(parts.uv[i * 2], parts.uv[i * 2 + 1]);
      const f = flex * Math.min(1, Math.max(0, (y - 0.10) / 0.9)) ** 2;
      this.data.push(0, f, 0);
      const ao = 0.62 + 0.38 * Math.min(1, y / Math.max(0.2, height * 0.7));
      this.color.push(ao * aoTop, ao * aoTop, ao * aoTop);
    }
    for (const i of parts.idx) this.index.push(base + i);
    this.n += parts.count;
  }
  pushCard(centerDir, t, corners, nrm, ao, flex) {
    const base = this.n;
    for (let k = 0; k < 4; k++) {
      this.center.push(centerDir.x, t, centerDir.z);
      this.offset.push(corners[k].x, corners[k].y, corners[k].z);
      this.normal.push(nrm.x, nrm.y, nrm.z);
      this.uv.push(k === 0 || k === 3 ? 0 : 1, k < 2 ? 0 : 1);
      this.data.push(1, flex, 0);
      this.color.push(ao, ao, ao);
    }
    this.index.push(base, base + 1, base + 2, base, base + 2, base + 3);
    this.n += 4;
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.offset, 3));
    g.setAttribute('aCenter', new THREE.Float32BufferAttribute(this.center, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.normal, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('aData', new THREE.Float32BufferAttribute(this.data, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.color, 3));
    g.setIndex(this.index);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.5, 0), 1.25);
    g.boundingBox = new THREE.Box3(new THREE.Vector3(-1, 0, -1), new THREE.Vector3(1, 1.2, 1));
    return g;
  }
}

/** Canonical branch skeleton: a main stem plus whorls of primaries, each forking into secondaries. */
function skeleton(rng, acc, lod) {
  const near = lod === 0;
  const stemRings = near ? 8 : 5;
  const stemSides = near ? 6 : 4;
  const nodes = [];
  const lean = rng.range(-0.012, 0.012);
  for (let i = 0; i <= stemRings; i++) {
    const t = i / stemRings;
    const r = 0.030 * (1 - 0.90 * Math.pow(t, 0.72)) + 0.0022;
    nodes.push({ p: new THREE.Vector3(lean * t * t, t, lean * 0.6 * t * t), r });
  }
  acc.pushTube(tubeParts(nodes, stemSides), 0.30, 1.0, 1.0);

  const whorls = near ? [0.34, 0.48, 0.62] : [0.42];
  const perWhorl = near ? 3 : 3;
  let a0 = rng.float() * Math.PI * 2;
  for (const y0 of whorls) {
    for (let i = 0; i < perWhorl; i++) {
      const a = a0 + (i / perWhorl) * Math.PI * 2 + rng.range(-0.35, 0.35);
      const up = rng.range(0.55, 0.85);
      const L = 0.30 * (1.05 - y0) * rng.range(0.85, 1.15);
      const dir = new THREE.Vector3(Math.cos(a), up, Math.sin(a)).normalize();
      const r0 = 0.030 * (1 - 0.9 * Math.pow(y0, 0.72)) * 0.72;
      const p0 = new THREE.Vector3(0, y0, 0);
      const seg = near ? 4 : 3;
      const bn = [];
      for (let k = 0; k <= seg; k++) {
        const t = k / seg;
        const p = p0.clone().addScaledVector(dir, L * t);
        p.y += 0.10 * L * t * t;
        bn.push({ p, r: r0 * (1 - 0.62 * t) + 0.0016 });
      }
      acc.pushTube(tubeParts(bn, near ? 4 : 4), 0.62, 0.96, 1.0);
      if (!near) continue;
      // secondaries
      const tip = bn[bn.length - 1].p;
      for (let s = 0; s < 1; s++) {
        const aa = a + rng.range(-0.9, 0.9);
        const d2 = new THREE.Vector3(Math.cos(aa), up + rng.range(0.05, 0.35), Math.sin(aa)).normalize();
        const L2 = L * rng.range(0.34, 0.52);
        const sn = [];
        for (let k = 0; k <= 3; k++) {
          const t = k / 3;
          const p = tip.clone().addScaledVector(d2, L2 * t);
          p.y += 0.08 * L2 * t * t;
          sn.push({ p, r: r0 * 0.42 * (1 - 0.6 * t) + 0.0012 });
        }
        acc.pushTube(tubeParts(sn, 3), 0.95, 0.90, 1.0);
      }
    }
    a0 += 0.9;
  }
}

/** Leaf cards distributed through the canonical crown (unit direction x radial fraction, height t). */
function canopy(rng, acc, lod) {
  const crossed = lod === 0;
  const cards = lod === 0 ? 110 : 34;
  for (let i = 0; i < cards; i++) {
    const t = 0.03 + 0.97 * Math.pow(rng.float(), 0.80);
    const rn = 0.40 + 0.60 * Math.pow(rng.float(), 0.38);
    const a = rng.float() * Math.PI * 2;
    const dir = new THREE.Vector3(Math.cos(a) * rn, 0, Math.sin(a) * rn);
    // card faces outward, lifted toward the sky, then rolled
    const outward = new THREE.Vector3(Math.cos(a), 0.55 + (t - 0.5) * 0.7, Math.sin(a)).normalize();
    // orientation is mostly random so the crown silhouette is not a ring of edge-on cards
    const jitter = new THREE.Vector3(rng.gauss(), rng.gauss() * 0.7, rng.gauss());
    if (jitter.lengthSq() < 1e-6) jitter.set(0, 1, 0);
    jitter.normalize();
    const face = outward.clone().lerp(jitter, 0.88);
    if (face.lengthSq() < 1e-6) face.copy(outward);
    face.normalize();
    _m.lookAt(_v.set(0, 0, 0), face, UP);
    _q.setFromRotationMatrix(_m);
    _q.multiply(new THREE.Quaternion().setFromAxisAngle(ZP, rng.range(-0.42, 0.42)));
    const sz = (lod === 0 ? 1.10 : 2.30) * rng.range(0.88, 1.18);
    const hw = 0.5 * sz, hh = 0.5 * sz * rng.range(0.90, 1.08);
    const corners = [
      new THREE.Vector3(-hw, -hh, 0), new THREE.Vector3(hw, -hh, 0),
      new THREE.Vector3(hw, hh, 0), new THREE.Vector3(-hw, hh, 0),
    ].map((v) => v.applyQuaternion(_q));
    const nrm = outward.clone().lerp(UP, 0.28).normalize();
    const ao = Math.min(1.0, (0.74 + 0.26 * rn) * (0.88 + 0.14 * t));
    const flex = lod === 0 ? 0.70 + rng.float() * 0.55 : 0.85 + rng.float() * 0.4;
    acc.pushCard(dir, t, corners, nrm, ao, flex);
    if (crossed) {
      const cross = [
        new THREE.Vector3(0, -hh, -hw), new THREE.Vector3(0, -hh, hw),
        new THREE.Vector3(0, hh, hw), new THREE.Vector3(0, hh, -hw),
      ].map((v) => v.applyQuaternion(_q));
      const n2 = outward.clone().lerp(UP, 0.45).normalize();
      acc.pushCard(dir, t, cross, n2, ao * 0.94, flex);
    }
  }
}

export function buildTreeGeometry(rng, lod) {
  const acc = new TreeAccum();
  skeleton(rng.fork(`skel${lod}`), acc, lod);
  canopy(rng.fork(`can${lod}`), acc, lod);
  return acc.build();
}

/** Impostor: one view-facing vertical quad + one horizontal canopy cap; whichever the view needs. */
export function buildImpostorGeometry() {
  const pos = [], nrm = [], uv = [], data = [], col = [], idx = [];
  const push = (p, n, u, d) => { pos.push(p[0], p[1], p[2]); nrm.push(n[0], n[1], n[2]); uv.push(u[0], u[1]); data.push(d, 0, 0); col.push(1, 1, 1); };
  // side quad: x in [-0.5,0.5], y in [0,1] (canonical quad units)
  push([-0.5, 0, 0], [0, 0.55, 0.84], [0, 0], 0);
  push([0.5, 0, 0], [0, 0.55, 0.84], [1, 0], 0);
  push([0.5, 1, 0], [0, 0.55, 0.84], [1, 1], 0);
  push([-0.5, 1, 0], [0, 0.55, 0.84], [0, 1], 0);
  idx.push(0, 1, 2, 0, 2, 3);
  // cap quad: horizontal, y filled in from the instance's crown centre
  push([-0.5, 0, 0.5], [0, 1, 0], [0, 0], 1);
  push([0.5, 0, 0.5], [0, 1, 0], [1, 0], 1);
  push([0.5, 0, -0.5], [0, 1, 0], [1, 1], 1);
  push([-0.5, 0, -0.5], [0, 1, 0], [0, 1], 1);
  idx.push(4, 5, 6, 4, 6, 7);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aData', new THREE.Float32BufferAttribute(data, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.6, 0), 1.4);
  g.boundingBox = new THREE.Box3(new THREE.Vector3(-1, 0, -1), new THREE.Vector3(1, 1.5, 1));
  return g;
}

// ------------------------------------------------------------------ shaders
const SOLID = cellRect(LEAF_CELL.solid);
const CELLS = 1 / LEAF_GRID;

const TREE_VERT_HEAD = `
attribute vec3 aCenter;
attribute vec3 aData;
attribute vec4 iA;
attribute vec4 iB;
attribute vec3 iTint;
attribute float iFade;
uniform float uWindPhase;
uniform vec3 uWind;
varying float vPart;
varying vec3 vTint;
varying float vFade;
varying vec2 vBarkUv;
`;

const TREE_VERT_BODY = `
  float sc = length( instanceMatrix[ 0 ].xyz );
  vPart = part;
  vTint = iTint;
  vFade = iFade;
  float crownR = iA.x, profA = iA.y, profB = iA.z, crownBot = iA.w;
  float trunkK = iB.x, leafK = iB.y, spread = iB.z;
  vec3 anchor;
  if ( part < 0.5 ) {
    anchor = vec3( aCenter.x * spread, aCenter.y, aCenter.z * spread );
    transformed = anchor + position * trunkK;
    vBarkUv = vec2( ( barkCol + clamp( uv.x, 0.0, 1.0 ) ) * 0.3333333, uv.y * sc / 1.6 );
  } else {
    float t = aCenter.y;
    float top = 1.0 - leafK * 0.55;
    float y = crownBot + t * max( 0.05, top - crownBot );
    float prof = pow( t + 0.16, profB ) * pow( max( 0.0, 1.0 - t ), profA );
    float r = crownR * prof;
    anchor = vec3( aCenter.x * r, y, aCenter.z * r );
    transformed = anchor + position * leafK;
    vBarkUv = vec2( 0.0 );
  }
  {
    vec2 org = vec2( instanceMatrix[ 3 ][ 0 ], instanceMatrix[ 3 ][ 2 ] );
    float ph = uWindPhase + org.x * 0.13 + org.y * 0.091;
    float w = sin( ph ) * 0.72 + sin( ph * 2.31 + 1.3 ) * 0.28;
    float fl = aData.y;
    transformed.x += w * fl * uWind.x;
    transformed.z += w * fl * uWind.y;
    transformed.y -= abs( w ) * fl * uWind.z;
  }
`;

const TREE_UV = `
  {
    float cx = mod( leafCell, ${LEAF_GRID}.0 );
    float cy = floor( leafCell / ${LEAF_GRID}.0 );
    vec2 cellOrg = vec2( cx * ${CELLS.toFixed(6)}, 1.0 - ( cy + 1.0 ) * ${CELLS.toFixed(6)} );
    vec2 solidOrg = vec2( ${SOLID[0].toFixed(6)}, ${SOLID[1].toFixed(6)} );
    vec2 luv = clamp( uv, 0.0, 1.0 ) * ${CELLS.toFixed(6)};
    vMapUv = ( part < 0.5 ? solidOrg + vec2( 0.5, 0.5 ) * ${CELLS.toFixed(6)} : cellOrg + luv );
  }
`;

const DITHER = `
  {
    float dth = fract( sin( dot( floor( gl_FragCoord.xy ), vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );
    float f = vFade;
    if ( f >= 0.0 ) { if ( dth > f ) discard; }
    else { if ( dth <= -f ) discard; }
  }
`;

/** Attach the canonical-tree vertex morph (and, for the visual material, the bark sampler). */
function hookTree(material, uniforms, { visual }) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = TREE_VERT_HEAD + shader.vertexShader;
    shader.vertexShader = shader.vertexShader
      .replace('#include <uv_vertex>', '#include <uv_vertex>\n__TREE_UV__')
      .replace('#include <begin_vertex>', 'vec3 transformed = vec3( 0.0 );\n' + TREE_VERT_BODY)
      .replace('__TREE_UV__', TREE_UV);
    // the uv chunk runs before begin_vertex, so hoist the few locals it needs
    shader.vertexShader = shader.vertexShader.replace('void main() {', `void main() {
  float part = aData.x;
  float cellIx = floor( iB.w + 0.5 );
  float barkCol = floor( cellIx / 16.0 );
  float leafCell = cellIx - barkCol * 16.0;
`);
    shader.fragmentShader = `
varying float vPart;
varying vec3 vTint;
varying float vFade;
varying vec2 vBarkUv;
uniform sampler2D uBark;
` + shader.fragmentShader;
    if (visual) {
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
  if ( vPart < 0.5 ) {
    vec4 bk = texture2D( uBark, vBarkUv );
    diffuseColor.rgb = bk.rgb * vColor.rgb;
    diffuseColor.a = 1.0;
  } else {
    diffuseColor.rgb *= vTint;
  }
`);
    }
    shader.fragmentShader = shader.fragmentShader.replace('#include <alphatest_fragment>', '#include <alphatest_fragment>' + DITHER);
  };
  material.customProgramCacheKey = () => `props-tree-${visual ? 'v' : 'd'}`;
  return material;
}

const IMP_VERT_HEAD = `
attribute vec3 aData;
attribute vec4 iA;
attribute vec3 iTint;
attribute float iFade;
uniform vec3 uCamPos;
uniform float uTopDown;
varying vec3 vTint;
varying float vFade;
varying float vFar;
`;

const IMP_VERT_BODY = `
  float sc = length( instanceMatrix[ 0 ].xyz );
  float Q = iA.x;
  float capY = iA.y;
  vTint = iTint;
  vFade = iFade;
  float isCap = aData.x;
  float vis = mix( 1.0 - uTopDown, uTopDown, isCap );
  mat3 rot = mat3( instanceMatrix[ 0 ].xyz / sc, instanceMatrix[ 1 ].xyz / sc, instanceMatrix[ 2 ].xyz / sc );
  vec3 d = uCamPos - instanceMatrix[ 3 ].xyz;
  vec3 dObj = d * rot;
  dObj.y = 0.0;
  if ( dot( dObj, dObj ) < 1e-6 ) dObj = vec3( 0.0, 0.0, 1.0 );
  dObj = normalize( dObj );
  vec3 right = vec3( -dObj.z, 0.0, dObj.x );
  vec3 off;
  if ( isCap < 0.5 ) off = right * ( position.x * Q ) + vec3( 0.0, position.y * Q, 0.0 );
  else off = vec3( position.x * Q, capY, position.z * Q );
  vec3 pivot = vec3( 0.0, isCap < 0.5 ? Q * 0.5 : capY, 0.0 );
  transformed = pivot + ( off - pivot ) * vis;
  vFar = smoothstep( 280.0, 640.0, length( d ) );
`;

const IMP_UV = `
  {
    float ci = floor( iA.w + 0.5 );
    float cell = mix( ci, ci + 5.0, uTopDown );
    float cx = mod( cell, ${IMP_GRID}.0 );
    float cy = floor( cell / ${IMP_GRID}.0 );
    float s = ${(1 / IMP_GRID).toFixed(6)};
    vMapUv = vec2( cx * s, 1.0 - ( cy + 1.0 ) * s ) + clamp( uv, 0.0, 1.0 ) * s;
  }
`;

function hookImpostor(material, uniforms, { visual }) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = IMP_VERT_HEAD + shader.vertexShader;
    shader.vertexShader = shader.vertexShader
      .replace('#include <uv_vertex>', '#include <uv_vertex>' + IMP_UV)
      .replace('#include <begin_vertex>', 'vec3 transformed = vec3( 0.0 );\n' + IMP_VERT_BODY);
    shader.fragmentShader = 'varying vec3 vTint;\nvarying float vFade;\nvarying float vFar;\n' + shader.fragmentShader;
    if (visual) {
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb *= vTint;\n');
    }
    shader.fragmentShader = shader.fragmentShader.replace('#include <alphatest_fragment>',
      '  diffuseColor.a = clamp( diffuseColor.a * ( 1.0 + vFar * 1.7 ), 0.0, 1.0 );\n#include <alphatest_fragment>' + DITHER);
  };
  material.customProgramCacheKey = () => `props-imp-${visual ? 'v' : 'd'}`;
  return material;
}

/**
 * Materials for the tree kind-class. `uniforms` is shared so the wind phase, the bark samplers and
 * the impostor's own camera uniform (never `cameraPosition` — that breaks under the water reflection
 * camera) are written once per frame.
 */
export function makeTreeMaterials(tex, uniforms) {
  const treeMat = new THREE.MeshStandardMaterial({
    map: tex.leaf, vertexColors: true, alphaTest: 0.45, side: THREE.DoubleSide,
    roughness: 0.80, metalness: 0,
  });
  const treeDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex.leaf, alphaTest: 0.45, side: THREE.DoubleSide });
  hookTree(treeMat, uniforms, { visual: true });
  hookTree(treeDepth, uniforms, { visual: false });
  treeDepth.userData.envSkip = true;

  const impMat = new THREE.MeshStandardMaterial({
    map: tex.impostor, vertexColors: true, alphaTest: 0.42, side: THREE.DoubleSide,
    roughness: 0.86, metalness: 0,
  });
  const impDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex.impostor, alphaTest: 0.42, side: THREE.DoubleSide });
  hookImpostor(impMat, uniforms, { visual: true });
  hookImpostor(impDepth, uniforms, { visual: false });
  impDepth.userData.envSkip = true;

  return { treeMat, treeDepth, impMat, impDepth };
}

export { IMP_QUAD };
