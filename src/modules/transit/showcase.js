import * as THREE from 'three';
export const CAMERAS = {
  stop: { position: [52, 6.5, 56], target: [40, 2.2, 42] },
  bus: { position: [26, 5.5, 30], target: [20, 1.8, 20] },
  line: { position: [-40, 210, 300], target: [20, 0, 20] },
  overlay: { position: [0, 180, 380], target: [0, 0, 260] },
  night_stop: { position: [48, 5, 52], target: [38, 2.2, 40] },
  lines: { position: [120, 150, 260], target: [30, 0, 30] },
};
export async function stage(ctx, api, weights) {
  const W = ctx.world, R = W.roads, T = W.terrain;
  if (W.transit.lines.size) return;
  // Public terrain owner grading makes the district buildable above sea level; leave its outer valley intact.
  if (!R.edges.size && T.setHeights && T.heights) {
    const res = T.resolution, values = T.heights.slice(), half = W.size / 2;
    for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) {
      const x = i * T.cellSize - half, z = j * T.cellSize - half;
      const d = Math.max(Math.abs(x - 40), Math.abs(z - 40)), k = Math.max(0, Math.min(1, (400 - d) / 70));
      values[j * res + i] = values[j * res + i] * (1 - k) + 15 * k;
    }
    T.setHeights(0, 0, res - 1, res - 1, values, { restore: true });
  }
  const nodes = new Map(), edges = new Map(), coord = i => -230 + 90 * i;
  const key = (a, b) => `${a}:${b}`;
  for (let z = 0; z <= 6; z++) for (let x = 0; x <= 6; x++) nodes.set(key(x, z), R.addNode(coord(x), coord(z)));
  const edge = (ax, az, bx, bz) => {
    const a = nodes.get(key(ax, az)), b = nodes.get(key(bx, bz)), type = az === 3 && bz === 3 ? 'avenue' : 'street';
    const id = R.addEdge(a, b, type); edges.set(`${ax},${az}:${bx},${bz}`, id); edges.set(`${bx},${bz}:${ax},${az}`, id);
  };
  for (let z = 0; z <= 6; z++) for (let x = 0; x < 6; x++) edge(x, z, x + 1, z);
  for (let x = 0; x <= 6; x++) for (let z = 0; z < 6; z++) edge(x, z, x, z + 1);
  R.addEdge(R.addNode(310, 310), R.addNode(340, 130), 'street', { ctrl: { x: 365, z: 280 } });
  R.addEdge(R.addNode(340, 130), nodes.get(key(6, 4)), 'street');
  R.addEdge(R.addNode(-95, 40), R.addNode(-95, 130), 'alley');
  ctx.modules.roads.rebuild();
  ctx.modules.props?.rebuild?.();
  const rng = ctx.rng.fork('showcase-stops');
  const loop = (xmin, zmin, xmax, zmax) => {
    const walk = [];
    for (let x = xmin; x < xmax; x++) walk.push([x, zmin, x + 1, zmin]);
    for (let z = zmin; z < zmax; z++) walk.push([xmax, z, xmax, z + 1]);
    for (let x = xmax; x > xmin; x--) walk.push([x, zmax, x - 1, zmax]);
    for (let z = zmax; z > zmin; z--) walk.push([xmin, z, xmin, z - 1]);
    return walk;
  };
  const loops = [loop(0, 0, 6, 6), loop(0, 1, 6, 6), loop(1, 0, 6, 5)], lists = [];
  for (let line = 0; line < loops.length; line++) {
    const walk = loops[line], ids = [];
    for (let i = 0; i < 8; i++) {
      const [ax, az, bx, bz] = walk[Math.floor(i * walk.length / 8)], id = edges.get(`${ax},${az}:${bx},${bz}`), e = R.edges.get(id);
      const forward = e.a === nodes.get(key(ax, az)), side = forward ? 'right' : 'left';
      let t = rng.range(0.28, 0.72);
      // Reuse real props shelter anchors on three forward-facing stops. Other stops retain seeded variation.
      const prop = [...W.props.items.values()].find(p => p.kind === 'bus_stop' && p.edgeId === id && p.side === side);
      if (prop && line === 0 && i < 4) t = prop.t;
      const p = R.sample(id, t), sign = forward ? 1 : -1;
      const stop = api.addStop(p.x + p.normal.x * 7 * sign, p.z + p.normal.z * 7 * sign, { edgeId: id, side, name: `${['Harbour', 'Market', 'Garden'][line]} ${i + 1}` });
      if (stop === null) throw new Error(`showcase stop ${line}:${i} could not be seated`);
      ids.push(stop); weights.set(stop, 40 + rng.int(0, 35));
    }
    lists.push(ids);
  }
  // Shared interchange IDs are actual shared boarding stops; two additional opposite kerbs stay distinct.
  lists[1][2] = lists[0][2]; lists[1][3] = lists[0][3];
  for (const [i, ids] of lists.entries()) {
    const id = api.createLine('bus', ids, { name: ['Harbour Circle', 'Market Link', 'Garden Loop'][i], color: ['#2f8ff5', '#e5484d', '#4cc25a'][i], vehicles: 4, fare: 2 });
    if (id === null) throw new Error(`showcase line ${i} failed its directed return route`);
  }
  // Camera elevations follow the authored road datum, preserving their specified relative eye heights.
  for (const [name, p] of Object.entries(CAMERAS)) ctx.camera.registerPreset(name, { position: [p.position[0], p.position[1] + 15, p.position[2]], target: [p.target[0], p.target[1] + 15, p.target[2]] });
  // Choose a real stop with a clear frontage, reading existing tree records without moving props.
  const trees = [...W.props.items.values()].filter(p => p.kind.startsWith('tree_'));
  const clearance = (x, z) => trees.reduce((m, p) => Math.min(m, Math.hypot(p.x - x, p.z - z)), 100);
  const stops = api.stops().filter(s => s.propId === null);
  stops.sort((a, b) => clearance(b.x, b.z) - clearance(a.x, a.z) || a.id - b.id);
  const featured = stops[0] || api.stops()[0];
  if (featured) {
    const front = [Math.sin(featured.heading), -Math.cos(featured.heading)], right = [Math.cos(featured.heading), Math.sin(featured.heading)];
    const side = clearance(featured.x + right[0] * 8, featured.z + right[1] * 8) > clearance(featured.x - right[0] * 8, featured.z - right[1] * 8) ? 1 : -1;
    for (const name of ['stop', 'night_stop']) ctx.camera.registerPreset(name, {
      // Stand far enough back to frame the 12 m in-service vehicle and shelter together.
      position: [featured.x + front[0] * 8 + right[0] * 20 * side, featured.y + 4.2, featured.z + front[1] * 8 + right[1] * 20 * side],
      target: [featured.x, featured.y + 1.6, featured.z]
    });
    ctx.camera.registerPreset('street', {
      position: [featured.x + front[0] * 10 + right[0] * 15 * side, featured.y + 6, featured.z + front[1] * 10 + right[1] * 15 * side],
      target: [featured.x, featured.y + 1.4, featured.z]
    });
    // Align an existing scheduled fleet vehicle with this actual stop for the 22:00 inspection.
    // The transit owner computes its phase from the route table, so this is not a display duplicate.
    api.setShowcaseDock(featured.id, 22);
  }
  const fleet = api.vehicles(), camera = new THREE.PerspectiveCamera(ctx.camera.camera.fov, ctx.camera.camera.aspect, .5, 6000);
  const point = new THREE.Vector3(), width = innerWidth, height = innerHeight;
  const blockers=[...W.props.items.values()].filter(p=>p.kind.startsWith('tree_')||p.kind==='streetlamp'||p.kind==='traffic_light');
  let hero = null;
  // Project the whole vehicle envelope before selecting a hero angle. Keep the HUD visible.
  for (const bus of fleet) for (const turn of [-.65,-.5,-.35,.35,.5,.65, Math.PI-.5, Math.PI+.5]) for (const pan of [-1,0,1]) {
    const angle = bus.heading + turn, dx = Math.sin(angle) * 11.05, dz = -Math.cos(angle) * 11.05;
    const position = [bus.x+dx, bus.y+4.3, bus.z+dz], target = [bus.x + dz/11.05*pan, bus.y+.1, bus.z-dx/11.05*pan];
    camera.position.fromArray(position); camera.lookAt(...target); camera.updateMatrixWorld();
    let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
    for (const x of [-1.4,1.4]) for (const y of [0,3.4]) for (const z of [-6.05,6.05]) {
      const c=Math.cos(Math.PI-bus.heading),sn=Math.sin(Math.PI-bus.heading);
      point.set(bus.x+x*c+z*sn,bus.y+y,bus.z-x*sn+z*c).project(camera);
      const px=(point.x*.5+.5)*width,py=(-point.y*.5+.5)*height;
      left=Math.min(left,px);right=Math.max(right,px);top=Math.min(top,py);bottom=Math.max(bottom,py);
    }
    const fits = left>360 && right<width-28 && top>45 && bottom<height-112;
    let obstruction=0;
    for (const p of blockers) {const t=((p.x-position[0])*(bus.x-position[0])+(p.z-position[2])*(bus.z-position[2]))/(11.05*11.05);if(t>0&&t<1){const d=Math.hypot(p.x-position[0]-(bus.x-position[0])*t,p.z-position[2]-(bus.z-position[2])*t);obstruction+=Math.max(0,(p.kind.startsWith('tree_')?4:1.4)-d)*700;}}
    const score=(fits?10000:0)-obstruction+Math.min(clearance(position[0],position[2]),15)*50+(right-left)*.1-Math.max(0,360-left)*4-Math.max(0,bottom-height+112)*4;
    if (!hero || score>hero.score) hero={score,position,target,bus};
  }
  if (hero) {
    ctx.camera.registerPreset('bus',{position:hero.position,target:hero.target});
    ctx.camera.registerPreset('closeup',{position:hero.position.map((v,i)=>hero.target[i]+(v-hero.target[i])*1.8),target:hero.target});
  }
}
