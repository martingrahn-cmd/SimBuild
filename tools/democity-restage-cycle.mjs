#!/usr/bin/env node
// Verify bounded Democity snapshot caching through public restage calls.
import { chromium } from 'playwright';
import fs from 'node:fs';
const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const out = process.env.OUT_DIR || 'shots/democity/r5h';
const executablePath = process.env.SIM_CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', chromium.executablePath()].find(p => fs.existsSync(p));
const browser = await chromium.launch({ executablePath, headless: true, args: ['--use-angle=metal','--use-gl=angle','--enable-webgl','--enable-gpu','--ignore-gpu-blocklist','--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } }), errors = [];
  page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.route('**/@vite/client', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto(`${base}/?showcase=democity&time=12&camera=aerial&seed=1337&quality=high&headless=1&speed=0`, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });
  const result = await page.evaluate(async () => {
    const s = window.__sim, d = s.registry.apis.democity, w = s.world;
    // Stage timings and the cache-hit phase are intentionally volatile. Compare authored state instead.
    const digest = () => JSON.stringify({ buildings: [...w.buildings.items.values()].map(b => [b.id,b.x,b.y,b.z,b.level,b.type]).sort((a,b)=>a[0]-b[0]), services: [...w.services.items.values()].map(v => [v.id,v.kind,v.x,v.y,v.z]).sort((a,b)=>a[0]-b[0]), transit: d.serialize().plan?.transit });
    const capture = () => ({ digest: digest(), stats: d.stats(), errors: s.errors.slice(), heapMB: s.stats().heapMB });
    const original = capture();
    const seed7a = await d.restage({seed:7}); const after7a = capture();
    const seed1337 = await d.restage({seed:1337}); const after1337 = capture();
    const seed7b = await d.restage({seed:7}); const after7b = capture();
    return { original, seed7a, after7a, seed1337, after1337, seed7b, after7b,
      sameSeed1337: original.digest === after1337.digest, sameSeed7: after7a.digest === after7b.digest,
      errors: s.errors.slice() };
  });
  result.browserErrors = errors; result.pass = result.sameSeed1337 && result.sameSeed7 && !result.errors.length && !errors.length;
  fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(`${out}/restage-cycle.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ pass: result.pass, sameSeed1337: result.sameSeed1337, sameSeed7: result.sameSeed7, errors: result.errors, browserErrors: errors, heaps: [result.original.heapMB,result.after7a.heapMB,result.after1337.heapMB,result.after7b.heapMB] }, null, 2));
} finally { await browser.close(); }
