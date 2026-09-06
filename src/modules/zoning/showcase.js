// Showcase staging for zoning (zoning.md §8): an avenue spine, a nine-street N-S grid, four E-W
// streets of which the northern one *is* the waterfront run (it follows terrain.features.river where
// the river pushes south and is straight where it does not), a diagonal, a curved street, two alleys,
// a cul-de-sac, a hillside street climbing past 0.42 rad, a highway with no frontage, and a
// 160 x 160 m super-block whose core is out of every road's reach so unzonable bare ground is on
// screen next to the empty zonable band.

export const XS = [-320, -240, -160, -80, 0, 80, 160, 240, 320];
export const ZS = [null, -80, 0, 80, 160];      // ZS[0] is the (curved) north boundary road

const R = 'residential', C = 'commercial', I = 'industrial', O = 'office';
const HALF = 'half';
// rows 0..3 (north to south) x columns 0..7. `undefined` = part of the super-block, null = left
// unpainted so the empty zonable band is visible (item 18).
//
// The eight (type x density) classes each have a block touching the middle of the grid, so
// `probePoints()` can return eight class-representative points that are all inside the `zones`
// camera's frame at once — items 1-3 measure at those pixels and a point off the edge of the frame
// would silently measure the clamped border instead.
const LAYOUT = [
  [[R, 'low'], [R, 'low'], undefined, undefined, [I, 'high'], [I, 'low'], [O, 'high'], [C, 'low']],
  [[R, 'low'], [C, 'low'], undefined, undefined, [C, 'high'], [R, 'high'], [O, 'low'], [I, 'low']],
  [[R, 'high'], [I, 'high'], [C, 'low'], [R, 'low'], [O, 'low'], [I, 'low'], [C, 'high'], [O, 'high']],
  [[R, 'high'], null, HALF, null, [C, 'high'], [O, 'low'], [I, 'high'], [R, 'low']],
];
const SUPER = [O, 'high'];

export const CAMERAS = {
  zones: { yaw: 0.62, pitch: 0.74, distance: 300, target: [0, 0, 0] },
  zonesclose: { yaw: 0.95, pitch: 0.44, distance: 140, target: [-80, 0, -50] },
  zoneswide: { yaw: 0.45, pitch: 1.05, distance: 660, target: [0, 0, 10] },
  zoneslope: { yaw: 1.60, pitch: 0.52, distance: 180, target: [241, 0, -121] },   // where the hillside street meets the waterfront run
};

/** Where the buildable land starts on the north side: the river bank, or the plain z = -160. */
function northZ(T, x) {
  const riv = T?.features?.river;
  if (!riv) return -160;
  const z = riv.zAt(x) + riv.halfWidthAt(x) + 30;
  return Math.max(-160, Math.min(-96, z));
}

