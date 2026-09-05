// Critic helper (throwaway): luminance / contrast / saturation stats per PNG via a canvas in headless Chromium.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const files = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setContent('<canvas id=c></canvas>');
for (const f of files) {
  const b64 = fs.readFileSync(f).toString('base64');
  const r = await page.evaluate(async (b64) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.getElementById('c'); const W = 480, H = Math.round(480 * img.height / img.width); c.width = W; c.height = H;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0, W, H);
    const d = g.getImageData(0, 0, W, H).data; const n = W * H;
    const lum = new Float32Array(n); let sumL = 0, sumS = 0, black = 0, white = 0;
    for (let i = 0; i < n; i++) {
      const r = d[i * 4], gg = d[i * 4 + 1], b = d[i * 4 + 2];
      const L = 0.2126 * r + 0.7152 * gg + 0.0722 * b; lum[i] = L; sumL += L;
      const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b); sumS += mx ? (mx - mn) / mx : 0;
      if (mx < 8) black++; if (mn > 247) white++;
    }
    const mean = sumL / n; let v = 0; for (let i = 0; i < n; i++) v += (lum[i] - mean) ** 2;
    const s = Array.from(lum).sort((a, b) => a - b);
    return { mean: +mean.toFixed(1), std: +Math.sqrt(v / n).toFixed(1), p1: +s[Math.floor(n * 0.01)].toFixed(0), p50: +s[n >> 1].toFixed(0), p99: +s[Math.floor(n * 0.99)].toFixed(0), sat: +(sumS / n).toFixed(3), blackPct: +(100 * black / n).toFixed(1), whitePct: +(100 * white / n).toFixed(1) };
  }, b64);
  console.log(path.basename(f).padEnd(24), JSON.stringify(r));
}
await browser.close();
