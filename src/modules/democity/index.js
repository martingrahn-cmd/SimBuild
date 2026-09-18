import { RNG } from '../../core/rng.js';
import { makePlan, authorRoads, districtAt, zoneType } from './plan.js';
import { createMaterials, buildLandmarks, clearLandmarks } from './landmarks.js';
const CAMERAS={
 downtown:{position:[220,200,280],target:[0,42,20]},night_downtown:{position:[-5,35,116],target:[-55,25,30]},
 interchange:{position:[720,320,650],target:[420,35,500]},bridge:{position:[220,240,-50],target:[90,5,-290]},
 suburb:{position:[-170,110,630],target:[-320,20,490]},industry:{position:[260,180,-365],target:[160,15,-590]},
 park:{position:[490,85,405],target:[400,18,300]},waterfront:{position:[-190,60,-170],target:[-260,8,-330]},
};
const S={ctx:null,plan:null,P:null,material:null,staged:false,staging:null,stageMs:0,phaseMs:{},warnings:[],own:{drawCalls:0,triangles:0,trees:0,lamps:0,parked:0,vehicles:0,buses:0},fallbacks:{props:false,traffic:false,services:false,transit:false},baseline:null,cached:new Map(),tour:{running:false,index:-1,t:0,loop:true},preroll:{steps:0,population:0,jobs:0,money:0},serviceAttempts:[]};
const clone=d=>d==null?d:JSON.parse(JSON.stringify(d));
function warning(s){S.warnings.push(s);S.ctx.log.warn(s);}
function snapshots(){const out={};for(const k of['terrain','roads','zoning','buildings','services','simulation','props','traffic','transit']){const a=S.ctx.modules[k];if(typeof a?.serialize==='function')out[k]=clone(a.serialize());}return out;}
function restore(d,{freshRoadIds=false}={}){
 if(freshRoadIds&&d.roads!=null&&typeof S.ctx.modules.roads?.reset==='function')S.ctx.modules.roads.reset(clone(d.roads));
 for(const k of['terrain','roads','zoning','buildings','services','simulation','props','traffic','transit']){
  if(k==='roads'&&freshRoadIds)continue;
  if(d[k]!=null)S.ctx.modules[k]?.deserialize?.(clone(d[k]));
 }
}
function reserveServices(P){
 const a=S.ctx.modules.services,R=S.ctx.world.roads;if(typeof a?.validate!=='function'||typeof a?.catalog!=='function')return [];
 const kinds=[...Array(3).fill('power_coal'),...Array(4).fill(['water_pump','sewage']).flat(),...Array(2).fill('incinerator'),...Array(2).fill('hospital'),'university',...Array(3).fill('clinic'),'high_school',...Array(7).fill('school'),'police','fire',...Array(3).fill('park_small')],sites=[];
 const overlaps=(x,z,w,d)=>P.reserved.some(s=>Math.abs(s.x-x)<(s.w+w)/2+8&&Math.abs(s.z-z)<(s.d+d)/2+8);
 for(const[kind,index]of kinds.map((k,i)=>[k,i])){
  const def=a.catalog()[kind],f=def.footprint,choices=[];
  for(const e of R.edges.values()){if(['highway','ramp'].includes(e.type))continue;for(const t of[.15,.28,.4,.5,.6,.72,.85])for(const side of[-1,1]){
   const q=R.sample(e.id,t);if(!q)continue;const heading=q.heading??Math.atan2(q.tangent?.x??0,-(q.tangent?.z??-1));
   // Road sample returns heading along the road. Front direction points back toward the road.
   const h=heading+side*Math.PI/2,x=q.x+Math.sin(h)*(e.width/2+f.d/2+4),z=q.z-Math.cos(h)*(e.width/2+f.d/2+4),front=h+Math.PI;
   if(overlaps(x,z,Math.max(f.w,f.d),Math.max(f.w,f.d)))continue;if(x>265&&x<535&&z>200&&z<400&&kind!=='park_small')continue;if(['power_coal','incinerator'].includes(kind)&&z>-430)continue;if(kind==='water_pump'){let near=false;for(let a=0;a<16;a++){const t=a*Math.PI/8;if(S.ctx.world.terrain.isWater(x+50*Math.cos(t),z+50*Math.sin(t)))near=true;}if(!near)continue;}const v=a.validate(kind,x,z,front);if(!v.ok)continue;
   const target=kind==='power_coal'||kind==='incinerator'?[100+index*40,-570]:kind==='water_pump'||kind==='sewage'?[-350+(index%6)*140,-280]:kind==='hospital'?[index%2?-180:280,220]:kind==='university'?[0,300]:kind==='school'?[[-300,300],[350,450],[-300,680],[340,730],[0,120],[-320,100],[200,200]][sites.filter(s=>s.kind==='school').length%7]:kind==='clinic'?[[-300,500],[350,650],[0,120]][sites.filter(s=>s.kind==='clinic').length%3]:kind==='park_small'?[Math.cos(index*2)*300,220+Math.sin(index*2)*250]:[0,180];
   choices.push({kind,x,z,heading:front,w:Math.max(f.w,f.d)+8,d:Math.max(f.w,f.d)+8,score:Math.hypot(x-target[0],z-target[1]),cost:def.cost});
  }}
  choices.sort((a,b)=>a.score-b.score);const s=choices[0];if(s){sites.push(s);P.reserved.push(s);}else warning(`No valid reserved ${kind} site`);
 }
 return sites;
}
function stageTransit(){const ctx=S.ctx,a=ctx.modules.transit,p=S.plan;if(!p||typeof a?.createLine!=='function'||typeof a?.addStop!=='function')return false;
 if(S.lineId!=null&&ctx.world.transit.lines.has(S.lineId))return true;
 const ids=[],R=ctx.world.roads;for(const stop of p.transit.stops){let id=stop.id;if(!ctx.world.transit.stops.has(id)){
  // Frontage exists only after the roads owner's rebuild. Choose an actual legal boarding edge.
  const candidates=[];for(const e of R.edges.values()){if(!['street','avenue','alley'].includes(e.type)||e.oneWay||e.length<(e.trimA||0)+(e.trimB||0)+20)continue;for(const t of[.3,.5,.7]){const q=R.sample(e.id,t),distance=Math.hypot(q.x-stop.x,q.z-stop.z);if(distance<180)candidates.push({q,e,distance});}}
  candidates.sort((a,b)=>a.distance-b.distance);for(const {q,e}of candidates){if(ids.some(id=>ctx.world.transit.stops.get(id)?.edgeId===e.id))continue;id=a.addStop(q.x,q.z,{name:stop.name,mode:'bus',side:'right',edgeId:e.id});if(id!=null)break;}
 }if(id!=null){const actual=ctx.world.transit.stops.get(id);stop.id=id;stop.x=actual.x;stop.z=actual.z;ids.push(id);}}
 if(ids.length!==8){warning(`Transit accepted ${ids.length}/8 stops`);return false;}
 const id=a.createLine('bus',ids,{name:p.transit.lineName,color:p.transit.colour,vehicles:4,fare:2});S.lineId=id;
 const line=id==null?null:ctx.world.transit.lines.get(id);p.transit.routeM=line?.lengthM??line?.length??line?.routeM??0;
 if(id==null)warning('Transit could not route the closed Central Circle');return id!=null;
}
function stats(){const w=S.ctx?.world;if(!w)return {stageMs:0,buildings:0};const byType={street:0,avenue:0,highway:0,alley:0,gravel:0,ramp:0};let lengthM=0,bridges=0;for(const e of w.roads.edges.values()){byType[e.type]=(byType[e.type]||0)+1;lengthM+=e.length||0;if(e.bridge)bridges++;}const zones={cells:w.zones.cells.size,lots:w.zones.lots.size,byType:{residential:0,commercial:0,industrial:0,office:0}};for(const c of w.zones.cells.values())zones.byType[c.type]=(zones.byType[c.type]||0)+1;
 return {stageMs:S.stageMs,phaseMs:{...S.phaseMs},districts:S.plan?.districts.length||0,landmarks:S.plan?.landmarks.length||0,roads:{nodes:w.roads.nodes.size,edges:w.roads.edges.size,lengthM,byType,bridges,ramps:byType.ramp},zones,buildings:w.buildings.items.size,services:w.services.items.size,transitLines:w.transit.lines.size,transitStops:w.transit.stops.size,own:{...S.own},fallbacks:{...S.fallbacks},preroll:{...S.preroll},serviceAttempts:clone(S.serviceAttempts),warnings:S.warnings.slice()};}