export function stageRoads(ctx) {
  const RD = ctx.world.roads;
  const T = ctx.world.terrain;
  const info = { nodes: {}, junctions: [], hillside: null, waterfront: [], highway: [], bare: [-80, -80] };
  const cache = new Map();
  const node = (x, z) => {
    const k = Math.round(x) + ',' + Math.round(z);
    let id = cache.get(k);
    if (id === undefined) { id = RD.addNode(x, z); cache.set(k, id); }
    return id;
  };
  const edge = (a, b, type = 'street', opts) => RD.addEdge(a, b, type, opts);
  const chain = (pts, type, opts) => {
    const ids = pts.map(([x, z]) => node(x, z));
    for (let i = 1; i < ids.length; i++) edge(ids[i - 1], ids[i], type, opts);
    return ids;
  };

  // Alleys and the cul-de-sac have to start on a real junction node: `roads` treats an edge whose
  // end node carries no other edge as a dead end, and two dead ends make the whole stub read as an
  // isolated deck. So the roads they hang off get an extra node at the alley's x.
  const ALLEY_X = -200, ALLEY2_X = 120, CULDESAC_X = 40;

  // --- 1. the avenue spine along z = 0
  chain([[-360, 0], ...[...XS, CULDESAC_X].sort((a, b) => a - b).map((x) => [x, 0]), [360, 0]], 'avenue');

  // --- 5. the north boundary / waterfront run: straight at z = -160, bending south around the river
  // 80 m spans so the run carries proper lot rows instead of a chain of stubs
  const wf = [...XS, ALLEY_X].sort((a, b) => a - b).map((x) => [x, northZ(T, x)]);
  for (let i = 1; i < wf.length - 1; i++) wf[i][1] = wf[i][1] * 0.6 + (wf[i - 1][1] + wf[i + 1][1]) * 0.2;
  chain(wf, 'street');
  info.waterfront = wf.map(([x, z]) => [x, +z.toFixed(1)]);
  const northAt = (x) => {
    let best = wf[0];
    for (const p of wf) if (Math.abs(p[0] - x) < Math.abs(best[0] - x)) best = p;
    return best[1];
  };

  // --- 2. the N-S grid, from the north road down to z = 160. The x = -80 street stops at the avenue,
  //        which merges four blocks into one 160 m super-block with an unreachable core.
  for (const x of XS) {
    const pts = [];
    if (!(x === -80)) pts.push([x, northAt(x)]);
    for (const z of [-80, 0, 80, 160]) {
      if (x === -80 && z < 0) continue;
      pts.push([x, z]);
    }
    chain(pts, 'street');
  }
  // --- 2b. the E-W streets. z = -80 is missing between x = -160 and 0 (the super-block).
  for (const z of [-80, 80, 160]) {
    const extra = z === -80 ? [ALLEY_X] : [ALLEY2_X];
    const xs = [...XS, ...extra].sort((a, b) => a - b);
    if (z === -80) {
      chain(xs.filter((x) => x <= -160).map((x) => [x, z]), 'street');
      chain(xs.filter((x) => x >= 0).map((x) => [x, z]), 'street');
    } else chain(xs.map((x) => [x, z]), 'street');
  }

  // --- 3. a diagonal cutting one block, and a curved street off the east side
  edge(node(-160, 80), node(-80, 0), 'street');
  edge(node(320, -80), node(408, 24), 'street', { ctrl: { x: 410, z: -62 } });

  // --- 4. two alleys splitting deep blocks, and a cul-de-sac stub ending mid-block
  chain([[ALLEY_X, northAt(ALLEY_X)], [ALLEY_X, -80]], 'alley');
  chain([[ALLEY2_X, 80], [ALLEY2_X, 160]], 'alley');
  chain([[CULDESAC_X, 0], [CULDESAC_X, 46]], 'alley');

  // --- 6. the hillside street: walk the slope field for ground steeper than 0.42 rad, then climb it
  //        from the waterfront run so the two meet at a node (the zoneslope camera looks at it).
  let best = null;
  for (let x = 176; x <= 320; x += 8) for (let z = -150; z <= 40; z += 8) {
    if (T.isWater(x, z)) continue;
    const s = T.getSlope(x, z);
    if (s <= 0.42) continue;
    const d = Math.hypot(x - 230, z + 150);
    if (!best || s - d * 0.0008 > best.s - best.d * 0.0008) best = { x, z, s, d };
  }
  if (best) {
    const sx = Math.max(-300, Math.min(300, best.x + (best.x > 170 ? -46 : 46)));
    const sz = northAt(sx);
    const ex = best.x + (best.x - sx) * 0.55, ez = best.z + (best.z - sz) * 0.45;
    chain([[sx, sz], [best.x, best.z], [ex, ez]], 'street');
    info.hillside = { start: [sx, +sz.toFixed(1)], peak: [best.x, best.z, +best.s.toFixed(3)], end: [+ex.toFixed(1), +ez.toFixed(1)] };
    info.slopeTarget = [Math.round((sx + best.x) / 2), Math.round((sz + best.z) / 2)];
  }

  // --- 7. one highway across the north of the district: proves item 14 (no lots, no zonable cells)
  // north of the waterfront run's band, so the highway corridor does not eat the river frontage
  const hw = [[-470, -220], [-300, -216], [-140, -210]];
  chain(hw, 'highway');
  info.highway = hw;

  // junction nodes where two zoned frontages meet (item 12): the interior grid intersections
  for (const [k, id] of cache) {
    const [x, z] = k.split(',').map(Number);
    const n = RD.nodes.get(id);
    if (n && n.edges && n.edges.size >= 3 && Math.abs(x) <= 320 && z >= -170 && z <= 160) info.junctions.push({ id, x, z });
  }
  info.junctions.sort((a, b) => a.id - b.id);
  return info;
}

/** Block rectangle (x0,z0,x1,z1) for layout cell (row, col), inset off the roads. */
function blockRect(ctx, row, col) {
  const T = ctx.world.terrain;
  const x0 = XS[col], x1 = XS[col + 1];
  const z0 = row === 0 ? Math.max(northZ(T, x0), northZ(T, x1)) : ZS[row];
  const z1 = ZS[row + 1];
  return [x0 + 3, z0 + 3, x1 - 3, z1 - 3];
}

