#!/usr/bin/env node
// Count genuine traffic-owner vehicles/pedestrians near the standard street camera target.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const out = process.env.OUT_DIR || 'shots/democity/activity-probe';
const file = process.env.OUT_FILE || 'activity.json';
const hours = (process.env.HOURS || '12,17.5,22').split(',').map(Number);
const forcedDensity = process.env.TRAFFIC_DENSITY === undefined ? null : Number(process.env.TRAFFIC_DENSITY);
const executablePath = process.env.SIM_CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', chromium.executablePath()].find(p => fs.existsSync(p));
const browser = await chromium.launch({ executablePath, headless: true, args: ['--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu', '--ignore-gpu-blocklist', '--no-sandbox'] });

try {
  const rows = [];
  for (const hour of hours) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } }), browserErrors = [];
    page.on('pageerror', e => browserErrors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') browserErrors.push(m.text()); });
    await page.route('**/@vite/client', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await page.goto(`${base}/?showcase=democity&time=${hour}&camera=street&seed=1337&quality=high&headless=1&speed=0`, { waitUntil: 'domcontentloaded', timeout: 240000 });
    await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });
    if (Number.isFinite(forcedDensity)) await page.evaluate((density) => {
      const traffic = window.__sim.registry.get('traffic').api;
      traffic.setDensity(density);
      traffic.step(120);
    }, forcedDensity);
    const row = await page.evaluate(() => {
      const s = window.__sim, w = s.world, target = s.camera.target;
      const nearby = [...w.traffic.vehicles.values()].filter(v => Math.hypot(v.x - target.x, v.z - target.z) <= 150);
      const peds = [...w.traffic.pedestrians.values()].filter(v => Math.hypot(v.x - target.x, v.z - target.z) <= 150);
      return { hour: w.time.hour, target: [target.x, target.z], vehicles: nearby.length, kinds: [...new Set(nearby.map(v => v.kind))].sort(), pedestrians: peds.length, totalVehicles: w.traffic.vehicles.size, trafficStats: s.registry.get('traffic').api.stats(), errors: s.errors.slice() };
    });
    row.browserErrors = browserErrors; rows.push(row); await page.close();
  }
  const result = { rows, pass: rows.every(r => r.vehicles >= 12 && r.kinds.length >= 5 && r.pedestrians >= 8 && !r.errors.length && !r.browserErrors.length) };
  fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(`${out}/${file}`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally { await browser.close(); }
