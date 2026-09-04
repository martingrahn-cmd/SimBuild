// simulation — deterministic city economy: population, jobs, RCI demand, money/taxes/upkeep, happiness,
// growth and level-up requests, per-building occupancy, day/night activity curves, history ring buffer,
// save/load. Fixed 4 Hz steps accumulated from the clock (time:tick × clock speed); never wall-clock.
// Owns world.economy (mutated in place). Robust with every other module stubbed: without a buildings
// module the showcase runs a synthetic "virtual city" so the numbers still tell a story.
import { Economy, TICK_SECONDS, TICKS_PER_HOUR, TICKS_PER_DAY, ZONE_TYPES, FINE_KEYS, capacityOf, TUNING } from './economy.js';
import { VirtualCity } from './virtualcity.js';
import * as Activity from './activity.js';
import { Panel } from './panel.js';
import { stageScene, updateScene, disposeScene, CAMERAS } from './showcase.js';

const MAX_TICKS_PER_FRAME = 2000;

const S = {
  ctx: null, eco: null, city: null, panel: null,
  acc: 0, speedOverride: null, showcaseSpeed: 0, dropped: 0, droppedWarned: false,
  lots: { residential: [], commercial: [], industrial: [], office: [] }, lotsDirty: true,
  tickPayload: { tick: 0, economy: null }, demandPayload: { residential: 0, commercial: 0, industrial: 0, office: 0 },
  growthPayload: { type: '', density: '', lot: null, virtual: false }, levelPayload: { id: null, virtual: false },
  profile: {}, staged: false, unsub: [],
};

// ---------------------------------------------------------------- tick driver
function effectiveSpeed(ctx) {
  if (S.speedOverride !== null) return S.speedOverride;
  const t = ctx.world.time;
  if (t.paused) return 0;
  if (t.speed > 0) return t.speed;
  return S.showcaseSpeed;          // clock frozen by ?time= : the showcase keeps the economy moving
}
function onTimeTick(p) {
  const ctx = S.ctx; if (!ctx || !S.eco) return;
  const dt = p?.dt || 0;
  if (!(dt > 0)) return;
  S.acc += dt * effectiveSpeed(ctx);
  let n = Math.floor(S.acc / TICK_SECONDS);
  if (n <= 0) return;
  S.acc -= n * TICK_SECONDS;
  if (n > MAX_TICKS_PER_FRAME) {
    S.dropped += n - MAX_TICKS_PER_FRAME; n = MAX_TICKS_PER_FRAME; S.acc = 0;
    if (!S.droppedWarned) { S.droppedWarned = true; ctx.log.warn(`sim speed too high for one frame; dropping ticks (${S.dropped} so far)`); }
  }
  for (let i = 0; i < n; i++) runTick();
}
function refreshLots() {
  S.lotsDirty = false;
  for (const k of ZONE_TYPES) S.lots[k].length = 0;
  let free = null;
  try { free = S.ctx.world.zones.freeLots?.(); } catch (e) { free = null; }
  if (!Array.isArray(free)) return;
  for (const lot of free) { const k = lot?.type; if (S.lots[k]) S.lots[k].push(lot); }
}
function runTick() {
  const ctx = S.ctx, eco = S.eco, ev = ctx.events, mods = ctx.modules;
  eco.step();
  const tick = eco.tick;
  if (S.lotsDirty || tick % TICKS_PER_HOUR === 0) refreshLots();

  // growth requests -> buildings module (if it exposes requestSpawn) or the virtual city (showcase only)
  const bapi = mods.buildings;
  const canSpawn = bapi && typeof bapi.requestSpawn === 'function';
  for (const req of eco.requests) {
    const gp = S.growthPayload; gp.type = req.type; gp.density = req.density; gp.lot = null; gp.virtual = false;
    if (canSpawn) {
      const lots = S.lots[req.type];
      if (!lots.length) continue;
      const i = eco.rng.int(0, lots.length - 1);
      const lot = lots[i]; lots[i] = lots[lots.length - 1]; lots.pop();
      gp.lot = lot;
      try { bapi.requestSpawn(lot, req.density); } catch (e) { ctx.log.warn(`buildings.requestSpawn threw: ${e?.message || e}`); }
    } else if (S.city) {
      S.city.spawn(req.type, req.density); gp.virtual = true;
    } else continue;
    ev.emit('sim:growth', gp);
  }
  // level-ups
  for (const id of eco.levelups) {
    const rec = eco.buildings.get(id); if (!rec) continue;
    const lp = S.levelPayload; lp.id = id; lp.virtual = rec.virtual;
    if (rec.virtual) { if (S.city) S.city.levelUp(id); }
    else if (bapi && typeof bapi.requestLevelUp === 'function') { try { bapi.requestLevelUp(id); } catch (e) { /* isolated */ } eco.econ.levelUps++; }
    else continue;
    ev.emit('sim:levelup', lp);
  }
  // mirror occupancy onto world.buildings items (documented fields occupants/jobs) at the distribute cadence
  if (tick % 20 === 0) {
    const items = ctx.world.buildings?.items;
    if (items && items.size) for (const rec of eco.buildings.values()) {
      if (rec.virtual) continue;
      const it = items.get(rec.id); if (!it) continue;
      it.occupants = rec.occupants; it.jobs = rec.jobs;
    }
  }
  S.tickPayload.tick = tick;
  ev.emit('sim:tick', S.tickPayload);
  if (tick % 25 === 0) {
    const d = eco.econ.demand, dp = S.demandPayload;
    dp.residential = d.residential; dp.commercial = d.commercial; dp.industrial = d.industrial; dp.office = d.office;
    ev.emit('sim:demand', dp);
  }
}

