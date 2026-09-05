import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 640, height: 360 } })).newPage();
await page.goto('http://127.0.0.1:5173/?showcase=roads&headless=1&time=12', { waitUntil: 'domcontentloaded', timeout: 240000 });
await page.waitForFunction(() => window.__sim && window.__sim.ready === true, null, { timeout: 240000, polling: 100 });
const res = await page.evaluate(() => {
  const s = window.__sim, R = s.world.roads, T = s.world.terrain, api = s.registry.apis.roads;
  const out = {};
  const byEdge = {};
  for (const e of R.edges.values()) {
    const Ty = R.types[e.type];
    for (let t = 0.02; t < 0.98; t += 0.02) {
      const p = R.sample(e.id, t);
      for (let u = -Ty.asphaltHalf + 0.3; u <= Ty.asphaltHalf - 0.3; u += 1.5) {
        const x = p.x + p.normal.x * u, z = p.z + p.normal.z * u; const th = T.getHeight(x, z);
        if (T.isWater(x, z) || p.y - th > 2.4) continue;
        const gap = (p.y + 0.08) - th;
        if (gap < 0.02) { const k = e.id; byEdge[k] = byEdge[k] || { type: e.type, a: R.nodes.get(e.a), b: R.nodes.get(e.b), n: 0, worst: 0, ts: [] }; byEdge[k].n++; if (gap < byEdge[k].worst) byEdge[k].worst = +gap.toFixed(2); if (byEdge[k].ts.length < 6) byEdge[k].ts.push(+t.toFixed(2)); }
      }
    }
  }
  out.byEdge = Object.fromEntries(Object.entries(byEdge).map(([k, v]) => [k, { type: v.type, from: [v.a.x, v.a.z], to: [v.b.x, v.b.z], n: v.n, worst: v.worst, ts: v.ts }]));
  const dbg = api.edgeDebug(54, 4); out.e54 = dbg;
  // vertices around the worst point
  const cell = T.cellSize, half = 1024; const vx = Math.round((198.7 + half) / cell), vz = Math.round((-76.4 + half) / cell);
  out.verts = [];
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const ix = vx + dx, iz = vz + dz; const wx = ix * cell - half, wz = iz * cell - half; const ne = R.nearestEdge(wx, wz, 30); out.verts.push({ wx, wz, h: +T.heights[iz * T.resolution + ix].toFixed(2), roadY: ne ? +ne.point.y.toFixed(2) : null, dist: ne ? +ne.dist.toFixed(1) : null, edge: ne?.edge.id }); }
  return out;
});
console.log(JSON.stringify({ e54: res.e54.rows.filter((r) => r.s > 16 && r.s < 60), trims: [res.e54.trimA, res.e54.trimB], verts: res.verts }));
await browser.close();
