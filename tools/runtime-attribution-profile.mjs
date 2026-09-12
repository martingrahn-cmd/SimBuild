#!/usr/bin/env node
// Attribute sampled CPU time and JS allocations to source functions without changing game code.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const out = process.env.OUT_FILE || 'shots/democity/runtime-attribution-profile.json';
const camera = process.env.CAMERA || 'interchange';
const time = Number(process.env.TIME || 22);
const frames = Number(process.env.SAMPLE_FRAMES || 900);
const moveCamera = process.env.MOVE_CAMERA === '1';
const executablePath = process.env.SIM_CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', chromium.executablePath()].find(path => fs.existsSync(path));
const browser = await chromium.launch({ executablePath, headless: true, args: ['--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu', '--ignore-gpu-blocklist', '--no-sandbox'] });

const add = (map, key, amount) => map.set(key, (map.get(key) || 0) + amount);
const sourceKey = frame => `${frame.url || '<native>'}:${(frame.lineNumber ?? -1) + 1}:${frame.functionName || '<anonymous>'}`;

try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const browserErrors = [];
  page.on('pageerror', error => browserErrors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()); });
  await page.route('**/@vite/client', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto(`${base}/?showcase=democity&time=${time}&camera=${camera}&seed=1337&quality=high&headless=1&speed=0`, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Profiler.enable');
  await cdp.send('HeapProfiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 100 });
  await cdp.send('HeapProfiler.startSampling', { samplingInterval: 32768, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
  await cdp.send('Profiler.start');
  const frameResult = await page.evaluate(async ({ frames, moveCamera }) => {
    const sim = window.__sim;
    const controller = sim.registry.get('props')?.ctx?.camera;
    const start = sim.engine.stats.frames;
    const startedAt = performance.now();
    while (sim.engine.stats.frames < start + frames) {
      if (moveCamera && controller) controller.yaw += 0.0005;
      await new Promise(requestAnimationFrame);
    }
    const elapsedMs = performance.now() - startedAt;
    return { sampledFrames: sim.engine.stats.frames - start, elapsedMs, fps: (sim.engine.stats.frames - start) / (elapsedMs / 1000), errors: sim.errors.slice() };
  }, { frames, moveCamera });
  const { profile: cpuProfile } = await cdp.send('Profiler.stop');
  const { profile: heapProfile } = await cdp.send('HeapProfiler.stopSampling');

  const cpuNodes = new Map(cpuProfile.nodes.map(node => [node.id, node]));
  const cpu = new Map();
  for (let i = 0; i < (cpuProfile.samples || []).length; i++) {
    const node = cpuNodes.get(cpuProfile.samples[i]);
    if (node) add(cpu, sourceKey(node.callFrame), cpuProfile.timeDeltas?.[i] || 0);
  }
  const heap = new Map();
  const walk = node => {
    if (node.selfSize) add(heap, sourceKey(node.callFrame), node.selfSize);
    for (const child of node.children || []) walk(child);
  };
  walk(heapProfile.head);
  const rows = (map, field) => [...map].map(([source, value]) => ({ source, [field]: value })).sort((a, b) => b[field] - a[field]);
  const result = {
    url: base,
    camera,
    time,
    moveCamera,
    requestedFrames: frames,
    ...frameResult,
    cpuMicros: rows(cpu, 'microseconds'),
    allocatedBytes: rows(heap, 'bytes'),
    browserErrors,
  };
  result.pass = result.errors.length === 0 && browserErrors.length === 0;
  fs.mkdirSync(out.split('/').slice(0, -1).join('/') || '.', { recursive: true });
  fs.writeFileSync(out, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ pass: result.pass, fps: result.fps, cpuTop: result.cpuMicros.slice(0, 20), allocationsTop: result.allocatedBytes.slice(0, 20), errors: result.errors, browserErrors }, null, 2));
} finally {
  await browser.close();
}
