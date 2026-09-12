#!/usr/bin/env node
// Compare a fresh seed-7 page with democity.restage({seed:7}) from seed 1337.
// Read-only apart from the public restage call inside its disposable browser page.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const out = process.env.OUT_FILE || 'shots/democity/r7f-cross-seed-diagnosis/probe.json';
const executablePath = process.env.SIM_CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', chromium.executablePath()].find(p => fs.existsSync(p));
const browser = await chromium.launch({ executablePath, headless: true, args: ['--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu', '--ignore-gpu-blocklist', '--no-sandbox'] });

async function open(seed) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const browserErrors = [];
  page.on('pageerror', error => browserErrors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()); });
  await page.route('**/@vite/client', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto(`${base}/?showcase=democity&seed=${seed}&time=12&camera=aerial&speed=0&quality=high&headless=1`, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });
  return { page, browserErrors };
}

async function read(page) {
  return page.evaluate(() => {
    const s = window.__sim, w = s.world, d = s.registry.apis.democity, heights = w.terrain.heights;
    const mix = (hash, value) => Math.imul(hash ^ (Math.round(value * 10000) | 0), 16777619) >>> 0;
    let hash = 2166136261;
    for (let i = 0; i < heights.length; i += 17) {
      hash = mix(hash, heights[i]);
    }
    let roadNodeHash = 2166136261, roadDesignHash = 2166136261;
    for (const node of [...w.roads.nodes.values()].sort((a, b) => a.id - b.id)) for (const value of [node.id, node.x, node.y, node.z, node.designY ?? 0]) roadNodeHash = mix(roadNodeHash, value);
    for (const edge of [...w.roads.edges.values()].sort((a, b) => a.id - b.id)) {
      roadDesignHash = mix(roadDesignHash, edge.id);
      for (const value of s.registry.apis.roads._builder().net.poly(edge.id).design) roadDesignHash = mix(roadDesignHash, value);
    }
    const stats = d.stats(), plan = d.plan();
    return {
      terrainHash: hash.toString(16).padStart(8, '0'),
      roadNodeHash: roadNodeHash.toString(16).padStart(8, '0'),
      roadDesignHash: roadDesignHash.toString(16).padStart(8, '0'),
      terrainFeatures: {
        river: [-640, 0, 640].map(x => w.terrain.features.river.zAt(x)),
        coast: [-640, 0, 640].map(z => w.terrain.features.coast.xAt(z)),
      },
      counts: {
        roads: stats.roads,
        zoneCells: stats.zones.cells,
        lots: stats.zones.lots,
        buildings: stats.buildings,
        services: stats.services,
        transitLines: stats.transitLines,
        transitStops: stats.transitStops,
      },
      districts: plan.districts.map(v => [v.id, v.x, v.z]),
      errors: s.errors.slice(),
    };
  });
}

async function readTerrain(page) {
  return page.evaluate(() => Array.from(window.__sim.world.terrain.heights));
}

try {
  const fresh = await open(7);
  const fresh7 = await read(fresh.page);
  const freshTerrain = await readTerrain(fresh.page);
  await fresh.page.evaluate(() => window.__sim.registry.apis.terrain.regenerate(7));
  const freshPristine = await read(fresh.page);
  await fresh.page.close();
  const staged = await open(1337);
  const initial1337 = await read(staged.page);
  await staged.page.evaluate(() => window.__sim.registry.apis.democity.restage({ seed: 7 }));
  await staged.page.waitForTimeout(750);
  const restaged7 = await read(staged.page);
  const restagedTerrain = await readTerrain(staged.page);
  await staged.page.evaluate(() => window.__sim.registry.apis.terrain.regenerate(7));
  const restagedPristine = await read(staged.page);
  let changed = 0, maxAbs = 0, sumAbs = 0;
  const samples = [];
  for (let i = 0; i < freshTerrain.length; i++) {
    const delta = Math.abs(freshTerrain[i] - restagedTerrain[i]);
    if (delta > 1e-6) {
      changed++; sumAbs += delta; maxAbs = Math.max(maxAbs, delta);
      if (samples.length < 12) samples.push({ index: i, fresh: freshTerrain[i], restaged: restagedTerrain[i], delta });
    }
  }
  const terrainDifference = { changed, total: freshTerrain.length, maxAbs, meanAbsChanged: changed ? sumAbs / changed : 0, samples };
  const exact = Object.fromEntries(['terrainHash', 'terrainFeatures', 'counts', 'districts'].map(key => [key, JSON.stringify(fresh7[key]) === JSON.stringify(restaged7[key])]));
  const result = {
    fresh7, initial1337, restaged7, exact, terrainDifference,
    pristine: { freshHash: freshPristine.terrainHash, restagedHash: restagedPristine.terrainHash, exact: freshPristine.terrainHash === restagedPristine.terrainHash },
    browserErrors: [...fresh.browserErrors, ...staged.browserErrors],
    pass: Object.values(exact).every(Boolean) && !fresh7.errors.length && !restaged7.errors.length && !fresh.browserErrors.length && !staged.browserErrors.length,
  };
  fs.mkdirSync(out.slice(0, out.lastIndexOf('/')), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ pass: result.pass, exact, fresh7: fresh7.counts, restaged7: restaged7.counts, terrain: [fresh7.terrainHash, restaged7.terrainHash], roads: { nodes: [fresh7.roadNodeHash, restaged7.roadNodeHash], design: [fresh7.roadDesignHash, restaged7.roadDesignHash] }, pristine: result.pristine, terrainDifference, browserErrors: result.browserErrors, errors: [...fresh7.errors, ...restaged7.errors] }, null, 2));
  await staged.page.close();
} finally {
  await browser.close();
}
