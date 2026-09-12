#!/usr/bin/env node
// R9f: exercise the R9e top-narrow atlas spill in a single speed-zero page.
// Product -> product with only cell7 restored -> product replay uses one scene/camera/field.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const root = process.env.OUT_DIR || 'shots/democity/r9f-top-containment';
const acceptedAtlasPath = process.env.ACCEPTED_ATLAS || 'shots/democity/r9e-side-atlas/atlas-contract/accepted-atlas.png';
const productAtlasPath = 'shots/democity/r9e-side-atlas/atlas-contract/product-atlas.png';
const texturePath = 'src/modules/props/textures.js';
const chunksPath = 'src/modules/props/chunks.js';
const textures = fs.readFileSync(texturePath);
const chunks = fs.readFileSync(chunksPath);
const acceptedAtlas = fs.readFileSync(acceptedAtlasPath);
const productAtlas = fs.readFileSync(productAtlasPath);
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const expectedTexture = '6090fe11d3104bcda0d9729f250e856153ebad69c1c55f083e122ed89dedf039';
const python = process.env.SIM_PYTHON || '/Users/martingrahn/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3';
if (sha(textures) !== expectedTexture) throw Error(`R9e texture source drift: ${sha(textures)}`);
const hookMarker = 'constructor(ctx, geo, mats) {';
if (chunks.toString().split(hookMarker).length !== 2) throw Error('PropField hook marker must occur once');
fs.mkdirSync(root, { recursive: true });

const chrome = process.env.SIM_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ executablePath: chrome, headless: true, args: [
  '--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu',
  '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--no-sandbox',
] });
const result = {
  method: 'one speed-zero actual-Chrome Metal page; same field/camera; retained product atlas -> product with only accepted cell7 -> retained product replay',
  source: {
    texturePath, textureSha256: sha(textures), chunksPath, chunksSha256: sha(chunks),
    acceptedAtlasPath, acceptedAtlasSha256: sha(acceptedAtlas), productAtlasPath, productAtlasSha256: sha(productAtlas),
  },
  cases: [], errors: [], pass: false,
};

const settle = async (page, frames = 3) => page.evaluate(async n => {
  const s = window.__sim, start = s.engine.stats.frames;
  let last = start, changedAt = performance.now();
  while (s.engine.stats.frames < start + n) {
    await Promise.race([new Promise(requestAnimationFrame), new Promise(resolve => setTimeout(resolve, 1000))]);
    if (s.engine.stats.frames !== last) { last = s.engine.stats.frames; changedAt = performance.now(); }
    else if (performance.now() - changedAt > 15000) throw Error(`render stalled at ${last}`);
  }
}, frames);

