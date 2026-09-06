// 256 m chunk renderer.
//
// Per non-empty chunk, at most:
//   trees LOD0  (InstancedMesh, casts)        trees LOD1 (InstancedMesh, casts)
//   trees impostor (InstancedMesh, casts only top-down)
//   hard furniture (ONE merged geometry, casts)     alpha foliage (ONE merged geometry, casts)
// plus three global non-casting transparent meshes: lamp pools, lamp halos, signal lenses.
//
// The 256 m deviation from ARCHITECTURE section 9's 128 m tiles is recorded in
// docs/core-requests/props.md: chunk count is what the cascade multiplier multiplies.
import * as THREE from 'three';
import { LAYERS, RENDER_ORDER } from '../../core/constants.js';
import { SPECIES } from './species.js';
import { IMP_QUAD } from './textures.js';

export const CHUNK = 256;
const GRID = 8;                       // 8 x 8 chunks span the 2048 m world
const SUB = 64;                       // LOD sub-bucket inside a chunk
const HALF = 1024;

const LOD0_R = 60, LOD1_R = 175, BAND = 12;
const CAP0 = 48, CAP1 = 520;
const DETAIL_R = 620;                 // beyond this a chunk contributes only its impostor draw
const FOLIAGE_R = 260;                // bushes/hedges/litter stop drawing well before that
const FOLIAGE_CAST_R = 170;           // ... and stop casting sooner still
const FURN_CAST_R = 250;
const LOD1_CAST_R = 120;

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _sphere = new THREE.Sphere();
const _frustum = new THREE.Frustum();
const _pm = new THREE.Matrix4();

export const chunkIndex = (x, z) => {
  const cx = Math.min(GRID - 1, Math.max(0, Math.floor((x + HALF) / CHUNK)));
  const cz = Math.min(GRID - 1, Math.max(0, Math.floor((z + HALF) / CHUNK)));
  return cz * GRID + cx;
};

// ------------------------------------------------------------------ merged-geometry accumulator
class MeshAccum {
  constructor(withUv1) {
    this.pos = []; this.nrm = []; this.uv = []; this.uv1 = withUv1 ? [] : null;
    this.col = []; this.idx = []; this.n = 0;
  }
  add(src, matrix) {
    const p = src.attributes.position.array;
    const nAttr = src.attributes.normal;
    const uv = src.attributes.uv ? src.attributes.uv.array : null;
    const uv1 = src.attributes.uv1 ? src.attributes.uv1.array : null;
    const col = src.attributes.color ? src.attributes.color.array : null;
    const count = src.attributes.position.count;
    const nm = new THREE.Matrix3().getNormalMatrix(matrix);
    const base = this.n;
    for (let i = 0; i < count; i++) {
      _p.set(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]).applyMatrix4(matrix);
      this.pos.push(_p.x, _p.y, _p.z);
      if (nAttr) {
        _p.set(nAttr.array[i * 3], nAttr.array[i * 3 + 1], nAttr.array[i * 3 + 2]).applyMatrix3(nm).normalize();
        this.nrm.push(_p.x, _p.y, _p.z);
      } else this.nrm.push(0, 1, 0);
      this.uv.push(uv ? uv[i * 2] : 0, uv ? uv[i * 2 + 1] : 0);
      if (this.uv1) this.uv1.push(uv1 ? uv1[i * 2] : 0, uv1 ? uv1[i * 2 + 1] : 0);
      this.col.push(col ? col[i * 3] : 1, col ? col[i * 3 + 1] : 1, col ? col[i * 3 + 2] : 1);
    }
    const idx = src.index ? src.index.array : null;
    if (idx) for (let i = 0; i < idx.length; i++) this.idx.push(base + idx[i]);
    else for (let i = 0; i < count; i++) this.idx.push(base + i);
    this.n += count;
  }
  build() {
    if (!this.n) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    if (this.uv1) g.setAttribute('uv1', new THREE.Float32BufferAttribute(this.uv1, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  }
}

/** A per-chunk InstancedMesh sharing the base geometry's static attributes. */
function instancedFrom(base, material, depthMaterial, count, cast) {
  const g = new THREE.BufferGeometry();
  for (const k of Object.keys(base.attributes)) g.setAttribute(k, base.attributes[k]);
  g.setIndex(base.index);
  g.boundingSphere = base.boundingSphere.clone();
  g.boundingBox = base.boundingBox.clone();
  const n = Math.max(1, count);
  g.setAttribute('iA', new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4));
  g.setAttribute('iB', new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4));
  g.setAttribute('iTint', new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('iFade', new THREE.InstancedBufferAttribute(new Float32Array(n), 1));
  const im = new THREE.InstancedMesh(g, material, n);
  im.count = 0;
  im.castShadow = cast;
  im.receiveShadow = true;
  im.frustumCulled = true;
  im.visible = false;
  im.renderOrder = RENDER_ORDER.PROPS;
  im.layers.enable(LAYERS.PROPS);
  im.customDepthMaterial = depthMaterial;
  im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  return im;
}

