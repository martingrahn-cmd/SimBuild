#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'node:fs';
const base = process.env.SIM_URL || 'http://127.0.0.1:5173', outDir = 'shots/playtest-fixes-r10';
fs.mkdirSync(outDir, { recursive: true });
const result = { errors: [], initial: null, stages: [], readyMs: null, menuVisible: false, pass: false };
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal','--use-gl=angle','--enable-webgl','--enable-gpu','--ignore-gpu-blocklist','--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => result.errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') result.errors.push(m.text()); });
  await page.goto(`${base}/?mode=play`, { waitUntil: 'commit', timeout: 240000 });
  await page.waitForSelector('#boot .card', { timeout: 30000 });
  result.initial = await page.evaluate(() => ({ ms: performance.now(), message: document.querySelector('#bootmsg')?.textContent, percent: document.querySelector('#bootpct')?.textContent, aria: document.querySelector('#boot .progress')?.getAttribute('aria-valuenow') }));
  await page.screenshot({ path: `${outDir}/loading-shell.png`, timeout: 180000 });
  for (let i = 0; i < 120; i++) {
    const row = await page.evaluate(() => ({ ms: performance.now(), message: document.querySelector('#bootmsg')?.textContent, percent: document.querySelector('#bootpct')?.textContent, hidden: document.querySelector('#boot')?.classList.contains('hidden') }));
    const last = result.stages[result.stages.length - 1]; if (!last || last.message !== row.message || last.percent !== row.percent) result.stages.push(row);
    if (row.hidden) { result.readyMs = row.ms; break; }
    await page.waitForTimeout(100);
  }
  await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });
  result.menuVisible = await page.evaluate(() => !!document.querySelector('.sb-modal.is-main') && document.querySelector('.sb-root')?.classList.contains('is-menu'));
} catch (error) { result.errors.push(String(error?.stack || error)); }
finally { await browser.close(); }
result.pass = result.errors.length === 0 && result.initial && /%/.test(result.initial.percent || '') && result.stages.some(s => s.percent === '100%') && Number.isFinite(result.readyMs) && result.menuVisible;
fs.writeFileSync(`${outDir}/loading.json`, JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2)); if (!result.pass) process.exitCode = 1;
