// Deterministic city economy. Pure JS, no THREE, no DOM — runnable in node (see selftest.mjs).
// Fixed-step: one tick = 0.25 s of scaled game time (clock speed × real dt). A game day is 600 scaled
// seconds (clock.dayLengthSeconds at speed 1) => 2400 ticks/day, 100 ticks/hour. Every quantity that
// changes over time changes only inside step(); the only randomness is the injected RNG stream.
// Owns: population, labour market, RCI demand, money (taxes, upkeep, trade, loans), happiness,
// milestones, growth / level-up requests, per-building occupancy + service levels, 256² grids
// (ground/air pollution, noise, land value), fine + daily history.
import { Ring } from './ring.js';
import { Grids } from './grids.js';

export const TICK_SECONDS = 0.25;
export const TICKS_PER_HOUR = 100;
export const TICKS_PER_DAY = 2400;
export const ZONE_TYPES = ['residential', 'commercial', 'industrial', 'office'];
export const FINE_EVERY = 10;                 // fine history sample every 10 ticks (6 game minutes)
export const FINE_LEN = 720;                  // 3 game days of fine samples
export const FINE_KEYS = ['population', 'money', 'jobs', 'employed', 'happiness', 'residential', 'commercial', 'industrial', 'office', 'income', 'expenses'];
export const DAILY_MAX = 400;                 // days kept in world.economy.history
export const GRID_TICK = 50;                  // grids + service levels refresh at this tick of every hour

// ------------------------------------------------------------------ tuning (per game day unless noted)
export const TUNING = {
  labourShare: 0.55,          // share of population in the labour force
  frictional: 0.965,          // max share of jobs that ever gets filled
  taxPerCapita: 2.1,          // ¢ per resident per day at 10 % tax
  taxPerJob: 1.6,             // ¢ per filled job per day at 10 % tax
  tradePerIndustrialJob: 1.05, // ¢ per filled industrial job per day (exports via outside connections)
  tradePerCommercialJob: 0.22, // tourism / retail spill-over
  servicePerCapita: 1.55,     // ¢ per resident per day (schools, health, garbage...)
  servicePerJob: 0.35,
  adminFixed: 1500,           // ¢ per day city administration
  buildingUpkeep: { residential: 4, commercial: 9, industrial: 14, office: 12 },  // ¢ per building per day
  roadUpkeepPerKm: { street: 120, avenue: 200, highway: 420, alley: 60, gravel: 40 },
  moveInRate: 0.55,           // share of the daily move-in pool that arrives at desire 1
  outsideJobs: 220,           // jobs reachable via outside connections
  moveOutBase: 0.006,
  birthRate: 0.0004,          // net natural growth per day
  demandTau: 0.5,             // days, demand smoothing
  happinessTau: 0.8,          // days
  growthPerHour: 5,           // spawn requests per game hour at demand 1 (superlinear in demand)
  growthThreshold: 0.22,      // demand below this spawns nothing, so a healthy city shows 25-50 % bars
  lookahead: 0.25,            // demand plans for pop × (1 + lookahead) + lookaheadPop
  lookaheadPop: 90,
  loanRate: 0.08,             // total interest over the term
  loanMax: [30000, 60000, 100000, 160000, 250000, 400000, 600000, 900000, 1300000, 2000000, 3000000, 4500000, 6000000], // by milestone level
  // persons (residential) or jobs (others) per m² of floor area, by density
  floorAreaPer: { residential: { low: 45, high: 28 }, commercial: { low: 45, high: 38 }, industrial: { low: 70, high: 60 }, office: { low: 22, high: 18 } },
};

/** CS2-style progression: population thresholds unlock service categories and pay a one-off reward. */
export const MILESTONES = [
  { pop: 0,      name: 'Hamlet',        unlocks: ['roads', 'zoning'],                 reward: 0 },
  { pop: 150,    name: 'Tiny Village',  unlocks: ['power', 'water'],                  reward: 20000 },
  { pop: 400,    name: 'Small Village', unlocks: ['garbage', 'healthcare'],           reward: 30000 },
  { pop: 900,    name: 'Large Village', unlocks: ['education', 'police'],             reward: 40000 },
  { pop: 1800,   name: 'Grand Village', unlocks: ['fire', 'parks'],                   reward: 60000 },
  { pop: 3500,   name: 'Tiny Town',     unlocks: ['high_density', 'avenues'],         reward: 80000 },
  { pop: 6000,   name: 'Boom Town',     unlocks: ['highways', 'transit'],             reward: 120000 },
  { pop: 10000,  name: 'Busy Town',     unlocks: ['university', 'plazas'],            reward: 160000 },
  { pop: 16000,  name: 'Big Town',      unlocks: ['large_parks', 'hospital'],         reward: 220000 },
  { pop: 26000,  name: 'Small City',    unlocks: ['office_high', 'incinerator'],      reward: 300000 },
  { pop: 42000,  name: 'Big City',      unlocks: ['landmarks'],                       reward: 400000 },
  { pop: 70000,  name: 'Metropolis',    unlocks: ['monuments'],                       reward: 600000 },
  { pop: 120000, name: 'Megalopolis',   unlocks: [],                                  reward: 1000000 },
];

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const SERVICE_KEYS = ['education', 'health', 'police', 'fire', 'parks', 'power', 'water', 'garbage'];

