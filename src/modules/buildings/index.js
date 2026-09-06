// buildings — procedural city buildings on zoning lots.
//
// Every surface (facade, roof, clutter, sign, driveway, hedge) samples one procedurally generated PBR
// atlas, so a 128 m chunk of city is a single draw call with two LOD levels. Window relief is real
// geometry — a recessed glazing plane with head, cill and jamb reveals, projecting floor bands and
// piers — and the night state of every window is BAKED into a vertex attribute from ctx.rng, never
// hashed in the fragment shader.

import * as THREE from 'three';
import { buildAtlas } from './tiles.js';
import { createBuildingMaterial, createUniforms, TINT_SLOTS } from './material.js';
import { ChunkManager, LOD_SWITCH } from './chunks.js';
import { planBuilding, clutterKey } from './generate.js';
import { stage, CAMERAS } from './showcase.js';

const S = {
  ctx: null, atlas: null, tex: null, mat: null, chunks: null, uniforms: null,
  nextId: 1, pending: { added: [], removed: [], updated: [] }, lodTimer: 0, litSmooth: 0,
  lots: new Map(), setupMs: 0, infoKey: null, frame: 0,
};

// ------------------------------------------------------------------ helpers
function terrainPad(T, lot, plan) {
  const c = Math.cos(lot.heading), s = Math.sin(lot.heading);
  // sample a small margin outside the footprint and the mid-ring too: a single ring of corners
  // leaves a bump between them above the slab on rolling ground
  const hw = (plan.w || lot.w) / 2 + 0.6, hd = (plan.d || lot.d) / 2 + 0.6;
  let mn = Infinity, mx = -Infinity;
  // a 5x5 grid, not a ring of corners: on 4 m terrain cells a bump between two corner samples can
  // still poke through the slab, which is what item 8 measures
  for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
    const lx = hw * i * 0.5, lz = hd * j * 0.5;
    const h = T.getHeight(lot.x + c * lx + s * lz, lot.z + s * lx - c * lz);
    if (h < mn) mn = h;
    if (h > mx) mx = h;
  }
  return { top: mx, drop: Math.max(0, mx - mn) + 0.6 };
}

function spawn(lot, forceId) {
  if (!S.ctx || !lot) return -1;
  const world = S.ctx.world;
  if (lot.buildingId != null && world.buildings.items.has(lot.buildingId)) return lot.buildingId;
  const id = forceId != null ? forceId : S.nextId++;
  if (id >= S.nextId) S.nextId = id + 1;
  const level = Math.max(1, Math.min(5, lot.level || 1));
  const rng = S.ctx.rng.fork(`b${id}:${lot.type}:${lot.density}`);
  let plan;
  try { plan = planBuilding(lot, level, rng); }
  catch (e) { S.ctx.log.error(`plan failed for lot ${lot.id}: ${e?.message || e}`, e); return -1; }
  const zOff = plan.zOff || 0;
  const fx = Math.sin(lot.heading || 0), fz = -Math.cos(lot.heading || 0);
  const bx = lot.x + fx * zOff, bz = lot.z + fz * zOff;
  const pad = terrainPad(world.terrain, { ...lot, x: bx, z: bz }, plan);
  const b = {
    id, lotId: lot.id ?? null, type: lot.type, density: lot.density, level,
    footprint: { w: plan.w, d: plan.d },
    floors: plan.floors || 1, height: plan.height || 6,
    x: bx, y: pad.top, z: bz, heading: lot.heading || 0,
    styleId: styleIdFor(plan),
    occupants: 0, jobs: 0, lit: false, mixedUse: !!plan.mixedUse,
    slot: (id - 1) % TINT_SLOTS,
    plan, drop: pad.drop,
    lot: { x: lot.x, z: lot.z, w: lot.w, d: lot.d, heading: lot.heading || 0, corner: !!lot.corner },
  };
  const cap = capacity(b);
  b.occupants = cap.occupants; b.jobs = cap.jobs;
  world.buildings.items.set(id, b);
  S.chunks.add(b);
  lot.buildingId = id;
  if (lot.id != null) S.lots.set(lot.id, lot);
  b._lotRef = lot;
  S.pending.added.push(id);
  world.buildings.version++;
  return id;
}

