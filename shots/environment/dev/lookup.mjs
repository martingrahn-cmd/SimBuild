// debug: screenshot looking up at the cloud layer. node shots/environment/dev/lookup.mjs <hour> <weather> <out.png>
import { chromium } from 'playwright';
const exe = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const [hour = '12', weather = 'partly', out = 'shots/environment/dev/lookup.png'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage();
await page.goto(`http://127.0.0.1:5173/?showcase=environment&headless=1&time=${hour}&camera=skyline&weather=${weather}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => window.__sim && window.__sim.ready === true, null, { timeout: 300000, polling: 200 });
await page.evaluate(async () => {
  const s = window.__sim; s.camera.minPitch = -1.3; s.camera.apply({ yaw: 0.4, pitch: -0.7, distance: 60, target: [0, 300, 0] });
  const f0 = s.engine.stats.frames; while (s.engine.stats.frames - f0 < 3) await new Promise(r => setTimeout(r, 50));
});
await page.screenshot({ path: out });
console.log('wrote', out);
await browser.close();
