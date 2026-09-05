// buildings — procedural city buildings on zoning lots.
//
// Every surface (facade, roof, clutter, driveway, hedge) samples one procedurally generated PBR atlas,
// so a 128 m chunk of city is a single draw call with two LOD levels. Windows are lit individually at
// night by hashing a per-vertex window-cell coordinate in the fragment shader, modulated by the
// simulation's activity curve when the simulation module is present.

import * as THREE from 'three';
import { buildAtlas } from './tiles.js';
import { createBuildingMaterial, createUniforms } from './material.js';
import { ChunkManager } from './chunks.js';
import { planBuilding } from './generate.js';
import { stage, CAMERAS } from './showcase.js';

const S = {
  ctx: null, atlas: null, tex: null, mat: null, chunks: null, uniforms: null,
  nextId: 1, pending: { added: [], removed: [], updated: [] }, lodTimer: 0, litSmooth: 0,
};

// ------------------------------------------------------------------ helpers
function terrainPad(T, lot, plan) {
  const c = Math.cos(lot.heading), s = Math.sin(lot.heading);
  const hw = (plan.w || lot.w) / 2, hd = (plan.d || lot.d) / 2;
  let mn = Infinity, mx = -Infinity;
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const lx = hw * i, lz = hd * j;
    const h = T.getHeight(lot.x + c * lx + s * lz, lot.z + s * lx - c * lz);
    if (h < mn) mn = h;
    if (h > mx) mx = h;
  }
  return { top: mx, drop: Math.max(0, mx - mn) + 0.35 };
}

function spawn(lot) {
  if (!S.ctx || !lot) return -1;
  const world = S.ctx.world;
  if (lot.buildingId != null && world.buildings.items.has(lot.buildingId)) return lot.buildingId;
  const id = S.nextId++;
  const level = Math.max(1, Math.min(5, lot.level || 1));
  const rng = S.ctx.rng.fork(`b${id}:${lot.type}:${lot.density}`);
  let plan;
  try { plan = planBuilding(lot, level, rng); }
  catch (e) { S.ctx.log.error(`plan failed for lot ${lot.id}: ${e?.message || e}`, e); return -1; }
  // push the building toward its street frontage so front yards / back gardens read correctly
  const zOff = plan.zOff || 0;
  const fx = Math.sin(lot.heading || 0), fz = -Math.cos(lot.heading || 0);
  const bx = lot.x + fx * zOff, bz = lot.z + fz * zOff;
  const pad = terrainPad(world.terrain, { ...lot, x: bx, z: bz }, plan);
  const b = {
    id, lotId: lot.id ?? null, type: lot.type, density: lot.density, level,
    footprint: { w: plan.w, d: plan.d },
    floors: plan.floors || 1, height: plan.height || 6,
    x: bx, y: pad.top, z: bz, heading: lot.heading || 0,
    styleId: `${plan.kind}:${plan.facade || ''}`,
    occupants: 0, jobs: 0, lit: false,
    plan, drop: pad.drop, lot: { x: lot.x, z: lot.z, w: lot.w, d: lot.d, heading: lot.heading || 0 },
  };
  const cap = capacity(b);
  b.occupants = cap.occupants; b.jobs = cap.jobs;
  world.buildings.items.set(id, b);
  S.chunks.add(b);
  if (lot) lot.buildingId = id;
  S.pending.added.push(id);
  world.buildings.version++;
  return id;
}

function capacity(b) {
  const area = b.footprint.w * b.footprint.d * (b.floors || 1);
  if (b.type === 'residential') return { occupants: Math.max(1, Math.round(area / 95)), jobs: 0 };
  if (b.type === 'office') return { occupants: 0, jobs: Math.max(1, Math.round(area / 22)) };
  if (b.type === 'commercial') return { occupants: 0, jobs: Math.max(1, Math.round(area / 40)) };
  return { occupants: 0, jobs: Math.max(1, Math.round(area / 60)) };
}

function demolish(id) {
  const world = S.ctx?.world;
  const b = world?.buildings.items.get(id);
  if (!b) return false;
  S.chunks.remove(b);
  world.buildings.items.delete(id);
  const lot = world.zones.lots.get(b.lotId);
  if (lot && lot.buildingId === id) lot.buildingId = undefined;
  S.pending.removed.push(id);
  world.buildings.version++;
  return true;
}

