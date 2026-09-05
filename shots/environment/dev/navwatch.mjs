import { chromium } from 'playwright';
const exe = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const url = process.argv[2] || 'http://127.0.0.1:5173/?showcase=environment&time=22&camera=skyline&seed=1337&quality=high&headless=1&speed=0';
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
const t0 = Date.now(); const log = (m) => console.log(((Date.now() - t0) / 1000).toFixed(1) + 's', m);
page.on('framenavigated', (f) => { if (f === page.mainFrame()) log('NAVIGATED ' + f.url().slice(0, 80)); });
page.on('console', (m) => { const t = m.text(); if (/vite|reload|context|lost|WebGL/i.test(t)) log(`console.${m.type()}: ${t.slice(0, 200)}`); });
page.on('pageerror', (e) => log('pageerror ' + String(e).slice(0, 200)));
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => window.__sim && window.__sim.ready === true, null, { timeout: 300000, polling: 200 });
log('ready');
for (let i = 0; i < 9; i++) {
  await page.waitForTimeout(10000);
  const st = await page.evaluate(() => ({ ready: !!window.__sim?.ready, frames: window.__sim?.engine?.stats?.frames, boot: document.getElementById('boot')?.className, errs: window.__sim?.errors?.length })).catch((e) => ({ err: String(e).slice(0, 100) }));
  log(JSON.stringify(st));
}
await browser.close();
