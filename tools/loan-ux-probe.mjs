import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';

const url = process.env.SIM_URL || 'http://127.0.0.1:5180';
const out = 'shots/playtest-fixes-r14';
await fs.mkdir(out, { recursive: true });
const executablePath = process.env.SIM_CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', chromium.executablePath()].find((path) => fsSync.existsSync(path));
const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on('pageerror', (error) => errors.push(String(error)));

try {
  await page.goto(`${url}/?mode=play&headless=1&time=12&speed=0`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__sim?.ready, null, { timeout: 240000 });
  await page.evaluate(() => {
    const sim = window.__sim;
    sim.__loanResults = [];
    sim.events.on('sim:loan', (event) => sim.__loanResults.push({ ...event }), 'loan-ux-probe');
    sim.registry.apis.ui.hud.showSide('stats');
  });
  const before = await page.evaluate(() => ({
    money: window.__sim.world.economy.money,
    capacity: window.__sim.world.economy.loanCapacity,
    loans: window.__sim.world.economy.loans.length,
    text: window.__sim.registry.apis.ui.hud.sideEl.innerText,
  }));
  await page.getByRole('button', { name: 'Take loan ¢30,000' }).click();
  await page.waitForFunction(() => window.__sim.__loanResults.length === 1);
  const after = await page.evaluate(() => ({
    money: window.__sim.world.economy.money,
    loans: window.__sim.world.economy.loans.map((loan) => ({ ...loan })),
    result: window.__sim.__loanResults[0],
    text: window.__sim.registry.apis.ui.hud.sideEl.innerText,
    notice: document.querySelector('.sb-notifications')?.innerText || document.body.innerText,
  }));
  const restore = await page.evaluate(async () => {
    const sim = window.__sim;
    const savedMoney = sim.world.economy.money;
    const savedDebt = sim.world.economy.loans[0].remaining;
    const saved = !!(await sim.save('loan-ux-probe'));
    sim.registry.apis.simulation.spend(1234, true);
    const loaded = await sim.load('loan-ux-probe');
    const result = { saved, loaded, money: sim.world.economy.money, debt: sim.world.economy.loans[0]?.remaining, savedMoney, savedDebt };
    await sim.saves.remove('loan-ux-probe');
    return result;
  });
  await page.evaluate(() => window.__sim.events.emit('ui:action', { action: 'takeLoan', args: [1000, 30] }));
  await page.waitForFunction(() => window.__sim.__loanResults.length === 2);
  const refused = await page.evaluate(() => ({
    money: window.__sim.world.economy.money,
    loans: window.__sim.world.economy.loans.length,
    result: window.__sim.__loanResults[1],
  }));
  await page.screenshot({ path: `${out}/economy-loan.png`, fullPage: true });
  const pass = before.capacity === 30000 && before.text.includes('Take loan ¢30,000')
    && after.money === before.money + 30000 && after.loans.length === 1
    && after.result.type === 'loan' && after.text.includes('Outstanding debt')
    && after.text.includes('No credit available') && refused.result.type === 'loan_refused'
    && refused.money === after.money && refused.loans === 1
    && restore.saved && restore.loaded && restore.money === restore.savedMoney && restore.debt === restore.savedDebt
    && errors.length === 0;
  const report = { pass, before, after, refused, restore, errors };
  await fs.writeFile(`${out}/economy-loan.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!pass) process.exitCode = 1;
} finally {
  await browser.close();
}