/** Capacity (persons for residential, jobs otherwise) of a building record {type, density, level, footprint:{w,d}, floors}. */
export function capacityOf(b) {
  const type = ZONE_TYPES.includes(b.type) ? b.type : 'residential';
  const density = b.density === 'high' ? 'high' : 'low';
  const w = b.footprint?.w > 0 ? b.footprint.w : 12, d = b.footprint?.d > 0 ? b.footprint.d : 12;
  const floors = b.floors > 0 ? b.floors : (b.height > 0 ? Math.max(1, Math.round(b.height / 3.4)) : 2);
  const level = clamp(b.level | 0 || 1, 1, 5);
  const area = w * d * floors;
  const per = TUNING.floorAreaPer[type][density];
  return Math.max(1, Math.round((area / per) * (1 + 0.12 * (level - 1))));
}

/** Hooks into the rest of the world; every one has a safe default so the economy runs with stubs and in node. */
export function defaultEnv() {
  return {
    servicesActive: () => false,                   // true once a services module manages coverage
    coverage: () => 0,                             // (kind, x, z) -> 0..1
    isWater: () => false,                          // (x, z)
    edges: () => null,                             // Map id -> {a, b, type, length}
    nodes: () => null,                             // Map id -> {x, z}
    congestion: () => 0,                           // traffic 0..1
  };
}

export class Economy {
  /**
   * @param {object} rng   RNG stream (ctx.rng.fork('economy')); only randomness source.
   * @param {object} econ  world.economy — mutated in place, never replaced.
   * @param {object} env   optional hooks, see defaultEnv()
   */
  constructor(rng, econ, env = null) {
    this.rng = rng;
    this.econ = econ;
    this.env = Object.assign(defaultEnv(), env || {});
    this.tick = 0;
    this.buildings = new Map();       // id -> {id, type, density, level, capacity, occupants, jobs, virtual, x, z, ...service levels}
    this.capacity = { residential: 0, commercial: 0, industrial: 0, office: 0 };
    this.buildingCount = { residential: 0, commercial: 0, industrial: 0, office: 0 };
    this.filled = { residential: 0, commercial: 0, industrial: 0, office: 0 };
    this.roadKm = { street: 0, avenue: 0, highway: 0, alley: 0, gravel: 0 };
    this.roadUpkeep = 0;
    this.fine = new Ring(FINE_LEN, FINE_KEYS.length);
    this._fineBuf = new Float32Array(FINE_KEYS.length);
    this._target = { residential: 0, commercial: 0, industrial: 0, office: 0 };
    this._growthAcc = { residential: 0, commercial: 0, industrial: 0, office: 0 };
    this.requests = [];               // growth requests produced by the last tick: [{type, density}] (reused objects)
    this._reqPool = [];
    this.levelups = [];               // building ids that qualify for a level-up this tick
    this.events = [];                 // one-off events produced by the last tick: [{type:'milestone'|'loan_paid'|'bankrupt', ...}]
    this._occupancyDirty = true;
    this._nextLoanId = 1;
    this._refreshHappiness = 0.5;
    this.grids = new Grids(256, 2048);
    this.services = { education: 0, health: 0, police: 0, fire: 0, parks: 0, power: 1, water: 1, garbage: 1 }; // city averages
    this.reset(econ);
  }

