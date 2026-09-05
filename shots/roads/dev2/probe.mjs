// Builder probe (round 2): terrain-under-road check, rebuild idempotency, ring detection, orphan cleanup,
// draw calls of the roads group alone. Run: node probe.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';

const exe = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'];
const browser = await chromium.launch({ executablePath: exe, headless: true, args });
const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } });
const page = await ctx.newPage();
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + String(e).slice(0, 300)));
await page.goto('http://127.0.0.1:5173/?showcase=roads&headless=1&time=12', { waitUntil: 'domcontentloaded', timeout: 240000 });
await page.waitForFunction(() => window.__sim && window.__sim.ready === true, null, { timeout: 240000, polling: 100 });

const res = await page.evaluate(async () => {
  const s = window.__sim;
  const R = s.world.roads, T = s.world.terrain;
  const api = s.registry.apis.roads;
  const waitFrames = async (n) => { const f0 = s.engine.stats.frames; while (s.engine.stats.frames - f0 < n) await new Promise((r) => setTimeout(r, 50)); };
  const rec = s.registry.get('roads');
  const group = rec.group;
  const meshInfo = () => { let meshes = 0, tris = 0; group.traverse((o) => { if (o.isMesh) { meshes++; const g = o.geometry; tris += g.index ? g.index.count / 3 : g.attributes.position.count / 3; } }); return { meshes, tris }; };
  const out = { status: s.registry.status().roads, stats: api.stats(), checks: {} };
  out.initial = { nodes: R.nodes.size, edges: R.edges.size, ...meshInfo() };

  // ---- terrain under the carriageway: sample every non-bridge edge densely, across the asphalt
  let sunk = 0, worst = 0, worstAt = null, samples = 0, above = 0;
  for (const e of R.edges.values()) {
    const Ty = R.types[e.type];
    for (let t = 0.02; t < 0.98; t += 0.02) {
      const p = R.sample(e.id, t);
      for (let u = -Ty.asphaltHalf + 0.3; u <= Ty.asphaltHalf - 0.3; u += 1.5) {
        const x = p.x + p.normal.x * u, z = p.z + p.normal.z * u;
        const th = T.getHeight(x, z);
        if (T.isWater(x, z) || p.y - th > 2.4) continue;   // bridge rows
        samples++;
        const gap = (p.y + 0.08) - th;          // asphalt surface above terrain
        if (gap < 0.02) { sunk++; if (gap < worst) { worst = gap; worstAt = { edge: e.id, t: +t.toFixed(2), u, x: +x.toFixed(1), z: +z.toFixed(1), gap: +gap.toFixed(3) }; } }
        if (gap > 0.6) above++;
      }
    }
  }
  out.terrain = { samples, sunk, worst: +worst.toFixed(3), worstAt, above };
  out.checks.noTerrainThroughRoad = sunk === 0;

  // ---- bridges on land (parapets where there is no water)
  out.landBridges = [];
  for (const e of R.edges.values()) {
    if (!e.bridge) continue;
    const dbg = api.edgeDebug(e.id, 4);
    const land = dbg.rows.filter((r) => r.bridge && !r.water);
    if (land.length) out.landBridges.push({ edge: e.id, type: e.type, len: dbg.len, landRows: land.length, sample: land.slice(0, 3).map((r) => ({ s: r.s, y: r.y, design: r.design, dy: +(r.y - r.design).toFixed(2) })) });
  }
  // ---- rings
  const edges = api.edges();
  out.rings = edges.filter((e) => e.ring).length;
  out.checks.ringDetected = out.rings === 8;
  const inters = api.intersections();
  out.roundaboutNodes = inters.filter((i) => i.roundabout).length;
  out.checks.roundaboutNodes = out.roundaboutNodes === 4;

  // ---- idempotency
  const st0 = api.stats();
  const m0 = meshInfo();
  const h0 = Array.from(T.heights.subarray(0, 20000));
  api.rebuild();
  const st1 = api.stats();
  const m1 = meshInfo();
  let hdiff = 0; for (let i = 0; i < 20000; i++) if (Math.abs(T.heights[i] - h0[i]) > 1e-4) hdiff++;
  out.idempotent = { tris0: m0.tris, tris1: m1.tris, verts0: st0.terrainVerts, verts1: st1.terrainVerts, heightsChanged: hdiff, ms: +st1.ms.toFixed(0) };
  out.checks.rebuildIdempotent = m0.tris === m1.tris && st1.terrainVerts === 0 && hdiff === 0;

  // ---- orphan cleanup
  const a = R.addNode(-800, -800), b = R.addNode(-700, -800);
  const e1 = R.addEdge(a, b, 'street');
  R.removeEdge(e1);
  out.checks.orphanNodesRemoved = !R.nodes.has(a) && !R.nodes.has(b);
  await waitFrames(3);

  // ---- lamp positions + frontage still work
  const first = [...R.edges.values()][0];
  out.lamps = api.lampPositions(first.id).length;
  out.frontage = R.frontage(first.id).length;
  out.checks.lampsAndFrontage = out.lamps > 0 && out.frontage > 0;

  // ---- roads-only draw calls: hide everything but roads for one frame
  const hidden = [];
  s.engine.scene.traverse((o) => { if (o.isGroup && o.name.startsWith('module:') && o !== group && o.visible) { o.visible = false; hidden.push(o); } });
  await waitFrames(2);
  out.roadsOnlyDrawCalls = s.engine.stats.drawCalls;
  for (const o of hidden) o.visible = true;
  await waitFrames(1);
  out.allDrawCalls = s.engine.stats.drawCalls;
  out.errors = s.errors;
  return out;
});
res.consoleErrors = consoleErrors;
fs.writeFileSync(new URL('./probe.out.json', import.meta.url), JSON.stringify(res, null, 2));
console.log(JSON.stringify(res, null, 2));
await browser.close();
