// Traffic simulation: IDM car-following, lane assignment, signal compliance, junction yielding,
// outside connections, pedestrians on sidewalks, congestion grid. Instanced rendering lives here too
// so the per-frame loop writes matrices straight into the InstancedMesh buffers (no allocations).
import * as THREE from 'three';
import { LAYERS, RENDER_ORDER } from '../../core/constants.js';
import { buildVehicleGeometry, buildLightRig, buildPedestrianGeometry } from './geometry.js';
import {
  createVehicleMaterial, createLightMaterial, createPedestrianMaterial,
  PAINTS, PAINT_WEIGHTS, SHIRTS, PANTS,
} from './materials.js';

const A_CAR = 1.5, A_BIG = 0.85;
const B_COMF = 2.4, S0 = 2.2, T_HEAD = 1.25;
const GRID = 256;
const NO_STOP = 1e9;

// class mix: [kind, weight, big?]
const MIX = [
  ['sedan', 24], ['hatchback', 21], ['suv', 16], ['taxi', 5],
  ['pickup', 9], ['van', 10], ['truck', 9], ['bus', 6],
];

export class Traffic {
  constructor(ctx, graph) {
    this.ctx = ctx;
    this.g = graph;
    this.rng = ctx.rng.fork('sim');
    this.world = ctx.world;
    this.vehicles = new Map();
    this.peds = [];
    this.nextId = 1;
    this.time = 0;
    this.lightsOn = 0;
    this.target = 120;
    this.pedTarget = 90;
    this.flow = new Float32Array(GRID * GRID);
    this.flowCell = ctx.world.size / GRID;
    this.stats = { count: 0, avgSpeed: 0, congestion: 0 };
    this._p = { x: 0, y: 0, z: 0, tx: 0, tz: 0 };
    this._q = { x: 0, y: 0, z: 0, tx: 0, tz: 0 };
    this._sortFn = (a, b) => a.s - b.s;
    this.classes = [];
    this.capacity = [];
    this.counters = null;
    this.group = new THREE.Group();
    this.group.name = 'traffic:instances';
    ctx.group.add(this.group);
    this.tris = 0;
  }

  // ------------------------------------------------------------------ setup
  buildMeshes(maxVehicles, maxPeds) {
    const vehMat = createVehicleMaterial();
    const lightMat = createLightMaterial();
    this.vehMat = vehMat; this.lightMat = lightMat;
    const totalW = MIX.reduce((a, m) => a + m[1], 0);
    for (let ci = 0; ci < MIX.length; ci++) {
      const [kind, w] = MIX[ci];
      const cap = Math.max(6, Math.ceil((maxVehicles * w / totalW) * 1.5));
      const { geometry, spec, lamps, tris } = buildVehicleGeometry(kind);
      this.tris += tris;
      const paint = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
      const lights = new THREE.InstancedBufferAttribute(new Float32Array(cap * 2), 2);
      const spin = new THREE.InstancedBufferAttribute(new Float32Array(cap), 1);
      geometry.setAttribute('aPaint', paint);
      geometry.setAttribute('aLights', lights);
      geometry.setAttribute('aSpin', spin);
      const mesh = new THREE.InstancedMesh(geometry, vehMat, cap);
      mesh.name = `traffic:${kind}`;
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.layers.enable(LAYERS.VEHICLES);
      mesh.renderOrder = RENDER_ORDER.VEHICLES;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.group.add(mesh);

      const rigGeo = buildLightRig(kind, lamps, spec);
      rigGeo.setAttribute('aLights', lights);
      const rig = new THREE.InstancedMesh(rigGeo, lightMat, cap);
      rig.name = `traffic:${kind}:lights`;
      rig.count = 0;
      rig.frustumCulled = false;
      rig.castShadow = false; rig.receiveShadow = false;
      rig.layers.enable(LAYERS.VEHICLES);
      rig.renderOrder = RENDER_ORDER.TRANSPARENT + 2;
      rig.instanceMatrix = mesh.instanceMatrix; // same transforms, shared buffer
      this.group.add(rig);

      this.classes.push({ kind, spec, mesh, rig, paint, lights, spin, cap, count: 0, big: kind === 'truck' || kind === 'bus' });
      this.capacity.push(cap);
    }
    this.counters = new Int32Array(this.classes.length);

    // pedestrians
    const pedMat = createPedestrianMaterial();
    this.pedMat = pedMat;
    const { geometry: pg, tris: ptris } = buildPedestrianGeometry();
    this.tris += ptris;
    const pcap = maxPeds;
    const shirt = new THREE.InstancedBufferAttribute(new Float32Array(pcap * 3), 3);
    const pants = new THREE.InstancedBufferAttribute(new Float32Array(pcap * 3), 3);
    const tone = new THREE.InstancedBufferAttribute(new Float32Array(pcap * 2), 2);
    const walk = new THREE.InstancedBufferAttribute(new Float32Array(pcap * 2), 2);
    pg.setAttribute('aShirt', shirt);
    pg.setAttribute('aPants', pants);
    pg.setAttribute('aTone', tone);
    pg.setAttribute('aWalk', walk);
    const pmesh = new THREE.InstancedMesh(pg, pedMat, pcap);
    pmesh.name = 'traffic:pedestrians';
    pmesh.count = 0;
    pmesh.frustumCulled = false;
    pmesh.castShadow = true;
    pmesh.receiveShadow = true;
    pmesh.layers.enable(LAYERS.VEHICLES);
    pmesh.renderOrder = RENDER_ORDER.PROPS;
    pmesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(pmesh);
    this.pedMesh = { mesh: pmesh, shirt, pants, tone, walk, cap: pcap };
  }

