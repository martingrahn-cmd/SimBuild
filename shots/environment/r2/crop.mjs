// Critic helper (throwaway): crop + 3x upscale a region of a PNG to inspect artefacts.
import { chromium } from 'playwright';
import fs from 'node:fs';
const [src, x, y, w, h, out] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setContent('<canvas id=c></canvas>');
const b64 = fs.readFileSync(src).toString('base64');
const data = await page.evaluate(async ({ b64, x, y, w, h }) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
  const c = document.getElementById('c'); c.width = w * 3; c.height = h * 3;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(img, x, y, w, h, 0, 0, w * 3, h * 3);
  return c.toDataURL('image/png').split(',')[1];
}, { b64, x: +x, y: +y, w: +w, h: +h });
fs.writeFileSync(out, Buffer.from(data, 'base64'));
await browser.close();