  reset(econ = this.econ) {
    const e = econ;
    e.money = e.money ?? 150000;
    e.population = 0; e.jobs = 0; e.happiness = 0.5;
    e.taxRate = e.taxRate ?? 0.1;
    e.demand = e.demand || {};
    e.demand.residential = 0.5; e.demand.commercial = 0.3; e.demand.industrial = 0.3; e.demand.office = 0.2;
    e.history = e.history || []; e.history.length = 0;
    // extended, simulation-owned fields
    e.tick = 0; e.day = 1; e.hour = 0;
    e.populationF = 0;                // float population (e.population is rounded)
    e.households = 0; e.labour = 0; e.employed = 0; e.unemployment = 0;
    e.capacity = this.capacity; e.buildingCount = this.buildingCount; e.filledJobs = this.filled;
    e.jobOpenings = 0; e.housingVacancy = 0;
    e.income = 0; e.expenses = 0; e.net = 0;           // ¢ per day
    e.incomeBreakdown = { residentialTax: 0, businessTax: 0, trade: 0 };
    e.expenseBreakdown = { roads: 0, buildings: 0, services: 0, admin: 0, loans: 0 };
    e.roadKm = 0; e.attractiveness = 0.5; e.landValue = 0.3;
    e.growthRequests = 0; e.levelUps = 0;
    e.milestone = { level: 0, name: MILESTONES[0].name, next: MILESTONES[1].name, nextPop: MILESTONES[1].pop, progress: 0, unlocked: MILESTONES[0].unlocks.slice() };
    e.loans = [];                     // [{id, principal, remaining, dailyPayment, daysLeft}]
    e.loanCapacity = TUNING.loanMax[0];
    e.pollutionExposure = 0;          // mean ground+air pollution at homes 0..1
    e.services = this.services;
    e.servicesActive = false;
    e.grids = this.grids.expose();
    for (const k of ZONE_TYPES) { this._target[k] = e.demand[k]; this._growthAcc[k] = 0; }
    this.tick = 0;
    this._nextLoanId = 1;
    this.fine.clear();
    this.buildings.clear();
    this.grids.clear();
    for (const k of SERVICE_KEYS) this.services[k] = k === 'power' || k === 'water' || k === 'garbage' ? 1 : 0;
    this._recount();
  }

  // ---------------------------------------------------------------- building stock
  /** Add/replace a building record. b: {id, type, density, level, footprint, floors, height, x, z} */
  setBuilding(b, virtual = false) {
    const cap = capacityOf(b);
    let rec = this.buildings.get(b.id);
    if (!rec) {
      rec = { id: b.id, type: b.type, density: b.density, level: 1, capacity: cap, occupants: 0, jobs: 0, virtual, x: NaN, z: NaN,
        education: 0, health: 0, crime: 0, fireRisk: 0, parks: 0, power: 1, water: 1, pollution: 0, landValue: 0.3, noise: 0 };
      this.buildings.set(b.id, rec);
    }
    rec.type = ZONE_TYPES.includes(b.type) ? b.type : 'residential';
    rec.density = b.density === 'high' ? 'high' : 'low';
    rec.level = clamp(b.level | 0 || 1, 1, 5);
    rec.capacity = cap; rec.virtual = virtual;
    rec.x = typeof b.x === 'number' ? b.x : NaN; rec.z = typeof b.z === 'number' ? b.z : NaN;
    this._recount();
    return rec;
  }
  removeBuilding(id) { if (this.buildings.delete(id)) this._recount(); }
  /** Rebuild the stock from world.buildings.items (Map id -> building). Virtual records are kept. */
  syncBuildings(items) {
    for (const [id, rec] of this.buildings) if (!rec.virtual && !items.has(id)) this.buildings.delete(id);
    for (const b of items.values()) {
      const cur = this.buildings.get(b.id);
      const cap = capacityOf(b);
      if (cur && cur.type === b.type && cur.density === b.density && cur.level === (b.level | 0 || 1) && cur.capacity === cap && cur.x === b.x && cur.z === b.z) continue;
      this.setBuilding(b, false);
    }
    this._recount();
  }
  _recount() {
    const c = this.capacity, n = this.buildingCount;
    for (const k of ZONE_TYPES) { c[k] = 0; n[k] = 0; }
    for (const r of this.buildings.values()) { c[r.type] += r.capacity; n[r.type]++; }
    this._occupancyDirty = true;
  }
  /** Road network upkeep from world.roads.edges (Map id -> {type, length}). */
  syncRoads(edges) {
    const km = this.roadKm;
    for (const k in km) km[k] = 0;
    let total = 0;
    for (const e of edges.values()) { const t = km[e.type] !== undefined ? e.type : 'street'; const l = (e.length || 0) / 1000; km[t] += l; total += l; }
    this.setRoadKm(km, total);
  }
  setRoadKm(km, total) {
    let up = 0;
    for (const k in this.roadKm) { if (km !== this.roadKm) this.roadKm[k] = km[k] || 0; up += this.roadKm[k] * (TUNING.roadUpkeepPerKm[k] || 100); }
    this.roadUpkeep = up;
    this.econ.roadKm = total ?? Object.values(this.roadKm).reduce((a, b) => a + b, 0);
  }

