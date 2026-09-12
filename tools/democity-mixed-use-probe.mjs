#!/usr/bin/env node
// Verify that Democity's authored mixed-use programme is real building-owner state and
// survives repeated whole-save restores without changing IDs, plans, or lot ownership.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const out = process.env.OUT_FILE || 'shots/democity/mixed-use-probe.json';
const executablePath = process.env.SIM_CHROME || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  chromium.executablePath(),
].find((p) => fs.existsSync(p));
const browser = await chromium.launch({ executablePath, headless: true, args: [
  '--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu',
  '--ignore-gpu-blocklist', '--no-sandbox',
] });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const browserErrors = [];
  page.on('pageerror', (e) => browserErrors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') browserErrors.push(m.text()); });
  await page.route('**/@vite/client', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto(`${base}/?showcase=democity&headless=1&time=22&camera=night_downtown&speed=0&quality=high`, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });
  const result = await page.evaluate(async () => {
    const s = window.__sim;
    const digest = () => {
      const ids = s.registry.apis.democity.plan()?.mixedUseLotIds || [];
      const buildings = [...s.world.buildings.items.values()]
        .filter((b) => ids.includes(b.lotId))
        .sort((a, b) => a.lotId - b.lotId)
        .map((b) => ({
          id: b.id, lotId: b.lotId, type: b.type, density: b.density, level: b.level,
          kind: b.plan.kind, mixedUse: b.mixedUse, planMixedUse: b.plan.mixedUse,
          retail: b.plan.retail, groundFacade: b.plan.groundFacade || null,
          styleId: b.styleId, occupants: b.occupants, jobs: b.jobs,
          floors: b.floors, height: b.height,
          footprint: { ...b.footprint }, planSize: { w: b.plan.w, d: b.plan.d },
          zoneLotBuildingId: s.world.zones.lots.get(b.lotId)?.buildingId ?? null,
        }));
      return { ids, buildings, totalBuildings: s.world.buildings.items.size };
    };
    const saved = structuredClone(s.saves.serialize());
    const before = digest();
    await s.saves.restore(saved);
    const afterFirst = digest();
    await s.saves.restore(saved);
    const afterSecond = digest();
    return {
      before, afterFirst, afterSecond,
      exactFirst: JSON.stringify(afterFirst) === JSON.stringify(before),
      exactSecond: JSON.stringify(afterSecond) === JSON.stringify(before),
      errors: s.errors.slice(),
    };
  });
  result.browserErrors = browserErrors;
  const valid = (d) => d.ids.length === 32 && d.buildings.length === 32 && d.totalBuildings === 612
    && d.buildings.every((b) => b.mixedUse && b.planMixedUse && b.retail && b.zoneLotBuildingId === b.id);
  result.pass = valid(result.before) && valid(result.afterFirst) && valid(result.afterSecond)
    && result.exactFirst && result.exactSecond && !result.errors.length && !browserErrors.length;
  fs.mkdirSync(out.slice(0, out.lastIndexOf('/')), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({
    pass: result.pass,
    selected: result.before.buildings.length,
    kinds: result.before.buildings.reduce((a, b) => ((a[b.kind] = (a[b.kind] || 0) + 1), a), {}),
    exactFirst: result.exactFirst, exactSecond: result.exactSecond,
    lotOwnershipExact: result.afterSecond.buildings.every((b) => b.zoneLotBuildingId === b.id),
    errors: result.errors, browserErrors,
  }, null, 2));
  if (!result.pass) process.exitCode = 1;
} finally {
  await browser.close();
}
