// Critic API-contract check for world.terrain (throwaway). Run: node shots/terrain/r1/apicheck.mjs
import { chromium } from 'playwright';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto('http://127.0.0.1:5173/?showcase=terrain&headless=1&time=12', { waitUntil: 'load' });
await page.waitForFunction(() => window.__sim && window.__sim.ready, null, { timeout: 180000 });
const r = await page.evaluate(async () => {
  const T = window.__sim.world.terrain;
  const out = {};
  const h0 = T.getHeight(0, 0);
  out.getHeight00 = h0;
  out.getHeightIsNumber = typeof h0 === 'number' && Number.isFinite(h0);
  const samples = [[0,0],[100,0],[0,100],[-500,300],[700,-700],[-900,190],[0,-300]].map(([x,z]) => T.getHeight(x,z));
  out.samples = samples;
  out.varies = new Set(samples.map((v) => v.toFixed(3))).size > 3;
  out.clampedOutside = Number.isFinite(T.getHeight(99999, -99999));
  const n = T.getNormal(100, 100);
  out.normal = [n.x, n.y, n.z]; out.normalUnit = Math.abs(Math.hypot(n.x, n.y, n.z) - 1) < 1e-4;
  const s = T.getSlope(100, 100);
  out.slope = s; out.slopeOk = typeof s === 'number' && s >= 0 && s <= Math.PI / 2;
  // flat check: slope of a hand-made normal
  out.isWaterOrigin = T.isWater(0, 0);
  out.isWaterSeaWest = T.isWater(-950, -900);
  out.isWaterRiver = T.isWater(0, T.features.river.zAt(0));
  out.isWaterTypeOk = typeof out.isWaterOrigin === 'boolean';
  // raycast from above origin straight down
  const THREE_Ray = { origin: { x: 0, y: 500, z: 0 }, direction: { x: 0, y: -1, z: 0 } };
  const hit = T.raycast(THREE_Ray);
  out.raycastHit = hit ? { point: [hit.point.x, hit.point.y, hit.point.z], normal: [hit.normal.x, hit.normal.y, hit.normal.z] } : null;
  out.raycastMatchesHeight = hit ? Math.abs(hit.point.y - h0) < 0.05 : false;
  const miss = T.raycast({ origin: { x: 0, y: 500, z: 0 }, direction: { x: 0, y: 1, z: 0 } });
  out.raycastMissIsNull = miss === null;
  // oblique ray
  const ob = T.raycast({ origin: { x: -200, y: 300, z: 200 }, direction: { x: 0.5, y: -0.5, z: -0.7071 } });
  out.obliqueHit = ob ? Math.abs(ob.point.y - T.getHeight(ob.point.x, ob.point.z)) < 0.2 : false;
  out.heightsIsF32 = T.heights instanceof Float32Array;
  out.heightsLen = T.heights.length; out.heightsLenOk = T.heights.length === 513 * 513;
  out.resolution = T.resolution; out.cellSize = T.cellSize;
  // modify + event + mesh change
  let evt = null; let evtCount = 0;
  const off = window.__sim.events.on ? window.__sim.events.on('terrain:changed', (p) => { evt = p; evtCount++; }) : null;
  const before = T.getHeight(120, 80);
  const v0 = T.version;
  const ret = T.modify({ x: 120, z: 80, radius: 30, strength: 12, mode: 'raise' });
  const after = T.getHeight(120, 80);
  out.modifyReturn = ret; out.modifyDelta = after - before; out.modifyChanged = Math.abs(after - before) > 1;
  out.versionBumped = T.version !== v0; out.versionBefore = v0; out.versionAfter = T.version;
  out.eventEmitted = evtCount > 0; out.eventPayload = evt;
  // heights array is the same buffer (no replacement)
  out.moduleStatus = window.__sim.registry.status().terrain;
  // does the GPU-side data pick it up? (height texture flagged for upload)
  const api = window.__sim.registry && window.__sim.registry.apis && window.__sim.registry.apis.terrain;
  const d = api && api.data ? api.data() : null;
  out.heightTexNeedsUpdate = d ? d.heightTex.needsUpdate : 'no-api';
  out.dataHeightsSameBuffer = d ? d.heights === T.heights : 'no-api';
  // lower & smooth & flatten don't throw
  try { T.modify({ x: 120, z: 80, radius: 30, strength: 12, mode: 'lower' }); T.modify({ x: 120, z: 80, radius: 30, strength: 1, mode: 'smooth' }); T.modify({ x: 120, z: 80, radius: 30, strength: 1, mode: 'flatten' }); out.otherModesOk = true; } catch (e) { out.otherModesOk = 'throw: ' + e.message; }
  out.restoredApprox = Math.abs(T.getHeight(120, 80) - before) < 6;
  out.simKeys = Object.keys(window.__sim);
  return out;
});
// pixel-level mesh change check: screenshot before/after a big raise near the aerial target
const shotA = await page.screenshot({ type: 'png' });
await page.evaluate(() => { const T = window.__sim.world.terrain; for (let i = 0; i < 6; i++) T.modify({ x: 0, z: 0, radius: 120, strength: 25, mode: 'raise' }); });
await page.waitForTimeout(4000);
const shotB = await page.screenshot({ type: 'png' });
let diff = 0; for (let i = 0; i < Math.min(shotA.length, shotB.length); i++) if (shotA[i] !== shotB[i]) diff++;
r.meshPixelBytesDiffer = diff; r.meshVisiblyChanged = diff > 2000;
r.errorsDuringCheck = errors;
console.log(JSON.stringify(r, null, 2));
await browser.close();
