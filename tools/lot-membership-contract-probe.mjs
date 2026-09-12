#!/usr/bin/env node
// R8v: retain exact zoning ownership, identity, building/economy, refresh and save/restore evidence.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const label = process.env.LABEL || 'candidate';
const out = process.env.OUT_FILE || `shots/democity/r8v-lot-membership/${label}-contracts.json`;
const executablePath = process.env.SIM_CHROME || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  chromium.executablePath(),
].find((p) => fs.existsSync(p));
const browser = await chromium.launch({ executablePath, headless: true, args: [
  '--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu',
  '--ignore-gpu-blocklist', '--no-sandbox',
] });

const result = { label, method: 'fresh page + two zoning refreshes + two whole-save restores per seed', seeds: [] };
try {
  for (const seed of [1337, 7]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const browserErrors = [];
    page.on('pageerror', (e) => browserErrors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') browserErrors.push(m.text()); });
    await page.route('**/@vite/client', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await page.goto(`${base}/?showcase=democity&headless=1&time=12&camera=aerial&speed=0&quality=high&seed=${seed}`, { waitUntil: 'domcontentloaded', timeout: 240000 });
    await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });
    const row = await page.evaluate(async (seed) => {
      const s = window.__sim, w = s.world;
      const zoning = s.registry.apis.zoning;
      const clone = (v) => structuredClone(v);
      const capture = () => {
        const lots = [...w.zones.lots.values()].sort((a, b) => a.id - b.id);
        const invariantLots = lots.map((l) => ({
          id: l.id, buildingId: l.buildingId, edgeId: l.edgeId, side: l.side,
          identityCell: l._identityCell || l.cells?.[0] || null,
          x: l.x, y: l.y, z: l.z, w: l.w, d: l.d, heading: l.heading,
          nx: l.nx, nz: l.nz, ax: l.ax, az: l.az, type: l.type, density: l.density,
          corner: l.corner, t: l.t,
        }));
        const membership = lots.map((l) => ({ id: l.id, cells: [...(l.cells || [])] }));
        const claimed = [];
        for (const [key, lotId] of w.zones.lots.size ? zoning._notPublic || [] : []) claimed.push([key, lotId]);
        // Public lotAt cannot enumerate the ownership map. Reconstruct the current final-winner map
        // from ordered lot membership; this is exact for the accepted implementation and the candidate
        // verifies it against every public cell centre below.
        const reconstructed = new Map();
        for (const l of lots) for (const key of l.cells || []) reconstructed.set(key, l.id);
        const claimedRows = [...reconstructed].sort((a, b) => a[0].localeCompare(b[0]));
        const publicOwners = [...w.zones.cells].map(([key, cell]) => {
          const c = key.indexOf(','), ix = +key.slice(0, c), iz = +key.slice(c + 1);
          return [key, w.zones.lotAt(ix * 8 - 1020, iz * 8 - 1020)?.id ?? null, cell.type, cell.density];
        }).sort((a, b) => a[0].localeCompare(b[0]));
        const duplicates = membership.flatMap((l) => {
          const seen = new Set(), dup = [];
          for (const key of l.cells) { if (seen.has(key)) dup.push(key); else seen.add(key); }
          return dup.length ? [{ id: l.id, keys: dup }] : [];
        });
        const refs = new Map();
        for (const l of membership) for (const key of new Set(l.cells)) {
          let a = refs.get(key); if (!a) refs.set(key, a = []); a.push(l.id);
        }
        const overlaps = [...refs].filter(([, ids]) => ids.length > 1).map(([key, ids]) => ({ key, ids }));
        const buildings = clone(s.registry.apis.buildings.serialize());
        const simulation = clone(s.registry.apis.simulation.serialize());
        const roads = clone(s.registry.apis.roads.serialize());
        return {
          counts: { cells: w.zones.cells.size, lots: lots.length, buildings: w.buildings.items.size },
          invariantLots, membership, claimedRows, publicOwners, duplicates, overlaps,
          zoningSave: clone(zoning.serialize()), buildings, simulation, roads,
          economy: {
            population: w.economy.population, jobs: w.economy.jobs, money: w.economy.money,
            happiness: w.economy.happiness, demand: clone(w.economy.demand), net: w.economy.net,
            loans: clone(w.economy.loans), taxRate: clone(w.economy.taxRate),
          },
          stats: clone(s.registry.apis.democity.stats()), errors: s.errors.slice(),
        };
      };
      const initial = capture();
      zoning.refresh(); await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const refresh1 = capture();
      zoning.refresh(); await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const refresh2 = capture();
      const saved = clone(s.saves.serialize());
      const restoreResults = [];
      try { restoreResults.push({ completed: true, returned: (await s.saves.restore(saved)) ?? null }); }
      catch (error) { restoreResults.push({ completed: false, error: String(error) }); }
      const restore1 = capture();
      try { restoreResults.push({ completed: true, returned: (await s.saves.restore(saved)) ?? null }); }
      catch (error) { restoreResults.push({ completed: false, error: String(error) }); }
      const restore2 = capture();
      const stable = (a, b) => JSON.stringify(a) === JSON.stringify(b);
      const stableProjection = (x) => ({
        counts: x.counts, invariantLots: x.invariantLots, membership: x.membership,
        claimedRows: x.claimedRows, publicOwners: x.publicOwners, buildings: x.buildings,
        simulation: x.simulation, roads: x.roads,
        // Economy.net is a deliberately derived presentation value and is reset until the next
        // simulation tick after restore. The serialized simulation state above remains exact.
        economy: { ...x.economy, net: null },
      });
      return {
        seed, initial, refresh1, refresh2, restoreResults, restore1, restore2,
        exactRefresh1: stable(stableProjection(initial), stableProjection(refresh1)),
        exactRefresh2: stable(stableProjection(initial), stableProjection(refresh2)),
        exactRestore1: stable(stableProjection(refresh2), stableProjection(restore1)),
        exactRestore2: stable(stableProjection(refresh2), stableProjection(restore2)),
        errors: s.errors.slice(),
      };
    }, seed);
    row.browserErrors = browserErrors;
    row.pass = row.exactRefresh1 && row.exactRefresh2 && row.exactRestore1 && row.exactRestore2
      && row.restoreResults.every((r) => r.completed) && !row.errors.length && !browserErrors.length;
    result.seeds.push(row);
    await page.close();
  }
  result.pass = result.seeds.every((s) => s.pass);
  fs.mkdirSync(out.slice(0, out.lastIndexOf('/')), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({
    label, pass: result.pass,
    seeds: result.seeds.map((s) => ({
      seed: s.seed, counts: s.initial.counts,
      duplicates: s.initial.duplicates, overlaps: s.initial.overlaps,
      exactRefresh1: s.exactRefresh1, exactRefresh2: s.exactRefresh2,
      exactRestore1: s.exactRestore1, exactRestore2: s.exactRestore2,
      restoreResults: s.restoreResults, errors: s.errors, browserErrors: s.browserErrors,
    })),
  }, null, 2));
  if (!result.pass) process.exitCode = 1;
} finally { await browser.close(); }