/** stable, and specific enough that no two towers in one cluster can share it (item 10) */
function styleIdFor(p) {
  const mass = `${p.plan || 'I'}${p.podium ? 'p' : ''}${p.chamfer > 0 ? 'c' : ''}${p.steps ? `s${p.steps}` : ''}${p.roofKind ? `-${p.roofKind}${p.ridgeAcross ? 'x' : ''}` : ''}`;
  return `${p.kind}:${p.facade}|${p.crown || p.roof}|${mass}`;
}

function capacity(b) {
  const area = b.footprint.w * b.footprint.d * (b.floors || 1);
  if (b.type === 'residential') return { occupants: Math.max(1, Math.round(area / 95)), jobs: 0 };
  if (b.type === 'office') return { occupants: 0, jobs: Math.max(1, Math.round(area / 22)) };
  if (b.type === 'commercial') return { occupants: 0, jobs: Math.max(1, Math.round(area / 40)) };
  return { occupants: 0, jobs: Math.max(1, Math.round(area / 60)) };
}

function lotOf(b) {
  return b._lotRef || S.lots.get(b.lotId) || S.ctx?.world.zones.lots.get(b.lotId) || null;
}

function demolish(id) {
  const world = S.ctx?.world;
  const b = world?.buildings.items.get(id);
  if (!b) return false;
  S.chunks.remove(b);
  world.buildings.items.delete(id);
  const lot = lotOf(b);
  if (lot && lot.buildingId === id) lot.buildingId = null;
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
  const src = lotOf(b);
  const lot = { ...b.lot, type: b.type, density: b.density, id: b.lotId, corner: b.lot.corner, mixedUse: b.mixedUse, variant: src?.variant };
  try { b.plan = planBuilding(lot, level, rng); }
  catch (e) { S.ctx.log.error(`replan failed for ${id}: ${e?.message || e}`, e); return false; }
  const zOff = b.plan.zOff || 0;
  const fx = Math.sin(b.lot.heading || 0), fz = -Math.cos(b.lot.heading || 0);
  b.x = b.lot.x + fx * zOff; b.z = b.lot.z + fz * zOff;
  const pad = terrainPad(world.terrain, { ...lot, x: b.x, z: b.z }, b.plan);
  b.y = pad.top; b.drop = pad.drop;
  b.footprint = { w: b.plan.w, d: b.plan.d };
  b.floors = b.plan.floors || 1; b.height = b.plan.height || 6;
  b.styleId = styleIdFor(b.plan);
  b.mixedUse = !!b.plan.mixedUse;
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
      base = 0.10 + 0.30 * (p.residential ?? 0.5) + 0.22 * Math.max(p.office ?? 0, p.commercial ?? 0);
    } catch { /* keep the default */ }
  } else {
    const h = ctx.world.time.hour;
    const evening = Math.exp(-((h - 20.5) ** 2) / 12);
    const small = h < 5 || h > 23.5 ? 0.35 : 1;
    base = 0.13 + 0.36 * evening * small;
  }
  return Math.max(0.05, Math.min(0.45, base)) * (0.3 + 0.7 * night);
}

// ------------------------------------------------------------------ selection + probes
function selected(x, z, r) {
  const items = S.ctx ? [...S.ctx.world.buildings.items.values()] : [];
  if (!Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(r)) return items;
  const r2 = r * r;
  return items.filter((b) => (b.x - x) ** 2 + (b.z - z) ** 2 <= r2);
}

const CLASSES = [];
for (const t of ['residential', 'commercial', 'industrial', 'office']) for (const d of ['low', 'high']) CLASSES.push(`${t}/${d}`);

function groundFloorDistinct(b) {
  const p = b.plan;
  const gh = p.groundH || p.floorH || 0;
  if (gh < 4.5) return false;
  if ((p.floors || 1) < 2) return true;
  const fh = p.floorH || 0;
  return fh >= 2.9 && fh <= 4.1;
}

