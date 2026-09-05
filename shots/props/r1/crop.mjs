// Critic helper (throwaway): write full-res crops (optionally magnified) so they can be eyeballed.
// node crop.mjs <png> <x,y,w,h> <out.png> [zoom]
import { chromium } from 'playwright';
import fs from 'node:fs';
const [src, rect, out, zoomA] = process.argv.slice(2);
const zoom = +(zoomA || 1);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setContent('<canvas id=c></canvas>');
const b64 = fs.readFileSync(src).toString('base64');
const res = await page.evaluate(async ({ b64, rect, zoom }) => {
  const [x, y, w, h] = rect.split(',').map(Number);
  const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
  const c = document.getElementById('c'); c.width = w * zoom; c.height = h * zoom;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  g.drawImage(img, x, y, w, h, 0, 0, w * zoom, h * zoom);
  return c.toDataURL('image/png').split(',')[1];
}, { b64, rect, zoom });
fs.writeFileSync(out, Buffer.from(res, 'base64'));
console.log(out);
await browser.close();