  // ------------------------------------------------------------------ spawning
  pickClass(bigBias = 0) {
    let total = 0;
    for (const m of MIX) total += m[1];
    let r = this.rng.float() * total;
    for (let i = 0; i < MIX.length; i++) {
      r -= MIX[i][1];
      if (r <= 0) {
        if (bigBias > 0 && this.rng.float() < bigBias && i < 6) return 6 + (this.rng.float() < 0.6 ? 0 : 1);
        return i;
      }
    }
    return 0;
  }

  paintFor(ci) {
    const kind = MIX[ci][0];
    if (kind === 'taxi') return [0.86, 0.62, 0.05];
    if (kind === 'bus') {
      const p = [[0.10, 0.28, 0.52], [0.50, 0.14, 0.10], [0.14, 0.36, 0.26], [0.72, 0.60, 0.10]];
      return p[this.rng.int(0, p.length - 1)];
    }
    let total = 0;
    for (const w of PAINT_WEIGHTS) total += w;
    let r = this.rng.float() * total;
    for (let i = 0; i < PAINTS.length; i++) { r -= PAINT_WEIGHTS[i]; if (r <= 0) return PAINTS[i]; }
    return PAINTS[0];
  }

  randomDestNode(fromNode) {
    const nodes = this.g.nodes;
    const from = nodes.get(fromNode);
    const keys = [...nodes.keys()];
    if (!keys.length) return -1;
    let best = -1, bestD = -1;
    for (let i = 0; i < 8; i++) {
      const id = keys[this.rng.int(0, keys.length - 1)];
      const nd = nodes.get(id);
      if (!nd || nd.outs.length === 0 || id === fromNode) continue;
      const d = from ? Math.hypot(nd.x - from.x, nd.z - from.z) : 1;
      if (d > bestD) { bestD = d; best = id; }
      if (d > 400) break;
    }
    return best;
  }

  makeRoute(rec, dir) {
    const startNode = this.g.nodeAhead(rec, dir);
    const dest = this.randomDestNode(startNode);
    let tail = dest >= 0 ? this.g.route(startNode, dest, rec.id) : null;
    if (!tail || !tail.length) {
      const nd = this.g.nodes.get(startNode);
      if (!nd) return null;
      const opts = nd.outs.filter((o) => o.edgeId !== rec.id);
      if (!opts.length) return null;
      tail = [{ edgeId: opts[this.rng.int(0, opts.length - 1)].edgeId, dir: 0 }];
      const o = nd.outs.find((x) => x.edgeId === tail[0].edgeId);
      tail[0].dir = o.dir;
    }
    const route = [{ edgeId: rec.id, dir }];
    for (const s of tail) route.push(s);
    return route;
  }

