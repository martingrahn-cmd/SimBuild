#!/usr/bin/env node
// R9j: disposable actual road-owner/frontage test for one R8y-ranked missing link.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const root = process.env.OUT_DIR || 'shots/democity/r9j-legal-frontage-owner';
const sourcePath = 'src/modules/democity/plan.js';
const source = fs.readFileSync(sourcePath, 'utf8');
const marker = 'P.nodes=nodes;return P;';
if (source.split(marker).length !== 2) throw Error('plan marker must occur once');
const expose = "globalThis.__R9J_GRID=[...nodes.values()].map(n=>({...n}));globalThis.__R9J_EDGE_ID=-1;P.nodes=nodes;return P;";
const insert = "const r9ja=nodes.get('-2,-7'),r9jb=nodes.get('-1,-7');globalThis.__R9J_EDGE_ID=r9ja&&r9jb?add(r9ja.id,r9jb.id,'alley'):-1;globalThis.__R9J_GRID=[...nodes.values()].map(n=>({...n}));P.nodes=nodes;return P;";
const variants = {
  baseline: source.replace(marker, expose),
  candidate: source.replace(marker, insert),
};
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const chrome = process.env.SIM_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const python = process.env.SIM_PYTHON || '/Users/martingrahn/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3';
fs.mkdirSync(root, { recursive: true });
const browser = await chromium.launch({ executablePath: chrome, headless: true, args: [
  '--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu',
  '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--no-sandbox',
] });
const result = {
  method: 'fresh actual-Chrome Metal disposable pages; baseline and one appended real alley-owner edge; candidate repeated per seed; directed candidate camera reuses baseline terrain target height',
  source: { path: sourcePath, sha256: sha(source), baselineRoutedSha256: sha(variants.baseline), candidateRoutedSha256: sha(variants.candidate) },
  candidate: { grid: '-2,-7->-1,-7', type: 'alley', rationale: 'Second common positive R8y alley candidate after public Tools pre-screen passes at 9.73%/7.36%; actual Roads/Zoning owners and contact risk measured' },
  runs: [], comparisons: [], errors: [], pass: false,
};

const settle = async (page, frames = 18) => page.evaluate(async n => {
  const s = window.__sim, start = s.engine.stats.frames;
  let last = start, changedAt = performance.now();
  while (s.engine.stats.frames < start + n) {
    await Promise.race([new Promise(requestAnimationFrame), new Promise(resolve => setTimeout(resolve, 1000))]);
    if (s.engine.stats.frames !== last) { last = s.engine.stats.frames; changedAt = performance.now(); }
    else if (performance.now() - changedAt > 15000) throw Error(`render stalled at ${last}`);
  }
}, frames);

