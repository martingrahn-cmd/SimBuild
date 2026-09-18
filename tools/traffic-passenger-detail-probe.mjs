#!/usr/bin/env node
import { chromium } from 'playwright';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const baseline = process.env.SIM_BASELINE_URL || 'http://127.0.0.1:5185';
const candidate = process.env.SIM_CANDIDATE_URL || 'http://127.0.0.1:5186';
const out = process.env.SIM_TRAFFIC_DETAIL_OUT || 'shots/traffic/passenger-detail-contract.json';
const affected = new Set(['sedan', 'hatchback', 'suv', 'taxi', 'pickup', 'police']);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu', '--ignore-gpu-blocklist', '--no-sandbox'],
});

async function capture(base) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const browserErrors = [];
  page.on('pageerror', error => browserErrors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()); });
  await page.goto(`${base}/?showcase=traffic&seed=1337&time=12&camera=fleet&headless=1&speed=0`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 300000 });
  const data = await page.evaluate(() => {
    const sim = window.__sim, api = sim.registry.apis.traffic;
    api.freeze(true);
    return { stats: api.stats(), state: JSON.stringify(api.serialize()), engineErrors: sim.errors.slice() };
  });
  await page.close();
  return { byKindTris: data.stats.byKindTris, stateHash: hash(data.state), engineErrors: data.engineErrors, browserErrors };
}

const before = await capture(baseline);
const after = await capture(candidate);
const repeat = await capture(candidate);
const deltas = Object.fromEntries(Object.keys(before.byKindTris).map(kind => [kind, after.byKindTris[kind] - before.byKindTris[kind]]));
const ok = before.stateHash === after.stateHash
  && after.stateHash === repeat.stateHash
  && Object.entries(deltas).every(([kind, delta]) => affected.has(kind) ? delta > 0 : delta === 0)
  && JSON.stringify(after.byKindTris) === JSON.stringify(repeat.byKindTris)
  && [before, after, repeat].every(run => run.engineErrors.length === 0 && run.browserErrors.length === 0);
const result = { ok, baseline, candidate, affected: [...affected], deltas, before, after, repeat };
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
await browser.close();
if (!ok) process.exitCode = 1;