  spawn(opts = {}) {
    const g = this.g;
    let rec = opts.rec, dir = opts.dir, s = opts.s;
    if (!rec) {
      for (let i = 0; i < 12 && !rec; i++) {
        const cand = g.randomEdge(this.rng);
        if (!cand) break;
        const d = cand.oneWay ? 1 : (this.rng.bool() ? 1 : -1);
        const [, n] = g.laneRange(cand, d);
        if (n > 0) { rec = cand; dir = d; }
      }
      if (!rec) return null;
      s = this.rng.float() * rec.len;
    }
    const ci = opts.ci !== undefined ? opts.ci : this.pickClass(rec.big ? 0.25 : 0);
    const cls = this.classes[ci];
    if (cls.count >= cls.cap) return null;
    const route = opts.route || this.makeRoute(rec, dir);
    if (!route) return null;
    const [l0, ln] = g.laneRange(rec, dir);
    if (ln <= 0) return null;
    const lane = l0 + (cls.big ? 0 : this.rng.int(0, ln - 1));
    const spec = cls.spec;
    const paint = this.paintFor(ci);
    const v = {
      id: this.nextId++, kind: cls.kind, ci, slot: -1,
      edgeId: rec.id, rec, dir, lane, prevLane: lane, blend: 1, blendLen: 1,
      s: Math.min(s, rec.len - 0.5), t: 0, v: rec.speed * 0.55,
      v0: rec.speed * this.rng.range(0.86, 1.06) * (cls.big ? 0.86 : 1),
      len: spec.L, half: spec.L * 0.5, wheelR: spec.wheelR,
      route, ri: 0, external: !!opts.external,
      paint, spin: this.rng.float() * 6.28, brake: 0, pitch: 0,
      x: 0, y: 0, z: 0, heading: 0, lightsOn: 0, claim: -1, wait: 0,
    };
    g.laneAt(rec, lane, dir, v.s, this._p);
    v.x = this._p.x; v.y = this._p.y; v.z = this._p.z;
    this.vehicles.set(v.id, v);
    cls.count++;
    this.world.traffic.vehicles.set(v.id, v);
    return v;
  }

  despawn(id) {
    const v = this.vehicles.get(id);
    if (!v) return false;
    if (v.claim >= 0) { const nd = this.g.nodes.get(v.claim); if (nd && nd.busy === v.id) nd.busy = -1; }
    this.vehicles.delete(id);
    this.world.traffic.vehicles.delete(id);
    this.classes[v.ci].count--;
    return true;
  }

  spawnExternal() {
    const ports = this.g.portals;
    if (!ports.length) return null;
    const p = ports[this.rng.int(0, ports.length - 1)];
    const rec = this.g.edges.get(p.out.edgeId);
    if (!rec) return null;
    const dir = p.out.dir;
    const [, ln] = this.g.laneRange(rec, dir);
    if (ln <= 0) return null;
    const ci = this.rng.float() < (p.big ? 0.42 : 0.2) ? 6 : this.pickClass(0);
    return this.spawn({ rec, dir, s: this.rng.range(1, 12), ci, external: true });
  }

  // ------------------------------------------------------------------ pedestrians
  spawnPed(opts = {}) {
    const g = this.g;
    if (this.peds.length >= this.pedMesh.cap) return null;
    if (!g.sidewalks.length) return null;
    const w = opts.w || g.sidewalks[this.rng.int(0, g.sidewalks.length - 1)];
    const rec = g.edges.get(w.id);
    if (!rec) return null;
    const p = {
      rec, side: w.side, dir: this.rng.bool() ? 1 : -1,
      s: opts.s !== undefined ? opts.s : this.rng.float() * rec.len,
      v: this.rng.range(1.05, 1.55), phase: this.rng.float() * 6.28,
      jitter: this.rng.range(-0.5, 0.5),
      shirt: SHIRTS[this.rng.int(0, SHIRTS.length - 1)],
      pants: PANTS[this.rng.int(0, PANTS.length - 1)],
      tone: [this.rng.float(), this.rng.float()],
      scale: this.rng.range(0.92, 1.06),
      x: 0, y: 0, z: 0, heading: 0,
    };
    p.id = this.nextId++;
    this.peds.push(p);
    this.world.traffic.pedestrians.set(p.id, p);
    return p;
  }