const run = async (variant, seed, repeat = false, directedTargetY = null) => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const browserErrors = [], warnings = [];
  page.on('pageerror', e => browserErrors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') browserErrors.push(m.text()); else if (m.type() === 'warning') warnings.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400) browserErrors.push(`HTTP ${r.status()} ${r.url()}`); });
  await page.route('**/@vite/client', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.route('**/src/modules/democity/plan.js*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: variants[variant], contentType: 'application/javascript' });
  });
  try {
    await page.goto(`${base}/?showcase=democity&time=12&camera=aerial&seed=${seed}&quality=high&speed=0&headless=1`, { waitUntil: 'domcontentloaded', timeout: 240000 });
    await page.waitForFunction(() => window.__sim?.ready === true && Array.isArray(globalThis.__R9J_GRID), null, { timeout: 240000 });
    await settle(page, 24);
    const state = await page.evaluate(async ({ variant, seed }) => {
      const s = window.__sim, w = s.world, clone = value => structuredClone(value);
      const api = s.registry.apis;
      const hashJson = async value => {
        const bytes = new TextEncoder().encode(JSON.stringify(value));
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('');
      };
      const lots = [...w.zones.lots.values()].sort((a, b) => a.id - b.id).map(l => ({
        id: l.id, buildingId: l.buildingId, stableKey: `${l.edgeId}:${l.side}:${l._identityCell || l.cells?.[0] || `${Math.round(l.x)}_${Math.round(l.z)}`}`,
        edgeId: l.edgeId, side: l.side, identityCell: l._identityCell || l.cells?.[0] || null,
        x: l.x, y: l.y, z: l.z, w: l.w, d: l.d, heading: l.heading, nx: l.nx, nz: l.nz,
        ax: l.ax, az: l.az, type: l.type, density: l.density, corner: l.corner, t: l.t, cells: [...(l.cells || [])],
      }));
      const refs = new Map(), duplicates = [];
      for (const lot of lots) {
        const seen = new Set();
        for (const key of lot.cells) { if (seen.has(key)) duplicates.push([lot.id, key]); seen.add(key); }
        for (const key of seen) { const ids = refs.get(key) || []; ids.push(lot.id); refs.set(key, ids); }
      }
      const overlaps = [...refs].filter(([, ids]) => ids.length > 1).map(([key, ids]) => ({ key, ids }));
      const grid = globalThis.__R9J_GRID, a = grid.find(n => n.i === -2 && n.j === -7), b = grid.find(n => n.i === -1 && n.j === -7);
      const edgeId = globalThis.__R9J_EDGE_ID;
      const roadSave = clone(api.roads.serialize());
      const terrainSave = clone(api.terrain.serialize());
      const zoningSave = clone(api.zoning.serialize());
      const buildingsSave = clone(api.buildings.serialize());
      const simulationSave = clone(api.simulation.serialize());
      const servicesSave = clone(api.services.serialize());
      const transitSave = clone(api.transit.serialize());
      const candidateEdge = edgeId >= 0 ? roadSave.edges.find(e => e.id === edgeId) || null : null;
      const midpoint = a && b ? { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 } : null;
      const terrainSamples = [];
      if (a && b) for (let i = 0; i <= 20; i++) {
        const t = i / 20, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
        terrainSamples.push({ t, x, z, y: w.terrain.getHeight(x, z), slope: w.terrain.getSlope(x, z), water: w.terrain.isWater(x, z), road: w.roads.isRoad(x, z), surface: api.roads.surfaceHeightAt(x, z) });
      }
      return {
        variant, seed, edgeId, endpoints: { a, b }, midpoint, candidateEdge,
        counts: { roadNodes: roadSave.nodes.length, roadEdges: roadSave.edges.length, zonedCells: w.zones.cells.size, claimedCells: refs.size, lots: lots.length, buildings: w.buildings.items.size, services: w.services.items.size },
        roads: roadSave, lots, zoning: zoningSave, buildings: buildingsSave, simulation: simulationSave, services: servicesSave, transit: transitSave,
        terrainSha256: await hashJson(terrainSave), terrainSamples,
        economy: { population: w.economy.population, jobs: w.economy.jobs, money: w.economy.money, happiness: w.economy.happiness, demand: clone(w.economy.demand), net: w.economy.net, loans: clone(w.economy.loans), taxRate: clone(w.economy.taxRate) },
        democityStats: clone(api.democity.stats()), roadStats: clone(api.roads.stats()), zoningStats: clone(api.zoning.stats()), serviceStats: clone(api.services.stats()),
        duplicates, overlaps, moduleStates: clone(s.stats().modules), errors: [...s.errors],
      };
    }, { variant, seed });
    const runId = `${variant}${repeat ? '_repeat' : ''}_seed${seed}`;
    if (!repeat) {
      const aerial = path.join(root, `${runId}_aerial.png`);
      await page.screenshot({ path: aerial, type: 'png', timeout: 180000 });
      state.images = { aerial };
      if (state.midpoint) {
        await page.evaluate(({ x, z, directedTargetY }) => {
          const s = window.__sim, y = directedTargetY ?? (s.world.terrain.getHeight(x, z) + 5);
          s.setCamera({ target: [x, y, z], yaw: 0.72, pitch: 0.78, distance: 250 });
        }, { ...state.midpoint, directedTargetY });
        await settle(page, 12);
        const directed = path.join(root, `${runId}_directed.png`);
        await page.screenshot({ path: directed, type: 'png', timeout: 180000 });
        state.images.directed = directed;
      }
    }
    state.browserErrors = browserErrors;
    state.warnings = [...new Set(warnings)];
    state.pass = state.counts.lots === state.counts.buildings && !state.duplicates.length && !state.overlaps.length && !state.errors.length && !browserErrors.length && Object.values(state.moduleStates).every(m => m.status === 'ready' && m.errors === 0) && (variant === 'baseline' ? state.edgeId === -1 : state.edgeId >= 0 && !!state.candidateEdge);
    return state;
  } finally { await page.close(); }
};

