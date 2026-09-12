import {buildMeshes,render,dispose} from './render.js';
// Traffic simulation: IDM car-following, lane assignment, signal compliance, junction yielding,
// outside connections, pedestrians on sidewalks, congestion grid. Instanced rendering lives here too
// so the per-frame loop writes matrices straight into the InstancedMesh buffers (no allocations).
import * as THREE from 'three';
import { LAYERS, RENDER_ORDER } from '../../core/constants.js';
import { buildVehicleGeometry, buildLightRig, buildPedestrianGeometry, buildContactShadow, buildPedShadow } from './geometry.js';
import {
  createVehicleMaterial, createLightMaterial, createPedestrianMaterial, createContactMaterial,
  PAINTS, PAINT_WEIGHTS, SHIRTS, PANTS,
} from './materials.js';

const A_CAR = 1.5, A_BIG = 0.85;
const B_COMF = 2.4, S0 = 2.2, T_HEAD = 1.25;
const GRID = 256;
const NO_STOP = 1e9;
let SHADOW_CASTING = true;

// class mix: [kind, weight, big?]
const MIX = [ ['sedan',23],['hatchback',22],['suv',16],['taxi',5],['pickup',8],['van',10],['box_truck',5],['bus',4],['semi',3],['motorbike',3],['police',1] ];