export function paintZones(ctx, grid) {
  const T = ctx.world.terrain;
  const blocks = [], empties = [];
  grid.bulk(({ rect }) => {
    for (let r = 0; r < LAYOUT.length; r++) {
      for (let c = 0; c < LAYOUT[r].length; c++) {
        const kind = LAYOUT[r][c];
        if (kind === undefined) continue;
        const [x0, z0, x1, z1] = blockRect(ctx, r, c);
        const cx = (x0 + x1) * 0.5, cz = (z0 + z1) * 0.5;
        if (kind === null) { empties.push([Math.round(cx), Math.round(cz)]); continue; }
        if (kind === HALF) {
          const xm = Math.round((x0 + x1) * 0.5);
          rect(x0, z0, xm - 1, z1, R, 'low');
          rect(xm + 1, z0, x1, z1, C, 'high');
          blocks.push({ x: Math.round((x0 + xm) / 2), z: Math.round(cz), type: R, density: 'low' });
          blocks.push({ x: Math.round((xm + x1) / 2), z: Math.round(cz), type: C, density: 'high' });
          continue;
        }
        rect(x0, z0, x1, z1, kind[0], kind[1]);
        blocks.push({ x: Math.round(cx), z: Math.round(cz), type: kind[0], density: kind[1] });
      }
    }
    // Outer skirts: the river frontage north of the waterfront run (whose boundary the water cuts
    // ragged, item 13) and a suburban strip south of z = 160. Both are painted three cells deep, so
    // the fourth band row stays as unpainted buildable land all the way round the district (item 18).
    const skirtN = [[C, 'low'], [R, 'low'], [R, 'low'], [C, 'low'], [C, 'low'], [O, 'low'], [O, 'low'], [I, 'low']];
    const skirtS = [[R, 'low'], [R, 'low'], [R, 'high'], [R, 'high'], [C, 'low'], [R, 'low'], [R, 'low'], [I, 'low']];
    for (let c = 0; c < XS.length - 1; c++) {
      const zr = Math.min(northZ(T, XS[c]), northZ(T, XS[c + 1])) - 3;
      // columns overlap by half a cell so the river frontage is one connected strip rather than
      // eight islands: item 13 counts direction changes along its boundary, and a boundary broken
      // every 80 m by a painting gap cannot follow the bank
      rect(XS[c] - 5, zr - 44, XS[c + 1] + 5, zr, skirtN[c][0], skirtN[c][1]);
      blocks.push({ x: Math.round((XS[c] + XS[c + 1]) / 2), z: Math.round(zr - 14), type: skirtN[c][0], density: skirtN[c][1] });
      rect(XS[c] - 5, 163, XS[c + 1] + 5, 189, skirtS[c][0], skirtS[c][1]);
      blocks.push({ x: Math.round((XS[c] + XS[c + 1]) / 2), z: 176, type: skirtS[c][0], density: skirtS[c][1] });
    }
    // the super-block (x -160..0, z north..0); its unreachable core is the bare-ground landmark
    const zN = Math.max(northZ(T, -160), northZ(T, 0));
    rect(-157, zN + 3, -3, -3, SUPER[0], SUPER[1]);
    blocks.push({ x: -130, z: Math.round((zN - 0) / 2), type: SUPER[0], density: SUPER[1] });
    // west and east skirts, again three cells deep
    const zW = northZ(T, -320) + 3, zE = northZ(T, 320) + 3;
    rect(-349, zW, -329, 157, R, 'low');
    rect(329, zE, 349, 157, O, 'low');
    blocks.push({ x: -340, z: 60, type: R, density: 'low' }, { x: 340, z: 60, type: O, density: 'low' });
    // the curved street on the east side gets zoned too
    rect(324, -110, 430, 40, O, 'low');
    blocks.push({ x: 370, z: -40, type: O, density: 'low' });
  }, ({ erase, cells, claimed, valid }) => {
    // Take back the deep cells no lot could use: an 80 m block then reads as frontage bands with a
    // back-garden core (failure mode 11) instead of a solid rectangle, and the zoned area is land
    // that can actually be built on. Cells that touch ground the terrain rules rejected -- the river
    // bank and the hillside -- are kept whatever their depth: that is the boundary item 13 measures
    // the raggedness of, and trimming it would straighten exactly the edge meant to follow the
    // contour.
    const doomed = new Map();
    for (const [k, c] of cells) {
      if (c.depth < 3 || claimed.has(k)) continue;
      const ix = Math.floor((c.x + 1024) / 8), iz = Math.floor((c.z + 1024) / 8);
      let onTerrainEdge = false;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        if (valid.get((ix + dx) + ',' + (iz + dz)) === false) { onTerrainEdge = true; break; }
      }
      if (!onTerrainEdge) doomed.set(k, [c, ix, iz]);
    }
    // Only take back cells that are part of a contiguous core. A lone unclaimed cell between two lots
    // is a gap in the paint, not a garden, and punching it out is failure mode 7's amoeba hole.
    for (const [k, [c, ix, iz]] of doomed) {
      let n = 0;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (doomed.has((ix + dx) + ',' + (iz + dz))) n++;
      if (n >= 1 || c.depth >= 4) erase(c.x, c.z, 1);
    }
  });
  return { blocks, empties, bare: [-80, Math.round((Math.max(northZ(T, -160), northZ(T, 0)) - 0) / 2)] };
}

export { LAYOUT, SUPER, northZ };