try {
  for (const seed of [1337, 7]) {
    const baseline = await run('baseline', seed);
    result.runs.push(baseline);
    const directedTargetY = baseline.terrainSamples[10]?.y + 5;
    result.runs.push(await run('candidate', seed, false, directedTargetY));
    result.runs.push(await run('candidate', seed, true, directedTargetY));
  }
  for (const seed of [1337, 7]) {
    const baseline = result.runs.find(r => r.seed === seed && r.variant === 'baseline');
    const candidate = result.runs.find(r => r.seed === seed && r.variant === 'candidate' && r.images);
    const repeat = result.runs.find(r => r.seed === seed && r.variant === 'candidate' && !r.images);
    const baseLots = new Map(baseline.lots.map(l => [l.stableKey, l])), candLots = new Map(candidate.lots.map(l => [l.stableKey, l]));
    const gained = [...candLots].filter(([k]) => !baseLots.has(k)).map(([, v]) => v);
    const lost = [...baseLots].filter(([k]) => !candLots.has(k)).map(([, v]) => v);
    const retained = [...candLots].filter(([k]) => baseLots.has(k));
    const stableProjection = row => ({
      counts: row.counts, roads: row.roads, lots: row.lots, zoning: row.zoning, buildings: row.buildings,
      simulation: row.simulation, services: row.services, transit: row.transit, terrainSha256: row.terrainSha256,
      terrainSamples: row.terrainSamples, economy: row.economy,
      // Wall-clock phase timings measure the host, not authored state.
      democityDeterministicStats: { ...row.democityStats, phaseMs: null, stageMs: null },
    });
    const identity = e => ({ id: e.id, a: e.a, b: e.b, type: e.type, lanes: e.lanes, oneWay: e.oneWay });
    result.comparisons.push({
      seed,
      countDelta: Object.fromEntries(Object.keys(candidate.counts).map(k => [k, candidate.counts[k] - baseline.counts[k]])),
      gainedLots: gained, lostLots: lost, retainedLots: retained.length,
      retainedSameLotId: retained.filter(([k, v]) => baseLots.get(k).id === v.id).length,
      retainedSameBuildingId: retained.filter(([k, v]) => baseLots.get(k).buildingId === v.buildingId).length,
      existingNodePayloadEqual: JSON.stringify(candidate.roads.nodes) === JSON.stringify(baseline.roads.nodes),
      existingEdgeIdentityPrefixEqual: JSON.stringify(candidate.roads.edges.slice(0, baseline.roads.edges.length).map(identity)) === JSON.stringify(baseline.roads.edges.map(identity)),
      existingEdgePayloadPrefixEqual: JSON.stringify(candidate.roads.edges.slice(0, baseline.roads.edges.length)) === JSON.stringify(baseline.roads.edges),
      newEdgeIsLast: candidate.roads.edges.at(-1)?.id === candidate.edgeId && candidate.roads.edges.length === baseline.roads.edges.length + 1,
      candidateRepeatExact: JSON.stringify(stableProjection(candidate)) === JSON.stringify(stableProjection(repeat)),
      buildingSerializationEqualToBaseline: JSON.stringify(candidate.buildings) === JSON.stringify(baseline.buildings),
      simulationSerializationEqualToBaseline: JSON.stringify(candidate.simulation) === JSON.stringify(baseline.simulation),
      servicesSerializationEqualToBaseline: JSON.stringify(candidate.services) === JSON.stringify(baseline.services),
      transitSerializationEqualToBaseline: JSON.stringify(candidate.transit) === JSON.stringify(baseline.transit),
      economyEqualToBaseline: JSON.stringify(candidate.economy) === JSON.stringify(baseline.economy),
      terrainHashEqualToBaseline: candidate.terrainSha256 === baseline.terrainSha256,
    });
  }
} catch (error) { result.errors.push(String(error?.stack || error)); }
finally { await browser.close(); }

