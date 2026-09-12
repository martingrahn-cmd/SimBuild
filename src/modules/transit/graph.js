// Road owner data is read only. Direction belongs to the carriageway, not to stop ID order.
export function snapStop(world, x, z, opts = {}) {
  if (!Number.isFinite(x) || !Number.isFinite(z) || (opts.mode && opts.mode !== 'bus')) return null;
  const R = world.roads;
  let hit = R.nearestEdge(x, z, 60);
  if (opts.edgeId !== undefined) {
    const e = R.edges.get(opts.edgeId); if (!e) return null;
    let best = Infinity;
    for (let i = 0, n = Math.max(2, Math.ceil(e.length)); i <= n; i++) {
      const p = R.sample(e.id, i / n), d = Math.hypot(x - p.x, z - p.z);
      if (d < best) { best = d; hit = { edge: e, t: i / n, point: p, dist: d }; }
    }
    if (best > 60) return null;
  }
  if (!hit || ['highway', 'ramp', 'gravel'].includes(hit.edge.type)) return null;
  const e = hit.edge, type = R.types[e.type];
  const lo = ((e.trimA || 0) + 8) / e.length, hi = 1 - ((e.trimB || 0) + 8) / e.length;
  if (lo > hi) return null;
  const t = Math.max(lo, Math.min(hi, hit.t)), p = R.sample(e.id, t);
  const side = opts.side === 'left' || opts.side === 'right' ? opts.side
    : ((x - p.x) * p.normal.x + (z - p.z) * p.normal.z >= 0 ? 'right' : 'left');
  if (e.oneWay && side === 'left') return null;
  const sign = side === 'right' ? 1 : -1, lateral = type.asphaltHalf + type.sidewalk * 0.65;
  return { x: p.x + p.normal.x * lateral * sign, y: p.y + 0.2,
    z: p.z + p.normal.z * lateral * sign, heading: Math.atan2(-p.normal.x * sign, p.normal.z * sign),
    edgeId: e.id, side, t, name: String(opts.name || 'Bus stop').trim().slice(0, 24) || 'Bus stop',
    lines: [], waiting: 0, propId: null };
}

function shortest(R, start, goal, allowHighway = false) {
  if (start === goal) return [];
  const dist = new Map([[start, 0]]), prev = new Map(), queue = new Set([start]);
  while (queue.size) {
    let u = null, best = Infinity;
    for (const id of queue) if (dist.get(id) < best) { best = dist.get(id); u = id; }
    queue.delete(u); if (u === goal) break;
    const node = R.nodes.get(u); if (!node) continue;
    for (const id of node.edges) {
      const e = R.edges.get(id); if (!e || (!allowHighway && ['highway', 'ramp'].includes(e.type))) continue;
      const forward = e.a === u; if (!forward && e.oneWay) continue;
      const v = forward ? e.b : e.a, d = best + e.length;
      if (d < (dist.get(v) ?? Infinity)) { dist.set(v, d); prev.set(v, { edgeId: id, forward, from: u }); queue.add(v); }
    }
  }
  if (!prev.has(goal)) return null;
  const out = []; let v = goal;
  while (v !== start) { const p = prev.get(v); out.push({ edgeId: p.edgeId, forward: p.forward }); v = p.from; }
  return out.reverse();
}

// Include each boarding edge in its legal direction; solve the full directed return leg too.
export function solve(world, stops) {
  const R = world.roads;
  if (stops.length < 2 || new Set(stops.map(s => s.id)).size !== stops.length) return { valid: false, reason: 'Choose at least two distinct stops', route: [], length: 0 };
  const walk = [];
  for (let i = 0; i < stops.length; i++) {
    const s = stops[i], n = stops[(i + 1) % stops.length], e = R.edges.get(s.edgeId), next = R.edges.get(n.edgeId);
    if (!e || !next) return { valid: false, reason: 'A stop road has been removed', route: [], length: 0 };
    const forward = s.side !== 'left', nf = n.side !== 'left';
    if ((!forward && e.oneWay) || (!nf && next.oneWay)) return { valid: false, reason: 'Stop faces against a one-way road', route: [], length: 0 };
    walk.push({ edgeId: e.id, forward, stop: s.id, stopT: s.t });
    const from = forward ? e.b : e.a, to = nf ? next.a : next.b;
    const link = shortest(R, from, to) ?? shortest(R, from, to, true);
    if (!link) return { valid: false, reason: 'No directed route back between these stops', route: [], length: 0 };
    walk.push(...link);
  }
  const route = walk.map(p => p.edgeId), length = walk.reduce((a, p) => a + R.edges.get(p.edgeId).length, 0);
  return { valid: true, reason: '', route, length, walk };
}

