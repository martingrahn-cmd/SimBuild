#!/usr/bin/env node
// Interleave fresh-page legacy/candidate runs while timing the exact Props update callback.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const out = process.env.OUT_FILE || 'shots/democity/signal-key-ab-profile.json';
const camera = process.env.CAMERA || 'interchange';
const time = Number(process.env.TIME || 22);
const frames = Number(process.env.SAMPLE_FRAMES || 360);
const warmFrames = Number(process.env.WARM_FRAMES || 90);
const moveCamera = process.env.MOVE_CAMERA === '1';
const order = (process.env.ORDER || 'legacy,candidate,candidate,legacy,legacy,candidate').split(',');
const trafficSource = fs.readFileSync(new URL('../src/modules/traffic/index.js', import.meta.url), 'utf8');
const marker = '  signalKey(){';
if (!trafficSource.includes(marker)) throw new Error('Current Traffic source does not contain the signalKey marker');
const legacySource = trafficSource.replace(marker, '  legacySignalKey(){');
const executablePath = process.env.SIM_CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', chromium.executablePath()].find(path => fs.existsSync(path));
const browser = await chromium.launch({ executablePath, headless: true, args: ['--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu', '--ignore-gpu-blocklist', '--no-sandbox'] });
const runs = [];

try {
  for (let runIndex = 0; runIndex < order.length; runIndex++) {
    const variant = order[runIndex];
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const browserErrors = [];
    page.on('pageerror', error => browserErrors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()); });
    await page.route('**/@vite/client', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    if (variant === 'legacy') {
      await page.route('**/src/modules/traffic/index.js*', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: legacySource }));
    }
    await page.goto(`${base}/?showcase=democity&time=${time}&camera=${camera}&seed=1337&quality=high&headless=1&speed=0`, { waitUntil: 'domcontentloaded', timeout: 240000 });
    await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });
    const measurement = await page.evaluate(async ({ frames, warmFrames, moveCamera }) => {
      const sim = window.__sim;
      const rec = sim.registry.get('props');
      const controller = rec.ctx.camera;
      const original = rec.def.update;
      const samples = [];
      rec.def.update = function timedPropsUpdate(...args) {
        const start = performance.now();
        try { return original.apply(this, args); }
        finally { samples.push(performance.now() - start); }
      };
      const waitFrames = async count => {
        const start = sim.engine.stats.frames;
        while (sim.engine.stats.frames < start + count) {
          if (moveCamera) controller.yaw += 0.0005;
          await new Promise(requestAnimationFrame);
        }
      };
      try {
        await waitFrames(warmFrames);
        samples.length = 0;
        const startFrame = sim.engine.stats.frames;
        const startedAt = performance.now();
        let lastFrame = startFrame;
        let sampledFrames = 0;
        let drawSum = 0;
        let triangleSum = 0;
        while (sim.engine.stats.frames < startFrame + frames) {
          if (moveCamera) controller.yaw += 0.0005;
          await new Promise(requestAnimationFrame);
          const frame = sim.engine.stats.frames;
          if (frame === lastFrame) continue;
          sampledFrames += frame - lastFrame;
          lastFrame = frame;
          drawSum += sim.engine.stats.drawCalls;
          triangleSum += sim.engine.stats.triangles;
        }
        const elapsedMs = performance.now() - startedAt;
        const sorted = samples.slice().sort((a, b) => a - b);
        const pick = p => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0;
        const totalMs = samples.reduce((sum, value) => sum + value, 0);
        return {
          sampledFrames,
          elapsedMs,
          fps: sampledFrames / (elapsedMs / 1000),
          props: { samples: samples.length, totalMs, meanMs: totalMs / samples.length, p50Ms: pick(0.5), p95Ms: pick(0.95), p99Ms: pick(0.99), maxMs: sorted.at(-1) ?? 0 },
          averageDrawCalls: drawSum / sampledFrames,
          averageTriangles: triangleSum / sampledFrames,
          signalKeyType: typeof sim.registry.apis.traffic.signalKey,
          errors: sim.errors.slice(),
        };
      } finally {
        rec.def.update = original;
      }
    }, { frames, warmFrames, moveCamera });
    runs.push({ runIndex, variant, ...measurement, browserErrors });
    await page.close();
  }
  const summary = {};
  const median = values => values.slice().sort((a, b) => a - b)[Math.floor(values.length / 2)];
  for (const variant of ['legacy', 'candidate']) {
    const set = runs.filter(run => run.variant === variant);
    summary[variant] = {
      runs: set.length,
      medianFps: median(set.map(run => run.fps)),
      medianPropsMeanMs: median(set.map(run => run.props.meanMs)),
      medianPropsP95Ms: median(set.map(run => run.props.p95Ms)),
      averageDrawCallsRange: [Math.min(...set.map(run => run.averageDrawCalls)), Math.max(...set.map(run => run.averageDrawCalls))],
      averageTrianglesRange: [Math.min(...set.map(run => run.averageTriangles)), Math.max(...set.map(run => run.averageTriangles))],
    };
  }
  summary.delta = {
    fps: summary.candidate.medianFps - summary.legacy.medianFps,
    fpsPct: (summary.candidate.medianFps / summary.legacy.medianFps - 1) * 100,
    propsMeanMs: summary.candidate.medianPropsMeanMs - summary.legacy.medianPropsMeanMs,
    propsMeanPct: (summary.candidate.medianPropsMeanMs / summary.legacy.medianPropsMeanMs - 1) * 100,
  };
  const result = { method: 'six interleaved fresh pages; legacy route renames signalKey so Props uses its unchanged fallback', url: base, camera, time, frames, warmFrames, moveCamera, order, runs, summary };
  result.pass = runs.every(run => run.errors.length === 0 && run.browserErrors.length === 0 && (run.variant === 'legacy' ? run.signalKeyType === 'undefined' : run.signalKeyType === 'function'));
  fs.mkdirSync(out.split('/').slice(0, -1).join('/') || '.', { recursive: true });
  fs.writeFileSync(out, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ pass: result.pass, summary, runs: runs.map(run => ({ variant: run.variant, fps: run.fps, propsMeanMs: run.props.meanMs, propsP95Ms: run.props.p95Ms, drawCalls: run.averageDrawCalls, triangles: run.averageTriangles })) }, null, 2));
} finally {
  await browser.close();
}
