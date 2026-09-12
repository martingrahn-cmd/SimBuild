#!/usr/bin/env node
// Verify that a successful whole-city restore preserves Transit gameplay and its next-day fiscal result.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const out = process.env.OUT_FILE || 'shots/integration/r7x-transit-load-continuity.json';
const executablePath = process.env.SIM_CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', chromium.executablePath()].find(p => fs.existsSync(p));
const browser = await chromium.launch({ executablePath, headless: true, args: ['--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu', '--ignore-gpu-blocklist', '--no-sandbox'] });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), browserErrors = [];
  page.on('pageerror', e => browserErrors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') browserErrors.push(m.text()); });
  await page.route('**/@vite/client', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto(`${base}/?showcase=democity&time=12&camera=aerial&quality=high&headless=1&speed=0&seed=1337`, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });
  const result = await page.evaluate(async () => {
    const s = window.__sim, transit = s.registry.apis.transit, sim = s.registry.apis.simulation;
    const clone = value => structuredClone(value), exact = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const settle = async () => { await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame); };
    const lineDigest = () => transit.lines().map(line => ({ id: line.id, stops: [...line.stops], route: [...line.route], length: line.length,
      vehicles: line.vehicles, fare: line.fare, active: line.active, ridership: line.ridership, balance: line.balance, headway: line.headway }));
    const gameplay = () => {
      const economy = s.world.economy, stats = transit.stats();
      return { lines: lineDigest(), fleet: transit.vehicles().map(v => ({ id: v.id, lineId: v.lineId, ordinal: v.ordinal, edgeId: v.edgeId, lane: v.lane,
        t: v.t, riders: v.riders, occupancy: v.occupancy, atStop: v.atStop })), routeArcLengths: stats.routeArcLengths,
        transitFinance: { income: economy.incomeBreakdown.transit, expenses: economy.expenseBreakdown.transit },
        economy: { tick: economy.tick, money: economy.money, income: economy.income, expenses: economy.expenses, net: economy.net,
          incomeBreakdown: { ...economy.incomeBreakdown }, expenseBreakdown: { ...economy.expenseBreakdown } } };
    };

    // Canonicalize once because route/demand fields are intentionally derived by the owner on restore.
    const initial = clone(s.saves.serialize());
    await s.saves.restore(initial); await settle();
    const baseline = clone(s.saves.serialize()), baselineGameplay = gameplay();
    await s.saves.restore(clone(baseline)); await settle();
    const sameState = clone(s.saves.serialize()), sameGameplay = gameplay();

    // Produce a real target with different service and fiscal inputs, then move live state away from it.
    const first = transit.lines()[0];
    transit.setVehicles(first.id, first.vehicles === 7 ? 6 : 7);
    transit.setFare(first.id, first.fare === 5 ? 4 : 5);
    sim.step(20 - (sim.tick() % 20 || 20));
    const target = clone(s.saves.serialize()), targetGameplay = gameplay();
    transit.setVehicles(first.id, 1); transit.setFare(first.id, 1); sim.step(20);
    const mutatedGameplay = gameplay();
    await s.saves.restore(clone(target)); await settle();
    const restored = clone(s.saves.serialize()), restoredGameplay = gameplay();

    // Compare the deterministic next day from the target against a second target restore after mutation.
    sim.step(sim.constants.TICKS_PER_DAY);
    const nextDayA = gameplay();
    transit.setVehicles(first.id, 2); transit.setFare(first.id, 9); sim.step(40);
    await s.saves.restore(clone(target)); await settle(); sim.step(sim.constants.TICKS_PER_DAY);
    const nextDayB = gameplay();

    // Loading an older save should also restore its allocator state, provided it remains above live IDs.
    await s.saves.restore(clone(target)); await settle();
    const allocatorBefore = transit.serialize();
    const extra = transit.createLine('bus', transit.lines()[0].stops, { vehicles: 1, fare: 2 });
    if (extra !== null) transit.removeLine(extra);
    await s.saves.restore(clone(target)); await settle();
    const allocatorAfter = transit.serialize();

    return {
      restoreOrder: [...s.registry.modules.keys()],
      sameState: { transitExact: exact(baseline.modules.transit, sameState.modules.transit), simulationExact: exact(baseline.modules.simulation, sameState.modules.simulation), gameplayExact: exact(baselineGameplay, sameGameplay) },
      changedState: { mutationWasReal: !exact(targetGameplay, mutatedGameplay), transitExact: exact(target.modules.transit, restored.modules.transit), simulationExact: exact(target.modules.simulation, restored.modules.simulation), gameplayExact: exact(targetGameplay, restoredGameplay) },
      nextDay: { exact: exact(nextDayA, nextDayB), a: nextDayA.economy, b: nextDayB.economy },
      allocator: { extraLineId: extra, before: { nextStop: allocatorBefore.nextStop, nextLine: allocatorBefore.nextLine }, after: { nextStop: allocatorAfter.nextStop, nextLine: allocatorAfter.nextLine }, exact: exact(allocatorBefore, allocatorAfter) },
      target: { transit: targetGameplay.lines, economy: targetGameplay.economy }, restored: { transit: restoredGameplay.lines, economy: restoredGameplay.economy },
      errors: s.errors.slice(),
    };
  });
  result.browserErrors = browserErrors;
  result.corePass = Object.values(result.sameState).every(Boolean) && Object.values(result.changedState).every(Boolean) && result.nextDay.exact && !result.errors.length && !browserErrors.length;
  result.pass = result.corePass && result.allocator.exact;
  fs.mkdirSync(out.slice(0, out.lastIndexOf('/')), { recursive: true }); fs.writeFileSync(out, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ pass: result.pass, corePass: result.corePass, sameState: result.sameState, changedState: result.changedState, nextDayExact: result.nextDay.exact, allocator: result.allocator, errors: result.errors, browserErrors }, null, 2));
} finally { await browser.close(); }
