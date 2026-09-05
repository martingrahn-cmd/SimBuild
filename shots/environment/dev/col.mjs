// print a vertical pixel column of a png: node col.mjs file x y0 y1 step
import { chromium } from 'playwright'; import fs from 'node:fs';
const [f, x = '960', y0 = '300', y1 = '420', st = '6'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage(); await page.setContent('<canvas id=c></canvas>');
const r = await page.evaluate(async ({ b64, x, y0, y1, st }) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
  const c = document.getElementById('c'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const out = []; for (let y = +y0; y <= +y1; y += +st) { const d = g.getImageData(+x, y, 1, 1).data; out.push(`${y}: ${d[0]},${d[1]},${d[2]}`); } return out.join('  ');
}, { b64: fs.readFileSync(f).toString('base64'), x, y0, y1, st });
console.log(r); await browser.close();
