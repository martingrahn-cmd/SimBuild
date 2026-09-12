// City chunking: buildings are bucketed into 128 m tiles; each tile merges its buildings into one
// geometry per LOD, so a chunk is a single draw call and three frustum-culls it by bounding sphere.
// Everything this module draws — facades, roofs, clutter, signs, lot plates, skirts — lives inside
// those merged geometries, so `stats().draws` is exactly the number of visible chunk meshes.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TILE_SIZE, LAYERS } from '../../core/constants.js';
import { MeshBuilder } from './geom.js';
import { emitBuilding, emitGround, skirt, outlineFor, setLod } from './generate.js';
import { applyMeshDefaults, TINT_SLOTS } from './material.js';

export const LOD_SWITCH = 84;   // metres: nearer than this a chunk draws its relieved geometry
const SHADOW_DISTANCE = 360; // retain facade/contact shadows around the camera; next chunk band starts at 362 m

function emitConstruction(mb, atlas, plan, progress, lod) {
  const w = Math.max(5, (plan.w || 12) * 0.9), d = Math.max(5, (plan.d || 12) * 0.9);
  const fullH = Math.max(4, plan.height || 6);
  const h = Math.max(0.35, fullH * Math.min(0.82, 0.08 + progress * 0.8));
  const concrete = atlas.rect('concrete_slab'), steel = atlas.rect('metal_light');
  mb.noWin().color(0.92, 0.9, 0.82);
  mb.box(0, 0, 0, w, 0.32, d, { side: concrete, top: concrete }, 4);
  if (progress > 0.12) {
    if (lod > 0) mb.box(0, 0.32, 0, w * 0.72, h, d * 0.72, { side: concrete, top: concrete }, 5);
    else {
      mb.box(0, 0.32, 0, Math.max(2.4, w * 0.22), h, Math.max(2.4, d * 0.22), { side: concrete, top: concrete }, 4);
      const ix = w * 0.34, iz = d * 0.34;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) mb.box(sx * ix, 0.32, sz * iz, 0.32, h, 0.32, { side: concrete }, 5);
      for (let y = 0.5; y <= h + 0.1; y += 3.2) mb.box(0, y, 0, w * 0.78, 0.24, d * 0.78, { side: concrete, top: concrete }, 5);
    }
  }
  if (lod > 0) return;
  mb.color(0.72, 0.76, 0.78);
  const x = w * 0.49, z = d * 0.49, post = 0.16;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) mb.box(sx * x, 0.1, sz * z, post, Math.max(1.6, h + 1.4), post, { side: steel }, 5);
  for (let y = 1.6; y < h + 1.5; y += 2.4) {
    mb.box(0, y, z, w, 0.12, 0.12, { side: steel }, 5);
    mb.box(0, y, -z, w, 0.12, 0.12, { side: steel }, 5);
    mb.box(x, y, 0, 0.12, 0.12, d, { side: steel }, 5);
    mb.box(-x, y, 0, 0.12, 0.12, d, { side: steel }, 5);
  }
}

export class ChunkManager {
  constructor(ctx, atlas, material, group) {
    this.ctx = ctx;
    this.atlas = atlas;
    this.material = material;
    this.group = group;
    this.chunks = new Map();
    this.dirty = new Set();
    this.forcedLod = null;
    this.rendered = 0;
    this.offBefore = ctx.engine.onBeforeRender(() => { this.rendered = 0; });
    this.offAfter = ctx.engine.onAfterRender(() => { this.stats.visible = this.rendered; });
    this.stats = { chunks: 0, tris0: 0, tris1: 0, visible: 0, buildMs: 0, chunksBuiltThisFrame: 0 };
  }
  key(x, z) { return `${Math.floor(x / TILE_SIZE)},${Math.floor(z / TILE_SIZE)}`; }
  chunkFor(x, z) {
    const k = this.key(x, z);
    let c = this.chunks.get(k);
    if (!c) {
      const ix = Math.floor(x / TILE_SIZE), iz = Math.floor(z / TILE_SIZE);
      c = {
        key: k, ix, iz, items: new Set(), meshes: [null, null], lod: -1,
        cx: (ix + 0.5) * TILE_SIZE, cz: (iz + 0.5) * TILE_SIZE, radius: TILE_SIZE,
      };
      this.chunks.set(k, c);
    }
    return c;
  }
  add(b) { const c = this.chunkFor(b.x, b.z); c.items.add(b); b._chunk = c.key; this.dirty.add(c.key); }
  remove(b) {
    const c = this.chunks.get(b._chunk);
    if (!c) return;
    c.items.delete(b);
    this.dirty.add(c.key);
  }
  touch(b) { if (b._chunk) this.dirty.add(b._chunk); }