  // ---------------------------------------------------------------- the step
  step() {
    const e = this.econ, T = TUNING, c = this.capacity;
    const dtDay = 1 / TICKS_PER_DAY;
    const rng = this.rng;
    this.tick++;
    e.tick = this.tick;
    e.day = 1 + Math.floor(this.tick / TICKS_PER_DAY);
    e.hour = (this.tick % TICKS_PER_DAY) / TICKS_PER_HOUR;
    this.events.length = 0;

    // -- services, pollution grids, per-building levels (once a game hour, cheap)
    if (this.tick % TICKS_PER_HOUR === GRID_TICK) this._refreshEnvironment(e.happiness);
    const sv = this.services, svActive = e.servicesActive;
    const utilities = svActive ? Math.min(sv.power, sv.water) : 1;

    // -- labour market
    const pop = e.populationF;
    const jobsTotal = c.commercial + c.industrial + c.office;
    const labour = pop * T.labourShare;
    // outside connections: a small pool of jobs beyond the city limits keeps a young city employable
    const outside = T.outsideJobs;
    const employed = Math.min(labour, (jobsTotal + outside) * T.frictional);
    const unemployment = labour > 1 ? 1 - employed / labour : 0;
    const openings = Math.max(0, (jobsTotal + outside) * T.frictional - employed);
    const fill = jobsTotal > 0 ? Math.min(1, employed / (jobsTotal + outside)) : 0;
    for (const k of ['commercial', 'industrial', 'office']) this.filled[k] = c[k] * fill;
    e.labour = labour; e.employed = employed; e.unemployment = unemployment; e.jobOpenings = openings;
    e.jobs = Math.round(jobsTotal);

    // -- housing
    const vacancy = Math.max(0, c.residential - pop);
    const vacancyRatio = c.residential > 0 ? vacancy / c.residential : 0;
    e.housingVacancy = vacancy;

    // -- attractiveness / desire to move in (0..1)
    const jobPull = clamp01(openings / Math.max(40, labour * 0.6));
    const desire = clamp01(0.32 + 0.75 * jobPull + 0.6 * (e.happiness - 0.5) - 0.9 * Math.max(0, unemployment - 0.05) + (pop < 400 ? 0.25 : 0) - 0.3 * e.pollutionExposure);
    e.attractiveness = desire;

    // -- demand targets (RCI): "how much more of this zone the city wants". Businesses plan for the city the
    //    growth trend promises (lookahead), so a healthy growing city keeps 25-60 % demand instead of 0/100 pulses.
    const small = pop < 300;
    const size = clamp01(pop / 40000);
    const ahead = pop * (1 + T.lookahead) + T.lookaheadPop;
    // job needs sum to ~ the labour share (0.55): industry dominates a young city, offices a metropolis
    const need = {
      commercial: ahead * 0.20 + 12,
      industrial: ahead * (0.24 - 0.09 * size) + 16,
      office: ahead * (0.04 + 0.13 * size) + 4,
    };
    let dR = desire * clamp01(1 - vacancyRatio * 4) * (0.35 + 0.65 * utilities);
    if (small) dR = Math.max(dR, 0.62 - vacancyRatio * 0.5);
    const shortage = (k) => clamp01((need[k] - c[k]) / Math.max(need[k] * 0.8, 20));
    const unemp = clamp01((unemployment - 0.04) * 3);
    const bizFloor = 0.06 * desire;    // speculative interest even when the market is balanced
    const tgt = this._target;
    tgt.residential = clamp01(dR);
    tgt.commercial = clamp01(shortage('commercial') * 0.9 + unemp * 0.3 + bizFloor);
    tgt.industrial = clamp01(shortage('industrial') * 0.9 + unemp * 0.45 + (small ? 0.12 : 0) + bizFloor);
    tgt.office = clamp01(shortage('office') * (pop < 600 ? 0.25 : 0.85) + unemp * 0.2 + bizFloor * (pop < 600 ? 0.2 : 1));
    const kD = 1 - Math.exp(-dtDay / T.demandTau);
    const d = e.demand;
    for (const k of ZONE_TYPES) d[k] += (tgt[k] - d[k]) * kD;

    // -- population flow
    const noise = 0.85 + 0.3 * rng.float();
    const moveIn = Math.min(vacancy, 80 + pop * 0.09) * desire * T.moveInRate * noise * (0.5 + 0.5 * utilities);
    const moveOut = pop * (T.moveOutBase + 0.09 * Math.max(0, unemployment - 0.08) + 0.08 * Math.max(0, 0.42 - e.happiness) + 0.02 * (1 - utilities));
    const natural = pop * T.birthRate;
    let overflow = 0;
    if (pop > c.residential) overflow = (pop - c.residential) * 0.5;   // demolished housing: people leave quickly
    let np = pop + (moveIn - moveOut + natural - overflow) * dtDay;
    if (np < 0) np = 0;
    e.populationF = np;
    e.population = Math.round(np);
    e.households = Math.round(np / 2.4);

    // -- money (¢ per day, integrated per tick)
    const taxK = e.taxRate / 0.1;
    const resTax = np * T.taxPerCapita * taxK;
    const bizTax = employed * T.taxPerJob * taxK;
    const connection = this.roadKm.highway > 0 ? 1 : 0.6;   // outside connections: highways carry exports
    const trade = (this.filled.industrial * T.tradePerIndustrialJob + this.filled.commercial * T.tradePerCommercialJob) * connection;
    const roads = this.roadUpkeep;
    let bld = 0;
    for (const k of ZONE_TYPES) bld += this.buildingCount[k] * T.buildingUpkeep[k];
    const services = np * T.servicePerCapita + employed * T.servicePerJob;
    const admin = this.buildings.size > 0 || np > 0 ? T.adminFixed : T.adminFixed * 0.25;
    const loans = this._serviceLoans(dtDay);
    e.incomeBreakdown.residentialTax = resTax; e.incomeBreakdown.businessTax = bizTax; e.incomeBreakdown.trade = trade;
    e.expenseBreakdown.roads = roads; e.expenseBreakdown.buildings = bld; e.expenseBreakdown.services = services; e.expenseBreakdown.admin = admin; e.expenseBreakdown.loans = loans;
    e.income = resTax + bizTax + trade;
    e.expenses = roads + bld + services + admin + loans;
    e.net = e.income - e.expenses;
    e.money += (e.income - (roads + bld + services + admin)) * dtDay;   // loan payments were already deducted

    // -- happiness (smoothed toward a target)
    const taxPain = (e.taxRate - 0.1) * 2.6;
    const debt = e.money < 0 ? clamp01(-e.money / 200000) * 0.25 : 0;
    const jobsJoy = 0.16 * (1 - clamp01(unemployment * 2.5));
    const crowd = -0.1 * clamp01(1 - vacancyRatio * 10) * (pop > 50 ? 1 : 0);   // no housing slack at all
    const balance = jobsTotal > 0 ? clamp01(1 - Math.abs(jobsTotal - labour) / Math.max(labour, 1)) : 0;
    let civic = 0;
    if (svActive) civic = 0.10 * sv.education + 0.08 * sv.health + 0.06 * sv.parks + 0.06 * sv.police + 0.04 * sv.fire - 0.14 * (1 - sv.power) - 0.14 * (1 - sv.water) - 0.05 * (1 - sv.garbage) - 0.02;
    const hTarget = clamp01(0.55 + jobsJoy - taxPain - debt + crowd + 0.1 * balance + civic - 0.22 * e.pollutionExposure + (this.econ.roadKm > 0 ? 0.03 : 0));
    const kH = 1 - Math.exp(-dtDay / T.happinessTau);
    e.happiness += (hTarget - e.happiness) * kH;
    e.landValue = clamp01(0.25 + 0.4 * e.happiness + 0.2 * clamp01(np / 20000) - 0.3 * clamp01(this.roadKm.highway * 0.02) - 0.2 * e.pollutionExposure);

    // -- milestones
    this._milestones(e);

    // -- growth requests (consumer decides what to do with them)
    this.requests.length = 0;
    const perTick = T.growthPerHour / TICKS_PER_HOUR * (0.25 + 0.75 * utilities);
    for (const k of ZONE_TYPES) {
      const dem = d[k];
      if (dem < T.growthThreshold) { this._growthAcc[k] = Math.max(0, this._growthAcc[k] - perTick * 0.5); continue; }
      const drive = Math.pow(clamp01((dem - T.growthThreshold) / (1 - T.growthThreshold)), 1.4);
      this._growthAcc[k] += perTick * drive * (0.7 + 0.6 * rng.float());
      while (this._growthAcc[k] >= 1) {
        this._growthAcc[k] -= 1;
        const req = this._reqPool[this.requests.length] || (this._reqPool[this.requests.length] = { type: k, density: 'low', demand: 0 });
        req.type = k; req.demand = dem;
        // higher density when the city is big and land is valuable
        const hp = clamp01((np - 1500) / 12000) * 0.5 + e.landValue * 0.4;
        req.density = rng.float() < hp ? 'high' : 'low';
        this.requests.push(req);
        e.growthRequests++;
      }
    }

    // -- level-ups: once a game hour, well-occupied buildings in a happy city may level up
    this.levelups.length = 0;
    if (this.tick % TICKS_PER_HOUR === 37 && e.happiness > 0.6 && this.buildings.size) {
      const fillRes = c.residential > 0 ? clamp01(np / c.residential) : 0;
      for (const r of this.buildings.values()) {
        const f = r.type === 'residential' ? fillRes : fill;
        if (r.level >= 5 || f <= 0.88) continue;
        if (svActive && (r.power < 0.5 || r.water < 0.5)) continue;          // no utilities, no growth
        const q = 0.015 * (e.happiness - 0.5) * 2 * (0.6 + 0.8 * r.landValue) * (1 - 0.6 * r.pollution);
        if (rng.float() < q) this.levelups.push(r.id);
      }
    }

    // -- per-building occupancy every 20 ticks or when the stock changed
    if (this._occupancyDirty || this.tick % 20 === 0) this.distribute();

    // -- history
    if (this.tick % FINE_EVERY === 0) {
      const f = this._fineBuf;
      f[0] = np; f[1] = e.money; f[2] = jobsTotal; f[3] = employed; f[4] = e.happiness;
      f[5] = d.residential; f[6] = d.commercial; f[7] = d.industrial; f[8] = d.office; f[9] = e.income; f[10] = e.expenses;
      this.fine.push(f);
    }
    if (this.tick % TICKS_PER_DAY === 0) {
      const h = e.history;
      h.push({ day: e.day - 1, money: Math.round(e.money), population: e.population, jobs: e.jobs, employed: Math.round(employed), happiness: +e.happiness.toFixed(3), income: Math.round(e.income), expenses: Math.round(e.expenses), landValue: +e.landValue.toFixed(3) });
      if (h.length > DAILY_MAX) h.splice(0, h.length - DAILY_MAX);
    }
  }

