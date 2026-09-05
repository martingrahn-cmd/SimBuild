import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 640, height: 360 } })).newPage();
await page.goto('http://127.0.0.1:5173/?showcase=roads&headless=1&time=12', { waitUntil: 'domcontentloaded', timeout: 240000 });
await page.waitForFunction(() => window.__sim && window.__sim.ready === true, null, { timeout: 240000, polling: 100 });
const res = await page.evaluate(() => {
  const s = window.__sim, R = s.world.roads, T = s.world.terrain, api = s.registry.apis.roads;
  const out = {};
  const e = R.edges.get(85); out.edge = { a: R.nodes.get(e.a), b: R.nodes.get(e.b), trimA: e.trimA, trimB: e.trimB, len: e.length };
  const ib = api.nodeInfo(e.b); out.nodeB = { kind: ib.kind, y: ib.node.y, arms: ib.arms.map((a) => ({ e: a.e.id, trim: +a.trim.toFixed(2), d: [+a.d.x.toFixed(2), +a.d.z.toFixed(2)], o: [+a.ox.toFixed(1), +a.oz.toFixed(1)] })), corners: ib.corners.map((c) => ({ kind: c.kind, tA: +c.tA.toFixed(1), tB: +c.tB.toFixed(1), gap: +c.gap.toFixed(2) })) };
  const sunk = [];
  const Ty = R.types[e.type];
  for (let t = 0.6; t < 0.99; t += 0.01) { const p = R.sample(e.id, t); for (let u = -Ty.asphaltHalf + 0.3; u <= Ty.asphaltHalf - 0.3; u += 1.5) { const x = p.x + p.normal.x * u, z = p.z + p.normal.z * u; const th = T.getHeight(x, z); const gap = p.y + 0.08 - th; if (gap < 0.02) sunk.push({ t: +t.toFixed(2), u, x: +x.toFixed(1), z: +z.toFixed(1), roadY: +p.y.toFixed(2), terr: +th.toFixed(2) }); } }
  out.sunk = sunk.slice(0, 12); out.sunkCount = sunk.length;
  const cell = T.cellSize, half = 1024, res = T.resolution;
  out.verts = [];
  for (let wz = 228; wz <= 240; wz += 4) for (let wx = 272; wx <= 288; wx += 4) { const ix = (wx + half) / cell, iz = (wz + half) / cell; const ne = R.nearestEdge(wx, wz, 40); out.verts.push({ wx, wz, h: +T.heights[iz * res + ix].toFixed(2), roadY: ne ? +ne.point.y.toFixed(2) : null, dist: ne ? +ne.dist.toFixed(1) : null, e: ne?.edge.id }); }
  return out;
});
console.log(JSON.stringify(res));
await browser.close();
