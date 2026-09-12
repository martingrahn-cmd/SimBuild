#!/usr/bin/env node
// Verify planar-reflection cadence without modifying production state.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const gl = process.env.SIM_GL || 'metal';
const out = process.env.OUT_FILE || 'shots/democity/r6t-candidate-water-reflection4/cadence-probe.json';
const executablePath = process.env.SIM_CHROME || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', chromium.executablePath(),
].find(p => fs.existsSync(p));
const browser = await chromium.launch({ executablePath, headless: true, args: [
  `--use-angle=${gl}`, '--use-gl=angle', '--enable-webgl', '--enable-gpu',
  '--ignore-gpu-blocklist', '--no-sandbox', '--window-size=1920,1080',
] });

async function run(name, { speed, moving = false }) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const browserErrors = [];
  page.on('pageerror', e => browserErrors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') browserErrors.push(m.text()); });
  await page.route('**/@vite/client', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto(`${base}/?showcase=democity&time=12&camera=bridge&seed=1337&quality=high&headless=1&speed=${speed}`, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });
  const data = await page.evaluate(async ({ moving }) => {
    const s = window.__sim, renderer = s.engine.renderer, original = renderer.render.bind(renderer);
    const start = s.engine.stats.frames, reflectionFrames = [];
    renderer.render = (scene, camera) => {
      if (camera !== s.camera.camera && camera.position.y < -1) reflectionFrames.push(s.engine.stats.frames - start);
      return original(scene, camera);
    };
    let last = start;
    while (s.engine.stats.frames < start + 120) {
      if (moving) s.camera.yaw += 0.001;
      await new Promise(requestAnimationFrame);
      last = s.engine.stats.frames;
    }
    renderer.render = original;
    return {
      sampledFrames: last - start,
      reflectionFrames,
      reflectionCount: reflectionFrames.length,
      engineErrors: s.errors.slice(),
    };
  }, { moving });
  await page.close();
  return { name, speed, moving, ...data, browserErrors };
}

try {
  const cases = [];
  cases.push(await run('paused-fixed', { speed: 0 }));
  cases.push(await run('active-fixed', { speed: 1 }));
  cases.push(await run('active-moving-camera', { speed: 1, moving: true }));
  const byName = Object.fromEntries(cases.map(row => [row.name, row]));
  const pass = cases.every(row => !row.engineErrors.length && !row.browserErrors.length) &&
    byName['paused-fixed'].reflectionCount >= 13 && byName['paused-fixed'].reflectionCount <= 17 &&
    byName['active-fixed'].reflectionCount >= 28 && byName['active-fixed'].reflectionCount <= 32 &&
    byName['active-moving-camera'].reflectionCount >= 115;
  const result = { url: base, cases, pass };
  fs.mkdirSync(out.slice(0, out.lastIndexOf('/')), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = pass ? 0 : 1;
} finally {
  await browser.close();
}
