#!/usr/bin/env node
// R9h: trace each real ZoneGrid.regenLots call during baseline/candidate startup.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const out = process.env.OUT_FILE || 'shots/democity/r9h-allocation-trace/trace.json';
const planPath = 'src/modules/democity/plan.js', gridPath = 'src/modules/zoning/grid.js';
const plan = fs.readFileSync(planPath, 'utf8'), grid = fs.readFileSync(gridPath, 'utf8');
const planMarker = 'P.nodes=nodes;return P;';
const planExpose = "globalThis.__R9H_EDGE_ID=-1;P.nodes=nodes;return P;";
const planInsert = "const r9ha=nodes.get('-8,-11'),r9hb=nodes.get('-7,-11');globalThis.__R9H_EDGE_ID=r9ha&&r9hb?add(r9ha.id,r9hb.id,'street'):-1;P.nodes=nodes;return P;";
const plans = { baseline: plan.replace(planMarker, planExpose), candidate: plan.replace(planMarker, planInsert) };
const importMarker = "import { RoadField } from './roadfield.js';";
const sortMarker = "edges.sort((a, b) => rank(a) - rank(b) || (b.length - a.length) * 0.02 + (jitter(a) - jitter(b)) || a.id - b.id);";
const loopMarker = "for (const e of edges) {\n      if (this._rec) this._rec.push({ id: e.id, type: e.type, len: +e.length.toFixed(0), sides: {} });\n      for (const lot of this.genEdge(e)) {";
const returnMarker = "for (const l of prev.values()) removed.push(l.id);\n    return { added, removed };";
for (const [name, marker] of Object.entries({ importMarker, sortMarker, loopMarker, returnMarker })) if (grid.split(marker).length !== 2) throw Error(`${name} must occur once`);
let routedGrid = grid.replace(importMarker, `${importMarker}\nglobalThis.__R9H_TRACE=[];`);
routedGrid = routedGrid.replace(sortMarker, `${sortMarker}\n    const r9hTrace={call:globalThis.__R9H_TRACE.length+1,nextLotBefore:this.nextLot,prevCount:prev.size,order:edges.map(e=>({id:e.id,type:e.type,len:e.length,jitter:jitter(e)})),edgeRows:[]};globalThis.__R9H_TRACE.push(r9hTrace);`);
routedGrid = routedGrid.replace(loopMarker, `for (const e of edges) {\n      if (this._rec) this._rec.push({ id: e.id, type: e.type, len: +e.length.toFixed(0), sides: {} });\n      const r9hGenerated=this.genEdge(e);r9hTrace.edgeRows.push({id:e.id,type:e.type,len:e.length,nextLotAfterGenerate:this.nextLot,lots:r9hGenerated.map(l=>({id:l.id,key:this._lotKey(l),side:l.side,identityCell:l._identityCell,cells:[...l.cells]}))});\n      for (const lot of r9hGenerated) {`);
routedGrid = routedGrid.replace(returnMarker, `for (const l of prev.values()) removed.push(l.id);\n    Object.assign(r9hTrace,{nextLotAfter:this.nextLot,added:[...added],removed:[...removed],finalLots:[...this.lots.values()].map(l=>({id:l.id,buildingId:l.buildingId,key:this._lotKey(l),edgeId:l.edgeId,side:l.side,identityCell:l._identityCell,cells:[...l.cells]}))});\n    return { added, removed };`);
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const chrome = process.env.SIM_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--use-angle=metal','--use-gl=angle','--enable-webgl','--enable-gpu','--ignore-gpu-blocklist','--no-sandbox'] });
const result = { method: 'disposable instrumented ZoneGrid records every real regenLots call during fresh baseline/candidate staging', sources: { plan: sha(plan), grid: sha(grid), routedGrid: sha(routedGrid), baselinePlan: sha(plans.baseline), candidatePlan: sha(plans.candidate) }, runs: [], comparisons: [], errors: [], pass: false };
try {
  for (const seed of [1337, 7]) for (const variant of ['baseline', 'candidate']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), browserErrors = [];
    page.on('pageerror', e => browserErrors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') browserErrors.push(m.text()); });
    page.on('response', r => { if (r.status() >= 400) browserErrors.push(`HTTP ${r.status()} ${r.url()}`); });
    await page.route('**/@vite/client', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await page.route('**/src/modules/democity/plan.js*', async route => { const response = await route.fetch(); await route.fulfill({ response, body: plans[variant], contentType: 'application/javascript' }); });
    await page.route('**/src/modules/zoning/grid.js*', async route => { const response = await route.fetch(); await route.fulfill({ response, body: routedGrid, contentType: 'application/javascript' }); });
    try {
      await page.goto(`${base}/?showcase=democity&time=12&camera=aerial&seed=${seed}&quality=high&speed=0&headless=1`, { waitUntil: 'domcontentloaded', timeout: 240000 });
      await page.waitForFunction(() => window.__sim?.ready === true && Array.isArray(globalThis.__R9H_TRACE), null, { timeout: 240000 });
      const row = await page.evaluate(({ seed, variant }) => ({ seed, variant, edgeId: globalThis.__R9H_EDGE_ID, traces: structuredClone(globalThis.__R9H_TRACE), counts: { roads: window.__sim.world.roads.edges.size, lots: window.__sim.world.zones.lots.size, buildings: window.__sim.world.buildings.items.size }, errors: [...window.__sim.errors], modules: structuredClone(window.__sim.stats().modules) }), { seed, variant });
      row.browserErrors = browserErrors;
      row.pass = !row.errors.length && !browserErrors.length && row.counts.lots === row.counts.buildings && Object.values(row.modules).every(m => m.status === 'ready' && m.errors === 0) && row.traces.length > 0;
      result.runs.push(row);
    } finally { await page.close(); }
  }
  for (const seed of [1337, 7]) {
    const b = result.runs.find(r => r.seed === seed && r.variant === 'baseline'), c = result.runs.find(r => r.seed === seed && r.variant === 'candidate');
    const calls = [];
    for (let i = 0; i < Math.max(b.traces.length, c.traces.length); i++) {
      const bt = b.traces[i], ct = c.traces[i];
      if (!bt || !ct) { calls.push({ call: i + 1, missing: true }); continue; }
      const insertionIndex = ct.order.findIndex(e => e.id === c.edgeId);
      const baseOrder = bt.order.map(e => e.id), candidateWithoutNew = ct.order.filter(e => e.id !== c.edgeId).map(e => e.id);
      const bm = new Map(bt.edgeRows.map(r => [r.id, r])), cm = new Map(ct.edgeRows.map(r => [r.id, r]));
      const changedExistingRows = [];
      for (const id of baseOrder) {
        const br = bm.get(id), cr = cm.get(id);
        const keys = r => r?.lots.map(l => l.key) || [];
        if (JSON.stringify(keys(br)) !== JSON.stringify(keys(cr))) changedExistingRows.push({ id, baselineIndex: baseOrder.indexOf(id), candidateIndex: ct.order.findIndex(e => e.id === id), baselineLots: keys(br), candidateLots: keys(cr), baselineNextLotAfterGenerate: br?.nextLotAfterGenerate, candidateNextLotAfterGenerate: cr?.nextLotAfterGenerate });
      }
      calls.push({ call: i + 1, baselinePrev: bt.prevCount, candidatePrev: ct.prevCount, baselineNextLotBefore: bt.nextLotBefore, candidateNextLotBefore: ct.nextLotBefore, baselineNextLotAfter: bt.nextLotAfter, candidateNextLotAfter: ct.nextLotAfter, baselineAdded: bt.added.length, candidateAdded: ct.added.length, baselineRemoved: bt.removed.length, candidateRemoved: ct.removed.length, insertionIndex, newEdgeRow: cm.get(c.edgeId), existingRelativeOrderEqual: JSON.stringify(baseOrder) === JSON.stringify(candidateWithoutNew), changedExistingRows });
    }
    result.comparisons.push({ seed, edgeId: c.edgeId, calls });
  }
} catch (error) { result.errors.push(String(error?.stack || error)); }
finally { await browser.close(); }
result.pass = result.errors.length === 0 && result.runs.length === 4 && result.runs.every(r => r.pass) && result.comparisons.every(c => c.calls.every(x => !x.missing && x.existingRelativeOrderEqual));
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ out, pass: result.pass, errors: result.errors, runs: result.runs.map(r => ({ seed: r.seed, variant: r.variant, edgeId: r.edgeId, traceCalls: r.traces.length, counts: r.counts, pass: r.pass, errors: r.errors, browserErrors: r.browserErrors })), comparisons: result.comparisons.map(c => ({ seed: c.seed, edgeId: c.edgeId, calls: c.calls.map(x => ({ call: x.call, baselinePrev: x.baselinePrev, candidatePrev: x.candidatePrev, baselineNextLotBefore: x.baselineNextLotBefore, candidateNextLotBefore: x.candidateNextLotBefore, baselineNextLotAfter: x.baselineNextLotAfter, candidateNextLotAfter: x.candidateNextLotAfter, baselineAdded: x.baselineAdded, candidateAdded: x.candidateAdded, baselineRemoved: x.baselineRemoved, candidateRemoved: x.candidateRemoved, insertionIndex: x.insertionIndex, newEdgeLots: x.newEdgeRow?.lots.length, changedExistingRows: x.changedExistingRows?.length, firstChangedExisting: x.changedExistingRows?.[0] })) })) }, null, 2));
if (!result.pass) process.exitCode = 1;
