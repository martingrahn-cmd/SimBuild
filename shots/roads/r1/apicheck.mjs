// Critic API-contract probe for the roads module (throwaway). Run: node shots/roads/r1/apicheck.mjs
import { chromium } from 'playwright';

const exe = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'];
const browser = await chromium.launch({ executablePath: exe, headless: true, args });
const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } });
const page = await ctx.newPage();
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + String(e).slice(0, 300)));

await page.goto('http://127.0.0.1:5173/?showcase=roads&headless=1&time=12', { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForFunction(() => window.__sim && window.__sim.ready === true, null, { timeout: 180000, polling: 100 });

const res = await page.evaluate(async () => {
  const s = window.__sim;
  const R = s.world.roads, T = s.world.terrain;
  const waitFrames = async (n) => { const f0 = s.engine.stats.frames; while (s.engine.stats.frames - f0 < n) await new Promise((r) => setTimeout(r, 50)); };
  const rec = s.registry.get('roads');
  const group = rec.group;
  const out = { status: s.registry.status().roads, checks: {}, notes: [] };
  const meshInfo = () => { let meshes = 0, tris = 0; group.traverse((o) => { if (o.isMesh) { meshes++; const g = o.geometry; tris += g.index ? g.index.count / 3 : g.attributes.position.count / 3; } }); return { meshes, tris }; };
  const m0 = meshInfo();
  out.initial = { nodes: R.nodes.size, edges: R.edges.size, version: R.version, ...m0, types: Object.keys(R.types) };

  // ---- events + version + addNode/addEdge -> geometry
  let changed = 0, payloads = [];
  s.events.on('roads:changed', (p) => { changed++; payloads.push(p); }, 'critic');
  const v0 = R.version;
  // far corner of the map, flat-ish land, far from other roads
  const a = R.addNode(-700, -700), b = R.addNode(-560, -700), c = R.addNode(-560, -560);
  const e1 = R.addEdge(a, b, 'street'), e2 = R.addEdge(b, c, 'avenue', { ctrl: { x: -560, z: -700 } });
  const nodeIdOk = Number.isFinite(a) && Number.isFinite(b) && a !== b;
  const edgeOk = e1 > 0 && e2 > 0 && R.edges.has(e1) && R.edges.has(e2);
  out.checks.addNodeEdge = nodeIdOk && edgeOk && R.nodes.get(a).edges.has(e1) && R.nodes.get(b).edges.has(e1) && R.nodes.get(b).edges.has(e2);
  out.checks.versionBumpOnAdd = R.version >= v0 + 2;
  out.checks.changedEmittedOnAdd = changed >= 2 && payloads.some((p) => p.added?.includes(e1));
  await waitFrames(4);
  const m1 = meshInfo();
  out.afterAdd = { version: R.version, changed, ...m1 };
  out.checks.geometryGrewOnAdd = m1.tris > m0.tris;

  // ---- sample()
  const E1 = R.edges.get(e1);
  const s0 = R.sample(e1, 0), s5 = R.sample(e1, 0.5), s1 = R.sample(e1, 1);
  const na = R.nodes.get(a), nb = R.nodes.get(b);
  const dist = (p, q) => Math.hypot(p.x - q.x, p.z - q.z);
  out.sample = { s0, s5, s1, edgeLength: E1.length, terrAt5: T.getHeight(s5.x, s5.z) };
  out.checks.sampleEndpoints = dist(s0, na) < 0.5 && dist(s1, nb) < 0.5;
  out.checks.sampleMidOnLine = Math.abs(s5.z - (-700)) < 0.05 && Math.abs(s5.x - (-630)) < 0.5;
  out.checks.sampleShape = ['x', 'y', 'z'].every((k) => Number.isFinite(s5[k])) && Number.isFinite(s5.tangent?.x) && Number.isFinite(s5.normal?.x);
  out.checks.sampleTangentUnit = Math.abs(Math.hypot(s5.tangent.x, s5.tangent.z) - 1) < 1e-3;
  out.checks.sampleYNearTerrain = Math.abs(s5.y - T.getHeight(s5.x, s5.z)) < 1.5;
  out.checks.sampleInvalid = R.sample(999999, 0.5) === null;
  // bezier edge: mid point must NOT be on the chord and must be inside the control hull
  const b5 = R.sample(e2, 0.5);
  const chordMidX = (-560 + -560) / 2, chordMidZ = (-700 + -560) / 2;
  out.bezier = { b5, chordMid: { x: chordMidX, z: chordMidZ } };
  out.checks.bezierCurves = dist(b5, { x: chordMidX, z: chordMidZ }) > 5;
  // monotone arc-length: t=0.25 ... 0.75 distances increasing
  let mono = true, prev = 0;
  for (let i = 1; i <= 10; i++) { const p = R.sample(e2, i / 10); const d = dist(p, R.sample(e2, (i - 1) / 10)); if (i > 1 && Math.abs(d - prev) > prev * 0.25) mono = false; prev = d; }
  out.checks.bezierArcLengthUniform = mono;

  // ---- laneCenter()
  const lc0 = R.laneCenter(e1, 0, 0.5), lc1 = R.laneCenter(e1, 1, 0.5);
  const n5 = s5.normal; // {x:-tz, z:tx}
  const off0 = (lc0.x - s5.x) * n5.x + (lc0.z - s5.z) * n5.z;
  const off1 = (lc1.x - s5.x) * n5.x + (lc1.z - s5.z) * n5.z;
  // right of a->b: tangent (1,0) -> right-hand side in xz (y up) is +z? Using cross(up, tangent): right = (tz, -tx)
  const rightX = s5.tangent.z, rightZ = -s5.tangent.x;
  const off0Right = (lc0.x - s5.x) * rightX + (lc0.z - s5.z) * rightZ;
  const off1Right = (lc1.x - s5.x) * rightX + (lc1.z - s5.z) * rightZ;
  out.lane = { lc0, lc1, off0AlongNormal: off0, off1AlongNormal: off1, off0Right, off1Right, streetType: R.types.street };
  out.checks.laneOppositeSides = Math.sign(off0) !== Math.sign(off1) && Math.abs(off0) > 1 && Math.abs(off1) > 1;
  out.checks.laneWithinAsphalt = Math.abs(off0) < R.types.street.asphaltHalf && Math.abs(off1) < R.types.street.asphaltHalf;
  out.checks.lane0IsRightOfAB = off0Right > 0; // lane 0 = rightmost in a->b direction (right-hand traffic)
  out.checks.laneCenterInvalid = R.laneCenter(999999, 0, 0.5) === null;
  // avenue 4 lanes: lanes 0,1 same side, 2,3 other side
  const av = [0, 1, 2, 3].map((i) => R.laneCenter(e2, i, 0.5));
  const bn = b5.normal;
  const avOff = av.map((p) => (p.x - b5.x) * bn.x + (p.z - b5.z) * bn.z);
  out.lane.avenueOffsets = avOff;
  out.checks.avenueLanesSplit = Math.sign(avOff[0]) === Math.sign(avOff[1]) && Math.sign(avOff[2]) === Math.sign(avOff[3]) && Math.sign(avOff[0]) !== Math.sign(avOff[2]) && Math.abs(avOff[0]) > Math.abs(avOff[1]);

  // ---- frontage()
  const fr = R.frontage(e1);
  out.frontage = { count: fr.length, sample: fr.slice(0, 2) };
  out.checks.frontageBothSides = fr.some((f) => f.side === 'left') && fr.some((f) => f.side === 'right');
  out.checks.frontageShape = fr.every((f) => ['from', 'to', 'x', 'z', 'heading'].every((k) => Number.isFinite(f[k])) && f.from < f.to && f.to <= 1.0001);
  out.checks.frontageOffRoad = fr.every((f) => Math.abs(f.z - (-700)) > 6);
  out.checks.frontageInvalid = Array.isArray(R.frontage(999999)) && R.frontage(999999).length === 0;

  // ---- nearestEdge()
  const ne = R.nearestEdge(-630, -690, 30);
  out.nearest = ne ? { edge: ne.edge.id, t: ne.t, point: ne.point, dist: ne.dist } : null;
  out.checks.nearestEdgeHits = !!ne && ne.edge.id === e1 && Math.abs(ne.dist - 10) < 0.5 && Math.abs(ne.t - 0.5) < 0.05 && Math.abs(ne.point.z - (-700)) < 0.1;
  out.checks.nearestEdgeMaxDist = R.nearestEdge(-630, -650, 30) === null;
  out.checks.nearestEdgeOnCurve = (() => { const q = R.nearestEdge(b5.x + 2, b5.z, 30); return !!q && q.edge.id === e2 && q.dist < 3; })();

  // ---- removeEdge() cleanup
  const vBefore = R.version, chBefore = changed;
  R.removeEdge(e1);
  out.checks.removeEdgeDeletes = !R.edges.has(e1) && !R.nodes.get(a).edges.has(e1) && !R.nodes.get(b).edges.has(e1);
  out.checks.versionBumpOnRemove = R.version > vBefore;
  out.checks.changedEmittedOnRemove = changed > chBefore && payloads[payloads.length - 1].removed?.includes(e1);
  out.checks.sampleAfterRemove = R.sample(e1, 0.5) === null;
  out.checks.nearestAfterRemove = R.nearestEdge(-630, -690, 30) === null;
  await waitFrames(4);
  const m2 = meshInfo();
  out.afterRemove = { version: R.version, changed, ...m2 };
  out.checks.geometryShrankOnRemove = m2.tris < m1.tris;
  // removeNode
  R.removeNode(c);
  out.checks.removeNodeCascades = !R.nodes.has(c) && !R.edges.has(e2) && !R.nodes.get(b).edges.has(e2);
  await waitFrames(4);
  const m3 = meshInfo();
  out.afterRemoveNode = { ...m3 };
  out.checks.geometryBackToBaseline = Math.abs(m3.tris - m0.tris) <= 2;

  // ---- built network integrity: every showcase edge sample sits near (>=) the terrain unless bridge; lamps; intersections
  const api = s.registry.get('roads').api;
  let bad = 0, checked = 0, sunk = 0, floating = 0, maxAbove = 0, maxBelow = 0;
  for (const e of R.edges.values()) {
    for (let i = 1; i < 10; i++) {
      const p = R.sample(e.id, i / 10); checked++;
      const th = T.getHeight(p.x, p.z);
      const dy = p.y - th;
      if (!e.bridge) { if (dy < -0.05) { sunk++; maxBelow = Math.min(maxBelow, dy); } if (dy > 2.5) { floating++; maxAbove = Math.max(maxAbove, dy); } }
      if (!Number.isFinite(p.y)) bad++;
    }
  }
  out.integrity = { checked, bad, sunkSamples: sunk, floatingSamples: floating, maxBelow, maxAbove, bridges: [...R.edges.values()].filter((e) => e.bridge).length };
  out.checks.noNaN = bad === 0;
  const lamps = api.lampPositions([...R.edges.keys()][0]);
  out.lamps = { count: lamps.length, first: lamps[0] };
  out.checks.lampPositions = lamps.length > 0 && lamps.every((l) => Number.isFinite(l.x) && Number.isFinite(l.y) && Number.isFinite(l.heading));
  const ints = api.intersections();
  out.intersections = { count: ints.length, first: ints[0] && { id: ints[0].id, arms: ints[0].arms.length } };
  out.checks.intersections = ints.length > 5 && ints.every((i) => i.arms.length >= 3);
  // dead-ends and node degrees (showcase topology sanity)
  out.deadEnds = [...R.nodes.values()].filter((n) => n.edges.size === 1).map((n) => ({ id: n.id, x: +n.x.toFixed(1), z: +n.z.toFixed(1), kind: api.nodeInfo(n.id)?.kind }));
  out.nodesNear200_160 = [...R.nodes.values()].filter((n) => Math.hypot(n.x - 200, n.z - 160) < 30).map((n) => ({ id: n.id, x: n.x, z: n.z, deg: n.edges.size, kind: api.nodeInfo(n.id)?.kind }));
  out.nodeKinds = (() => { const k = {}; for (const n of R.nodes.values()) { const kk = api.nodeInfo(n.id)?.kind || '?'; k[kk] = (k[kk] || 0) + 1; } return k; })();
  // terrain around the one-way loop's north arm (dark pit seen in loop_12.png near x=-215,z=-195)
  out.pitProbe = (() => {
    const res = []; let mn = 1e9, mx = -1e9, mnAt = null;
    for (let x = -260; x <= -160; x += 4) for (let z = -230; z <= -150; z += 4) { const h = T.getHeight(x, z); if (h < mn) { mn = h; mnAt = [x, z]; } if (h > mx) mx = h; }
    const ne = R.nearestEdge(mnAt[0], mnAt[1], 60);
    return { minH: +mn.toFixed(2), maxH: +mx.toFixed(2), minAt: mnAt, roadYNear: ne ? +ne.point.y.toFixed(2) : null, distToRoad: ne ? +ne.dist.toFixed(1) : null, slopeAtMin: +T.getSlope(mnAt[0], mnAt[1]).toFixed(3) };
  })();
  out.coverage = R.coverage ? { res: R.coverage.res, version: R.coverage.version, isRoadAtNode: R.isRoad(40, 40), isRoadFar: R.isRoad(900, 900) } : null;
  out.stats = api.stats();
  // ---- draw-call attribution per camera: total vs with the roads group hidden (includes shadow passes)
  out.drawCalls = {};
  for (const cam of ['aerial', 'street', 'skyline', 'closeup', 'intersection', 'highway', 'bridge']) {
    try { s.setCamera(cam); } catch (e) { continue; }
    await waitFrames(2);
    const total = s.engine.stats.drawCalls;
    group.visible = false; await waitFrames(2);
    const without = s.engine.stats.drawCalls;
    group.visible = true; await waitFrames(1);
    let roadMeshes = 0; group.traverse((o) => { if (o.isMesh) roadMeshes++; });
    out.drawCalls[cam] = { total, withoutRoads: without, roadsOwn: total - without, roadMeshes };
  }
  out.moduleStatusEnd = s.registry.status().roads;
  out.errors = s.errors.slice();
  return out;
});

res.consoleErrors = consoleErrors;
res.allChecks = Object.values(res.checks).every(Boolean);
res.failed = Object.entries(res.checks).filter(([, v]) => !v).map(([k]) => k);
console.log(JSON.stringify(res, null, 2));
await browser.close();
