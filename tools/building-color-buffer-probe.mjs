#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const out = process.env.OUT_FILE || 'shots/building-color-buffer.json';
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
  await page.goto(`${base}/?showcase=democity&time=22&camera=aerial&seed=1337&quality=high&headless=1&speed=0`, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });
  const result = await page.evaluate(async () => {
    const s = window.__sim, api = s.registry.apis.buildings;
    const digest = async (value) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value))))).map((v) => v.toString(16).padStart(2, '0')).join('');
    const inventory = () => {
      const geometries = new Set(), rows = [];
      s.registry.modules.get('buildings').group.traverse((o) => { if (o.geometry?.isBufferGeometry) geometries.add(o.geometry); });
      for (const g of geometries) {
        const color = g.getAttribute('color'), win = g.getAttribute('win');
        rows.push({
          vertices: g.getAttribute('position')?.count || 0,
          colorType: color?.array?.constructor?.name || null,
          colorNormalized: color?.normalized === true,
          colorBytes: color?.array?.byteLength || 0,
          winType: win?.array?.constructor?.name || null,
          winBytes: win?.array?.byteLength || 0,
        });
      }
      return { geometries: rows.length, vertices: rows.reduce((n, r) => n + r.vertices, 0), colorBytes: rows.reduce((n, r) => n + r.colorBytes, 0), winBytes: rows.reduce((n, r) => n + r.winBytes, 0), colorTypes: [...new Set(rows.map((r) => `${r.colorType}:${r.colorNormalized}`))], winTypes: [...new Set(rows.map((r) => r.winType))] };
    };
    const before = structuredClone(api.serialize()), beforeHash = await digest(before), first = inventory();
    api.deserialize(structuredClone(before)); api.flush();
    const after = structuredClone(api.serialize()), afterHash = await digest(after), second = inventory();
    return { beforeHash, afterHash, exactRestore: beforeHash === afterHash, first, second, stats: s.stats(), errors: [...s.errors] };
  });
  result.browserErrors = browserErrors;
  result.pass = result.exactRestore && result.first.colorTypes.length === 1 && result.first.colorTypes[0] === 'Uint16Array:true' && result.first.winTypes.length === 1 && result.first.winTypes[0] === 'Float32Array' && result.first.colorBytes === result.first.vertices * 6 && result.second.colorBytes === result.first.colorBytes && result.errors.length === 0 && browserErrors.length === 0;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
  if (!result.pass) process.exitCode = 1;
} finally {
  await browser.close();
}
