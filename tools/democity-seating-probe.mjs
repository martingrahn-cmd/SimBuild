#!/usr/bin/env node
// Measure real Democity building and landmark bases against the current terrain heightfield.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const out = process.env.OUT_DIR || 'shots/democity/seating-probe';
const file = process.env.OUT_FILE || 'seating.json';
const seed = Number(process.env.SEED || 1337);
const executablePath = process.env.SIM_CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', chromium.executablePath()].find(p => fs.existsSync(p));
const browser = await chromium.launch({ executablePath, headless: true, args: ['--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu', '--ignore-gpu-blocklist', '--no-sandbox'] });

try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } }), browserErrors = [];
  page.on('pageerror', e => browserErrors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') browserErrors.push(m.text()); });
  await page.route('**/@vite/client', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto(`${base}/?showcase=democity&time=12&camera=aerial&seed=${seed}&quality=high&headless=1&speed=0`, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });
  const result = await page.evaluate(() => {
    const s = window.__sim, w = s.world, plan = s.registry.apis.democity.serialize().plan;
    const corners = (x, z, width, depth, heading = 0) => [-1, 1].flatMap(i => [-1, 1].map(j => {
      const lx = i * width / 2, lz = j * depth / 2, c = Math.cos(heading), q = Math.sin(heading);
      return w.terrain.getHeight(x + c * lx + q * lz, z + q * lx - c * lz);
    }));
    const check = (id, y, x, z, width, depth, heading) => {
      const hs = corners(x, z, width, depth, heading), maxGround = Math.max(...hs), minGround = Math.min(...hs);
      return { id, gap: y - maxGround, maxGround, minGround, base: y };
    };
    const buildings = [...w.buildings.items.values()].map(b => check(b.id, b.y, b.x, b.z, b.footprint.w, b.footprint.d, b.heading));
    const landmarks = (plan?.landmarks || []).map(l => check(l.id, l.y, l.x, l.z, l.w, l.d, l.heading || 0));
    const summary = items => ({ count: items.length, maxGap: Math.max(...items.map(v => v.gap)), minGap: Math.min(...items.map(v => v.gap)), over025: items.filter(v => v.gap > .25).sort((a, b) => b.gap - a.gap).slice(0, 20), below0: items.filter(v => v.gap < 0).sort((a, b) => a.gap - b.gap).slice(0, 20) });
    return { seed: w.seed, buildings: summary(buildings), landmarks: summary(landmarks), errors: s.errors.slice() };
  });
  result.browserErrors = browserErrors;
  result.pass = result.buildings.over025.length === 0 && result.buildings.below0.length === 0 && result.landmarks.over025.length === 0 && result.landmarks.below0.length === 0 && !result.errors.length && !browserErrors.length;
  fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(`${out}/${file}`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  await page.close();
} finally { await browser.close(); }
