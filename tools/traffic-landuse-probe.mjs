#!/usr/bin/env node
// Diagnose real occupied land use around the Democity street target without mutating the game.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const out = process.env.OUT_DIR || 'shots/democity/traffic-landuse';
const executablePath = process.env.SIM_CHROME || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', chromium.executablePath(),
].find((candidate) => fs.existsSync(candidate));
const browser = await chromium.launch({ executablePath, headless: true, args: [
  '--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu',
  '--ignore-gpu-blocklist', '--no-sandbox',
] });

try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
  await page.route('**/@vite/client', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto(`${base}/?showcase=democity&time=12&camera=street&seed=1337&quality=high&headless=1&speed=0`, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });
  const result = await page.evaluate(() => {
    const sim = window.__sim;
    const target = sim.camera.target;
    const byEdge = new Map();
    const byType = {};
    let activeTotal = 0;
    let activeNear = 0;
    let buildingsNear = 0;
    for (const building of sim.world.buildings.items.values()) {
      const lot = sim.world.zones.lots.get(building.lotId);
      if (!lot) continue;
      const active = Math.max(0, building.occupants || 0) + Math.max(0, building.jobs || 0);
      const distance = Math.hypot(building.x - target.x, building.z - target.z);
      const row = byEdge.get(lot.edgeId) || { edgeId: lot.edgeId, buildings: 0, active: 0, nearestBuilding: Infinity, types: {} };
      row.buildings++;
      row.active += active;
      row.nearestBuilding = Math.min(row.nearestBuilding, distance);
      row.types[building.type] = (row.types[building.type] || 0) + 1;
      byEdge.set(lot.edgeId, row);
      byType[building.type] = (byType[building.type] || 0) + active;
      activeTotal += active;
      if (distance <= 150) { activeNear += active; buildingsNear++; }
    }
    const top = [...byEdge.values()].sort((a, b) => b.active - a.active || b.buildings - a.buildings).slice(0, 30);
    const vehicles = [...sim.world.traffic.vehicles.values()];
    const nearVehicles = vehicles.filter((vehicle) => Math.hypot(vehicle.x - target.x, vehicle.z - target.z) <= 150);
    return {
      target: [target.x, target.z],
      buildings: sim.world.buildings.items.size,
      buildingsNear,
      activeTotal,
      activeNear,
      activeNearPct: activeTotal ? 100 * activeNear / activeTotal : 0,
      activeByType: byType,
      occupiedEdges: byEdge.size,
      topEdges: top,
      vehicles: vehicles.length,
      nearVehicles: nearVehicles.map((vehicle) => ({ id: vehicle.id, kind: vehicle.kind, edgeId: vehicle.rec.id, x: vehicle.x, z: vehicle.z })),
      errors: sim.errors.slice(),
    };
  });
  result.browserErrors = browserErrors;
  result.pass = !result.errors.length && !browserErrors.length;
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(`${out}/landuse.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
