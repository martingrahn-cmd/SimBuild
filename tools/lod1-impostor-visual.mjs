#!/usr/bin/env node
// R9d: synchronized, disposable comparison of the accepted LOD1 crown and impostor.
// One real park chunk is isolated so the unchanged CAP1=520 never saturates.
// Product source is read and routed only to expose the PropField on each disposable page.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const root = process.env.OUT_DIR || 'shots/democity/r9d-lod1-impostor';
const sourcePath = 'src/modules/props/chunks.js';
const source = fs.readFileSync(sourcePath, 'utf8');
const treeSourcePath = 'src/modules/props/trees.js';
const treeSource = fs.readFileSync(treeSourcePath, 'utf8');
const textureSourcePath = 'src/modules/props/textures.js';
const textureSource = fs.readFileSync(textureSourcePath, 'utf8');
const sourceMarker = 'const LOD0_R = 60, LOD1_R = 205, BAND = 12;';
const hookMarker = 'constructor(ctx, geo, mats) {';
if (source.split(sourceMarker).length !== 2 || source.split(hookMarker).length !== 2) throw new Error('accepted source markers must each occur once');
const acceptedAlpha = 0.42;
const impostorAlpha = Number(process.env.IMP_ALPHA || acceptedAlpha);
if (!Number.isFinite(impostorAlpha) || impostorAlpha < acceptedAlpha || impostorAlpha > 0.65) throw new Error('IMP_ALPHA must be finite from0.42 through0.65');
const alphaMarker = 'alphaTest: 0.42';
if (treeSource.split(alphaMarker).length !== 3) throw new Error('accepted impostor alpha marker must occur twice');
const bandOnly = process.env.BAND_ONLY === '1';
const sideLobes = process.env.SIDE_LOBES === '1';
const narrowMarker = 'blob(cx, baseY - treeH * 0.66, treeH * 0.20, 70, 0.46, 0.40, 420, false, 0.075, 1.7);';
const broadMarker = 'blob(cx, baseY - treeH * 0.66, treeH * 0.46, 88, 0.44, 0.40, 520, true, 0.078, 0.94);';
const narrowLobes = `blob(cx - treeH * 0.045, baseY - treeH * 0.57, treeH * 0.125, 70, 0.46, 0.34, 150, false, 0.075, 1.45);
    blob(cx + treeH * 0.045, baseY - treeH * 0.68, treeH * 0.13, 73, 0.44, 0.43, 150, false, 0.075, 1.45);
    blob(cx, baseY - treeH * 0.79, treeH * 0.12, 68, 0.42, 0.47, 120, false, 0.075, 1.40);`;
const broadLobes = `blob(cx - treeH * 0.16, baseY - treeH * 0.60, treeH * 0.29, 88, 0.44, 0.34, 180, true, 0.075, 0.82);
    blob(cx + treeH * 0.16, baseY - treeH * 0.61, treeH * 0.29, 91, 0.43, 0.44, 180, true, 0.075, 0.82);
    blob(cx, baseY - treeH * 0.78, treeH * 0.30, 86, 0.42, 0.43, 160, true, 0.075, 0.80);`;
const acceptedSideSource = textureSource.split(narrowMarker).length === 2 && textureSource.split(broadMarker).length === 2;
const productSideSource = textureSource.split(narrowLobes).length === 2 && textureSource.split(broadLobes).length === 2;
if (acceptedSideSource === productSideSource) throw new Error('exactly one recognized side-atlas source state is required');
if (sideLobes && !acceptedSideSource) throw new Error('SIDE_LOBES candidate is already installed; run without SIDE_LOBES to verify product source');
const routedTextureSource = sideLobes ? textureSource.replace(narrowMarker, narrowLobes).replace(broadMarker, broadLobes) : textureSource;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const chrome = process.env.SIM_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const cases = [
  { id: 'day_a0', time: 12, yawOffset: 0 },
  { id: 'day_a90', time: 12, yawOffset: Math.PI / 2 },
  { id: 'day_a180', time: 12, yawOffset: Math.PI },
  { id: 'day_a270', time: 12, yawOffset: Math.PI * 1.5 },
  { id: 'night_a0', time: 22, yawOffset: 0 },
];
const classNames = ['conifer', 'broad', 'narrow', 'wide', 'ornamental'];
fs.mkdirSync(root, { recursive: true });