function setLevel(id, n) {
  const world = S.ctx?.world;
  const b = world?.buildings.items.get(id);
  if (!b) return false;
  const level = Math.max(1, Math.min(5, n | 0));
  if (level === b.level) return false;
  b.level = level;
  const rng = S.ctx.rng.fork(`b${id}:${b.type}:${b.density}`);
  const lot = { ...b.lot, type: b.type, density: b.density, id: b.lotId };
  try { b.plan = planBuilding(lot, level, rng); }
  catch (e) { S.ctx.log.error(`replan failed for ${id}: ${e?.message || e}`, e); return false; }
  const pad = terrainPad(world.terrain, lot, b.plan);
  b.y = pad.top; b.drop = pad.drop;
  b.footprint = { w: b.plan.w, d: b.plan.d };
  b.floors = b.plan.floors || 1; b.height = b.plan.height || 6;
  const cap = capacity(b); b.occupants = cap.occupants; b.jobs = cap.jobs;
  S.chunks.touch(b);
  S.pending.updated.push(id);
  world.buildings.version++;
  return true;
}

function at(x, z) {
  const world = S.ctx?.world;
  if (!world) return null;
  const c = S.chunks?.chunks.get(S.chunks.key(x, z));
  const pool = c ? c.items : world.buildings.items.values();
  for (const b of pool) {
    const dx = x - b.x, dz = z - b.z;
    const cs = Math.cos(b.heading), sn = Math.sin(b.heading);
    const lx = cs * dx + sn * dz, lz = sn * dx - cs * dz;
    if (Math.abs(lx) <= b.footprint.w / 2 && Math.abs(lz) <= b.footprint.d / 2) return b;
  }
  return null;
}

function flushEvents() {
  const p = S.pending;
  if (!p.added.length && !p.removed.length && !p.updated.length) return;
  S.ctx.events.emit('buildings:changed', { added: p.added, removed: p.removed, updated: p.updated });
  p.added = []; p.removed = []; p.updated = [];
}

/** spawn on every free zoning lot (called when zoning publishes new lots) */
function spawnFreeLots(limit = 400) {
  const world = S.ctx.world;
  let n = 0;
  for (const lot of world.zones.lots.values()) {
    if (n >= limit) break;
    if (lot.buildingId != null && world.buildings.items.has(lot.buildingId)) continue;
    if (!lot.type) continue;
    if (spawn(lot) >= 0) n++;
  }
  return n;
}

// ------------------------------------------------------------------ night lighting
function nightFactor(ctx) {
  const w = ctx.world.weather;
  if (typeof w.night === 'number') return w.night;
  const el = ctx.clock.sunElevation();
  return 1 - Math.min(1, Math.max(0, (el + 0.13) / 0.15));
}

function litFraction(ctx, night) {
  const sim = ctx.modules.simulation;
  let base = 0.42;
  if (sim && typeof sim.profile === 'function') {
    try {
      const p = sim.profile();
      base = 0.16 + 0.5 * (p.residential ?? 0.5) + 0.34 * Math.max(p.office ?? 0, p.commercial ?? 0);
    } catch { /* keep the default */ }
  } else {
    const h = ctx.world.time.hour;
    // evening peak, quiet small hours
    const evening = Math.exp(-((h - 20.5) ** 2) / 12);
    const small = h < 5 || h > 23.5 ? 0.35 : 1;
    base = 0.22 + 0.55 * evening * small;
  }
  return Math.max(0.05, Math.min(0.62, base)) * (0.3 + 0.7 * night);
}