const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const pageErrors = [], warnings = [];
page.on('pageerror', e => pageErrors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') pageErrors.push(m.text()); else if (m.type() === 'warning') warnings.push(m.text()); });
page.on('response', r => { if (r.status() >= 400) pageErrors.push(`HTTP ${r.status()} ${r.url()}`); });
await page.route('**/@vite/client', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
await page.route('**/src/modules/props/chunks.js*', async route => {
  const response = await route.fetch();
  let body = await response.text();
  if (body.split(hookMarker).length !== 2) throw Error('transformed PropField hook marker must occur once');
  body = body.replace(hookMarker, `${hookMarker}\n    globalThis.__R9F_FIELD = this;`);
  await route.fulfill({ response, body, contentType: 'application/javascript' });
});

const acceptedDataUrl = `data:image/png;base64,${acceptedAtlas.toString('base64')}`;
const productDataUrl = `data:image/png;base64,${productAtlas.toString('base64')}`;
try {
  await page.goto(`${base}/?showcase=democity&time=12&camera=park&seed=1337&quality=high&speed=0&headless=1`, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForFunction(() => window.__sim?.ready === true && globalThis.__R9F_FIELD, null, { timeout: 240000 });
  await settle(page, 24);
  const setup = await page.evaluate(async ({ acceptedUrl, productUrl }) => {
    const s = window.__sim, f = globalThis.__R9F_FIELD;
    for (const owner of ['traffic', 'transit']) {
      const group = s.registry.get(owner)?.group;
      if (group) Object.defineProperty(group, 'visible', { configurable: true, get: () => false, set: () => {} });
    }
    const map = f.mats.impMat.map, c = map.image, g = c.getContext('2d', { willReadFrequently: true });
    const liveDataUrl = c.toDataURL('image/png');
    globalThis.__R9F_LIVE_PRODUCT_PIXELS = g.getImageData(0, 0, c.width, c.height);
    const accepted = new Image(), product = new Image();
    accepted.src = acceptedUrl; product.src = productUrl; await Promise.all([accepted.decode(), product.decode()]);
    globalThis.__R9F_ACCEPTED_IMAGE = accepted;
    globalThis.__R9F_PRODUCT_IMAGE = product;
    const classes = { conifer: 0, broad: 0, narrow: 0, wide: 0, ornamental: 0 };
    const names = Object.keys(classes);
    for (const chunk of f.chunks.values()) for (let i = 0; i < (chunk.impA?.length || 0) / 4; i++) classes[names[Math.round(chunk.impA[i * 4 + 3])]]++;
    return { atlas: [c.width, c.height], liveDataUrl, classInstances: classes, stats: s.stats(), errors: [...s.errors] };
  }, { acceptedUrl: acceptedDataUrl, productUrl: productDataUrl });
  const liveAtlas = Buffer.from(setup.liveDataUrl.split(',')[1], 'base64');
  delete setup.liveDataUrl;
  setup.liveProductAtlasSha256 = sha(liveAtlas);
  setup.liveProductPngMatchesRetained = liveAtlas.equals(productAtlas);
  fs.writeFileSync(path.join(root, 'live-product-atlas.png'), liveAtlas);
  if (!setup.liveProductPngMatchesRetained) throw Error(`live product atlas does not match retained product PNG: ${setup.liveProductAtlasSha256}`);

  const swap = async mode => {
    return page.evaluate(mode => {
      const f = globalThis.__R9F_FIELD, map = f.mats.impMat.map, c = map.image, g = c.getContext('2d', { willReadFrequently: true });
      g.clearRect(0, 0, c.width, c.height);
      g.drawImage(globalThis.__R9F_PRODUCT_IMAGE, 0, 0, c.width, c.height);
      if (mode === 'contained') {
        const S = c.width / 4, x = 3 * S, y = S;
        g.clearRect(x, y, S, S);
        g.drawImage(globalThis.__R9F_ACCEPTED_IMAGE, x, y, S, S, x, y, S, S);
      }
      const reference = globalThis.__R9F_LIVE_PRODUCT_PIXELS.data;
      const current = g.getImageData(0, 0, c.width, c.height).data;
      let changedPixels = 0, alphaChangedPixels = 0, alpha042Crossings = 0;
      let minX = c.width, minY = c.height, maxX = -1, maxY = -1;
      const threshold = 0.42 * 255;
      for (let p = 0; p < reference.length; p += 4) {
        if (reference[p] === current[p] && reference[p + 1] === current[p + 1] && reference[p + 2] === current[p + 2] && reference[p + 3] === current[p + 3]) continue;
        const pixel = p / 4, x = pixel % c.width, y = Math.floor(pixel / c.width);
        changedPixels++;
        minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        if (reference[p + 3] !== current[p + 3]) alphaChangedPixels++;
        if ((reference[p + 3] >= threshold) !== (current[p + 3] >= threshold)) alpha042Crossings++;
      }
      globalThis.__R9F_ATLAS_DELTA = {
        relativeToLiveProduct: true,
        changedPixels, alphaChangedPixels, alpha042Crossings,
        bboxGlobalInclusive: changedPixels ? [minX, minY, maxX, maxY] : null,
        bboxCell7LocalInclusive: changedPixels ? [minX - c.width * 3 / 4, minY - c.height / 4, maxX - c.width * 3 / 4, maxY - c.height / 4] : null,
      };
      map.needsUpdate = true;
      f.mats.impDepth.map.needsUpdate = true;
      return globalThis.__R9F_ATLAS_DELTA;
    }, mode).then(async delta => { await settle(page, 3); return delta; });
  };

  const configure = async spec => {
    await page.evaluate(spec => {
      const s = window.__sim, f = globalThis.__R9F_FIELD;
      s.setCamera({ target: [400, 12, 300], yaw: spec.yaw, pitch: spec.pitch, distance: spec.distance });
      const camera = s.camera.camera;
      camera.updateProjectionMatrix(); camera.updateMatrixWorld(true); camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
      if (spec.allNarrow) for (const chunk of f.chunks.values()) for (let i = 0; i < (chunk.impA?.length || 0) / 4; i++) chunk.impA[i * 4 + 3] = 2;
      s.registry.apis.props.debug.setLod(2);
    }, spec);
    await settle(page, 4);
  };

  const capture = async (caseId, state) => {
    const png = path.join(root, `${caseId}_${state}.png`);
    const data = await page.evaluate(() => ({
      histogram: { ...window.__sim.registry.apis.props.debug.lodHistogram() },
      camera: { target: window.__sim.camera.target.toArray(), yaw: window.__sim.camera.yaw, pitch: window.__sim.camera.pitch, distance: window.__sim.camera.distance, position: window.__sim.camera.camera.position.toArray() },
      stats: window.__sim.stats(), errors: [...window.__sim.errors],
      atlasDelta: { ...globalThis.__R9F_ATLAS_DELTA },
    }));
    await page.screenshot({ path: png, type: 'png', timeout: 180000 });
    return { state, png, ...data };
  };

  const cases = [
    { id: 'actual_near', yaw: 0.7, pitch: 0.86, distance: 150, allNarrow: false },
    { id: 'actual_mid', yaw: 0.7, pitch: 0.86, distance: 300, allNarrow: false },
    { id: 'actual_far', yaw: 0.7, pitch: 0.86, distance: 600, allNarrow: false },
    { id: 'amplified_all_narrow', yaw: 0.7, pitch: 0.86, distance: 300, allNarrow: true },
  ];
  for (const spec of cases) {
    await swap('product');
    await configure(spec);
    const product = await capture(spec.id, 'product');
    await swap('contained');
    const contained = await capture(spec.id, 'contained');
    await swap('product');
    const replay = await capture(spec.id, 'product_replay');
    result.cases.push({ ...spec, product, contained, replay });
  }
  result.setup = setup;
  result.errors.push(...setup.errors, ...pageErrors);
  result.warnings = [...new Set(warnings)];
} catch (error) {
  result.errors.push(String(error?.stack || error), ...pageErrors);
} finally {
  await page.close();
  await browser.close();
}

if (result.cases.length) {
  const compareScript = String.raw`
import json, sys
from pathlib import Path
from PIL import Image, ImageChops
root=Path(sys.argv[1]); rows=[]
def metric(a,b):
 A=Image.open(a).convert('RGB'); B=Image.open(b).convert('RGB'); D=ImageChops.difference(A,B)
 h=D.histogram(); pixels=A.width*A.height
 maxd=ImageChops.lighter(ImageChops.lighter(*D.split()[:2]),D.split()[2]); mh=maxd.histogram()
 return {'normalizedRgbMae':sum((i%256)*n for i,n in enumerate(h))/(pixels*3*255),'changedPixels':pixels-mh[0],'strongPixelsGE8':sum(mh[8:]),'maxChannelDelta':max(i for i,n in enumerate(mh) if n)}
for cid in sys.argv[2:]:
 p=root/f'{cid}_product.png'; a=root/f'{cid}_contained.png'; r=root/f'{cid}_product_replay.png'
 D=ImageChops.difference(Image.open(p).convert('RGB'),Image.open(a).convert('RGB')).point(lambda v:min(255,v*8)); D.save(root/f'{cid}_difference_x8.png')
 rows.append({'id':cid,'productVsContained':metric(p,a),'productVsReplay':metric(p,r),'containedVsReplay':metric(a,r),'differenceX8':str(root/f'{cid}_difference_x8.png')})
print(json.dumps(rows))
`;
  try {
    const raw = execFileSync(python, ['-c', compareScript, root, ...result.cases.map(x => x.id)], { encoding: 'utf8' });
    const rows = JSON.parse(raw);
    for (const row of rows) Object.assign(result.cases.find(x => x.id === row.id), row);
  } catch (error) { result.errors.push(`pixel comparison failed: ${error.stderr || error}`); }
}
result.errors = [...new Set(result.errors)];
result.pass = result.cases.length === 4 && result.errors.length === 0 && result.cases.every(row =>
  row.product.histogram.impostor > 0 &&
  row.contained.histogram.impostor === row.product.histogram.impostor &&
  row.replay.histogram.impostor === row.product.histogram.impostor &&
  row.product.atlasDelta.changedPixels === 0 &&
  row.replay.atlasDelta.changedPixels === 0 &&
  row.contained.atlasDelta.changedPixels === 142 &&
  row.contained.atlasDelta.alphaChangedPixels === 135 &&
  row.contained.atlasDelta.alpha042Crossings === 63 &&
  JSON.stringify(row.contained.atlasDelta.bboxCell7LocalInclusive) === JSON.stringify([93, 244, 149, 255])
);
fs.writeFileSync(path.join(root, 'summary.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ root, pass: result.pass, setup: result.setup, errors: result.errors, cases: result.cases.map(x => ({ id: x.id, histogram: x.product.histogram, productVsContained: x.productVsContained, productVsReplay: x.productVsReplay })) }, null, 2));
if (!result.pass) process.exitCode = 1;
