#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'node:fs';
import { RNG } from '../src/core/rng.js';
import { Economy, TICKS_PER_DAY } from '../src/modules/simulation/economy.js';

const outDir = 'shots/playtest-fixes-r17';
const base = process.env.SIM_URL || 'http://127.0.0.1:5180';
fs.mkdirSync(outDir, { recursive: true });
const result = { core: {}, browser: {}, errors: [], pass: false };

const make = () => {
  const econ = { money: 150000, population: 0, jobs: 0, happiness: 0.5, demand: {}, taxRate: 0.1, history: [] };
  return { econ, model: new Economy(new RNG(1337, 'financial-recovery'), econ) };
};

try {
  const a = make();
  a.econ.money = -100;
  const states = [];
  for (let day = 0; day < 3; day++) {
    for (let i = 0; i < TICKS_PER_DAY; i++) a.model.step();
    states.push(a.econ.financial.state);
  }
  const before = { money: a.econ.money, debt: a.econ.loans.reduce((sum, loan) => sum + loan.remaining, 0) };
  const plan = a.model.restructureFinances();
  const after = { money: a.econ.money, debt: a.econ.loans.reduce((sum, loan) => sum + loan.remaining, 0), taxRate: a.econ.taxRate, happiness: a.econ.happiness, state: a.econ.financial.state };
  const saved = JSON.parse(JSON.stringify(a.model.serialize()));
  const b = make();
  const restored = b.model.deserialize(saved);
  const exactAtRestore = JSON.stringify(a.model.serialize()) === JSON.stringify(b.model.serialize());
  for (let i = 0; i < TICKS_PER_DAY; i++) { a.model.step(); b.model.step(); }
  const exactAfterDay = JSON.stringify(a.model.serialize()) === JSON.stringify(b.model.serialize());
  const legacySave = JSON.parse(JSON.stringify(saved)); delete legacySave.econ.financial;
  const legacy = make(); const legacyRestored = legacy.model.deserialize(legacySave);
  result.core = { states, before, plan, after, restored, exactAtRestore, exactAfterDay,
    legacyRestored, legacyFinancial: { ...legacy.econ.financial },
    debtCoversPriorPosition: after.debt >= before.debt + Math.max(0, -before.money) + after.money };
} catch (error) { result.errors.push(`core: ${error?.stack || error}`); }

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu', '--ignore-gpu-blocklist', '--no-sandbox'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', (error) => result.errors.push(`page: ${error}`));
  page.on('console', (message) => { if (message.type() === 'error') result.errors.push(`console: ${message.text()}`); });
  await page.goto(`${base}/?mode=play&headless=1&speed=0`, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });
  await page.evaluate(() => {
    const sim = window.__sim;
    const economy = sim.world.economy;
    economy.money = -20000; economy.net = -750; economy.income = 100; economy.expenses = 850;
    economy.loans.length = 0;
    Object.assign(economy.financial, { state: 'crisis', deficitDays: 3, recoveryDays: 0, restructures: 0, lastChangeDay: economy.day });
    sim.registry.apis.ui.closeMenu();
    sim.registry.apis.ui.hud.showSide('stats');
  });
  const button = page.getByRole('button', { name: /Start emergency recovery plan/i });
  await button.waitFor({ state: 'visible' });
  result.browser.before = await page.evaluate(() => ({
    status: [...document.querySelectorAll('.sb-rows .sb-v')].map((node) => node.textContent).find((text) => text === 'Budget crisis') || null,
    guide: document.querySelector('.sb-service-guide')?.textContent?.trim() || '',
    button: [...document.querySelectorAll('button')].find((node) => /Start emergency recovery plan/.test(node.textContent || ''))?.textContent?.trim() || null,
  }));
  await button.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${outDir}/budget-crisis.png`, timeout: 180000 });
  await button.click();
  result.browser.after = await page.evaluate(() => {
    const e = window.__sim.world.economy;
    return { money: e.money, taxRate: e.taxRate, state: e.financial.state, restructures: e.financial.restructures,
      loans: e.loans.map((loan) => ({ kind: loan.kind, principal: loan.principal, remaining: loan.remaining, daysLeft: loan.daysLeft })), errors: window.__sim.errors.slice() };
  });
  await page.screenshot({ path: `${outDir}/budget-recovery.png`, timeout: 180000 });
} catch (error) { result.errors.push(`browser: ${error?.stack || error}`); }
finally { await browser.close(); }

const c = result.core, b = result.browser;
result.pass = result.errors.length === 0
  && JSON.stringify(c.states) === JSON.stringify(['warning', 'warning', 'crisis'])
  && c.plan?.kind === 'restructuring' && c.after?.state === 'recovery' && c.after?.money >= 15000
  && c.after?.taxRate >= 0.12 && c.debtCoversPriorPosition && c.restored && c.exactAtRestore && c.exactAfterDay
  && c.legacyRestored && c.legacyFinancial?.state === 'stable'
  && b.before?.status === 'Budget crisis' && /Budget crisis/.test(b.before?.guide || '') && /Start emergency recovery plan/.test(b.before?.button || '')
  && b.after?.state === 'recovery' && b.after?.money >= 15000 && b.after?.taxRate >= 0.12
  && b.after?.loans?.length === 1 && b.after.loans[0].kind === 'restructuring' && !(b.after?.errors?.length);
fs.writeFileSync(`${outDir}/financial-recovery.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
