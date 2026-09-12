#!/usr/bin/env node
// Inspect the real concrete road LOD pairs at one Democity camera without mutating production state.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const out = process.env.OUT_DIR || 'shots/democity/roads-visible-profile';
const camera = process.env.CAMERA || 'street';
const time = Number(process.env.TIME || 6.5);
const executablePath = process.env.SIM_CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', chromium.executablePath()].find(path => fs.existsSync(path));
const browser = await chromium.launch({ executablePath, headless: true, args: ['--use-angle=metal','--use-gl=angle','--enable-webgl','--enable-gpu','--ignore-gpu-blocklist','--no-sandbox'] });

try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const browserErrors = [];
  page.on('pageerror', error => browserErrors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()); });
  await page.route('**/@vite/client', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto(`${base}/?showcase=democity&time=${time}&camera=${camera}&seed=1337&quality=high&headless=1&speed=0`, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });
  const result = await page.evaluate(async () => {
    const sim = window.__sim;
    const start = sim.engine.stats.frames;
    while (sim.engine.stats.frames < start + 30) await new Promise(requestAnimationFrame);
    const byKey = new Map();
    sim.registry.get('roads').group.traverse(mesh => {
      if (!mesh.isMesh) return;
      const match = /^roads\/(concrete|concrete-lod)\/(.+)$/.exec(mesh.name || '');
      if (!match) return;
      const [, kind, key] = match;
      if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
      const center = mesh.geometry.boundingSphere.center.clone().applyMatrix4(mesh.matrixWorld);
      const row = byKey.get(key) || { key, distance: center.distanceTo(sim.camera.position), planarDistance: Math.hypot(center.x - sim.camera.position.x, center.z - sim.camera.position.z), center: center.toArray(), detailVisible: false, lodVisible: false, detailTriangles: 0, lodTriangles: 0, castShadow: false };
      const triangles = (mesh.geometry.index?.count || mesh.geometry.attributes.position?.count || 0) / 3;
      if (kind === 'concrete-lod') { row.lodVisible = mesh.visible; row.lodTriangles = triangles; }
      else { row.detailVisible = mesh.visible; row.detailTriangles = triangles; row.castShadow = mesh.castShadow; }
      byKey.set(key, row);
    });
    const rows = [...byKey.values()].sort((a, b) => a.planarDistance - b.planarDistance);
    return { camera: sim.camera.position.toArray(), stats: sim.stats(), roads: sim.registry.apis.roads.stats(), rows, errors: sim.errors.slice() };
  });
  result.browserErrors = browserErrors;
  result.pass = !result.errors.length && !browserErrors.length;
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(`${out}/${camera}_${String(time).replace('.', 'p')}.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ pass: result.pass, camera: result.camera, concreteLod: result.roads.concreteLod, rows: result.rows, errors: result.errors, browserErrors }, null, 2));
} finally {
  await browser.close();
}
