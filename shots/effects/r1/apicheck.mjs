// Critic API contract check for the effects module (throwaway). Run: node shots/effects/r1/apicheck.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = 'shots/effects/r1';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'],
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 500)); });
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + String(e).slice(0, 500)));

const T = 300000;
async function run() {
consoleErrors.length = 0;
await page.goto('http://127.0.0.1:5174/?showcase=effects&headless=1&time=12&camera=street&speed=0', { waitUntil: 'domcontentloaded', timeout: T });
await page.waitForFunction(() => window.__sim && window.__sim.ready === true, null, { timeout: T, polling: 200 });

const readyAt0 = await page.evaluate(() => window.__sim.readyAt);
const frames = (n) => page.evaluate(async ({ n, readyAt0 }) => {
  if (!window.__sim || window.__sim.readyAt !== readyAt0 || !window.__sim.registry.apis.effects) throw new Error('RELOAD');
  const s = window.__sim.engine.stats; const f0 = s.frames;
  while (s.frames < f0 + n) await new Promise((r) => setTimeout(r, 50));
  if (window.__sim.readyAt !== readyAt0) throw new Error('RELOAD');
}, { n, readyAt0 });
const probe = () => page.evaluate(() => {
  const s = window.__sim; const fx = s.registry.apis.effects;
  return { composer: !!s.engine.composer, drawCalls: s.engine.stats.drawCalls, tris: s.engine.stats.triangles, state: fx.state(), status: s.registry.status().effects, errors: s.errors.length, hour: s.world.time.hour };
});
const shot = async (name) => { const b = await page.screenshot({ type: 'png', timeout: T }); fs.writeFileSync(`${OUT}/apicheck_${name}.png`, b); return b.toString('base64'); };
// In-page image analysis (no png lib in node): decode via <img>+canvas.
const analyze = (a, b, name) => page.evaluate(async ({ a, b, name }) => {
  const load = (b64) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.src = 'data:image/png;base64,' + b64; });
  const ia = await load(a); const w = ia.width, h = ia.height;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d');
  g.drawImage(ia, 0, 0); const A = g.getImageData(0, 0, w, h).data;
  const stats = (D) => {
    const hist = new Uint32Array(256); let mean = 0;
    for (let i = 0; i < D.length; i += 4) { const l = Math.round(0.2126 * D[i] + 0.7152 * D[i + 1] + 0.0722 * D[i + 2]); hist[l]++; mean += l; }
    const n = D.length / 4; mean /= n;
    const pct = (p) => { let acc = 0; for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= p * n) return i; } return 255; };
    return { mean: +mean.toFixed(1), p1: pct(0.01), p5: pct(0.05), p50: pct(0.5), p95: pct(0.95), p99: pct(0.99) };
  };
  const out = { name, w, h, a: stats(A) };
  if (b) {
    const ib = await load(b); g.drawImage(ib, 0, 0); const B = g.getImageData(0, 0, w, h).data;
    out.b = stats(B);
    const diff = g.createImageData(w, h); const D = diff.data;
    let sum = 0, gt8 = 0, gt24 = 0, darker = 0, brighter = 0;
    for (let i = 0; i < A.length; i += 4) {
      const la = 0.2126 * A[i] + 0.7152 * A[i + 1] + 0.0722 * A[i + 2];
      const lb = 0.2126 * B[i] + 0.7152 * B[i + 1] + 0.0722 * B[i + 2];
      const d = la - lb; const ad = Math.abs(d);
      sum += ad; if (ad > 8) gt8++; if (ad > 24) gt24++; if (d < -3) darker++; if (d > 3) brighter++;
      const v = Math.min(255, ad * 6);
      D[i] = d > 0 ? v : 0; D[i + 1] = d < 0 ? v : 0; D[i + 2] = 0; D[i + 3] = 255;
    }
    const n = A.length / 4;
    out.diff = { meanAbs: +(sum / n).toFixed(2), fracGt8: +(gt8 / n).toFixed(4), fracGt24: +(gt24 / n).toFixed(4), fracADarker: +(darker / n).toFixed(4), fracABrighter: +(brighter / n).toFixed(4) };
    g.putImageData(diff, 0, 0);
    out.diffPng = cv.toDataURL('image/png').split(',')[1];
  }
  return out;
}, { a, b, name });
const saveDiff = (r) => { if (r.diffPng) { fs.writeFileSync(`${OUT}/apicheck_diff_${r.name}.png`, Buffer.from(r.diffPng, 'base64')); delete r.diffPng; } return r; };

const R = {};
await frames(2);
R.initial = await probe();
const dayOn = await shot('day_on');

