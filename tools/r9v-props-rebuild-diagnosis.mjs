#!/usr/bin/env node
import { chromium } from 'playwright';
import crypto from 'node:crypto';
import fs from 'node:fs';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const out = process.env.OUT_FILE || 'shots/playtest-fixes-r22/props-rebuild-diagnosis.json';

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.route('**/@vite/client', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
await page.goto(`${base}/?showcase=all&seed=7&time=12&camera=aerial&speed=0&quality=high&headless=1`, { waitUntil: 'domcontentloaded', timeout: 240000 });
await page.waitForFunction(() => window.__sim?.ready && window.__sim.registry.apis.props, null, { timeout: 240000 });

const settle = async frames => page.evaluate(async n => {
  const start = window.__sim.engine.stats.frames;
  while (window.__sim.engine.stats.frames < start + n) await Promise.race([new Promise(requestAnimationFrame), new Promise(resolve => setTimeout(resolve, 1000))]);
}, frames);
const snap = async label => page.evaluate(label => {
  const data = window.__sim.registry.apis.props.serialize();
  const byKind = {};
  for (const item of data.items) byKind[item.kind] = (byKind[item.kind] || 0) + 1;
  return { label, version: data.version, count: data.items.length, byKind, nextGeneratedId: data.nextGeneratedId, identities: data.identities.length, manual: data.manual.length, suppressed: data.suppressed.length, data };
}, label);
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

await settle(120);
const before = await snap('before');
await page.evaluate(() => window.__sim.registry.apis.props.rebuild());
await settle(30);
const rebuilt = await snap('rebuilt');
await page.evaluate(() => window.__sim.registry.apis.props.rebuild());
await settle(30);
const rebuiltAgain = await snap('rebuiltAgain');
const simErrors = await page.evaluate(() => window.__sim.errors.slice());

const ids = value => new Set(value.data.items.map(item => item.id));
const summarize = (a, b) => {
  const ai = ids(a), bi = ids(b);
  const byId = value => new Map(value.data.items.map(item => [item.id, item]));
  const am = byId(a), bm = byId(b);
  const changed = [...ai].filter(id => bi.has(id) && JSON.stringify(am.get(id)) !== JSON.stringify(bm.get(id)));
  const content = value => ({ ...value.data, version: 0 });
  return {
    countDelta: b.count - a.count,
    addedIds: [...bi].filter(id => !ai.has(id)).slice(0, 30),
    removedIds: [...ai].filter(id => !bi.has(id)).slice(0, 30),
    kinds: Object.fromEntries([...new Set([...Object.keys(a.byKind), ...Object.keys(b.byKind)])].sort().map(kind => [kind, (b.byKind[kind] || 0) - (a.byKind[kind] || 0)]).filter(([, delta]) => delta)),
    exact: hash(a.data) === hash(b.data),
    contentExactIgnoringVersion: hash(content(a)) === hash(content(b)),
    changedExistingIds: changed.slice(0, 30),
    addedItems: [...bi].filter(id => !ai.has(id)).slice(0, 12).map(id => bm.get(id)),
    removedItems: [...ai].filter(id => !bi.has(id)).slice(0, 12).map(id => am.get(id)),
  };
};
const result = { base, simErrors, rows: [before, rebuilt, rebuiltAgain].map(({ data, ...row }) => ({ ...row, digest: hash(data) })), beforeToRebuilt: summarize(before, rebuilt), rebuiltToAgain: summarize(rebuilt, rebuiltAgain) };
result.pass = simErrors.length === 0 && result.beforeToRebuilt.countDelta === 0 && result.beforeToRebuilt.contentExactIgnoringVersion && result.rebuiltToAgain.countDelta === 0 && result.rebuiltToAgain.contentExactIgnoringVersion;
fs.mkdirSync(out.split('/').slice(0, -1).join('/') || '.', { recursive: true });
fs.writeFileSync(out, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
await browser.close();
if (!result.pass) process.exitCode = 1;
