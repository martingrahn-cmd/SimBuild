#!/usr/bin/env node
// Attribute live JS allocations made by one public Democity restage. This is a diagnosis, not game code.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const out = process.env.OUT_DIR || 'shots/democity/r5f';
const executablePath = process.env.SIM_CHROME || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', chromium.executablePath(),
].find(p => fs.existsSync(p));
const browser = await chromium.launch({ executablePath, headless: true, args: [
  '--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu', '--ignore-gpu-blocklist', '--no-sandbox', '--window-size=1920,1080',
] });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.route('**/@vite/client', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto(`${base}/?showcase=democity&time=12&camera=aerial&seed=1337&quality=high&headless=1&speed=0`, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('HeapProfiler.enable');
  await cdp.send('HeapProfiler.collectGarbage');
  const before = await cdp.send('Runtime.getHeapUsage');
  await cdp.send('HeapProfiler.startSampling', { samplingInterval: 32768, includeObjectsCollectedByMajorGC: false, includeObjectsCollectedByMinorGC: false });
  const restage = await page.evaluate(() => window.__sim.registry.apis.democity.restage({ seed: 7 }));
  await page.evaluate(async () => { const s = window.__sim, first = s.engine.stats.frames; while (s.engine.stats.frames < first + 24) await new Promise(requestAnimationFrame); });
  await cdp.send('HeapProfiler.collectGarbage');
  const after = await cdp.send('Runtime.getHeapUsage');
  const { profile } = await cdp.send('HeapProfiler.stopSampling');
  const rows = new Map();
  const visit = node => {
    const f = node.callFrame || {}, url = f.url || '(native/unknown)';
    const row = rows.get(url) || { url, selfSize: 0, samples: 0, functions: new Map() };
    row.selfSize += node.selfSize || 0;
    row.samples += 1;
    const label = `${f.functionName || '(anonymous)'}:${f.lineNumber ?? -1}`;
    row.functions.set(label, (row.functions.get(label) || 0) + (node.selfSize || 0));
    rows.set(url, row);
    for (const child of node.children || []) visit(child);
  };
  visit(profile.head);
  const allocations = [...rows.values()].map(row => ({
    url: row.url, selfMB: +(row.selfSize / 1048576).toFixed(2), samples: row.samples,
    topFunctions: [...row.functions.entries()].sort((a,b) => b[1] - a[1]).slice(0, 5).map(([name, bytes]) => ({ name, mb: +(bytes / 1048576).toFixed(2) })),
  })).sort((a,b) => b.selfMB - a.selfMB);
  const state = await page.evaluate(() => { const s = window.__sim, w = s.world;
    const surface = { ...s.registry.apis.roads.surfaceStats(), sampled: 0, valid: 0, maxDelta: 0 };
    for (const edge of w.roads.edges.values()) for (const t of [0.2, 0.5, 0.8]) {
      const p = w.roads.sample(edge.id, t), y = p && s.registry.apis.roads.surfaceHeightAt(p.x, p.z);
      if (!p || y === null) continue;
      surface.sampled++; surface.valid += Number.isFinite(y); surface.maxDelta = Math.max(surface.maxDelta, Math.abs(y - p.y));
    }
    return {
    errors: s.errors.slice(), stats: s.stats(), counts: { buildings: w.buildings.items.size, props: w.props.items.size, roads: w.roads.edges.size, services: w.services.items.size, zones: w.zones.cells.size },
    modules: Object.fromEntries([...s.registry.modules].map(([name, rec]) => [name, { status: rec.status, children: rec.group.children.length }])), surface
  }; });
  const result = { before, after, deltaUsedMB: +((after.usedSize - before.usedSize) / 1048576).toFixed(2), restage, allocationSampling: allocations.slice(0, 30), state, browserErrors: errors, pass: errors.length === 0 && state.errors.length === 0 };
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(`${out}/heap-profile.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally { await browser.close(); }
