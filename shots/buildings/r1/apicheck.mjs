// Throwaway API-contract probe for the buildings module (critic round 1).
import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'],
});
const ctx = await browser.newContext({ viewport: { width: 800, height: 600 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 400)); });
page.on('pageerror', (e) => errors.push('pageerror: ' + String(e?.message || e).slice(0, 400)));

await page.goto('http://127.0.0.1:5173/?showcase=buildings&headless=1&time=12', { waitUntil: 'domcontentloaded', timeout: 240000 });
await page.waitForFunction(() => window.__sim && window.__sim.ready === true, null, { timeout: 240000, polling: 200 });
await page.waitForTimeout(500);

const res = await page.evaluate(async () => {
  const S = window.__sim, W = S.world, B = W.buildings, out = {};
  const drawsBefore = S.stats().drawCalls;
  out.moduleStatus = S.stats().modules.buildings?.status ?? S.modulesStatus().buildings?.status;
  out.stagedCount = B.items.size;
  out.apiShape = ['spawn', 'demolish', 'levelUp', 'at'].map((k) => `${k}:${typeof B[k]}`);

  // --- event capture
  const evs = [];
  const off = S.events.on('buildings:changed', (p) => evs.push(JSON.parse(JSON.stringify(p))), 'apicheck');

  // --- spawn on a fresh lot
  const lot = { id: 90001, x: -420, z: -330, w: 24, d: 26, heading: 0, type: 'commercial', density: 'low', level: 2 };
  const id = B.spawn(lot);
  out.spawnId = id;
  const b = B.items.get(id);
  out.spawned = b ? {
    footprint: b.footprint, floors: b.floors, height: +b.height.toFixed(2),
    x: +b.x.toFixed(2), y: +b.y.toFixed(2), z: +b.z.toFixed(2),
    fitsLot: b.footprint.w <= lot.w + 0.01 && b.footprint.d <= lot.d + 0.01,
    terrainY: +W.terrain.getHeight(b.x, b.z).toFixed(2),
    lotIdBack: lot.buildingId,
  } : null;
  // spawn twice on the same lot must not duplicate
  const id2 = B.spawn(lot);
  out.doubleSpawnSameId = id2 === id;

  // flush geometry so the mesh exists
  const api = S.registry.modules.get('buildings').api;
  api.flush();

  // --- at()
  out.atCentre = B.at(b.x, b.z)?.id ?? null;
  out.atCorner = B.at(b.x + b.footprint.w / 2 - 0.2, b.z + b.footprint.d / 2 - 0.2)?.id ?? null;
  out.atOutside = B.at(b.x + 500, b.z + 500)?.id ?? null;
  out.atExistingDowntown = (() => { const any = [...B.items.values()].find((q) => q.type === 'office'); return any ? (B.at(any.x, any.z)?.id === any.id) : null; })();


  // --- at() across a 128 m chunk boundary (buildings are bucketed by centre)
  out.chunkBoundary = (() => {
    const TILE = 128;
    for (const q of B.items.values()) {
      const c = Math.cos(q.heading), sn = Math.sin(q.heading);
      // sample points inside the footprint, look for one in a different chunk than the centre
      for (const [ux, uz] of [[0.45, 0], [-0.45, 0], [0, 0.45], [0, -0.45], [0.45, 0.45], [-0.45, -0.45]]) {
        const lx = q.footprint.w * ux, lz = q.footprint.d * uz;
        const wx = q.x + c * lx + sn * lz, wz = q.z + sn * lx - c * lz;
        const sameChunk = Math.floor(wx / TILE) === Math.floor(q.x / TILE) && Math.floor(wz / TILE) === Math.floor(q.z / TILE);
        if (sameChunk) continue;
        const hit = B.at(wx, wz);
        return { id: q.id, kind: q.plan?.kind, centre: [+q.x.toFixed(1), +q.z.toFixed(1)], probe: [+wx.toFixed(1), +wz.toFixed(1)],
                 found: hit ? hit.id : null, ok: hit?.id === q.id };
      }
    }
    return 'no building straddles a chunk boundary';
  })();

  // --- levelUp
  const before = { level: b.level, floors: b.floors, h: b.height, fp: { ...b.footprint } };
  const ok = B.levelUp(id);
  api.flush();
  const after = B.items.get(id);
  out.levelUp = { returned: ok, before, after: { level: after.level, floors: after.floors, h: +after.height.toFixed(2), fp: after.footprint }, changed: after.level !== before.level && (after.height !== before.h || after.floors !== before.floors) };
  // levelUp at cap
  for (let i = 0; i < 6; i++) B.levelUp(id);
  out.levelCap = B.items.get(id).level;

  // --- demolish
  const n0 = B.items.size;
  const del = B.demolish(id);
  api.flush();
  out.demolish = { returned: del, removed: B.items.size === n0 - 1, atAfter: B.at(b.x, b.z)?.id ?? null, lotFreed: lot.buildingId === undefined };
  out.demolishMissing = B.demolish(999999);

  // --- events
  await new Promise((r) => setTimeout(r, 400));
  await new Promise((r) => requestAnimationFrame(r));
  await new Promise((r) => setTimeout(r, 300));
  out.events = evs.slice(-6);
  out.eventSawAdd = evs.some((e) => (e.added || []).includes(id));
  out.eventSawUpdate = evs.some((e) => (e.updated || []).includes(id));
  out.eventSawRemove = evs.some((e) => (e.removed || []).includes(id));
  S.events.off?.('buildings:changed', off);

  // --- determinism: same lot, same seed => same plan
  const l2 = { id: 90002, x: -420, z: -260, w: 24, d: 26, heading: 0, type: 'residential', density: 'low', level: 3 };
  const a1 = B.spawn(l2); const p1 = JSON.stringify(B.items.get(a1).plan);
  B.demolish(a1); l2.buildingId = undefined;
  const a2 = B.spawn(l2); const p2 = JSON.stringify(B.items.get(a2).plan);
  out.deterministicSamePlan = p1 === p2;
  B.demolish(a2);
  api.flush();

  // --- night windows
  const mat = api.material();
  out.hasEmissiveMap = !!mat.emissiveMap;
  out.hasWinAttr = (() => {
    let found = false;
    S.world && window.__sim.registry;
    return found;
  })();
  const uNightDay = api.stats();
  out.stats = api.stats();
  out.drawCallsNow = S.stats().drawCalls;
  out.budget = S.registry.modules.get('buildings').module?.budget ?? null;
  return out;
});

// --- night check: switch to 22h, re-measure emissive uniform effect via pixel brightness
const night = await page.evaluate(async () => {
  const S = window.__sim;
  S.setTime(22);
  await new Promise((r) => setTimeout(r, 1200));
  const api = S.registry.modules.get('buildings').api;
  const m = api.material();
  return { uNight: m.userData, emissiveMapPresent: !!m.emissiveMap };
});

console.log(JSON.stringify({ res, night, errors }, null, 2));
await browser.close();
