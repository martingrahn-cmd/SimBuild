#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'node:fs';
import { Economy } from '../src/modules/simulation/economy.js';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const outDir = 'shots/playtest-fixes-r10';
fs.mkdirSync(outDir, { recursive: true });
const result = { url: `${base}/?mode=play`, errors: [], checks: {}, economyContract: {}, pass: false };

let local = { power: false, water: false, garbage: false };
let covered = { power: false, water: false, garbage: false };
const rng = { a: 1, b: 2, c: 3, d: 4, float: () => 0.5 };
const econ = {};
const model = new Economy(rng, econ, {
  localUtilities: () => local,
  servicesActive: () => Object.values(local).some(Boolean),
  serviceUpkeep: () => 0,
  coverage: (key) => (key === 'sewage' ? covered.water : covered[key]) ? 1 : 0,
});
model.setBuilding({ id: 1, type: 'residential', density: 'low', level: 1, footprint: { w: 16, d: 16 }, floors: 1, height: 6, x: 0, z: 0 });
const advanceUtilityHour = () => { for (let i = 0; i < 100; i++) model.step(); };
advanceUtilityHour();
result.economyContract.start = { unlocked: [...econ.milestone.unlocked], imports: { ...econ.utilityImports }, expenses: econ.expenses };
local = { power: true, water: false, garbage: false };
advanceUtilityHour();
result.economyContract.afterUnservedPower = { imports: { ...econ.utilityImports }, expenses: econ.expenses };
covered.power = true;
advanceUtilityHour();
result.economyContract.afterLocalPower = { imports: { ...econ.utilityImports }, expenses: econ.expenses };
local = { power: true, water: true, garbage: true };
covered = { power: true, water: true, garbage: true };
advanceUtilityHour();
result.economyContract.afterAllLocal = { imports: { ...econ.utilityImports }, expenses: econ.expenses };

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu', '--ignore-gpu-blocklist', '--no-sandbox'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', error => result.errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') result.errors.push(message.text()); });
  await page.route('**/@vite/client', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto(result.url, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });
  await page.getByText('Continue', { exact: true }).click();
  await page.waitForTimeout(500);
  result.checks.initial = await page.evaluate(() => ({
    active: document.querySelector('.sb-tool.is-active')?.getAttribute('data-tip'),
    subpanelHidden: document.querySelector('.sb-subpanel')?.classList.contains('sb-hidden'),
    unlockedUtilities: ['Electricity', 'Water & Sewage', 'Garbage'].every(label => ![...document.querySelectorAll('.sb-tool')].find(b => b.getAttribute('data-tip')?.startsWith(label))?.classList.contains('is-locked')),
    imports: { ...window.__sim.world.economy.utilityImports },
  }));
  await page.getByRole('button', { name: 'Roads', exact: true }).click();
  result.checks.roads = await page.evaluate(() => ({ hint: document.querySelector('.sb-hints')?.innerText || document.querySelector('.sb-hint')?.innerText || '', notification: document.querySelector('.sb-note:last-child')?.innerText || '' }));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  result.checks.escape = await page.evaluate(() => ({ active: document.querySelector('.sb-tool.is-active')?.getAttribute('data-tip'), subpanelHidden: document.querySelector('.sb-subpanel')?.classList.contains('sb-hidden') }));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  result.checks.escapeMenu = await page.evaluate(() => ({ open: !!document.querySelector('.sb-modal:not(.sb-hidden), .sb-menu:not(.sb-hidden)'), text: document.body.innerText }));
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Game menu', exact: true }).click();
  await page.waitForTimeout(100);
  result.checks.gearMenu = await page.evaluate(() => ({ open: !!document.querySelector('.sb-modal:not(.sb-hidden), .sb-menu:not(.sb-hidden)'), text: document.body.innerText }));
  await page.keyboard.press('Escape');
  const happiness = page.locator('[data-tip="Happiness"]');
  await happiness.click(); await page.waitForTimeout(100);
  result.checks.happinessOn = await page.evaluate(() => window.__sim.world.infoview.active);
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  result.checks.happinessEscapeOff = await page.evaluate(() => window.__sim.world.infoview.active);
  await happiness.click(); await happiness.click(); await page.waitForTimeout(100);
  result.checks.happinessToggleOff = await page.evaluate(() => window.__sim.world.infoview.active);
  await happiness.click();
  await page.getByRole('button', { name: 'Select / Inspect', exact: true }).click(); await page.waitForTimeout(100);
  result.checks.happinessInspectOff = await page.evaluate(() => window.__sim.world.infoview.active);
  await page.getByRole('button', { name: 'Zoning', exact: true }).click();
  result.checks.zoning = await page.evaluate(() => ({ hint: document.querySelector('.sb-hints')?.innerText || document.querySelector('.sb-hint')?.innerText || '', notifications: [...document.querySelectorAll('.sb-note')].map(n => n.innerText) }));
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Statistics', exact: true }).click();
  result.checks.stats = await page.evaluate(() => document.querySelector('.sb-side')?.innerText || '');
  await page.screenshot({ path: `${outDir}/ux-utilities.png`, timeout: 180000 });
} catch (error) {
  result.errors.push(String(error?.stack || error));
} finally {
  await browser.close();
}

const s = result.economyContract.start, u = result.economyContract.afterUnservedPower, p = result.economyContract.afterLocalPower, a = result.economyContract.afterAllLocal;
result.pass = result.errors.length === 0 && ['power', 'water', 'garbage'].every(k => s.unlocked.includes(k)) &&
  s.imports.power && s.imports.water && s.imports.garbage && s.imports.cost > 0 &&
  u.imports.power && u.imports.water && u.imports.garbage &&
  !p.imports.power && p.imports.water && p.imports.garbage && !a.imports.power && !a.imports.water && !a.imports.garbage && a.imports.cost === 0 &&
  result.checks.initial?.active === 'Select / Inspect' && result.checks.initial?.subpanelHidden && result.checks.initial?.unlockedUtilities &&
  result.checks.escape?.active === 'Select / Inspect' && result.checks.escape?.subpanelHidden &&
  result.checks.escapeMenu?.open && result.checks.escapeMenu?.text.includes('Paused') && result.checks.escapeMenu?.text.includes('Save Game') &&
  result.checks.gearMenu?.open && result.checks.gearMenu?.text.includes('Paused') && result.checks.gearMenu?.text.includes('Save Game') &&
  result.checks.happinessOn === 'happiness' && result.checks.happinessEscapeOff === null && result.checks.happinessToggleOff === null && result.checks.happinessInspectOff === null &&
  result.checks.roads?.hint.includes('Finish & build') && result.checks.roads?.hint.includes('Undo point') &&
  result.checks.zoning?.hint.includes('Paint roadside cells') && result.checks.zoning?.notifications.some(n => n.includes('grow there automatically')) &&
  result.checks.stats?.includes('Utility imports') && result.checks.stats?.includes('Import cost / day');
fs.writeFileSync(`${outDir}/ux-utilities.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
