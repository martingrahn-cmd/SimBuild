import { chromium } from 'playwright';
import fs from 'node:fs';


export const CHROME = process.env.SIM_CHROME || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'].find((p) => fs.existsSync(p));

export async function open({ url, w = 1920, h = 1080, timeout = 300000 }) {
  const browser = await chromium.launch({
    executablePath: CHROME, headless: true,
    args: ['--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--enable-unsafe-swiftshader',
      '--disable-gpu-sandbox', '--enable-features=Vulkan,UseSkiaRenderer', '--no-sandbox', '--disable-dev-shm-usage', `--window-size=${w},${h}`],
  });
  const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text().slice(0, 600)); });
  page.on('pageerror', (e) => errors.push(String(e?.stack || e).slice(0, 600)));
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
  await page.waitForFunction(() => window.__sim && window.__sim.ready === true, null, { timeout, polling: 100 });
  await page.waitForTimeout(500);
  return { browser, page, errors };
}

export async function shoot(page, out) {
  await page.evaluate(() => window.__sim?.freeze?.()).catch(() => {});
  await page.waitForTimeout(250);
  await page.screenshot({ path: out, type: 'png', timeout: 300000 });
  await page.evaluate(() => window.__sim?.unfreeze?.()).catch(() => {});
  await page.waitForTimeout(150);
}

export { readPng } from './png.mjs';

export function crop(png, cx, cy, size) {
  const half = size >> 1;
  const x0 = Math.max(0, Math.min(png.width - size, cx - half));
  const y0 = Math.max(0, Math.min(png.height - size, cy - half));
  const out = [];
  for (let y = y0; y < y0 + size; y++) for (let x = x0; x < x0 + size; x++) {
    const i = (y * png.width + x) * 4;
    out.push([png.data[i], png.data[i + 1], png.data[i + 2]]);
  }
  return out;
}
export const lum = (p) => 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
export function statsOf(px) {
  const L = px.map(lum);
  const mean = L.reduce((a, b) => a + b, 0) / L.length;
  const sd = Math.sqrt(L.reduce((a, b) => a + (b - mean) ** 2, 0) / L.length);
  const mr = px.reduce((a, b) => a + b[0], 0) / px.length;
  const mg = px.reduce((a, b) => a + b[1], 0) / px.length;
  const mb = px.reduce((a, b) => a + b[2], 0) / px.length;
  return { mean, sd, rgb: [mr, mg, mb] };
}
export function sat(px) {
  let s = 0;
  for (const p of px) { const mx = Math.max(p[0], p[1], p[2]), mn = Math.min(p[0], p[1], p[2]); s += mx > 0 ? (mx - mn) / mx : 0; }
  return s / px.length;
}
export function pct(png, q) {
  const L = [];
  for (let i = 0; i < png.data.length; i += 4) L.push(lum([png.data[i], png.data[i + 1], png.data[i + 2]]));
  L.sort((a, b) => a - b);
  return L[Math.min(L.length - 1, Math.floor(q * L.length))];
}
