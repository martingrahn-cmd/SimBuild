#!/usr/bin/env node
// R8y: read-only inventory of missing cardinal links in Democity's authored grid.
// It predicts legal frontage from accepted painted/unclaimed cells and records existing-lot risk.
import { chromium } from 'playwright';
import fs from 'node:fs';
import crypto from 'node:crypto';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const out = process.env.OUT_FILE || 'shots/democity/r8y-local-frontage/opportunities.json';
const sourcePath = 'src/modules/democity/plan.js';
const source = fs.readFileSync(sourcePath, 'utf8');
const marker = 'P.nodes=nodes;return P;';
if (!source.includes(marker)) throw new Error('plan node marker not found');
const routed = source.replace(marker, 'globalThis.__r8yGridNodes=[...nodes.values()].map(n=>({...n}));P.nodes=nodes;return P;');
const chrome = process.env.SIM_CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', chromium.executablePath()].find(fs.existsSync);
const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu', '--ignore-gpu-blocklist', '--no-sandbox'] });
const result = {
  method: 'fresh disposable page; instrumented plan exports its authored grid-node table; no world or product mutation',
  sourcePath,
  sourceSha256: crypto.createHash('sha256').update(source).digest('hex'),
  routedSha256: crypto.createHash('sha256').update(routed).digest('hex'),
  seeds: [],
};

