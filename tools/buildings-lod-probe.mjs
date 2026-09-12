#!/usr/bin/env node
// Compare the buildings owner's existing merged LOD0/LOD1 colour passes at one
// real camera.  It changes only the public runtime debug selection and reloads
// for each row, so neither the staged city nor saved owner state is changed.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const out = process.env.OUT_DIR || 'shots/democity/buildings-lod-probe';
const camera = process.env.CAMERA || 'aerial';
const time = Number(process.env.TIME || 22);
const executablePath = process.env.SIM_CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', chromium.executablePath()].find(p => fs.existsSync(p));
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true, args: ['--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu', '--ignore-gpu-blocklist', '--no-sandbox'] });

try {
  const rows = [];
  for (const lod of [0, 1]) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } }), browserErrors = [];
    page.on('pageerror', e => browserErrors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') browserErrors.push(m.text()); });
    await page.route('**/@vite/client', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await page.goto(`${base}/?showcase=democity&headless=1&time=${time}&camera=${camera}&speed=0&quality=high&seed=1337`, { waitUntil: 'domcontentloaded', timeout: 240000 });
    await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });
    await page.evaluate(lod => window.__sim.registry.apis.buildings.forceLod(lod), lod);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const row = await page.evaluate(lod => {
      const s = window.__sim, b = s.registry.apis.buildings;
      const frames = [];
      return new Promise(resolve => {
        const sample = () => { const q = s.stats(); frames.push({ draws: q.drawCalls, triangles: q.triangles }); if (frames.length < 20) requestAnimationFrame(sample); else resolve({ lod, stats: b.stats(), max: { draws: Math.max(...frames.map(f => f.draws)), triangles: Math.max(...frames.map(f => f.triangles)) }, errors: s.errors.slice() }); };
        requestAnimationFrame(sample);
      });
    }, lod);
    await page.screenshot({ path: `${out}/aerial_22_lod${lod}.png` });
    row.browserErrors = browserErrors; row.pass = !row.errors.length && !browserErrors.length;
    rows.push(row); await page.close();
  }
  const result = { camera, time, rows, pass: rows.every(row => row.pass) };
  fs.writeFileSync(`${out}/lod-probe.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally { await browser.close(); }