  _milestones(e) {
    const m = e.milestone;
    let lvl = m.level;
    while (lvl + 1 < MILESTONES.length && e.population >= MILESTONES[lvl + 1].pop) {
      lvl++;
      const ms = MILESTONES[lvl];
      e.money += ms.reward;
      for (const u of ms.unlocks) if (!m.unlocked.includes(u)) m.unlocked.push(u);
      this.events.push({ type: 'milestone', level: lvl, name: ms.name, unlocks: ms.unlocks, reward: ms.reward, population: e.population });
    }
    if (lvl !== m.level) { m.level = lvl; m.name = MILESTONES[lvl].name; e.loanCapacity = TUNING.loanMax[Math.min(lvl, TUNING.loanMax.length - 1)]; }
    const nxt = MILESTONES[lvl + 1];
    m.next = nxt ? nxt.name : null; m.nextPop = nxt ? nxt.pop : MILESTONES[lvl].pop;
    m.progress = nxt ? clamp01((e.population - MILESTONES[lvl].pop) / Math.max(1, nxt.pop - MILESTONES[lvl].pop)) : 1;
  }

  // ---------------------------------------------------------------- services, grids, per-building levels
  /** Grids + per-building service levels. Stateless given (stock, env, happiness) so a reload reproduces it exactly. */
  _refreshEnvironment(happiness) {
    const e = this.econ, env = this.env, sv = this.services;
    const active = !!env.servicesActive();
    e.servicesActive = active;
    this._refreshHappiness = happiness;
    this.grids.update(this.buildings, env, happiness);
    const g = this.grids;
    let n = 0, sum = { education: 0, health: 0, police: 0, fire: 0, parks: 0, power: 0, water: 0, garbage: 0 };
    let resN = 0, resPol = 0;
    for (const r of this.buildings.values()) {
      const has = r.x === r.x && r.z === r.z;   // not NaN
      if (has) {
        r.pollution = clamp01(g.sample(g.ground, r.x, r.z) * 0.6 + g.sample(g.air, r.x, r.z) * 0.6);
        r.noise = g.sample(g.noise, r.x, r.z);
        r.landValue = g.sample(g.landValue, r.x, r.z);
      } else { r.pollution = 0; r.noise = 0; r.landValue = e.landValue; }
      if (active && has) {
        r.education = clamp01(env.coverage('school', r.x, r.z) * 0.5 + env.coverage('high_school', r.x, r.z) * 0.3 + env.coverage('university', r.x, r.z) * 0.2);
        r.health = clamp01(env.coverage('clinic', r.x, r.z) * 0.6 + env.coverage('hospital', r.x, r.z) * 0.6);
        const police = clamp01(env.coverage('police', r.x, r.z));
        r.crime = clamp01(0.35 * (1 - police) + 0.25 * (1 - e.happiness) + 0.15 * (r.density === 'high' ? 1 : 0) - 0.2 * police);
        const fire = clamp01(env.coverage('fire', r.x, r.z));
        r.fireRisk = clamp01(0.3 * (1 - fire) + (r.type === 'industrial' ? 0.25 : 0.05) + 0.03 * r.level);
        r.parks = clamp01(env.coverage('park_small', r.x, r.z) * 0.6 + env.coverage('park_large', r.x, r.z) * 0.7 + env.coverage('plaza', r.x, r.z) * 0.4);
        r.power = clamp01(env.coverage('power', r.x, r.z)); r.water = clamp01(env.coverage('water', r.x, r.z));
        const garbage = clamp01(env.coverage('garbage', r.x, r.z));
        sum.education += r.education; sum.health += r.health; sum.police += police; sum.fire += fire; sum.parks += r.parks; sum.power += r.power; sum.water += r.water; sum.garbage += garbage;
        n++;
      } else if (!active) { r.education = 0; r.health = 0; r.crime = clamp01(0.3 * (1 - e.happiness)); r.fireRisk = r.type === 'industrial' ? 0.3 : 0.1; r.parks = 0; r.power = 1; r.water = 1; }
      if (r.type === 'residential') { resN++; resPol += r.pollution; }
    }
    if (active && n) for (const k of SERVICE_KEYS) sv[k] = sum[k] / n;
    else for (const k of SERVICE_KEYS) sv[k] = k === 'power' || k === 'water' || k === 'garbage' ? 1 : 0;
    e.pollutionExposure = resN ? resPol / resN : 0;
  }