const browser = await chromium.launch({
  executablePath: chrome,
  headless: true,
  args: ['--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--no-sandbox'],
});
const result = {
  method: 'fresh actual-Chrome Metal page per pair; synchronized camera; one real park chunk; public debug setLod; unchanged CAP1/range/band/update threshold',
  sourcePath,
  sourceSha256: sha(source),
  treeSourcePath,
  treeSourceSha256: sha(treeSource),
  textureSourcePath,
  textureSourceSha256: sha(textureSource),
  routedTextureSha256: sha(routedTextureSource),
  sourceMarker,
  acceptedAlpha,
  impostorAlpha,
  bandOnly,
  sideLobes,
  sideSourceState: acceptedSideSource ? 'r9d-accepted' : 'r9e-product',
  cap1: 520,
  distance: 205,
  classNames,
  cases: [],
  errors: [],
  pass: false,
};

const settle = async (page, frames = 3) => page.evaluate(async n => {
  const s = window.__sim, start = s.engine.stats.frames;
  let last = start, lastAt = performance.now();
  while (s.engine.stats.frames < start + n) {
    await Promise.race([new Promise(requestAnimationFrame), new Promise(r => setTimeout(r, 1000))]);
    if (s.engine.stats.frames !== last) { last = s.engine.stats.frames; lastAt = performance.now(); }
    else if (performance.now() - lastAt > 15000) throw Error(`render stalled at ${last}`);
  }
}, frames);

