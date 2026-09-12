#!/usr/bin/env node
// Inspect current props draw chunks at one real Democity camera without mutating production state.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const out = process.env.OUT_DIR || 'shots/democity/props-visible-profile';
const camera = process.env.CAMERA || 'street';
const time = Number(process.env.TIME || 6.5);
const executablePath = process.env.SIM_CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', chromium.executablePath()].find(p => fs.existsSync(p));
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
    const rows = [];
    sim.registry.get('props').group.traverse(mesh => {
      if (!mesh.isMesh) return;
      const geometry = mesh.geometry;
      if (!geometry.boundingSphere) geometry.computeBoundingSphere();
      const center = geometry.boundingSphere.center.clone().applyMatrix4(mesh.matrixWorld);
      const instances = mesh.isInstancedMesh ? mesh.count : 1;
      const trianglesPerInstance = (geometry.index?.count || geometry.attributes.position?.count || 0) / 3;
      const triangles = trianglesPerInstance * instances;
      const kind = mesh.isInstancedMesh ? 'tree' : geometry.attributes.uv1 ? 'furniture' : 'foliage-or-global';
      rows.push({ kind, visible: mesh.visible, castShadow: mesh.castShadow, instances, trianglesPerInstance, triangles, distance: center.distanceTo(sim.camera.position), center: center.toArray(), material: mesh.material?.name || '', name: mesh.name || '' });
    });
    const summarize = kind => {
      const set = rows.filter(row => row.kind === kind);
      return { meshes: set.length, visible: set.filter(row => row.visible).length, visibleTriangles: set.filter(row => row.visible).reduce((sum,row) => sum + row.triangles, 0), rows: set.sort((a,b) => a.distance - b.distance) };
    };
    const treeGroups = Object.values(rows.filter(row => row.kind === 'tree' && row.visible).reduce((groups, row) => {
      const key = String(row.trianglesPerInstance);
      const group = groups[key] ||= { trianglesPerInstance: row.trianglesPerInstance, meshes: 0, instances: 0, triangles: 0, shadowMeshes: 0 };
      group.meshes++; group.instances += row.instances; group.triangles += row.triangles;
      if (row.castShadow) group.shadowMeshes++;
      return groups;
    }, {})).sort((a, b) => a.trianglesPerInstance - b.trianglesPerInstance);
    return { camera: sim.camera.position.toArray(), stats: sim.stats(), lodHistogram: sim.registry.apis.props.debug.lodHistogram(), treeGroups, furniture: summarize('furniture'), trees: summarize('tree'), other: summarize('foliage-or-global'), errors: sim.errors.slice() };
  });
  result.browserErrors = browserErrors;
  result.pass = !result.errors.length && !browserErrors.length;
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(`${out}/${camera}_${String(time).replace('.','p')}.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ pass: result.pass, camera: result.camera, lodHistogram: result.lodHistogram, treeGroups: result.treeGroups, furniture: { meshes: result.furniture.meshes, visible: result.furniture.visible, visibleTriangles: result.furniture.visibleTriangles }, errors: result.errors, browserErrors }, null, 2));
} finally {
  await browser.close();
}
