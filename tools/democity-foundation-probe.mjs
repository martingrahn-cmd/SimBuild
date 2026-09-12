#!/usr/bin/env node
// Disposable-page diagnosis for terrain-owned, fill-only building foundation pads.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const out = process.env.OUT_DIR || 'shots/democity/foundation-probe';
const seed = Number(process.env.SEED || 1337);
const mode = process.env.MODE || 'area';
const executablePath = process.env.SIM_CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', chromium.executablePath()].find(p => fs.existsSync(p));
const browser = await chromium.launch({ executablePath, headless: true, args: ['--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu', '--ignore-gpu-blocklist', '--no-sandbox'] });

try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } }), browserErrors = [];
  page.on('pageerror', e => browserErrors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') browserErrors.push(m.text()); });
  await page.route('**/@vite/client', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto(`${base}/?showcase=democity&time=12&camera=street&seed=${seed}&quality=high&headless=1&speed=0`, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });
  const result = await page.evaluate((mode) => {
    const s = window.__sim, w = s.world, T = w.terrain, res = T.resolution, cell = T.cellSize, half = w.size / 2;
    const source = T.heights.slice(), values = T.heights.slice(), pads = [], changed = new Set();
    const padding = Math.SQRT2 * cell + 1e-4;
    for (const b of w.buildings.items.values()) {
      const c = Math.cos(b.heading || 0), q = Math.sin(b.heading || 0), hw = b.footprint.w / 2 + padding, hd = b.footprint.d / 2 + padding;
      if (mode === 'supports') {
        const supportIndices = new Set();
        for (const [u, v] of [[-1,-1],[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0]]) {
          const lx = u * b.footprint.w / 2, lz = v * b.footprint.d / 2;
          const x = b.x + c * lx + q * lz, z = b.z + q * lx - c * lz;
          const gx = (x + half) / cell, gz = (z + half) / cell, ix = Math.floor(gx), iz = Math.floor(gz);
          for (const dz of [0, 1]) for (const dx of [0, 1]) if (ix + dx >= 0 && iz + dz >= 0 && ix + dx < res && iz + dz < res) supportIndices.add((iz + dz) * res + ix + dx);
        }
        for (const i of supportIndices) if (values[i] < b.y) { values[i] = b.y; changed.add(i); }
        pads.push({ id: b.id, target: b.y, samples: supportIndices.size });
        continue;
      }
      const radius = Math.hypot(hw, hd), ix0 = Math.max(0, Math.floor((b.x - radius + half) / cell)), ix1 = Math.min(res - 1, Math.ceil((b.x + radius + half) / cell));
      const iz0 = Math.max(0, Math.floor((b.z - radius + half) / cell)), iz1 = Math.min(res - 1, Math.ceil((b.z + radius + half) / cell));
      const indices = [];
      for (let iz = iz0; iz <= iz1; iz++) for (let ix = ix0; ix <= ix1; ix++) {
        const x = ix * cell - half, z = iz * cell - half, dx = x - b.x, dz = z - b.z;
        const lx = c * dx + q * dz, lz = q * dx - c * dz;
        if (Math.abs(lx) <= hw && Math.abs(lz) <= hd) indices.push(iz * res + ix);
      }
      const target = Math.max(...indices.map(i => source[i]));
      for (const i of indices) if (values[i] < target) { values[i] = target; changed.add(i); }
      pads.push({ id: b.id, target, samples: indices.length });
    }
    let maxRaise = 0, roadCells = 0, waterCells = 0, raisedVolumeM3 = 0;
    for (const i of changed) {
      const raise = values[i] - source[i], ix = i % res, iz = Math.floor(i / res), x = ix * cell - half, z = iz * cell - half;
      maxRaise = Math.max(maxRaise, raise); raisedVolumeM3 += raise * cell * cell;
      if (w.roads.isRoad(x, z)) roadCells++;
      if (T.isWater(x, z)) waterCells++;
    }
    const applied = T.setHeights(0, 0, res - 1, res - 1, values, { restore: true });
    const corners = b => [-1, 1].flatMap(i => [-1, 1].map(j => {
      const lx = i * b.footprint.w / 2, lz = j * b.footprint.d / 2, c = Math.cos(b.heading || 0), q = Math.sin(b.heading || 0);
      return T.getHeight(b.x + c * lx + q * lz, b.z + q * lx - c * lz);
    }));
    const seating = [...w.buildings.items.values()].map(b => ({ id: b.id, gap: b.y - Math.max(...corners(b)) })).sort((a, b) => b.gap - a.gap);
    return {
      seed: w.seed, mode, buildings: pads.length, applied, padding, changedCells: changed.size, roadCells, waterCells,
      maxRaise, raisedVolumeM3, seating: { maxGap: seating[0]?.gap, minGap: seating.at(-1)?.gap, over025: seating.filter(v => v.gap > .25).slice(0, 20), below0: seating.filter(v => v.gap < 0).slice(-20) },
      errors: s.errors.slice(),
    };
  }, mode);
  await page.waitForTimeout(750);
  result.after = await page.evaluate(() => ({ errors: window.__sim.errors.slice(), stats: window.__sim.stats(), roadVersion: window.__sim.world.roads.version, terrainVersion: window.__sim.world.terrain.version }));
  result.browserErrors = browserErrors;
  result.pass = result.applied && !result.seating.over025.length && !result.seating.below0.length && !result.errors.length && !result.after.errors.length && !browserErrors.length;
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(`${out}/${mode}-seed${seed}.json`, JSON.stringify(result, null, 2));
  await page.screenshot({ path: `${out}/${mode}-seed${seed}.png` });
  console.log(JSON.stringify(result, null, 2));
} finally { await browser.close(); }