export class Traffic {
  constructor(ctx, graph) {
    this.ctx = ctx;
    this.mix = MIX;
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
    this.stats = { count: 0, avgSpeed: 0, congestion: 0,queued:0,pedestrians:0,byKind:Object.fromEntries(MIX.map(m=>[m[0],0])),spawned:0,despawned:0 };
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

  buildMeshes(...args){return buildMeshes.apply(this,args);}

  // ------------------------------------------------------------------ spawning
  pickClass(purpose = 'general') {
    if (purpose === 'freight') return this.rng.float() < .72 ? 6 : 8;
    if (purpose === 'delivery') {
      const r=this.rng.float(); return r<.38?5:r<.72?4:r<.91?6:8;
    }
    if (purpose !== 'general') {
      let total=0;for(let i=0;i<MIX.length;i++)if(i!==6&&i!==8)total+=MIX[i][1];
      let r=this.rng.float()*total;for(let i=0;i<MIX.length;i++){if(i===6||i===8)continue;r-=MIX[i][1];if(r<=0)return i;}return 0;
    }
    const h=this.world.time.hour,freight=h<9?.24:h>15&&h<20?.055:.10;
    if(this.rng.float()<freight)return this.rng.float()<.7?6:8;
    let total=0;for(let i=0;i<MIX.length;i++)if(i!==6&&i!==8)total+=MIX[i][1];
    let r=this.rng.float()*total;for(let i=0;i<MIX.length;i++){if(i===6||i===8)continue;r-=MIX[i][1];if(r<=0)return i;}return 0;
  }

  tripPurpose(rec) {
    const a=rec.activity||{}, weighted=[];
    for(const k of ['residential','commercial','industrial','office'])if(a[k]>0)weighted.push([k,a[k]]);
    let origin='general';if(weighted.length){let r=this.rng.float()*weighted.reduce((n,v)=>n+v[1],0);for(const v of weighted){r-=v[1];if(r<=0){origin=v[0];break;}}}
    if(origin==='industrial')return this.rng.float()<.72?'freight':'commute';
    if(origin==='commercial')return this.rng.float()<.18?'delivery':'customer';
    if(origin==='office')return 'commute-home';
    if(origin==='residential')return (this.world.time.hour>=6&&this.world.time.hour<18)?'commute':'customer';
    return 'general';
  }

  destinationKinds(purpose) {
    if(purpose==='freight')return ['commercial','industrial'];
    if(purpose==='delivery')return ['industrial'];
    if(purpose==='commute')return ['commercial','industrial','office'];
    if(purpose==='commute-home'||purpose==='customer')return ['residential'];
    return null;
  }

  paintFor(ci) {
    const kind = MIX[ci][0];
    if (kind === 'police') return [0.04,0.055,0.085];
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

  randomDestNode(fromNode, purpose = 'general', originEdge = -1) {
    const nodes = this.g.nodes;
    const from = nodes.get(fromNode);
    const kinds=this.destinationKinds(purpose),destEdge=kinds&&this.g.randomActivityEdge(this.rng,kinds,originEdge);
    if(destEdge){
      const candidates=[destEdge.a,destEdge.b].filter(id=>id!==fromNode).sort((a,b)=>{
        const aa=nodes.get(a),bb=nodes.get(b);return Math.hypot((bb?.x||0)-(from?.x||0),(bb?.z||0)-(from?.z||0))-Math.hypot((aa?.x||0)-(from?.x||0),(aa?.z||0)-(from?.z||0));
      });
      for(const id of candidates)if(this.g.route(fromNode,id,originEdge)?.length)return id;
    }
    if (this._keys === undefined || this._keysVer !== this.g.version) { this._keys = [...nodes.keys()]; this._keysVer = this.g.version; }
    const keys = this._keys;
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

  makeRoute(rec, dir, purpose = 'general') {
    const startNode = this.g.nodeAhead(rec, dir);
    // A border is a valid destination: the final road need not have a successor.
    if(this.g.portals.some(p=>p.nodeId===startNode))return [{edgeId:rec.id,dir}];
    const dest = this.randomDestNode(startNode,purpose,rec.id);
    let tail = dest >= 0 ? this.g.route(startNode, dest, rec.id) : null;
    if (!tail || !tail.length) {
      const nd = this.g.nodes.get(startNode);
      if (!nd) return null;
      const opts = nd.outs.filter((o) => o.edgeId !== rec.id);
      // A two-way ordinary dead end is a valid route terminus only when the vehicle can visibly
      // turn around. Reusing the same edge in the opposite direction lets beginTurn() construct the
      // lane-to-lane U-turn curve. One-way dead ends remain invalid local spawn routes.
      if (!opts.length) {
        if (rec.oneWay || this.g.laneCount(rec, -dir) < 1) return null;
        tail = [{ edgeId: rec.id, dir: -dir }];
      } else {
      tail = [{ edgeId: opts[this.rng.int(0, opts.length - 1)].edgeId, dir: 0 }];
      const o = nd.outs.find((x) => x.edgeId === tail[0].edgeId);
      tail[0].dir = o.dir;
      }
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
        let d = cand.oneWay ? 1 : (this.rng.bool() ? 1 : -1);
        if(!cand.oneWay&&cand.type==='highway'&&(this.world.time.hour>=21||this.world.time.hour<5)&&this.rng.float()<.8){
          if(g.nodes.get(cand.a)?.arms===1)d=-1;else if(g.nodes.get(cand.b)?.arms===1)d=1;
        }
        const [, n] = g.laneRange(cand, d);
        if (n > 0) { rec = cand; dir = d; }
      }
      if (!rec) return null;
      s = this.rng.float() * rec.len;
    }
    const purpose=opts.purpose||this.tripPurpose(rec);
    const ci = opts.ci !== undefined ? opts.ci : this.pickClass(purpose);
    const cls = this.classes[ci];
    if (cls.count >= cls.cap) return null;
    const route = opts.route || this.makeRoute(rec, dir, purpose);
    if (!route) return null;
    const [l0, ln] = g.laneRange(rec, dir);
    if (ln <= 0) return null;
    const lane = opts.lane ?? (l0 + (cls.big ? 0 : this.rng.int(0, ln - 1)));
    const spec = cls.spec;
    if(!opts.restore){
      const lo=(dir>0?rec.trimA:rec.trimB)+spec.L/2+1.5,hi=rec.len-(dir>0?rec.trimB:rec.trimA)-spec.L/2-1.5;
      if(hi<lo)return null;s=Math.max(lo,Math.min(hi,s));
    }
    const paint = this.paintFor(ci);
    if(!opts.restore)for(const other of this.vehicles.values()){
      if(other.rec.id===rec.id&&other.lane===lane&&Math.abs(other.s-s)<(other.len+spec.L)*.5+Math.max(2.3,rec.speed*.7))return null;
      if(other.turn.active&&other.turn.rec.id===rec.id&&other.turn.lane===lane&&Math.abs(other.turn.start-s)<(other.len+spec.L)*.5+rec.speed)return null;
    }
    if(!opts.restore && ['alley','gravel'].includes(rec.type)){let n=0;for(const other of this.vehicles.values())if(other.rec.id===rec.id)n++;if(n>=Math.floor(rec.len/100))return null;}

    const v = {
      id: this.nextId++, kind: cls.kind, ci, slot: -1,laneChoice:this.rng.int(0,10),
      edgeId: rec.id, rec, dir, lane, prevLane: lane, blend: 1, blendLen: 1,
      s: Math.min(s, rec.len - 0.5), t: 0, v: rec.speed * 0.55,
      v0: rec.speed * (this.world.time.hour>=21||this.world.time.hour<5 ? (this.rng.float()<.2?this.rng.range(.76,.84):this.rng.range(1.04,1.14)) : this.rng.range(.76,1)*(cls.big?.86:1)),
      speedFactor:0, len: spec.L, half: spec.L * 0.5, wheelR: spec.wheelR,
      route, ri: 0, purpose, explicit:!!opts.explicit,loop:!!opts.loop,loopRoute:opts.loop?route.slice():null, external: !!opts.external||g.portals.some(p=>p.nodeId===g.nodeAhead(rec,dir)),
      paint, spin: 0, brake: 0, pitch: 0,
      x: 0, y: 0, z: 0, heading: 0, lightsOn: 0, claim: -1, wait: 0, turn:{active:false,u:0,len:1,points:new Float64Array(12),rec:null,lane:0,dir:1,start:0},
    };
    v.speedFactor=v.v0/rec.speed;
    if(this.world.time.hour>=21||this.world.time.hour<5)v.v=Math.min(rec.speed*1.05,v.v0);
    g.laneAt(rec, lane, dir, v.s, this._p);
    v.x = this._p.x; v.y = this._p.y+.08; v.z = this._p.z;v.heading=Math.atan2(this._p.tx,-this._p.tz);v.speed=v.v;v.t=dir>0?v.s/rec.len:1-v.s/rec.len;
    this.vehicles.set(v.id, v);
    cls.count++; this.stats.spawned++;
    this.world.traffic.vehicles.set(v.id, v);
    return v;
  }

  despawn(id) {
    const v = this.vehicles.get(id);
    if (!v) return false;
    if (v.claim >= 0) { const nd = this.g.nodes.get(v.claim); if (nd && nd.busy === v.id) nd.busy = -1; }
    this.vehicles.delete(id);
    this.world.traffic.vehicles.delete(id);
    this.classes[v.ci].count--; this.stats.despawned++;
    return true;
  }

  spawnExternal() {
    const motorway=this.g.portals.filter(p=>this.g.edges.get(p.out.edgeId)?.type==='highway');
    const ports = (this.world.time.hour>=21||this.world.time.hour<5)&&motorway.length?motorway:this.g.portals;
    if (!ports.length) return null;
    const p = ports[this.rng.int(0, ports.length - 1)];
    const rec = this.g.edges.get(p.out.edgeId);
    if (!rec) return null;
    const dir = this.seeding&&(this.world.time.hour>=21||this.world.time.hour<5)?-p.out.dir:p.out.dir;
    const [, ln] = this.g.laneRange(rec, dir);
    if (ln <= 0) return null;
    const purpose=this.rng.float()<.42?'freight':'general',ci=this.pickClass(purpose);
    return this.spawn({ rec, dir, s: this.seeding ? this.rng.range(20,rec.len-20):1, ci, purpose, external: true });
  }

  // ------------------------------------------------------------------ pedestrians
  spawnPed(opts = {}) {
    const g = this.g;
    if (this.peds.length >= this.pedMesh.cap) return null;
    if (!g.sidewalks.length) return null;
    const w = opts.w || g.randomSidewalk(this.rng);
    const rec = g.edges.get(w.id);
    if (!rec) return null;
    const p = {
      rec, sideNum:w.side, side:w.side>0?'right':'left',kind:'adult',state:'walk',edgeId:rec.id,t:0,speed:0, dir: this.rng.bool() ? 1 : -1,
      s: opts.s !== undefined ? opts.s : this.rng.float() * rec.len,
      v: this.rng.range(1.1, 1.5), phase: this.rng.float(),
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
    const out=this._p;let crossing=0;for(const p of this.peds)if(p.state==='cross')crossing++;
    for(const p of this.peds){
      const r=p.rec,end=r.len-(p.dir>0?r.trimB:r.trimA)-2.5;
      const nodeId=p.dir>0?r.b:r.a,signal=this.g.signals.get(nodeId);
      if(p.state==='cross'){
        p.crossU=Math.min(1,p.crossU+p.v*dt/p.crossLen);
        p.x=p.crossX+(p.crossEndX-p.crossX)*p.crossU;p.z=p.crossZ+(p.crossEndZ-p.crossZ)*p.crossU;p.y=p.crossY+.08;p.speed=p.v;
        if(p.crossU>=1){p.sideNum=-p.sideNum;p.side=p.sideNum>0?'right':'left';p.dir=-p.dir;p.s=r.len-p.s;p.state='walk';this.g.walkAt(r,p.sideNum,p.dir,p.s,out);p.x=out.x-out.tz*p.jitter;p.z=out.z+out.tx*p.jitter;p.y=out.y+.21;p.heading=Math.atan2(out.tx,-out.tz);}
      }else{
        const green=signal?.greenArms.includes(r.id);
        if(p.s>=end){
          if(signal&&green){p.state='wait';p.speed=0;}
          else if(signal&&crossing<Math.floor(this.peds.length*.1)){
            p.s=end;this.g.walkAt(r,p.sideNum,p.dir,p.s,out);p.crossX=out.x;p.crossZ=out.z;p.crossY=out.y;
            this.g.walkAt(r,-p.sideNum,p.dir,p.s,out);p.crossEndX=out.x;p.crossEndZ=out.z;p.crossLen=Math.hypot(out.x-p.crossX,out.z-p.crossZ);p.crossU=0;p.state='cross';p.x=p.crossX;p.z=p.crossZ;p.y=p.crossY+.08;crossing++;p.heading=Math.atan2(out.x-p.crossX,-(out.z-p.crossZ));p.speed=p.v;
          }else if(!signal){p.dir=-p.dir;p.s=r.len-p.s;p.state='walk';this.g.walkAt(r,p.sideNum,p.dir,p.s,out);p.x=out.x-out.tz*p.jitter;p.z=out.z+out.tx*p.jitter;p.y=out.y+.21;p.heading=Math.atan2(out.tx,-out.tz);}
        }else{p.s+=p.v*dt;p.state='walk';p.speed=p.v;}
        if(p.state!=='cross'){this.g.walkAt(r,p.sideNum,p.dir,p.s,out);p.x=out.x-out.tz*p.jitter;p.z=out.z+out.tx*p.jitter;p.y=out.y+.21;p.heading=Math.atan2(out.tx,-out.tz);}
      }
      p.edgeId=r.id;p.t=Math.max(0,Math.min(1,p.dir>0?p.s/r.len:1-p.s/r.len));p.phase=(p.phase+p.speed*dt/1.4)%1;
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
    for(const v of this.vehicles.values()){
      v.advanced=false;this.pose(v);const p=v.previous??(v.previous={});
      p.x=v.x;p.y=v.y;p.z=v.z;p.heading=v.heading;p.pitch=v.pitch;
    }
    g.updateSignals(dt);

    for(const v of this.vehicles.values())if(v.turn.active){this.advanceTurn(v,dt);v.advanced=true;}
    // ---- bucket vehicles by (edge, lane)
    const buckets = g.buckets;
    for (let i = 0; i < buckets.length; i++) buckets[i].length = 0;
    for (const v of this.vehicles.values()) {
      const b = v.rec.bucket + v.lane;
      if (b >= 0 && b < buckets.length) buckets[b].push(v);
    }
    for (let i = 0; i < buckets.length; i++) if (buckets[i].length > 1) buckets[i].sort(this._sortFn);

    const dead = this._dead || (this._dead = []);
    dead.length = 0;
    for (let bi = 0; bi < buckets.length; bi++) {
      const arr = buckets[bi];
      for (let k = arr.length - 1; k >= 0; k--) {
        const v = arr[k];
        if(v.turn.active||v.advanced)continue;
        const rec = v.rec;
        const A = this.classes[v.ci].big ? A_BIG : A_CAR;
        let acc = this.idm(v.v, v.v0, 1e6, v.v, A);

        // leader in the same lane
        const lead = arr[k + 1];
        if (lead) {
          acc = Math.min(acc, this.idm(v.v, v.v0, lead.s - v.s - lead.half - v.half, lead.v, A));
        }

        // distance to the node ahead and to its stop line (the road's trim = edge of the junction box)
        const trimEnd = ((v.dir > 0 ? rec.trimB : rec.trimA)||Math.min(8,rec.len*.2));
        const dEnd = rec.len - v.s - v.half;
        const ringNode=g.nodes.get(g.nodeAhead(rec,v.dir))?.roundabout;
        const dStop = rec.len-trimEnd-(ringNode?1+v.half:Math.max(5.3,1+v.half))-v.s;
        const nodeId = g.nodeAhead(rec, v.dir);
        const nd = g.nodes.get(nodeId);
        if(v.explicit&&v.loop&&!v.route[v.ri+1]){v.route.push(...v.loopRoute);}
        if(v.loopRoute&&v.ri>=v.loopRoute.length){v.route.splice(0,v.loopRoute.length);v.ri-=v.loopRoute.length;}
        const atPortal=g.portals.some(p=>p.nodeId===nodeId);
        if(atPortal)v.external=true;
        let nxt = v.route[v.ri + 1];
        if (!nxt && dEnd < 80 && !v.explicit) {
          // A portal is the only legal invisible lifecycle boundary. Once an external journey
          // reaches one, keep the route finished so the normal end-of-edge path despawns it.
          if (v.external) {
            if (!atPortal && this.extendToPortal(v)) nxt = v.route[v.ri + 1];
          } else if (this.extendRoute(v)) nxt = v.route[v.ri + 1];
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
              nextGap = first.s - first.half - (nxt.dir>0?nrec.trimA:nrec.trimB);
              if (!lead) acc = Math.min(acc, this.idm(v.v, v.v0, dEnd + nextGap, first.v, A));
            }
          }
        }

        if (nd) {
          let block = false;
          if(nxt)for(const other of this.vehicles.values())if(other.id!==v.id&&other.turn.active&&other.turn.rec.id===nxt.edgeId&&other.turn.dir===nxt.dir&&other.turn.lane===this.pickLane(other.turn.rec,nxt.dir,v,v.route[v.ri+2])){block=true;break;}

          const st = g.approachState(nodeId, rec.id, v.dir);
          if (st === 'red') block = true;
          else if (st === 'yellow') block = true;
          else if (st === 'none' && nd.roundabout && !rec.ring) {
            if(dStop<12){
              let circulating=false;for(const other of this.vehicles.values())if(other.id!==v.id&&other.rec.ring&&Math.hypot(other.x-nd.x,other.z-nd.z)<18){circulating=true;break;}
              if(v.v<1)v.yieldWait=(v.yieldWait??0)+dt;
              block=block||circulating||(v.yieldWait??0)<.5;
            }
          } else if (st === 'none' && !nd.roundabout && nd.arms >= 3 && !rec.big) {
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
          if(block){
            const publicRemaining=rec.len-(v.dir>0?rec.trimB:rec.trimA)-5.2-v.s;
            if(!ringNode&&publicRemaining>=0)stop=Math.max(0,Math.min(dStop,publicRemaining-.01));
            else if(dStop>-.6)stop=dStop;
          }
          if (!nxt && !v.external && dEnd < 30) stop = Math.min(stop, dEnd - 1.5);
        }
        if (stop < NO_STOP) acc = Math.min(acc, this.idm(v.v, v.v0, stop, 0, A));

        // integrate
        v.v += acc * dt;
        v.v=Math.min(v.v,rec.speed*1.05);
        if (v.v < 0) v.v = 0;
        if (stop < 0.4 && v.v < 0.7) v.v = 0;
        const moved = v.v * dt;
        v.s += moved;
        if(stop<NO_STOP&&stop>=0&&moved>stop){v.s-=moved-stop;v.v=0;}
        if(lead){const cap=lead.s-lead.half-v.half-Math.max(1.25,.55*v.v);if(v.s>cap){v.s=Math.max(v.s-moved,cap);v.v=Math.min(v.v,lead.v,Math.max(0,(lead.s-lead.half-v.half-v.s)/.55));}}

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

        // Connect the two trimmed lane endpoints through the junction on a cubic curve.
        if(nxt && v.s>=rec.len-trimEnd){
          this.beginTurn(v,nxt);if(v.turn.active)continue;
          v.s=Math.min(v.s,rec.len-trimEnd);v.v=0;
        }
        // advance along the route
        if (v.s >= rec.len) {
          if (!v.route[v.ri + 1] && v.explicit && v.loop) {v.route.push(...v.route.slice(0,v.ri+1));}
          if (!v.route[v.ri + 1]) { dead.push(v.id); continue; }
          const step = v.route[v.ri + 1];
          const nrec = g.edges.get(step.edgeId);
          if (!nrec) { dead.push(v.id); continue; }
          const over = v.s - rec.len;
          const prevIdxFromRight = v.lane - g.laneFirst(rec, v.dir);
          v.ri++;
          v.rec = nrec; v.edgeId = nrec.id; v.dir = step.dir;
          v.s = Math.min(over, nrec.len - 0.4);
          const nl0 = g.laneFirst(nrec, v.dir), nln = g.laneCount(nrec, v.dir);
          if (nln <= 0) { dead.push(v.id); continue; }
          const target = this.pickLane(nrec, v.dir, v, v.route[v.ri + 1]);
          const entry = nl0 + Math.min(nln - 1, prevIdxFromRight);
          v.prevLane = entry;
          v.lane = target;
          v.blend = 1;
          v.blendLen = Math.max(10, Math.min(30, nrec.len * 0.5));
        }
      }
    }
    for (const id of dead) this.despawn(id);
    for(const v of this.vehicles.values()){this.pose(v);if(v.kind==='semi'){const dh=Math.atan2(Math.sin(v.heading-(v.trailerHeading??v.heading)),Math.cos(v.heading-(v.trailerHeading??v.heading)));v.trailerHeading=(v.trailerHeading??v.heading)+Math.sin(dh)*v.v*dt/8.1;v.articulation=Math.max(-1.1,Math.min(1.1,Math.atan2(Math.sin(v.heading-v.trailerHeading),Math.cos(v.heading-v.trailerHeading))));}}
  }

  steerHeading(v,target){
    if(!v.previous)return target;
    const from=v.previous.heading,delta=Math.atan2(Math.sin(target-from),Math.cos(target-from));
    return from+Math.max(-.12,Math.min(.12,delta));
  }
  pose(v){
    if(v.turn.active)return;
    const out=this._p,rec=v.rec;this.g.laneAt(rec,v.lane,v.dir,v.s,out);
    v.x=out.x;v.y=out.y+.08;v.z=out.z;v.heading=this.steerHeading(v,Math.atan2(out.tx,-out.tz));v.speed=v.v;
    v.t=Math.max(0,Math.min(1,v.dir>0?v.s/rec.len:1-v.s/rec.len));
    this.g.laneAt(rec,v.lane,v.dir,Math.min(rec.len,v.s+v.half),out);const front=out.y;
    this.g.laneAt(rec,v.lane,v.dir,Math.max(0,v.s-v.half),out);v.pitch=(front-out.y)/Math.max(.1,Math.min(rec.len,v.s+v.half)-Math.max(0,v.s-v.half));
  }
  beginTurn(v,next){
    const r=this.g.edges.get(next.edgeId);if(!r)return;
    const t=v.turn,start=((next.dir>0?r.trimA:r.trimB)||Math.min(8,r.len*.2)),end=v.rec.len-((v.dir>0?v.rec.trimB:v.rec.trimA)||Math.min(8,v.rec.len*.2));
    const lane=this.pickLane(r,next.dir,v,v.route[v.ri+2]);if(this.g.laneCount(r,next.dir)<1)return;
    // Reserve the receiving lane before committing to a junction curve. A spawn or
    // another approach cannot fill this interval while the vehicle is crossing.
    for(const other of this.vehicles.values()){
      if(other.id===v.id)continue;
      if(other.turn.active&&other.turn.rec.id===r.id&&other.turn.lane===lane)return;
      if(!other.turn.active&&other.rec.id===r.id&&other.lane===lane&&Math.abs(other.s-start)<other.half+v.half+Math.max(2.3,.55*v.v))return;
    }
    const a=this._p,b=this._q;this.g.laneAt(v.rec,v.lane,v.dir,end,a);this.g.laneAt(r,lane,next.dir,start,b);
    const handle=Math.max(1,Math.hypot(b.x-a.x,b.z-a.z)*.42),p=t.points;
    p[0]=a.x;p[1]=a.y+.08;p[2]=a.z;p[3]=a.x+a.tx*handle;p[4]=a.y+.08;p[5]=a.z+a.tz*handle;
    p[6]=b.x-b.tx*handle;p[7]=b.y+.08;p[8]=b.z-b.tz*handle;p[9]=b.x;p[10]=b.y+.08;p[11]=b.z;
    t.arc??=new Float64Array(65);t.arc[0]=0;let px=a.x,pz=a.z;
    for(let i=1;i<=64;i++){const u=i/64,k=1-u,x=k*k*k*p[0]+3*k*k*u*p[3]+3*k*u*u*p[6]+u*u*u*p[9],z=k*k*k*p[2]+3*k*k*u*p[5]+3*k*u*u*p[8]+u*u*u*p[11];t.arc[i]=t.arc[i-1]+Math.hypot(x-px,z-pz);px=x;pz=z;}
    t.len=t.arc[64];t.distance=Math.max(0,v.s-end);t.rec=r;t.lane=lane;t.dir=next.dir;t.start=start;t.sourceEnd=end;t.active=true;v.edgeId=null;this.advanceTurn(v,0);
  }
  advanceTurn(v,dt){
    const t=v.turn,p=t.points;let idx=1;while(idx<64&&t.arc[idx]<t.distance)idx++;
    const u=(idx-1+(t.distance-t.arc[idx-1])/Math.max(.001,t.arc[idx]-t.arc[idx-1]))/64,k=1-u;
    const dx=3*k*k*(p[3]-p[0])+6*k*u*(p[6]-p[3])+3*u*u*(p[9]-p[6]),dz=3*k*k*(p[5]-p[2])+6*k*u*(p[8]-p[5])+3*u*u*(p[11]-p[8]);
    const ddx=6*k*(p[6]-2*p[3]+p[0])+6*u*(p[9]-2*p[6]+p[3]),ddz=6*k*(p[8]-2*p[5]+p[2])+6*u*(p[11]-2*p[8]+p[5]);
    const curvature=Math.abs(dx*ddz-dz*ddx)/Math.max(.001,Math.hypot(dx,dz)**3);
    v.v=Math.min(v.rec.speed*1.05, v.v+1.5*dt,curvature>.001?1.8/curvature:Infinity);
    if(dt>0){
      let cap=t.len;
      for(const other of this.vehicles.values()){
        if(other.id===v.id||other.turn.active||other.rec.id!==t.rec.id||other.lane!==t.lane||other.s<t.start)continue;
        const remaining=t.len-t.distance+other.s-t.start-other.half-v.half;
        v.v=Math.min(v.v,Math.max(0,(remaining-1.25)/Math.max(.55,dt)));
        cap=Math.min(cap,t.len+other.s-t.start-other.half-v.half-Math.max(1.25,.55*v.v));
      }
      const before=t.distance;t.distance=Math.max(before,Math.min(cap,t.len,before+v.v*dt));
      v.spin+=(t.distance-before)/v.wheelR;v.s=t.sourceEnd+t.distance;
      this.advanceTurn(v,0);return;
    }
    v.x=k*k*k*p[0]+3*k*k*u*p[3]+3*k*u*u*p[6]+u*u*u*p[9];v.y=k*p[1]+u*p[10];v.z=k*k*k*p[2]+3*k*k*u*p[5]+3*k*u*u*p[8]+u*u*u*p[11];v.heading=this.steerHeading(v,Math.atan2(dx,-dz));v.speed=v.v;
    if(t.distance>=t.len){v.rec=t.rec;v.v0=t.rec.speed*v.speedFactor;v.v=Math.min(v.v,t.rec.speed*1.05);v.edgeId=t.rec.id;v.dir=t.dir;v.lane=t.lane;v.prevLane=t.lane;v.s=t.start;v.ri++;t.active=false;}
  }

  /** Lane on `rec` in `dir` appropriate for the turn recorded in `next`. index 0 of the range = rightmost. */
  pickLane(rec, dir, v, next) {
    const g = this.g;
    const l0 = g.laneFirst(rec, dir), ln = g.laneCount(rec, dir);
    if (ln <= 1) return l0;
    if(rec.big&&v.rec.big)return l0+Math.max(0,Math.min(ln-1,v.lane-g.laneFirst(v.rec,v.dir)));
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
    return l0 + (v.laneChoice % ln);
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
    const nd = this.g.nodes.get(node);
    if (nd?.degree === 1 && !v.rec.oneWay && this.g.laneCount(v.rec,-v.dir)>0) {
      v.route.push({edgeId:v.rec.id,dir:-v.dir});
      return true;
    }
    const dest = this.randomDestNode(node,v.purpose,v.rec.id);
    if (dest < 0) return false;
    const tail = this.g.route(node, dest, v.rec.id);
    if (!tail || !tail.length) return false;
    for (const s of tail) v.route.push(s);
    if (v.route.length > 60 && v.ri > 0) { v.route.splice(0, v.ri); v.ri = 0; }
    return true;
  }

  seedToTarget(){
    let attempts=0;
    this.seeding=true;
    // Retain local overnight journeys alongside the departing motorway traffic.
    if(this.world.time.hour>=21||this.world.time.hour<5){
      const local=[...this.g.edges.values()].filter(r=>r.type==='avenue'&&r.len<200).sort((a,b)=>{const d=r=>{const n=this.g.nodes.get(r.a),m=this.g.nodes.get(r.b);return Math.hypot((n.x+m.x)/2-40,(n.z+m.z)/2-40);};return d(a)-d(b);});
      for(const [i,rec] of local.slice(0,2).entries())this.spawn({rec,dir:1,ci:i,s:rec.len*.5});
    }
    // Feed each real radial so ring-priority decisions are visible after a density reset.
    if(this.target>=80)for(const node of this.g.nodes.values())if(node.roundabout)for(const arm of node.ins){
      const rec=this.g.edges.get(arm.edgeId);if(rec.ring)continue;
      const dir=rec.b===node.id?1:-1;
      this.spawn({rec,dir,ci:1,s:rec.len-(dir>0?rec.trimB:rec.trimA)-14});
    }
    while(this.vehicles.size<this.target&&attempts++<this.target*40){if(this.g.portals.length&&this.rng.float()<.23)this.spawnExternal();else this.spawn();}
    this.seeding=false;
    while(this.peds.length<this.pedTarget){if(!this.spawnPed())break;}
    this.stepPeds(0);this.render(0);
  }

  // ------------------------------------------------------------------ population control
  balance(dt) {
    const need = Math.round(this.target);
    let n = this.vehicles.size;
    let guard = 0;
    while (n < need && guard++ < 6) {
      const ext = this.g.portals.length && this.rng.float() < 0.22;
      const v = ext ? this.spawnExternal() : this.spawn();
      if (!v) continue;
      n++;
    }
    while(n>need){const v=this.vehicles.values().next().value;this.despawn(v.id);n--;}
    const pneed = Math.round(this.pedTarget);
    guard = 0;
    while (this.peds.length < pneed && guard++ < 8) { if (!this.spawnPed()) break; }
    while (this.peds.length > pneed) { const p = this.peds.pop(); this.world.traffic.pedestrians.delete(p.id); }
  }

  render(dt){return render.call(this,dt);}
  dispose(){return dispose.call(this);}
}
export { MIX, GRID };
