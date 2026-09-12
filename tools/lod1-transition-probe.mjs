#!/usr/bin/env node
// R9b: accepted-source moving/static LOD transition and CAP1 stress diagnosis.
// Routes an observability hook only; product source is never rewritten.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const root = process.env.OUT_DIR || 'shots/democity/r9b-lod1-transition';
const sourcePath = 'src/modules/props/chunks.js';
const source = fs.readFileSync(sourcePath, 'utf8');
const sourceMarker = 'const LOD0_R = 60, LOD1_R = 205, BAND = 12;';
const hookMarker = 'constructor(ctx, geo, mats) {';
if (source.split(sourceMarker).length !== 2 || source.split(hookMarker).length !== 2) throw new Error('accepted R9a source/hook markers must each occur once');
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const chrome = process.env.SIM_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
fs.mkdirSync(root, { recursive: true });

const browser = await chromium.launch({
  executablePath: chrome,
  headless: true,
  args: ['--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [], warnings = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); else if (m.type() === 'warning') warnings.push(m.text()); });
page.on('response', r => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });
await page.route('**/@vite/client', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
await page.route('**/src/modules/props/chunks.js*', async route => {
  const response = await route.fetch();
  let body = await response.text();
  if (!body.includes(sourceMarker) || !body.includes(hookMarker)) throw new Error('transformed accepted markers missing');
  body = body.replace(hookMarker, `${hookMarker}\n    globalThis.__R9B_FIELD = this;`);
  await route.fulfill({ response, body, contentType: 'application/javascript' });
});

const url = `${base}/?showcase=democity&time=12&camera=park&seed=1337&quality=high&speed=0&headless=1`;
const result = {
  method: 'one accepted-source actual-Chrome Metal page; routed observability hook only',
  sourcePath,
  sourceSha256: sha(source),
  sourceMarker,
  transitionM: [193, 217],
  cap1: 520,
  url,
  staticPath: [],
  movingPath: [],
  capSearch: [],
  capAutomaticMax: null,
  capSelected: null,
  errors: [],
  warnings: [],
  pass: false,
};

const settle = async (frames = 14) => page.evaluate(async n => {
  const s = window.__sim, start = s.engine.stats.frames;
  let last = start, lastAt = performance.now();
  while (s.engine.stats.frames < start + n) {
    await Promise.race([new Promise(requestAnimationFrame), new Promise(r => setTimeout(r, 1000))]);
    if (s.engine.stats.frames !== last) { last = s.engine.stats.frames; lastAt = performance.now(); }
    else if (performance.now() - lastAt > 15000) throw Error(`render stalled at ${last}`);
  }
  return s.engine.stats.frames - start;
}, frames);

const applyAndRead = async preset => {
  await page.evaluate(p => {
    const s = window.__sim;
    s.setCamera(p);
    s.registry.apis.props.debug.setLod(null); // force every queued chunk to the accepted automatic rule
  }, preset);
  await settle(3);
  return page.evaluate(() => {
    const s = window.__sim, f = globalThis.__R9B_FIELD, cam = s.camera.camera.position;
    let directTier1Demand = 0, transitionSource = 0, consideredSource = 0, visibleChunks = 0;
    for (const c of f.chunks.values()) {
      const center = new cam.constructor(c.cx, c.cy, c.cz);
      const inFrustum = f._frustum?.intersectsSphere?.({ center, radius: c.radius }) ?? false;
      if (!inFrustum || !c.n) continue;
      visibleChunks++;
      for (const sub of c.subs) {
        const sd = Math.hypot(sub.x - cam.x, sub.z - cam.z, c.cy - cam.y);
        consideredSource += sub.count;
        if (sd >= 72 && sd < 217) directTier1Demand += sub.count;
        if (sd >= 193 && sd < 217) transitionSource += sub.count;
      }
    }
    return {
      camera: { target: s.camera.target.toArray(), yaw: s.camera.yaw, pitch: s.camera.pitch, distance: s.camera.distance, position: cam.toArray() },
      topDown: f.topDown,
      queue: f._queue?.length || 0,
      lod: s.registry.apis.props.debug.lodHistogram(),
      directTier1Demand,
      transitionSource,
      consideredSource,
      visibleChunks,
      stats: s.stats(),
      simErrors: [...s.errors],
    };
  });
};

try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__sim?.ready === true && globalThis.__R9B_FIELD, null, { timeout: 180000 });
  await settle(18);
  const baseCamera = await page.evaluate(() => ({
    target: window.__sim.camera.target.toArray(),
    yaw: window.__sim.camera.yaw,
    pitch: window.__sim.camera.pitch,
  }));

  // Fully settle discrete zoom positions through the installed transition region.
  for (const distance of [155, 175, 185, 193, 199, 205, 211, 217, 225, 235, 255]) {
    const row = await applyAndRead({ ...baseCamera, distance });
    row.requestedDistance = distance;
    result.staticPath.push(row);
    if ([175, 193, 205, 217, 235].includes(distance)) {
      await page.evaluate(() => window.__sim.freeze());
      await page.screenshot({ path: path.join(root, `static_${distance}.png`), type: 'png', timeout: 180000 });
      await page.evaluate(() => window.__sim.unfreeze());
    }
  }

  // Actual camera flight: retain per-render-frame queue/histogram behavior.
  await page.evaluate(p => { window.__sim.setCamera({ ...p, distance: 155 }); window.__sim.registry.apis.props.debug.setLod(null); }, baseCamera);
  await settle(4);
  result.movingPath = await page.evaluate(async p => {
    const s = window.__sim, f = globalThis.__R9B_FIELD, rows = [];
    s.camera.flyTo({ ...p, distance: 255 }, 3.5);
    const first = s.engine.stats.frames;
    while (s.camera._fly || (f._queue?.length || 0)) {
      await Promise.race([new Promise(requestAnimationFrame), new Promise(r => setTimeout(r, 1000))]);
      rows.push({
        frame: s.engine.stats.frames - first,
        distance: s.camera.distance,
        pitch: s.camera.pitch,
        queue: f._queue?.length || 0,
        lod: { ...s.registry.apis.props.debug.lodHistogram() },
      });
      if (rows.length > 600) throw Error('moving path did not settle');
    }
    return rows;
  }, baseCamera);

  // Search accepted non-top-down camera configurations for direct tier-1 demand above CAP1.
  const targets = [
    { id: 'park', target: [400, 18, 300] },
    { id: 'downtown', target: [0, 42, 20] },
    { id: 'suburb', target: [-320, 20, 490] },
  ];
  for (const target of targets) for (const pitch of [0.25, 0.4, 0.55, 0.61]) for (const distance of [80, 110, 140, 170, 200]) {
    const row = await applyAndRead({ target: target.target, yaw: 0.75, pitch, distance });
    result.capSearch.push({ id: target.id, requestedPitch: pitch, requestedDistance: distance, ...row });
  }
  result.capAutomaticMax = result.capSearch.slice().sort((a, b) => b.directTier1Demand - a.directTier1Demand)[0];

  // The ordinary search does not naturally saturate CAP1. Exercise the real cap path through the existing
  // debug force-LOD API in the accepted non-top-down park camera; forceLod=1 still passes through CAP1 and
  // demotes later sub-buckets to impostors. This is a diagnostic stress, not an ordinary-view claim.
  const parkStress = await applyAndRead({ ...baseCamera, distance: 155 });
  await page.evaluate(() => window.__sim.registry.apis.props.debug.setLod(1));
  await settle(3);
  const forced = await page.evaluate(() => {
    const s = window.__sim, f = globalThis.__R9B_FIELD;
    return { topDown: f.topDown, queue: f._queue?.length || 0, lod: s.registry.apis.props.debug.lodHistogram(), stats: s.stats(), simErrors: [...s.errors] };
  });
  result.capSelected = { mode: 'existing debug setLod(1), real CAP1 path', ordinaryView: false, camera: parkStress.camera, consideredSource: parkStress.consideredSource, ...forced };
  await page.evaluate(() => window.__sim.freeze());
  await page.screenshot({ path: path.join(root, 'cap_stress.png'), type: 'png', timeout: 180000 });
  await page.evaluate(() => window.__sim.unfreeze());
  await page.evaluate(() => window.__sim.registry.apis.props.debug.setLod(null));

  result.finalSourceSha256 = sha(fs.readFileSync(sourcePath));
  result.errors = [...new Set([...errors, ...(await page.evaluate(() => window.__sim.errors.slice()))])];
  result.warnings = [...new Set(warnings)];
  result.pass = result.sourceSha256 === result.finalSourceSha256 && result.staticPath.length === 11 && result.movingPath.length > 10 && result.capSearch.length === 60 && result.capSelected?.topDown === 0 && result.capSelected?.lod?.lod1 <= 520 && result.capSelected?.lod?.impostor > 0 && result.errors.length === 0;
} finally {
  await browser.close();
}

fs.writeFileSync(path.join(root, 'probe.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({
  root,
  pass: result.pass,
  sourceSha256: result.sourceSha256,
  static: result.staticPath.map(r => ({ distance: r.requestedDistance, lod: r.lod, demand: r.directTier1Demand, transition: r.transitionSource, queue: r.queue })),
  movingFrames: result.movingPath.length,
  movingMaxQueue: Math.max(0, ...result.movingPath.map(r => r.queue)),
  capAutomaticMax: result.capAutomaticMax && { id: result.capAutomaticMax.id, pitch: result.capAutomaticMax.camera.pitch, distance: result.capAutomaticMax.camera.distance, topDown: result.capAutomaticMax.topDown, lod: result.capAutomaticMax.lod, directTier1Demand: result.capAutomaticMax.directTier1Demand, transitionSource: result.capAutomaticMax.transitionSource },
  capSelected: result.capSelected && { mode: result.capSelected.mode, pitch: result.capSelected.camera.pitch, distance: result.capSelected.camera.distance, topDown: result.capSelected.topDown, lod: result.capSelected.lod, consideredSource: result.capSelected.consideredSource },
  errors: result.errors.length,
}, null, 2));