function crownKeyOf(b) { return b.plan?.crown || b.plan?.roof || 'flat_cap'; }

function statsFor(x, z, r) {
  const sel = selected(x, z, r);
  const scoped = Number.isFinite(r);
  let t0 = 0, t1 = 0;
  if (scoped) { for (const b of sel) { t0 += b.tris0 || 0; t1 += b.tris1 || 0; } }
  else { t0 = S.chunks.stats.tris0; t1 = S.chunks.stats.tris1; }
  return {
    buildings: sel.length,
    buildingsL3NonIndustrial: sel.filter((b) => b.level >= 3 && b.type !== 'industrial').length,
    chunks: S.chunks.stats.chunks,
    visible: S.chunks.stats.visible,
    draws: S.chunks.stats.visible,      // every surface this module draws is merged into the chunk meshes
    tris0: t0, tris1: t1,
    tiles: S.atlas.tiles.size,
    buildMs: +S.chunks.stats.buildMs.toFixed(3),
    chunksBuiltThisFrame: S.chunks.stats.chunksBuiltThisFrame,
    lodSwitch: LOD_SWITCH,
    setupMs: +S.setupMs.toFixed(1),
  };
}

function styleCountsFor(x, z, r) {
  const sel = selected(x, z, r);
  const byClass = {};
  for (const c of CLASSES) for (let l = 1; l <= 5; l++) byClass[`${c}/${l}`] = 0;
  const byKind = {}, byCrown = {}, byRoof = {};
  for (const b of sel) {
    const k = `${b.type}/${b.density}/${b.level}`;
    byClass[k] = (byClass[k] || 0) + 1;
    byKind[b.plan.kind] = (byKind[b.plan.kind] || 0) + 1;
    const c = crownKeyOf(b);
    byCrown[c] = (byCrown[c] || 0) + 1;
    byRoof[b.plan.roof] = (byRoof[b.plan.roof] || 0) + 1;
  }
  return { byClass, byKind, byCrown, byRoof };
}

function featuresFor(x, z, r) {
  const sel = selected(x, z, r);
  const totalsByClass = {}; for (const c of CLASSES) totalsByClass[c] = 0;
  const totalsByLevel = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const roofClutter = { 0: 0, 1: 0, 2: 0, 3: 0, '4+': 0 };
  const nonRect = { byLevel: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, byClass: {} };
  for (const c of CLASSES) nonRect.byClass[c] = 0;
  let commercialOrMixed = 0, mixedUse = 0, housesL2 = 0, gfd = 0, sign = 0, interior = 0;
  let chimneyOrDormer = 0, corner = 0, balc = 0, balcTot = 0;
  let reveal = Infinity, band = Infinity, cornice = Infinity;
  const lit = S.uniforms.uLit.value;
  let cTotal = 0, cLit = 0, cWarm = 0, cCool = 0;
  const tierSet = new Set();

  for (const b of sel) {
    const p = b.plan;
    const cls = `${b.type}/${b.density}`;
    totalsByClass[cls]++;
    totalsByLevel[b.level]++;
    if (b.type === 'commercial' || b.mixedUse) {
      commercialOrMixed++;
      if (groundFloorDistinct(b)) gfd++;
      if (p.retail) { sign++; interior++; }
    }
    if (b.mixedUse) mixedUse++;
    if (b.type === 'residential' && b.density === 'low' && b.level >= 2) {
      housesL2++;
      if (p.chimneyOrDormer) chimneyOrDormer++;
    }
    if (p.roof === 'flat') {
      const n = (p.clutterList || []).length;
      roofClutter[n >= 4 ? '4+' : n]++;
    }
    if (p.nonRect) { nonRect.byLevel[b.level]++; nonRect.byClass[cls]++; }
    if (b.lot?.corner && p.cornerTreated) corner++;
    if (b.type === 'residential' && b.density === 'high' && b.level >= 3) {
      balcTot++;
      if (p.balcony && (p.balconyFloors || 0) >= 3) balc++;
    }
    if (p.relief) {
      reveal = Math.min(reveal, p.relief.reveal);
      band = Math.min(band, p.relief.band);
      cornice = Math.min(cornice, p.relief.cornice);
    }
    const cs = b.cells;
    if (cs) for (let i = 0; i < cs.length; i += 4) {
      cTotal++;
      const on = cs[i] >= 1 - Math.min(0.96, Math.max(0, lit * cs[i + 3]));
      if (on) {
        cLit++;
        tierSet.add(Math.round(cs[i + 1] * 100));
        if (cs[i + 2] < 0.5) cWarm++; else cCool++;
      }
    }
  }
  // clutter multisets and footprint/crown twins among near neighbours
  let clutterTwins = 0, adjacentTwins = 0;
  for (let i = 0; i < sel.length; i++) for (let j = i + 1; j < sel.length; j++) {
    const a = sel[i], b = sel[j];
    if ((a.x - b.x) ** 2 + (a.z - b.z) ** 2 > 45 * 45) continue;
    const ka = clutterKey(a.plan), kb = clutterKey(b.plan);
    if (ka && ka === kb) clutterTwins++;
    if (Math.abs(a.footprint.w - b.footprint.w) <= 1 && crownKeyOf(a) === crownKeyOf(b)) adjacentTwins++;
  }
  return {
    totalsByClass, totalsByLevel,
    commercialOrMixed, mixedUse,
    houses: { level2plus: housesL2 },
    groundFloorDistinct: gfd, shopfrontSign: sign, litInterior: interior,
    roofClutter, clutterTwins, chimneyOrDormer,
    nonRect, corner,
    balconied: { level3plusResHigh: balc, totalLevel3plusResHigh: balcTot },
    adjacentTwins,
    litCells: { total: cTotal, lit: cLit, tiers: tierSet.size, warm: cWarm, cool: cCool },
    reliefDepths: {
      reveal: Number.isFinite(reveal) ? +reveal.toFixed(3) : 0,
      band: Number.isFinite(band) ? +band.toFixed(3) : 0,
      cornice: Number.isFinite(cornice) ? +cornice.toFixed(3) : 0,
    },
  };
}

