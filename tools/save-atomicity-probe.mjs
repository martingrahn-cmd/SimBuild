#!/usr/bin/env node
// Force a late owner rejection after an earlier terrain mutation and verify rollback.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const out = process.env.OUT_FILE || 'shots/integration/save-atomicity-r1.json';
const executablePath = process.env.SIM_CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', chromium.executablePath()].find(p => fs.existsSync(p));
const browser = await chromium.launch({ executablePath, headless: true, args: ['--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu', '--ignore-gpu-blocklist', '--no-sandbox'] });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), browserErrors = [];
  page.on('pageerror', e => browserErrors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') browserErrors.push(m.text()); });
  await page.route('**/@vite/client', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto(`${base}/?showcase=democity&time=12&camera=aerial&quality=high&headless=1&speed=0`, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });
  const result = await page.evaluate(async () => {
    const s = window.__sim, clone = v => structuredClone(v), events = { restoring: 0, rolledBack: [], loaded: 0, finished: 0 };
    // Traffic intentionally advances in real time even at simulation speed 0. Freeze the whole
    // update/render loop so the rollback comparison measures save ownership rather than elapsed UI time.
    s.freeze();
    // Compare rollback against the same canonical state produced by one ordinary valid load.
    const initial = clone(s.saves.serialize());
    await s.saves.restore(initial);
    const before = clone(s.saves.serialize());
    s.events.on('save:restoring', () => events.restoring++, 'atomicity-probe');
    s.events.on('save:rolled-back', e => events.rolledBack.push(e), 'atomicity-probe');
    s.events.on('save:loaded', () => events.loaded++, 'atomicity-probe');
    s.events.on('save:restore-finished', () => events.finished++, 'atomicity-probe');
    const target = clone(before);
    const terrainText = atob(target.modules.terrain.heights), bytes = Uint8Array.from(terrainText, c => c.charCodeAt(0)), view = new DataView(bytes.buffer);
    const terrainBefore = view.getFloat32(0, true); view.setFloat32(0, terrainBefore + 7, true);
    let changed = ''; for (let i = 0; i < bytes.length; i += 32768) changed += String.fromCharCode(...bytes.subarray(i, i + 32768));
    target.modules.terrain.heights = btoa(changed);
    target.modules.transit = { version: 1, lines: [{ invalid: true }], stops: [] };
    target.time.hour = 3.25; target.time.day = 99;
    let rejection = null;
    try { await s.saves.restore(target); } catch (e) { rejection = String(e?.message || e); }
    const afterRejected = clone(s.saves.serialize());
    const perModule = Object.fromEntries(Object.keys(before.modules).map(name => [name, JSON.stringify(afterRejected.modules[name]) === JSON.stringify(before.modules[name])]));
    const firstDiff = (a, b, path = '') => {
      if (Object.is(a, b)) return null;
      if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return { path, before: a, after: b };
      const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
      for (const key of keys) { const diff = firstDiff(a[key], b[key], path ? `${path}.${key}` : key); if (diff) return diff; }
      return null;
    };
    const moduleExact = Object.values(perModule).every(Boolean);
    const timeExact = JSON.stringify(afterRejected.time) === JSON.stringify(before.time);
    const cameraExact = JSON.stringify(afterRejected.camera) === JSON.stringify(before.camera);
    const terrainAfter = s.world.terrain.heights[0];
    let validRestore = false;
    try { await s.saves.restore(before); validRestore = true; } catch { validRestore = false; }
    s.events.offOwner('atomicity-probe');
    const differentModules = Object.entries(perModule).filter(([, exact]) => !exact).map(([name]) => name);
    return { rejection, terrainBefore, terrainAfter, moduleExact, perModule, differentModules, firstDifference: moduleExact ? null : firstDiff(before.modules, afterRejected.modules), timeExact, cameraExact, validRestore, events, errors: s.errors.slice() };
  });
  result.browserErrors = browserErrors;
  result.pass = !!result.rejection?.includes('Previous city restored') && result.terrainAfter === result.terrainBefore && result.moduleExact && result.timeExact && result.cameraExact && result.validRestore && result.events.restoring === 2 && result.events.rolledBack.length === 1 && result.events.loaded === 1 && result.events.finished === 2;
  fs.mkdirSync(out.slice(0, out.lastIndexOf('/')), { recursive: true }); fs.writeFileSync(out, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally { await browser.close(); }
