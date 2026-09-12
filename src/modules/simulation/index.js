// simulation — deterministic city economy: population, jobs, RCI demand, money/taxes/upkeep/trade/loans,
// happiness, milestones, growth and level-up requests, per-building occupancy + service levels,
// pollution / noise / land-value grids, day/night activity curves, history ring buffer, save/load.
// Fixed 4 Hz steps accumulated from the clock (time:tick × clock speed); never wall-clock.
// Owns world.economy (mutated in place). Robust with every other module stubbed: without a buildings
// module the showcase runs a synthetic "virtual city" so the numbers still tell a story.
import { Economy, TICK_SECONDS, TICKS_PER_HOUR, TICKS_PER_DAY, ZONE_TYPES, FINE_KEYS, MILESTONES, capacityOf, TUNING } from './economy.js';
import { VirtualCity } from './virtualcity.js';
import { createServiceUpkeepReader } from './service-upkeep.js';
import * as Activity from './activity.js';
import { Panel } from './panel.js';
import { stageScene, updateScene, disposeScene, CAMERAS } from './showcase.js';

const MAX_TICKS_PER_FRAME = 2000;
const PREROLL_DAYS = 60;

const S = {
  ctx: null, eco: null, city: null, panel: null,
  acc: 0, speedOverride: null, showcaseSpeed: 0, dropped: 0, droppedWarned: false,
  lots: { residential: [], commercial: [], industrial: [], office: [] }, lotsDirty: true,
  tickPayload: { tick: 0, economy: null }, demandPayload: { residential: 0, commercial: 0, industrial: 0, office: 0 },
  growthPayload: { type: '', density: '', lot: null, virtual: false }, levelPayload: { id: null, virtual: false },
  milestonePayload: { level: 0, name: '', unlocks: null, reward: 0, population: 0 },
  profile: {}, staged: false, unsub: [],
};

