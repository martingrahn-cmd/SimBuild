#!/usr/bin/env node
// Public Democity API/save/tour contract probe, parameterized for later evidence rounds.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const out = process.env.OUT_DIR || 'shots/democity/apicheck';
const seed = Number(process.env.SEED || 1337);
const executablePath = process.env.SIM_CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', chromium.executablePath()].find(p => fs.existsSync(p));
const browser = await chromium.launch({ executablePath, headless: true, args: ['--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu', '--ignore-gpu-blocklist', '--no-sandbox'] });

try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } }), browserErrors = [];
  page.on('pageerror', e => browserErrors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') browserErrors.push(m.text()); });
  await page.route('**/@vite/client', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto(`${base}/?showcase=democity&headless=1&time=12&camera=aerial&speed=0&seed=${seed}&quality=high`, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForFunction(() => window.__sim?.ready, null, { timeout: 240000 });
  const result = await page.evaluate(async () => {
    const s = window.__sim, d = s.registry.apis.democity, w = s.world;
    const methods = ['plan', 'districtAt', 'stats', 'fallbacks', 'tour', 'startTour', 'stopTour', 'gotoStop', 'tourState', 'restage', 'cropRects', 'serialize', 'deserialize'];
    const census = () => {
      const buildings = [...w.buildings.items.values()], residential = buildings.filter(b => b.type === 'residential');
      const covered = kind => b => w.services.coverage(kind, b.x, b.z) > 0;
      const utilities = b => covered('power')(b) && covered('water')(b);
      const healthEducation = b => (covered('clinic')(b) || covered('hospital')(b)) && (covered('school')(b) || covered('high_school')(b) || covered('university')(b));
      return { roads: { nodes: w.roads.nodes.size, edges: w.roads.edges.size }, zones: { cells: w.zones.cells.size, lots: w.zones.lots.size }, buildings: buildings.length, services: w.services.items.size, transit: { lines: w.transit.lines.size, stops: w.transit.stops.size }, residential: residential.length, coverage: { utilities: residential.filter(utilities).length, healthEducation: residential.filter(healthEducation).length } };
    };
    const baseline = census(), saved = d.serialize();
    const deserialize = [d.deserialize(saved), d.deserialize(saved)], afterDeserialize = census();
    const tour = d.tour().map((_, index) => d.gotoStop(index)), invalidTour = d.gotoStop(100); d.stopTour();
    return { api: Object.fromEntries(methods.map(name => [name, typeof d[name]])), baseline, deserialize, afterDeserialize, tour, invalidTour, errors: s.errors.slice() };
  });
  result.browserErrors = browserErrors;
  result.pass = Object.values(result.api).every(v => v === 'function') && result.deserialize.every(Boolean) && result.tour.every(Boolean) && result.invalidTour === false && !result.errors.length && !browserErrors.length;
  fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(`${out}/apicheck.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ pass: result.pass, baseline: result.baseline, deserialize: result.deserialize, tour: result.tour, invalidTour: result.invalidTour, errors: result.errors, browserErrors }, null, 2));
  await page.close();
} finally {
  await browser.close();
}