// Keep authoritative lane centres between junctions. The private cubic joins are cached once per route.
export function timetable(world, plan) {
  const R = world.roads, segments = [], legs = []; let seconds = 0, distance = 0;
  const append = (a, b, speed, stop = null, junction = false) => {
    const length = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z), duration = stop ? 8 : length / speed;
    if (duration <= 1e-9) return;
    segments.push({ start: seconds, end: seconds + duration, a, b, speed, stop, junction });
    seconds += duration; distance += length;
  };
  for (const leg of plan.walk) {
    const e = R.edges.get(leg.edgeId), lane = leg.forward ? 0 : Math.max(1, Math.floor(e.lanes / 2));
    const speed = Math.min(11, R.types[e.type].speed / 3.6), sign = leg.forward ? 1 : -1;
    const lo = Math.min(Math.max(e.trimA || 0, 6), e.length * 0.2) / e.length;
    const hi = 1 - Math.min(Math.max(e.trimB || 0, 6), e.length * 0.2) / e.length;
    const pose = t => { const p = R.laneCenter(e.id, lane, t); return { x: p.x, y: p.y + 0.08, z: p.z,
      heading: Math.atan2(p.tangent.x * sign, -p.tangent.z * sign), edgeId: e.id, lane, t }; };
    const n = Math.max(1, Math.ceil(e.length * (hi - lo) / 3)), ts = Array.from({ length: n + 1 }, (_, i) => lo + (hi - lo) * i / n);
    if (leg.stop) ts.push(leg.stopT);
    const points = [...new Set(ts)].sort((a, b) => sign * (a - b)).map(pose);
    legs.push({ leg, points, speed });
  }
  for (let i = 0; i < legs.length; i++) {
    const { leg, points, speed } = legs[i];
    for (let j = 0; j < points.length; j++) {
      if (j) append(points[j - 1], points[j], speed);
      if (leg.stop && points[j].t === leg.stopT) append(points[j], points[j], 0, leg.stop);
    }
    const a = points.at(-1), b = legs[(i + 1) % legs.length].points[0];
    const chord = Math.hypot(b.x - a.x, b.z - a.z), reach = Math.max(2, chord * 0.55);
    const c = { x: a.x + Math.sin(a.heading) * reach, z: a.z - Math.cos(a.heading) * reach };
    const d = { x: b.x - Math.sin(b.heading) * reach, z: b.z + Math.cos(b.heading) * reach };
    const n = Math.max(8, Math.ceil((chord + reach * 2) / 0.5)); let previous = a;
    for (let j = 1; j <= n; j++) {
      const t = j / n, u = 1 - t;
      const dx = 3*u*u*(c.x-a.x)+6*u*t*(d.x-c.x)+3*t*t*(b.x-d.x);
      const dz = 3*u*u*(c.z-a.z)+6*u*t*(d.z-c.z)+3*t*t*(b.z-d.z);
      const p = j === n ? b : { ...a, x: u*u*u*a.x+3*u*u*t*c.x+3*u*t*t*d.x+t*t*t*b.x,
        y: a.y+(b.y-a.y)*t, z: u*u*u*a.z+3*u*u*t*c.z+3*u*t*t*d.z+t*t*t*b.z, heading: Math.atan2(dx, -dz) };
      append(previous, p, Math.min(speed, legs[(i + 1) % legs.length].speed, 8), null, true); previous = p;
    }
  }
  return { segments, cycle: seconds, meanSpeed: distance / seconds, physicalLength: distance };
}

// Walking can use either pavement direction. Multi-source bounded Dijkstra is rebuilt only on owner events.
export function catchment(world, stops, radius = 400) {
  const R = world.roads, dist = new Map(), queue = new Set();
  const seed = (id, d) => { if (d <= radius && d < (dist.get(id) ?? Infinity)) { dist.set(id, d); queue.add(id); } };
  for (const s of stops) { const e = R.edges.get(s.edgeId); if (!e) continue;
    seed(e.a, s.t * e.length); seed(e.b, (1 - s.t) * e.length); }
  while (queue.size) {
    let u, best = Infinity; for (const id of queue) if (dist.get(id) < best) { u = id; best = dist.get(id); }
    queue.delete(u);
    for (const id of R.nodes.get(u)?.edges || []) { const e = R.edges.get(id);
      if (e && !['highway', 'ramp'].includes(e.type)) seed(e.a === u ? e.b : e.a, best + e.length); }
  }
  const result = new Set();
  for (const b of world.buildings.items.values()) {
    if (!stops.some(s => Math.hypot(s.x - b.x, s.z - b.z) <= radius)) continue;
    const hit = R.nearestEdge(b.x, b.z, 80); if (!hit || ['highway', 'ramp'].includes(hit.edge.type)) continue;
    const e = hit.edge;
    let d = Math.min((dist.get(e.a) ?? Infinity) + hit.t * e.length, (dist.get(e.b) ?? Infinity) + (1 - hit.t) * e.length);
    for (const s of stops) if (s.edgeId === e.id) d = Math.min(d, Math.abs(s.t - hit.t) * e.length);
    if (d + hit.dist <= radius) result.add(b.id);
  }
  return result;
}

export function sampleSchedule(table, seconds, out) {
  const t = ((seconds % table.cycle) + table.cycle) % table.cycle, a = table.segments;
  let lo = 0, hi = a.length - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (a[mid].end <= t) lo = mid + 1; else hi = mid; }
  const s = a[lo], k = Math.max(0, Math.min(1, (t - s.start) / (s.end - s.start)));
  out.x = s.a.x + (s.b.x - s.a.x) * k; out.y = s.a.y + (s.b.y - s.a.y) * k; out.z = s.a.z + (s.b.z - s.a.z) * k;
  let dh = s.b.heading - s.a.heading; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
  out.heading = s.a.heading + dh * k; out.edgeId = s.a.edgeId; out.t = s.a.t + (s.b.t - s.a.t) * k;
  out.junction = !!s.junction; out.toEdgeId = s.b.edgeId; out.lane = s.a.lane; out.speed = s.speed; out.atStop = s.stop; out.doorsOpen = !!s.stop;
}
