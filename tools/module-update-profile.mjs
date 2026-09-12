#!/usr/bin/env node
// Measure update callbacks directly without changing module behavior or scene visibility.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const out = process.env.OUT_FILE || 'shots/democity/module-update-profile.json';
const camera = process.env.CAMERA || 'interchange';
const time = Number(process.env.TIME || 22);
const frames = Number(process.env.SAMPLE_FRAMES || 1200);
const moveCamera = process.env.MOVE_CAMERA === '1';
const executablePath = process.env.SIM_CHROME || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  chromium.executablePath(),
].find(path => fs.existsSync(path));
const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--no-sandbox'],
});

try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const browserErrors = [];
  page.on('pageerror', error => browserErrors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()); });
  await page.route('**/@vite/client', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto(`${base}/?showcase=democity&time=${time}&camera=${camera}&seed=1337&quality=high&headless=1&speed=0`, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });
  const profile = await page.evaluate(async ({ frames, moveCamera }) => {
    const sim = window.__sim;
    const records = new Map();
    const originals = [];
    for (const rec of sim.registry.modules.values()) {
      if (rec.status !== 'ready' || typeof rec.def.update !== 'function') continue;
      const original = rec.def.update;
      const samples = [];
      records.set(rec.def.name, samples);
      rec.def.update = function profiledUpdate(...args) {
        const startedAt = performance.now();
        try { return original.apply(this, args); }
        finally { samples.push(performance.now() - startedAt); }
      };
      originals.push([rec, original]);
    }
    const controller = sim.registry.get('props')?.ctx?.camera;
    const heap = [];
    const startFrame = sim.engine.stats.frames;
    const startedAt = performance.now();
    try {
      while (sim.engine.stats.frames < startFrame + frames) {
        if (moveCamera && controller) controller.yaw += 0.0005;
        await new Promise(requestAnimationFrame);
        const sampled = sim.engine.stats.frames - startFrame;
        if (sampled % 60 === 0 && performance.memory) heap.push({ frame: sampled, usedJSHeapSize: performance.memory.usedJSHeapSize, totalJSHeapSize: performance.memory.totalJSHeapSize });
      }
    } finally {
      for (const [rec, original] of originals) rec.def.update = original;
    }
    const percentile = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0;
    const modules = {};
    for (const [name, samples] of records) {
      const sorted = samples.slice().sort((a, b) => a - b);
      const sum = samples.reduce((a, b) => a + b, 0);
      modules[name] = {
        samples: samples.length,
        totalMs: sum,
        meanMs: sum / samples.length,
        p50Ms: percentile(sorted, 0.5),
        p95Ms: percentile(sorted, 0.95),
        p99Ms: percentile(sorted, 0.99),
        maxMs: sorted.at(-1) ?? 0,
      };
    }
    return {
      elapsedMs: performance.now() - startedAt,
      sampledFrames: sim.engine.stats.frames - startFrame,
      fps: (sim.engine.stats.frames - startFrame) / ((performance.now() - startedAt) / 1000),
      moveCamera,
      modules,
      heap,
      errors: sim.errors.slice(),
    };
  }, { frames, moveCamera });
  const result = { url: base, camera, time, requestedFrames: frames, ...profile, browserErrors };
  result.pass = result.errors.length === 0 && browserErrors.length === 0;
  fs.mkdirSync(out.split('/').slice(0, -1).join('/') || '.', { recursive: true });
  fs.writeFileSync(out, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ pass: result.pass, fps: result.fps, modules: Object.fromEntries(Object.entries(result.modules).sort((a, b) => b[1].totalMs - a[1].totalMs).slice(0, 8)), heap: result.heap }, null, 2));
} finally {
  await browser.close();
}
