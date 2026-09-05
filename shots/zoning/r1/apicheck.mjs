// Throwaway API-contract probe for the zoning module (critic round 1).
// node shots/zoning/r1/apicheck.mjs
import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
page.on('pageerror', (e) => errs.push(String(e?.message || e).slice(0, 300)));
await page.goto('http://127.0.0.1:5173/?showcase=zoning&headless=1&time=12&speed=0', { waitUntil: 'domcontentloaded', timeout: 240000 });
await page.waitForFunction(() => window.__sim && window.__sim.ready === true, null, { timeout: 240000, polling: 200 });
await page.waitForTimeout(500);

const out = await page.evaluate(() => {
  const S = window.__sim;
  const W = S.world;
  const Z = W.zones;
  const R = W.roads;
  const rec = S.registry.get('zoning');
  const api = rec?.api;
  const res = { errors: [] };

  // ---- 0. shape of world.zones
  res.zonesShape = {
    cellSize: Z.cellSize,
    hasCells: Z.cells instanceof Map,
    hasLots: Z.lots instanceof Map,
    types: Z.types, densities: Z.densities,
    fns: ['paint', 'erase', 'lotsFor', 'freeLots'].filter((k) => typeof Z[k] === 'function'),
    version: Z.version,
  };
  res.counts0 = { cells: Z.cells.size, lots: Z.lots.size, version: Z.version };

  // ---- 1. lot record shape + geometric relation to its road edge
  const lots = [...Z.lots.values()];
  const missing = new Set();
  for (const l of lots) for (const k of ['id', 'edgeId', 'side', 'cells', 'x', 'z', 'w', 'd', 'heading', 'type', 'density']) {
    if (l[k] === undefined || l[k] === null) missing.add(k);
  }
  res.lotFieldsMissing = [...missing];
  res.lotSample = lots.slice(0, 3).map((l) => ({ id: l.id, edgeId: l.edgeId, side: l.side, x: +l.x.toFixed(2), z: +l.z.toFixed(2), w: l.w, d: l.d, heading: +l.heading.toFixed(3), cells: l.cells.length, type: l.type, density: l.density }));

  // frontage check: distance from lot centre to its edge centreline, and heading vs road normal
  let badEdge = 0, badLat = 0, badHeading = 0, maxLat = 0, minLat = 1e9;
  const latList = [];
  for (const l of lots) {
    const e = R.edges.get(l.edgeId);
    if (!e) { badEdge++; continue; }
    const s = R.sample(l.edgeId, Math.max(0, Math.min(1, l.t ?? 0.5)));
    if (!s) { badEdge++; continue; }
    // lateral distance from centreline along the road normal
    const dx = l.x - s.x, dz = l.z - s.z;
    const lat = Math.abs(dx * s.normal.x + dz * s.normal.z);
    latList.push(lat);
    const halfW = (e.width || 16) / 2;
    if (lat < halfW - 0.5 || lat > halfW + 40) badLat++;
    maxLat = Math.max(maxLat, lat); minLat = Math.min(minLat, lat);
    // heading should point from lot centre toward the road (0 = north = -Z)
    // heading convention (ARCHITECTURE 2): 0 = north = -Z, clockwise from above -> dir(h) = (sin h, -cos h)
    const want = Math.atan2(s.x - l.x, -(s.z - l.z));
    let dh = Math.abs(((l.heading - want + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (dh > 0.35) badHeading++;
  }
  res.frontage = { lots: lots.length, badEdge, badLat, badHeading, minLat: +minLat.toFixed(2), maxLat: +maxLat.toFixed(2) };
  // lot size distribution: CS2 lots are consistent per zone type; slivers are a smell
  const ws = lots.map((l) => l.w).sort((a, b) => a - b);
  const ds = lots.map((l) => l.d).sort((a, b) => a - b);
  const pct = (a, p) => a[Math.min(a.length - 1, Math.floor(a.length * p))];
  const hist = {}; for (const l of lots) { const k = `${l.w}x${l.d}`; hist[k] = (hist[k] || 0) + 1; }
  res.lotSizes = { wMin: ws[0], wP50: pct(ws, 0.5), wMax: ws[ws.length - 1], dMin: ds[0], dMax: ds[ds.length - 1],
    slivers: lots.filter((l) => l.w < 14).length, hist: Object.entries(hist).sort((a, b) => b[1] - a[1]).slice(0, 12) };
  // per-edge lot counts, to see which frontages got nothing
  const noLots = []; for (const e of R.edges.values()) { if (!Z.lotsFor(e.id).length) noLots.push({ id: e.id, type: e.type, len: +e.length.toFixed(0) }); }
  res.edgesWithoutLots = noLots;

  // do the lot cells actually exist in the zone grid and match the lot type?
  let cellMismatch = 0, cellMissing = 0;
  for (const l of lots) for (const k of l.cells) {
    const c = Z.cells.get(k);
    if (!c) { cellMissing++; continue; }
    if (c.type !== l.type || c.density !== l.density) cellMismatch++;
  }
  res.lotCells = { cellMissing, cellMismatch };

  // lots on both sides of roads?
  const sides = {}; for (const l of lots) sides[l.side] = (sides[l.side] || 0) + 1;
  res.sides = sides;
  // how many road edges have at least one lot?
  let edgesWith = 0, edgesTotal = 0;
  for (const e of R.edges.values()) { edgesTotal++; if (Z.lotsFor(e.id).length) edgesWith++; }
  res.edgeCoverage = { edgesTotal, edgesWith };

  // ---- 2. paint on virgin ground next to a road (event + cells + lots)
  const events = [];
  const off = S.events.on('zones:changed', (p) => events.push({ cells: p?.cells?.length ?? -1, added: p?.lots?.added?.length ?? -1, removed: p?.lots?.removed?.length ?? -1 }), 'apicheck');

  // find an unpainted zonable cell
  let target = null;
  // walk the world looking for a zonable-but-unpainted point
  for (let i = 0; i < 4000 && !target; i++) {
    const x = -400 + (i % 100) * 8, z = -300 + Math.floor(i / 100) * 8;
    if (Z.zonableAt && Z.zonableAt(x, z) && !Z.cellAt(x, z)) target = { x, z };
  }
  res.paintTarget = target;
  if (target) {
    const before = { cells: Z.cells.size, lots: Z.lots.size, version: Z.version };
    const n = Z.paint(target.x, target.z, 12, 'commercial', 'high');
    const after = { cells: Z.cells.size, lots: Z.lots.size, version: Z.version };
    res.paint = { returned: n, before, after, delta: after.cells - before.cells, versionBumped: after.version > before.version, eventsAfterPaint: events.length };
    // the new cells must belong to a road edge that exists
    let okEdge = 0, badE = 0;
    const cAt = Z.cellAt(target.x, target.z);
    res.paintedCell = cAt ? { type: cAt.type, density: cAt.density, edgeId: cAt.edgeId, side: cAt.side, depth: cAt.depth, hasEdge: R.edges.has(cAt.edgeId) } : null;
    void okEdge; void badE;

    // ---- 3. erase removes
    const e0 = { cells: Z.cells.size, lots: Z.lots.size, version: Z.version };
    const m = Z.erase(target.x, target.z, 12);
    const e1 = { cells: Z.cells.size, lots: Z.lots.size, version: Z.version };
    res.erase = { returned: m, before: e0, after: e1, delta: e1.cells - e0.cells, versionBumped: e1.version > e0.version, cellGone: !Z.cellAt(target.x, target.z), eventsTotal: events.length };
  }

  // ---- 4. paint must refuse non-zonable ground (far from any road) and bad types
  const far = { x: 900, z: 900 };
  const cBefore = Z.cells.size;
  const nFar = Z.paint(far.x, far.z, 20, 'residential', 'low');
  res.paintFarFromRoad = { returned: nFar, cellsAdded: Z.cells.size - cBefore };
  const nBad = Z.paint(0, -40, 10, 'nonsense', 'low');
  res.paintBadType = { returned: nBad, cellsAdded: Z.cells.size - cBefore };

  // ---- 5. water / slope rejection sanity: any zonable cell over water?
  let overWater = 0, steep = 0, onRoad = 0, n = 0;
  for (const c of Z.cells.values()) {
    n++;
    if (W.terrain.isWater(c.x, c.z)) overWater++;
    if (W.terrain.getSlope(c.x, c.z) > 0.42) steep++;
    if (typeof R.isRoad === 'function' && R.isRoad(c.x, c.z) === 1) onRoad++;
  }
  res.validity = { cells: n, overWater, steep, onRoad };

  // ---- 6. overlay: mesh count, materials, depth state, height above terrain
  const grp = S.engine.scene.getObjectByName('zoning-overlay');
  if (!grp) res.errors.push('no zoning-overlay group in scene');
  const ov = [];
  let minAbove = 1e9, maxAbove = -1e9, samples = 0;
  grp?.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry;
    ov.push({
      name: o.name || o.type, visible: o.visible, renderOrder: o.renderOrder,
      tris: g.index ? g.index.count / 3 : (g.attributes.position?.count || 0) / 3,
      transparent: o.material.transparent, depthWrite: o.material.depthWrite, depthTest: o.material.depthTest,
      polygonOffset: o.material.polygonOffset, pof: o.material.polygonOffsetFactor, pou: o.material.polygonOffsetUnits,
      hasFog: !!o.material.uniforms?.fogColor,
    });
    const p = g.attributes.position;
    if (p && o.visible) {
      for (let i = 0; i < p.count; i += Math.max(1, Math.floor(p.count / 400))) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const above = y - W.terrain.getHeight(x, z);
        minAbove = Math.min(minAbove, above); maxAbove = Math.max(maxAbove, above); samples++;
      }
    }
  });
  res.overlay = { meshes: ov, visibleMeshes: ov.filter((m) => m.visible).length, heightAboveTerrain: { min: +minAbove.toFixed(3), max: +maxAbove.toFixed(3), samples } };

  // ---- 7. serialize/deserialize round trip
  if (api?.serialize) {
    const snap = api.serialize();
    const c0 = Z.cells.size, l0 = Z.lots.size;
    const sig0 = [...Z.cells.keys()].sort().join(';').length;
    api.deserialize(snap);
    const sig1 = [...Z.cells.keys()].sort().join(';').length;
    res.serialize = { cellsInSnapshot: snap?.cells?.length, cellsBefore: c0, cellsAfter: Z.cells.size, lotsBefore: l0, lotsAfter: Z.lots.size, keysIdentical: sig0 === sig1 };
  } else res.errors.push('no serialize on module api');

  // ---- 8. determinism of lot generation: force a refresh and compare lot geometry
  if (api?.refresh) {
    const sig = (m) => [...m.values()].map((l) => `${l.edgeId}:${l.side}:${l.x.toFixed(2)}:${l.z.toFixed(2)}:${l.w}:${l.d}:${l.heading.toFixed(4)}`).sort().join('|');
    const a = sig(Z.lots);
    api.refresh();
    const b = sig(Z.lots);
    api.refresh();
    const c = sig(Z.lots);
    res.determinism = { stableAfterRefresh: a === b && b === c, lots: Z.lots.size, lenA: a.length, lenB: b.length };
  }

  // ---- 9. lot id / buildingId stability across a rebuild
  if (api?.refresh) {
    const ids0 = new Set(Z.lots.keys());
    api.refresh();
    const ids1 = new Set(Z.lots.keys());
    let kept = 0; for (const i of ids1) if (ids0.has(i)) kept++;
    res.idStability = { before: ids0.size, after: ids1.size, kept };
  }

  // ---- 10. stats / module status
  res.stats = api?.stats ? api.stats() : null;
  res.moduleStatus = S.stats().modules?.zoning;
  res.drawCalls = S.stats().drawCalls;
  res.triangles = S.stats().triangles;
  res.simErrors = S.errors.slice(0, 10);
  off && off();
  res.events = events;
  return res;
});

// ---- 11. zoning's own draw-call share: toggle the overlay group and diff the renderer stats
const withOn = await page.evaluate(() => window.__sim.stats().drawCalls);
await page.evaluate(() => { window.__sim.engine.scene.getObjectByName('zoning-overlay').visible = false; });
await page.waitForTimeout(2500);
const withOff = await page.evaluate(() => window.__sim.stats().drawCalls);
await page.evaluate(() => { window.__sim.engine.scene.getObjectByName('zoning-overlay').visible = true; });
await page.waitForTimeout(2500);
const backOn = await page.evaluate(() => window.__sim.stats().drawCalls);
out.drawCallShare = { withOn, withOff, backOn, zoningDraws: backOn - withOff };

out.consoleErrors = errs;
console.log(JSON.stringify(out, null, 2));
await browser.close();