// ------------------------------------------------------------------ module
export default {
  name: 'buildings',
  dependencies: ['terrain', 'roads', 'zoning'],
  budget: { drawCalls: 200, triangles: 2_000_000 },

  async init(ctx) {
    S.ctx = ctx;
    S.nextId = 1;
    S.pending = { added: [], removed: [], updated: [] };
    const t0 = performance.now();
    const built = buildAtlas(ctx.rng.fork('atlas'), Math.min(8, ctx.assets?.anisotropy ?? 8));
    S.atlas = built.atlas;
    S.tex = built.textures;
    S.uniforms = createUniforms();
    S.mat = createBuildingMaterial(S.tex, S.uniforms);
    ctx.modules.environment?.setupMaterial?.(S.mat);
    S.chunks = new ChunkManager(ctx, S.atlas, S.mat, ctx.group);
    ctx.log.info(`atlas: ${S.atlas.tiles.size} tiles in ${(performance.now() - t0).toFixed(0)} ms`);

    // install the world.buildings API in place
    const B = ctx.world.buildings;
    B.spawn = (lot) => spawn(lot);
    B.demolish = (id) => demolish(id);
    B.levelUp = (id) => setLevel(id, (ctx.world.buildings.items.get(id)?.level || 1) + 1);
    B.at = (x, z) => at(x, z);

    ctx.events.on('zones:changed', () => { if (!ctx.world.flags.showcase || ctx.world.flags.showcase === 'democity') spawnFreeLots(); }, 'buildings');
    ctx.events.on('terrain:changed', (r) => {
      if (!S.chunks || r?.all) { for (const k of S.chunks.chunks.keys()) S.chunks.dirty.add(k); return; }
      const rad = (r?.radius || 20) + 40;
      for (const c of S.chunks.chunks.values()) {
        if (Math.abs(c.cx - r.x) < rad + c.radius && Math.abs(c.cz - r.z) < rad + c.radius) S.chunks.dirty.add(c.key);
      }
    }, 'buildings');
  },

  update(dt, ctx) {
    if (!S.chunks) return;
    // rebuild at most two chunks a frame so growth never hitches the game
    if (S.chunks.dirty.size) { S.chunks.rebuildDirty(2); flushEvents(); }
    else flushEvents();

    S.lodTimer += dt;
    if (S.lodTimer > 0.2) { S.lodTimer = 0; S.chunks.updateLod(ctx.camera.camera); }

    const night = nightFactor(ctx);
    const lit = litFraction(ctx, night);
    S.litSmooth += (lit - S.litSmooth) * Math.min(1, dt * 3);
    S.uniforms.uNight.value = night;
    S.uniforms.uLit.value = S.litSmooth;
    S.uniforms.uEmis.value = 1.25;
  },

  dispose(ctx) {
    S.chunks?.dispose();
    S.mat?.dispose();
    if (S.tex) for (const t of Object.values(S.tex)) t?.dispose();
    ctx.world.buildings.items.clear();
    S.chunks = null; S.mat = null; S.tex = null; S.atlas = null;
  },

  api: {
    /** spawn a building on a lot ({x,z,w,d,heading,type,density,level}); returns the id or -1 */
    requestSpawn(lot) { return spawn(lot); },
    setLevel(id, n) { return setLevel(id, n); },
    demolish(id) { return demolish(id); },
    at(x, z) { return at(x, z); },
    get(id) { return S.ctx?.world.buildings.items.get(id) || null; },
    count() { return S.ctx?.world.buildings.items.size || 0; },
    /** build every dirty chunk now (staging, save-load, tests) */
    flush() { S.chunks?.flush(); flushEvents(); if (S.ctx) S.chunks.updateLod(S.ctx.camera.camera); },
    spawnFreeLots(limit) { const n = spawnFreeLots(limit); S.chunks?.flush(); flushEvents(); return n; },
    stats() {
      return S.chunks ? { ...S.chunks.stats, buildings: S.ctx.world.buildings.items.size, tiles: S.atlas.tiles.size } : null;
    },
    material() { return S.mat; },
    atlasTextures() { return S.tex; },
    /** night window controls (debug / effects) */
    setNight(v) { S.uniforms.uNight.value = v; },
    setLit(v) { S.uniforms.uLit.value = v; S.litSmooth = v; },
    serialize() {
      if (!S.ctx) return null;
      return {
        module: 'buildings', version: 1,
        items: [...S.ctx.world.buildings.items.values()].map((b) => ({
          id: b.id, lotId: b.lotId, type: b.type, density: b.density, level: b.level,
          x: b.x, z: b.z, heading: b.heading, lot: b.lot,
        })),
      };
    },
    deserialize(data) {
      if (!data || !S.ctx) return;
      for (const id of [...S.ctx.world.buildings.items.keys()]) demolish(id);
      S.nextId = 1;
      for (const it of data.items || []) {
        spawn({ id: it.lotId, x: it.x, z: it.z, w: it.lot?.w ?? 20, d: it.lot?.d ?? 24, heading: it.heading, type: it.type, density: it.density, level: it.level });
      }
      S.chunks?.flush(); flushEvents();
    },
  },

  showcase: {
    description: 'A city block grid: glass office towers and mixed-use downtown, mid-rise apartments with balconies, suburban houses with gardens and driveways, and an industrial park — every zone type, density and growth level.',
    cameras: CAMERAS,
    async setup(ctx) {
      stage(ctx);
      S.chunks.flush();
      flushEvents();
      S.chunks.updateLod(ctx.camera.camera);
      ctx.modules.environment?.hookScene?.();
      const st = S.chunks.stats;
      ctx.log.info(`chunks ${st.chunks}, tris lod0 ${st.tris0 | 0} / lod1 ${st.tris1 | 0}, build ${st.buildMs.toFixed(0)} ms`);
    },
  },
};
