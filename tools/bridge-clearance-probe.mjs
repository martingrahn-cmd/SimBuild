#!/usr/bin/env node
// Measure the real public road surface on Democity's authored river-crossing edges.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const out = process.env.OUT_DIR || 'shots/democity/bridge-probe';
const file = process.env.OUT_FILE || 'bridge-clearance.json';
const executablePath = process.env.SIM_CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', chromium.executablePath()].find(p => fs.existsSync(p));
const browser = await chromium.launch({ executablePath, headless: true, args: ['--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu', '--ignore-gpu-blocklist', '--no-sandbox'] });

try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } }), browserErrors = [];
  page.on('pageerror', e => browserErrors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') browserErrors.push(m.text()); });
  await page.route('**/@vite/client', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto(`${base}/?showcase=democity&time=12&camera=bridge&seed=1337&quality=high&headless=1&speed=0`, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });
  const result = await page.evaluate(() => {
    const s = window.__sim, demo = s.registry.apis.democity, roads = s.registry.apis.roads, terrain = s.world.terrain;
    const bridgeIds = demo.serialize().plan?.corridors?.bridges || [];
    const bridges = bridgeIds.map(id => {
      const edge = roads.edgeDebug(id, 2);
      const samples = (edge?.rows || []).filter(r => r.water).map(r => {
        const deck = roads.surfaceHeightAt(r.x, r.z);
        return { x: r.x, z: r.z, profileY: r.y, deck, clearance: deck == null ? null : deck - terrain.seaLevel };
      }).filter(r => r.clearance != null);
      const min = samples.reduce((best, sample) => !best || sample.clearance < best.clearance ? sample : best, null);
      return { id, type: edge?.type, samples: samples.length, minClearance: min?.clearance ?? null, maxClearance: samples.length ? Math.max(...samples.map(r => r.clearance)) : null, minSample: min };
    });
    return { seaLevel: terrain.seaLevel, bridges, errors: s.errors.slice(), stats: s.stats() };
  });
  result.browserErrors = browserErrors;
  result.pass = result.bridges.length === 2 && result.bridges.every(b => b.samples > 0 && b.minClearance >= 3.5) && !result.errors.length && !browserErrors.length;
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(`${out}/${file}`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  await page.close();
} finally {
  await browser.close();
}