// AO off
await page.evaluate(() => window.__sim.registry.apis.effects._override({ ao: 0 }));
await frames(2);
R.aoOff = await probe();
const dayNoAO = await shot('day_noao');
R.aoDiff = saveDiff(await analyze(dayOn, dayNoAO, 'ao'));

// bloom off (day)
await page.evaluate(() => window.__sim.registry.apis.effects._override({ bloom: 0 }));
await frames(2);
R.bloomOffDay = await probe();
const dayNoBloom = await shot('day_nobloom');
R.bloomDiffDay = saveDiff(await analyze(dayOn, dayNoBloom, 'bloom_day'));

// flat preset (grade+ao+bloom off) for reference of the raw render
await page.evaluate(() => { const fx = window.__sim.registry.apis.effects; fx._override(null); fx.setPreset('flat'); });
await frames(2);
const dayFlat = await shot('day_flat');
R.flatDiffDay = saveDiff(await analyze(dayOn, dayFlat, 'flat_day'));
await page.evaluate(() => window.__sim.registry.apis.effects.setPreset('default'));

// setEnabled(false) -> direct render
R.disableRet = await page.evaluate(() => window.__sim.registry.apis.effects.setEnabled(false));
await frames(3);
R.disabled = await probe();
const dayDirect = await shot('day_direct');
R.directDiff = saveDiff(await analyze(dayOn, dayDirect, 'direct'));
R.enableRet = await page.evaluate(() => window.__sim.registry.apis.effects.setEnabled(true));
await frames(3);
R.reenabled = await probe();

// resize
await page.setViewportSize({ width: 960, height: 540 });
await frames(3);
R.resized = await probe();
await shot('resized_960');
await page.setViewportSize({ width: 1280, height: 720 });
await frames(3);
R.resizedBack = await probe();

// night, lamps camera: bloom on/off
await page.evaluate(() => { window.__sim.setCamera('lamps'); window.__sim.setTime(22); });
await frames(4);
R.night = await probe();
const nightOn = await shot('night_on');
await page.evaluate(() => window.__sim.registry.apis.effects._override({ bloom: 0 }));
await frames(2);
const nightNoBloom = await shot('night_nobloom');
R.bloomDiffNight = saveDiff(await analyze(nightOn, nightNoBloom, 'bloom_night'));
await page.evaluate(() => window.__sim.registry.apis.effects._override({ ao: 0 }));
await frames(2);
const nightNoAO = await shot('night_noao');
R.aoDiffNight = saveDiff(await analyze(nightOn, nightNoAO, 'ao_night'));
await page.evaluate(() => window.__sim.registry.apis.effects._override(null));

// golden hour aerial: does bloom spread over the whole sunlit city (threshold too low at exposure ~3)?
await page.evaluate(() => { window.__sim.setCamera('aerial'); window.__sim.setTime(17.5); });
await frames(4);
R.golden = await probe();
const gOn = await shot('golden_on');
await page.evaluate(() => window.__sim.registry.apis.effects._override({ bloom: 0 }));
await frames(2);
const gNoBloom = await shot('golden_nobloom');
R.bloomDiffGolden = saveDiff(await analyze(gOn, gNoBloom, 'bloom_golden'));
await page.evaluate(() => { const fx = window.__sim.registry.apis.effects; fx._override(null); fx.setPreset('flat'); });
await frames(2);
const gFlat = await shot('golden_flat');
R.flatDiffGolden = saveDiff(await analyze(gOn, gFlat, 'flat_golden'));
await page.evaluate(() => window.__sim.registry.apis.effects.setPreset('default'));
await frames(2);

// determinism: two consecutive frames identical?
await frames(1); const d1 = await shot('det1'); await frames(1); const d2 = await shot('det2');
R.determinism = saveDiff(await analyze(d1, d2, 'det'));

R.final = await probe();
R.simErrors = await page.evaluate(() => window.__sim.errors.slice(0, 10));
R.simWarnings = await page.evaluate(() => window.__sim.warnings.slice(0, 20));
R.consoleErrors = consoleErrors;
fs.writeFileSync(`${OUT}/apicheck.json`, JSON.stringify(R, null, 2));
console.log(JSON.stringify(R, null, 2));
}

let ok = false;
for (let attempt = 1; attempt <= 4 && !ok; attempt++) {
  try { await run(); ok = true; }
  catch (e) { console.error(`attempt ${attempt} failed: ${String(e).slice(0, 300)}`); if (attempt === 4) { await browser.close(); process.exit(1); } }
}
await browser.close();
