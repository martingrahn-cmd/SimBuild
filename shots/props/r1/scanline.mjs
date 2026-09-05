// Critic helper (throwaway): luminance profile along a line, full-res. node scanline.mjs <png> x0,y0,x1,y1 [n]
import { chromium } from 'playwright';
import fs from 'node:fs';
const [src, line, nA] = process.argv.slice(2);
const N = +(nA || 120);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setContent('<canvas id=c></canvas>');
const b64 = fs.readFileSync(src).toString('base64');
const res = await page.evaluate(async ({ b64, line, N }) => {
  const [x0, y0, x1, y1] = line.split(',').map(Number);
  const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
  const c = document.getElementById('c'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, img.width, img.height).data;
  const out = [];
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const x = Math.round(x0 + (x1 - x0) * t), y = Math.round(y0 + (y1 - y0) * t);
    const o = (y * img.width + x) * 4;
    out.push(+(0.2126 * d[o] + 0.7152 * d[o + 1] + 0.0722 * d[o + 2]).toFixed(1));
  }
  let maxStep = 0, at = 0;
  for (let i = 1; i < out.length; i++) { const s = Math.abs(out[i] - out[i - 1]); if (s > maxStep) { maxStep = s; at = i; } }
  return { profile: out, maxStep: +maxStep.toFixed(1), atIndex: at };
}, { b64, line, N });
console.log(JSON.stringify(res));
await browser.close();
