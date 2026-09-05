// Showcase staging: a street grid with a high-rise core, a mid-rise ring, suburbs and an industrial
// park, so every zone type × density × level appears in one continuous city.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export const CAMERAS = {
  downtown: { yaw: 0.72, pitch: 0.32, distance: 330, target: [30, 30, 40] },
  night_downtown: { yaw: 1.15, pitch: 0.2, distance: 200, target: [30, 22, 30] },
  suburb: { yaw: 0.55, pitch: 0.34, distance: 200, target: [-100, 4, 320] },
  industry: { yaw: 2.4, pitch: 0.3, distance: 220, target: [330, 6, 60] },
  block: { yaw: 0.95, pitch: 0.24, distance: 90, target: [-120, 5, 300] },
  catalog: { yaw: 0.3, pitch: 0.75, distance: 620, target: [40, 0, 40] },
};

const XS = [-300, -210, -120, -30, 60, 150, 240, 350, 450];
const ZS = [-200, -110, -20, 70, 160, 255, 350, 445];

// (type, density, lot width, lot depth) per zoning class
const SPEC = {
  'office/high': { w: 40, d: 34 },
  'office/low': { w: 30, d: 28 },
  'commercial/high': { w: 30, d: 28 },
  'commercial/low': { w: 26, d: 25 },
  'residential/high': { w: 32, d: 29 },
  'residential/low': { w: 17.5, d: 26 },
  'industrial/high': { w: 46, d: 38 },
  'industrial/low': { w: 34, d: 32 },
};

/** what a block at (bx, bz) centre becomes */
function zoneFor(cx, cz, rng) {
  const r = Math.hypot(cx * 1.0, (cz - 20) * 1.05);
  if (cx > 285 && cz < 260) return rng.bool(0.45) ? ['industrial', 'high'] : ['industrial', 'low'];
  if (r < 130) return rng.bool(0.8) ? ['office', 'high'] : ['commercial', 'high'];
  if (r < 230) {
    return rng.weighted([[['office', 'high'], 4], [['commercial', 'high'], 4], [['residential', 'high'], 3], [['office', 'low'], 1]]);
  }
  if (r < 330) {
    return rng.weighted([[['residential', 'high'], 4], [['commercial', 'high'], 1], [['commercial', 'low'], 2], [['office', 'low'], 2], [['residential', 'low'], 2]]);
  }
  return rng.weighted([[['residential', 'low'], 7], [['commercial', 'low'], 1.5], [['residential', 'high'], 1.5]]);
}

function baseLevel(cx, cz) {
  const r = Math.hypot(cx, (cz - 20) * 1.05);
  if (r < 130) return 5;
  if (r < 230) return 4;
  if (r < 330) return 3;
  return 2;
}

