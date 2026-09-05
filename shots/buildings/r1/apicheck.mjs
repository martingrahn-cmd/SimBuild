// Throwaway API-contract + acceptance probe for buildings, critic round 1.
// node shots/buildings/r1/apicheck.mjs [time] [seed] > out.json
import { chromium } from 'playwright';

const TIME = process.argv[2] || '12';
const SEED = process.argv[3] || '1337';

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'],
});
const ctx = await browser.newContext({ viewport: { width: 800, height: 600 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
page.on('pageerror', (e) => errors.push('pageerror: ' + String(e?.message || e).slice(0, 300)));

await page.goto(`http://127.0.0.1:5173/?showcase=buildings&headless=1&time=${TIME}&seed=${SEED}&speed=0`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => window.__sim && window.__sim.ready === true, null, { timeout: 300000, polling: 200 });
await page.waitForTimeout(800);

const res = await page.evaluate(() => {
  const S = window.__sim, W = S.world, B = W.buildings;
  const api = S.registry.apis.buildings;
  const out = { time: W.time?.hour, seed: W.seed };

  // ---- 1. api surface
  const required = ['requestSpawn', 'setLevel', 'demolish', 'at', 'get', 'count', 'flush', 'spawnFreeLots',
    'material', 'atlasTextures', 'setNight', 'setLit', 'serialize', 'deserialize',
    'stats', 'styleCounts', 'features', 'forceLod', 'lotSurface', 'cropRects'];
  out.apiPresent = {}; for (const k of required) out.apiPresent[k] = typeof api?.[k];
  out.apiMissing = required.filter((k) => typeof api?.[k] !== 'function');
  out.worldApi = ['spawn', 'demolish', 'levelUp', 'at'].filter((k) => typeof B[k] !== 'function');

  // ---- 2. staged world contract
  const items = [...B.items.values()];
  out.count = items.length;
  out.moduleStatus = S.stats().modules.buildings?.status;
  const fields = ['id', 'lotId', 'type', 'density', 'level', 'footprint', 'floors', 'height', 'x', 'y', 'z', 'heading', 'styleId', 'occupants', 'jobs', 'lit'];
  out.missingFields = {};
  for (const f of fields) { const n = items.filter((b) => b[f] === undefined).length; if (n) out.missingFields[f] = n; }
  out.badOccupants = items.filter((b) => b.type === 'residential' && !(b.occupants >= 1)).length;
  out.badJobs = items.filter((b) => b.type !== 'residential' && !(b.jobs >= 1)).length;
  out.mixedUse = items.filter((b) => b.mixedUse === true).length;
  out.styleIds = new Set(items.map((b) => b.styleId)).size;
  out.chunkStats = api?.stats ? api.stats() : null;
  out.statsFields = out.chunkStats ? Object.keys(out.chunkStats) : [];
  const statsRequired = ['buildings', 'buildingsL3NonIndustrial', 'chunks', 'visible', 'draws', 'tris0', 'tris1', 'tiles', 'buildMs', 'chunksBuiltThisFrame', 'lodSwitch', 'setupMs'];
  out.statsMissing = statsRequired.filter((k) => out.chunkStats == null || out.chunkStats[k] === undefined);

  // ---- 3. showcase composition (§8), computed by the critic from world data
  const byClass = {};
  for (const b of items) { const k = `${b.type}/${b.density}/${b.level}`; byClass[k] = (byClass[k] || 0) + 1; }
  out.byClassKeys = Object.keys(byClass).length;
  const combos = [];
  for (const t of ['residential', 'commercial', 'industrial', 'office']) for (const d of ['low', 'high']) for (let l = 1; l <= 5; l++) if (!byClass[`${t}/${d}/${l}`]) combos.push(`${t}/${d}/${l}`);
  out.missingClasses = combos;
  out.above60 = items.filter((b) => b.height > 60).length;
  out.tallest = Math.max(...items.map((b) => b.height));
  out.corners = items.filter((b) => { const l = W.zones?.lots?.get(b.lotId); return l?.corner === true; }).length;
  out.houses = items.filter((b) => b.type === 'residential' && b.density === 'low').length;
  out.sheds = items.filter((b) => b.type === 'industrial').length;
  out.chunks = out.chunkStats?.chunks;

  // ---- 4. level -> floors monotonic per class (item 5)
  const levelFloors = {};
  for (const b of items) {
    const k = `${b.type}/${b.density}`;
    (levelFloors[k] ||= {})[b.level] ||= [];
    levelFloors[k][b.level].push(b.floors);
  }
  out.floorsByClassLevel = {};
  out.styleIdsPerClass = {};
  for (const k of Object.keys(levelFloors)) {
    const row = {};
    for (let l = 1; l <= 5; l++) { const a = levelFloors[k][l]; row[l] = a ? Math.round(a.reduce((x, y) => x + y, 0) / a.length * 10) / 10 : null; }
    out.floorsByClassLevel[k] = row;
    const ids = new Set(items.filter((b) => `${b.type}/${b.density}` === k).map((b) => b.styleId));
    out.styleIdsPerClass[k] = [...ids];
  }

  // ---- 5. adjacency twins near the downtown target (item 2/10), computed by the critic
  const presets = S.camera.presets;
  out.presetNames = Object.keys(presets);
  const sel = (t, r) => items.filter((b) => Math.hypot(b.x - t[0], b.z - t[2]) <= r);
  const dt = presets.downtown?.target;
  if (dt) {
    const near = sel(dt, 250);
    out.downtown = { n: near.length, heights: near.map((b) => Math.round(b.height)).sort((a, b) => b - a).slice(0, 24) };
    const hs = near.map((b) => b.height).sort((a, b) => a - b);
    out.downtown.median = hs[hs.length >> 1];
    out.downtown.max = hs[hs.length - 1];
    // distinct roof heights separated by >= 4 m
    const distinct = []; for (const h of hs) if (!distinct.some((d) => Math.abs(d - h) < 4)) distinct.push(h);
    out.downtown.distinctHeights4m = distinct.length;
    // styleId shared by two buildings > 60 m
    const tall = near.filter((b) => b.height > 60); const seen = {}; let dup = 0;
    for (const b of tall) { seen[b.styleId] = (seen[b.styleId] || 0) + 1; }
    for (const k of Object.keys(seen)) if (seen[k] > 1) dup += seen[k] - 1;
    out.downtown.tallCount = tall.length; out.downtown.tallSharedStyle = dup;
    out.downtown.tallStyleHistogram = seen;
    // adjacentTwins proxy: within 45 m, same footprint width +-1 m and same styleId (crown key unavailable)
    let twins = 0;
    for (let i = 0; i < near.length; i++) for (let j = i + 1; j < near.length; j++) {
      const a = near[i], b = near[j];
      if (Math.hypot(a.x - b.x, a.z - b.z) <= 45 && Math.abs(a.footprint.w - b.footprint.w) <= 1 && a.styleId === b.styleId) twins++;
    }
    out.downtown.adjacentTwinsProxy = twins;
  }
  const bt = presets.block?.target, ct = presets.closeup?.target, nt = presets.night_downtown?.target;
  const nearest = (t, n) => items.map((b) => ({ id: b.id, cls: `${b.type}/${b.density}/${b.level}`, h: +b.height.toFixed(1), fw: +b.footprint.w.toFixed(1), style: b.styleId, d: +Math.hypot(b.x - t[0], b.z - t[2]).toFixed(1) })).sort((a, b) => a.d - b.d).slice(0, n);
  if (bt) out.blockNearest5 = nearest(bt, 5);
  if (ct) out.closeupNearest5 = nearest(ct, 5);
  if (nt) {
    const near = sel(nt, 120);
    out.nightSel = {
      n: near.length,
      commercial: near.filter((b) => b.type === 'commercial').length,
      commercialOrMixed: near.filter((b) => b.type === 'commercial' || b.mixedUse === true).length,
    };
  }
  // item 13 denominator
  const r3 = items.filter((b) => b.type === 'residential' && b.density === 'high' && b.level >= 3);
  out.resHighL3plus = r3.length;
  // item 11 denominators
  out.totalsByLevel = {}; for (let l = 1; l <= 5; l++) out.totalsByLevel[l] = items.filter((b) => b.level === l).length;
  out.totalsByClass = {}; for (const b of items) { const k = `${b.type}/${b.density}`; out.totalsByClass[k] = (out.totalsByClass[k] || 0) + 1; }

  // ---- 6. seating (item 8): 8 perimeter samples per building
  let worstTop = 0, sunk = 0, floatN = 0; const T = W.terrain;
  for (const b of items) {
    const c = Math.cos(b.heading), s = Math.sin(b.heading);
    const hw = b.footprint.w / 2, hd = b.footprint.d / 2;
    let mx = -Infinity;
    for (const [i, j] of [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]]) {
      const lx = hw * i, lz = hd * j;
      const h = T.getHeight(b.x + c * lx + s * lz, b.z + s * lx - c * lz);
      if (h > mx) mx = h;
    }
    const d = mx - b.y;
    if (d > 0.25) sunk++;              // terrain above the base plate
    if (Math.abs(d) > worstTop) worstTop = Math.abs(d);
    if (b.y - mx > 0.25) floatN++;
  }
  out.seating = { worstDelta: +worstTop.toFixed(2), terrainAboveBase: sunk, floating: floatN };

  // ---- 7. material / render state (item 15)
  const mat = api?.material?.();
  out.material = mat ? {
    roughness: mat.roughness, metalness: mat.metalness, normalScale: mat.normalScale?.x,
    hasRoughnessMap: !!mat.roughnessMap, hasNormalMap: !!mat.normalMap, hasEmissiveMap: !!mat.emissiveMap,
    envMapIntensity: mat.envMapIntensity, emissiveIntensity: mat.emissiveIntensity,
  } : null;
  const tex = api?.atlasTextures?.();
  out.textures = tex ? Object.entries(tex).map(([k, t]) => `${k}:${t?.image?.width}x${t?.image?.height}`) : null;
  out.toneMapping = S.engine.renderer.toneMapping;
  out.exposure = S.engine.renderer.toneMappingExposure;
  out.sceneFog = !!S.engine.scene.fog;

  // ---- 8. lit live (item 22)
  out.litTrue = items.filter((b) => b.lit === true).length;
  out.night = W.weather?.night;

  return out;
});

// ---- 9. mutation + event contract (item 19)
const mut = await page.evaluate(async () => {
  const S = window.__sim, W = S.world, B = W.buildings, api = S.registry.apis.buildings;
  const out = {};
  const evs = [];
  S.events.on('buildings:changed', (p) => evs.push(JSON.parse(JSON.stringify(p))), 'crit');
  const v0 = B.version, tris0 = api.stats().tris0;

  const lot = { id: 91001, x: -430, z: -340, w: 26, d: 28, heading: 0, type: 'commercial', density: 'low', level: 2, corner: false };
  const id = B.spawn(lot);
  out.spawnId = id;
  api.flush();
  const b = B.items.get(id);
  out.spawned = b ? { id: b.id, lotId: b.lotId, type: b.type, level: b.level, floors: b.floors, height: +b.height.toFixed(2), styleId: b.styleId, occupants: b.occupants, jobs: b.jobs, lit: b.lit } : null;
  out.lotBackref = lot.buildingId;
  out.versionAfterSpawn = B.version - v0;
  out.trisAfterSpawn = api.stats().tris0 - tris0;

  // at()
  out.atInside = B.at(b.x, b.z)?.id ?? null;
  const outside = b.footprint.w / 2 + 1.5;
  out.atOutside = B.at(b.x + outside * 3, b.z + outside * 3)?.id ?? null;

  // levelUp
  const h0 = b.height, f0 = b.floors;
  B.levelUp(id); api.flush();
  const b2 = B.items.get(id);
  out.levelUp = { level: b2.level, floorsBefore: f0, floorsAfter: b2.floors, heightBefore: +h0.toFixed(2), heightAfter: +b2.height.toFixed(2) };

  // setLevel 1..5 heights (item 23)
  const hs = [];
  for (let n = 1; n <= 5; n++) { api.setLevel(id, n); api.flush(); const x = B.items.get(id); hs.push({ n, h: +x.height.toFixed(2), floors: x.floors, style: x.styleId }); }
  out.growth = hs;

  // demolish
  B.demolish(id); api.flush();
  out.afterDemolish = { present: B.items.has(id), lotBuildingId: lot.buildingId, trisDelta: api.stats().tris0 - tris0 };
  out.events = evs.slice(-8);
  out.versionTotal = B.version - v0;

  // serialize round-trip (item 19)
  const before = { tris0: api.stats().tris0, count: B.items.size };
  const data = api.serialize();
  api.deserialize(data);
  const after = { tris0: api.stats().tris0, count: B.items.size };
  out.roundTrip = { before, after,
    idsStable: [...B.items.keys()].slice(0, 3),
    trisMatch: Math.abs(after.tris0 - before.tris0) < 1,
    countMatch: after.count === before.count };
  return out;
});

// ---- 10. day emissive + infoview tint (items 14, 21) via pixel diff on the canvas
const px = await page.evaluate(async () => {
  const S = window.__sim, api = S.registry.apis.buildings;
  const grab = async () => {
    S.engine.renderer.render(S.engine.scene, S.camera.camera);
    const c = S.engine.renderer.domElement;
    const oc = document.createElement('canvas'); oc.width = c.width; oc.height = c.height;
    oc.getContext('2d').drawImage(c, 0, 0);
    return oc.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  };
  const diff = (a, b) => { let s = 0, n = 0; for (let i = 0; i < a.length; i += 4) { s += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); n += 3; } return s / n; };
  const out = {};
  S.camera.apply(S.camera.presets.downtown); S.engine.renderer.render(S.engine.scene, S.camera.camera);
  const a = await grab(); api.setLit(0); const b = await grab(); api.setLit(1); const c = await grab();
  out.setLitDiffMeanAbs = +diff(b, c).toFixed(3);
  api.setLit(0.5);
  // uNight uniform at noon
  out.uNight = api.material()?.userData?.uNightProbe ?? null;
  // infoview tint (item 21)
  const W = S.world;
  const base = await grab();
  W.infoview.active = 'density';
  W.infoview.buildingTint = () => ({ r: 1, g: 0, b: 0 });
  const tinted = await grab();
  out.infoviewDiff = +diff(base, tinted).toFixed(3);
  W.infoview.active = null; W.infoview.buildingTint = () => null;
  const restored = await grab();
  out.infoviewRestoredDiff = +diff(base, restored).toFixed(3);
  // forceLod parity (item 16)
  out.forceLod = typeof api.forceLod === 'function';
  return out;
});

console.log(JSON.stringify({ errors, res, mut, px }, null, 2));
await browser.close();
