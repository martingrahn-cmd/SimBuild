#!/usr/bin/env node
// R9a: disposable Props-owned LOD1 range census. No product source is changed.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const root = process.env.OUT_DIR || 'shots/democity/r9a-lod1-range';
const sourcePath = 'src/modules/props/chunks.js';
const source = fs.readFileSync(sourcePath, 'utf8');
const marker = 'const LOD0_R = 60, LOD1_R = 175, BAND = 12;';
if (source.split(marker).length !== 2) throw new Error('LOD range marker must occur exactly once');

const ranges = (process.env.RANGES || '175,190,205,220').split(',').map(Number);
if (ranges.some(r => !Number.isFinite(r) || r < 175 || r > 240)) throw new Error('RANGES must be finite values from 175 through 240');
const views = [
  { camera: 'park', time: 12 },
  { camera: 'riverfront', time: 12 },
  { camera: 'aerial', time: 12 },
];
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const chrome = process.env.SIM_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
fs.mkdirSync(root, { recursive: true });

const browser = await chromium.launch({
  executablePath: chrome,
  headless: true,
  args: ['--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--no-sandbox'],
});
const result = {
  method: 'fresh actual-Chrome Metal page per routed LOD1 range/view; no screenshots and no product source change',
  sourcePath,
  sourceSha256: sha(source),
  marker,
  ranges,
  cap1: 520,
  views: [],
  pass: false,
};

try {
  for (const range of ranges) for (const view of views) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const errors = [], warnings = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); else if (m.type() === 'warning') warnings.push(m.text()); });
    page.on('response', r => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });
    await page.route('**/@vite/client', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await page.route('**/src/modules/props/chunks.js*', async route => {
      const response = await route.fetch();
      let body = await response.text();
      if (!body.includes(marker)) throw new Error('transformed LOD range marker missing');
      if (range !== 175) body = body.replace(marker, `const LOD0_R = 60, LOD1_R = ${range}, BAND = 12;`);
      await route.fulfill({ response, body, contentType: 'application/javascript' });
    });
    const url = `${base}/?showcase=democity&time=${view.time}&camera=${view.camera}&seed=1337&quality=high&speed=0&headless=1`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 180000 });
    const settledFrames = await page.evaluate(async () => {
      const s = window.__sim, start = s.engine.stats.frames;
      let last = start, lastAt = performance.now();
      while (s.engine.stats.frames < start + 24) {
        await Promise.race([new Promise(requestAnimationFrame), new Promise(r => setTimeout(r, 1000))]);
        if (s.engine.stats.frames !== last) { last = s.engine.stats.frames; lastAt = performance.now(); }
        else if (performance.now() - lastAt > 15000) throw Error(`render stalled at ${last}`);
      }
      return s.engine.stats.frames - start;
    });
    const data = await page.evaluate(() => {
      const s = window.__sim;
      const props = s.registry.apis.props;
      return {
        ready: s.ready,
        stats: s.stats(),
        simErrors: [...(s.errors || [])],
        lod: props?.debug?.lodHistogram?.() || null,
        api: !!props,
      };
    });
    const row = {
      range,
      ...view,
      url,
      settledFrames,
      ...data,
      errors: [...new Set([...errors, ...(data.simErrors || [])])],
      warnings: [...new Set(warnings)],
    };
    result.views.push(row);
    fs.writeFileSync(path.join(root, `range${range}_${view.camera}.json`), JSON.stringify(row, null, 2));
    await page.close();
  }
} finally {
  await browser.close();
}

result.pass = result.views.length === ranges.length * views.length && result.views.every(v => v.ready && v.api && v.errors.length === 0);
fs.writeFileSync(path.join(root, 'census.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({
  root,
  pass: result.pass,
  sourceSha256: result.sourceSha256,
  views: result.views.map(v => ({ range: v.range, camera: v.camera, lod: v.lod, draws: v.stats?.drawCalls, triangles: v.stats?.triangles, fps: v.stats?.fps, errors: v.errors.length })),
}, null, 2));
