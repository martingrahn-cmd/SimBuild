// Builder probe for props r2. node shots/props/dev2/probe.mjs [camera] [time]
import { chromium } from 'playwright';
import fs from 'node:fs';

const CAM = process.argv[2] || 'avenue';
const TIME = process.argv[3] || '12';
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'].find((p) => fs.existsSync(p));
const browser = await chromium.launch({
  executablePath: exe, headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage', '--window-size=1280,720'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 400)); });
page.on('pageerror', (e) => errors.push(String(e).slice(0, 400)));
await page.goto(`http://127.0.0.1:5173/?showcase=props&headless=1&time=${TIME}&seed=1337&camera=${CAM}&speed=0`, { waitUntil: 'domcontentloaded', timeout: 240000 });
await page.waitForFunction(() => window.__sim && window.__sim.ready, null, { timeout: 240000 });

const out = await page.evaluate(async () => {
  const sim = window.__sim;
  const rec = sim.registry.get('props');
  const api = rec.api;
  const world = sim.world;
  const R = { };
  R.apiKeys = Object.keys(api).sort();
  R.missing = ['place', 'remove', 'at', 'count', 'rebuild', 'stats', 'lampsFor', 'signals', 'signalFor', 'stops', 'setDensity', 'cropRects', 'serialize', 'deserialize', 'debug'].filter((k) => typeof api[k] !== 'function' && typeof api[k] !== 'object');
  R.kinds = world.props.kinds.slice();
  R.stats = api.stats();
  R.lodHistogram = api.debug.lodHistogram();
  R.cropRects = sim.cropRects();

  // lights inside the props group
  let lights = 0; const lightKinds = [];
  rec.group.traverse((o) => { if (o.isLight) { lights++; lightKinds.push(o.type); } });
  R.lights = lights; R.lightKinds = lightKinds;

  // budget: draws/tris attributable to props
  const before = sim.stats();
  rec.group.visible = false;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const off = sim.stats();
  rec.group.visible = true;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const on = sim.stats();
  R.budget = { onDraws: on.drawCalls, offDraws: off.drawCalls, propsDraws: on.drawCalls - off.drawCalls,
               onTris: on.triangles, offTris: off.triangles, propsTris: on.triangles - off.triangles };

  // ground / asphalt / water / overlap audit over every item
  const T = world.terrain, RD = world.roads;
  const radii = R.stats.radii;
  const items = [...world.props.items.values()];
  R.itemCount = items.length;
  const SIDEWALK = new Set(['bench', 'bin', 'hydrant', 'sign', 'bus_stop']);
  let groundBad = 0, worstGround = 0, worstItem = null;
  for (const it of items) {
    let gy;
    if ((SIDEWALK.has(it.kind) || it.kind === 'streetlamp' || it.kind === 'trafficlight') && it.edgeId !== undefined) {
      if (it.kind === 'streetlamp') { gy = it.y; }
      else { const lc = RD.laneCenter(it.edgeId, 0, it.t ?? 0.5); gy = lc ? lc.y + 0.21 : it.y; }
    } else gy = T.getHeight(it.x, it.z);
    const d = Math.abs(it.y - gy);
    if (d > 0.05) { groundBad++; if (d > worstGround) { worstGround = d; worstItem = { kind: it.kind, x: +it.x.toFixed(1), z: +it.z.toFixed(1), d: +d.toFixed(3) }; } }
  }
  R.ground = { bad: groundBad, worst: +worstGround.toFixed(3), worstItem, pct: +(100 * (1 - groundBad / items.length)).toFixed(2) };

  const NOASP = new Set(['tree_oak', 'tree_pine', 'bush', 'fence', 'planter', 'bench', 'bin']);
  let onAsphalt = 0, inWater = 0;
  for (const it of items) {
    if (NOASP.has(it.kind) && RD.isRoad(it.x, it.z) === 1) onAsphalt++;
    if (T.isWater(it.x, it.z)) inWater++;
  }
  R.onAsphalt = onAsphalt; R.inWater = inWater;

  // pairwise footprint overlaps via a hash
  const cell = 6, grid = new Map();
  for (const it of items) {
    const k = `${Math.floor(it.x / cell)},${Math.floor(it.z / cell)}`;
    let a = grid.get(k); if (!a) { a = []; grid.set(k, a); } a.push(it);
  }
  let overlaps = 0; const ex = [];
  const seen = new Set();
  for (const it of items) {
    const ix = Math.floor(it.x / cell), iz = Math.floor(it.z / cell);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const a = grid.get(`${ix + dx},${iz + dz}`); if (!a) continue;
      for (const o of a) {
        if (o.id <= it.id) continue;
        if (it.kind === 'fence' && o.kind === 'fence') continue;
        if (it.kind === 'bus_stop' && o.kind === 'bus_stop') continue;
        if (it.group !== undefined && it.group === o.group) continue;
        const need = (radii[it.kind] || 0.4) * it.scale + (radii[o.kind] || 0.4) * o.scale;
        const d = Math.hypot(it.x - o.x, it.z - o.z);
        if (d < need - 1e-6) { overlaps++; if (ex.length < 6) ex.push({ a: it.kind, b: o.kind, d: +d.toFixed(2), need: +need.toFixed(2), x: +it.x.toFixed(1), z: +it.z.toFixed(1) }); }
      }
    }
  }
  R.overlaps = overlaps; R.overlapEx = ex;

  // lamp anchors
  const roads = rec.ctx.modules.roads;
  let matched = 0, total = 0, mism = 0, nearInt = 0;
  const inters = roads.intersections();
  for (const [id] of world.roads.edges) {
    const anchors = roads.lampPositions(id);
    const mine = api.lampsFor(id);
    total += anchors.length;
    if (anchors.length !== mine.length) mism++;
    for (const a of anchors) {
      if (mine.some((m) => Math.abs(m.x - a.x) < 0.05 && Math.abs(m.y - a.y) < 0.05 && Math.abs(m.z - a.z) < 0.05)) matched++;
    }
    for (const m of mine) for (const i of inters) if (Math.hypot(i.x - m.x, i.z - m.z) < 8) nearInt++;
  }
  R.lamps = { anchors: total, matched, edgesWithCountMismatch: mism, lampsWithin8mOfIntersection: nearInt };

  // trees: species/scale/heading stats over the 200 nearest to the camera target
  const cam = sim.camera.target;
  const trees = items.filter((i) => i.kind === 'tree_oak' || i.kind === 'tree_pine')
    .map((i) => ({ i, d: Math.hypot(i.x - cam.x, i.z - cam.z) })).sort((a, b) => a.d - b.d).slice(0, 200).map((e) => e.i);
  const bySp = {};
  for (const t of trees) bySp[t.species || '(none)'] = (bySp[t.species || '(none)'] || 0) + 1;
  const sc = trees.map((t) => t.scale);
  const mean = sc.reduce((a, b) => a + b, 0) / Math.max(1, sc.length);
  const std = Math.sqrt(sc.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, sc.length));
  const buckets = new Array(12).fill(0);
  for (const t of trees) buckets[Math.min(11, Math.floor(((t.heading % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2) * 12))]++;
  let dup = 0;
  for (let a = 0; a < trees.length; a++) for (let b = a + 1; b < trees.length; b++) {
    const A = trees[a], B = trees[b];
    if (Math.hypot(A.x - B.x, A.z - B.z) > 12) continue;
    if (A.species === B.species && Math.round(A.scale / 0.05) === Math.round(B.scale / 0.05)
      && Math.round(A.heading * 180 / Math.PI / 5) === Math.round(B.heading * 180 / Math.PI / 5)) dup++;
  }
  R.trees = { n: trees.length, bySpecies: bySp, scale: { min: +Math.min(...sc).toFixed(2), max: +Math.max(...sc).toFixed(2), mean: +mean.toFixed(3), std: +std.toFixed(3) },
              headingMaxBucketPct: +(100 * Math.max(...buckets) / trees.length).toFixed(1), dupTriples: dup };

  // forest nearest-neighbour histogram
  const forest = items.filter((i) => (i.kind === 'tree_oak' || i.kind === 'tree_pine') && i.edgeId === undefined);
  const sample = forest.slice(0, 600);
  const fg = new Map();
  for (const t of forest) { const k = `${Math.floor(t.x / 12)},${Math.floor(t.z / 12)}`; let a = fg.get(k); if (!a) { a = []; fg.set(k, a); } a.push(t); }
  const nns = [];
  for (const t of sample) {
    let best = 1e9;
    const ix = Math.floor(t.x / 12), iz = Math.floor(t.z / 12);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const a = fg.get(`${ix + dx},${iz + dz}`); if (!a) continue;
      for (const o of a) { if (o === t) continue; const d = Math.hypot(o.x - t.x, o.z - t.z); if (d < best) best = d; }
    }
    if (best < 60) nns.push(best);
  }
  const hist = new Array(16).fill(0);
  for (const d of nns) hist[Math.min(15, Math.floor(d))]++;
  R.forest = { n: forest.length, sampled: nns.length, meanNN: +(nns.reduce((a, b) => a + b, 0) / Math.max(1, nns.length)).toFixed(2),
               maxBinPct: +(100 * Math.max(...hist) / Math.max(1, nns.length)).toFixed(1), hist };

  // street tree spacing
  const st = items.filter((i) => (i.kind === 'tree_oak' || i.kind === 'tree_pine') && i.edgeId !== undefined);
  R.streetTrees = st.length;

  // signals (props clock)
  R.signals = api.signals().slice(0, 3);
  R.signalCount = api.signals().length;
  const a0 = api.signals()[0];
  R.signalFor = a0 ? api.signalFor(a0.armStates[0].edgeId, a0.armStates[0].atA) : null;

  // determinism of the props clock: same hour -> same phase, half a cycle -> different
  sim.setTime(12.0); const p1 = api.signals()[0]?.phase;
  sim.setTime(18.0); const p2 = api.signals()[0]?.phase;
  sim.setTime(12.0); const p3 = api.signals()[0]?.phase;
  sim.setTime(12 + 30 / 3600); const p4 = api.signals()[0]?.phase;
  sim.setTime(12.0);
  R.phase = { at12: p1, at18: p2, back12: p3, halfCycle: p4 };

  // traffic handover
  const arm = api.signals()[0]?.armStates[0];
  const s0 = api.stats();
  rec.ctx.modules.traffic = { signalState: () => ({ phase: 3, greenArms: [arm.edgeId], since: 0, cycle: 60 }) };
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const h = api.signals()[0];
  const s1 = api.stats();
  R.handover = { source: h.source, phase: h.phase, greenArms: h.greenArms, armStates: h.armStates.slice(0, 2), drawsSame: s0.draws === s1.draws, trisSame: s0.tris === s1.tris };
  delete rec.ctx.modules.traffic;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  R.handbackSource = api.signals()[0].source;

  // update() cost: 30 samples
  const samples = [];
  for (let i = 0; i < 30; i++) {
    const t0 = performance.now();
    rec.def.update(1 / 60, rec.ctx);
    samples.push(performance.now() - t0);
  }
  samples.sort((a, b) => a - b);
  R.updateMs = { median: +samples[15].toFixed(3), max: +samples[29].toFixed(3) };

  // idempotence + determinism
  const q0 = api.stats();
  const t0 = performance.now();
  api.rebuild();
  R.rebuildMs = +(performance.now() - t0).toFixed(1);
  const q1 = api.stats();
  R.idempotent = { items: q0.items === q1.items, instances: q0.instances === q1.instances, tris: q0.tris === q1.tris, chunks: q0.chunks === q1.chunks };
  const ser = api.serialize();
  R.serialize = { version: ser.version, items: ser.items.length, sample: ser.items[0] };

  // item 23: place() cost
  const t2 = performance.now();
  let got = null;
  const off2 = rec.ctx.events.on('props:changed', (p) => { got = p; }, 'probe');
  const nid = api.place('bench', 60, 60);
  const placeMs = performance.now() - t2;
  R.place = { id: nid, ms: +placeMs.toFixed(1), inItems: world.props.items.has(nid), event: got };
  if (nid > 0) api.remove(nid);

  R.poolAxis = api.debug.poolAxis().slice(0, 4);
  R.stopsCount = api.stops().length;
  R.stats2 = api.stats();
  return R;
});
out.consoleErrors = errors;
console.log(JSON.stringify(out, null, 1));
fs.writeFileSync(`shots/props/dev2/probe_${CAM}_${TIME}.json`, JSON.stringify(out, null, 1));
await browser.close();