// ------------------------------------------------------------------ field
export class PropField {
  constructor(ctx, geo, mats) {
    this.ctx = ctx;
    this.group = ctx.group;
    this.geo = geo;       // {lod0, lod1, imp}
    this.mats = mats;     // {treeMat, treeDepth, impMat, impDepth, furniture, foliage, pool, halo, lens}
    this.chunks = new Map();
    this.topDown = 0;
    this._lastCam = new THREE.Vector3(1e9, 0, 0);
    this._lastPitch = -9;
    this.lodCounts = { lod0: 0, lod1: 0, impostor: 0 };
    this.visible = { chunks: 0, draws: 0, tris: 0 };
    this.kindVisible = {};
    this.forceLod = null;
    this.poolsOn = true;
    this.buildGlobals();
  }

  buildGlobals() {
    // lamp light pools: one InstancedMesh so item 6a can read the major axis off an instance matrix
    const disc = new THREE.CircleGeometry(0.5, 28);
    disc.rotateX(-Math.PI / 2);
    const r = new Float32Array(disc.attributes.position.count);
    const pa = disc.attributes.position.array;
    for (let i = 0; i < r.length; i++) r[i] = Math.min(1, Math.hypot(pa[i * 3], pa[i * 3 + 2]) * 2);
    disc.setAttribute('aR', new THREE.BufferAttribute(r, 1));
    this.poolGeo = disc;
    this.pool = new THREE.InstancedMesh(disc, this.mats.pool, 1);
    this.pool.count = 0;
    this.pool.castShadow = false; this.pool.receiveShadow = false;
    this.pool.frustumCulled = false;
    this.pool.renderOrder = RENDER_ORDER.TRANSPARENT;
    this.pool.visible = false;
    this.pool.layers.enable(LAYERS.PROPS);
    this.group.add(this.pool);

    this.halo = new THREE.Points(new THREE.BufferGeometry(), this.mats.halo);
    this.halo.renderOrder = RENDER_ORDER.TRANSPARENT;
    this.halo.frustumCulled = false;
    this.halo.visible = false;
    this.halo.castShadow = false;
    this.group.add(this.halo);

    this.lens = new THREE.InstancedMesh(this.mats.lensGeo, this.mats.lens, 1);
    this.lens.count = 0;
    this.lens.castShadow = false; this.lens.receiveShadow = false;
    this.lens.frustumCulled = false;
    this.lens.renderOrder = RENDER_ORDER.PROPS + 1;
    this.lens.layers.enable(LAYERS.PROPS);
    this.group.add(this.lens);
  }

  clear() {
    for (const c of this.chunks.values()) this.disposeChunk(c);
    this.chunks.clear();
    this._queue = [];
  }

  disposeChunk(c) {
    for (const k of ['lod0', 'lod1', 'imp']) if (c[k]) { this.group.remove(c[k]); c[k].geometry.dispose(); c[k].dispose(); c[k] = null; }
    for (const k of ['furn', 'fol']) if (c[k]) { this.group.remove(c[k]); c[k].geometry.dispose(); c[k] = null; }
  }

