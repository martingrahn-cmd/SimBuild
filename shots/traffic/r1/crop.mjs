// Critic helper (throwaway) — traffic r1. Save a magnified crop so the critic can look at it.
// usage: node crop.mjs <png> x y w h scale <out.png>
import { chromium } from 'playwright';
import fs from 'node:fs';
const [f, x, y, w, h, s, out] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setContent('<canvas id=c></canvas>');
const b64 = fs.readFileSync(f).toString('base64');
const data = await page.evaluate(async ({ b64, x, y, w, h, s }) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
  const c = document.getElementById('c'); c.width = w * s; c.height = h * s;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  g.drawImage(img, x, y, w, h, 0, 0, w * s, h * s);
  return c.toDataURL('image/png');
}, { b64, x: +x, y: +y, w: +w, h: +h, s: +s });
fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
console.log('wrote', out);
await browser.close();
