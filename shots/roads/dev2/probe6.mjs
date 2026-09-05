import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 640, height: 360 } })).newPage();
await page.goto('http://127.0.0.1:5173/?showcase=roads&headless=1&time=12', { waitUntil: 'domcontentloaded', timeout: 240000 });
await page.waitForFunction(() => window.__sim && window.__sim.ready === true, null, { timeout: 240000, polling: 100 });
const res = await page.evaluate(() => {
  const s = window.__sim, R = s.world.roads, T = s.world.terrain, api = s.registry.apis.roads;
  const h0 = Float32Array.from(T.heights);
  api.rebuild();
  const diffs = [];
  const res = T.resolution, cell = T.cellSize, half = 1024;
  for (let i = 0; i < h0.length; i++) if (Math.abs(T.heights[i] - h0[i]) > 1e-4) { const ix = i % res, iz = (i / res) | 0; const wx = ix * cell - half, wz = iz * cell - half; const ne = R.nearestEdge(wx, wz, 60); diffs.push({ wx, wz, before: +h0[i].toFixed(3), after: +T.heights[i].toFixed(3), edge: ne?.edge.id, type: ne?.edge.type, dist: ne ? +ne.dist.toFixed(1) : null, roadY: ne ? +ne.point.y.toFixed(2) : null, bridge: ne?.edge.bridge }); }
  const h1 = Float32Array.from(T.heights);
  api.rebuild();
  let d2 = 0; for (let i = 0; i < h1.length; i++) if (Math.abs(T.heights[i] - h1[i]) > 1e-4) d2++;
  return { diffs, thirdRebuildChanges: d2, stats: api.stats() };
});
console.log(JSON.stringify(res));
await browser.close();
