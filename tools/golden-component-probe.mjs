#!/usr/bin/env node
// Same-page golden-hour visibility attribution. This never mutates saved or simulation state.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const out = process.env.OUT_DIR || 'shots/democity/golden-component-probe';
const executablePath = process.env.SIM_CHROME || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  chromium.executablePath(),
].find((candidate) => fs.existsSync(candidate));
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu', '--ignore-gpu-blocklist', '--no-sandbox'],
});

try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
  await page.route('**/@vite/client', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto(`${base}/?showcase=democity&time=17.5&camera=skyline&seed=1337&quality=high&headless=1&speed=0`, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });
  await page.evaluate(async () => {
    const start = window.__sim.engine.stats.frames;
    while (window.__sim.engine.stats.frames < start + 36) await new Promise(requestAnimationFrame);
  });

  const variants = [
    { name: 'baseline' },
    { name: 'no-sky', sky: false },
    { name: 'no-water', water: false },
    { name: 'no-direct-light', direct: false },
    { name: 'no-sky-no-water', sky: false, water: false },
  ];
  const rows = [];
  for (const variant of variants) {
    const state = await page.evaluate(async ({ sky = true, water = true, direct = true }) => {
      const sim = window.__sim;
      const skyMesh = sim.registry.get('environment')?.group?.getObjectByName('sky-dome');
      const waterMesh = sim.registry.get('terrain')?.group?.getObjectByName('water');
      if (skyMesh) skyMesh.visible = sky;
      if (waterMesh) waterMesh.visible = water;
      const environmentGroup = sim.registry.get('environment')?.group;
      environmentGroup?.traverse((object) => { if (object.name === 'sun-cascade') object.visible = direct; });
      const start = sim.engine.stats.frames;
      while (sim.engine.stats.frames < start + 4) await new Promise(requestAnimationFrame);
      sim.freeze();
      let directLights = 0;
      environmentGroup?.traverse((object) => { if (object.name === 'sun-cascade') directLights++; });
      return { skyFound: !!skyMesh, waterFound: !!waterMesh, directLights };
    }, variant);
    const file = path.join(out, `${variant.name}.png`);
    await page.screenshot({ path: file });
    await page.evaluate(() => window.__sim.unfreeze());
    rows.push({ name: variant.name, file, ...state });
  }
  const result = { pass: rows.every((row) => row.skyFound && row.waterFound), rows, browserErrors };
  fs.writeFileSync(path.join(out, 'probe.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