async function stage({seed=S.ctx.world.seed,density=1}={}){
 if(S.staging)return S.staging;
 S.staging=(async()=>{await Promise.resolve();const ctx=S.ctx,start=performance.now();let mark=start;const phase=n=>{const now=performance.now();S.phaseMs[n]=now-mark;mark=now;};S.warnings=[];S.phaseMs={};S.serviceAttempts=[];S.tour.running=false;
 try{
  const key=`${seed}:${density}`;
  if(S.cached.has(key)){const c=S.cached.get(key);restore(c.owners);S.plan=clone(c.plan);S.own=buildLandmarks(ctx,S.plan,S.material);S.preroll=clone(c.preroll);S.staged=true;phase('restore');return stats();}
  if(!S.baseline)S.baseline=snapshots();else restore(S.baseline,{freshRoadIds:seed!==ctx.world.seed});
  // A different authored seed needs the terrain owner's actual generated surface before roads,
  // zoning and buildings derive their legal sites. The original page seed remains untouched.
  if(seed!==ctx.world.seed&&typeof ctx.modules.terrain?.regenerate==='function')ctx.modules.terrain.regenerate(seed);
  S.plan=null;S.staged=false;S.lineId=null;clearLandmarks(ctx);
  const rng=new RNG(seed,'democity/layout');S.P=makePlan(ctx,seed,density,rng);S.plan=S.P.p;phase('plan');
  if(!S.material)S.material=createMaterials(ctx);phase('assets');
  S.fallbacks={props:typeof ctx.modules.props?.rebuild!=='function',traffic:typeof ctx.modules.traffic?.spawnVehicle!=='function',services:typeof ctx.modules.services?.place!=='function',transit:typeof ctx.modules.transit?.createLine!=='function'};
  for(const[k,v]of Object.entries(S.fallbacks))if(v)warning(`${k} capability unavailable; optional layer absent`);
  authorRoads(ctx,S.P);ctx.modules.roads?.rebuild?.();phase('roads');
  const sites=reserveServices(S.P);phase('serviceReservations');
  // Newly added roads have not had an update frame. Refresh their public frontage before the one bulk paint.
  ctx.modules.zoning?.refresh?.();
  ctx.modules.zoning?.bulk?.(({rect})=>{for(let z=-948;z<=948;z+=8)for(let x=-948;x<=948;x+=8){
   if(ctx.world.terrain.isWater(x,z))continue;
   // Physical pedestrian forecourt keeps the fixed street/closeup camera positions outside walls.
   if(Math.hypot(x-86,z-77)<21||Math.hypot(x-78,z-105)<16||Math.hypot(x-46,z-84)<12)continue;
   if(x>280&&x<520&&z>220&&z<380)continue;
   if(S.P.reserved.some(s=>Math.abs(x-s.x)<s.w/2+9&&Math.abs(z-s.z)<s.d/2+9))continue;
   if(Math.hypot(x,z)>430&&density<1&&rng.float()>density)continue;
   if(ctx.world.terrain.getSlope(x,z)>.38)continue;const[type,dens]=zoneType(S.P,x,z);rect(x-.01,z-.01,x+.01,z+.01,type,dens);
  }});ctx.modules.zoning?.setOverlayVisible?.(false);phase('zones');
  // Founders Park is deliberately excluded from zoning. Add its real large-park service only after
  // the accepted parcel allocation, so the public space gains gameplay value without perturbing any
  // established road, lot or building identity elsewhere in the city.
  const parkDef=ctx.modules.services?.catalog?.().park_large,parkX=460,parkZ=268,parkHeading=0;
  if(parkDef){const v=ctx.modules.services?.validate?.('park_large',parkX,parkZ,parkHeading);if(v?.ok){const f=parkDef.footprint;sites.push({kind:'park_large',x:parkX,z:parkZ,heading:parkHeading,w:Math.max(f.w,f.d)+8,d:Math.max(f.w,f.d)+8,score:0,cost:parkDef.cost});}else warning(`Founders Park placement rejected (${v?.reason??'unknown'})`);}
  const lots=[...ctx.world.zones.lots.values()].sort((a,b)=>Math.hypot(a.x,a.z)-Math.hypot(b.x,b.z));
  // Use the buildings owner's real mixed-use programme on a bounded set of central avenue lots.
  // These remain ordinary residential/office buildings with unchanged simulation capacity rules.
  const mixedUseLotIds=[];for(const lot of lots){const edge=ctx.world.roads.edges.get(lot.edgeId);if(lot.density!=='high'||!['residential','office'].includes(lot.type)||edge?.type!=='avenue'||Math.hypot(lot.x,lot.z-20)>300)continue;lot.mixedUse=true;mixedUseLotIds.push(lot.id);}S.plan.mixedUseLotIds=mixedUseLotIds;
  // Both showcase aliases require the same first neighbourhood before its real growth simulation.
  if(ctx.world.buildings.items.size<400)ctx.modules.buildings?.spawnFreeLots?.(400-ctx.world.buildings.items.size);
  // Grow the first native neighbourhood before paying for the final expansion.
  const sim=ctx.modules.simulation;sim?.showPanel?.(false);sim?.setTaxRate?.(.12);
  for(const b of ctx.world.buildings.items.values())if(b.density==='high')ctx.modules.buildings?.setLevel?.(b.id,b.type==='residential'?5:3);
  ctx.modules.buildings?.flush?.();
  let steps=0;while(typeof sim?.step==='function'&&ctx.world.economy.population<8000&&steps<144000){if(ctx.world.economy.money<10000){const e=ctx.world.economy,owed=(e.loans||[]).reduce((a,l)=>a+l.remaining,0),amount=Math.min(30000,Math.floor((e.loanCapacity-owed)/1000)*1000);if(amount<=0||!sim.takeLoan(amount,365))break;}sim.step(240);steps+=240;}
  phase('settlementGrowth');
  for(const lot of lots){if(ctx.world.buildings.items.size>=1800)break;if(lot.buildingId!=null&&ctx.world.buildings.items.has(lot.buildingId))continue;ctx.modules.buildings?.requestSpawn?.(lot);}
  // Zoning events may have filled the lots before their authored programme was known. Recreate only
  // this final bounded set through the public owner API once the complete lot table is stable.
  for(const id of mixedUseLotIds){const lot=ctx.world.zones.lots.get(id);if(!lot)continue;lot.mixedUse=true;const r=Math.hypot(lot.x,lot.z-20);lot.level=r<150?5:r<280?4:3;if(lot.buildingId!=null)ctx.modules.buildings?.demolish?.(lot.buildingId);ctx.modules.buildings?.requestSpawn?.(lot);}
  for(const b of ctx.world.buildings.items.values()){const r=Math.hypot(b.x,b.z-20);const level=b.type==='industrial'?2:r<150?5:r<280?4:r<450?3:r<600?3:2;ctx.modules.buildings?.setLevel?.(b.id,level);}
  ctx.modules.buildings?.flush?.();phase('buildings');
  S.own=buildLandmarks(ctx,S.plan,S.material);
  const totalCost=sites.reduce((n,s)=>n+s.cost,0),e=ctx.world.economy;if(e.money<totalCost+25000){const owed=(e.loans||[]).reduce((n,l)=>n+l.remaining,0),amount=Math.min(Math.ceil((totalCost+25000-e.money)/1000)*1000,Math.floor((e.loanCapacity-owed)/1000)*1000);if(amount>0)sim?.takeLoan?.(amount,365);}
  for(const s of sites){const before=ctx.world.economy.money,id=ctx.modules.services?.place?.(s.kind,s.x,s.z,s.heading);S.serviceAttempts.push({kind:s.kind,x:s.x,z:s.z,id:id??null,cost:s.cost,before,after:ctx.world.economy.money});if(id==null)warning(`${s.kind} placement rejected (${ctx.modules.services?.validate?.(s.kind,s.x,s.z,s.heading)?.reason??'funds'})`);}
  ctx.modules.services?.flush?.();phase('landmarksServices');
  stageTransit();phase('transit');
  ctx.modules.props?.setDensity?.(.65);
  // setDensity rebuilds an existing forest; an initial deferred owner still needs its first public build.
  if(!ctx.modules.props?.count?.())ctx.modules.props?.rebuild?.();
  // Landscape the physical public forecourt and landmark footprints through the props owner.
  const removed=[];for(const v of [...ctx.world.props.items.values()])if(v.kind.startsWith('tree')&&(Math.hypot(v.x-86,v.z-77)<18||Math.hypot(v.x-78,v.z-105)<14||Math.hypot(v.x-46,v.z-84)<12||(v.x>-35&&v.x<55&&Math.abs(v.z-(60+(v.x+40)*24/86))<11)||S.plan.landmarks.some(l=>Math.abs(v.x-l.x)<l.w/2+3&&Math.abs(v.z-l.z)<l.d/2+3))){if(ctx.modules.props?.remove?.(v.id))removed.push(v.id);}const planted=[],park=S.plan.districts.find(d=>d.kind==='park'),species=['oak','birch','maple','beech','spruce','pine','willow'];let trees=[...ctx.world.props.items.values()].filter(v=>v.kind.startsWith('tree')&&Math.abs(v.x-park.x)<park.w/2&&Math.abs(v.z-park.z)<park.d/2).length;
  for(let z=park.z-park.d/2+9;z<park.z+park.d/2-8&&trees<126;z+=12)for(let x=park.x-park.w/2+9;x<park.x+park.w/2-8&&trees<126;x+=12){const q={x:x+rng.range(-3,3),z:z+rng.range(-3,3)},sp=species[(planted.length+trees)%species.length];if(S.plan.landmarks.some(l=>Math.abs(q.x-l.x)<l.w/2+6&&Math.abs(q.z-l.z)<l.d/2+6))continue;const id=ctx.modules.props?.place?.(['spruce','pine'].includes(sp)?'tree_pine':'tree_oak',q.x,q.z,{species:sp,heading:rng.range(0,Math.PI*2),scale:rng.range(.75,1.12)});if(id>=0){planted.push(id);trees++;}}
  S.plan.landscaping={forestDensity:.65,removedTreeIds:removed,plantedParkTreeIds:planted};
  // Democity's manual removals/plants alter the clearance field after the density rebuild. Canonicalise
  // once after the complete landscaping transaction so later owner rebuilds and undo/restore do not
  // discover 49 previously unfilled placements or assign new generated identities.
  ctx.modules.props?.rebuild?.();ctx.modules.traffic?.step?.(60);phase('propsTraffic');
  // Refresh real coverage/occupancy after final services, using a fixed deterministic extra hour.
  sim?.step?.(100);steps+=100;
  S.preroll={method:'public simulation.step; deterministic initial settlement before final service expansion',steps,population:ctx.world.economy.population,jobs:ctx.world.economy.jobs,money:ctx.world.economy.money,net:ctx.world.economy.net,taxRate:ctx.world.economy.taxRate,loans:clone(ctx.world.economy.loans),milestones:clone(ctx.world.economy.milestones)};phase('simulation');
  if(S.preroll.population<8000)warning(`Bounded real pre-roll ended at ${S.preroll.population} people (${steps} steps)`);
  if(!ctx.world.flags.weather)ctx.modules.environment?.setWeather?.({cloudiness:.38,rain:0,fogDensity:.00004});ctx.modules.effects?.setPreset?.('clean');ctx.modules.environment?.hookScene?.();ctx.modules.ui?.setCityName?.('Lindham');ctx.modules.ui?.dismissTransientNotifications?.();S.staged=true;phase('finish');
  // Exact owner snapshots make repeat restages preserve owner IDs and accumulated cut/fill.
  if(S.cacheRequested)S.cached.set(key,{owners:snapshots(),plan:clone(S.plan),preroll:clone(S.preroll)});
 }catch(e){warning(`Staging partial: ${e?.message||e}`);}
 finally{S.stageMs=performance.now()-start;S.staging=null;ctx.events.emit('democity:staged',{ms:S.stageMs,stats:stats()});}
 return stats();})();return S.staging;
}
function makeTour(){const names=['Central skyline','Night on Central Avenue','Hillcrest interchange','Two river banks','Birch Gardens','Northbank Works','Founders Park','River Walk'];return Object.entries(CAMERAS).map(([id,camera],i)=>({id,name:names[i],hour:i===1?22:i===4?6.5:i===7?17.5:12,seconds:7,camera:clone(camera)}));}
const TOUR=makeTour();
function tour(){return clone(TOUR);}
function gotoStop(i,fly=false){const t=TOUR;i=Number(i)|0;if(!t[i]||!S.ctx)return false;S.tour.index=i;S.tour.t=0;const v=t[i];S.ctx.clock.set(v.hour);if(fly)S.ctx.camera.flyTo(v.camera,2);else S.ctx.camera.apply(v.camera);S.ctx.events.emit('democity:tour',{stop:v.id,index:i,total:t.length,seconds:v.seconds});return true;}
const api={plan:()=>clone(S.plan),districtAt:(x,z)=>districtAt(S.plan,x,z),stats,fallbacks:()=>({...S.fallbacks}),tour,gotoStop,
 startTour({loop=true,from=0}={}){if(!S.staged||!gotoStop(from,true))return false;S.tour.running=true;S.tour.loop=!!loop;return true;},stopTour(){S.tour.running=false;if(S.ctx)S.ctx.camera.apply({position:S.ctx.camera.position.toArray(),target:S.ctx.camera.target.toArray()});},tourState:()=>({running:S.tour.running,index:S.tour.index,stop:TOUR[S.tour.index]?.id??null,t:S.tour.t}),
 restage(o={}){if(S.staged&&!S.cacheRequested){S.cached.set(`${S.plan.seed}:${S.plan.density}`,{owners:snapshots(),plan:clone(S.plan),preroll:clone(S.preroll)});S.cacheRequested=true;}return stage({seed:Number.isInteger(o.seed)&&o.seed>=0?o.seed:S.ctx.world.seed,density:Number.isFinite(o.density)?Math.min(1,Math.max(0,o.density)):1});},
 cropRects({project,width,height,camera}){
  const out={};if(!S.staged)return out;const T=S.ctx.world.terrain,R=S.ctx.world.roads,bs=[...S.ctx.world.buildings.items.values()];
  const rect=(x,y,z,size)=>{const p=project(x,y,z);return p&&p[2]>=-1&&p[2]<=1&&p[0]>size/2&&p[1]>size/2&&p[0]<width-size/2&&p[1]<height-120-size/2?[Math.round(p[0]-size/2),Math.round(p[1]-size/2),size,size]:null;};
  // Paired samples are physical asphalt locations, classified by a geometric ray toward the actual sun.
  const sun=S.ctx.world.weather.sunDir,shadowed=(x,y,z)=>{if(!sun||sun.y<=0)return false;for(const b of bs){if(Math.hypot(b.x-x,b.z-z)>300)continue;const c=Math.cos(b.heading),s=Math.sin(b.heading),ox=c*(x-b.x)+s*(z-b.z),oz=s*(x-b.x)-c*(z-b.z),dx=c*sun.x+s*sun.z,dz=s*sun.x-c*sun.z;let lo=.1,hi=300;for(const [o,v,mn,mx]of[[ox,dx,-b.footprint.w/2,b.footprint.w/2],[y,sun.y,b.y,b.y+b.height],[oz,dz,-b.footprint.d/2,b.footprint.d/2]]){if(Math.abs(v)<1e-6){if(o<mn||o>mx){hi=-1;break;}}else{let a=(mn-o)/v,d=(mx-o)/v;if(a>d)[a,d]=[d,a];lo=Math.max(lo,a);hi=Math.min(hi,d);}}if(hi>=lo)return true;}return false;};
  const picked={};for(let z=-20;z<=150;z+=5)for(let x=-40;x<=150;x+=5){if(R.isRoad(x,z)<.8)continue;const hit=R.nearestEdge(x,z,6);if(!hit||hit.t<.2||hit.t>.8)continue;const y=(S.ctx.modules.roads?.surfaceHeightAt?.(x,z)??T.getHeight(x,z))+.04,r=rect(x,y,z,40);if(!r||r[0]<220)continue;const name=shadowed(x,y,z)?'shadow_patch':'sun_patch',cost=Math.hypot(r[0]+20-width*.56,(r[1]+20-height*.57)*.7);if(!picked[name]||cost<picked[name].cost)picked[name]={r,cost};}
  for(const name of['sun_patch','shadow_patch'])if(picked[name])out[name]=picked[name].r;
  // One native street-lamp kit, with both crop centres on its real head and the asphalt directly below it.
  for(const l of S.ctx.world.props.items.values()){if(l.kind!=='streetlamp'||Math.hypot(l.x+40,l.z-60)>180)continue;const x=l.x+1.81*Math.sin(l.heading||0),z=l.z-1.81*Math.cos(l.heading||0),head=rect(x,l.y+9.03,z,24),pool=rect(x,Math.max(T.getHeight(x,z),S.ctx.modules.roads?.surfaceHeightAt?.(x,z)??-Infinity)+.025,z,40);if(head&&pool){out.lamp_head=head;out.lamp_pool=pool;break;}}
  return out;
 },
 serialize:()=>({module:'democity',version:1,seed:S.plan?.seed??S.ctx?.world.seed,staged:S.staged,plan:clone(S.plan)}),
 deserialize(d){if(d?.module!=='democity'||d.version!==1||typeof d.staged!=='boolean'||d.plan&&!Array.isArray(d.plan.landmarks))return false;S.tour.running=false;S.plan=clone(d.plan);S.staged=d.staged;clearLandmarks(S.ctx);if(S.plan&&S.staged){if(!S.material)S.material=createMaterials(S.ctx);S.own=buildLandmarks(S.ctx,S.plan,S.material);}else S.own={drawCalls:0,triangles:0,trees:0,lamps:0,parked:0,vehicles:0,buses:0};return true;},
};
export default{name:'democity',dependencies:['terrain','roads','zoning','buildings','props','traffic','simulation','services'],budget:{drawCalls:130,triangles:300000},
 async init(ctx){S.ctx=ctx;ctx.events.on('module:ready',({module})=>{if(S.staged&&module==='transit'&&typeof ctx.modules.transit?.createLine==='function'){S.fallbacks.transit=false;stageTransit();}},'democity');ctx.log.info('Lindham author ready; no city staged during init');},
 update(dt){if(!S.tour.running)return;S.tour.t+=dt;const t=TOUR;if(S.tour.t>=t[S.tour.index].seconds){const i=S.tour.index+1;if(i<t.length)gotoStop(i,true);else if(S.tour.loop)gotoStop(0,true);else S.tour.running=false;}},
 dispose(ctx){ctx.events.offOwner('democity');clearLandmarks(ctx);S.material?.dispose();S.material=null;S.ctx=null;S.cached.clear();S.baseline=null;},api,
 showcase:{description:'Lindham: a river city with a graded centre, gardens, Northbank industry, civic landmarks and a real Central Circle bus service.',cameras:CAMERAS,async setup(){await stage();}},
};
