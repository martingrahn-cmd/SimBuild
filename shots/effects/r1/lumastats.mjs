// Critic helper: luma percentiles of the final shots (decoded in a blank Chromium page via canvas).
import { chromium } from 'playwright';
import fs from 'node:fs';
const files = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: true, args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
await page.setContent('<canvas id=c></canvas>');
for (const f of files) {
  const b64 = fs.readFileSync(f).toString('base64');
  const r = await page.evaluate(async (b64) => {
    const im = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + b64; });
    const cv = document.getElementById('c'); cv.width = im.width; cv.height = im.height;
    const g = cv.getContext('2d'); g.drawImage(im, 0, 0);
    const D = g.getImageData(0, 0, im.width, im.height).data;
    const hist = new Uint32Array(256); let mean = 0, sat = 0, r = 0, gg = 0, b = 0;
    for (let i = 0; i < D.length; i += 4) {
      const l = Math.round(0.2126 * D[i] + 0.7152 * D[i + 1] + 0.0722 * D[i + 2]); hist[l]++; mean += l;
      const mx = Math.max(D[i], D[i + 1], D[i + 2]), mn = Math.min(D[i], D[i + 1], D[i + 2]); sat += mx ? (mx - mn) / mx : 0;
      r += D[i]; gg += D[i + 1]; b += D[i + 2];
    }
    const n = D.length / 4;
    const pct = (p) => { let acc = 0; for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= p * n) return i; } return 255; };
    return { w: im.width, h: im.height, mean: +(mean / n).toFixed(1), p1: pct(0.01), p5: pct(0.05), p50: pct(0.5), p95: pct(0.95), p99: pct(0.99), sat: +(sat / n).toFixed(3), rgb: [r, gg, b].map((v) => Math.round(v / n)) };
  }, b64);
  console.log(f.replace(/^.*\//, ''), JSON.stringify(r));
}
await browser.close();