if (result.comparisons.length === 2) {
  const script = String.raw`
import json,sys
from pathlib import Path
from PIL import Image,ImageChops
root=Path(sys.argv[1]); rows=[]
def metric(a,b):
 A=Image.open(a).convert('RGB');B=Image.open(b).convert('RGB');D=ImageChops.difference(A,B);h=D.histogram();p=A.width*A.height;m=ImageChops.lighter(ImageChops.lighter(*D.split()[:2]),D.split()[2]);mh=m.histogram()
 return {'normalizedRgbMae':sum((i%256)*n for i,n in enumerate(h))/(p*3*255),'changedPixels':p-mh[0],'strongPixelsGE8':sum(mh[8:]),'maxChannelDelta':max(i for i,n in enumerate(mh) if n)}
for seed in [1337,7]:
 for view in ['aerial','directed']:
  a=root/f'baseline_seed{seed}_{view}.png';b=root/f'candidate_seed{seed}_{view}.png';d=ImageChops.difference(Image.open(a).convert('RGB'),Image.open(b).convert('RGB')).point(lambda v:min(255,v*4));out=root/f'seed{seed}_{view}_difference_x4.png';d.save(out);rows.append({'seed':seed,'view':view,'metric':metric(a,b),'differenceX4':str(out)})
print(json.dumps(rows))
`;
  try { result.imageComparisons = JSON.parse(execFileSync(python, ['-c', script, root], { encoding: 'utf8' })); }
  catch (error) { result.errors.push(`image comparison failed: ${error.stderr || error}`); }
}
result.errors = [...new Set(result.errors)];
result.pass = result.errors.length === 0 && result.runs.length === 6 && result.runs.every(r => r.pass) && result.comparisons.length === 2 && result.comparisons.every(c => c.newEdgeIsLast && c.existingEdgeIdentityPrefixEqual && c.candidateRepeatExact);
fs.writeFileSync(path.join(root, 'summary.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({
  root, pass: result.pass, errors: result.errors,
  runs: result.runs.map(r => ({ variant: r.variant, repeat: !r.images, seed: r.seed, edgeId: r.edgeId, counts: r.counts, pass: r.pass, errors: r.errors, browserErrors: r.browserErrors })),
  comparisons: result.comparisons.map(c => ({ seed: c.seed, countDelta: c.countDelta, gained: c.gainedLots.length, lost: c.lostLots.length, retained: c.retainedLots, sameLotId: c.retainedSameLotId, sameBuildingId: c.retainedSameBuildingId, existingNodePayloadEqual: c.existingNodePayloadEqual, existingEdgeIdentityPrefixEqual: c.existingEdgeIdentityPrefixEqual, existingEdgePayloadPrefixEqual: c.existingEdgePayloadPrefixEqual, newEdgeIsLast: c.newEdgeIsLast, candidateRepeatExact: c.candidateRepeatExact, buildingSerializationEqualToBaseline: c.buildingSerializationEqualToBaseline, simulationSerializationEqualToBaseline: c.simulationSerializationEqualToBaseline, economyEqualToBaseline: c.economyEqualToBaseline, terrainHashEqualToBaseline: c.terrainHashEqualToBaseline })),
  imageComparisons: result.imageComparisons,
}, null, 2));
if (!result.pass) process.exitCode = 1;