  /** Spread population / filled jobs over the building records (rounded, deterministic). */
  distribute() {
    this._occupancyDirty = false;
    const e = this.econ, c = this.capacity;
    const fillRes = c.residential > 0 ? clamp01(e.populationF / c.residential) : 0;
    const jobsTotal = c.commercial + c.industrial + c.office;
    const fillJob = jobsTotal > 0 ? clamp01(e.employed / (jobsTotal + TUNING.outsideJobs)) : 0;
    for (const r of this.buildings.values()) {
      if (r.type === 'residential') { r.occupants = Math.round(r.capacity * fillRes); r.jobs = 0; }
      else { r.occupants = 0; r.jobs = Math.round(r.capacity * fillJob); }
    }
  }

  // ---------------------------------------------------------------- money helpers
  canAfford(amount) { return this.econ.money >= amount; }
  /** Deduct money; returns false (and does nothing) when unaffordable unless force. */
  spend(amount, force = false) {
    if (!(amount >= 0)) return false;
    if (!force && this.econ.money < amount) return false;
    this.econ.money -= amount; return true;
  }
  earn(amount) { if (amount > 0) this.econ.money += amount; }

  // ---------------------------------------------------------------- loans
  /** Borrow `amount` over `days`; returns the loan record or null (limit: 3 loans, milestone-based capacity). */
  takeLoan(amount, days = 30) {
    const e = this.econ;
    amount = Math.round(+amount || 0); days = clamp(days | 0 || 30, 5, 365);
    if (amount <= 0 || e.loans.length >= 3) return null;
    let outstanding = 0; for (const l of e.loans) outstanding += l.remaining;
    if (outstanding + amount > e.loanCapacity) return null;
    const total = amount * (1 + TUNING.loanRate);
    const loan = { id: this._nextLoanId++, principal: amount, remaining: total, dailyPayment: total / days, daysLeft: days, day: e.day };
    e.loans.push(loan); e.money += amount;
    this.events.push({ type: 'loan', id: loan.id, amount });
    return loan;
  }
  repayLoan(id) {
    const e = this.econ; const i = e.loans.findIndex((l) => l.id === id);
    if (i < 0 || e.money < e.loans[i].remaining) return false;
    e.money -= e.loans[i].remaining; e.loans.splice(i, 1); return true;
  }
  _serviceLoans(dtDay) {
    const e = this.econ; let perDay = 0;
    for (let i = e.loans.length - 1; i >= 0; i--) {
      const l = e.loans[i];
      const pay = Math.min(l.remaining, l.dailyPayment * dtDay);
      e.money -= pay; l.remaining -= pay; l.daysLeft -= dtDay; perDay += l.dailyPayment;
      if (l.remaining <= 1e-6) { e.loans.splice(i, 1); this.events.push({ type: 'loan_paid', id: l.id }); }
    }
    return perDay;
  }

