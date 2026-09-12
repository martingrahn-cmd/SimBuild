#!/usr/bin/env node
// Attribute the planar-water reflection pass by module group without altering game code.
// Usage: SIM_URL=http://127.0.0.1:5173 SIM_GL=metal node tools/reflection-profile.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const gl = process.env.SIM_GL || 'swiftshader';
const executablePath = process.env.SIM_CHROME || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', chromium.executablePath(),
].find(p => fs.existsSync(p));
const browser = await chromium.launch({ executablePath, headless: true, args: [
  `--use-angle=${gl}`, '--ignore-gpu-blocklist', '--enable-webgl', '--enable-gpu', '--enable-gpu-rasterization', '--use-gl=angle', '--no-sandbox', '--window-size=1920,1080',
] });
const targets = [null, 'props', 'traffic', 'services', 'roads', 'buildings', 'transit'];
const result = { url: base, camera: 'aerial', time: 22, targets: [] };
try {
  for (const name of targets) {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.route('**/@vite/client', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await page.goto(`${base}/?showcase=democity&time=22&camera=aerial&seed=1337&quality=high&headless=1&speed=0`, { waitUntil: 'domcontentloaded', timeout: 240000 });
    await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });
    const row = await page.evaluate(async (target) => {
      const s = window.__sim, r = s.engine.renderer, original = r.render.bind(r), samples = [];
      const group = target ? s.registry.get(target)?.group : null;
      let suppress = false;
      r.render = (scene, camera) => {
        const reflection = camera !== s.camera.camera && camera.position.y < -1;
        if (!reflection) return original(scene, camera);
        const wasVisible = group?.visible;
        if (group) group.visible = false;
        const before = { calls: r.info.render.calls, triangles: r.info.render.triangles };
        original(scene, camera);
        samples.push({ calls: r.info.render.calls - before.calls, triangles: r.info.render.triangles - before.triangles });
        if (group) group.visible = wasVisible;
      };
      const start = s.engine.stats.frames;
      while (s.engine.stats.frames < start + 40) await new Promise(requestAnimationFrame);
      r.render = original;
      const peak = samples.reduce((a, v) => !a || v.triangles > a.triangles ? v : a, null);
      return { reflections: samples.length, peak, all: samples };
    }, name);
    result.targets.push({ target: name || 'baseline', ...row, errors });
    await context.close();
  }
  result.pass = result.targets.every(r => r.errors.length === 0 && r.reflections >= 4);
  fs.mkdirSync('shots/democity/r5e', { recursive: true });
  fs.writeFileSync('shots/democity/r5e/reflection-profile.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally { await browser.close(); }
