#!/usr/bin/env node
// Record the authored landmark plan and merged owner cost for a reproducible Democity revision.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const out = process.env.OUT_FILE || 'shots/democity/landmark-profile.json';
const executablePath = process.env.SIM_CHROME || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', chromium.executablePath(),
].find((p) => fs.existsSync(p));
const browser = await chromium.launch({ executablePath, headless: true, args: [
  '--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu',
  '--ignore-gpu-blocklist', '--no-sandbox',
] });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const browserErrors = [];
  page.on('pageerror', (e) => browserErrors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') browserErrors.push(m.text()); });
  await page.route('**/@vite/client', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto(`${base}/?showcase=democity&headless=1&time=12&camera=suburb&speed=0&quality=high`, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });
  const result = await page.evaluate(() => {
    const s = window.__sim, api = s.registry.apis.democity;
    return { plan: api.plan().landmarks, own: api.stats().own, errors: s.errors.slice() };
  });
  result.browserErrors = browserErrors;
  result.pass = result.plan.length === 13 && result.own.drawCalls === 8 && !result.errors.length && !browserErrors.length;
  fs.mkdirSync(out.slice(0, out.lastIndexOf('/')), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ pass: result.pass, landmarks: result.plan.length, own: result.own, errors: result.errors, browserErrors }, null, 2));
  if (!result.pass) process.exitCode = 1;
} finally {
  await browser.close();
}