  // ---------------------------------------------------------------- persistence
  serialize() {
    const e = this.econ, r = this.rng;
    return {
      version: 2, tick: this.tick,
      rng: [r.a, r.b, r.c, r.d],
      econ: {
        money: e.money, populationF: e.populationF, happiness: e.happiness, taxRate: e.taxRate,
        demand: { ...e.demand }, growthRequests: e.growthRequests, levelUps: e.levelUps,
        milestone: { level: e.milestone.level, unlocked: e.milestone.unlocked.slice() },
        loans: e.loans.map((l) => ({ ...l })), nextLoanId: this._nextLoanId, pollutionExposure: e.pollutionExposure, refreshHappiness: this._refreshHappiness,
      },
      target: { ...this._target }, growthAcc: { ...this._growthAcc },
      roadKm: { ...this.roadKm },
      buildings: [...this.buildings.values()].map((b) => ({ id: b.id, type: b.type, density: b.density, level: b.level, capacity: b.capacity, virtual: b.virtual, x: b.x === b.x ? b.x : null, z: b.z === b.z ? b.z : null })),
      history: e.history.map((h) => ({ ...h })),
      fine: this.fine.serialize(),
    };
  }
  deserialize(s) {
    if (!s || (s.version !== 1 && s.version !== 2)) throw new Error('economy: unsupported save');
    const e = this.econ, r = this.rng;
    this.reset(e);
    this.tick = s.tick | 0;
    [r.a, r.b, r.c, r.d] = s.rng.map((v) => v | 0);
    e.money = s.econ.money; e.populationF = s.econ.populationF; e.population = Math.round(e.populationF);
    e.happiness = s.econ.happiness; e.taxRate = s.econ.taxRate;
    for (const k of ZONE_TYPES) { e.demand[k] = s.econ.demand[k]; this._target[k] = s.target[k]; this._growthAcc[k] = s.growthAcc[k]; }
    e.growthRequests = s.econ.growthRequests | 0; e.levelUps = s.econ.levelUps | 0;
    e.pollutionExposure = s.econ.pollutionExposure || 0;
    if (s.econ.milestone) {
      const lvl = clamp(s.econ.milestone.level | 0, 0, MILESTONES.length - 1);
      e.milestone.level = lvl; e.milestone.name = MILESTONES[lvl].name; e.milestone.unlocked = (s.econ.milestone.unlocked || []).slice();
      e.loanCapacity = TUNING.loanMax[Math.min(lvl, TUNING.loanMax.length - 1)];
    }
    e.loans.length = 0; for (const l of s.econ.loans || []) e.loans.push({ ...l });
    this._nextLoanId = s.econ.nextLoanId | 0 || 1;
    this.buildings.clear();
    for (const b of s.buildings) this.setBuilding({ id: b.id, type: b.type, density: b.density, level: b.level, footprint: null, x: b.x ?? undefined, z: b.z ?? undefined }, !!b.virtual).capacity = b.capacity;
    for (const k in this.roadKm) this.roadKm[k] = s.roadKm[k] || 0;
    this.setRoadKm(this.roadKm);
    e.history.length = 0; for (const h of s.history) e.history.push({ ...h });
    this.fine.deserialize(s.fine);
    e.tick = this.tick; e.day = 1 + Math.floor(this.tick / TICKS_PER_DAY); e.hour = (this.tick % TICKS_PER_DAY) / TICKS_PER_HOUR;
    this._recount();
    this._milestones(e);
    this._refreshEnvironment(s.econ.refreshHappiness ?? e.happiness);
    e.pollutionExposure = s.econ.pollutionExposure || 0;
    this.distribute();
  }
}
