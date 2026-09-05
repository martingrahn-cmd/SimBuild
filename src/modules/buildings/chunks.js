// City chunking: buildings are bucketed into 128 m tiles; each tile merges its buildings into one
// geometry per LOD, so a chunk is a single draw call and three frustum-culls it by bounding sphere.

import * as THREE from 'three';
import { TILE_SIZE, LAYERS } from '../../core/constants.js';
import { MeshBuilder } from './geom.js';
import { emitBuilding, emitGround, skirt } from './generate.js';
import { applyMeshDefaults } from './material.js';

const LOD_SWITCH = 300;
// how much of each zone type stays lit after dark
const LIT_BIAS = { residential: 1.35, commercial: 1.0, office: 0.62, industrial: 0.4 }; // metres: nearer than this a chunk draws its detailed geometry

export class ChunkManager {
  constructor(ctx, atlas, material, group) {
    this.ctx = ctx;
    this.atlas = atlas;
    this.material = material;
    this.group = group;
    this.chunks = new Map();
    this.dirty = new Set();
    this.stats = { chunks: 0, tris0: 0, tris1: 0, visible: 0, buildMs: 0 };
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
    for (let l = 0; l < 2; l++) {
      const m = c.meshes[l];
      if (m) { this.group.remove(m); m.geometry.dispose(); c.meshes[l] = null; }
    }
    if (c.items.size === 0) { this.chunks.delete(key); return; }
    const T = this.ctx.world.terrain;
    const A = this.atlas;
    for (let lod = 0; lod < 2; lod++) {
      const mb = new MeshBuilder();
      for (const b of c.items) {
        if (!b.plan) continue;
        mb.frame(b.x, b.y, b.z, b.heading);
        mb.color(1, 1, 1);
        mb.litBias(LIT_BIAS[b.type] ?? 1);
        const h = (lx, lz) => T.getHeight(mb.worldX(lx, lz), mb.worldZ(lx, lz)) - b.y;
        try {
          skirt(mb, A, b.plan.w || b.footprint.w, b.plan.d || b.footprint.d, b.drop);
          emitBuilding(mb, A, b.plan, lod);
          emitGround(mb, A, b.plan, b.lot, h, lod);
        } catch (e) {
          this.ctx.log.error(`build ${b.id} (${b.plan?.kind}) failed: ${e?.message || e}`, e);
        }
      }
      if (mb.empty) continue;
      const geo = mb.toGeometry();
      const mesh = new THREE.Mesh(geo, this.material);
      mesh.name = `buildings:${key}:lod${lod}`;
      mesh.layers.enable(LAYERS.BUILDINGS);
      applyMeshDefaults(mesh);
      mesh.visible = false;
      c.meshes[lod] = mesh;
      this.group.add(mesh);
    }
    c.lod = -1;
    this.stats.buildMs += performance.now() - t0;
  }

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
      if (c.meshes[0]) t0 += c.meshes[0].geometry.index.count / 3;
      if (c.meshes[1]) t1 += c.meshes[1].geometry.index.count / 3;
    }
    this.stats.chunks = this.chunks.size;
    this.stats.tris0 = t0; this.stats.tris1 = t1;
  }

  /** pick a LOD per chunk from the camera distance */
  updateLod(camera) {
    const p = camera.position;
    let vis = 0;
    for (const c of this.chunks.values()) {
      const dx = c.cx - p.x, dz = c.cz - p.z, dy = Math.max(0, p.y - 40);
      const d = Math.sqrt(dx * dx + dz * dz + dy * dy) - c.radius;
      const want = d < LOD_SWITCH ? 0 : 1;
      const use = c.meshes[want] ? want : (c.meshes[0] ? 0 : 1);
      if (use === c.lod) { if (c.meshes[c.lod]?.visible) vis++; continue; }
      if (c.meshes[0]) c.meshes[0].visible = use === 0;
      if (c.meshes[1]) c.meshes[1].visible = use === 1;
      c.lod = use;
      if (c.meshes[use]) vis++;
    }
    this.stats.visible = vis;
  }

  dispose() {
    for (const c of this.chunks.values()) {
      for (const m of c.meshes) if (m) { this.group.remove(m); m.geometry.dispose(); }
    }
    this.chunks.clear();
    this.dirty.clear();
  }
}