  /** Collect per-chunk source lists from a Placer. `only` limits the scan to those chunk indices. */
  collectSrc(placer, only) {
    const byChunk = new Map();
    const get = (i) => {
      if (only && !only.has(i)) return null;
      let c = byChunk.get(i);
      if (!c) { c = { i, trees: [], furn: [], fol: [] }; byChunk.set(i, c); }
      return c;
    };
    const push = (i, list, v) => { const c = get(i); if (c) c[list].push(v); };
    for (const t of placer.trees) push(chunkIndex(t.x, t.z), 'trees', t);
    for (const f of placer.furniture) push(chunkIndex(f.x, f.z), 'furn', f);
    for (const b of placer.bushes) push(chunkIndex(b.x, b.z), 'fol', { type: 'bush', ...b });
    for (const p of placer.planterFills) push(chunkIndex(p.x, p.z), 'fol', { type: 'planterFill', ...p });
    for (const l of placer.litter) push(chunkIndex(l.x, l.z), 'fol', { type: 'litter', ...l });
    for (const h of placer.hedgeRuns) { const m = h.pts[Math.floor(h.pts.length / 2)]; push(chunkIndex(m.x, m.z), 'fol', { type: 'hedge', run: h }); }
    for (const f of placer.fenceRuns) { const m = f.pts[Math.floor(f.pts.length / 2)]; push(chunkIndex(m.x, m.z), 'furn', { type: 'fence', run: f }); }
    return byChunk;
  }

  /** (Re)build every chunk from a Placer's output. */
  build(placer, kits, foliageKits) {
    this.clear();
    this.placer = placer; this.kits = kits; this.folKits = foliageKits;
    const byChunk = this.collectSrc(placer, null);
    let tris = 0;
    for (const [i, src] of byChunk) { this.buildChunk(i, src); }
    this.staticTris = 0;
    this.setPools(placer.lampHeads);
    this._lastCam.set(1e9, 0, 0);
    this._lastPitch = -9;
  }