  stepPeds(dt) {
    const g = this.g;
    const out = this._p;
    for (let i = 0; i < this.peds.length; i++) {
      const p = this.peds[i];
      p.s += p.v * dt;
      if (p.s >= p.rec.len - 1) {
        const nodeId = p.dir > 0 ? p.rec.b : p.rec.a;
        const nd = g.nodes.get(nodeId);
        let next = null;
        if (nd) {
          const cands = [];
          for (const mv of nd.ins) { const r = g.edges.get(mv.edgeId); if (r && r.swR && r.id !== p.rec.id) cands.push(r); }
          for (const mv of nd.outs) { const r = g.edges.get(mv.edgeId); if (r && r.swR && r.id !== p.rec.id && !cands.includes(r)) cands.push(r); }
          if (cands.length) next = cands[this.rng.int(0, cands.length - 1)];
        }
        if (!next) { p.dir = -p.dir; p.s = 1; continue; }
        const ndir = next.a === nodeId ? 1 : -1;
        // pick the side whose start point is closest to where we are now
        let bestSide = 1, bestD = Infinity;
        for (const side of [1, -1]) {
          if (!g.walkAt(next, side, ndir, 1.5, out)) continue;
          const d = Math.hypot(out.x - p.x, out.z - p.z);
          if (d < bestD) { bestD = d; bestSide = side; }
        }
        p.rec = next; p.dir = ndir; p.side = bestSide; p.s = 1.5;
      }
      g.walkAt(p.rec, p.side, p.dir, p.s, out);
      p.x = out.x - out.tz * p.jitter;
      p.z = out.z + out.tx * p.jitter;
      p.y = out.y;
      p.heading = Math.atan2(out.tx, -out.tz);
      p.phase += (p.v / 0.72) * dt;
      if (p.phase > 1e6) p.phase -= 1e6;
    }
  }

  // ------------------------------------------------------------------ vehicle step
  idm(v, v0, gap, vl, A) {
    const sStar = S0 + Math.max(0, v * T_HEAD + (v * (v - vl)) / (2 * Math.sqrt(A * B_COMF)));
    const gg = Math.max(gap, 0.35);
    const a = A * (1 - Math.pow(v / v0, 4) - (sStar / gg) * (sStar / gg));
    return a < -9 ? -9 : a;
  }

