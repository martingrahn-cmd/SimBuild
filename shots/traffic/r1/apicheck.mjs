// Critic probe for the traffic module, round 1.
// node shots/traffic/r1/apicheck.mjs   (dev server must be on 127.0.0.1:5173)
import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:5173/?showcase=traffic&headless=1&time=12&seed=1337&w=960&h=540';

const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
});
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE-ERROR:', m.text().slice(0, 300)); });
await p.goto(URL, { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.__sim && window.__sim.ready, null, { timeout: 300000 });
await p.waitForTimeout(2500);

const out = await p.evaluate(() => {
  const S = window.__sim;
  const api = S.registry.apis.traffic;
  const W = S.world;
  const R = W.roads;
  const r = { errors: S.errors.slice(0, 10), warnings: S.warnings.slice(0, 10) };

  // ---- api surface (spec section 2)
  const need = ['spawnVehicle', 'despawn', 'flowGrid', 'outsideConnections', 'signalState', 'signals',
    'vehicle', 'setDensity', 'density', 'stats', 'forceLod', 'step', 'freeze', 'debug', 'cropRects',
    'serialize', 'deserialize'];
  r.apiPresent = {}; for (const k of need) r.apiPresent[k] = typeof api?.[k];
  r.apiExtra = Object.keys(api || {});

  // ---- world.traffic section
  r.sectionKeys = Object.keys(W.traffic || {});
  r.kinds = W.traffic?.kinds ?? null;
  r.statsKeys = Object.keys(W.traffic?.stats || {});
  r.stats = api?.stats ? api.stats() : null;

  // ---- module def (budget/deps) via registry
  const rec = S.registry.modules.get('traffic');
  r.status = rec?.status;
  r.initMs = rec?.initMs ?? null;

  // ---- vehicle record contract + item 1 (height) + item 4 (lane) + item 5 (gaps)
  const veh = [...W.traffic.vehicles.values()];
  r.vehCount = veh.length;
  r.pedCount = W.traffic.pedestrians.size;
  r.sampleVeh = veh[0] ? Object.keys(veh[0]) : null;
  r.samplePed = [...W.traffic.pedestrians.values()][0] ? Object.keys([...W.traffic.pedestrians.values()][0]) : null;

  let nullEdge = 0, hOk = 0, hN = 0, hWorst = 0, latOk35 = 0, latOk80 = 0, latN = 0, hdgOk = 0;
  const hs = [];
  for (const v of veh) {
    if (v.edgeId == null) { nullEdge++; continue; }
    const lc = R.laneCenter(v.edgeId, v.lane, v.t);
    if (!lc) continue;
    hN++;
    const d = Math.abs(v.y - (lc.y + 0.08));
    if (d <= 0.03) hOk++;
    if (d > hWorst) hWorst = d;
    if (hs.length < 6) hs.push(+(v.y - lc.y).toFixed(4));
    const lat = Math.hypot(v.x - lc.x, v.z - lc.z);
    latN++;
    if (lat <= 0.35) latOk35++;
    if (lat <= 0.8) latOk80++;
    const tan = Math.atan2(lc.tangent.x, -lc.tangent.z);
    let da = Math.abs(((v.heading - tan + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (Math.min(da, Math.PI - da) <= 0.20) hdgOk++;
  }
  r.item1 = { n: hN, pctWithinTol: hN ? +(100 * hOk / hN).toFixed(1) : null, worstErr: +hWorst.toFixed(3), yMinusLaneCenterY: hs };
  r.item4 = { n: latN, pctLat035: latN ? +(100 * latOk35 / latN).toFixed(1) : null, pctLat08: latN ? +(100 * latOk80 / latN).toFixed(1) : null, pctHdg: latN ? +(100 * hdgOk / latN).toFixed(1) : null };
  r.nullEdgePct = veh.length ? +(100 * nullEdge / veh.length).toFixed(1) : null;

  // speed field name check
  r.speedFieldMissing = veh.length ? veh.filter((v) => typeof v.speed !== 'number').length : null;
  r.lightsOnTypes = [...new Set(veh.map((v) => typeof v.lightsOn))];
  r.lightsOnValues = [...new Set(veh.map((v) => v.lightsOn))].slice(0, 5);

  // ---- pedestrians: item 9 band + record fields
  const peds = [...W.traffic.pedestrians.values()];
  let pOnEdge = 0, pNoEdge = 0, pBandOk = 0;
  const offs = [];
  for (const q of peds) {
    if (q.edgeId == null) { pNoEdge++; continue; }
    pOnEdge++;
    const s = R.sample(q.edgeId, q.t);
    if (!s) continue;
    const off = Math.hypot(q.x - s.x, q.z - s.z);
    offs.push(+off.toFixed(2));
    const e = R.edges.get(q.edgeId); const T = R.types[e.type];
    const want = T.asphaltHalf + T.sidewalk * 0.5;
    if (Math.abs(off - want) <= 0.6) pBandOk++;
  }
  r.item9 = { peds: peds.length, withEdgeId: pOnEdge, withoutEdgeId: pNoEdge, bandOk: pBandOk, offsets: offs.slice(0, 8) };
  r.pedPhaseRange = peds.length ? [Math.min(...peds.map((q) => q.phase)), Math.max(...peds.map((q) => q.phase))] : null;

  // ---- item 5: gaps on the same edge+lane
  const byLane = new Map();
  for (const v of veh) { if (v.edgeId == null) continue; const k = v.edgeId + ':' + v.lane; if (!byLane.has(k)) byLane.set(k, []); byLane.get(k).push(v); }
  let neg = 0, pairs = 0, minGap = 1e9;
  for (const [, arr] of byLane) {
    arr.sort((a, c) => a.t - c.t);
    for (let i = 0; i + 1 < arr.length; i++) {
      const a = arr[i], c = arr[i + 1];
      const d = Math.hypot(a.x - c.x, a.z - c.z) - (a.len || 4.5) * 0.5 - (c.len || 4.5) * 0.5;
      pairs++; if (d < 0) neg++; if (d < minGap) minGap = d;
    }
  }
  r.item5 = { pairs, negativeGaps: neg, minGap: +minGap.toFixed(2) };

  // ---- item 6/18: signals
  const ints = S.registry.apis.roads?.intersections?.() || [];
  r.intersections = ints.length;
  r.signalised = ints.filter((n) => n.arms.length >= 3 && !n.roundabout).length;
  r.roundabouts = ints.filter((n) => n.roundabout).length;
  r.signalStateFn = typeof api?.signalState;
  r.signalsSample = api?.signals ? api.signals().slice(0, 2) : null;
  r.lightStateSample = api?.lightState ? api.lightState(ints.find((n) => n.arms.length >= 3)?.id) : 'no lightState';

  // ---- item 12: instances near origin / counts
  const grp = S.registry.get('traffic')?.group;
  const meshes = [];
  let nearOrigin = 0;
  if (grp) grp.traverse((o) => {
    if (o.isInstancedMesh) {
      meshes.push({ name: o.name, count: o.count, cap: o.instanceMatrix.count, tris: (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3, cast: o.castShadow, recv: o.receiveShadow, layers: o.layers.mask, ro: o.renderOrder });
      const a = o.instanceMatrix.array;
      for (let i = 0; i < o.count; i++) { const x = a[i * 16 + 12], y = a[i * 16 + 13], z = a[i * 16 + 14]; if (Math.hypot(x, z) < 5 && y > -100) nearOrigin++; }
    }
  });
  r.meshes = meshes;
  r.nearOrigin = nearOrigin;
  r.drawsOwn = meshes.filter((m) => m.count > 0).length;
  r.trisOwnAuthored = meshes.reduce((s, m) => s + m.tris, 0);

  // ---- item 15: outside connections
  r.outside = api?.outsideConnections ? api.outsideConnections() : null;

  // ---- item 18: flowGrid shape
  try { const fg = api.flowGrid(); r.flowGrid = fg ? { keys: Object.keys(fg), size: fg.size, cellSize: fg.cellSize, hasCongestion: fg.congestion instanceof Float32Array, hasIndex: typeof fg.index, hasSample: typeof fg.sample } : null; } catch (e) { r.flowGrid = 'threw: ' + e.message; }

  // ---- spawnVehicle contract
  try { r.spawnReturn = api.spawnVehicle('bus', [[...R.edges.keys()][0]]); } catch (e) { r.spawnReturn = 'threw: ' + e.message; }

  // ---- cropRects
  r.cropRects = S.cropRects();

  return r;
});

// second pass: does the fleet move at speed 0? and does the phase repeat?
const motion = await p.evaluate(async () => {
  const S = window.__sim; const W = S.world;
  const snap = () => [...W.traffic.vehicles.values()].slice(0, 25).map((v) => ({ id: v.id, x: v.x, z: v.z, s: v.s }));
  const a = snap();
  await new Promise((r) => setTimeout(r, 1500));
  const b = snap();
  let moved = 0, maxJump = 0;
  for (const q of b) { const o = a.find((k) => k.id === q.id); if (!o) continue; const d = Math.hypot(q.x - o.x, q.z - o.z); if (d > 0.05) moved++; if (d > maxJump) maxJump = d; }
  return { compared: b.length, moved, maxJump: +maxJump.toFixed(2), speed: W.time.speed, paused: W.time.paused };
});

// density by hour (item 8)
const density = {};
for (const h of [6.5, 12, 17.5, 22]) {
  density[h] = await p.evaluate(async (hh) => {
    window.__sim.setTime(hh);
    await new Promise((r) => setTimeout(r, 3000));
    const W = window.__sim.world;
    const api = window.__sim.registry.apis.traffic;
    const veh = [...W.traffic.vehicles.values()];
    const byKind = {}; for (const v of veh) byKind[v.kind] = (byKind[v.kind] || 0) + 1;
    return { hour: W.time.hour, vehicles: veh.length, peds: W.traffic.pedestrians.size, byKind, lightsOn: veh.length ? veh.filter((v) => v.lightsOn > 0.5).length : 0, stats: api.stats() };
  }, h);
}

console.log(JSON.stringify({ api: out, motion, density }, null, 1));
await b.close();
