// Throwaway API-contract check for the simulation module (critic r1). Not part of the build.
import { chromium } from 'playwright';

const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'];
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE = 'http://127.0.0.1:5173/?showcase=simulation&headless=1&time=12';

async function open(url) {
  const browser = await chromium.launch({ executablePath: EXE, args: ARGS });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__sim && window.__sim.ready, null, { timeout: 120000 });
  return { browser, page, errors };
}

const probe = () => {
  const sim = window.__sim;
  const w = sim.world, e = w.economy;
  const A = sim.registry.apis.simulation;
  const out = { status: sim.modulesStatus().simulation, hasApi: !!A, keys: A ? Object.keys(A) : [] };
  A.setSimSpeed(0);   // freeze the frame-driven ticking so the probe is deterministic
  const snap = () => JSON.stringify({ money: e.money, pop: e.populationF, jobs: e.jobs, happy: e.happiness, demand: e.demand, tick: e.tick, hist: e.history.length, ms: e.milestone.level });
  out.s0 = snap();
  // events
  let ticks = 0, demands = 0, badDemand = false;
  const offT = sim.events.on('sim:tick', (p) => { ticks++; if (!p || typeof p.tick !== 'number' || !p.economy) badDemand = true; }, 'critic');
  const offD = sim.events.on('sim:demand', (p) => { demands++; for (const k of ['residential', 'commercial', 'industrial', 'office']) if (!(p[k] >= 0 && p[k] <= 1)) badDemand = true; }, 'critic');
  if (A) A.step(250);
  offT && offT(); offD && offD();
  out.ticksEmitted = ticks; out.demandsEmitted = demands; out.badPayload = badDemand;
  out.s1 = snap();
  // activity
  const act = [];
  for (let h = -3; h <= 27; h += 0.5) { const v = A ? A.activity(h) : NaN; act.push(v); }
  out.activityOk = act.every((v) => typeof v === 'number' && v >= 0 && v <= 1);
  out.activityDefault = A ? A.activity() : null;
  out.act = [0, 3, 8, 12, 17.5, 22].map((h) => +A.activity(h).toFixed(3));
  const prof = A.profile(12); out.profileKeys = Object.keys(prof);
  out.profileOk = Object.entries(prof).every(([k, v]) => k === 'hour' || (v >= 0 && v <= 1));
  // serialize/deserialize round trip
  const save = A.serialize();
  const saveJson = JSON.stringify(save);
  out.saveBytes = saveJson.length;
  A.step(500);
  const after500 = snap();
  const ok1 = A.deserialize(JSON.parse(saveJson));
  const back = snap();
  A.step(500);
  const after500b = snap();
  out.deserializeReturned = ok1;
  out.roundTripRestores = back === out.s1;
  out.roundTripReplays = after500 === after500b;
  const save2 = JSON.stringify(A.serialize());
  A.deserialize(JSON.parse(save2));
  out.idempotent = JSON.stringify(A.serialize()) === save2;
  // ownership: world.economy object identity + expected fields
  out.econFields = ['money', 'population', 'jobs', 'happiness', 'demand', 'taxRate', 'history', 'grids', 'milestone', 'loans'].filter((k) => !(k in e));
  out.gridsSize = e.grids && e.grids.size;
  out.landValueSample = A.landValueAt(0, 0);
  out.tickHz = { TICK_SECONDS: A.constants.TICK_SECONDS, TICKS_PER_DAY: A.constants.TICKS_PER_DAY };
  out.simSpeed = A.simSpeed();
  out.errorsInSim = sim.errors.length; out.warnings = sim.warnings.slice(0, 5);
  out.moduleStatus = sim.modulesStatus().simulation;
  out.tickAtReady = e.tick;
  return out;
};

// the 60-day pre-roll is the seed-dependent, wall-clock-independent part: compare its daily history
const seedSnap = () => { const e = window.__sim.world.economy; return JSON.stringify({ hist: e.history.slice(0, 60), ms: e.milestone.level, unlocked: e.milestone.unlocked }); };

const results = {};
{
  const { browser, page, errors } = await open(BASE + '&seed=1337');
  results.main = await page.evaluate(probe);
  results.mainErrors = errors;
  await browser.close();
}
{
  const { browser, page, errors } = await open(BASE + '&seed=1337');
  results.seedA = await page.evaluate(seedSnap);
  results.seedAErrors = errors;
  await browser.close();
}
{
  const { browser, page } = await open(BASE + '&seed=1337');
  results.seedA2 = await page.evaluate(seedSnap);
  await browser.close();
}
{
  const { browser, page } = await open(BASE + '&seed=42');
  results.seedB = await page.evaluate(seedSnap);
  await browser.close();
}
results.sameSeedIdentical = results.seedA === results.seedA2;
results.differentSeedDiffers = results.seedA !== results.seedB;
console.log(JSON.stringify(results, null, 2));
