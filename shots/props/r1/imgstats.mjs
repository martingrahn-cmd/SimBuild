// Critic helper (throwaway) — props r1.
// Whole-frame stats at 480 px (ARCHITECTURE §8 / props §4 conventions) + full-res crop stats + speckle + NCC.
// usage: node imgstats.mjs <png> [--crop x,y,w,h[:name]]... [--speckle] [--ncc x,y,w,h]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const argv = process.argv.slice(2);
const files = argv.filter((a) => !a.startsWith('--'));
const crops = argv.filter((a) => a.startsWith('--crop=')).map((a) => a.slice(7));
const speckle = argv.includes('--speckle');
const nccArg = argv.find((a) => a.startsWith('--ncc='));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setContent('<canvas id=c></canvas>');
for (const f of files) {
  const b64 = fs.readFileSync(f).toString('base64');
  const r = await page.evaluate(async ({ b64, crops, speckle, nccArg }) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.getElementById('c'); const g = () => c.getContext('2d', { willReadFrequently: true });
    const stat = (d, n) => {
      const lum = new Float32Array(n); let sumL = 0, sumS = 0, black = 0, white = 0, sr = 0, sg = 0, sb = 0;
      for (let i = 0; i < n; i++) {
        const r = d[i * 4], gg = d[i * 4 + 1], b = d[i * 4 + 2];
        const L = 0.2126 * r + 0.7152 * gg + 0.0722 * b; lum[i] = L; sumL += L; sr += r; sg += gg; sb += b;
        const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b); sumS += mx ? (mx - mn) / mx : 0;
        if (mx < 8) black++; if (mn > 247) white++;
      }
      const mean = sumL / n; let v = 0; for (let i = 0; i < n; i++) v += (lum[i] - mean) ** 2;
      const s = Array.from(lum).sort((a, b) => a - b);
      return { mean: +mean.toFixed(1), std: +Math.sqrt(v / n).toFixed(1), p1: +s[Math.floor(n * 0.01)].toFixed(0),
        p50: +s[n >> 1].toFixed(0), p99: +s[Math.floor(n * 0.99)].toFixed(0), sat: +(sumS / n).toFixed(3),
        blackPct: +(100 * black / n).toFixed(2), whitePct: +(100 * white / n).toFixed(3),
        R: +(sr / n).toFixed(1), G: +(sg / n).toFixed(1), B: +(sb / n).toFixed(1) };
    };
    // whole frame at 480 px
    const W = 480, H = Math.round(480 * img.height / img.width); c.width = W; c.height = H;
    g().drawImage(img, 0, 0, W, H);
    const whole = stat(g().getImageData(0, 0, W, H).data, W * H);
    const out = { w: img.width, h: img.height, whole, crops: {} };
    // full-res crops
    c.width = img.width; c.height = img.height; g().drawImage(img, 0, 0);
    const full = g().getImageData(0, 0, img.width, img.height);
    const sub = (x, y, w, h) => {
      const d = new Uint8ClampedArray(w * h * 4);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const si = ((y + j) * img.width + (x + i)) * 4, di = (j * w + i) * 4;
        d[di] = full.data[si]; d[di + 1] = full.data[si + 1]; d[di + 2] = full.data[si + 2]; d[di + 3] = 255;
      }
      return d;
    };
    for (const spec of crops) {
      const [rect, name] = spec.split(':');
      const [x, y, w, h] = rect.split(',').map(Number);
      const d = sub(x, y, w, h);
      const st = stat(d, w * h);
      // hue mean
      let hx = 0, hy = 0;
      for (let i = 0; i < w * h; i++) {
        const R = d[i * 4] / 255, G = d[i * 4 + 1] / 255, B = d[i * 4 + 2] / 255;
        const mx = Math.max(R, G, B), mn = Math.min(R, G, B), dl = mx - mn;
        if (dl < 1e-6) continue;
        let hdeg = mx === R ? 60 * (((G - B) / dl) % 6) : mx === G ? 60 * ((B - R) / dl + 2) : 60 * ((R - G) / dl + 4);
        hx += Math.cos(hdeg * Math.PI / 180); hy += Math.sin(hdeg * Math.PI / 180);
      }
      st.hue = +((Math.atan2(hy, hx) * 180 / Math.PI + 360) % 360).toFixed(1);
      out.crops[name || rect] = st;
    }
    // speckle over whole frame full-res: |px - 3x3 median| >= 35 L
    if (speckle) {
      const sc = crops.find((s) => (s.split(':')[1] || '') === 'speckle');
      const box = sc ? sc.split(':')[0].split(',').map(Number) : [1, 1, img.width - 2, img.height - 2];
      const iw = img.width, ih = img.height;
      const L = new Float32Array(iw * ih);
      for (let i = 0; i < iw * ih; i++) L[i] = 0.2126 * full.data[i * 4] + 0.7152 * full.data[i * 4 + 1] + 0.0722 * full.data[i * 4 + 2];
      let n35 = 0, n40 = 0, tot = 0; const buf = new Array(9);
      const y0 = Math.max(1, box[1]), y1 = Math.min(ih - 1, box[1] + box[3]);
      const x0 = Math.max(1, box[0]), x1 = Math.min(iw - 1, box[0] + box[2]);
      for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) {
        let k = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) buf[k++] = L[(y + j) * iw + x + i];
        buf.sort((a, b) => a - b); const m = buf[4]; const d = Math.abs(L[y * iw + x] - m);
        tot++; if (d >= 35) n35++; if (d >= 40) n40++;
      }
      out.speckle = { sampled: tot, pct35: +(100 * n35 / tot).toFixed(3), pct40: +(100 * n40 / tot).toFixed(3) };
    }
    if (nccArg) {
      const [x, y, w, h] = nccArg.slice(6).split(',').map(Number);
      const d = sub(x, y, w, h);
      const L = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) L[i] = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2];
      let mean = 0; for (let i = 0; i < w * h; i++) mean += L[i]; mean /= w * h;
      for (let i = 0; i < w * h; i++) L[i] -= mean;
      let best = 0, bestShift = 0;
      for (let sft = 8; sft <= Math.min(128, w - 16); sft++) {
        let num = 0, da = 0, db = 0;
        for (let j = 0; j < h; j++) for (let i = 0; i + sft < w; i++) {
          const a = L[j * w + i], b = L[j * w + i + sft];
          num += a * b; da += a * a; db += b * b;
        }
        const ncc = num / Math.sqrt(da * db + 1e-9);
        if (ncc > best) { best = ncc; bestShift = sft; }
      }
      out.ncc = { maxNCC: +best.toFixed(3), atShift: bestShift };
    }
    return out;
  }, { b64, crops, speckle, nccArg });
  console.log(path.basename(f).padEnd(22), JSON.stringify(r));
}
await browser.close();