/**
 * The best on-screen facade patch for a building: scores each of its four faces by how squarely it
 * turns toward the camera and whether a `size` rect around it fits in the frame. A street-corridor
 * view has every facade near edge-on, so a hard "must face the camera" test finds nothing — this
 * ranks instead, and falls back to a clamped rect rather than emitting none.
 */
function faceRect(b, camera, project, size, W, H) {
  const cam = camera.camera.position;
  const c = Math.cos(b.heading), s = Math.sin(b.heading);
  const hw = b.footprint.w / 2, hd = b.footprint.d / 2;
  let best = null, bestScore = -1e9;
  for (const [lx, lz] of [[0, hd], [0, -hd], [hw, 0], [-hw, 0]]) {
    const wx = b.x + c * lx + s * lz, wz = b.z + s * lx - c * lz;
    const nx = wx - b.x, nz = wz - b.z, nl = Math.hypot(nx, nz) || 1;
    const tx = cam.x - wx, tz = cam.z - wz, tl = Math.hypot(tx, tz) || 1;
    const dot = (nx / nl) * (tx / tl) + (nz / nl) * (tz / tl);
    if (dot <= 0.02) continue;
    for (const hf of [0.45, 0.32, 0.6, 0.2]) {
      const p = project(wx, b.y + b.height * hf, wz);
      if (!p || !Number.isFinite(p[0]) || !Number.isFinite(p[1]) || p[2] > 1) continue;
      const m = size / 2;
      const inside = p[0] >= m && p[0] <= W - m && p[1] >= m && p[1] <= H - m;
      const onScreen = p[0] >= 0 && p[0] <= W && p[1] >= 0 && p[1] <= H;
      const score = (inside ? 1000 : onScreen ? 300 : 0) + dot * 40;
      if (score > bestScore) { bestScore = score; best = p; }
    }
  }
  if (!best || bestScore < 250) return null;
  return [Math.max(0, Math.min(W - size, Math.round(best[0] - size / 2))),
    Math.max(0, Math.min(H - size, Math.round(best[1] - size / 2))), size, size];
}

