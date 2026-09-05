// Showcase staging for zoning: a CS2-style street grid (plus an avenue, a diagonal and a curved
// street) laid down through world.roads, then every zone type painted in both densities on both
// sides of the roads, leaving two blocks unzoned so the empty zonable band is visible too.

export const CAMERAS = {
  zones: { yaw: 0.62, pitch: 0.74, distance: 300, target: [0, 0, 0] },
  zonesclose: { yaw: 0.95, pitch: 0.44, distance: 140, target: [-80, 0, -50] },
  zoneswide: { yaw: 0.45, pitch: 1.05, distance: 660, target: [0, 0, 10] },
};

const XS = [-240, -160, -80, 0, 80, 160, 240];
const ZS = [-160, -80, 0, 80, 160];

// block layout: rows north (z -160..-80) to south (z 80..160), columns west to east.
// null = left unzoned so the empty zonable grid shows through.
const R = 'residential', C = 'commercial', I = 'industrial', O = 'office';
const LAYOUT = [
  [[R, 'low'], [R, 'low'], [R, 'high'], null, [O, 'high'], [O, 'high']],
  [[R, 'low'], [R, 'low'], [C, 'low'], [C, 'high'], [O, 'high'], [O, 'low']],
  [[R, 'low'], [R, 'high'], [C, 'low'], [C, 'high'], [O, 'low'], [I, 'low']],
  [[R, 'high'], [R, 'high'], [C, 'low'], null, [I, 'high'], [I, 'low']],
];

export function stageRoads(ctx) {
  const RD = ctx.world.roads;
  const node = (x, z) => RD.addNode(x, z);
  const edge = (a, b, type = 'street', opts) => RD.addEdge(a, b, type, opts);
  const chain = (pts, type, opts) => {
    const ids = pts.map(([x, z]) => node(x, z));
    for (let i = 1; i < ids.length; i++) edge(ids[i - 1], ids[i], type, opts);
    return ids;
  };

  // the avenue along z = 0, running a little past the grid on both sides
  chain([[-320, 0], ...XS.map((x) => [x, 0]), [320, 0]], 'avenue');
  // north-south streets
  for (const x of XS) chain(ZS.map((z) => [x, z]), 'street');
  // east-west streets
  for (const z of ZS) { if (z === 0) continue; chain(XS.map((x) => [x, z]), 'street'); }

  // a diagonal street cutting one south-west block, so lots are generated off-axis too
  edge(node(-240, 80), node(-160, 160), 'street');
  // a curved street off the east side
  edge(node(240, -80), node(330, 20), 'street', { ctrl: { x: 330, z: -70 } });
  // two alleys splitting deep blocks
  chain([[-200, -160], [-200, -80]], 'alley');
  chain([[120, 80], [120, 160]], 'alley');
}

export function paintZones(ctx, grid) {
  grid.bulk(({ rect }) => {
    for (let r = 0; r < LAYOUT.length; r++) {
      for (let c = 0; c < LAYOUT[r].length; c++) {
        const kind = LAYOUT[r][c];
        if (!kind) continue;
        const x0 = XS[c], x1 = XS[c + 1];
        const z0 = ZS[r], z1 = ZS[r + 1];
        rect(x0 + 2, z0 + 2, x1 - 2, z1 - 2, kind[0], kind[1]);
      }
    }
    // the diagonal block and the curved street get zoned too
    rect(-244, 84, -158, 158, 'residential', 'high');
    rect(244, -110, 340, 40, 'office', 'low');
  });
}
