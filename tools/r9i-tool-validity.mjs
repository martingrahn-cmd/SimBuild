#!/usr/bin/env node
// R9i: ask the shipped road tool whether the measured alley is a valid player action.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const root = process.env.OUT_DIR || 'shots/democity/r9i-actual-frontage/final-v1';
const chrome = process.env.SIM_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const endpoints = {
  1337: [{ x: -672, z: -848 }, { x: -600, z: -848 }],
  7: [{ x: -672, z: -832 }, { x: -600, z: -832 }],
};
fs.mkdirSync(root, { recursive: true });
const browser = await chromium.launch({ executablePath: chrome, headless: true, args: [
  '--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu',
  '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--no-sandbox',
] });
const result = { method: 'fresh unchanged product; public Tools API draft only; no commit', runs: [], errors: [], pass: false };

try {
  for (const seed of [1337, 7]) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const browserErrors = [];
    page.on('pageerror', e => browserErrors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') browserErrors.push(m.text()); });
    page.on('response', r => { if (r.status() >= 400) browserErrors.push(`HTTP ${r.status()} ${r.url()}`); });
    try {
      await page.goto(`${base}/?showcase=democity&time=12&camera=aerial&seed=${seed}&quality=high&speed=0&headless=1`, { waitUntil: 'domcontentloaded', timeout: 240000 });
      await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });
      const state = await page.evaluate(({ a, b }) => {
        const s = window.__sim, tools = s.registry.apis.tools;
        const before = { roads: s.world.roads.edges.size, lots: s.world.zones.lots.size, buildings: s.world.buildings.items.size };
        tools.select('road', { type: 'alley', mode: 'straight', elevation: 0, oneWay: false, snap: ['magnet'] });
        const firstPointer = tools.pointer(a.x, a.z);
        const firstClick = tools.click(0);
        const secondPointer = tools.pointer(b.x, b.z);
        const draft = tools.state();
        const after = { roads: s.world.roads.edges.size, lots: s.world.zones.lots.size, buildings: s.world.buildings.items.size };
        const errors = [...s.errors];
        const midpoint = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
        const y = s.world.terrain.getHeight(midpoint.x, midpoint.z);
        s.setCamera({ target: [midpoint.x, y + 5, midpoint.z], yaw: 0.72, pitch: 0.55, distance: 150 });
        return { before, firstPointer, firstClick, secondPointer, draft, after, errors, midpoint };
      }, { a: endpoints[seed][0], b: endpoints[seed][1] });
      await page.evaluate(async () => { const start = window.__sim.engine.stats.frames; while (window.__sim.engine.stats.frames < start + 12) await new Promise(requestAnimationFrame); });
      const image = path.join(root, `tool_draft_seed${seed}.png`);
      await page.screenshot({ path: image, type: 'png', timeout: 180000 });
      result.runs.push({ seed, endpoints: endpoints[seed], ...state, image, browserErrors });
    } finally { await page.close(); }
  }
} catch (error) { result.errors.push(String(error?.stack || error)); }
finally { await browser.close(); }

result.pass = result.errors.length === 0 && result.runs.length === 2 && result.runs.every(r =>
  !r.browserErrors.length && !r.errors.length && r.draft.valid === false && /Grade/.test(r.draft.reason || '') &&
  JSON.stringify(r.before) === JSON.stringify(r.after));
fs.writeFileSync(path.join(root, 'tool-validity.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