  rebuild(key) {
    const c = this.chunks.get(key);
    if (!c) return;
    const t0 = performance.now();
    const disposed = new Set();
    for (let l = 0; l < 2; l++) {
      const m = c.meshes[l];
      if (m) {
        this.group.remove(m);
        if (!disposed.has(m.geometry)) { disposed.add(m.geometry); m.geometry.dispose(); }
        c.meshes[l] = null;
      }
    }
    if (c.items.size === 0) { this.chunks.delete(key); return; }
    const T = this.ctx.world.terrain;
    const A = this.atlas;
    let shadowGeometry;
    for (let lod = 0; lod < 3; lod++) {
      const mb = new MeshBuilder();
      let tri0 = 0;
      for (const b of c.items) {
        if (!b.plan) continue;
        mb.frame(b.x, b.y, b.z, b.heading);
        mb.color(1, 1, 1);
        mb.building(b.slot ?? 0);
        mb.cells = lod === 0 ? [] : null;
        mb.relief = lod === 0 ? {} : null;
        const h = (lx, lz) => T.getHeight(mb.worldX(lx, lz), mb.worldZ(lx, lz)) - b.y;
        const before = mb.idx.length;
        try {
          setLod(lod);
          skirt(mb, A, b.plan.w || b.footprint.w, b.plan.d || b.footprint.d, b.drop, outlineFor(b.plan));
          if (b.construction) emitConstruction(mb, A, b.plan, b.construction.progress || 0, lod);
          else emitBuilding(mb, A, b.plan, lod);
          emitGround(mb, A, b.plan, b.lot, h, lod);
        } catch (e) {
          this.ctx.log.error(`build ${b.id} (${b.plan?.kind}) failed: ${e?.message || e}`, e);
        }
        if (lod === 0) {
          b.cells = mb.cells && mb.cells.length ? Float32Array.from(mb.cells) : EMPTY;
          b.relief = mb.relief;
          b.tris0 = (mb.idx.length - before) / 3;
          tri0 += b.tris0;
        } else if (lod === 1) {
          b.tris1 = (mb.idx.length - before) / 3;
        }
        mb.cells = null;
      }
      if (mb.empty) continue;
      const geo = mb.toGeometry();
      if (lod === 2) { shadowGeometry = geo; continue; }
      const mesh = new THREE.Mesh(geo, this.material);
      mesh.name = `buildings:${key}:lod${lod}`;
      mesh.layers.enable(LAYERS.BUILDINGS);
      applyMeshDefaults(mesh);
      mesh.onBeforeRender = (renderer, scene, camera) => { if (camera === this.ctx.camera.camera) this.rendered++; };
      mesh.visible = false;
      c.meshes[lod] = mesh;
      this.group.add(mesh);
    }
    // Three selects geometry before its callbacks, but reads drawRange afterwards.
    // Main, reflection and shadow ranges therefore share each chunk's existing draw call.
    const full = c.meshes[0], simple = c.meshes[1];
    if (full && simple && shadowGeometry) {
      const fullGeometry = full.geometry, simpleGeometry = simple.geometry;
      const fullCount = fullGeometry.index.count, simpleCount = simpleGeometry.index.count;
      const shadowCount = shadowGeometry.index.count;
      // Only one LOD mesh is visible for a chunk. Share one immutable attribute/index
      // store and let each mesh select its own draw range, rather than duplicating
      // the simple and shadow ranges in a second combined geometry.
      const combined = mergeGeometries([fullGeometry, simpleGeometry, shadowGeometry]);
      fullGeometry.dispose(); simpleGeometry.dispose(); shadowGeometry.dispose();
      for (const [mesh, mainStart, mainCount] of [
        [full, 0, fullCount],
        [simple, fullCount, simpleCount],
      ]) {
        mesh.geometry = combined;
        mesh.userData.mainIndexCount = mainCount;
        const restore = () => combined.setDrawRange(mainStart, mainCount);
        restore();
        mesh.onBeforeRender = (renderer, scene, camera) => {
          if (camera === this.ctx.camera.camera) { restore(); this.rendered++; }
          else if (mesh === full) combined.setDrawRange(fullCount, simpleCount);
          else restore();
        };
        mesh.onAfterRender = restore;
        mesh.onBeforeShadow = (renderer, object, camera, shadowCamera) => {
          // The near cascade retains the full facade's self-shadowing relief.
          if (mesh === full && (!shadowCamera.isOrthographicCamera || shadowCamera.right - shadowCamera.left <= 200)) restore();
          else combined.setDrawRange(mesh === full ? fullCount + simpleCount : simpleCount, shadowCount);
        };
        mesh.onAfterShadow = restore;
      }
    }
    c.lod = -1;
    this.stats.buildMs += performance.now() - t0;
    this.stats.chunksBuiltThisFrame++;
  }

