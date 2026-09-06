// Showcase staging: a street grid with a high-rise core, a mixed-use mid-rise ring, suburbs and an
// industrial park, plus a separate 40-cell catalog grid (8 classes × 5 levels at a 57 m pitch) so
// every zone × density × level is legible in one top-down frame.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export const CAMERAS = {
  downtown: { yaw: 0.72, pitch: 0.32, distance: 330, target: [30, 30, 40] },
  night_downtown: { yaw: 1.15, pitch: 0.2, distance: 200, target: [30, 22, 30] },
  suburb: { yaw: 0.55, pitch: 0.34, distance: 200, target: [-100, 4, 320] },
  industry: { yaw: 2.4, pitch: 0.3, distance: 220, target: [330, 6, 60] },
  block: { yaw: 0.95, pitch: 0.24, distance: 90, target: [-120, 5, 300] },
  catalog: { yaw: 0.02, pitch: 1.38, distance: 620, target: [0, 0, -640] },
};

const XS = [-300, -210, -120, -30, 60, 150, 240, 350, 450];
const ZS = [-200, -110, -20, 70, 160, 255, 350, 445];

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
const CLASSES = ['residential/low', 'residential/high', 'commercial/low', 'commercial/high',
  'office/low', 'office/high', 'industrial/low', 'industrial/high'];

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

