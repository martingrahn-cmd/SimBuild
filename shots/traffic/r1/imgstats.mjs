// Critic helper (throwaway) — traffic r1. Whole-frame luma percentiles + optional rects.
// usage: node imgstats.mjs <png>... [--rect=x,y,w,h:name]...
import { chromium } from 'playwright';
import fs from 'node:fs';
const argv = process.argv.slice(2);
const files = argv.filter((a) => !a.startsWith('--'));
const rects = argv.filter((a) => a.startsWith('--rect=')).map((a) => a.slice(7));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setContent('<canvas id=c></canvas>');
for (const f of files) {
  const b64 = fs.readFileSync(f).toString('base64');
  const r = await page.evaluate(async ({ b64, rects }) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.getElementById('c'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
    const box = (x, y, w, h) => {
      const d = g.getImageData(x, y, w, h).data;
      const L = new Float64Array(d.length / 4); let clip = 0, chroma = 0, sat = 0;
      for (let i = 0, k = 0; i < d.length; i += 4, k++) {
        const R = d[i], G = d[i + 1], B = d[i + 2];
        L[k] = 0.2126 * R + 0.7152 * G + 0.0722 * B;
        if (R === 255 && G === 255 && B === 255) clip++;
        const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
        chroma += mx - mn; sat += mx ? (mx - mn) / mx : 0;
      }
      const s = Float64Array.from(L).sort();
      const q = (p) => +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(1);
      let mean = 0; for (const v of L) mean += v; mean /= L.length;
      let sd = 0; for (const v of L) sd += (v - mean) ** 2; sd = Math.sqrt(sd / L.length);
      return { n: L.length, p1: q(0.01), p5: q(0.05), p50: q(0.5), p95: q(0.95), p99: q(0.99), mean: +mean.toFixed(1), std: +sd.toFixed(1), pctClipWhite: +(100 * clip / L.length).toFixed(4), meanChroma: +(chroma / L.length).toFixed(1), meanSat: +(sat / L.length).toFixed(3) };
    };
    const out = { w: img.width, h: img.height, frame: box(0, 0, img.width, img.height), rects: {} };
    for (const spec of rects) {
      const [nums, name] = spec.split(':');
      const [x, y, w, h] = nums.split(',').map(Number);
      out.rects[name || nums] = box(x, y, w, h);
    }
    return out;
  }, { b64, rects });
  console.log(f, JSON.stringify(r));
}
await browser.close();
