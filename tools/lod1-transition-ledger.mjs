#!/usr/bin/env node
// R9c: synchronized accepted-source Props LOD ledger.
// A routed constructor hook and disposable runtime wrappers observe the real update/_copy path.
// Product source is never rewritten.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const root = process.env.OUT_DIR || 'shots/democity/r9c-lod1-ledger';
const sourcePath = 'src/modules/props/chunks.js';
const source = fs.readFileSync(sourcePath, 'utf8');
const sourceMarker = 'const LOD0_R = 60, LOD1_R = 205, BAND = 12;';
const hookMarker = 'constructor(ctx, geo, mats) {';
if (source.split(sourceMarker).length !== 2 || source.split(hookMarker).length !== 2) throw new Error('accepted R9a source/hook markers must each occur once');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const chrome = process.env.SIM_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
fs.mkdirSync(root, { recursive: true });

const browser = await chromium.launch({
  executablePath: chrome,
  headless: true,
  args: ['--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--no-sandbox'],
});
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: { dir: path.join(root, 'video-tmp'), size: { width: 1920, height: 1080 } },
});
const page = await context.newPage();
const errors = [], warnings = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); else if (m.type() === 'warning') warnings.push(m.text()); });
page.on('response', r => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });
await page.route('**/@vite/client', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
await page.route('**/src/modules/props/chunks.js*', async route => {
  const response = await route.fetch();
  let body = await response.text();
  if (!body.includes(sourceMarker) || !body.includes(hookMarker)) throw new Error('transformed accepted markers missing');
  body = body.replace(hookMarker, `${hookMarker}\n    globalThis.__R9C_FIELD = this;`);
  await route.fulfill({ response, body, contentType: 'application/javascript' });
});

const url = `${base}/?showcase=democity&time=12&camera=park&seed=1337&quality=high&speed=0&headless=1`;
const result = {
  method: 'accepted-source actual-Chrome Metal page; routed field hook plus disposable exact update/_copy wrappers',
  sourcePath,
  sourceSha256: sha(source),
  sourceMarker,
  url,
  synchronizedStates: [],
  moving: null,
  capStress: null,
  errors: [],
  warnings: [],
  pass: false,
};

const settle = async (frames = 3) => page.evaluate(async n => {
  const s = window.__sim, start = s.engine.stats.frames;
  let last = start, lastAt = performance.now();
  while (s.engine.stats.frames < start + n) {
    await Promise.race([new Promise(requestAnimationFrame), new Promise(r => setTimeout(r, 1000))]);
    if (s.engine.stats.frames !== last) { last = s.engine.stats.frames; lastAt = performance.now(); }
    else if (performance.now() - lastAt > 15000) throw Error(`render stalled at ${last}`);
  }
}, frames);

const setCameraSettled = async preset => {
  await page.evaluate(p => window.__sim.setCamera(p), preset);
  await settle(3);
  await page.evaluate(() => {
    const c = window.__sim.camera.camera;
    c.updateProjectionMatrix();
    c.updateMatrixWorld(true);
    c.matrixWorldInverse.copy(c.matrixWorld).invert();
  });
};

const summarizeEvent = event => {
  const sources = new Map();
  const outputs = { lod0: 0, lod1: 0, impostor: 0 };
  for (const call of event.calls) {
    outputs[call.tier] += call.count;
    const key = `${call.chunk}:${call.off}:${call.count}`;
    if (!sources.has(key)) sources.set(key, { chunk: call.chunk, off: call.off, count: call.count, sourceX: call.sourceX, sourceY: call.sourceY, sourceZ: call.sourceZ, sd: call.sd, outputs: [] });
    sources.get(key).outputs.push({ tier: call.tier, blend: call.blend, inverted: call.inverted });
  }
  const membership = [...sources.values()];
  return {
    sourceBuckets: membership.length,
    sourceEntries: membership.reduce((n, x) => n + x.count, 0),
    submittedEntries: outputs.lod0 + outputs.lod1 + outputs.impostor,
    outputEntries: outputs,
    fadeBuckets: membership.filter(x => x.outputs.length > 1 || x.outputs.some(y => y.blend < 1)).length,
    membership,
  };
};

const captureForced = async (label, forceLod) => page.evaluate(({ label, forceLod }) => {
  const s = window.__sim, f = globalThis.__R9C_FIELD, camera = s.camera.camera;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
  globalThis.__R9C_EVENTS.length = 0;
  globalThis.__R9C_CAPTURE = true;
  f.forceLod = forceLod;
  f.update(camera, s.camera.pitch, true);
  globalThis.__R9C_CAPTURE = false;
  const event = globalThis.__R9C_EVENTS.at(-1);
  return {
    label,
    forceLod,
    camera: {
      target: s.camera.target.toArray(), yaw: s.camera.yaw, pitch: s.camera.pitch,
      distance: s.camera.distance, position: camera.position.toArray(),
      matrixWorld: camera.matrixWorld.toArray(), matrixWorldInverse: camera.matrixWorldInverse.toArray(),
    },
    fieldCamera: f._camPos.toArray(),
    lastCamera: f._lastCam.toArray(),
    queue: f._queue.length,
    histogram: { ...s.registry.apis.props.debug.lodHistogram() },
    event,
    stats: s.stats(),
    simErrors: [...s.errors],
  };
}, { label, forceLod });

let videoPath = null;
try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__sim?.ready === true && globalThis.__R9C_FIELD, null, { timeout: 180000 });
  await settle(18);
  await page.evaluate(() => {
    const f = globalThis.__R9C_FIELD;
    globalThis.__R9C_EVENTS = [];
    globalThis.__R9C_CAPTURE = false;
    const rawCopy = f._copy.bind(f);
    const rawUpdate = f.update.bind(f);
    f._copy = function(c, mesh, sub, n, blend, inverted, isImp = false) {
      const before = n;
      const after = rawCopy(c, mesh, sub, n, blend, inverted, isImp);
      if (globalThis.__R9C_CAPTURE && globalThis.__R9C_CURRENT) {
        globalThis.__R9C_CURRENT.calls.push({
          chunk: c.i, off: sub.off, count: sub.count,
          sourceX: sub.x, sourceZ: sub.z, sourceY: c.cy,
          sd: Math.hypot(sub.x - this._camPos.x, sub.z - this._camPos.z, c.cy - this._camPos.y),
          tier: mesh === c.lod0 ? 'lod0' : mesh === c.lod1 ? 'lod1' : 'impostor',
          blend, inverted, isImp, before, after,
        });
      }
      return after;
    };
    f.update = function(camera, pitch, force = false) {
      let event = null;
      if (globalThis.__R9C_CAPTURE) {
        event = {
          frame: window.__sim.engine.stats.frames, force,
          cameraPosition: camera.position.toArray(), pitch,
          fieldCameraBefore: this._camPos?.toArray?.() || null,
          lastCameraBefore: this._lastCam.toArray(), queueBefore: this._queue.length,
          calls: [],
        };
        globalThis.__R9C_CURRENT = event;
      }
      const changed = rawUpdate(camera, pitch, force);
      if (event) {
        event.changed = changed;
        event.fieldCameraAfter = this._camPos.toArray();
        event.lastCameraAfter = this._lastCam.toArray();
        event.queueAfter = this._queue.length;
        event.histogramAfter = { ...this.lodCounts };
        globalThis.__R9C_EVENTS.push(event);
        globalThis.__R9C_CURRENT = null;
      }
      return changed;
    };
  });

  const baseCamera = await page.evaluate(() => ({
    target: window.__sim.camera.target.toArray(),
    yaw: window.__sim.camera.yaw,
    pitch: window.__sim.camera.pitch,
  }));

  for (const distance of [155, 193, 205, 217, 255]) {
    await setCameraSettled({ ...baseCamera, distance });
    const state = await captureForced(`automatic-${distance}`, null);
    state.summary = summarizeEvent(state.event);
    delete state.event;
    result.synchronizedStates.push(state);
  }

  // Start at an exact synchronized automatic state, then retain every ordinary update event during flight.
  await setCameraSettled({ ...baseCamera, distance: 155 });
  const movingStart = await captureForced('moving-start-exact', null);
  await page.evaluate(() => {
    globalThis.__R9C_EVENTS.length = 0; globalThis.__R9C_CAPTURE = true;
    const marker = document.createElement('div');
    marker.id = 'r9c-video-marker'; marker.textContent = 'R9C MOVING';
    Object.assign(marker.style, { position:'fixed', right:'18px', top:'18px', zIndex:999999, padding:'8px 12px', background:'#101820', color:'#fff', font:'700 18px sans-serif' });
    document.body.appendChild(marker);
  });
  await page.evaluate(p => window.__sim.camera.flyTo({ ...p, distance: 255 }, 3.5), baseCamera);
  const movingRows = await page.evaluate(async () => {
    const s = window.__sim, f = globalThis.__R9C_FIELD, rows = [];
    const first = s.engine.stats.frames;
    while (s.camera._fly || f._queue.length) {
      await Promise.race([new Promise(requestAnimationFrame), new Promise(r => setTimeout(r, 1000))]);
      rows.push({
        frame: s.engine.stats.frames - first, distance: s.camera.distance,
        cameraPosition: s.camera.camera.position.toArray(), lastCamera: f._lastCam.toArray(),
        queue: f._queue.length, histogram: { ...f.lodCounts },
      });
      if (rows.length > 600) throw Error('moving path did not settle');
    }
    globalThis.__R9C_CAPTURE = false;
    return rows;
  });
  await settle(3);
  await page.evaluate(() => { const m=document.getElementById('r9c-video-marker'); if(m) m.textContent='R9C AUTO END'; });
  await settle(5);
  await page.evaluate(() => { document.getElementById('r9c-video-marker')?.remove(); window.__sim.freeze(); });
  const beforeExact = await page.evaluate(() => {
    const s = window.__sim, f = globalThis.__R9C_FIELD;
    return {
      cameraDistance: s.camera.distance, cameraPosition: s.camera.camera.position.toArray(),
      lastCamera: f._lastCam.toArray(), queue: f._queue.length,
      histogram: { ...f.lodCounts }, events: globalThis.__R9C_EVENTS,
    };
  });
  await page.screenshot({ path: path.join(root, 'moving_end_auto.png'), type: 'png', timeout: 180000 });
  const movingEndExact = await captureForced('moving-end-exact', null);
  movingEndExact.summary = summarizeEvent(movingEndExact.event);
  delete movingEndExact.event;
  await page.evaluate(() => window.__sim.unfreeze());
  await settle(3);
  await page.evaluate(() => window.__sim.freeze());
  result.moving = {
    start: { camera: movingStart.camera, histogram: movingStart.histogram, summary: summarizeEvent(movingStart.event) },
    rows: movingRows,
    ordinaryEvents: beforeExact.events,
    beforeExact: { ...beforeExact, events: undefined },
    exactEnd: movingEndExact,
  };
  await page.screenshot({ path: path.join(root, 'moving_end_exact.png'), type: 'png', timeout: 180000 });
  await page.evaluate(() => window.__sim.unfreeze());

  // Existing forced debug mode, now with camera matrices settled and the same update's exact _copy ledger.
  await setCameraSettled({ ...baseCamera, distance: 155 });
  const cap = await captureForced('forced-lod1-cap', 1);
  cap.summary = summarizeEvent(cap.event);
  delete cap.event;
  result.capStress = cap;
  await settle(3);
  await page.evaluate(() => window.__sim.freeze());
  await page.screenshot({ path: path.join(root, 'cap_stress_synced.png'), type: 'png', timeout: 180000 });
  await page.evaluate(() => window.__sim.unfreeze());
  await captureForced('restore-automatic', null);

  result.finalSourceSha256 = sha(fs.readFileSync(sourcePath));
  result.errors = [...new Set([...errors, ...(await page.evaluate(() => window.__sim.errors.slice()))])];
  result.warnings = [...new Set(warnings)];
  const exact = result.moving.exactEnd;
  const capSummary = result.capStress.summary;
  result.pass = result.sourceSha256 === result.finalSourceSha256
    && result.synchronizedStates.length === 5
    && result.moving.rows.length > 10
    && result.moving.beforeExact.queue === 0
    && exact.queue === 0
    && capSummary.sourceEntries === capSummary.submittedEntries
    && capSummary.outputEntries.lod1 === 520
    && result.errors.length === 0;
} finally {
  const video = page.video();
  await page.close();
  if (video) videoPath = await video.path().catch(() => null);
  await context.close();
  await browser.close();
}

if (videoPath && fs.existsSync(videoPath)) {
  const destination = path.join(root, 'session.webm');
  fs.renameSync(videoPath, destination);
  result.video = destination;
}
result.finalSourceSha256 ||= sha(fs.readFileSync(sourcePath));
fs.writeFileSync(path.join(root, 'ledger.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({
  root, pass: result.pass, sourceSha256: result.sourceSha256,
  synchronized: result.synchronizedStates.map(x => ({ label: x.label, histogram: x.histogram, source: x.summary.sourceEntries, submitted: x.summary.submittedEntries, fadeBuckets: x.summary.fadeBuckets })),
  movingFrames: result.moving?.rows.length,
  movingBeforeExact: result.moving?.beforeExact,
  movingExactEnd: result.moving?.exactEnd && { histogram: result.moving.exactEnd.histogram, summary: Object.fromEntries(Object.entries(result.moving.exactEnd.summary).filter(([k]) => k !== 'membership')) },
  cap: result.capStress && { histogram: result.capStress.histogram, summary: Object.fromEntries(Object.entries(result.capStress.summary).filter(([k]) => k !== 'membership')) },
  video: result.video,
  errors: result.errors.length,
}, null, 2));