try {
  for (const spec of cases) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const pageErrors = [], warnings = [];
    page.on('pageerror', e => pageErrors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') pageErrors.push(m.text()); else if (m.type() === 'warning') warnings.push(m.text()); });
    page.on('response', r => { if (r.status() >= 400) pageErrors.push(`HTTP ${r.status()} ${r.url()}`); });
    await page.route('**/@vite/client', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await page.route('**/src/modules/props/chunks.js*', async route => {
      const response = await route.fetch();
      let body = await response.text();
      if (!body.includes(sourceMarker) || !body.includes(hookMarker)) throw new Error('transformed accepted markers missing');
      body = body.replace(hookMarker, `${hookMarker}\n    globalThis.__R9D_FIELD = this;`);
      await route.fulfill({ response, body, contentType: 'application/javascript' });
    });
    if (impostorAlpha !== acceptedAlpha) await page.route('**/src/modules/props/trees.js*', async route => {
      const response = await route.fetch();
      let body = await response.text();
      if (body.split(alphaMarker).length !== 3) throw new Error('transformed impostor alpha markers missing');
      body = body.replaceAll(alphaMarker, `alphaTest: ${impostorAlpha.toFixed(2)}`);
      await route.fulfill({ response, body, contentType: 'application/javascript' });
    });
    if (sideLobes) await page.route('**/src/modules/props/textures.js*', async route => {
      const response = await route.fetch();
      let body = await response.text();
      if (!body.includes(narrowMarker) || !body.includes(broadMarker)) throw new Error('transformed side markers missing');
      body = body.replace(narrowMarker, narrowLobes).replace(broadMarker, broadLobes);
      await route.fulfill({ response, body, contentType: 'application/javascript' });
    });
    const url = `${base}/?showcase=democity&time=${spec.time}&camera=park&seed=1337&quality=high&speed=0&headless=1`;
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
      await page.waitForFunction(() => window.__sim?.ready === true && globalThis.__R9D_FIELD, null, { timeout: 180000 });
      await settle(page, 18);
      const baseCamera = await page.evaluate(() => ({
        target: window.__sim.camera.target.toArray(),
        yaw: window.__sim.camera.yaw,
        pitch: window.__sim.camera.pitch,
      }));
      await page.evaluate(p => window.__sim.setCamera(p), {
        target: baseCamera.target,
        yaw: baseCamera.yaw + spec.yawOffset,
        pitch: baseCamera.pitch,
        distance: 205,
      });
      await settle(page, 3);
      const setup = await page.evaluate(({ bandOnly }) => {
        const s = window.__sim, f = globalThis.__R9D_FIELD, camera = s.camera.camera;
        camera.updateProjectionMatrix(); camera.updateMatrixWorld(true); camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
        const target = s.camera.target;
        const chunks = [...f.chunks.values()].filter(c => c.n > 0).sort((a, b) => Math.hypot(a.cx - target.x, a.cz - target.z) - Math.hypot(b.cx - target.x, b.cz - target.z));
        const selected = chunks[0];
        if (!selected || selected.n > 520) throw Error(`real target chunk cannot isolate below unchanged CAP1: ${selected?.n}`);
        const originalChunkTrees = selected.n;
        if (bandOnly) selected.subs = selected.subs.filter(sub => {
          const sd = Math.hypot(sub.x - camera.position.x, sub.z - camera.position.z, selected.cy - camera.position.y);
          return sd >= 193 && sd < 217;
        });
        const sourceTrees = selected.subs.reduce((n, sub) => n + sub.count, 0);
        if (!sourceTrees) throw Error('no real selector-band trees for isolated view');
        for (const c of chunks) if (c !== selected) c.lod0.visible = c.lod1.visible = c.imp.visible = false;
        f.chunks = new Map([[selected.i, selected]]);
        for (const owner of ['traffic', 'transit']) {
          const group = s.registry.get(owner)?.group;
          if (group) Object.defineProperty(group, 'visible', { configurable: true, get: () => false, set: () => {} });
        }
        return { chunk: selected.i, center: [selected.cx, selected.cy, selected.cz], originalChunkTrees, sourceTrees, subBuckets: selected.subs.length, camera: { target: target.toArray(), yaw: s.camera.yaw, pitch: s.camera.pitch, distance: s.camera.distance, position: camera.position.toArray(), matrixWorld: camera.matrixWorld.toArray(), matrixWorldInverse: camera.matrixWorldInverse.toArray(), projectionMatrix: camera.projectionMatrix.toArray() } };
      }, { bandOnly });

      const capture = async level => {
        const data = await page.evaluate(level => {
          const s = window.__sim, f = globalThis.__R9D_FIELD, camera = s.camera.camera;
          camera.updateProjectionMatrix(); camera.updateMatrixWorld(true); camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
          s.registry.apis.props.debug.setLod(level);
          return { histogram: { ...s.registry.apis.props.debug.lodHistogram() }, statsBeforeSettle: s.stats() };
        }, level);
        await settle(page, 3);
        const census = await page.evaluate(({ level, classNames }) => {
          const s = window.__sim, f = globalThis.__R9D_FIELD, camera = s.camera.camera, c = [...f.chunks.values()][0];
          const bins = { lt4: 0, p4_8: 0, p8_16: 0, p16_32: 0, gte32: 0 };
          const classes = Object.fromEntries(classNames.map(n => [n, { count: 0, viewportCount: 0, projectedAreaWeight: 0 }]));
          const angles = { p0_22p5: 0, p22p5_45: 0, p45_67p5: 0, p67p5_90: 0 };
          const entries = [];
          const fold = a => { a = Math.abs(Math.atan2(Math.sin(a), Math.cos(a))); if (a > Math.PI / 2) a = Math.PI - a; return Math.abs(a); };
          const sourceIndices = c.subs.flatMap(sub => Array.from({ length: sub.count }, (_, j) => sub.off + j));
          for (const i of sourceIndices) {
            const m = c.mat, o = i * 16, x = m[o + 12], y = m[o + 13], z = m[o + 14];
            const height = Math.hypot(m[o], m[o + 1], m[o + 2]);
            const heading = Math.atan2(m[o + 8], m[o]);
            const base = camera.position.clone().set(x, y, z).project(camera);
            const top = camera.position.clone().set(x, y + height, z).project(camera);
            const pixels = Math.abs(top.y - base.y) * 540;
            const inViewport = base.z >= -1 && base.z <= 1 && Math.abs(base.x) <= 1.05 && Math.abs((base.y + top.y) * 0.5) <= 1.05;
            const cls = Math.round(c.impA[i * 4 + 3]), className = classNames[cls] || `class${cls}`;
            const rel = fold(Math.atan2(camera.position.x - x, camera.position.z - z) - heading);
            const sizeBin = pixels < 4 ? 'lt4' : pixels < 8 ? 'p4_8' : pixels < 16 ? 'p8_16' : pixels < 32 ? 'p16_32' : 'gte32';
            const angleBin = rel < Math.PI / 8 ? 'p0_22p5' : rel < Math.PI / 4 ? 'p22p5_45' : rel < Math.PI * 3 / 8 ? 'p45_67p5' : 'p67p5_90';
            classes[className].count++;
            if (inViewport) { bins[sizeBin]++; angles[angleBin]++; classes[className].viewportCount++; classes[className].projectedAreaWeight += pixels * pixels * c.impA[i * 4]; }
            entries.push({ i, x, y, z, height, class: cls, className, sideVariant: Math.round(c.impA[i * 4 + 2]), projectedHeightPx: pixels, relativeYawDeg: rel * 180 / Math.PI, inViewport, sizeBin, angleBin });
          }
          return { level, histogram: { ...f.lodCounts }, stats: s.stats(), bins, angles, classes, entries, simErrors: [...s.errors] };
        }, { level, classNames });
        const name = `${spec.id}_${level === 1 ? 'lod1' : 'impostor'}`;
        const png = path.join(root, `${name}.png`);
        await page.screenshot({ path: png, type: 'png', timeout: 180000 });
        return { ...data, ...census, png };
      };

      const lod1 = await capture(1);
      const impostor = await capture(2);
      const row = {
        ...spec,
        url,
        setup,
        lod1,
        impostor,
        errors: [...new Set([...pageErrors, ...lod1.simErrors, ...impostor.simErrors])],
        warnings: [...new Set(warnings)],
      };
      fs.writeFileSync(path.join(root, `${spec.id}.json`), JSON.stringify(row, null, 2));
      result.cases.push(row);
    } catch (error) {
      const row = { ...spec, url, errors: [...new Set([...pageErrors, String(error?.stack || error)])], warnings: [...new Set(warnings)] };
      result.cases.push(row);
      result.errors.push(...row.errors);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}

result.errors = [...new Set(result.errors)];
result.pass = result.cases.length === cases.length && result.errors.length === 0 && result.cases.every(row => row.errors.length === 0 && row.setup.sourceTrees <= result.cap1 && row.lod1.histogram.lod1 === row.setup.sourceTrees && row.lod1.histogram.impostor === 0 && row.impostor.histogram.impostor === row.setup.sourceTrees && row.impostor.histogram.lod1 === 0);
fs.writeFileSync(path.join(root, 'summary.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({
  root,
  pass: result.pass,
  sourceSha256: result.sourceSha256,
  treeSourceSha256: result.treeSourceSha256,
  textureSourceSha256: result.textureSourceSha256,
  routedTextureSha256: result.routedTextureSha256,
  impostorAlpha: result.impostorAlpha,
  bandOnly: result.bandOnly,
  sideLobes: result.sideLobes,
  errors: result.errors,
  cases: result.cases.map(row => ({ id: row.id, sourceTrees: row.setup?.sourceTrees, lod1: row.lod1?.histogram, impostor: row.impostor?.histogram, bins: row.lod1?.bins, angles: row.lod1?.angles, classes: row.lod1?.classes, errors: row.errors?.length })),
}, null, 2));
