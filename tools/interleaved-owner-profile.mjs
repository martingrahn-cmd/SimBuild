#!/usr/bin/env node
// R9k: repeated owner A/B masks with a fixed reflection policy and selectable capture readback.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const out = process.env.OUT_FILE || 'shots/democity/r9k-owner-sensitivity/profile.json';
const camera = process.env.CAMERA || 'interchange';
const time = Number(process.env.TIME || 22);
const frames = Number(process.env.SAMPLE_FRAMES || 120);
const warmFrames = Number(process.env.WARM_FRAMES || 120);
const cycles = Number(process.env.CYCLES || 3);
const owners = (process.env.OWNERS || 'terrain,props,roads,services,buildings,traffic,transit').split(',').filter(Boolean);
const reflection = process.env.REFLECTION !== 'off';
const captureSync = process.env.CAPTURE_SYNC !== 'off';
const uncapped = process.env.UNCAPPED === 'on';
const executablePath = process.env.SIM_CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', chromium.executablePath()].find(p => fs.existsSync(p));
const median = a => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];

const browser = await chromium.launch({ executablePath, headless: true, args: [
  '--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu',
  '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--no-sandbox',
  ...(uncapped ? ['--disable-frame-rate-limit', '--disable-gpu-vsync'] : []),
] });
const result = {
  method: 'one warmed page per owner; A0-B0-A1-B1-A2-B2-A3; group visibility locked during B; fixed reflection and capture-sync policy',
  url: base, camera, time, frames, warmFrames, cycles, reflection, captureSync, uncapped, owners: [], errors: [], pass: false,
};

try {
  for (const owner of owners) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const browserErrors = [];
    page.on('pageerror', e => browserErrors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') browserErrors.push(m.text()); });
    page.on('response', r => { if (r.status() >= 400) browserErrors.push(`HTTP ${r.status()} ${r.url()}`); });
    await page.route('**/@vite/client', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await page.goto(`${base}/?showcase=democity&time=${time}&camera=${camera}&seed=1337&quality=high&speed=0${captureSync ? '&headless=1' : ''}`, { waitUntil: 'domcontentloaded', timeout: 240000 });
    await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });
    const row = await page.evaluate(async ({ owner, frames, warmFrames, cycles, reflection }) => {
      const sim = window.__sim;
      const group = sim.registry.get(owner)?.group;
      if (!group) throw Error(`missing owner group ${owner}`);
      if (!reflection) sim.registry.apis.terrain.setReflection(false);
      const tri = o => o.geometry?.index ? o.geometry.index.count / 3 : (o.geometry?.attributes?.position?.count ?? 0) / 3;
      let objects = 0, visibleObjects = 0, sourceTriangles = 0;
      group.traverse(o => {
        if (!o.isMesh && !o.isPoints && !o.isLine) return;
        objects++;
        if (o.visible) visibleObjects++;
        if (o.visible) sourceTriangles += tri(o) * (o.isInstancedMesh ? o.count : 1);
      });
      const descriptor = Object.getOwnPropertyDescriptor(group, 'visible');
      let locked = false;
      const lock = () => {
        if (locked) return;
        Object.defineProperty(group, 'visible', { configurable: true, get: () => false, set: () => {} });
        locked = true;
      };
      const unlock = () => {
        if (!locked) return;
        if (descriptor) Object.defineProperty(group, 'visible', descriptor);
        else { delete group.visible; group.visible = true; }
        locked = false;
      };
      const wait = async n => { const start = sim.engine.stats.frames; while (sim.engine.stats.frames < start + n) await new Promise(requestAnimationFrame); };
      const sample = async (label, masked) => {
        masked ? lock() : unlock();
        const start = sim.engine.stats.frames, started = performance.now();
        let last = start, count = 0, samples = 0, draws = 0, triangles = 0;
        while (sim.engine.stats.frames < start + frames) {
          await new Promise(requestAnimationFrame);
          const f = sim.engine.stats.frames;
          if (f === last) continue;
          count += f - last; last = f; samples++;
          const stats = sim.stats(); draws += stats.drawCalls; triangles += stats.triangles;
        }
        return { label, masked, fps: count / ((performance.now() - started) / 1000), sampledFrames: count, samples,
          average: { drawCalls: draws / samples, triangles: triangles / samples }, errors: [...sim.errors] };
      };
      const blocks = [];
      try {
        await wait(warmFrames);
        blocks.push(await sample('A0', false));
        for (let i = 0; i < cycles; i++) { blocks.push(await sample(`B${i}`, true)); blocks.push(await sample(`A${i + 1}`, false)); }
        return { inventory: { objects, visibleObjects, sourceTriangles }, blocks };
      } finally { unlock(); group.visible = true; if (!reflection) sim.registry.apis.terrain.setReflection(true); }
    }, { owner, frames, warmFrames, cycles, reflection });
    const pairs = [];
    for (let i = 0; i < cycles; i++) {
      const before = row.blocks[i * 2], masked = row.blocks[i * 2 + 1], after = row.blocks[i * 2 + 2];
      const expected = (before.fps + after.fps) / 2;
      pairs.push({ cycle: i, expectedFps: expected, maskedFps: masked.fps, fpsPct: (masked.fps / expected - 1) * 100,
        controlDriftPct: Math.abs(after.fps - before.fps) / expected * 100,
        drawCalls: masked.average.drawCalls - (before.average.drawCalls + after.average.drawCalls) / 2,
        triangles: masked.average.triangles - (before.average.triangles + after.average.triangles) / 2 });
    }
    const stable = pairs.filter(p => p.controlDriftPct <= 5);
    const summary = {
      medianFpsPct: median(pairs.map(p => p.fpsPct)),
      stableMedianFpsPct: stable.length ? median(stable.map(p => p.fpsPct)) : null,
      maxControlDriftPct: Math.max(...pairs.map(p => p.controlDriftPct)),
      stableCycles: stable.length,
      medianDrawCalls: median(pairs.map(p => p.drawCalls)),
      medianTriangles: median(pairs.map(p => p.triangles)),
    };
    result.owners.push({ owner, ...row, pairs, summary, browserErrors });
    await page.close();
  }
} catch (error) { result.errors.push(String(error?.stack || error)); }
finally { await browser.close(); }

result.pass = result.errors.length === 0 && result.owners.length === owners.length && result.owners.every(r =>
  r.inventory.objects > 0 && r.summary.stableCycles >= 2 && !r.browserErrors.length && r.blocks.every(b => !b.errors.length));
fs.mkdirSync(out.split('/').slice(0, -1).join('/') || '.', { recursive: true });
fs.writeFileSync(out, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ pass: result.pass, reflection, captureSync, uncapped, errors: result.errors,
  rows: result.owners.map(r => ({ owner: r.owner, inventory: r.inventory, summary: r.summary, pairs: r.pairs, browserErrors: r.browserErrors })) }, null, 2));
if (!result.pass) process.exitCode = 1;
