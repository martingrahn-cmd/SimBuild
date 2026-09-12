#!/usr/bin/env node
// R9e: compare the installed structural side-atlas candidate with the accepted R9d atlas.
// The accepted source is routed only to a disposable page; product source is never rewritten.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const root = process.env.OUT_DIR || 'shots/democity/r9e-side-atlas/atlas-contract';
const texturePath = 'src/modules/props/textures.js';
const product = fs.readFileSync(texturePath, 'utf8');
const narrowAccepted = 'blob(cx, baseY - treeH * 0.66, treeH * 0.20, 70, 0.46, 0.40, 420, false, 0.075, 1.7);';
const broadAccepted = 'blob(cx, baseY - treeH * 0.66, treeH * 0.46, 88, 0.44, 0.40, 520, true, 0.078, 0.94);';
const narrowProduct = `blob(cx - treeH * 0.045, baseY - treeH * 0.57, treeH * 0.125, 70, 0.46, 0.34, 150, false, 0.075, 1.45);
    blob(cx + treeH * 0.045, baseY - treeH * 0.68, treeH * 0.13, 73, 0.44, 0.43, 150, false, 0.075, 1.45);
    blob(cx, baseY - treeH * 0.79, treeH * 0.12, 68, 0.42, 0.47, 120, false, 0.075, 1.40);`;
const broadProduct = `blob(cx - treeH * 0.16, baseY - treeH * 0.60, treeH * 0.29, 88, 0.44, 0.34, 180, true, 0.075, 0.82);
    blob(cx + treeH * 0.16, baseY - treeH * 0.61, treeH * 0.29, 91, 0.43, 0.44, 180, true, 0.075, 0.82);
    blob(cx, baseY - treeH * 0.78, treeH * 0.30, 86, 0.42, 0.43, 160, true, 0.075, 0.80);`;
if (product.split(narrowProduct).length !== 2 || product.split(broadProduct).length !== 2) throw Error('installed R9e product markers must each occur once');
const accepted = product.replace(narrowProduct, narrowAccepted).replace(broadProduct, broadAccepted);
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const chrome = process.env.SIM_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
fs.mkdirSync(root, { recursive: true });
const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--no-sandbox'] });
const result = { method: 'fresh actual-Chrome Metal pages; accepted atlas routed in memory; installed candidate source untouched', texturePath, acceptedSourceSha256: sha(accepted), productSourceSha256: sha(product), cases: [], errors: [], pass: false };

try {
  for (const mode of ['accepted', 'product']) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.route('**/@vite/client', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await page.route('**/src/modules/props/chunks.js*', async route => {
      const response = await route.fetch();
      const marker = 'constructor(ctx, geo, mats) {';
      let body = await response.text();
      if (body.split(marker).length !== 2) throw Error('Props field hook marker missing');
      body = body.replace(marker, `${marker}\n    globalThis.__R9E_FIELD = this;`);
      await route.fulfill({ response, body, contentType: 'application/javascript' });
    });
    if (mode === 'accepted') await page.route('**/src/modules/props/textures.js*', async route => {
      const response = await route.fetch();
      let body = await response.text();
      if (!body.includes(narrowProduct) || !body.includes(broadProduct)) throw Error('R9e transformed product markers missing');
      body = body.replace(narrowProduct, narrowAccepted).replace(broadProduct, broadAccepted);
      await route.fulfill({ response, body, contentType: 'application/javascript' });
    });
    await page.goto(`${base}/?showcase=democity&time=12&camera=aerial&seed=1337&quality=high&speed=0&headless=1`, { waitUntil: 'domcontentloaded', timeout: 240000 });
    await page.waitForFunction(() => window.__sim?.ready === true && globalThis.__R9E_FIELD, null, { timeout: 240000 });
    await page.evaluate(async () => { const s=window.__sim,start=s.engine.stats.frames; while(s.engine.stats.frames<start+24) await new Promise(requestAnimationFrame); s.freeze(); });
    const payload = await page.evaluate(() => {
      const s = window.__sim, canvas = globalThis.__R9E_FIELD.mats.impMat.map.image;
      return { dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height, histogram: s.registry.apis.props.debug.lodHistogram(), stats: s.stats(), simErrors: [...s.errors] };
    });
    const png = path.join(root, `${mode}-atlas.png`);
    fs.writeFileSync(png, Buffer.from(payload.dataUrl.split(',')[1], 'base64'));
    delete payload.dataUrl;
    result.cases.push({ mode, png, ...payload, errors });
    result.errors.push(...payload.simErrors, ...errors);
    await page.close();
  }
} finally { await browser.close(); }
result.pass = result.cases.length === 2 && !result.errors.length && result.cases.every(x => x.width === 1024 && x.height === 1024);
fs.writeFileSync(path.join(root, 'capture.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