// ---------------------------------------------------------------- tick driver
function effectiveSpeed(ctx) {
  const t = ctx.world.time;
  if (t.paused) return 0;
  if (S.speedOverride !== null) return S.speedOverride;
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
function mirrorOccupancy() {
  const items = S.ctx?.world.buildings?.items;
  if (!items?.size || !S.eco) return;
  for (const rec of S.eco.buildings.values()) {
    if (rec.virtual) continue;
    const it = items.get(rec.id); if (!it) continue;
    it.occupants = rec.occupants; it.jobs = rec.jobs;
  }
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
  // one-off events (milestones, loans)
  for (const evt of eco.events) {
    if (evt.type === 'milestone') {
      const mp = S.milestonePayload; mp.level = evt.level; mp.name = evt.name; mp.unlocks = evt.unlocks; mp.reward = evt.reward; mp.population = evt.population;
      ev.emit('sim:milestone', mp);
    } else if (evt.type === 'loan' || evt.type === 'loan_paid') ev.emit('sim:loan', evt);
  }
  // mirror occupancy + levels onto world.buildings items (documented fields occupants/jobs) at the distribute cadence
  if (tick % 20 === 0) mirrorOccupancy();
  S.tickPayload.tick = tick;
  ev.emit('sim:tick', S.tickPayload);
  if (tick % 25 === 0) {
    const d = eco.econ.demand, dp = S.demandPayload;
    dp.residential = d.residential; dp.commercial = d.commercial; dp.industrial = d.industrial; dp.office = d.office;
    ev.emit('sim:demand', dp);
  }
}

function currentHour() { return S.ctx ? (S.showcaseSpeed && S.ctx.world.time.speed === 0 ? S.eco.econ.hour : S.ctx.world.time.hour) : 12; }

// Read the transit owner's daily forecast. Committed allocated fleets retain upkeep while inactive.
function createTransitFinanceReader(world) {
  let lastLines = null, lastVersion = -1, lastSize = -1;
  const totals = { income: 0, expenses: 0 };
  return () => {
    const lines = world.transit?.lines, version = world.transit?.version, size = lines?.size || 0;
    if (lines === lastLines && version === lastVersion && size === lastSize) return totals;
    lastLines = lines; lastVersion = version; lastSize = size;
    totals.income = 0; totals.expenses = 0;
    if (lines instanceof Map) for (const line of lines.values()) {
      if (typeof line.active !== 'boolean' || ![line.ridership, line.fare, line.balance].every(Number.isFinite) || line.ridership < 0 || line.fare < 0) continue;
      const forecastIncome = line.ridership * line.fare;
      const expense = forecastIncome - line.balance / 30;
      if (!Number.isFinite(forecastIncome) || !Number.isFinite(expense) || expense < -1e-6) continue;
      if (line.active) totals.income += forecastIncome;
      totals.expenses += Math.max(0, expense);
    }
    return totals;
  };
}

/** Hooks the economy uses to read the rest of the world; every one tolerates stubs. */
function makeEnv(ctx) {
  const w = ctx.world;
  return {
    servicesActive: () => !!(ctx.modules.services && w.services && w.services.items && w.services.items.size > 0),
    serviceUpkeep: createServiceUpkeepReader(w, ctx.modules),
    localUtilities: () => {
      const kinds = new Set();
      if (w.services?.items instanceof Map) for (const item of w.services.items.values()) kinds.add(item.kind);
      return {
        power: kinds.has('power_coal') || kinds.has('power_wind') || kinds.has('power_solar') || kinds.has('incinerator'),
        water: kinds.has('water_pump') && kinds.has('sewage'),
        garbage: kinds.has('landfill') || kinds.has('incinerator'),
      };
    },
    transitFinance: createTransitFinanceReader(w),
    coverage: (kind, x, z) => { try { const v = w.services?.coverage?.(kind, x, z); return typeof v === 'number' && v === v ? v : 0; } catch (e) { return 0; } },
    isWater: (x, z) => { try { return !!w.terrain?.isWater?.(x, z); } catch (e) { return false; } },
    edges: () => (w.roads?.edges instanceof Map ? w.roads.edges : null),
    nodes: () => (w.roads?.nodes instanceof Map ? w.roads.nodes : null),
    congestion: () => { const c = w.traffic?.stats?.congestion; return typeof c === 'number' ? c : 0; },
  };
}

// ---------------------------------------------------------------- module
export default {
  name: 'simulation',
  dependencies: [],
  // in the full game the simulation renders nothing; the showcase's data plaza (ground, plaza, paths, trees ×2,
  // hedges, bars, pillars, plinths, labels + CSM shadow passes) is what these numbers cover
  budget: { drawCalls: 36, triangles: 400_000 },

  async init(ctx) {
    S.ctx = ctx;
    const econ = ctx.world.economy;
    S.eco = new Economy(ctx.rng.fork('economy'), econ, makeEnv(ctx));
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
      ev.on('roads:rebuilt', () => { try { S.eco.syncRoads(ctx.world.roads.edges); } catch (e) { ctx.log.warn(`roads rebuild sync failed: ${e?.message}`); } }, own),
      ev.on('zones:changed', () => { S.lotsDirty = true; }, own),
      ev.on('save:loaded', (p) => {
        const incoming = p?.modules?.simulation?.economy?.econ;
        if (incoming) S.eco.restoreServicesManaged(incoming.servicesManaged);
      }, own),
      ev.on('services:changed', () => {
        if (ctx.world.services.items.size) S.eco.econ.servicesManaged = true;
      }, own),
      ev.on('ui:action', (p) => {
        if (!p) return;
        if (p.action === 'setTaxRate') S.eco.econ.taxRate = Math.max(0.01, Math.min(0.3, +p.args?.[0] || 0.1));
        else if (p.action === 'setSimSpeed') S.speedOverride = p.args?.[0] == null ? null : Math.max(0, +p.args[0]);
        else if (p.action === 'takeLoan') {
          const amount = +p.args?.[0] || 0, days = +p.args?.[1] || 30;
          const outstanding = S.eco.econ.loans.reduce((sum, loan) => sum + loan.remaining, 0);
          const reason = S.eco.econ.loans.length >= 3 ? 'Maximum of three active loans reached.'
            : outstanding + amount > S.eco.econ.loanCapacity ? `Only ¢${Math.max(0, Math.floor(S.eco.econ.loanCapacity - outstanding)).toLocaleString('en-US')} of borrowing capacity remains.`
              : amount <= 0 ? 'No loan amount was selected.' : '';
          const loan = reason ? null : S.eco.takeLoan(amount, days);
          // UI actions happen between simulation ticks. Publish the result now; Economy.step clears
          // its transient event queue at the start of the next tick.
          S.eco.events.length = 0;
          ev.emit('sim:loan', loan ? { type: 'loan', id: loan.id, amount: loan.principal, remaining: loan.remaining, dailyPayment: loan.dailyPayment, daysLeft: loan.daysLeft }
            : { type: 'loan_refused', amount, reason: reason || 'The loan could not be approved.' });
        } else if (p.action === 'repayLoan') {
          const id = +p.args?.[0]; const paid = S.eco.repayLoan(id);
          ev.emit('sim:loan', paid ? { type: 'loan_paid_early', id } : { type: 'loan_refused', reason: 'The city does not have enough cash to repay this loan.' });
        }
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
    constants: { TICK_SECONDS, TICKS_PER_HOUR, TICKS_PER_DAY, ZONE_TYPES, FINE_KEYS, TUNING, MILESTONES },
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
    /** Per-building simulation record {type, density, level, capacity, occupants, jobs, education, health, crime, fireRisk, parks, power, water, pollution, noise, landValue} or null. */
    building(id) { return S.eco?.buildings.get(id) || null; },
    // progression
    milestone() { return S.ctx?.world.economy.milestone || null; },
    milestones: MILESTONES,
    isUnlocked(what) { const m = S.ctx?.world.economy.milestone; return !!m && (m.unlocked.includes(what) || what === undefined); },
    // loans
    takeLoan(amount, days = 30) { return S.eco ? S.eco.takeLoan(amount, days) : null; },
    repayLoan(id) { return S.eco ? S.eco.repayLoan(id) : false; },
    loans() { return S.ctx?.world.economy.loans || []; },
    // grids (256², also at world.economy.grids)
    grids() { return S.eco ? S.eco.grids.expose() : null; },
    landValueAt(x, z) { return S.eco ? S.eco.grids.sample(S.eco.grids.landValue, x, z) : 0; },
    pollutionAt(x, z) { const g = S.eco?.grids; return g ? Math.min(1, g.sample(g.ground, x, z) + g.sample(g.air, x, z)) : 0; },
    noiseAt(x, z) { const g = S.eco?.grids; return g ? g.sample(g.noise, x, z) : 0; },
    services() { return S.eco ? S.eco.services : null; },
    /** Override the simulation speed (null = follow the game clock). */
    setSimSpeed(n) { S.speedOverride = n == null ? null : Math.max(0, +n); },
    simSpeed() { return S.ctx ? effectiveSpeed(S.ctx) : 0; },
    /** Reconcile owner stock after an inverse transaction without rewinding clock or economy. */
    reconcileWorld() {
      if (!S.eco || !S.ctx) return false;
      S.eco.syncRoads(S.ctx.world.roads.edges);
      S.eco.syncBuildings(S.ctx.world.buildings.items);
      S.eco.distribute();
      mirrorOccupancy();
      S.ctx.events.emit('sim:reconciled', { buildings: true, roads: true });
      return true;
    },
    isVirtual() { return !!S.city; },
    virtualCity() { return S.city; },
    serialize() { if (!S.eco) return null; return { module: 'simulation', version: 2, economy: S.eco.serialize(), city: S.city ? S.city.serialize() : null }; },
    deserialize(save) {
      if (!S.eco || !save || save.module !== 'simulation') return false;
      if (S.eco.deserialize(save.economy) === false) return false;
      if (S.city && save.city) S.city.deserialize(save.city);
      // Economy owns filled occupants/jobs. A frozen loaded city may not reach the next 20-tick
      // mirror cadence, so publish restored occupancy immediately.
      mirrorOccupancy();
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
    description: 'Live economy panel (population, treasury, jobs, RCI demand, milestone, sparklines, activity curve) driven by a synthetic city at 20x, plus a civic data plaza: 30-day population/jobs/treasury bars and RCI demand pillars.',
    cameras: CAMERAS,
    async setup(ctx) {
      // synthetic building stock (no buildings/zoning modules in this showcase) + 20x sim speed while the clock is frozen
      S.city = new VirtualCity(S.eco, ctx.rng.fork('virtualcity'));
      S.showcaseSpeed = 20;
      if (ctx.world.time.speed > 0 && ctx.world.time.speed < 20) ctx.clock.setSpeed(20);
      // pre-roll so the history has a story; deterministic (same seed => same numbers)
      const t0 = performance.now();
      const n = PREROLL_DAYS * TICKS_PER_DAY;
      for (let i = 0; i < n; i++) runTick();
      const e = S.eco.econ;
      ctx.log.info(`pre-rolled ${n} ticks in ${(performance.now() - t0).toFixed(0)} ms: pop ${e.population}, jobs ${e.jobs}, money ${Math.round(e.money)}, ${S.eco.buildings.size} buildings, milestone ${e.milestone.name}`);
      S.panel = new Panel(ctx);
      await stageScene(ctx, S.eco);
      S.staged = true;
    },
  },
};
