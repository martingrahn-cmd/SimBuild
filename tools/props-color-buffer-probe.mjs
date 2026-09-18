#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const out = process.env.OUT_FILE || 'shots/props-color-buffer.json';
const executablePath = process.env.SIM_CHROME || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', chromium.executablePath(),
].find((p) => fs.existsSync(p));
const browser = await chromium.launch({ executablePath, headless: true, args: [
  '--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu',
  '--ignore-gpu-blocklist', '--no-sandbox', '--window-size=1920,1080',
] });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const browserErrors = [];
  page.on('pageerror', (e) => browserErrors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') browserErrors.push(m.text()); });
  await page.goto(`${base}/?showcase=democity&time=12&camera=park&seed=1337&quality=high&headless=1&speed=0`, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });
  const result = await page.evaluate(async () => {
    const s = window.__sim, api = s.registry.apis.props;
    const digest = async (value) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value))))).map((v) => v.toString(16).padStart(2, '0')).join('');
    const inventory = () => {
      const geometries = new Set(), rows = [];
      s.registry.modules.get('props').group.traverse((o) => { if (o.geometry?.isBufferGeometry) geometries.add(o.geometry); });
      for (const g of geometries) {
        const color = g.getAttribute('color');
        if (!color) continue;
        rows.push({ vertices: color.count, type: color.array?.constructor?.name || null, normalized: color.normalized === true, bytes: color.array?.byteLength || 0 });
      }
      const packed = rows.filter((r) => r.type === 'Uint16Array' && r.normalized);
      const retained = rows.filter((r) => r.type === 'Float32Array' && !r.normalized);
      return {
        geometries: geometries.size,
        colorGeometries: rows.length,
        packedGeometries: packed.length,
        packedVertices: packed.reduce((n, r) => n + r.vertices, 0),
        packedBytes: packed.reduce((n, r) => n + r.bytes, 0),
        retainedFloatGeometries: retained.length,
        types: [...new Set(rows.map((r) => `${r.type}:${r.normalized}`))].sort(),
      };
    };
    const before = structuredClone(api.serialize()), beforeHash = await digest(before), first = inventory();
    api.deserialize(structuredClone(before));
    const after = structuredClone(api.serialize()), afterHash = await digest(after), second = inventory();
    return { beforeHash, afterHash, exactRestore: beforeHash === afterHash, first, second, stats: s.stats(), errors: [...s.errors] };
  });
  result.browserErrors = browserErrors;
  const same = JSON.stringify(result.first) === JSON.stringify(result.second);
  result.pass = result.exactRestore && same && result.first.packedGeometries === 103 && result.first.packedVertices === 933646 && result.first.packedBytes === result.first.packedVertices * 6 && result.first.types.length === 2 && result.first.types.includes('Float32Array:false') && result.first.types.includes('Uint16Array:true') && result.errors.length === 0 && browserErrors.length === 0;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
  if (!result.pass) process.exitCode = 1;
} finally {
  await browser.close();
}
