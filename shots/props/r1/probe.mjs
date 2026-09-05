// Critic probe (throwaway) — props r1. Contract + placement + budget measurements.
import { chromium } from 'playwright';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
page.on('pageerror', (e) => errs.push('PAGEERROR ' + String(e).slice(0, 300)));
await page.goto('http://127.0.0.1:5173/?showcase=props&headless=1&time=12&seed=1337&speed=0', { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => window.__sim && window.__sim.ready === true, null, { timeout: 300000, polling: 200 });
await page.waitForTimeout(1200);

const out = await page.evaluate(() => {
  const s = window.__sim, w = s.world;
  const rec = s.registry.get('props');
  const api = rec?.api || {};
  const P = w.props, R = w.roads, T = w.terrain;
  const items = [...P.items.values()];
  const byKind = {};
  for (const it of items) byKind[it.kind] = (byKind[it.kind] || 0) + 1;

  const SPEC_API = ['place', 'remove', 'at', 'count', 'rebuild', 'stats', 'lampsFor', 'signals', 'signalFor',
    'stops', 'setDensity', 'cropRects', 'serialize', 'deserialize', 'debug'];
  const apiKeys = Object.keys(api);
  const missing = SPEC_API.filter((k) => !(k in api));
  const extra = apiKeys.filter((k) => !SPEC_API.includes(k));

  const FROZEN = ['streetlamp', 'trafficlight', 'tree_oak', 'tree_pine', 'bench', 'bin', 'hydrant', 'sign', 'bus_stop', 'fence', 'bush', 'planter'];
  const kindsOk = Array.isArray(P.kinds) && P.kinds.length === 12 && FROZEN.every((k, i) => P.kinds[i] === k);

  // ---- item 3: ground contact / illegal placement
  const RAD = { streetlamp: 0.25, trafficlight: 0.30, tree_oak: 0.60, tree_pine: 0.50, bench: 0.90, bin: 0.30, hydrant: 0.25, sign: 0.20, bus_stop: 2.20, fence: 0.20, bush: 0.70, planter: 0.60 };
  const SIDEWALK = new Set(['bench', 'bin', 'hydrant', 'sign', 'bus_stop']);
  let yBadTerrain = 0, onAsphalt = 0, inWater = 0, nChecked = 0;
  const yErr = [];
  const forbidOnAsphalt = new Set(['tree_oak', 'tree_pine', 'bush', 'fence', 'planter', 'bench', 'bin']);
  for (const it of items) {
    nChecked++;
    if (!SIDEWALK.has(it.kind) && it.kind !== 'streetlamp' && it.kind !== 'trafficlight') {
      const g = T.getHeight(it.x, it.z);
      const e = Math.abs(it.y - g);
      yErr.push(e);
      if (e > 0.05) yBadTerrain++;
    }
    if (forbidOnAsphalt.has(it.kind) && R.isRoad && R.isRoad(it.x, it.z) === 1) onAsphalt++;
    if (T.isWater(it.x, it.z)) inWater++;
  }
  yErr.sort((a, b) => a - b);
  const q = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : null);

  // ---- item 3d: pairwise footprint overlap (grid hash, skip fence-fence and bus_stop parts)
  const cell = 8; const grid = new Map();
  const cand = items.filter((i) => RAD[i.kind] !== undefined);
  for (const it of cand) {
    const k = `${Math.floor(it.x / cell)},${Math.floor(it.z / cell)}`;
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(it);
  }
  let overlaps = 0; const overlapEx = [];
  for (const it of cand) {
    const gx = Math.floor(it.x / cell), gz = Math.floor(it.z / cell);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      const arr = grid.get(`${gx + dx},${gz + dz}`); if (!arr) continue;
      for (const o of arr) {
        if (o.id <= it.id) continue;
        if (it.kind === 'fence' && o.kind === 'fence') continue;
        if (it.kind === 'bus_stop' && o.kind === 'bus_stop') continue;
        const ra = RAD[it.kind] * (it.scale || 1), rb = RAD[o.kind] * (o.scale || 1);
        const d = Math.hypot(it.x - o.x, it.z - o.z);
        if (d < ra + rb) { overlaps++; if (overlapEx.length < 6) overlapEx.push({ a: it.kind, b: o.kind, d: +d.toFixed(2), need: +(ra + rb).toFixed(2), x: +it.x.toFixed(1), z: +it.z.toFixed(1) }); }
      }
    }
  }

  // ---- item 2: species / heading / scale variety over 200 nearest trees to camera target
  const trees = items.filter((i) => i.kind.startsWith('tree_'));
  const cx = 40, cz = 40;
  const near = trees.map((t) => ({ t, d: Math.hypot(t.x - cx, t.z - cz) })).sort((a, b) => a.d - b.d).slice(0, 200).map((o) => o.t);
  const speciesSet = new Set(trees.map((t) => t.species || '(none)'));
  const headBuckets = new Array(12).fill(0);
  for (const t of near) { let h = ((t.heading % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); headBuckets[Math.floor(h / (Math.PI * 2 / 12))]++; }
  const scales = near.map((t) => t.scale || 1);
  const mS = scales.reduce((a, b) => a + b, 0) / (scales.length || 1);
  const sdS = Math.sqrt(scales.reduce((a, b) => a + (b - mS) ** 2, 0) / (scales.length || 1));
  // duplicate triple within 12 m
  let dupPairs = 0;
  for (let i = 0; i < near.length; i++) for (let j = i + 1; j < near.length; j++) {
    const a = near[i], b = near[j];
    if (Math.hypot(a.x - b.x, a.z - b.z) > 12) continue;
    if ((a.species || a.kind) === (b.species || b.kind)
      && Math.round((a.scale || 1) / 0.05) === Math.round((b.scale || 1) / 0.05)
      && Math.round(a.heading / (5 * Math.PI / 180)) === Math.round(b.heading / (5 * Math.PI / 180))) dupPairs++;
  }

  // ---- item 4a: lampsFor vs roads.lampPositions
  const roadsApi = s.registry.get('roads')?.api;
  let lampMatch = null;
  if (roadsApi?.lampPositions) {
    const edges = [...R.edges.values()].filter((e) => ['street', 'avenue', 'highway'].includes(e.type));
    let totalAnchors = 0, matched = 0;
    const lampItems = items.filter((i) => i.kind === 'streetlamp');
    for (const e of edges.slice(0, 40)) {
      const ps = roadsApi.lampPositions(e.id) || [];
      totalAnchors += ps.length;
      for (const p of ps) {
        if (lampItems.some((l) => Math.abs(l.x - p.x) < 0.05 && Math.abs(l.z - p.z) < 0.05 && Math.abs(l.y - p.y) < 0.05)) matched++;
      }
    }
    lampMatch = { edgesSampled: Math.min(40, edges.length), totalAnchors, matched, hasLampsFor: typeof api.lampsFor === 'function' };
  }

  // ---- item 4b intersection clearance
  let lampNearInt = 0;
  const ints = roadsApi?.intersections?.() || [];
  const lampItems = items.filter((i) => i.kind === 'streetlamp');
  for (const l of lampItems) for (const it of ints) { if (Math.hypot(l.x - it.x, l.z - it.z) < 8) { lampNearInt++; break; } }

  // ---- item 22: lights inside props group
  let lights = 0, lightKinds = [];
  rec?.group?.traverse((o) => { if (o.isLight) { lights++; lightKinds.push(o.type); } });

  // ---- budget: props-attributable draws/tris
  const st0 = s.stats();
  rec.group.visible = false;
  return { phase: 1, apiKeys, missing, extra, kinds: P.kinds, kindsOk, itemCount: items.length, byKind,
    ground: { nChecked, yBadTerrain, yP50: q(yErr, 0.5), yP99: q(yErr, 0.99), yMax: yErr[yErr.length - 1], onAsphalt, inWater },
    overlaps, overlapEx,
    species: [...speciesSet], speciesCount: speciesSet.size,
    heading: headBuckets.map((b) => +(100 * b / (near.length || 1)).toFixed(1)),
    scale: { mean: +mS.toFixed(3), std: +sdS.toFixed(3), min: +Math.min(...scales).toFixed(2), max: +Math.max(...scales).toFixed(2) },
    dupPairs, lampMatch, lampNearInt, intersections: ints.length,
    lights, lightKinds,
    statsBefore: { draws: st0.drawCalls, tris: st0.triangles },
    apiStats: api.stats?.(),
    version: P.version,
  };
});