  buildChunk(i, src) {
    const kits = this.kits, foliageKits = this.folKits;
    let tris = 0;
    {
      const cx = (i % GRID) * CHUNK - HALF + CHUNK * 0.5;
      const cz = Math.floor(i / GRID) * CHUNK - HALF + CHUNK * 0.5;
      const c = { i, cx, cz, cy: 0, radius: CHUNK * 0.75, n: 0, subs: [], lod0: null, lod1: null, imp: null, furn: null, fol: null };
      // --- trees, sorted into 64 m sub-buckets
      if (src.trees.length) {
        const buckets = new Map();
        for (const t of src.trees) {
          const k = `${Math.floor(t.x / SUB)},${Math.floor(t.z / SUB)}`;
          let b = buckets.get(k);
          if (!b) { b = { x: 0, z: 0, items: [] }; buckets.set(k, b); }
          b.items.push(t);
        }
        const n = src.trees.length;
        c.n = n;
        c.mat = new Float32Array(n * 16);
        c.impMat = new Float32Array(n * 16);
        c.iA = new Float32Array(n * 4);
        c.iB = new Float32Array(n * 4);
        c.impA = new Float32Array(n * 4);
        c.tint = new Float32Array(n * 3);
        c.kindOf = new Uint8Array(n);
        let off = 0, maxH = 0;
        for (const b of buckets.values()) {
          let sx = 0, sz = 0;
          const start = off;
          for (const t of b.items) {
            const sp = SPECIES[t.species];
            const H = t.worldH;
            _e.set(0, t.heading, 0); _q.setFromEuler(_e);
            _p.set(t.x, t.y, t.z); _s.set(H, H, H);
            _m.compose(_p, _q, _s);
            c.mat.set(_m.elements, off * 16);
            _q.identity();
            _m.compose(_p, _q, _s);
            c.impMat.set(_m.elements, off * 16);
            c.iA[off * 4] = t.shape.crownR; c.iA[off * 4 + 1] = t.shape.profA;
            c.iA[off * 4 + 2] = t.shape.profB; c.iA[off * 4 + 3] = sp.crownBot;
            c.iB[off * 4] = t.shape.trunkK; c.iB[off * 4 + 1] = sp.leafK;
            c.iB[off * 4 + 2] = sp.spread;
            c.iB[off * 4 + 3] = sp.leafCell + barkCol(sp) * 16;
            const cls = sp.impCell;
            c.impA[off * 4] = IMP_QUAD[cls];
            c.impA[off * 4 + 1] = sp.crownBot + (1 - sp.crownBot) * 0.52;
            c.impA[off * 4 + 2] = 0;
            c.impA[off * 4 + 3] = cls;
            c.tint[off * 3] = t.tint[0]; c.tint[off * 3 + 1] = t.tint[1]; c.tint[off * 3 + 2] = t.tint[2];
            c.kindOf[off] = sp.kind === 'tree_pine' ? 1 : 0;
            sx += t.x; sz += t.z;
            maxH = Math.max(maxH, H);
            off++;
          }
          const cnt = off - start;
          c.subs.push({ x: sx / cnt, z: sz / cnt, off: start, count: cnt });
        }
        c.radius = CHUNK * 0.75 + maxH;
        c.cy = maxH * 0.5;
        c.lod0 = instancedFrom(this.geo.lod0, this.mats.treeMat, this.mats.treeDepth, n, true);
        c.lod1 = instancedFrom(this.geo.lod1, this.mats.treeMat, this.mats.treeDepth, n, true);
        c.imp = instancedFrom(this.geo.imp, this.mats.impMat, this.mats.impDepth, n, false);
        this.group.add(c.lod0); this.group.add(c.lod1); this.group.add(c.imp);
      }
      // --- hard furniture, merged
      if (src.furn.length) {
        const acc = new MeshAccum(true);
        for (const f of src.furn) {
          if (f.type === 'fence') {
            const g = foliageKits.fenceRun(f.run.pts, f.run.variant);
            if (g) { acc.add(g, IDENT); g.dispose(); }
            continue;
          }
          const kit = kits[f.kit];
          if (!kit) continue;
          _e.set(0, -f.heading, 0); _q.setFromEuler(_e);
          _p.set(f.x, f.y, f.z); _s.set(f.scale, f.scale, f.scale);
          _m.compose(_p, _q, _s);
          acc.add(kit.geo, _m);
        }
        const g = acc.build();
        if (g) {
          c.furn = new THREE.Mesh(g, this.mats.furniture);
          c.furn.castShadow = true; c.furn.receiveShadow = true;
          c.furn.renderOrder = RENDER_ORDER.PROPS;
          c.furn.layers.enable(LAYERS.PROPS);
          c.furn.frustumCulled = true;
          this.group.add(c.furn);
          tris += g.index.count / 3;
        }
      }
      // --- alpha foliage, merged
      if (src.fol.length) {
        const acc = new MeshAccum(false);
        for (const f of src.fol) {
          if (f.type === 'hedge') {
            const g = foliageKits.hedgeRun(f.run.pts);
            if (g) { acc.add(g, IDENT); g.dispose(); }
            continue;
          }
          const base = f.type === 'bush' ? foliageKits.bush(f) : f.type === 'planterFill' ? foliageKits.planterFill(f) : foliageKits.litter(f);
          if (!base) continue;
          _e.set(0, -(f.heading || 0), 0); _q.setFromEuler(_e);
          _p.set(f.x, (f.y || 0) + (f.type === 'litter' ? 0.045 : 0), f.z);
          const s = f.scale || 1;
          _s.set(s, f.type === 'litter' ? 1 : s, s);
          _m.compose(_p, _q, _s);
          acc.add(base, _m);
        }
        const g = acc.build();
        if (g) {
          c.fol = new THREE.Mesh(g, this.mats.foliage);
          c.fol.castShadow = true; c.fol.receiveShadow = true;
          c.fol.renderOrder = RENDER_ORDER.PROPS;
          c.fol.layers.enable(LAYERS.PROPS);
          c.fol.frustumCulled = true;
          this.group.add(c.fol);
          tris += g.index.count / 3;
        }
      }
      this.chunks.set(i, c);
    }
  }