export function stage(ctx) {
  const { world, log } = ctx;
  const R = world.roads, T = world.terrain;
  const rng = ctx.rng.fork('showcase');

  // ---------------------------------------------------------------- roads
  const node = (x, z) => R.addNode(x, z);
  for (let i = 0; i < XS.length; i++) {
    const type = (i === 3) ? 'avenue' : 'street';
    let prev = node(XS[i], ZS[0]);
    for (let j = 1; j < ZS.length; j++) { const n = node(XS[i], ZS[j]); R.addEdge(prev, n, type); prev = n; }
  }
  for (let j = 0; j < ZS.length; j++) {
    const type = (j === 2) ? 'avenue' : 'street';
    let prev = node(XS[0], ZS[j]);
    for (let i = 1; i < XS.length; i++) { const n = node(XS[i], ZS[j]); R.addEdge(prev, n, type); prev = n; }
  }
  // alleys splitting the two biggest suburban blocks so the houses get a back lane
  try { ctx.modules.roads?.rebuild?.(); } catch (e) { log.warn('roads rebuild failed', e); }

  // ---------------------------------------------------------------- lots
  const lots = [];
  let lotId = 1;
  const INSET = 9.6;
  for (let i = 0; i < XS.length - 1; i++) {
    for (let j = 0; j < ZS.length - 1; j++) {
      const x0 = XS[i], x1 = XS[i + 1], z0 = ZS[j], z1 = ZS[j + 1];
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      const [type, dens] = zoneFor(cx, cz, rng);
      const spec = SPEC[`${type}/${dens}`];
      const bl = baseLevel(cx, cz);
      const bx0 = x0 + INSET, bx1 = x1 - INSET, bz0 = z0 + INSET, bz1 = z1 - INSET;
      const iw = bx1 - bx0, id = bz1 - bz0;
      if (iw < 14 || id < 14) continue;
      const depth = Math.min(spec.d, id / 2 - 0.5, iw / 2 - 0.5);
      const rows = [
        { along: 'x', a0: bx0, a1: bx1, c: bz0 + depth / 2, heading: 0 },
        { along: 'x', a0: bx0, a1: bx1, c: bz1 - depth / 2, heading: Math.PI },
      ];
      if (id - depth * 2 > 18) {
        rows.push({ along: 'z', a0: bz0 + depth, a1: bz1 - depth, c: bx0 + depth / 2, heading: -Math.PI / 2 });
        rows.push({ along: 'z', a0: bz0 + depth, a1: bz1 - depth, c: bx1 - depth / 2, heading: Math.PI / 2 });
      }
      for (const row of rows) {
        const len = row.a1 - row.a0;
        const n = Math.max(1, Math.floor(len / spec.w));
        const lw = len / n;
        for (let k = 0; k < n; k++) {
          const a = row.a0 + lw * (k + 0.5);
          const x = row.along === 'x' ? a : row.c;
          const z = row.along === 'x' ? row.c : a;
          if (T.isWater(x, z)) continue;
          // reject steep or broken ground
          const h0 = T.getHeight(x, z);
          let bad = false, mn = h0, mx = h0;
          for (const [dx, dz] of [[-lw / 2, -depth / 2], [lw / 2, -depth / 2], [-lw / 2, depth / 2], [lw / 2, depth / 2]]) {
            const hh = T.getHeight(x + dx, z + dz);
            if (T.isWater(x + dx, z + dz)) bad = true;
            mn = Math.min(mn, hh); mx = Math.max(mx, hh);
          }
          if (bad || mx - mn > 5.5) continue;
          const level = clamp(Math.round(bl + rng.range(-1.1, 0.9)), 1, 5);
          lots.push({
            id: lotId++, x, z, w: lw - 0.4, d: depth - 0.4, heading: row.heading,
            type, density: dens, level,
          });
        }
      }
    }
  }

  // guarantee that every zone type × density × level is present somewhere in the shot
  const seen = new Set(lots.map((l) => `${l.type}/${l.density}/${l.level}`));
  for (const key of Object.keys(SPEC)) {
    for (let lv = 1; lv <= 5; lv++) {
      if (seen.has(`${key}/${lv}`)) continue;
      const [type, dens] = key.split('/');
      const cand = lots.find((l) => l.type === type && l.density === dens && !l._forced);
      if (cand) { cand.level = lv; cand._forced = true; seen.add(`${key}/${lv}`); }
    }
  }

  const api = ctx.modules.buildings;
  let made = 0;
  for (const lot of lots) if (world.buildings.spawn(lot) >= 0) made++;
  ctx.modules.buildings?.flush?.();

  const counts = {};
  for (const b of world.buildings.items.values()) {
    const k = `${b.type}/${b.density}`;
    counts[k] = (counts[k] || 0) + 1;
  }
  log.info(`staged ${made} buildings on ${lots.length} lots — ${Object.entries(counts).map(([k, v]) => `${k}:${v}`).join(' ')}`);

  for (const [k, v] of Object.entries(CAMERAS)) ctx.camera.registerPreset(k, v);
  return lots;
}