await page.waitForTimeout(2500);
const budget = await page.evaluate(() => {
  const s = window.__sim; const rec = s.registry.get('props');
  const off = s.stats();
  rec.group.visible = true;
  return { off: { draws: off.drawCalls, tris: off.triangles } };
});
await page.waitForTimeout(2500);
const on = await page.evaluate(() => { const s = window.__sim; return { draws: s.stats().drawCalls, tris: s.stats().triangles }; });

// ---- update() cost: 30 samples
const upd = await page.evaluate(async () => {
  const s = window.__sim; const rec = s.registry.get('props');
  const mod = rec.mod || rec.module || rec.def || null;
  const samples = [];
  if (mod && typeof mod.update === 'function') {
    for (let i = 0; i < 30; i++) { const t = performance.now(); mod.update(0.016, rec.ctx); samples.push(performance.now() - t); }
  }
  samples.sort((a, b) => a - b);
  return { n: samples.length, median: +(samples[15] || 0).toFixed(3), max: +(samples[samples.length - 1] || 0).toFixed(3), keys: Object.keys(rec) };
});

// ---- item 10: signals + handover
const signals = await page.evaluate(async () => {
  const s = window.__sim; const rec = s.registry.get('props'); const api = rec.api;
  const r = { hasSignals: typeof api.signals === 'function', hasSignalFor: typeof api.signalFor === 'function' };
  if (r.hasSignals) r.sample = api.signals().slice(0, 3);
  // handover
  rec.ctx.modules.traffic = { signalState: () => ({ phase: 3, greenArms: ['e0'], since: 0, cycle: 60 }) };
  await new Promise((res) => setTimeout(res, 500));
  if (r.hasSignals) r.afterStub = api.signals().slice(0, 2);
  r.signalStateExported = typeof api.signalState === 'function';
  delete rec.ctx.modules.traffic;
  return r;
});