function currentHour() { return S.ctx ? (S.showcaseSpeed && S.ctx.world.time.speed === 0 ? S.eco.econ.hour : S.ctx.world.time.hour) : 12; }

// ---------------------------------------------------------------- module
export default {
  name: 'simulation',
  dependencies: [],
  budget: { drawCalls: 24, triangles: 120_000 },

  async init(ctx) {
    S.ctx = ctx;
    const econ = ctx.world.economy;
    S.eco = new Economy(ctx.rng.fork('economy'), econ);
    // align the simulation clock with the game clock (100 ticks per hour, 2400 per day)
    const t = ctx.world.time;
    S.eco.tick = Math.max(0, ((t.day | 0) - 1)) * TICKS_PER_DAY + Math.floor((t.hour || 0) * TICKS_PER_HOUR);
    econ.tick = S.eco.tick; econ.day = t.day | 0 || 1; econ.hour = t.hour || 0;
    S.tickPayload.economy = econ;
    S.eco.syncBuildings(ctx.world.buildings.items);
    S.eco.syncRoads(ctx.world.roads.edges);
    const ev = ctx.events, own = 'simulation';
    S.unsub.push(
      ev.on('time:tick', onTimeTick, own),
      ev.on('buildings:changed', () => { try { S.eco.syncBuildings(ctx.world.buildings.items); } catch (e) { ctx.log.warn(`buildings sync failed: ${e?.message}`); } S.lotsDirty = true; }, own),
      ev.on('roads:changed', () => { try { S.eco.syncRoads(ctx.world.roads.edges); } catch (e) { ctx.log.warn(`roads sync failed: ${e?.message}`); } }, own),
      ev.on('zones:changed', () => { S.lotsDirty = true; }, own),
      ev.on('ui:action', (p) => {
        if (!p) return;
        if (p.action === 'setTaxRate') S.eco.econ.taxRate = Math.max(0.01, Math.min(0.3, +p.args?.[0] || 0.1));
        if (p.action === 'setSimSpeed') S.speedOverride = p.args?.[0] == null ? null : Math.max(0, +p.args[0]);
      }, own),
    );
    ctx.log.info(`economy ready: tick ${S.eco.tick}, ${S.eco.buildings.size} buildings, ${econ.roadKm.toFixed(1)} km roads`);
  },

  update(dt, ctx) {
    if (S.panel) S.panel.update(S.eco, currentHour(), effectiveSpeed(ctx));
    if (S.staged) updateScene(ctx, S.eco, dt);
  },

  dispose(ctx) {
    for (const u of S.unsub) { try { u(); } catch (e) { /* ignore */ } }
    S.unsub.length = 0;
    S.panel?.dispose(); S.panel = null;
    if (S.staged) disposeScene(ctx);
    S.staged = false; S.city = null; S.eco = null; S.ctx = null; S.acc = 0; S.showcaseSpeed = 0; S.speedOverride = null;
  },

  api: {
    /** Commute factor 0..1 for an hour (default: the current game hour). */
    activity(hour) { return Activity.commute(hour === undefined ? currentHour() : hour); },
    /** Every curve at once: {commute, traffic, pedestrians, awake, residential, commercial, office, industrial, streetLights}. Reuses one object unless `out` is given. */
    profile(hour, out) { return Activity.profile(hour === undefined ? currentHour() : hour, out || S.profile); },
    curves: Activity,
    economy() { return S.ctx?.world.economy || null; },
    demand() { return S.ctx?.world.economy.demand || null; },
    tick() { return S.eco ? S.eco.tick : 0; },
    /** Advance n fixed steps synchronously (tests, pre-roll). Deterministic. */
    step(n = 1) { if (!S.eco) return 0; for (let i = 0; i < n; i++) runTick(); return S.eco.tick; },
    constants: { TICK_SECONDS, TICKS_PER_HOUR, TICKS_PER_DAY, ZONE_TYPES, FINE_KEYS, TUNING },
    /** Fine history (one sample per 10 ticks, 3 days) + the daily series in world.economy.history. */
    history() {
      const r = S.eco?.fine; if (!r) return null;
      const kIdx = (k) => (typeof k === 'number' ? k : FINE_KEYS.indexOf(k));
      return { keys: FINE_KEYS, count: r.count, capacity: r.len, get: (i, k) => r.get(i, kIdx(k)), last: (k) => r.last(kIdx(k)), series: (k) => r.series(kIdx(k)), daily: S.eco.econ.history };
    },
    setTaxRate(r) { if (S.eco) S.eco.econ.taxRate = Math.max(0.01, Math.min(0.3, +r || 0.1)); return S.eco?.econ.taxRate; },
    canAfford(a) { return S.eco ? S.eco.canAfford(a) : false; },
    /** Deduct money; false if unaffordable (unless force). Tools use this for construction costs. */
    spend(a, force = false) { return S.eco ? S.eco.spend(a, force) : false; },
    earn(a) { S.eco?.earn(a); },
    capacityOf,
    /** Per-building simulation record {type, density, level, capacity, occupants, jobs} or null. */
    building(id) { return S.eco?.buildings.get(id) || null; },
    /** Override the simulation speed (null = follow the game clock). */
    setSimSpeed(n) { S.speedOverride = n == null ? null : Math.max(0, +n); },
    simSpeed() { return S.ctx ? effectiveSpeed(S.ctx) : 0; },
    isVirtual() { return !!S.city; },
    virtualCity() { return S.city; },
    serialize() { if (!S.eco) return null; return { module: 'simulation', version: 1, economy: S.eco.serialize(), city: S.city ? S.city.serialize() : null, acc: S.acc }; },
    deserialize(save) {
      if (!S.eco || !save || save.module !== 'simulation') return false;
      S.eco.deserialize(save.economy);
      if (S.city && save.city) S.city.deserialize(save.city);
      S.acc = 0; S.lotsDirty = true;
      return true;
    },
    reset() { if (!S.eco) return; S.eco.reset(); S.acc = 0; S.lotsDirty = true; if (S.city) { S.city = new VirtualCity(S.eco, S.ctx.rng.fork('virtualcity')); } },
    showPanel(on = true) {
      if (!S.ctx) return;
      if (on && !S.panel) S.panel = new Panel(S.ctx);
      else if (!on && S.panel) { S.panel.dispose(); S.panel = null; }
    },
  },

  showcase: {
    description: 'Live economy panel (population, treasury, jobs, RCI demand, sparklines, activity curve) driven by a synthetic city at 20x, plus a civic data plaza: 30-day population/jobs/treasury bars and RCI demand pillars.',
    cameras: CAMERAS,
    async setup(ctx) {
      // synthetic building stock (no buildings/zoning modules in this showcase) + 20x sim speed while the clock is frozen
      S.city = new VirtualCity(S.eco, ctx.rng.fork('virtualcity'));
      S.showcaseSpeed = 20;
      if (ctx.world.time.speed > 0 && ctx.world.time.speed < 20) ctx.clock.setSpeed(20);
      // pre-roll 60 game days so the history has a story; deterministic (same seed => same numbers)
      const t0 = performance.now();
      const n = 60 * TICKS_PER_DAY;
      for (let i = 0; i < n; i++) runTick();
      const e = S.eco.econ;
      ctx.log.info(`pre-rolled ${n} ticks in ${(performance.now() - t0).toFixed(0)} ms: pop ${e.population}, jobs ${e.jobs}, money ${Math.round(e.money)}, ${S.eco.buildings.size} buildings`);
      S.panel = new Panel(ctx);
      await stageScene(ctx, S.eco);
      S.staged = true;
    },
  },
};
