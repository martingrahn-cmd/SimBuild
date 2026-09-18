#!/usr/bin/env node
import { chromium } from 'playwright';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const baseline = process.env.SIM_BASELINE_URL || 'http://127.0.0.1:5184';
const candidate = process.env.SIM_CANDIDATE_URL || 'http://127.0.0.1:5185';
const out = process.env.SIM_SERVICES_LIGHT_OUT || 'shots/services/light-pool-contract.json';
const executablePath = process.env.SIM_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-webgl', '--enable-gpu', '--no-sandbox'],
});

async function capture(base, time) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const browserErrors = [];
  page.on('pageerror', error => browserErrors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()); });
  await page.goto(`${base}/?showcase=democity&seed=1337&time=${time}&camera=park&headless=1&speed=0`, {
    waitUntil: 'domcontentloaded', timeout: 300000,
  });
  await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 300000 });
  await page.evaluate(async () => {
    const start = window.__sim.engine.stats.frames;
    while (window.__sim.engine.stats.frames < start + 12) await new Promise(requestAnimationFrame);
  });
  const value = await page.evaluate(() => {
    const sim = window.__sim;
    const pools = sim.engine.scene.getObjectByName('services:light-pools');
    const contacts = sim.engine.scene.getObjectByName('services:contacts');
    const sample = texture => {
      const canvas = texture?.image;
      const context = canvas?.getContext?.('2d');
      if (!context) return null;
      const points = [[64,64],[73,64],[88,64],[107,64],[125,64]];
      return points.map(([x,y]) => context.getImageData(x,y,1,1).data[3]);
    };
    const serviceState = sim.registry.apis.services.serialize();
    return {
      poolCount: pools?.count ?? -1,
      contactCount: contacts?.count ?? -1,
      poolVisible: pools?.visible ?? false,
      poolOpacity: pools?.material?.opacity ?? null,
      poolColor: pools?.material?.color?.getHexString?.() ?? null,
      poolAlpha: sample(pools?.material?.map),
      contactAlpha: sample(contacts?.material?.map),
      mapsAreSeparate: pools?.material?.map !== contacts?.material?.map,
      poolGeometry: pools ? [pools.geometry.attributes.position.count, pools.geometry.index?.count ?? 0] : null,
      contactGeometry: contacts ? [contacts.geometry.attributes.position.count, contacts.geometry.index?.count ?? 0] : null,
      serviceState: JSON.stringify(serviceState),
      engineErrors: sim.errors.slice(),
    };
  });
  await page.close();
  return {
    time,
    ...value,
    serviceHash: hash(value.serviceState),
    serviceState: undefined,
    browserErrors,
  };
}

const baselineNight = await capture(baseline, 22);
const candidateNight = await capture(candidate, 22);
const candidateDay = await capture(candidate, 12);
const unchanged = {
  poolCount: baselineNight.poolCount === candidateNight.poolCount,
  contactCount: baselineNight.contactCount === candidateNight.contactCount,
  geometry: JSON.stringify(baselineNight.poolGeometry) === JSON.stringify(candidateNight.poolGeometry)
    && JSON.stringify(baselineNight.contactGeometry) === JSON.stringify(candidateNight.contactGeometry),
  serviceState: baselineNight.serviceHash === candidateNight.serviceHash,
};
const ok = Object.values(unchanged).every(Boolean)
  && baselineNight.mapsAreSeparate === false
  && candidateNight.mapsAreSeparate === true
  && candidateNight.poolVisible
  && candidateNight.poolOpacity > 0
  && !candidateDay.poolVisible
  && candidateDay.poolOpacity === 0
  && candidateNight.poolAlpha?.[0] > candidateNight.poolAlpha?.at(-1)
  && candidateNight.engineErrors.length === 0
  && candidateNight.browserErrors.length === 0
  && candidateDay.engineErrors.length === 0
  && candidateDay.browserErrors.length === 0;
const result = { ok, baseline, candidate, unchanged, baselineNight, candidateNight, candidateDay };
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
await browser.close();
if (!ok) process.exitCode = 1;
