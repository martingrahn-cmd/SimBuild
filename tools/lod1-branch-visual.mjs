#!/usr/bin/env node
// R8z: disposable accepted/candidate visual capture for one LOD1 primary-branch whorl.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const root = process.env.OUT_DIR || 'shots/democity/r8z-lod1-branches';
const sourcePath = 'src/modules/props/trees.js';
const source = fs.readFileSync(sourcePath, 'utf8');
const marker = 'const whorls = near ? [0.29, 0.47, 0.64] : [];';
if ((source.match(new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length !== 1) throw new Error('LOD1 whorl marker must occur once');
const candidate = source.replace(marker, 'const whorls = near ? [0.29, 0.47, 0.64] : [0.42];');
const variants = [{ id: 'accepted', body: source }, { id: 'candidate', body: candidate }];
const views = [{ camera: 'park', time: 12 }, { camera: 'park', time: 22 }, { camera: 'riverfront', time: 12 }];
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const chrome = process.env.SIM_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
fs.mkdirSync(root, { recursive: true });
const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--no-sandbox'] });
const result = { method: 'fresh actual-Chrome Metal page per accepted/candidate view; routed trees.js only', sourcePath, sourceSha256: sha(source), candidateSha256: sha(candidate), marker, views: [], pass: false };
try {
  for (const variant of variants) for (const view of views) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const errors = [], warnings = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); else if (m.type() === 'warning') warnings.push(m.text()); });
    page.on('response', r => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });
    await page.route('**/@vite/client', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await page.route('**/src/modules/props/trees.js*', async r => {
      // Let Vite resolve bare package imports first; routing the raw source would leave `three`
      // unresolved in the browser and produce an invalid no-Props frame.
      const response = await r.fetch();
      let body = await response.text();
      if (!body.includes(marker)) throw new Error('transformed LOD1 whorl marker missing');
      if (variant.id === 'candidate') body = body.replace(marker, 'const whorls = near ? [0.29, 0.47, 0.64] : [0.42];');
      await r.fulfill({ response, body, contentType: 'application/javascript' });
    });
    const url = `${base}/?showcase=democity&time=${view.time}&camera=${view.camera}&seed=1337&quality=high&speed=0&headless=1`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 180000 });
    const settledFrames = await page.evaluate(async () => {
      const s = window.__sim, start = s.engine.stats.frames; let last = start, lastAt = performance.now();
      while (s.engine.stats.frames < start + 24) {
        await Promise.race([new Promise(requestAnimationFrame), new Promise(r => setTimeout(r, 1000))]);
        if (s.engine.stats.frames !== last) { last = s.engine.stats.frames; lastAt = performance.now(); }
        else if (performance.now() - lastAt > 15000) throw Error(`render stalled at ${last}`);
      }
      return s.engine.stats.frames - start;
    });
    const data = await page.evaluate(() => {
      const s = window.__sim, st = s.stats(), p = s.registry.apis.props;
      const g = s.registry.records?.get?.('props')?.ctx?.modules?.props;
      return { ready: s.ready, stats: st, simErrors: [...(s.errors || [])], lod: p?.debug?.lodHistogram?.() || null, apiKeys: p ? Object.keys(p).sort() : [], own: g?.stats?.() || null };
    });
    const name = `${variant.id}_${view.camera}_${String(view.time).replace('.', 'p')}`;
    const png = path.join(root, `${name}.png`), json = path.join(root, `${name}.json`);
    await page.evaluate(() => window.__sim?.freeze?.());
    await page.screenshot({ path: png, type: 'png', timeout: 180000 });
    const row = { variant: variant.id, ...view, url, png, settledFrames, ...data, errors: [...new Set([...errors, ...(data.simErrors || [])])], warnings: [...new Set(warnings)] };
    fs.writeFileSync(json, JSON.stringify(row, null, 2)); result.views.push(row);
    await page.close();
  }
} finally { await browser.close(); }
result.pass = result.views.length === variants.length * views.length && result.views.every(v => v.ready && v.errors.length === 0);
fs.writeFileSync(path.join(root, 'summary.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ root, pass: result.pass, sourceSha256: result.sourceSha256, candidateSha256: result.candidateSha256, views: result.views.map(v => ({ variant: v.variant, camera: v.camera, time: v.time, draws: v.stats?.drawCalls, triangles: v.stats?.triangles, fps: v.stats?.fps, heap: v.stats?.heapMB, lod: v.lod, errors: v.errors.length })) }, null, 2));
