#!/usr/bin/env node
// Capture diagnostic night frames with one real emissive owner disabled at a time.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const out = process.env.OUT_DIR || 'shots/democity/night-source-profile';
const cameras = (process.env.CAMERAS || 'aerial,skyline').split(',');
const targets = (process.env.TARGETS || 'baseline,buildings,services,props,traffic').split(',');
const executablePath = process.env.SIM_CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', chromium.executablePath()].find(path => fs.existsSync(path));
const browser = await chromium.launch({ executablePath, headless: true, args: ['--use-angle=metal','--use-gl=angle','--enable-webgl','--enable-gpu','--ignore-gpu-blocklist','--no-sandbox'] });
fs.mkdirSync(out, { recursive: true });
const rows = [];

try {
  for (const camera of cameras) for (const target of targets) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const browserErrors = [];
    page.on('pageerror', error => browserErrors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()); });
    await page.route('**/@vite/client', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await page.goto(`${base}/?showcase=democity&time=22&camera=${camera}&seed=1337&quality=high&headless=1&speed=0`, { waitUntil: 'domcontentloaded', timeout: 240000 });
    await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });
    const data = await page.evaluate(async target => {
      const sim = window.__sim;
      let start = sim.engine.stats.frames;
      while (sim.engine.stats.frames < start + 36) await new Promise(requestAnimationFrame);
      // Use the owner's existing control so the compiled PBR shader and facade mass stay unchanged.
      if (target === 'buildings') sim.registry.apis.buildings.setLit(0);
      if (target === 'services') sim.registry.apis.services.setEmissive(false);
      if (target === 'props') {
        sim.registry.apis.props.debug.setPools(false);
        sim.registry.get('props').group.traverse(mesh => {
          for (const material of (Array.isArray(mesh.material) ? mesh.material : [mesh.material])) if (material?.emissive) material.emissive.setRGB(0, 0, 0);
        });
      }
      if (target === 'traffic') {
        sim.registry.apis.traffic.debug.setVisible('lamps', false);
        sim.registry.apis.traffic.debug.setVisible('pools', false);
        sim.registry.get('traffic').group.traverse(mesh => {
          for (const material of (Array.isArray(mesh.material) ? mesh.material : [mesh.material])) if (material?.emissive) material.emissive.setRGB(0, 0, 0);
        });
      }
      start = sim.engine.stats.frames;
      const settle = target === 'buildings' ? 1 : 12;
      while (sim.engine.stats.frames < start + settle) await new Promise(requestAnimationFrame);
      const stats = sim.stats();
      sim.freeze();
      return { stats, errors: sim.errors.slice() };
    }, target);
    await page.waitForTimeout(200);
    const png = `${out}/${camera}_22_${target}.png`;
    await page.screenshot({ path: png, type: 'png', timeout: 180000 });
    rows.push({ camera, target, png, stats: data.stats, errors: data.errors, browserErrors });
    console.log(`${camera} ${target} errors=${data.errors.length + browserErrors.length}`);
    await page.close();
  }
} finally {
  await browser.close();
}
const result = { rows, pass: rows.every(row => !row.errors.length && !row.browserErrors.length) };
fs.writeFileSync(`${out}/profile.json`, JSON.stringify(result, null, 2));
