#!/usr/bin/env node
// Verify that explicit weather survives Democity staging while the default composition remains unchanged.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const out = process.env.OUT_FILE || 'shots/integration/r7y-democity-weather-contract.json';
const executablePath = process.env.SIM_CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', chromium.executablePath()].find(p => fs.existsSync(p));
const browser = await chromium.launch({ executablePath, headless: true, args: ['--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu', '--ignore-gpu-blocklist', '--no-sandbox'] });

try {
  const rows = [], browserErrors = [];
  for (const requested of [null, 'cloudy', 'rain']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const localErrors = [];
    page.on('pageerror', e => localErrors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') localErrors.push(m.text()); });
    await page.route('**/@vite/client', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    const weather = requested ? `&weather=${requested}` : '';
    await page.goto(`${base}/?showcase=democity&time=12&camera=aerial&quality=high&headless=1&speed=0&seed=1337${weather}`, { waitUntil: 'domcontentloaded', timeout: 240000 });
    await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });
    await page.waitForTimeout(600);
    const row = await page.evaluate(() => {
      const s = window.__sim, w = s.world.weather, environment = s.registry.apis.environment;
      return { requested: s.world.flags.weather, preset: environment.getWeather(), cloudiness: w.cloudiness, rain: w.rain,
        fogDensity: w.fogDensity, wetness: w.wetness, allReady: Object.values(s.registry.status()).every(v => v.status === 'ready'), errors: s.errors.slice() };
    });
    row.browserErrors = localErrors; rows.push(row); browserErrors.push(...localErrors); await page.close();
  }
  const [normal, cloudy, rain] = rows;
  const pass = normal.requested === null && normal.preset === 'custom' && normal.cloudiness === 0.38 && normal.rain === 0 && normal.fogDensity === 0.00004 &&
    cloudy.requested === 'cloudy' && cloudy.preset === 'cloudy' && cloudy.cloudiness === 0.74 && cloudy.rain === 0 && cloudy.fogDensity === 0.0003 &&
    rain.requested === 'rain' && rain.preset === 'rain' && rain.cloudiness === 0.96 && rain.rain === 0.85 && rain.fogDensity === 0.00065 &&
    rows.every(r => r.allReady && !r.errors.length && !r.browserErrors.length);
  const result = { pass, rows, browserErrors };
  fs.mkdirSync(out.slice(0, out.lastIndexOf('/')), { recursive: true }); fs.writeFileSync(out, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally { await browser.close(); }
