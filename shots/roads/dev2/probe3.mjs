import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 640, height: 360 } })).newPage();
await page.goto('http://127.0.0.1:5173/?showcase=roads&headless=1&time=12', { waitUntil: 'domcontentloaded', timeout: 240000 });
await page.waitForFunction(() => window.__sim && window.__sim.ready === true, null, { timeout: 240000, polling: 100 });
const res = await page.evaluate(() => {
  const s = window.__sim, R = s.world.roads, T = s.world.terrain, api = s.registry.apis.roads;
  const res = T.resolution, cell = T.cellSize, half = 1024;
  const idx = (x, z) => Math.round((z + half) / cell) * res + Math.round((x + half) / cell);
  const i = idx(200, -76);
  const out = { before: T.heights[i], sameArray: T.heights === s.registry.get('terrain') ? 'n/a' : 'unknown' };
  // write directly and see if a zero-strength brush keeps it
  T.heights[i] = 1.234;
  T.modify({ x: 200, z: -76, radius: 20, strength: 0, mode: 'raise' });
  out.afterZeroBrush = T.heights[i];
  out.getHeightAfter = T.getHeight(200, -76);
  api.rebuild();
  out.afterRebuild = T.heights[i];
  out.stats = api.stats();
  const p = R.nearestEdge(200, -76, 5); out.roadY = p.point.y;
  return out;
});
console.log(JSON.stringify(res));
await browser.close();
