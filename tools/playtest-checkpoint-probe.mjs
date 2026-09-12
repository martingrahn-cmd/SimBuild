#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const outDir = 'shots/playtest-checkpoint-2026-09-10';
const slot = '__playtest_checkpoint_probe__';
fs.mkdirSync(outDir, { recursive: true });
const result = { url: `${base}/?mode=play`, errors: [], warnings: [], startup: null, saveLoad: null, pass: false };
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu', '--ignore-gpu-blocklist', '--no-sandbox'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', error => result.errors.push(String(error)));
  page.on('console', message => {
    if (message.type() === 'error') result.errors.push(message.text());
    if (message.type() === 'warning') result.warnings.push(message.text());
  });
  await page.route('**/@vite/client', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto(result.url, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });
  await page.waitForFunction(() => document.getElementById('boot')?.classList.contains('hidden'), null, { timeout: 30000 });
  await page.waitForTimeout(1000);
  result.startup = await page.evaluate(() => {
    const s = window.__sim, stats = s.stats(), ui = s.registry.apis.ui;
    return {
      moduleCount: Object.keys(stats.modules).length,
      modulesReady: Object.values(stats.modules).every(module => module.status === 'ready' && module.errors === 0),
      simErrors: [...s.errors],
      simWarnings: [...s.warnings],
      playMode: s.params.mode,
      showcase: s.params.showcase,
      worldCounts: {
        roads: s.world.roads.edges.size,
        lots: s.world.zones.lots.size,
        buildings: s.world.buildings.items.size,
        services: s.world.services.items.size,
      },
      canvas: { width: s.engine.renderer.domElement.width, height: s.engine.renderer.domElement.height },
      uiReady: !!ui,
    };
  });
  await page.screenshot({ path: `${outDir}/normal-entry.png`, timeout: 180000 });
  await page.getByText('Continue', { exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('.sb-root')?.classList.contains('is-menu'));
  await page.waitForTimeout(500);
  result.gameplay = await page.evaluate(() => ({
    menuClosed: !document.querySelector('.sb-root')?.classList.contains('is-menu'),
    toolbarVisible: !!document.querySelector('.sb-toolbar'),
    simErrors: [...window.__sim.errors],
  }));
  await page.screenshot({ path: `${outDir}/gameplay-entry.png`, timeout: 180000 });
  result.saveLoad = await page.evaluate(async slot => {
    const s = window.__sim;
    s.freeze();
    const before = s.saves.serialize();
    const saved = await s.save(slot);
    const originalCamera = structuredClone(before.camera);
    s.setCamera({ target: [137, 42, -91], yaw: 1.2, pitch: 0.51, distance: 333 });
    const moved = s.saves.serialize().camera;
    const loaded = await s.load(slot);
    const after = s.saves.serialize();
    const removed = await s.saves.remove(slot);
    const moduleEquality = Object.fromEntries(Object.keys(before.modules).map(name => [name, JSON.stringify(before.modules[name]) === JSON.stringify(after.modules[name])]));
    const sameModules = Object.values(moduleEquality).every(Boolean);
    const sameTime = JSON.stringify(before.time) === JSON.stringify(after.time);
    const sameCamera = JSON.stringify(originalCamera) === JSON.stringify(after.camera);
    return {
      saved: !!saved,
      loaded,
      removed,
      cameraWasChanged: JSON.stringify(originalCamera) !== JSON.stringify(moved),
      sameModules,
      moduleEquality,
      sameTime,
      beforeTime: before.time,
      afterTime: after.time,
      sameCamera,
      moduleCount: Object.keys(after.modules).length,
    };
  }, slot);
  result.pass = result.startup.modulesReady && result.startup.simErrors.length === 0 &&
    result.startup.playMode === 'play' && result.startup.uiReady && result.gameplay.menuClosed && result.gameplay.toolbarVisible && result.gameplay.simErrors.length === 0 &&
    result.saveLoad.saved && result.saveLoad.loaded && result.saveLoad.removed &&
    result.saveLoad.cameraWasChanged && result.saveLoad.sameCamera &&
    result.errors.length === 0;
} catch (error) {
  result.errors.push(String(error?.stack || error));
} finally {
  await browser.close();
}
fs.writeFileSync(`${outDir}/verification.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