  step(dt) {
    const g = this.g;
    this.time += dt;
    g.updateSignals(dt);

    // ---- bucket vehicles by (edge, lane)
    const buckets = g.buckets;
    for (let i = 0; i < buckets.length; i++) buckets[i].length = 0;
    for (const v of this.vehicles.values()) {
      const b = v.rec.bucket + v.lane;
      if (b >= 0 && b < buckets.length) buckets[b].push(v);
    }
    for (let i = 0; i < buckets.length; i++) if (buckets[i].length > 1) buckets[i].sort(this._sortFn);

    const dead = [];
    for (let bi = 0; bi < buckets.length; bi++) {
      const arr = buckets[bi];
      for (let k = 0; k < arr.length; k++) {
        const v = arr[k];
        const rec = v.rec;
        const A = this.classes[v.ci].big ? A_BIG : A_CAR;
        let acc = this.idm(v.v, v.v0, 1e6, v.v, A);

        // leader in the same lane
        const lead = arr[k + 1];
        if (lead) {
          acc = Math.min(acc, this.idm(v.v, v.v0, lead.s - v.s - lead.half - v.half, lead.v, A));
        }

        // distance to the node ahead and to its stop line (the road's trim = edge of the junction box)
        const trimEnd = v.dir > 0 ? rec.trimB : rec.trimA;
        const dEnd = rec.len - v.s - v.half;
        const dStop = rec.len - trimEnd - 1.0 - v.s - v.half;
        const nodeId = g.nodeAhead(rec, v.dir);
        const nd = g.nodes.get(nodeId);
        let nxt = v.route[v.ri + 1];
        if (!nxt && dEnd < 80) {
          if (v.external) { if (this.extendToPortal(v)) nxt = v.route[v.ri + 1]; }
          else if (this.extendRoute(v)) nxt = v.route[v.ri + 1];
        }
        let stop = NO_STOP;

        // the vehicle queued at the head of the next lane also constrains us (spill-back / keep clear)
        let nextGap = 1e6;
        if (nxt) {
          const nrec = g.edges.get(nxt.edgeId);
          if (nrec) {
            const nb = buckets[nrec.bucket + this.pickLane(nrec, nxt.dir, v, v.route[v.ri + 2])];
            const first = nb && nb.length ? nb[0] : null;
            if (first) {
              nextGap = first.s - first.half;
              if (!lead) acc = Math.min(acc, this.idm(v.v, v.v0, dEnd + nextGap, first.v, A));
            }
          }
        }

        if (nd) {
          let block = false;
          const st = g.approachState(nodeId, rec.id, v.dir);
          if (st === 'red') block = true;
          else if (st === 'yellow' && dStop > 2 + v.v * 1.0) block = true;
          else if (st === 'none' && nd.arms >= 3) {
            if (dStop < 11) {
              if (nd.busy === -1 || nd.busy === v.id || this.time > nd.busyUntil) {
                nd.busy = v.id; nd.busyUntil = this.time + 6; v.claim = nodeId; v.wait = 0;
              } else {
                v.wait += dt;
                if (v.wait < 9) block = true;
                else { nd.busy = v.id; nd.busyUntil = this.time + 6; v.claim = nodeId; v.wait = 0; }
              }
            }
          }
          // never enter a junction we cannot clear
          if (nd.arms >= 3 && nextGap < v.len + 3.5) block = true;
          if (block && dStop > -0.6) stop = dStop;
          if (!nxt && !v.external && dEnd < 30) stop = Math.min(stop, dEnd - 1.5);
        }
        if (stop < NO_STOP) acc = Math.min(acc, this.idm(v.v, v.v0, stop, 0, A));

        // integrate
        v.v += acc * dt;
        if (v.v < 0) v.v = 0;
        if (stop < 0.4 && v.v < 0.7) v.v = 0;
        const moved = v.v * dt;
        v.s += moved;
        v.spin += moved / v.wheelR;
        if (v.spin > 1e6) v.spin -= 1e6;
        v.brake += ((acc < -1.1 ? 1 : 0) - v.brake) * Math.min(1, dt * 7);

        if (v.blend < 1) v.blend = Math.min(1, v.blend + moved / v.blendLen);

        // release a claim once the junction we booked is behind us
        if (v.claim >= 0 && v.claim !== nodeId && v.s > 3.5) {
          const cn = g.nodes.get(v.claim);
          if (cn && cn.busy === v.id) cn.busy = -1;
          v.claim = -1;
        }

        // advance along the route
        if (v.s >= rec.len) {
          if (!v.route[v.ri + 1]) { dead.push(v.id); continue; }
          const step = v.route[v.ri + 1];
          const nrec = g.edges.get(step.edgeId);
          if (!nrec) { dead.push(v.id); continue; }
          const over = v.s - rec.len;
          const prevIdxFromRight = v.lane - g.laneRange(rec, v.dir)[0];
          v.ri++;
          v.rec = nrec; v.edgeId = nrec.id; v.dir = step.dir;
          v.s = Math.min(over, nrec.len - 0.4);
          const [nl0, nln] = g.laneRange(nrec, v.dir);
          if (nln <= 0) { dead.push(v.id); continue; }
          const target = this.pickLane(nrec, v.dir, v, v.route[v.ri + 1]);
          const entry = nl0 + Math.min(nln - 1, prevIdxFromRight);
          v.prevLane = entry;
          v.lane = target;
          v.blend = entry === target ? 1 : 0;
          v.blendLen = Math.max(10, Math.min(30, nrec.len * 0.5));
        }
      }
    }
    for (const id of dead) this.despawn(id);
  }

  /** Lane on `rec` in `dir` appropriate for the turn recorded in `next`. index 0 of the range = rightmost. */
  pickLane(rec, dir, v, next) {
    const g = this.g;
    const [l0, ln] = g.laneRange(rec, dir);
    if (ln <= 1) return l0;
    const big = this.classes[v.ci].big;
    if (next) {
      const nrec = g.edges.get(next.edgeId);
      if (nrec) {
        const t = g.turnSign(rec, dir, nrec, next.dir);
        if (t < 0) return l0;                    // right turn -> rightmost
        if (t > 0) return l0 + ln - 1;           // left turn -> leftmost
      }
    }
    if (big) return l0;
    return l0 + (v.id % ln);
  }

  /** External traffic leaves the map again: route on toward any outside connection. */
  extendToPortal(v) {
    const node = this.g.nodeAhead(v.rec, v.dir);
    const ports = this.g.portals;
    for (let i = 0; i < 4 && ports.length; i++) {
      const p = ports[this.rng.int(0, ports.length - 1)];
      if (p.nodeId === node) continue;
      const tail = this.g.route(node, p.nodeId, v.rec.id);
      if (tail && tail.length) { for (const s of tail) v.route.push(s); return true; }
    }
    return this.extendRoute(v);
  }

