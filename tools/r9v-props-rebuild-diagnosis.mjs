#!/usr/bin/env node
import { chromium } from 'playwright';
import crypto from 'node:crypto';

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.route('**/@vite/client', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
await page.goto('http://127.0.0.1:5173/?showcase=all&seed=7&time=12&camera=aerial&speed=0&quality=high&headless=1', { waitUntil: 'domcontentloaded', timeout: 240000 });
await page.waitForFunction(() => window.__sim?.ready && window.__sim.registry.apis.props, null, { timeout: 240000 });

const settle = async frames => page.evaluate(async n => {
  const start = window.__sim.engine.stats.frames;
  while (window.__sim.engine.stats.frames < start + n) await Promise.race([new Promise(requestAnimationFrame), new Promise(resolve => setTimeout(resolve, 1000))]);
}, frames);
const snap = async label => page.evaluate(label => {
  const data = window.__sim.registry.apis.props.serialize();
  const byKind = {};
  for (const item of data.items) byKind[item.kind] = (byKind[item.kind] || 0) + 1;
  return { label, count: data.items.length, byKind, nextGeneratedId: data.nextGeneratedId, identities: data.identities.length, manual: data.manual.length, suppressed: data.suppressed.length, data };
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

const ids = value => new Set(value.data.items.map(item => item.id));
const summarize = (a, b) => {
  const ai = ids(a), bi = ids(b);
  return {
    countDelta: b.count - a.count,
    addedIds: [...bi].filter(id => !ai.has(id)).slice(0, 30),
    removedIds: [...ai].filter(id => !bi.has(id)).slice(0, 30),
    kinds: Object.fromEntries([...new Set([...Object.keys(a.byKind), ...Object.keys(b.byKind)])].sort().map(kind => [kind, (b.byKind[kind] || 0) - (a.byKind[kind] || 0)]).filter(([, delta]) => delta)),
    exact: hash(a.data) === hash(b.data),
  };
};
console.log(JSON.stringify({ rows: [before, rebuilt, rebuiltAgain].map(({ data, ...row }) => ({ ...row, digest: hash(data) })), beforeToRebuilt: summarize(before, rebuilt), rebuiltToAgain: summarize(rebuilt, rebuiltAgain) }, null, 2));
await browser.close();