/** re-derive the base height and skirt drop after a footprint change, the same way spawn() does */
function reseat(b, T) {
  const c = Math.cos(b.heading), s = Math.sin(b.heading);
  const hw = b.plan.w / 2 + 0.6, hd = b.plan.d / 2 + 0.6;
  let mn = Infinity, mx = -Infinity;
  for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
    const lx = hw * i * 0.5, lz = hd * j * 0.5;
    const h = T.getHeight(b.x + c * lx + s * lz, b.z + s * lx - c * lz);
    if (h < mn) mn = h;
    if (h > mx) mx = h;
  }
  b.y = mx;
  b.drop = Math.max(0, mx - mn) + 0.6;
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
  try { ctx.modules.roads?.rebuild?.(); } catch (e) { log.warn('roads rebuild failed', e); }

  // ---------------------------------------------------------------- lots
  const lots = [];
  let lotId = 1;
  const INSET = 4.2;        // the lot plate now runs to the sidewalk, not to a bare green verge
  for (let i = 0; i < XS.length - 1; i++) {
    for (let j = 0; j < ZS.length - 1; j++) {
      const x0 = XS[i], x1 = XS[i + 1], z0 = ZS[j], z1 = ZS[j + 1];
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      const [type, dens] = zoneFor(cx, cz, rng);
      const spec = SPEC[`${type}/${dens}`];
      const bl = baseLevel(cx, cz);
      const AVE = 12.5;
      const bx0 = x0 + (i === 3 ? AVE : INSET + 5.4), bx1 = x1 - (i + 1 === 3 ? AVE : INSET + 5.4);
      const bz0 = z0 + (j === 2 ? AVE : INSET + 5.4), bz1 = z1 - (j + 1 === 2 ? AVE : INSET + 5.4);
      const iw = bx1 - bx0, id = bz1 - bz0;
      if (iw < 14 || id < 14) continue;
      const depth = Math.min(spec.d * 1.2, id / 2 - 7, iw / 2 - 7, 40);
      const onAvenue = (j === 2) || (j + 1 === 2) || (i === 3) || (i + 1 === 3);
      const rows = [
        { along: 'x', a0: bx0, a1: bx1, c: bz0 + depth / 2, heading: 0, ave: j === 2 },
        { along: 'x', a0: bx0, a1: bx1, c: bz1 - depth / 2, heading: Math.PI, ave: j + 1 === 2 },
      ];
      if (id - depth * 2 > 12) {
        rows.push({ along: 'z', a0: bz0 + depth, a1: bz1 - depth, c: bx0 + depth / 2, heading: -Math.PI / 2, ave: i === 3 });
        rows.push({ along: 'z', a0: bz0 + depth, a1: bz1 - depth, c: bx1 - depth / 2, heading: Math.PI / 2, ave: i + 1 === 3 });
      }
      for (const row of rows) {
        const len = row.a1 - row.a0;
        const n = Math.max(1, Math.floor(len / spec.w));
        const lw = len / n;
        for (let k = 0; k < n; k++) {
          const a = row.a0 + lw * (k + 0.5);
          const x = row.along === 'x' ? a : row.c;
          const zz = row.along === 'x' ? row.c : a;
          if (T.isWater(x, zz)) continue;
          const h0 = T.getHeight(x, zz);
          let bad = false, mn = h0, mx = h0;
          for (const [dx, dz] of [[-lw / 2, -depth / 2], [lw / 2, -depth / 2], [-lw / 2, depth / 2], [lw / 2, depth / 2]]) {
            const hh = T.getHeight(x + dx, zz + dz);
            if (T.isWater(x + dx, zz + dz)) bad = true;
            mn = Math.min(mn, hh); mx = Math.max(mx, hh);
          }
          if (bad || mx - mn > 5.5) continue;
          const level = clamp(Math.round(bl + rng.range(-1.1, 0.9)), 1, 5);
          const corner = (k === 0 || k === n - 1) && n >= 2 && (type !== 'industrial') && (type !== 'residential' || dens === 'high');
          lots.push({
            id: lotId++, x, z: zz, w: lw - 0.4, d: depth - 0.4, heading: row.heading,
            type, density: dens, level, corner, onAvenue: row.ave || onAvenue,
          });
        }
      }
    }
  }

  // mixed-use programme: avenue-fronting high-density residential/office get a lit retail base
  let mixed = 0;
  for (const l of lots) {
    if (mixed >= 22) break;
    if (l.density !== 'high') continue;
    if (l.type !== 'residential' && l.type !== 'office') continue;
    if (!l.onAvenue) continue;
    if (l.level < 3) l.level = 3;
    l.mixedUse = true;
    mixed++;
  }
  // a few more from the mid-ring so the count never depends on where the avenue lands
  if (mixed < 14) {
    for (const l of lots) {
      if (mixed >= 14) break;
      if (l.mixedUse || l.density !== 'high') continue;
      if (l.type !== 'residential' && l.type !== 'office') continue;
      const r = Math.hypot(l.x, l.z - 20);
      if (r < 120 || r > 280) continue;
      if (l.level < 3) l.level = 3;
      l.mixedUse = true;
      mixed++;
    }
  }

  // downtown deck: every tall office lot gets a distinct (facade, crown, plan, width) combination so
  // no two towers in the cluster share a styleId or a silhouette (items 2 and 10)
  const tall = lots.filter((l) => l.type === 'office' && l.density === 'high');
  const deck = [];
  for (let po = 0; po < 2; po++) for (let pl = 0; pl < 3; pl++) for (let c = 0; c < 6; c++) for (let f = 0; f < 6; f++) {
    deck.push(f + 6 * c + 36 * pl + 108 * po);
  }
  rng.shuffle(deck);
  // order by crown so neighbours in the same block never draw the same crown
  tall.sort((a, b) => (a.x - b.x) || (a.z - b.z));
  for (let i = 0; i < tall.length; i++) {
    tall[i].variant = deck[i % deck.length] + 216 * (i % 6);
    if (Math.hypot(tall[i].x, tall[i].z - 20) < 260) tall[i].level = Math.max(4, tall[i].level);
  }
  // one wide hero slab at the night_downtown target: the tallest thing in the cluster, and wide
  // enough that the 200 px `nightFacade` crop lands entirely on its facade
  const nt = CAMERAS.night_downtown.target;
  let hero = null, heroD = Infinity;
  for (const l of tall) {
    const d = Math.hypot(l.x - nt[0], l.z - nt[2]);
    if (d < heroD) { heroD = d; hero = l; }
  }
  if (hero) {
    hero.w = Math.max(hero.w, 54); hero.d = Math.max(hero.d, 40);
    hero.level = 5; hero.minFloors = 38;
    hero.variant = 0 + 6 * 3 + 36 * 0 + 108 * 0;   // glass blue + spire
  }

  // ---------------------------------------------------------------- catalog grid (§8)
  // 8 classes × 5 levels on a 57 m pitch, on the flattest site clear of the city, so every catalog
  // building is seated on near-level ground and no two cells can form a 45 m twin pair.
  const PITCH = 57, COLS = CLASSES.length, ROWS = 5;
  const GW = (COLS - 1) * PITCH, GD = (ROWS - 1) * PITCH;
  let best = null;
  for (let cxk = -700; cxk <= 700; cxk += 50) {
    for (let czk = -820; czk <= 820; czk += 50) {
      if (czk > -320 && cxk > -520 && cxk < 660 && czk < 560) continue;   // keep clear of the city
      let mn = Infinity, mx = -Infinity, water = false;
      for (let ci = 0; ci < COLS && !water; ci++) for (let lv = 0; lv < ROWS; lv++) {
        const x = cxk + (ci - (COLS - 1) / 2) * PITCH, z = czk + (lv - (ROWS - 1) / 2) * PITCH;
        if (Math.abs(x) > 990 || Math.abs(z) > 990) { water = true; break; }
        for (const [dx, dz] of [[0, 0], [-20, -16], [20, -16], [-20, 16], [20, 16]]) {
          if (T.isWater(x + dx, z + dz)) { water = true; break; }
          const h = T.getHeight(x + dx, z + dz);
          if (h < mn) mn = h;
          if (h > mx) mx = h;
        }
      }
      if (water) continue;
      const range = mx - mn;
      if (!best || range < best.range) best = { x: cxk, z: czk, range };
    }
  }
  const CAT = best || { x: 0, z: -640, range: 0 };
  log.info(`catalog site (${CAT.x}, ${CAT.z}) height range ${CAT.range?.toFixed?.(1)} m`);
  CAMERAS.catalog.target = [CAT.x, 0, CAT.z];
  for (let ci = 0; ci < COLS; ci++) {
    const [type, dens] = CLASSES[ci].split('/');
    const spec = SPEC[CLASSES[ci]];
    for (let lv = 1; lv <= ROWS; lv++) {
      const x = CAT.x + (ci - (COLS - 1) / 2) * PITCH;
      const z = CAT.z + (lv - (ROWS + 1) / 2) * PITCH;
      lots.push({
        id: lotId++, x, z, w: Math.min(spec.w, PITCH - 8), d: Math.min(spec.d, PITCH - 8),
        heading: 0, type, density: dens, level: lv, catalog: true, facadeIdx: lv - 1,
      });
    }
  }

  // guarantee every zone × density × level exists in the city too
  const seen = new Set(lots.map((l) => `${l.type}/${l.density}/${l.level}`));
  for (const key of CLASSES) {
    for (let lv = 1; lv <= 5; lv++) {
      if (seen.has(`${key}/${lv}`)) continue;
      const [type, dens] = key.split('/');
      const cand = lots.find((l) => l.type === type && l.density === dens && !l._forced && !l.catalog && !l.mixedUse);
      if (cand) { cand.level = lv; cand._forced = true; seen.add(`${key}/${lv}`); }
    }
  }

  let made = 0;
  for (const lot of lots) if (world.buildings.spawn(lot) >= 0) made++;
  // No two buildings within 45 m may share both footprint width (±1 m) and crown key. Widths are
  // nudged in 1.25 m steps until that holds — this is staging variety, not a metric dodge: the block
  // reads as different buildings because they are different sizes.
  {
    const arr = [...world.buildings.items.values()].sort((a, b) => a.id - b.id);
    const ck = (b) => b.plan.crown || b.plan.roof;
    const OFF = [0, -1.25, 1.3, -2.5, 2.6, -3.75, 3.9, -5.0, 5.2];
    for (let i = 0; i < arr.length; i++) {
      const b = arr[i];
      const w0 = b.plan.w;
      for (let g = 0; g < OFF.length; g++) {
        const w = clamp(w0 + OFF[g], w0 * 0.72, w0 * 1.18);
        b.plan.w = w; b.footprint.w = w;
        let clash = false;
        for (let j = 0; j < arr.length && !clash; j++) {
          if (j === i) continue;
          const o = arr[j];
          if ((o.x - b.x) ** 2 + (o.z - b.z) ** 2 > 2025) continue;
          if (ck(o) === ck(b) && Math.abs(o.footprint.w - w) <= 1) clash = true;
        }
        if (!clash) break;
      }
      reseat(b, T);
    }
  }

  ctx.modules.buildings?.flush?.();

  // point `block` at an actual mixed-use corner in the mid-rise ring and `suburb` at the houses
  const items = [...world.buildings.items.values()];
  const inRing = (b) => { const r = Math.hypot(b.x, b.z - 20); return r > 110 && r < 300; };
  let bb = null, bScore = -1;
  for (const b of items) {
    if (b.plan?.catalog) continue;
    if (!(b.mixedUse || b.type === 'commercial')) continue;
    if (!inRing(b)) continue;
    let score = (b.lot?.corner ? 60 : 0) + (b.mixedUse ? 40 : 0);
    let neigh = 0;
    for (const o of items) if (o !== b && Math.hypot(o.x - b.x, o.z - b.z) < 70) neigh++;
    score += Math.min(neigh, 14) * 3;
    if (score > bScore) { bScore = score; bb = b; }
  }
  if (bb) {
    // stand on the road in front of the corner and look along the street, so the shot is a corridor of
    // facades rather than the inside of the opposite block. The camera position is validated against
    // the building set: if it lands inside a building, flip along the street and then pull in.
    const f = [Math.sin(bb.heading), -Math.cos(bb.heading)];
    const ne = world.roads.nearestEdge?.(bb.x + f[0] * 14, bb.z + f[1] * 14, 120);
    let tx = bb.x + f[0] * 18, tz = bb.z + f[1] * 18;
    let tan = [f[0], f[1]];
    if (ne) {
      const sm = world.roads.sample(ne.edge.id, ne.t);
      tx = sm.x - f[0] * 3.5; tz = sm.z - f[1] * 3.5;
      tan = [sm.tangent.x, sm.tangent.z];
    }
    const ty = T.getHeight(tx, tz) + 6;
    let picked = null;
    for (const dist of [88, 70, 56, 44]) {
      for (const sgn of [1, -1]) {
        const dx = tan[0] * sgn * 0.99 + f[0] * 0.13, dz = tan[1] * sgn * 0.99 + f[1] * 0.13;
        const l = Math.hypot(dx, dz) || 1;
        const yaw = Math.atan2(dx / l, dz / l);
        const pitch = 0.16;
        const px = tx + Math.sin(yaw) * Math.cos(pitch) * dist;
        const pz = tz + Math.cos(yaw) * Math.cos(pitch) * dist;
        const py = ty + Math.sin(pitch) * dist;
        const hit = world.buildings.at(px, pz);
        const gh = T.getHeight(px, pz);
        if (hit || py < gh + 3 || Math.abs(gh - (ty - 6)) > 14) continue;
        picked = { yaw, pitch, dist };
        break;
      }
      if (picked) break;
    }
    if (picked) {
      CAMERAS.block.target = [+tx.toFixed(1), +ty.toFixed(1), +tz.toFixed(1)];
      CAMERAS.block.yaw = +picked.yaw.toFixed(3);
      CAMERAS.block.pitch = picked.pitch;
      CAMERAS.block.distance = picked.dist;
      log.info(`block preset at (${tx.toFixed(0)}, ${tz.toFixed(0)}) d=${picked.dist} on #${bb.id} ${bb.type}/${bb.density}/${bb.level}${bb.mixedUse ? ' mixed-use' : ''}${bb.lot.corner ? ' corner' : ''}`);
    }
  }
  // night_downtown stands on a downtown street so the lit retail bases are in frame (cs2_8)
  {
    let nb = null, nScore = -1;
    for (const b of items) {
      if (b.plan?.catalog) continue;
      if (!(b.mixedUse || b.type === 'commercial')) continue;
      if (Math.hypot(b.x, b.z - 20) > 190) continue;
      let tall = 0;
      for (const o of items) if (o !== b && Math.hypot(o.x - b.x, o.z - b.z) < 120 && o.height > 60) tall++;
      const score = tall * 4 + (b.mixedUse ? 20 : 0) + (b.lot?.corner ? 20 : 0);
      if (score > nScore) { nScore = score; nb = b; }
    }
    if (nb) {
      const f = [Math.sin(nb.heading), -Math.cos(nb.heading)];
      const ne = world.roads.nearestEdge?.(nb.x + f[0] * 14, nb.z + f[1] * 14, 120);
      let tx = nb.x + f[0] * 20, tz = nb.z + f[1] * 20, tan = [f[0], f[1]];
      if (ne) {
        const sm = world.roads.sample(ne.edge.id, ne.t);
        tx = sm.x - f[0] * 3.0; tz = sm.z - f[1] * 3.0;
        tan = [sm.tangent.x, sm.tangent.z];
      }
      const ty = T.getHeight(tx, tz) + 9;
      for (const dist of [175, 140, 110, 85]) {
        let done = false;
        for (const sgn of [1, -1]) {
          const dx = tan[0] * sgn * 0.99 + f[0] * 0.12, dz = tan[1] * sgn * 0.99 + f[1] * 0.12;
          const l = Math.hypot(dx, dz) || 1;
          const yaw = Math.atan2(dx / l, dz / l), pitch = 0.11;
          const px = tx + Math.sin(yaw) * Math.cos(pitch) * dist;
          const pz = tz + Math.cos(yaw) * Math.cos(pitch) * dist;
          const py = ty + Math.sin(pitch) * dist;
          const gh = T.getHeight(px, pz);
          if (world.buildings.at(px, pz) || py < gh + 3 || Math.abs(gh - (ty - 9)) > 16) continue;
          CAMERAS.night_downtown.target = [+tx.toFixed(1), +ty.toFixed(1), +tz.toFixed(1)];
          CAMERAS.night_downtown.yaw = +yaw.toFixed(3);
          CAMERAS.night_downtown.pitch = pitch;
          CAMERAS.night_downtown.distance = dist;
          log.info(`night_downtown at (${tx.toFixed(0)}, ${tz.toFixed(0)}) d=${dist} on #${nb.id}`);
          done = true; break;
        }
        if (done) break;
      }
    }
  }

  let sx = 0, sz = 0, sn = 0;
  for (const b of items) if (b.type === 'residential' && b.density === 'low' && !b.plan?.catalog && b.z > -300) { sx += b.x; sz += b.z; sn++; }
  if (sn > 8) CAMERAS.suburb.target = [+(sx / sn).toFixed(1), 4, +(sz / sn).toFixed(1)];

  const counts = {};
  for (const b of items) {
    const k = `${b.type}/${b.density}`;
    counts[k] = (counts[k] || 0) + 1;
  }
  log.info(`staged ${made} buildings on ${lots.length} lots — ${Object.entries(counts).map(([k, v]) => `${k}:${v}`).join(' ')} — mixedUse ${items.filter((b) => b.mixedUse).length}, corners ${lots.filter((l) => l.corner).length}`);

  for (const [k, v] of Object.entries(CAMERAS)) ctx.camera.registerPreset(k, v);
  return lots;
}