try {
  for (const seed of [1337, 7]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const browserErrors = [];
    page.on('pageerror', e => browserErrors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') browserErrors.push(m.text()); });
    await page.route('**/@vite/client', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await page.route('**/src/modules/democity/plan.js*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: routed }));
    await page.goto(`${base}/?showcase=democity&time=12&camera=aerial&seed=${seed}&quality=high&speed=0&headless=1`, { waitUntil: 'domcontentloaded', timeout: 240000 });
    await page.waitForFunction(() => window.__sim?.ready === true && Array.isArray(globalThis.__r8yGridNodes), null, { timeout: 240000 });
    const row = await page.evaluate((seed) => {
      const sim = window.__sim, world = sim.world;
      const nodes = globalThis.__r8yGridNodes;
      const byIJ = new Map(nodes.map(n => [`${n.i},${n.j}`, n]));
      const edgePairs = new Set([...world.roads.edges.values()].map(e => `${Math.min(e.a, e.b)}:${Math.max(e.a, e.b)}`));
      const lots = [...world.zones.lots.values()];
      const claimed = new Set(lots.flatMap(l => l.cells || []));
      const cells = world.zones.cells;
      const cell = world.zones.cellSize || 8, half = world.size / 2;
      const ctr = i => i * cell - half + cell * 0.5;
      const keyAt = (x, z) => `${Math.floor((x + half) / cell)},${Math.floor((z + half) / cell)}`;
      const pointSeg = (x, z, a, b) => {
        const dx = b.x - a.x, dz = b.z - a.z, dd = dx * dx + dz * dz;
        const t = dd ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / dd)) : 0;
        return { distance: Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t)), t };
      };
      const alley = [...world.roads.edges.values()].find(e => e.type === 'alley');
      const alleyDebug = alley && sim.registry?.apis?.zoning?.debugEdge ? sim.registry.apis.zoning.debugEdge(alley.id) : null;
      const front = alleyDebug?.front || 9.05;
      const pavedHalf = Math.max(2, front - 1.5);
      const lotSlots = { residential: { low: 2, high: 3 }, commercial: { low: 2, high: 3 }, industrial: { low: 3, high: 4 }, office: { low: 3, high: 4 } };
      const lotDepth = { residential: { low: 3, high: 3 }, commercial: { low: 3, high: 3 }, industrial: { low: 4, high: 4 }, office: { low: 3, high: 4 } };
      const candidates = [];
      for (const a of nodes) for (const [di, dj] of [[1, 0], [0, 1]]) {
        const b = byIJ.get(`${a.i + di},${a.j + dj}`);
        if (!b || edgePairs.has(`${Math.min(a.id, b.id)}:${Math.max(a.id, b.id)}`)) continue;
        const len = Math.hypot(b.x - a.x, b.z - a.z), tx = (b.x - a.x) / len, tz = (b.z - a.z) / len, nx = -tz, nz = tx;
        const samples = Math.max(8, Math.ceil(len / 4));
        let waterSamples = 0, steepSamples = 0, interiorRoadSamples = 0;
        for (let q = 1; q < samples; q++) {
          const t = q / samples, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
          if (world.terrain.isWater(x, z)) waterSamples++;
          if (world.terrain.getSlope(x, z) > .38) steepSamples++;
          if (t > .12 && t < .88 && world.roads.isRoad(x, z) > .8) interiorRoadSamples++;
        }
        const corridor = new Set(), endpoint = new Set();
        for (const key of cells.keys()) {
          const [ix, iz] = key.split(',').map(Number), x = ctr(ix), z = ctr(iz), hit = pointSeg(x, z, a, b);
          if (hit.distance <= pavedHalf + cell * .72 && hit.t > .04 && hit.t < .96) corridor.add(key);
          if (Math.min(Math.hypot(x - a.x, z - a.z), Math.hypot(x - b.x, z - b.z)) <= 24) endpoint.add(key);
        }
        const sides = [];
        let predictedLots = 0, predictedKeys = new Set();
        for (const sign of [-1, 1]) {
          const slots = [];
          for (let d = 12; d <= len - 12; d += cell) {
            let type = null, density = null, avail = 0; const keys = [];
            for (let depth = 1; depth <= 4; depth++) {
              const lat = front + (depth - .5) * cell;
              const key = keyAt(a.x + tx * d + nx * sign * lat, a.z + tz * d + nz * sign * lat);
              const c = cells.get(key);
              if (!c || claimed.has(key)) break;
              if (depth === 1) { type = c.type; density = c.density; }
              else if (c.type !== type || c.density !== density) break;
              keys.push(key); avail++;
            }
            slots.push({ d, type, density, avail, keys });
          }
          let i = 0, sideLots = 0;
          while (i < slots.length) {
            const s = slots[i], need = s.type ? lotDepth[s.type]?.[s.density] : null;
            if (!need || s.avail < need) { i++; continue; }
            let j = i + 1;
            while (j < slots.length && slots[j].type === s.type && slots[j].density === s.density && slots[j].avail >= need) j++;
            const count = Math.floor((j - i) / lotSlots[s.type][s.density]);
            sideLots += count;
            for (let k = i; k < j; k++) for (const key of slots[k].keys.slice(0, need)) predictedKeys.add(key);
            i = j;
          }
          predictedLots += sideLots;
          sides.push({ sign, slots: slots.length, fullDepth: slots.filter(s => s.type && s.avail >= lotDepth[s.type][s.density]).length, predictedLots: sideLots });
        }
        const corridorClaimed = [...corridor].filter(k => claimed.has(k));
        const endpointClaimed = [...endpoint].filter(k => claimed.has(k));
        const impactedLots = lots.filter(l => (l.cells || []).some(k => corridor.has(k) || endpoint.has(k))).map(l => l.id);
        const actualGap = interiorRoadSamples <= 2;
        const zeroAcceptedImpact = corridorClaimed.length === 0 && endpointClaimed.length === 0 && impactedLots.length === 0;
        candidates.push({
          grid: `${a.i},${a.j}->${b.i},${b.j}`, a: { id: a.id, i: a.i, j: a.j, x: a.x, z: a.z }, b: { id: b.id, i: b.i, j: b.j, x: b.x, z: b.z },
          length: len, waterSamples, steepSamples, interiorRoadSamples, front, pavedHalf,
          corridorPainted: corridor.size, corridorClaimed: corridorClaimed.length,
          endpointPainted: endpoint.size, endpointClaimed: endpointClaimed.length,
          impactedLotCount: new Set(impactedLots).size, impactedLotIds: [...new Set(impactedLots)],
          predictedLots, predictedUniqueKeys: predictedKeys.size, sides,
          actualGap, zeroAcceptedImpact,
          safeReadOnly: actualGap && waterSamples === 0 && steepSamples === 0 && zeroAcceptedImpact,
        });
      }
      candidates.sort((a, b) => Number(b.safeReadOnly) - Number(a.safeReadOnly) || Number(b.actualGap) - Number(a.actualGap) || b.predictedLots - a.predictedLots || a.impactedLotCount - b.impactedLotCount || a.grid.localeCompare(b.grid));
      return {
        seed,
        counts: { gridNodes: nodes.length, roadEdges: world.roads.edges.size, painted: cells.size, claimed: claimed.size, lots: lots.length, buildings: world.buildings.items.size },
        alleyCalibration: { edgeId: alley?.id ?? null, front, pavedHalf },
        absentDirectEdges: candidates.length,
        actualGaps: candidates.filter(c => c.actualGap).length,
        safeCount: candidates.filter(c => c.safeReadOnly).length,
        candidates,
        errors: sim.errors || [],
      };
    }, seed);
    row.browserErrors = browserErrors;
    row.pass = row.errors.length === 0 && browserErrors.length === 0 && row.counts.lots === row.counts.buildings;
    result.seeds.push(row);
    await page.close();
  }
} finally { await browser.close(); }

result.pass = result.seeds.every(s => s.pass);
fs.mkdirSync(out.slice(0, out.lastIndexOf('/')), { recursive: true });
fs.writeFileSync(out, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ out, pass: result.pass, seeds: result.seeds.map(s => ({ seed: s.seed, ...s.counts, absentDirectEdges: s.absentDirectEdges, actualGaps: s.actualGaps, safe: s.safeCount, topActualGaps: s.candidates.filter(c => c.actualGap).slice(0, 12).map(c => ({ grid: c.grid, predictedLots: c.predictedLots, corridorClaimed: c.corridorClaimed, endpointClaimed: c.endpointClaimed, impactedLots: c.impactedLotCount, waterSamples: c.waterSamples, steepSamples: c.steepSamples, safe: c.safeReadOnly })) })) }, null, 2));