// ------------------------------------------------------------------ module
export default {
  name: 'buildings',
  dependencies: ['terrain', 'roads', 'zoning'],
  budget: { drawCalls: 400, triangles: 2_000_000 },

  async init(ctx) {
    S.ctx = ctx;
    S.nextId = 1;
    S.setupMs = 0;
    S.lots = new Map();
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
    S.chunks.beginFrame();
    if (S.chunks.dirty.size) S.chunks.rebuildDirty(2);
    flushEvents();

    S.lodTimer += dt;
    if (S.lodTimer > 0.2) { S.lodTimer = 0; S.chunks.updateLod(ctx.camera.camera); }

    const night = nightFactor(ctx);
    const lit = litFraction(ctx, night);
    S.litSmooth += (lit - S.litSmooth) * Math.min(1, dt * 3);
    S.uniforms.uNight.value = night;
    S.uniforms.uLit.value = S.litSmooth;

    // `lit` is kept current every frame (§2, item 22)
    const on = night > 0.15;
    for (const b of ctx.world.buildings.items.values()) b.lit = on;

    // info view tint (ARCHITECTURE §15, item 21)
    const iv = ctx.world.infoview;
    const active = iv?.active ?? null;
    S.frame++;
    if (active !== S.infoKey || (active && S.frame % 20 === 0)) {
      S.infoKey = active;
      const data = S.uniforms._tintData;
      data.fill(0);
      if (active && typeof iv.buildingTint === 'function') {
        for (const b of ctx.world.buildings.items.values()) {
          let col = null;
          try { col = iv.buildingTint(b.id); } catch { col = null; }
          if (col == null) continue;
          const c = _tmpColor.set(col);
          const o = b.slot * 4;
          data[o] = Math.round(c.r * 255); data[o + 1] = Math.round(c.g * 255); data[o + 2] = Math.round(c.b * 255); data[o + 3] = 255;
        }
      }
      S.uniforms.uTintTex.value.needsUpdate = true;
      S.uniforms.uInfo.value = active ? 1 : 0;
    }
  },

  dispose(ctx) {
    S.chunks?.dispose();
    S.mat?.dispose();
    S.uniforms?.uTintTex?.value?.dispose();
    if (S.tex) for (const t of Object.values(S.tex)) t?.dispose();
    ctx.world.buildings.items.clear();
    S.chunks = null; S.mat = null; S.tex = null; S.atlas = null;
  },

  api: {
    requestSpawn(lot) { return spawn(lot); },
    setLevel(id, n) { return setLevel(id, n); },
    demolish(id) { return demolish(id); },
    at(x, z) { return at(x, z); },
    get(id) { return S.ctx?.world.buildings.items.get(id) || null; },
    count() { return S.ctx?.world.buildings.items.size || 0; },
    flush() { S.chunks?.flush(); flushEvents(); if (S.ctx) S.chunks.updateLod(S.ctx.camera.camera); },
    spawnFreeLots(limit) { const n = spawnFreeLots(limit); S.chunks?.flush(); flushEvents(); return n; },
    stats(x, z, r) { return S.chunks ? statsFor(x, z, r) : null; },
    styleCounts(x, z, r) { return S.chunks ? styleCountsFor(x, z, r) : null; },
    features(x, z, r) { return S.chunks ? featuresFor(x, z, r) : null; },
    forceLod(n) { S.chunks?.forceLod(n); return n; },
    /** the lot surface this module has claimed — props plants around it (item 7) */
    lotSurface(id) {
      const b = S.ctx?.world.buildings.items.get(id);
      if (!b) return null;
      const c = Math.cos(b.heading), s = Math.sin(b.heading);
      const paved = (b.plan.paved || []).map((q) => ({
        x: b.x + c * q.x + s * q.z, z: b.z + s * q.x - c * q.z,
        w: q.w, d: q.d, heading: b.heading + (q.heading || 0),
      }));
      return {
        lotId: b.lotId, x: b.lot.x, z: b.lot.z, w: b.lot.w, d: b.lot.d, heading: b.lot.heading,
        footprint: { w: b.footprint.w, d: b.footprint.d }, paved,
      };
    },
    /** named pixel rects the critic measures inside (§2, item 3) */
    cropRects({ project, width, height, camera }) {
      const out = {};
      if (!S.ctx) return out;
      const items = [...S.ctx.world.buildings.items.values()];
      const t = camera?.presets?.night_downtown?.target;
      if (t) {
        const near = items.filter((b) => (b.x - t[0]) ** 2 + (b.z - t[2]) ** 2 <= 120 * 120)
          .sort((a, b) => b.height - a.height);
        for (const b of near) {
          const r = faceRect(b, camera, project, 200, width, height);
          if (r) { out.nightFacade = r; break; }
        }
      }
      const cam = camera.camera.position;
      const fars = items.filter((b) => {
        const d = Math.hypot(b.x - cam.x, b.z - cam.z);
        return d >= 250 && d <= 400 && b.height >= 25;
      }).sort((a, b) => b.height * b.footprint.w - a.height * a.footprint.w);
      for (const b of fars) {
        const r = faceRect(b, camera, project, 128, width, height);
        if (r) { out.farTower = r; break; }
      }
      return out;
    },
    material() { return S.mat; },
    atlasTextures() { return S.tex; },
    setNight(v) { S.uniforms.uNight.value = v; },
    setLit(v) { S.uniforms.uLit.value = v; S.litSmooth = v; },
    serialize() {
      if (!S.ctx) return null;
      return {
        module: 'buildings', version: 2, nextId: S.nextId,
        items: [...S.ctx.world.buildings.items.values()].map((b) => ({
          id: b.id, lotId: b.lotId, type: b.type, density: b.density, level: b.level,
          heading: b.heading, lot: b.lot, mixedUse: b.mixedUse, w: b.plan.w,
          variant: lotOf(b)?.variant ?? null,
          facadeIdx: lotOf(b)?.facadeIdx ?? null, minFloors: lotOf(b)?.minFloors ?? null,
          catalog: !!b.plan.catalog,
        })),
      };
    },
    deserialize(data) {
      if (!data || !S.ctx) return;
      for (const id of [...S.ctx.world.buildings.items.keys()]) demolish(id);
      for (const it of data.items || []) {
        const id = spawn({
          id: it.lotId, x: it.lot?.x, z: it.lot?.z, w: it.lot?.w ?? 20, d: it.lot?.d ?? 24,
          heading: it.heading, type: it.type, density: it.density, level: it.level,
          corner: !!it.lot?.corner, mixedUse: !!it.mixedUse, catalog: !!it.catalog,
          variant: it.variant == null ? undefined : it.variant,
          facadeIdx: it.facadeIdx == null ? undefined : it.facadeIdx,
          minFloors: it.minFloors == null ? undefined : it.minFloors,
        }, it.id);
        const b = id >= 0 ? S.ctx.world.buildings.items.get(id) : null;
        if (b && typeof it.w === 'number') { b.plan.w = it.w; b.footprint.w = it.w; S.chunks.touch(b); }
      }
      S.nextId = Math.max(S.nextId, data.nextId || 1);
      S.chunks?.flush(); flushEvents();
    },
  },

  showcase: {
    description: 'A continuous city: a downtown of towers with six different crowns, a mixed-use mid-rise ring with lit retail bases, balconied slabs, a suburb of detached houses on dressed lots, an industrial park, and a 40-cell catalog of every zone × density × level.',
    cameras: CAMERAS,
    async setup(ctx) {
      const t0 = performance.now();
      stage(ctx);
      S.chunks.flush();
      flushEvents();
      S.chunks.updateLod(ctx.camera.camera);
      ctx.modules.environment?.hookScene?.();
      const st = S.chunks.stats;
      S.setupMs = performance.now() - t0;
      ctx.log.info(`chunks ${st.chunks}, tris lod0 ${st.tris0 | 0} / lod1 ${st.tris1 | 0}, setup ${S.setupMs.toFixed(0)} ms`);
    },
  },
};

const _tmpColor = new THREE.Color();
