#!/usr/bin/env node
// Inspect the real service LOD chunks at one Democity camera without mutating production state.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const out = process.env.OUT_DIR || 'shots/democity/services-visible-profile';
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
    sim.registry.get('services').group.traverse(mesh => {
      if (!mesh.isMesh) return;
      const match = /^services:(static|foliage|proxy):(.+)$/.exec(mesh.name || '');
      if (!match) return;
      const [, kind, key] = match;
      if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
      const center = mesh.geometry.boundingSphere.center.clone().applyMatrix4(mesh.matrixWorld);
      const row = byKey.get(key) || { key, distance: center.distanceTo(sim.camera.position), planarDistance: Math.hypot(center.x - sim.camera.position.x, center.z - sim.camera.position.z), center: center.toArray(), detailVisible: false, proxyVisible: false, detailTriangles: 0, proxyTriangles: 0, detailDraws: 0 };
      const triangles = (mesh.geometry.index?.count || mesh.geometry.attributes.position?.count || 0) / 3 * (mesh.isInstancedMesh ? mesh.count : 1);
      if (kind === 'proxy') { row.proxyVisible ||= mesh.visible; row.proxyTriangles += triangles; }
      else { row.detailVisible ||= mesh.visible; row.detailTriangles += triangles; row.detailDraws++; }
      byKey.set(key, row);
    });
    for (const item of sim.world.services.items.values()) {
      const key = `${Math.floor(item.x / 128)},${Math.floor(item.z / 128)}`;
      const row = byKey.get(key);
      if (!row) continue;
      (row.items ||= []).push({ id: item.id, kind: item.kind, x: item.x, y: item.y, z: item.z });
    }
    const rows = [...byKey.values()].sort((a, b) => a.planarDistance - b.planarDistance);
    return {
      camera: sim.camera.position.toArray(),
      stats: sim.stats(),
      lod: sim.registry.apis.services.stats().lod,
      totals: {
        chunks: rows.length,
        detailChunks: rows.filter(row => row.detailVisible).length,
        proxyChunks: rows.filter(row => row.proxyVisible).length,
        visibleDetailTriangles: rows.filter(row => row.detailVisible).reduce((sum, row) => sum + row.detailTriangles, 0),
        visibleProxyTriangles: rows.filter(row => row.proxyVisible).reduce((sum, row) => sum + row.proxyTriangles, 0),
        proxyKinds: Object.fromEntries(rows.filter(row => row.proxyVisible).flatMap(row => row.items || []).reduce((counts, item) => counts.set(item.kind, (counts.get(item.kind) || 0) + 1), new Map())),
      },
      rows,
      errors: sim.errors.slice(),
    };
  });
  result.browserErrors = browserErrors;
  result.pass = !result.errors.length && !browserErrors.length;
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(`${out}/${camera}_${String(time).replace('.', 'p')}.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
