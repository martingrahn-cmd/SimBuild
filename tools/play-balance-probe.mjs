#!/usr/bin/env node
// Long-run ordinary economy diagnosis from the earned 404-resident save.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const savePath = process.env.SAVE_FILE || '/Volumes/ExtDrive/SimBuild-verification-2026-09-06/integration/earned-city-404.json';
const out = process.env.OUT_FILE || 'shots/integration/r7k-play-balance.json';
const days = Math.max(1, Number(process.env.DAYS || 30));
const taxes = (process.env.TAXES || '0.10,0.15,0.20').split(',').map(Number).filter(Number.isFinite);
const candidate = process.env.BALANCE_CANDIDATE === '1';
const save = JSON.parse(fs.readFileSync(savePath, 'utf8'));
const executablePath = process.env.SIM_CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', chromium.executablePath()].find(p => fs.existsSync(p));
const browser = await chromium.launch({ executablePath, headless: true, args: ['--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu', '--ignore-gpu-blocklist', '--no-sandbox'] });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), browserErrors = [];
  page.on('pageerror', e => browserErrors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') browserErrors.push(m.text()); });
  await page.route('**/@vite/client', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto(`${base}/?mode=play&quality=high&headless=1&speed=0`, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });
  const result = await page.evaluate(async ({ save, days, taxes, candidate }) => {
    const s = window.__sim, sim = s.registry.apis.simulation, TPD = sim.constants.TICKS_PER_DAY;
    if (candidate) {
      sim.constants.TUNING.adminFixed = 100;
      sim.constants.TUNING.adminPerCapita = 0.3;
      for (const key of Object.keys(sim.constants.TUNING.buildingUpkeep)) sim.constants.TUNING.buildingUpkeep[key] = 0;
    }
    const read = day => {
      const e = s.world.economy;
      return { day, tick: e.tick, money: e.money, population: e.population, jobs: e.jobs, happiness: e.happiness, net: e.net,
        income: e.income, expenses: e.expenses, incomeBreakdown: { ...e.incomeBreakdown }, expenseBreakdown: { ...e.expenseBreakdown },
        demand: { ...e.demand }, services: { ...e.services }, buildings: s.world.buildings.items.size, freeLots: s.world.zones.freeLots?.().length ?? null,
        milestone: e.milestone?.name, loanCapacity: e.loanCapacity, loans: (e.loans || []).map(l => ({ ...l })) };
    };
    const scenarios = [];
    for (const tax of taxes) {
      await s.saves.restore(structuredClone(save));
      sim.setTaxRate(tax);
      const samples = [read(0)];
      let firstNegativeDay = null;
      for (let day = 1; day <= days; day++) {
        sim.step(TPD);
        const sample = read(day); samples.push(sample);
        if (firstNegativeDay === null && sample.money < 0) firstNegativeDay = day;
      }
      const last = samples.at(-1), first = samples[0];
      scenarios.push({ tax, firstNegativeDay, populationChange: last.population - first.population, moneyChange: last.money - first.money,
        minMoney: Math.min(...samples.map(v => v.money)), minHappiness: Math.min(...samples.map(v => v.happiness)), samples });
    }
    return { days, candidate, scenarios, errors: s.errors.slice() };
  }, { save, days, taxes, candidate });
  result.browserErrors = browserErrors;
  result.pass = !result.errors.length && !browserErrors.length && result.scenarios.length === taxes.length;
  fs.mkdirSync(out.slice(0, out.lastIndexOf('/')), { recursive: true }); fs.writeFileSync(out, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ pass: result.pass, days, scenarios: result.scenarios.map(v => ({ tax: v.tax, firstNegativeDay: v.firstNegativeDay, populationChange: v.populationChange, moneyChange: v.moneyChange, minMoney: v.minMoney, minHappiness: v.minHappiness, final: v.samples.at(-1) })), errors: result.errors, browserErrors }, null, 2));
} finally { await browser.close(); }
