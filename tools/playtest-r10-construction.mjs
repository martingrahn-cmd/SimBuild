#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const outDir = 'shots/playtest-fixes-r10';
const slot = '__r10_construction__';
fs.mkdirSync(outDir, { recursive: true });
const result = { errors: [], before: null, during: null, restored: null, completed: null, pass: false };
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal','--use-gl=angle','--enable-webgl','--enable-gpu','--ignore-gpu-blocklist','--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => result.errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') result.errors.push(m.text()); });
  await page.route('**/@vite/client', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto(`${base}/?showcase=all&time=12&camera=aerial&seed=1337&quality=high&speed=0&headless=1`, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForFunction(() => window.__sim?.ready && window.__sim.registry.apis.buildings?.serialize && window.__sim.registry.apis.simulation?.step, null, { timeout: 240000 });
  result.before = await page.evaluate(() => {
    const s = window.__sim, bapi = s.registry.apis.buildings, sim = s.registry.apis.simulation;
    s.world.flags.showcase = null;
    const lot = [...s.world.zones.lots.values()].filter(l => l.buildingId != null && s.world.buildings.items.has(l.buildingId))
      .sort((a, b) => s.world.buildings.items.get(b.buildingId).height - s.world.buildings.items.get(a.buildingId).height)[0];
    const oldId = lot.buildingId;
    bapi.demolish(oldId); bapi.flush();
    const id = bapi.requestSpawn(lot); bapi.flush();
    const b = s.world.buildings.items.get(id);
    s.setCamera({ target: [b.x, b.y + 4, b.z], yaw: b.heading + 0.7, pitch: 0.42, distance: 62 });
    return { id, lotId: lot.id, oldId, tick: sim.tick(), construction: { ...b.construction }, inEconomy: !!sim.building(id) };
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const s = window.__sim, b = [...s.world.buildings.items.values()].find(x => x.construction);
    s.registry.apis.simulation.step(Math.floor(b.construction.duration * 0.55));
  });
  await page.waitForTimeout(700);
  result.during = await page.evaluate(async slot => {
    const s = window.__sim, bapi = s.registry.apis.buildings, sim = s.registry.apis.simulation;
    const id = [...s.world.buildings.items.values()].find(b => b.construction)?.id;
    const b = s.world.buildings.items.get(id);
    const construction = { ...b.construction };
    const savedState = bapi.serialize().items.find(x => x.id === id).construction;
    const saved = !!(await s.save(slot));
    return { id, tick: sim.tick(), construction, savedState, saved, inEconomy: !!sim.building(id) };
  }, slot);
  await page.screenshot({ path: `${outDir}/construction-phase.png`, timeout: 180000 });
  await page.evaluate(() => window.__sim.registry.apis.simulation.step(40));
  await page.waitForTimeout(300);
  result.restored = await page.evaluate(async slot => {
    const s = window.__sim, bapi = s.registry.apis.buildings, sim = s.registry.apis.simulation;
    const loaded = await s.load(slot);
    const item = bapi.serialize().items.find(x => x.id === [...s.world.buildings.items.values()].find(b => b.construction)?.id);
    return { loaded, tick: sim.tick(), construction: item?.construction || null };
  }, slot);
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const s = window.__sim, sim = s.registry.apis.simulation;
    const b = [...s.world.buildings.items.values()].find(x => x.construction);
    sim.step((b?.construction?.duration || 1) + 2);
  });
  await page.waitForTimeout(800);
  result.completed = await page.evaluate(async slot => {
    const s = window.__sim, sim = s.registry.apis.simulation;
    const id = Number(Object.keys({ [String([...s.world.buildings.items.values()].find(b => !b.construction)?.id || 0)]: 1 })[0]);
    const target = s.world.buildings.items.get(window.__constructionProbeId || -1);
    await s.saves.remove(slot);
    const original = s.world.buildings.items.get(Number(document.body.dataset.probeBuildingId));
    return { remainingConstruction: [...s.world.buildings.items.values()].filter(b => b.construction).length, target: target || original || null, economyIds: [...s.world.buildings.items.keys()].filter(x => !!sim.building(x)).length };
  }, slot);
  result.completed.target = await page.evaluate(id => {
    const s = window.__sim, b = s.world.buildings.items.get(id);
    return b ? { id: b.id, construction: b.construction, inEconomy: !!s.registry.apis.simulation.building(id), occupants: b.occupants, jobs: b.jobs } : null;
  }, result.before.id);
  await page.screenshot({ path: `${outDir}/construction-complete.png`, timeout: 180000 });
} catch (error) { result.errors.push(String(error?.stack || error)); }
finally { await browser.close(); }

result.pass = result.errors.length === 0 && result.before?.construction && !result.before.inEconomy &&
  result.during?.construction?.progress > 0 && result.during.construction.progress < 1 && !result.during.inEconomy && result.during.saved &&
  result.restored?.loaded && JSON.stringify(result.restored.construction) === JSON.stringify(result.during.savedState) &&
  result.completed?.target && !result.completed.target.construction && result.completed.target.inEconomy;
fs.writeFileSync(`${outDir}/construction.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
