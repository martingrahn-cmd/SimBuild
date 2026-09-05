import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 640, height: 360 } })).newPage();
await page.goto('http://127.0.0.1:5173/?showcase=roads&headless=1&time=12', { waitUntil: 'domcontentloaded', timeout: 240000 });
await page.waitForFunction(() => window.__sim && window.__sim.ready === true, null, { timeout: 240000, polling: 100 });
const res = await page.evaluate(() => {
  const s = window.__sim, R = s.world.roads, T = s.world.terrain, api = s.registry.apis.roads;
  const B = api._builder(); const G = B._grid; const res = T.resolution, cell = T.cellSize, half = 1024;
  const i = ((-120 + half) / cell) * res + (104 + half) / cell;
  const snap = () => ({ h: +T.heights[i].toFixed(4), best: G.best[i], tgt: +G.tgt[i].toFixed(4), cMin: +G.cMin[i].toFixed(4), cMax: +G.cMax[i].toFixed(4), seabed: G.seabed[i] });
  const s1 = snap();
  api.rebuild();
  const s2 = snap();
  api.rebuild();
  const s3 = snap();
  // which edges/nodes are near
  const near = [...R.edges.values()].filter((e) => { for (let t = 0; t <= 1; t += 0.05) { const p = R.sample(e.id, t); if (Math.hypot(p.x - 104, p.z + 120) < 40) return true; } return false; }).map((e) => ({ id: e.id, type: e.type, a: [R.nodes.get(e.a).x, R.nodes.get(e.a).z], b: [R.nodes.get(e.b).x, R.nodes.get(e.b).z], trims: [+e.trimA.toFixed(2), +e.trimB.toFixed(2)], accel: !!e.accel, merge: !!e.merge }));
  return { s1, s2, s3, near };
});
console.log(JSON.stringify(res));
await browser.close();