  /** Dirty-region rebuild: only the named chunks are re-derived; everything else is untouched. */
  patch(indices, kits, foliageKits) {
    if (!this.placer) return;
    this.kits = kits || this.kits;
    this.folKits = foliageKits || this.folKits;
    const src = this.collectSrc(this.placer, indices);
    this._queue = [];
    for (const i of indices) {
      const old = this.chunks.get(i);
      if (old) { this.disposeChunk(old); this.chunks.delete(i); }
      const s = src.get(i);
      if (s) this.buildChunk(i, s);
    }
    this._lastCam.set(1e9, 0, 0);
    this._lastPitch = -9;
  }

  /** Lamp pools + halo points, both global and non-casting. */
  setPools(lampHeads) {
    const heads = [];
    const kitHead = { streetlamp: [0, 9.03, -1.81], streetlamp_lantern: [0, 4.58, -0.42] };
    for (const l of lampHeads) {
      const h = kitHead[l.kit] || kitHead.streetlamp;
      const c = Math.cos(-l.heading), s = Math.sin(-l.heading);
      const hx = l.x + h[0] * c + h[2] * s;
      const hz = l.z - h[0] * s + h[2] * c;
      heads.push({ x: hx, y: l.y + h[1], z: hz, gy: l.y, kit: l.kit, ax: l.x, az: l.z });
    }
    this.lampHeadPts = heads;
    const n = heads.length;
    // halo points
    const pos = new Float32Array(Math.max(1, n) * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = heads[i].x; pos[i * 3 + 1] = heads[i].y - 0.05; pos[i * 3 + 2] = heads[i].z; }
    this.halo.geometry.dispose();
    const hg = new THREE.BufferGeometry();
    hg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    hg.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 4000);
    this.halo.geometry = hg;
    // pool instances: flat disc of extent 1.0, instance scale = the pool's world major axis
    this.group.remove(this.pool);
    this.pool.dispose();
    this.pool = new THREE.InstancedMesh(this.poolGeo, this.mats.pool, Math.max(1, n));
    this.pool.count = n;
    this.pool.castShadow = false; this.pool.receiveShadow = false;
    this.pool.frustumCulled = false;
    this.pool.renderOrder = RENDER_ORDER.TRANSPARENT;
    this.pool.visible = false;
    this.pool.layers.enable(LAYERS.PROPS);
    this.group.add(this.pool);
    const arr = this.pool.instanceMatrix.array;
    this.poolAxis = [];
    for (let i = 0; i < n; i++) {
      const l = heads[i];
      const major = l.kit === 'streetlamp_lantern' ? 11.0 : 13.4;
      _p.set(l.x, l.gy + 0.03, l.z);
      _q.identity();
      _s.set(major, 1, major);
      _m.compose(_p, _q, _s);
      arr.set(_m.elements, i * 16);
      this.poolAxis.push(major);
    }
    this.pool.instanceMatrix.needsUpdate = true;
  }

  setLenses(lenses) {
    const n = lenses.length;
    this.group.remove(this.lens);
    this.lens.dispose();
    this.lens = new THREE.InstancedMesh(this.mats.lensGeo, this.mats.lens, Math.max(1, n));
    this.lens.count = n;
    this.lens.castShadow = false; this.lens.receiveShadow = false;
    this.lens.frustumCulled = false;
    this.lens.renderOrder = RENDER_ORDER.PROPS + 1;
    this.lens.layers.enable(LAYERS.PROPS);
    this.group.add(this.lens);
    const arr = this.lens.instanceMatrix.array;
    for (let i = 0; i < n; i++) {
      const l = lenses[i];
      _e.set(0, -l.heading, 0); _q.setFromEuler(_e);
      _p.set(l.x, l.y, l.z); _s.set(1, 1, 1);
      _m.compose(_p, _q, _s);
      arr.set(_m.elements, i * 16);
    }
    this.lens.instanceMatrix.needsUpdate = true;
    this.lensColors = new Float32Array(Math.max(1, n) * 3);
    this.lens.instanceColor = new THREE.InstancedBufferAttribute(this.lensColors, 3);
    this.lens.instanceColor.setUsage(THREE.DynamicDrawUsage);
  }

  /**
   * Per-frame LOD + culling. Work happens only when the camera actually moved, and is then
   * amortised over the next few frames so no single update() exceeds the 2 ms cap.
   */
  update(camera, pitch, force = false) {
    const moved = camera.position.distanceToSquared(this._lastCam) > 36 || Math.abs(pitch - this._lastPitch) > 0.02;
    if (moved || force) {
      this._lastCam.copy(camera.position);
      this._lastPitch = pitch;
      this.topDown = pitch > 0.62 ? 1 : 0;
      _pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      _frustum.setFromProjectionMatrix(_pm);
      this._frustum = _frustum;
      if (!this._camPos) this._camPos = new THREE.Vector3();
      this._camPos.copy(camera.position);
      const cp = this._camPos;
      this._queue = [...this.chunks.values()].sort((a, b) =>
        ((b.cx - cp.x) ** 2 + (b.cz - cp.z) ** 2) - ((a.cx - cp.x) ** 2 + (a.cz - cp.z) ** 2));
      this.lodCounts.lod0 = this.lodCounts.lod1 = this.lodCounts.impostor = 0;
      this.visible.chunks = 0;
    }
    if (!this._queue || !this._queue.length) return false;
    const budget = force ? this._queue.length : 10;
    for (let i = 0; i < budget && this._queue.length; i++) this._updateChunk(this._queue.pop());
    return true;
  }

  _updateChunk(c) {
    const cam = this._camPos;
    const hideOak = this.kindVisible.tree_oak === false;
    const hidePine = this.kindVisible.tree_pine === false;
    const showTrees = !(hideOak && hidePine);
    _sphere.center.set(c.cx, c.cy, c.cz);
    _sphere.radius = c.radius;
    const inFrustum = this._frustum.intersectsSphere(_sphere);
    const d = Math.hypot(c.cx - cam.x, c.cz - cam.z, c.cy - cam.y);
    const detail = inFrustum && d < DETAIL_R;
    if (c.furn) { c.furn.visible = detail && this.kindVisible.furniture !== false; c.furn.castShadow = d < FURN_CAST_R; }
    if (c.fol) { c.fol.visible = inFrustum && d < FOLIAGE_R && this.kindVisible.foliage !== false; c.fol.castShadow = d < FOLIAGE_CAST_R; }
    if (detail) this.visible.chunks++;
    if (!c.n) return;
    if (!inFrustum || !showTrees) { c.lod0.visible = c.lod1.visible = c.imp.visible = false; return; }
    let n0 = 0, n1 = 0, ni = 0;
    for (const s of c.subs) {
      const sd = Math.hypot(s.x - cam.x, s.z - cam.z, c.cy - cam.y);
      let tier = this.forceLod;
      let blend = 1;
      if (tier === null) {
        if (sd < LOD0_R - BAND) tier = 0;
        else if (sd < LOD0_R + BAND) { tier = 0; blend = 1 - (sd - (LOD0_R - BAND)) / (BAND * 2); }
        else if (sd < LOD1_R - BAND) tier = 1;
        else if (sd < LOD1_R + BAND) { tier = 1; blend = 1 - (sd - (LOD1_R - BAND)) / (BAND * 2); }
        else tier = 2;
      }
      if (tier === 0 && this.lodCounts.lod0 + n0 + s.count > CAP0) { tier = 1; blend = 1; }
      if (tier === 1 && this.lodCounts.lod1 + n1 + s.count > CAP1) { tier = 2; blend = 1; }
      if (tier === 0) {
        n0 = this._copy(c, c.lod0, s, n0, blend, false);
        if (blend < 1) n1 = this._copy(c, c.lod1, s, n1, blend, true);
      } else if (tier === 1) {
        n1 = this._copy(c, c.lod1, s, n1, blend, false);
        if (blend < 1) ni = this._copy(c, c.imp, s, ni, blend, true, true);
      } else {
        ni = this._copy(c, c.imp, s, ni, 1, false, true);
      }
    }
    this._finish(c.lod0, n0); this._finish(c.lod1, n1); this._finish(c.imp, ni);
    c.lod1.castShadow = d < LOD1_CAST_R;
    c.imp.castShadow = this.topDown === 1 && d < DETAIL_R;
    this.lodCounts.lod0 += n0; this.lodCounts.lod1 += n1; this.lodCounts.impostor += ni;
  }

  _copy(c, mesh, s, n, blend, inverted, isImp = false) {
    const g = mesh.geometry;
    const cnt = s.count;
    const src = isImp ? c.impMat : c.mat;
    mesh.instanceMatrix.array.set(src.subarray(s.off * 16, (s.off + cnt) * 16), n * 16);
    g.attributes.iA.array.set((isImp ? c.impA : c.iA).subarray(s.off * 4, (s.off + cnt) * 4), n * 4);
    if (!isImp) g.attributes.iB.array.set(c.iB.subarray(s.off * 4, (s.off + cnt) * 4), n * 4);
    g.attributes.iTint.array.set(c.tint.subarray(s.off * 3, (s.off + cnt) * 3), n * 3);
    const f = blend >= 1 ? (inverted ? -0.0001 : 1) : (inverted ? -blend : blend);
    const fa = g.attributes.iFade.array;
    fa.fill(f, n, n + cnt);
    if (this.kindVisible.tree_oak === false || this.kindVisible.tree_pine === false) {
      for (let i = 0; i < cnt; i++) {
        const k = c.kindOf[s.off + i];
        if ((k === 0 && this.kindVisible.tree_oak === false) || (k === 1 && this.kindVisible.tree_pine === false)) fa[n + i] = -1;
      }
    }
    return n + cnt;
  }

  _finish(mesh, n) {
    mesh.count = n;
    mesh.visible = n > 0;
    if (!n) return;
    mesh.instanceMatrix.needsUpdate = true;
    for (const k of ['iA', 'iB', 'iTint', 'iFade']) mesh.geometry.attributes[k].needsUpdate = true;
    mesh.computeBoundingSphere();     // tight bound => the cascades skip what they cannot see
  }

  /** Draw calls and triangles this field currently contributes (colour pass only). */
  stats() {
    let draws = 0, tris = 0, chunks = 0;
    const tri = (m) => (m.geometry.index ? m.geometry.index.count / 3 : m.geometry.attributes.position.count / 3);
    for (const c of this.chunks.values()) {
      let any = false;
      for (const k of ['lod0', 'lod1', 'imp']) {
        const m = c[k];
        if (m && m.visible && m.count > 0) { draws++; tris += tri(m) * m.count; any = true; }
      }
      for (const k of ['furn', 'fol']) {
        const m = c[k];
        if (m && m.visible) { draws++; tris += tri(m); any = true; }
      }
      if (any) chunks++;
    }
    if (this.pool.visible && this.pool.count) { draws++; tris += tri(this.pool) * this.pool.count; }
    if (this.halo.visible) draws++;
    if (this.lens.count) { draws++; tris += tri(this.lens) * this.lens.count; }
    return { draws, tris: Math.round(tris), chunks };
  }

  dispose() {
    this.clear();
    this.group.remove(this.pool); this.pool.dispose();
    this.group.remove(this.halo); this.halo.geometry.dispose();
    this.group.remove(this.lens); this.lens.dispose();
    this.poolGeo.dispose();
  }
}

const IDENT = new THREE.Matrix4();

function barkCol(sp) {
  if (sp.cls === 'conifer') return 1;
  if (sp.name === 'birch' || sp.name === 'poplar' || sp.name === 'blossom') return 2;
  return 0;
}
