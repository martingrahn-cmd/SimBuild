import {VIEWS,SOURCES} from './views.js';
export const SIZE=256,COUNT=65536,CELL=8;
export const clamp=v=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0));
export function index(x,z){return Math.max(0,Math.min(255,Math.floor((z+1024)/8)))*256+Math.max(0,Math.min(255,Math.floor((x+1024)/8)));}
export function sample(g,x,z){if(!g)return 0;const u=Math.max(0,Math.min(255,(x+1024)/8-.5)),v=Math.max(0,Math.min(255,(z+1024)/8-.5)),a=Math.floor(u),b=Math.floor(v),f=u-a,h=v-b,j=b*256+a;return (g[j]*(1-f)+g[b*256+Math.min(255,a+1)]*f)*(1-h)+(g[Math.min(255,b+1)*256+a]*(1-f)+g[Math.min(255,b+1)*256+Math.min(255,a+1)]*f)*h;}
function splat(num,den,x,z,r,value){const x0=Math.max(0,Math.floor((x-r+1024)/8)),x1=Math.min(255,Math.floor((x+r+1024)/8)),z0=Math.max(0,Math.floor((z-r+1024)/8)),z1=Math.min(255,Math.floor((z+r+1024)/8)),r2=r*r;for(let iz=z0;iz<=z1;iz++)for(let ix=x0;ix<=x1;ix++){const dx=-1020+ix*8-x,dz=-1020+iz*8-z,d=(dx*dx+dz*dz)/r2;if(d>=1)continue;const w=(1-d)*(1-d),i=iz*256+ix;num[i]+=value*w;den[i]+=w;}}
function kernel(x,z,r){
 const indices=[],weights=[],r2=r*r;
 for(let iz=Math.max(0,Math.floor((z-r+1024)/8));iz<=Math.min(255,Math.floor((z+r+1024)/8));iz++)
  for(let ix=Math.max(0,Math.floor((x-r+1024)/8));ix<=Math.min(255,Math.floor((x+r+1024)/8));ix++){
   const dx=-1020+ix*8-x,dz=-1020+iz*8-z,d=(dx*dx+dz*dz)/r2;if(d>=1)continue;
   indices.push(iz*256+ix);weights.push((1-d)*(1-d));
  }
 return {indices:new Uint32Array(indices),weights:new Float64Array(weights)};
}
function applyKernel(num,k,value){for(let j=0;j<k.indices.length;j++)num[k.indices[j]]+=value*k.weights[j];}
// Keep full-grid kernels small and monomorphic so the first explicit rebuild
// does not optimize one large twelve-way dispatch loop midway through its work.
function copyClamped(out,input){for(let i=0;i<COUNT;i++)out[i]=clamp(input[i]);}
function addClamped(out,a,b){for(let i=0;i<COUNT;i++)out[i]=clamp(a[i]+b[i]);}
function normalizeClamped(out,den){for(let i=0;i<COUNT;i++)out[i]=den[i]?clamp(out[i]/den[i]):0;}
function normalizeRaw(out,den){for(let i=0;i<COUNT;i++)out[i]=den[i]?out[i]/den[i]:0;}
function maximum2(out,a,b){for(let i=0;i<COUNT;i++)out[i]=Math.max(a[i],b[i]);}
function maximum3(out,a,b,c){for(let i=0;i<COUNT;i++)out[i]=Math.max(a[i],b[i],c[i]);}
function subtractClamped(out,a){for(let i=0;i<COUNT;i++)out[i]=clamp(out[i]-a[i]);}
export class Data {
 constructor(ctx){this.ctx=ctx;this.grids=Object.fromEntries(VIEWS.map(v=>[v.id,new Float32Array(COUNT)]));this.den=new Float32Array(COUNT);this.collect=new Float32Array(COUNT);this.mask=new Uint8Array(COUNT);this.points=[];this.central=new Map();this.roadVersion=-1;this.count=0;this.cachedStats={};this.fallback=ctx.rng.fork('fallback').float();this.sources=Object.fromEntries(SOURCES.map(([k,x,z])=>[k,{x,z}]));this.coverageFields=new Map();this.coverageKey=null;this.zero=new Float32Array(COUNT);this.stockKey=null;this.kernels=new Map();this.denominators={};}
 coverage(kind,x,z){const S=this.ctx.world.services;if(S.items.size)return clamp(S.coverage(kind,x,z));const p=this.sources[kind];if(!p)return 0;const dx=x-p.x,dz=z-p.z,d=(dx*dx+dz*dz)/270400;return d<1?(1-d)*(1-d):0;}
 coverageField(kind){
  if(this.coverageFields.has(kind))return this.coverageFields.get(kind);
  if(!this.ctx.world.services.items.size&&!this.sources[kind])return this.zero;
  const g=new Float32Array(COUNT);for(let i=0;i<COUNT;i++)g[i]=this.coverage(kind,-1020+i%256*8,-1020+Math.floor(i/256)*8);
  this.coverageFields.set(kind,g);return g;
 }
 stockKernels(records){
  const key=records.map(({b})=>[b.id,b.x,b.z].join(',')).join(';');if(key===this.stockKey)return;
  this.stockKey=key;this.kernels.clear();for(const radius of[60,70,90])this.denominators[radius]=new Float32Array(COUNT);
  for(const {b}of records){const kernels={};for(const radius of[60,70,90]){const k=kernel(b.x,b.z,radius);kernels[radius]=k;applyKernel(this.denominators[radius],k,1);}this.kernels.set(b.id,kernels);}
 }
 roads(){const R=this.ctx.world.roads;if(this.roadVersion===R.version)return;this.roadVersion=R.version;this.points.length=0;this.mask.fill(0);this.central.clear();const nodes=[...R.nodes.keys()],N=nodes.length,counts=new Map([...R.edges.keys()].map(k=>[k,0]));for(const origin of nodes){const dist=new Map(nodes.map(n=>[n,Infinity])),prev=new Map(),todo=new Set(nodes);dist.set(origin,0);while(todo.size){let u=null,best=Infinity;for(const n of todo)if(dist.get(n)<best){best=dist.get(n);u=n;}if(u===null)break;todo.delete(u);for(const eid of R.nodes.get(u).edges){const e=R.edges.get(eid);if(!e)continue;const v=e.a===u?e.b:e.a;if(!todo.has(v))continue;const d=best+e.length,old=dist.get(v),p=prev.get(v);if(d<old-1e-7||(Math.abs(d-old)<1e-7&&String(eid)<String(p?.edge))){dist.set(v,d);prev.set(v,{node:u,edge:eid});}}}for(const dest of nodes){let p=dest,guard=0;while(p!==origin&&prev.has(p)&&guard++<N){const q=prev.get(p);counts.set(q.edge,counts.get(q.edge)+1);p=q.node;}}}for(const [id,n] of counts)this.central.set(id,N>1?n/(N*(N-1)):0);const dummy=new Float32Array(COUNT),den=new Float32Array(COUNT);for(const e of R.edges.values()){const n=Math.max(1,Math.ceil(e.length/4));for(let k=0;k<=n;k++){const p=R.sample(e.id,k/n);if(!p)continue;this.points.push({x:p.x,z:p.z,e});if(k%4===0||k===n)splat(dummy,den,p.x,p.z,120,1);}}for(let i=0;i<COUNT;i++)this.mask[i]=den[i]>0?1:0;if(!this.points.length)this.mask.fill(1);this.trafficDen=new Float32Array(COUNT);for(const p of this.points){p.kernel=kernel(p.x,p.z,(R.types[p.e.type]?.width??16)/2+6);applyKernel(this.trafficDen,p.kernel,1);}}
 recompute(id){const t=performance.now(),C=this.ctx,W=C.world,G=this.grids;this.roads();const ids=id?[id]:VIEWS.map(v=>v.id);const sim=C.registry.get('simulation')?.status==='ready'?C.modules.simulation:null,sg=sim?.grids?.(),real=W.services.items.size>0;const records=[];for(const b of W.buildings.items.values()){let r=sim?.building?.(b.id);if(r&&!Number.isFinite(r.x+r.z))continue;if(!r)r={...b,landValue:sample(G.landvalue,b.x,b.z),pollution:sample(G.pollution,b.x,b.z),noise:.2};const E=real?clamp(r.education):this.coverage('school',b.x,b.z),H=real?clamp(r.health):this.coverage('clinic',b.x,b.z),crime=real?clamp(r.crime):clamp(.55-.5*this.coverage('police',b.x,b.z));records.push({b,r,E,H,crime});}
 this.stockKernels(records);
 const serviceVersion=real?W.services.version+':'+(C.modules.services?.coverageGrid?.('power')?.version??0)+':'+(C.modules.services?.coverageGrid?.('clinic')?.version??0):'fallback';
 if(this.coverageKey!==serviceVersion){this.coverageFields.clear();this.coverageKey=serviceVersion;}
 this.timings={};
 for(const key of ids){const rowStart=performance.now(),g=G[key];g.fill(0);
 if(key==='landvalue'||key==='pollution') {if(sg?.landValue){if(key==='landvalue')copyClamped(g,sg.landValue);else addClamped(g,sg.ground,sg.air);}else for(let i=0;i<COUNT;i++){const x=-1020+(i%256)*8,z=-1020+Math.floor(i/256)*8;const industrial=Math.exp(-((x+330)**2+(z-300)**2)/70000);g[i]=clamp(key==='pollution'?industrial*.88:.26+.55*this.coverage('park_large',x,z)-.2*industrial+.08*Math.sin(x*.006+this.fallback));}}
 else if(key==='traffic'){const fg=sim&&C.modules.traffic?.flowGrid?.();if(fg?.data?.length===COUNT){copyClamped(g,fg.data);}else{const activity=sim?.activity?.(C.clock.hour)??(.32+.38*Math.exp(-(((C.clock.hour-8)/2)**2)));for(const p of this.points){const type=W.roads.types[p.e.type]; // cong = clamp01(betweenness(e) * 26 / lanes * activity(hour)).
 applyKernel(g,p.kernel,clamp((this.central.get(p.e.id)??0)*26/(type?.lanes??2)*activity));}normalizeClamped(g,this.trafficDen);}}
 else if(key==='power'||key==='water'){
  const kinds=key==='power'?['power_coal','power_wind','power_solar']:['water_pump','sewage'];
  const fields=kinds.map(k=>this.coverageField(k));if(fields.length===3)maximum3(g,...fields);else maximum2(g,...fields);
  if(real)for(const {b,r}of records){const i=index(b.x,b.z);g[i]=Math.min(g[i],clamp(r[key]));}
 }
 else{for(const {b,r,E,H,crime}of records){const x=b.x,z=b.z;const area=Math.max(1,(b.footprint?.w??12)*(b.footprint?.d??12));let value=0,R=90;switch(key){case 'education':value=E;break;case 'health':value=H;break;case 'fire':value=real?clamp(r.fireRisk):clamp(.55-.5*this.coverage('fire',x,z));break;case 'crime':value=crime;break;case 'happiness':value=clamp(W.economy.happiness+.14*(E-.5)+.12*(H-.5)+.10*((real?r.parks:this.coverage('park_large',x,z))-.5)-.16*(crime-.5)+.10*((r.landValue??.5)-.5)-.22*(r.pollution??0)-.10*(r.noise??0));break;case 'density':value=(b.occupants??0)/area*4;R=60;break;case 'garbage':value=((r.occupants??b.occupants??0)+.5*(r.jobs??b.jobs??0))/area*4;R=70;break;}applyKernel(g,this.kernels.get(b.id)[R],value);}const den=this.denominators[key==='density'?60:key==='garbage'?70:90];if(key==='garbage')normalizeRaw(g,den);else normalizeClamped(g,den);
 if(!sim&&key==='happiness')for(let i=0;i<COUNT;i++)g[i]=clamp(.5+.6*(G.landvalue[i]-G.pollution[i]));
 if(key==='garbage'){const landfill=this.coverageField('landfill'),incinerator=this.coverageField('incinerator');maximum2(this.collect,landfill,incinerator);subtractClamped(g,this.collect);}}
 delete this.cachedStats[key];this.timings[key]=performance.now()-rowStart;}
 this.count++;this.lastMs=performance.now()-t;return this.lastMs;}
 stats(id){if(this.cachedStats[id])return this.cachedStats[id];const g=this.grids[id];if(!g)return null;const a=[];let sum=0,covered=0,maskN=0;for(let i=0;i<COUNT;i++){if(this.mask[i]){maskN++;const term=id==='garbage'?this.collect[i]:id==='fire'||id==='crime'?1-g[i]:g[i];if(term>=.5)covered++;}if(id==='traffic'?g[i]>0:this.mask[i]){a.push(g[i]);sum+=g[i];}}a.sort((a,b)=>a-b);const mean=sum/(a.length||1);let flat=0;for(const v of a)if(Math.abs(v-mean)<=.02)flat++;return this.cachedStats[id]={min:a[0]??0,max:a.at(-1)??0,mean,p5:a[Math.floor(a.length*.05)]??0,p50:a[Math.floor(a.length*.5)]??0,p95:a[Math.floor(a.length*.95)]??0,coveredFraction:covered/(maskN||1),population:a.length,flatFraction:flat/(a.length||1),deciles:Array.from({length:10},(_,i)=>a[Math.floor(a.length*(.05+i*.1))]??0)};}
}
