// Showcase staging for the roads module: a street grid with an avenue, alleys, a crossroads with
// crosswalks, a roundabout-ish one-way loop, a curved dual-carriageway highway with an on-ramp, and a
// street bridge across the river to the north. Everything is derived from world.terrain so it follows the seed.

export const CAMERAS = {
  intersection: { position: [84, 26, 92], target: [40, 0.5, 42] },
  highway: { position: [520, 42, 330], target: [330, 12, 225] },
  bridge: { position: [110, 30, -250], target: [40, 3, -330] },
  loop: { position: [-120, 55, 30], target: [-200, 0, -60] },
  coastwest: { position: [-560, 40, 250], target: [-540, 6, 362] },
  merge: { position: [470, 30, 130], target: [345, 12, 222] },
  corner: { position: [70, 23, 74], target: [46, 15.6, 48] },
  kerb: { position: [66, 19, 62], target: [52, 15.6, 52] },
  armtop: { position: [8, 42, 78], target: [8, 15.6, 40] },
};

export function stage(ctx) {
  const R = ctx.world.roads;
  const T = ctx.world.terrain;
  const node = (x, z) => R.addNode(x, z);
  const edge = (a, b, type = 'street', opts) => R.addEdge(a, b, type, opts);
  const chain = (pts, type, opts) => { const ids = pts.map(([x, z]) => node(x, z)); for (let i = 1; i < ids.length; i++) edge(ids[i - 1], ids[i], type, opts); return ids; };

  // ---- grid: verticals and horizontals
  const XS = [-120, -40, 40, 120, 200];
  const ZS = [-110, -40, 100, 160];
  const AVE_Z = 40;
  const aveXs = [-330, -260, -200, -120, -40, 40, 120, 200, 300];
  chain(aveXs.map((x) => [x, AVE_Z]), 'avenue');
  for (const x of XS) chain([[x, -110], [x, -40], [x, AVE_Z], [x, 100], [x, 160]], 'street');
  for (const z of ZS) {
    const xs = z === 100 || z === 160 ? [-120, -80, -40, 40, 120, 160, 200] : [-120, -40, 40, 120, 200];
    chain(xs.map((x) => [x, z]), 'street');
  }
  // alleys through two blocks
  chain([[160, 100], [160, 160]], 'alley');
  chain([[-80, 100], [-80, 160]], 'alley');
  // a gently curved residential street off the east side
  {
    const a = node(200, 160), b = node(300, 230);
    edge(a, b, 'street', { ctrl: { x: 200, z: 235 } });
    const c = node(300, 230), d = node(300, 40);
    edge(c, d, 'street', { ctrl: { x: 320, z: 140 } });
  }

  // ---- roundabout-ish one-way loop west of the grid
  {
    const cx = -200, cz = -40, r = 30;
    const E = node(cx + r, cz), S = node(cx, cz + r), W = node(cx - r, cz), N = node(cx, cz - r);
    edge(E, S, 'street', { oneWay: true, ctrl: { x: cx + r, z: cz + r } });
    edge(S, W, 'street', { oneWay: true, ctrl: { x: cx - r, z: cz + r } });
    edge(W, N, 'street', { oneWay: true, ctrl: { x: cx - r, z: cz - r } });
    edge(N, E, 'street', { oneWay: true, ctrl: { x: cx + r, z: cz - r } });
    edge(S, node(cx, AVE_Z), 'street');
    edge(E, node(-120, cz), 'street');
    edge(N, node(cx, -200), 'street');
    edge(W, node(-310, cz), 'street');
  }

  // ---- highway: sweeping S-curve south of the grid, bending north on the east side
  const H0 = node(-640, 360), H1 = node(-60, 320), H2 = node(400, 210), H3 = node(620, -150);
  edge(H0, H1, 'highway', { ctrl: { x: -360, z: 372 } });
  edge(H1, H2, 'highway', { ctrl: { x: 180, z: 280 } });
  edge(H2, H3, 'highway', { ctrl: { x: 590, z: 150 } });
  // on-ramp from the avenue's east end: loops round and merges tangentially into the westbound carriageway
  edge(node(300, AVE_Z), H2, 'ramp', { ctrl: { x: 505, z: 177 } });

  // ---- bridge: the x=40 street continues north across the river
  {
    let zEnd = -420;
    const river = T.features?.river;
    if (river) { const zr = river.zAt(40), hw = river.halfWidthAt(40); zEnd = zr - hw - 70; }
    const a = node(40, -110), b = node(40, zEnd);
    edge(a, b, 'street');
    edge(b, node(-60, zEnd - 60), 'street', { ctrl: { x: 40, z: zEnd - 60 } });
    // presets that follow the river
    const zm = (zEnd + -110) / 2;
    ctx.camera.registerPreset('bridge', { position: [40 + 95, T.getHeight(135, zm + 60) + 34, zm + 90], target: [40, 4, zm - 10] });
  }
  ctx.camera.registerPreset('intersection', CAMERAS.intersection);
  ctx.camera.registerPreset('highway', CAMERAS.highway);
  ctx.camera.registerPreset('loop', CAMERAS.loop);
}