  /** call once at the top of every update() — buildMs and chunksBuiltThisFrame are per-frame values */
  beginFrame() { this.stats.buildMs = 0; this.stats.chunksBuiltThisFrame = 0; }

  rebuildDirty(max = Infinity) {
    let n = 0;
    for (const key of [...this.dirty]) {
      if (n >= max) break;
      this.dirty.delete(key);
      this.rebuild(key);
      n++;
    }
    if (n) this.recount();
    return n;
  }
  flush() { while (this.dirty.size) this.rebuildDirty(Infinity); }

  recount() {
    let t0 = 0, t1 = 0;
    for (const c of this.chunks.values()) {
      if (c.meshes[0]) t0 += (c.meshes[0].userData.mainIndexCount ?? c.meshes[0].geometry.index.count) / 3;
      if (c.meshes[1]) t1 += (c.meshes[1].userData.mainIndexCount ?? c.meshes[1].geometry.index.count) / 3;
    }
    this.stats.chunks = this.chunks.size;
    this.stats.tris0 = t0; this.stats.tris1 = t1;
  }

  /** pin every chunk to one LOD (parity proof) or return to distance selection */
  forceLod(n) {
    this.forcedLod = (n === 0 || n === 1) ? n : null;
    for (const c of this.chunks.values()) c.lod = -1;
    if (this.ctx?.camera) this.updateLod(this.ctx.camera.camera);
  }

  /** pick a LOD per chunk from the camera distance */
  updateLod(camera) {
    const p = camera.position;
    let vis = 0;
    for (const c of this.chunks.values()) {
      const shadow = Math.hypot(c.cx - p.x, c.cz - p.z) < SHADOW_DISTANCE;
      if (c.meshes[0]) c.meshes[0].castShadow = shadow;
      if (c.meshes[1]) c.meshes[1].castShadow = shadow;
      let want;
      if (this.forcedLod !== null) want = this.forcedLod;
      else {
        // distance to the chunk's box, not to its centre minus a full tile — subtracting the whole
        // radius kept far chunks on LOD0 and blew the triangle budget
        const dx = Math.max(0, Math.abs(c.cx - p.x) - TILE_SIZE / 2);
        const dz = Math.max(0, Math.abs(c.cz - p.z) - TILE_SIZE / 2);
        const dy = Math.max(0, p.y - 60);
        want = Math.sqrt(dx * dx + dz * dz + dy * dy) < LOD_SWITCH ? 0 : 1;
      }
      const use = c.meshes[want] ? want : (c.meshes[0] ? 0 : 1);
      if (use === c.lod) { if (c.meshes[c.lod]?.visible) vis++; continue; }
      if (c.meshes[0]) c.meshes[0].visible = use === 0;
      if (c.meshes[1]) c.meshes[1].visible = use === 1;
      c.lod = use;
      if (c.meshes[use]) vis++;
    }
    // Render callbacks report frustum-culled draws; visible flags are only LOD selection.
  }

  dispose() {
    this.offBefore(); this.offAfter();
    const disposed = new Set();
    for (const c of this.chunks.values()) {
      for (const m of c.meshes) if (m) {
        this.group.remove(m);
        if (!disposed.has(m.geometry)) { disposed.add(m.geometry); m.geometry.dispose(); }
      }
    }
    this.chunks.clear();
    this.dirty.clear();
  }
}

const EMPTY = new Float32Array(0);
export { TINT_SLOTS };
