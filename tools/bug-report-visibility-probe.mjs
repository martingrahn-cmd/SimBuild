#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.SIM_URL || 'http://127.0.0.1:5180';
const outDir = 'shots/playtest-fixes-r16';
fs.mkdirSync(outDir, { recursive: true });

const result = { errors: [], menus: {}, openedUrl: null, pass: false };
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu', '--ignore-gpu-blocklist', '--no-sandbox'],
});

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', (error) => result.errors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') result.errors.push(message.text()); });
  await page.goto(`${base}/?mode=play&headless=1&speed=0`, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });
  await page.evaluate(() => { window.open = (url) => { window.__bugReportProbeUrl = String(url); }; });

  for (const kind of ['main', 'pause']) {
    await page.evaluate((menu) => window.__sim.registry.apis.ui.openMenu(menu), kind);
    await page.waitForSelector('.sb-modal .sb-mbtn.report-bug');
    await page.waitForTimeout(150);
    const state = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll('.sb-modal .sb-mbtn.report-bug')];
      const button = buttons[0];
      const style = getComputedStyle(button);
      const rect = button.getBoundingClientRect();
      return {
        count: buttons.length,
        label: button?.querySelector('span:not(.sb-ms)')?.textContent,
        helper: button?.querySelector('.sb-ms')?.textContent,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        backgroundImage: style.backgroundImage,
        borderColor: style.borderColor,
        visible: !!button && rect.width > 0 && rect.height >= 54 && style.visibility !== 'hidden' && style.opacity !== '0',
      };
    });
    result.menus[kind] = state;
    await page.screenshot({ path: `${outDir}/bug-report-${kind}.png`, timeout: 180000 });
  }

  await page.locator('.sb-modal .sb-mbtn.report-bug').click();
  result.openedUrl = await page.evaluate(() => window.__bugReportProbeUrl || null);
  result.errors.push(...await page.evaluate(() => window.__sim.errors.slice()));
} catch (error) {
  result.errors.push(String(error?.stack || error));
} finally {
  await browser.close();
}

result.errors = [...new Set(result.errors)];
result.pass = result.errors.length === 0
  && ['main', 'pause'].every((kind) => result.menus[kind]?.count === 1
    && result.menus[kind]?.visible
    && result.menus[kind]?.label === 'Report a bug'
    && result.menus[kind]?.helper === 'Help improve the game')
  && /github\.com\/martingrahn-cmd\/SimBuild\/issues\/new/.test(result.openedUrl || '')
  && /template=bug_report\.yml/.test(result.openedUrl || '');

fs.writeFileSync(`${outDir}/bug-report.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
