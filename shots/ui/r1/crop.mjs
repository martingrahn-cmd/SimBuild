// node shots/ui/r1/crop.mjs <png> <name>=x,y,w,h[,scale] ...   → shots/ui/r1/crops/<basename>_<name>.png
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const [src, ...specs] = process.argv.slice(2);
const b64 = fs.readFileSync(src).toString('base64');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 4000, height: 2400 }, deviceScaleFactor: 1 });
fs.mkdirSync('shots/ui/r1/crops', { recursive: true });
for (const s of specs) {
  const [name, v] = s.split('=');
  const [x, y, w, h, sc = 2] = v.split(',').map(Number);
  await page.setContent(`<body style="margin:0;background:#000"><img src="data:image/png;base64,${b64}" style="position:absolute;left:${-x * sc}px;top:${-y * sc}px;width:${(process.env.SRCW||1920) * sc}px;image-rendering:auto">`);
  await page.screenshot({ path: `shots/ui/r1/crops/${path.basename(src, '.png')}_${name}.png`, clip: { x: 0, y: 0, width: w * sc, height: h * sc } });
}
await browser.close();
