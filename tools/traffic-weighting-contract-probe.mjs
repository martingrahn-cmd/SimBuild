#!/usr/bin/env node
// Verify land-use-weighted traffic without changing total targets, route ownership or save state.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const out = process.env.OUT_DIR || 'shots/democity/traffic-weighting';
const executablePath = process.env.SIM_CHROME || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', chromium.executablePath(),
].find((candidate) => fs.existsSync(candidate));
const browser = await chromium.launch({ executablePath, headless: true, args: [
  '--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu',
  '--ignore-gpu-blocklist', '--no-sandbox',
] });

async function capture(seed) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
  await page.route('**/@vite/client', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto(`${base}/?showcase=democity&time=12&camera=street&seed=${seed}&quality=high&headless=1&speed=0`, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });
  const result = await page.evaluate(() => {
    const sim = window.__sim;
    const traffic = sim.registry.apis.traffic;
    traffic.freeze(true);
    const target = sim.camera.target;
    const inspect = () => {
      const vehicles = [...sim.world.traffic.vehicles.values()];
      const pedestrians = [...sim.world.traffic.pedestrians.values()];
      const nearby = vehicles.filter((vehicle) => Math.hypot(vehicle.x - target.x, vehicle.z - target.z) <= 150);
      let invalidLane = 0;
      let invalidRoute = 0;
      let negativeGaps = 0;
      const lanes = new Map();
      for (const vehicle of vehicles) {
        if (vehicle.edgeId !== null) {
          const edge = sim.world.roads.edges.get(vehicle.edgeId);
          if (!edge || vehicle.lane < 0 || vehicle.lane >= edge.lanes) invalidLane++;
          const key = `${vehicle.edgeId}:${vehicle.lane}`;
          const row = lanes.get(key) || [];
          row.push(vehicle);
          lanes.set(key, row);
        }
        if (!vehicle.route?.every((step) => sim.world.roads.edges.has(step.edgeId))) invalidRoute++;
      }
      for (const row of lanes.values()) {
        row.sort((a, b) => a.s - b.s);
        for (let index = 1; index < row.length; index++) {
          const back = row[index - 1], front = row[index];
          if (front.s - back.s - (front.len + back.len) / 2 < -0.001) negativeGaps++;
        }
      }
      return {
        digest: vehicles.map((vehicle) => [vehicle.kind, vehicle.rec.id, vehicle.lane, +vehicle.s.toFixed(6), vehicle.route.map((step) => [step.edgeId, step.dir])]),
        vehicles: vehicles.length,
        pedestrians: pedestrians.length,
        nearbyVehicles: nearby.length,
        nearbyKinds: [...new Set(nearby.map((vehicle) => vehicle.kind))].sort(),
        nearbyPedestrians: pedestrians.filter((pedestrian) => Math.hypot(pedestrian.x - target.x, pedestrian.z - target.z) <= 150).length,
        nullEdgeFraction: vehicles.filter((vehicle) => vehicle.edgeId === null).length / Math.max(1, vehicles.length),
        invalidLane, invalidRoute, negativeGaps,
        stats: traffic.stats(),
      };
    };
    const initial = inspect();
    const saved = traffic.serialize();
    const restored = traffic.deserialize(saved);
    const afterRestore = inspect();
    traffic.step(600);
    const after30Seconds = inspect();
    return { initial, restored, afterRestore, after30Seconds, errors: sim.errors.slice() };
  });
  result.browserErrors = browserErrors;
  await page.close();
  return result;
}

try {
  const first = await capture(1337);
  const repeat = await capture(1337);
  const seed7 = await capture(7);
  const result = {
    first, repeat, seed7,
    deterministicInitial: JSON.stringify(first.initial.digest) === JSON.stringify(repeat.initial.digest),
    differentSeed: JSON.stringify(first.initial.digest) !== JSON.stringify(seed7.initial.digest),
  };
  result.pass = result.deterministicInitial && result.differentSeed
    && [first, repeat, seed7].every((row) => row.restored && !row.errors.length && !row.browserErrors.length
      // The accepted seed-stage baseline peaks at 0.2293 null-edge fraction; restored/running samples return near zero.
      && [row.initial, row.afterRestore, row.after30Seconds].every((sample) => sample.invalidLane === 0
        && sample.invalidRoute === 0 && sample.negativeGaps === 0 && sample.nullEdgeFraction <= 0.24))
    && first.initial.nearbyVehicles >= 12 && first.initial.nearbyKinds.length >= 5 && first.initial.nearbyPedestrians >= 8;
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(`${out}/contract.json`, JSON.stringify(result, null, 2));
  const compact = ({ digest, stats, ...sample }) => ({
    ...sample,
    stats: { avgSpeed: stats.avgSpeed, congestion: stats.congestion, queued: stats.queued },
  });
  console.log(JSON.stringify({
    pass: result.pass, deterministicInitial: result.deterministicInitial, differentSeed: result.differentSeed,
    first: { initial: compact(first.initial), afterRestore: compact(first.afterRestore), after30Seconds: compact(first.after30Seconds) },
    errors: first.errors, browserErrors: first.browserErrors,
  }, null, 2));
} finally {
  await browser.close();
}
