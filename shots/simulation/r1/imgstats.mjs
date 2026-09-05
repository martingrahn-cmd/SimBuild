// Throwaway: mean luminance / min / max / saturation per frame, decoded in a headless page (no PNG lib in node_modules).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const dir = 'shots/simulation/r1';
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setContent('<canvas id="c"></canvas>');
const rows = [];
for (const f of files) {
  const b64 = fs.readFileSync(path.join(dir, f)).toString('base64');
  const r = await page.evaluate(async (src) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + src; await img.decode();
    const c = document.getElementById('c'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    // skip the left 400 px (DOM panel) so the stats describe the 3D frame
    const x0 = Math.min(400, img.width >> 2);
    const d = g.getImageData(x0, 0, img.width - x0, img.height).data;
    let sum = 0, mn = 255, mx = 0, sat = 0, dark = 0, bright = 0, n = 0;
    for (let i = 0; i < d.length; i += 16) {
      const r = d[i], gg = d[i + 1], b = d[i + 2];
      const l = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
      sum += l; if (l < mn) mn = l; if (l > mx) mx = l; if (l < 16) dark++; if (l > 240) bright++;
      const M = Math.max(r, gg, b), m = Math.min(r, gg, b); sat += M ? (M - m) / M : 0; n++;
    }
    return { w: img.width, h: img.height, mean: +(sum / n).toFixed(1), min: mn, max: mx, sat: +(sat / n).toFixed(3), darkPct: +(100 * dark / n).toFixed(1), brightPct: +(100 * bright / n).toFixed(1) };
  }, b64);
  rows.push({ file: f, ...r });
  console.log(`${f.padEnd(22)} ${r.w}x${r.h} mean ${String(r.mean).padStart(6)} min ${String(r.min).padStart(3)} max ${String(r.max).padStart(3)} sat ${r.sat} dark% ${r.darkPct} bright% ${r.brightPct}`);
}
fs.writeFileSync(path.join(dir, 'imgstats.json'), JSON.stringify(rows, null, 2));
await browser.close();