  extendRoute(v) {
    const node = this.g.nodeAhead(v.rec, v.dir);
    const dest = this.randomDestNode(node);
    if (dest < 0) return false;
    const tail = this.g.route(node, dest, v.rec.id);
    if (!tail || !tail.length) return false;
    for (const s of tail) v.route.push(s);
    if (v.route.length > 60 && v.ri > 0) { v.route.splice(0, v.ri); v.ri = 0; }
    return true;
  }

  // ------------------------------------------------------------------ population control
  balance(dt) {
    const need = Math.round(this.target);
    let n = this.vehicles.size;
    let guard = 0;
    while (n < need && guard++ < 6) {
      const ext = this.g.portals.length && this.rng.float() < 0.22;
      const v = ext ? this.spawnExternal() : this.spawn();
      if (!v) break;
      n++;
    }
    if (n > need + 4) {
      for (const v of this.vehicles.values()) { this.despawn(v.id); break; }
    }
    const pneed = Math.round(this.pedTarget);
    guard = 0;
    while (this.peds.length < pneed && guard++ < 8) { if (!this.spawnPed()) break; }
    while (this.peds.length > pneed + 3) { const p = this.peds.pop(); this.world.traffic.pedestrians.delete(p.id); }
  }

  // ------------------------------------------------------------------ write instances
  render(dt) {
    const g = this.g;
    const out = this._p, out2 = this._q;
    const counters = this.counters;
    counters.fill(0);
    let speedSum = 0, congSum = 0;
    const flow = this.flow, cell = this.flowCell, half = this.world.size * 0.5;
    this._flowAcc = (this._flowAcc || 0) + dt;
    if (this._flowAcc > 0.25) {
      const decay = Math.max(0, 1 - this._flowAcc * 0.35);
      for (let i = 0; i < flow.length; i++) flow[i] *= decay;
      this._flowAcc = 0;
    }

    for (const v of this.vehicles.values()) {
      const rec = v.rec;
      g.laneAt(rec, v.lane, v.dir, v.s, out);
      let px = out.x, py = out.y, pz = out.z, tx = out.tx, tz = out.tz;
      if (v.blend < 1) {
        g.laneAt(rec, v.prevLane, v.dir, v.s, out2);
        const k = v.blend * v.blend * (3 - 2 * v.blend);
        px = out2.x + (px - out2.x) * k;
        py = out2.y + (py - out2.y) * k;
        pz = out2.z + (pz - out2.z) * k;
        const lx = out2.tx + (tx - out2.tx) * k, lz = out2.tz + (tz - out2.tz) * k;
        const ll = Math.hypot(lx, lz) || 1;
        tx = lx / ll; tz = lz / ll;
      }
      // grade -> pitch (smoothed)
      const dy = py - v.y;
      if (v.v > 0.2) {
        const grade = Math.max(-0.35, Math.min(0.35, dy / Math.max(0.05, v.v * dt)));
        v.pitch += (grade - v.pitch) * Math.min(1, dt * 2.5);
      }
      v.x = px; v.y = py; v.z = pz;
      v.heading = Math.atan2(tx, -tz);
      v.t = v.s / rec.len;
      v.lightsOn = this.lightsOn;

      const cls = this.classes[v.ci];
      const slot = counters[v.ci]++;
      if (slot >= cls.cap) { counters[v.ci]--; continue; }
      v.slot = slot;
      // basis: forward f (with pitch), X = right, Y = up, Z = -f
      const fy = v.pitch;
      const fl = Math.hypot(tx, tz);
      const nx = tx / (fl || 1), nz = tz / (fl || 1);
      const inv = 1 / Math.hypot(1, fy);
      const fxx = nx * inv, fyy = fy * inv, fzz = nz * inv;
      const h = Math.hypot(fxx, fzz) || 1;
      const Xx = -fzz / h, Xy = 0, Xz = fxx / h;
      const Yx = -fxx * fyy / h, Yy = h, Yz = -fzz * fyy / h;
      const m = cls.mesh.instanceMatrix.array;
      const o = slot * 16;
      m[o] = Xx; m[o + 1] = Xy; m[o + 2] = Xz; m[o + 3] = 0;
      m[o + 4] = Yx; m[o + 5] = Yy; m[o + 6] = Yz; m[o + 7] = 0;
      m[o + 8] = -fxx; m[o + 9] = -fyy; m[o + 10] = -fzz; m[o + 11] = 0;
      m[o + 12] = px; m[o + 13] = py + 0.085; m[o + 14] = pz; m[o + 15] = 1;
      const pa = cls.paint.array;
      pa[slot * 3] = v.paint[0]; pa[slot * 3 + 1] = v.paint[1]; pa[slot * 3 + 2] = v.paint[2];
      const la = cls.lights.array;
      la[slot * 2] = this.lightsOn;
      la[slot * 2 + 1] = v.brake;
      cls.spin.array[slot] = v.spin;

      speedSum += v.v;
      const cong = Math.max(0, 1 - v.v / Math.max(3, v.v0));
      congSum += cong;
      const gx = ((px + half) / cell) | 0, gz = ((pz + half) / cell) | 0;
      if (gx >= 0 && gx < GRID && gz >= 0 && gz < GRID) {
        const idx = gz * GRID + gx;
        flow[idx] = Math.min(1.5, flow[idx] + 0.12 + cong * 0.5);
      }
    }

    for (let ci = 0; ci < this.classes.length; ci++) {
      const c = this.classes[ci];
      c.mesh.count = counters[ci];
      c.rig.count = this.lightsOn > 0.02 ? counters[ci] : 0;
      c.mesh.instanceMatrix.needsUpdate = true;
      c.paint.needsUpdate = true;
      c.lights.needsUpdate = true;
      c.spin.needsUpdate = true;
    }

    // pedestrians
    const pm = this.pedMesh;
    const pa = pm.mesh.instanceMatrix.array;
    let pn = 0;
    for (let i = 0; i < this.peds.length && pn < pm.cap; i++) {
      const p = this.peds[i];
      const c = Math.cos(p.heading), s = Math.sin(p.heading);
      // heading 0 = -Z; local +Z is the pedestrian's back
      const o = pn * 16;
      const sc = p.scale;
      pa[o] = c * sc; pa[o + 1] = 0; pa[o + 2] = s * sc; pa[o + 3] = 0;
      pa[o + 4] = 0; pa[o + 5] = sc; pa[o + 6] = 0; pa[o + 7] = 0;
      pa[o + 8] = -s * sc; pa[o + 9] = 0; pa[o + 10] = c * sc; pa[o + 11] = 0;
      pa[o + 12] = p.x; pa[o + 13] = p.y + 0.21; pa[o + 14] = p.z; pa[o + 15] = 1;
      pm.shirt.array[pn * 3] = p.shirt[0]; pm.shirt.array[pn * 3 + 1] = p.shirt[1]; pm.shirt.array[pn * 3 + 2] = p.shirt[2];
      pm.pants.array[pn * 3] = p.pants[0]; pm.pants.array[pn * 3 + 1] = p.pants[1]; pm.pants.array[pn * 3 + 2] = p.pants[2];
      pm.tone.array[pn * 2] = p.tone[0]; pm.tone.array[pn * 2 + 1] = p.tone[1];
      pm.walk.array[pn * 2] = p.phase; pm.walk.array[pn * 2 + 1] = 0.52;
      pn++;
    }
    pm.mesh.count = pn;
    pm.mesh.instanceMatrix.needsUpdate = true;
    pm.shirt.needsUpdate = true; pm.pants.needsUpdate = true;
    pm.tone.needsUpdate = true; pm.walk.needsUpdate = true;

    const n = this.vehicles.size || 1;
    this.stats.count = this.vehicles.size;
    this.stats.avgSpeed = speedSum / n;
    this.stats.congestion = Math.min(1, congSum / n);
    const wt = this.world.traffic;
    wt.stats.count = this.stats.count;
    wt.stats.avgSpeed = this.stats.avgSpeed;
    wt.stats.congestion = this.stats.congestion;
  }

  dispose() {
    for (const c of this.classes) {
      c.mesh.geometry.dispose();
      c.rig.geometry.dispose();
      this.group.remove(c.mesh); this.group.remove(c.rig);
    }
    this.pedMesh?.mesh.geometry.dispose();
    this.vehMat?.dispose(); this.lightMat?.dispose(); this.pedMat?.dispose();
    this.classes.length = 0;
    this.vehicles.clear();
    this.peds.length = 0;
    this.world.traffic.vehicles.clear();
    this.world.traffic.pedestrians.clear();
    this.ctx.group.remove(this.group);
  }
}

export { MIX, GRID };
