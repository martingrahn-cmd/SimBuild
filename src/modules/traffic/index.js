import { LaneGraph } from './graph.js';
import { Traffic, MIX } from './sim.js';
import { stage, CAMERAS } from './showcase.js';
import { fallbackProfile } from './profile.js';
import { buildMasts, updateMasts, mastGate } from './masts.js';
const S={ctx:null,graph:null,traffic:null,dirty:true,acc:0,steps:0,frozen:false,density:null,reseed:true,profile:{},lastTarget:-1};
function rebuild(){
  S.graph.build();S.dirty=false;
  const t=S.traffic;
  for(const v of t.vehicles.values()){
    const rec=S.graph.edges.get(v.rec.id);
    if(!rec || v.lane>=rec.lanes){t.despawn(v.id);continue;}
    v.rec=rec;v.edgeId=rec.id;v.s=Math.min(v.s,rec.len-0.1);
    if(v.turn.active){const next=S.graph.edges.get(v.turn.rec.id);if(!next){t.despawn(v.id);continue;}v.turn.rec=next;v.edgeId=null;}
  }
  for(let i=t.peds.length-1;i>=0;i--){const p=t.peds[i],r=S.graph.edges.get(p.rec.id);if(!r||!r.swR){t.world.traffic.pedestrians.delete(p.id);t.peds.splice(i,1);}else p.rec=r;}
  buildMasts(S);
  if(!S.graph.edges.size&&!S.warned){S.ctx.log.warn('empty road graph: traffic waiting for roads');S.warned=true;}
  if(S.graph.edges.size) S.warned=false;
}
function population(){
  const h=S.ctx.world.time.hour;
  const p=typeof S.ctx.modules.simulation?.profile==='function'?S.ctx.modules.simulation.profile(h,S.profile):fallbackProfile(h,S.profile);
  const mult=S.density===null?1:S.density;
  const eco=S.ctx.world.economy||{},activity=Math.max(0,eco.population||0)+Math.max(0,eco.jobs||0)*.6;
  // Local fleets scale from actual residents/jobs. Two or more explicit border portals may carry a
  // small through-traffic floor even before settlement; an isolated player road gets exactly zero.
  const through=S.graph.portals.length>=2?Math.min(24,S.graph.portals.length*6):0;
  // A real hamlet still needs enough moving vehicles to read across a player-sized road network.
  // Keep exact zero for a city with no residents/jobs, then add a small local fleet floor that
  // continues to scale from real activity instead of road length or showcase density.
  const localCapacity=activity>0?6+Math.ceil(activity/2):0;
  const vehicleCapacity=Math.min(240,localCapacity+through);
  const pedestrianCapacity=Math.min(260,Math.ceil((Math.max(0,eco.population||0)+Math.max(0,eco.jobs||0)*.25)/2.5));
  S.traffic.target=Math.round(Math.min(240*p.traffic,vehicleCapacity)*mult);
  S.traffic.pedTarget=Math.round(Math.min(260*p.pedestrians,pedestrianCapacity)*mult);
  if(S.reseed && S.traffic.target>0 && S.graph.edges.size){
    S.traffic.rng=S.ctx.rng.fork('traffic:fleet:'+h.toFixed(2));S.traffic.time=0;
    for(const nd of S.graph.nodes.values()){nd.busy=-1;nd.busyUntil=0;}
    S.reseed=false;S.traffic.seedToTarget();
  }
}
function sync(alpha=1){
  const t=S.traffic,w=S.ctx.world.weather;
  t.lightsOn=((w.night??S.ctx.modules.environment?.getNight?.()??0)>0.15||w.rain>0.4)?1:0;
  S.graph.updateSignals();t.render(alpha);updateMasts(S);
}
function stepOne(){
  if(S.dirty||S.graph.dirty)rebuild();population();
  const t=S.traffic,start=performance.now();
  t.balance(0.05);t.step(0.05);t.stepPeds(0.05);t.stepMs=performance.now()-start;
  S.steps++;
}
// Arrange the rush-hour demonstration with real vehicles on its red approach.
function stageQueue(){
  if(S.ctx.world.time.hour<16||S.ctx.world.time.hour>19)return;
  const t=S.traffic,g=S.graph;
  const rec=[...g.edges.values()].find(r=>{const a=g.nodes.get(r.a),b=g.nodes.get(r.b);return Math.abs(a.x-40)<.1&&Math.abs(b.x-40)<.1&&Math.min(a.z,b.z)===40&&Math.max(a.z,b.z)===120;});
  if(!rec)return;const dir=g.nodes.get(rec.a).z>40?1:-1,lane=g.laneFirst(rec,dir),end=rec.len-(dir>0?rec.trimB:rec.trimA);
  for(const v of t.vehicles.values())if(v.rec.id===rec.id)t.despawn(v.id);
  let distance=end-7.5;
  for(const kind of ['hatchback','sedan','suv','taxi']){const ci=MIX.findIndex(m=>m[0]===kind),v=t.spawn({rec,dir,lane,s:distance,ci,restore:true});if(v){v.v=0;v.brake=1;t.pose(v);v.previous=null;distance-=v.len+2.1;}}
  while(t.vehicles.size<t.target)if(!t.spawn())break;
  sync();
}
const api={
  spawnVehicle(kind,route){
    if(!S.traffic)return -1;if(S.dirty||S.graph.dirty)rebuild();
    const ci=MIX.findIndex(m=>m[0]===kind);if(ci<0)return -1;
    const edges=Array.isArray(route)?route:route?.edges;
    const opts={ci};
    if(edges?.length){
      const steps=[];let end=null;
      for(const id of edges){const r=S.graph.edges.get(id);if(!r)return -1;
        const dir=end===null?1:r.a===end?1:r.b===end?-1:0;
        if(!dir||S.graph.laneCount(r,dir)<1)return -1;
        steps.push({edgeId:id,dir});end=dir>0?r.b:r.a;
      }
      opts.rec=S.graph.edges.get(edges[0]);opts.dir=1;opts.s=opts.rec.trimA+3;opts.route=steps;opts.explicit=true;opts.loop=!!route?.loop;
    }
    const v=S.traffic.spawn(opts);sync();return v?.id??-1;
  },
  despawn(id){const ok=S.traffic?.despawn(id)??false;if(ok)sync();return ok;},
  vehicle(id){return S.traffic?.vehicles.get(id)??null;},
  flowGrid(){return S.traffic?.flowApi??null;},
  outsideConnections(){return S.graph?.portals.map(p=>{const r=S.graph.edges.get(p.out.edgeId),d=S.graph.entryDir(r,p.out.dir);return {nodeId:p.nodeId,edgeId:r.id,x:p.x,z:p.z,type:r.type,heading:Math.atan2(d.x,-d.z)};})??[];},
  signalState(nodeId){S.graph?.updateSignals();const s=S.graph?.signals.get(nodeId);return s?{phase:s.phase,greenArms:s.greenArms.slice(),since:s.since,cycle:4320}:null;},
  // Read-only scalar for render owners that only need to know when any signal aspect changed.
  // Updating and hashing once avoids N signalState() calls, each of which would rescan the graph
  // and allocate an object/array. Signal timing and the detailed signalState contract stay unchanged.
  signalKey(){
    if(!S.graph)return 0;
    S.graph.updateSignals();let k=1000;
    for(const s of S.graph.signals.values()){
      k=(k*31+(s.phase|0)+1)>>>0;
      k=(k*31+(s.state==='yellow'?2:s.state==='green'?1:0))>>>0;
      for(const id of s.greenArms)k=(k*31+id)>>>0;
    }
    return k;
  },
  signals(){S.graph?.updateSignals();return S.graph?[...S.graph.signals.values()].map(s=>({nodeId:s.id,x:s.x,z:s.z,arms:s.arms.length,phase:s.phase,greenArms:s.greenArms.slice()})):[];},
  setDensity(v){S.density=v==null?null:Math.max(0,Math.min(1,Number(v)||0));if(S.density===0){for(const id of S.traffic.vehicles.keys())S.traffic.despawn(id);S.traffic.peds.length=0;S.ctx.world.traffic.pedestrians.clear();S.reseed=true;S.traffic.flow.fill(0);}population();sync();},
  density(){return S.density??S.profile.traffic??0;},
  stats(){const t=S.traffic;if(!t)return null;return {...t.stats,byKind:{...t.stats.byKind},vehicles:t.vehicles.size,pedestrians:t.peds.length,byKindTris:t.byKindTris,byLod:{...t.byLod},draws:t.draws+(S.masts?.draws??0),tris:t.submittedTris+(S.masts?.tris??0),targetVehicles:t.target,targetPeds:t.pedTarget,stepMs:t.stepMs??0,cullDistance:1200,signals:S.graph.signals.size,emissive:{head:t.lightsOn*4,tail:t.lightsOn*1.6,brake:t.maxBrake*4.2,mast:S.masts?.visible?7.5:null},textures:0};},
  forceLod(n){S.traffic.forcedLod=n==null?null:Math.max(0,Math.min(2,n|0));sync();},
  step(n=1){for(let i=0;i<Math.max(0,n|0);i++)stepOne();sync();return S.steps;},
  freeze(v){S.frozen=!!v;S.acc=0;},
  debug:{setVisible(layer,v){if(layer in S.traffic.visible)S.traffic.visible[layer]=!!v;sync();},lodHistogram(){return {...S.traffic.byLod};}},
  cropRects({project,width,height,camera}){
    const out={},cp=camera.camera.position;let best=null,dist=Infinity;
    for(const v of S.traffic.vehicles.values()){const p=project(v.x,v.y+0.8,v.z),d=Math.hypot(v.x-cp.x,v.y-cp.y,v.z-cp.z);if(p[2]>-1&&p[2]<1&&p[0]>0&&p[0]<width&&p[1]>0&&p[1]<height&&d<dist){best=v;dist=d;}}
    if(best){const spec=S.traffic.classes[best.ci].spec,pts=[];const c=Math.cos(best.heading),s=Math.sin(best.heading);for(const x of [-spec.HW,spec.HW])for(const z of [-spec.L/2,spec.L/2])for(const y of [0,spec.H??3.3])pts.push(project(best.x+c*x-s*z,best.y+y,best.z+s*x+c*z));const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);let x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;x-=w*.2;y-=h*.2;w*=1.4;h*=1.4;out.lead_vehicle=[Math.max(0,x|0),Math.max(0,y|0),Math.min(width-Math.max(0,x|0),Math.ceil(w)),Math.min(height-Math.max(0,y|0),Math.ceil(h))];}
    for(const r of S.graph.edges.values()){let found=false;for(let i=1;i<r.n-1;i++){const x=r.cx[i],y=r.cy[i]+.08,z=r.cz[i],d=Math.hypot(x-cp.x,y-cp.y,z-cp.z);if(d<200||d>400)continue;const p=project(x,y,z);if(p[2]>-1&&p[2]<1&&p[0]>64&&p[0]<width-64&&p[1]>64&&p[1]<height-64){out.far_asphalt=[p[0]-64,p[1]-64,128,128];found=true;break;}}if(found)break;}
    return out;
  },
  serialize(){const t=S.traffic;return {module:'traffic',version:2,density:S.density,vehicles:[...t.vehicles.values()].map(v=>({kind:v.kind,edgeId:v.rec.id,lane:v.lane,t:v.t,speed:v.speed,dir:v.dir,paint:v.paint,route:v.route,ri:v.ri,loop:v.loop,explicit:v.explicit,external:v.external})),peds:t.peds.map(p=>({edgeId:p.rec.id,side:p.side,t:p.t,dir:p.dir,phase:p.phase}))};},
  deserialize(data){if(data?.module!=='traffic'||!Array.isArray(data.vehicles))return false;if(S.dirty||S.graph.dirty)rebuild();api.setDensity(0);S.density=data.density??null;
    for(const d of data.vehicles){const rec=S.graph.edges.get(d.edgeId),ci=MIX.findIndex(m=>m[0]===d.kind);if(!rec||ci<0)continue;const dir=d.dir??(d.lane<rec.per?1:-1),v=S.traffic.spawn({rec,dir,s:(dir>0?d.t:1-d.t)*rec.len,ci,route:d.route,explicit:d.explicit,loop:d.loop,external:d.external,restore:true,lane:d.lane});if(v){v.v=d.speed;v.paint=d.paint??v.paint;v.ri=d.ri??0;}}
    for(const d of data.peds??[]){const r=S.graph.edges.get(d.edgeId);if(!r?.swR)continue;const p=S.traffic.spawnPed({w:{id:r.id,side:d.side==='right'?1:-1},s:(d.dir>0?d.t:1-d.t)*r.len});if(p){p.dir=d.dir;p.phase=d.phase;}}
    S.reseed=false;S.traffic.stepPeds(0);population();sync();return true;
  },
};
export default {
 name:'traffic',dependencies:['terrain','roads','simulation'],budget:{drawCalls:60,triangles:300000},
 async init(ctx){S.ctx=ctx;S.graph=new LaneGraph(ctx.world,ctx.log,ctx.modules.roads);S.traffic=new Traffic(ctx,S.graph);S.traffic.buildMeshes(240,260);ctx.world.traffic.kinds=Object.freeze(MIX.map(m=>m[0]));ctx.events.on('roads:changed',()=>{S.dirty=true;},'traffic');ctx.events.on('props:changed',()=>mastGate(S),'traffic');ctx.events.on('app:ready',()=>mastGate(S),'traffic');},
 update(dt){if(!S.traffic)return;if(S.dirty||S.graph.dirty)rebuild();population();if(!S.frozen){S.acc+=Math.min(.2,dt);let n=0;while(S.acc>=.05&&n++<4){stepOne();S.acc-=.05;}}sync(S.frozen?1:S.acc/.05);},
 dispose(){S.traffic?.dispose();S.masts?.dispose();S.traffic=null;},api,
 showcase:{description:'Signalised crossroads, a fed roundabout, highway merge and four outside connections with walking pedestrians and a fleet line-up.',cameras:CAMERAS,async setup(ctx){await stage(ctx);rebuild();population();api.step(120);stageQueue();ctx.modules.environment?.hookScene?.();}}
};