// ---- item 6f pool material + item 17 lamp opacity at 17.5 vs 22
const pools = await page.evaluate(async () => {
  const s = window.__sim; const rec = s.registry.get('props');
  const found = [];
  rec.group.traverse((o) => {
    if (o.isInstancedMesh && o.material && o.material.blending === 2 /* Additive */) {
      found.push({ name: o.name || o.type, count: o.count, depthWrite: o.material.depthWrite, blending: o.material.blending, polygonOffset: o.material.polygonOffset, pof: o.material.polygonOffsetFactor, renderOrder: o.renderOrder, opacity: o.material.opacity, visible: o.visible });
    }
  });
  return found;
});

const cropRects = await page.evaluate(() => {
  try { return window.__sim.cropRects ? window.__sim.cropRects() : 'no cropRects on __sim'; } catch (e) { return 'threw: ' + e.message; }
});

// determinism of phase from world.time
const det = await page.evaluate(async () => {
  const s = window.__sim; const rec = s.registry.get('props');
  const grab = () => { const m = []; rec.group.traverse((o) => { if (o.isPoints && o.geometry?.getAttribute('lensColor')) m.push(Array.from(o.geometry.getAttribute('lensColor').array.slice(0, 24))); }); return m; };
  s.setTime(12); await new Promise((r) => setTimeout(r, 600)); const a = JSON.stringify(grab());
  s.setTime(18); await new Promise((r) => setTimeout(r, 600));
  s.setTime(12); await new Promise((r) => setTimeout(r, 600)); const b = JSON.stringify(grab());
  return { sameAt12: a === b, len: a.length };
});

console.log(JSON.stringify({ out, budgetOff: budget.off, budgetOn: on, upd, signals, pools, cropRects, det, consoleErrors: errs }, null, 1));
await browser.close();
