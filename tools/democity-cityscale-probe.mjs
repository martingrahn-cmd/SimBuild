#!/usr/bin/env node
// Reproducible real-city census.  It records existing ownership and district use;
// it deliberately does not mutate the staged city or manufacture capacity.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const out = process.env.OUT_DIR || 'shots/democity/cityscale-probe';
const seeds = (process.env.SEEDS || '1337,7').split(',').map(Number);
const executablePath = process.env.SIM_CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', chromium.executablePath()].find(p => fs.existsSync(p));
const browser = await chromium.launch({ executablePath, headless: true, args: ['--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu', '--ignore-gpu-blocklist', '--no-sandbox'] });

try {
  const rows = [];
  for (const seed of seeds) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const browserErrors = [];
    page.on('pageerror', e => browserErrors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') browserErrors.push(m.text()); });
    await page.route('**/@vite/client', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await page.goto(`${base}/?showcase=democity&headless=1&time=12&camera=aerial&speed=0&quality=high&seed=${seed}`, { waitUntil: 'domcontentloaded', timeout: 240000 });
    await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });
    const row = await page.evaluate(() => {
      const s = window.__sim, w = s.world, api = s.registry.apis.democity;
      const empty = w.zones.freeLots();
      const kinds = (items, key) => Object.fromEntries([...items].reduce((m, item) => {
        const value = item[key] || 'unknown'; m.set(value, (m.get(value) || 0) + 1); return m;
      }, new Map()));
      const districts = new Map();
      for (const b of w.buildings.items.values()) {
        const d = api.districtAt(b.x, b.z)?.id || api.districtAt(b.x, b.z)?.name || 'unassigned';
        const entry = districts.get(d) || { buildings: 0, residential: 0, lots: 0, cells: 0 };
        entry.buildings++; if (b.type === 'residential') entry.residential++; districts.set(d, entry);
      }
      for (const lot of w.zones.lots.values()) {
        const d = api.districtAt(lot.x, lot.z)?.id || api.districtAt(lot.x, lot.z)?.name || 'unassigned';
        const entry = districts.get(d) || { buildings: 0, residential: 0, lots: 0, cells: 0 };
        entry.lots++; entry.cells += lot.cells.length; districts.set(d, entry);
      }
      const unassigned = [...w.buildings.items.values()].filter(b => !api.districtAt(b.x, b.z));
      const extent = values => values.length ? {
        count: values.length,
        x: [Math.min(...values.map(v => v.x)), Math.max(...values.map(v => v.x))],
        z: [Math.min(...values.map(v => v.z)), Math.max(...values.map(v => v.z))],
        centroid: [values.reduce((n, v) => n + v.x, 0) / values.length, values.reduce((n, v) => n + v.z, 0) / values.length],
      } : { count: 0 };
      return {
        seed: w.seed,
        roads: { nodes: w.roads.nodes.size, edges: w.roads.edges.size },
        zoning: { cells: w.zones.cells.size, lots: w.zones.lots.size, freeLots: empty.length, occupiedLots: w.zones.lots.size - empty.length },
        buildings: { total: w.buildings.items.size, byType: kinds(w.buildings.items.values(), 'type'), byDensity: kinds(w.buildings.items.values(), 'density') },
        districts: Object.fromEntries([...districts.entries()].sort(([a], [b]) => a.localeCompare(b))),
        unassigned: extent(unassigned),
        errors: s.errors.slice(),
      };
    });
    row.browserErrors = browserErrors;
    row.pass = row.zoning.occupiedLots === row.buildings.total && row.zoning.freeLots === 0 && !row.errors.length && !browserErrors.length;
    rows.push(row);
    await page.close();
  }
  const result = { rows, pass: rows.every(row => row.pass) };
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(`${out}/cityscale.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally { await browser.close(); }
