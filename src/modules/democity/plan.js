// Authored districts and roads. Terrain is sampled, never edited here; roads owns the cut/fill.
export function makePlan(ctx, seed, density, rng) {
 const T=ctx.world.terrain, samples=[];
 for(let z=-992;z<=992;z+=32)for(let x=-992;x<=992;x+=32)samples.push({x,z,y:T.getHeight(x,z),slope:T.getSlope(x,z),water:T.isWater(x,z)});
 const variant=rng.range(-1,1); // the random warp changes outer streets, not the fixed camera anchors
 const warp=(x,z)=>{const f=v=>Math.min(1,Math.max(0,(Math.abs(v)-190)/280));return {x:Math.round((x+f(x)*(variant*64+38*Math.sin(x/220+variant*3)))/8)*8,z:Math.round((z+f(z)*(variant*58+32*Math.sin(z/240+variant*4)))/8)*8};};
 const districts=[
 ['centre','Lindham Centre','downtown',0,20,340,300],['midtown','Central neighbourhoods','midtown',0,50,760,690],
 ['west','Birch Gardens','suburb',-310,470,560,660],['east','Hillcrest','suburb',430,490,650,680],
 ['industry','Northbank Works','industry',260,-635,960,430],['port','Old Harbour','port',-200,-485,450,220],
 ['park','Founders Park','park',400,300,240,160],['waterfront','River Walk','waterfront',80,-190,1050,180],
 ['civic','University Quarter','civic',120,475,280,190],
 ].map(([id,name,kind,x,z,w,d])=>{const q=['centre','midtown','park'].includes(id)?{x,z}:warp(x,z);return {id,name,kind,x:q.x,z:q.z,w,d,heading:0,area:w*d};});
 const landmarks=[
 ['clock','Lindham Clock Tower','clock tower',-200,220,26,26],['arena','Founders Arena','arena',340,280,60,52],
 ['hospital','Southbank Medical Centre','hospital',-240,360,52,46],['university','Lindham University','university',100,460,56,52],
 ['water','Birch Water Tower','water tower',-260,460,28,28],['cooling','Northbank Cooling Works','power plant',220,-620,54,54],
 ];
 const p={seed,density,districts,landmarks:[],corridors:{highway:[],arterial:[],bridges:[]},transit:{lineName:'01 · Central Circle',colour:'#27bca6',routeM:0,stops:[]},promenade:{lengthM:0,points:[]},samples:samples.length,variant};
 const reserved=[];
 const dry=(x,z,w,d)=>{for(const a of[-.5,0,.5])for(const b of[-.5,0,.5])if(T.isWater(x+a*w,z+b*d)||T.getSlope(x+a*w,z+b*d)>.32)return false;return true;};
 // Landmarks stay in block interiors. Public road queries are available after road construction;
 // these provisional footprints also reserve the park and civic sites from zoning.
 for(const[id,name,kind,x,z,w,d]of landmarks){if(dry(x,z,w,d)){const item={id,name,kind,x,z,w,d,y:T.getHeight(x,z),heading:0};p.landmarks.push(item);reserved.push(item);}}
 return {p,warp,dry,reserved,rng,density};
}
export function authorRoads(ctx,P){
 const R=ctx.world.roads,T=ctx.world.terrain,p=P.p, nodes=new Map(),made=new Set();
 const node=(x,z)=>R.addNode(x,z);
 const add=(a,b,type='street',opts={})=>{if(a===b)return -1;const k=[Math.min(a,b),Math.max(a,b)].join(':');if(made.has(k))return -1;made.add(k);const id=R.addEdge(a,b,type,opts);if(type==='highway')p.corridors.highway.push(id);if(type==='avenue')p.corridors.arterial.push(id);return id;};
 const highway=[];
 for(let z=-1024;z<=1024;z+=64){const x=400+170*Math.sin(z/190);highway.push({id:node(x,z),x,z});}
 for(let i=1;i<highway.length;i++)add(highway[i-1].id,highway[i].id,'highway',{ctrl:{x:400+170*Math.sin((highway[i-1].z+highway[i].z)/380),z:(highway[i-1].z+highway[i].z)/2}});
 const insidePark=(x,z)=>x>280&&x<520&&z>220&&z<380;
 for(let j=-12;j<=11;j++)for(let i=-11;i<=12;i++){
  const q=P.warp(-40+i*80,40+j*80);if(T.isWater(q.x,q.z)||insidePark(q.x,q.z)||T.getSlope(q.x,q.z)>.40||T.getHeight(q.x,q.z)>120)continue;
  nodes.set(`${i},${j}`,{...q,id:node(q.x,q.z),i,j});
 }
 const dryEdge=(a,b)=>{for(let n=0;n<=8;n++){const t=n/8;if(T.isWater(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t))return false;}return true;};
 for(const a of nodes.values())for(const[di,dj]of[[1,0],[0,1]]){const b=nodes.get(`${a.i+di},${a.j+dj}`);if(!b||!dryEdge(a,b))continue;
  if(di&&a.i>=0&&a.i<2&&a.j===3)continue;if(dj&&a.i===1&&a.j>=2&&a.j<4)continue;
  if(di&&a.j<-5&&Math.abs(a.j)%2===1)continue; // an actual double-depth university block
  let type=(di&&[0,6,-9].includes(a.j)||dj&&[0,3,-2].includes(a.i))?'avenue':'street';
  if(a.z<-500&&a.i%3===1)type='gravel';
  if(a.z>600&&dj&&a.i%3===0)type='alley';
  if(di&&Math.hypot(a.x,a.z)>300&&a.z>-400){const mid=node((a.x+b.x)/2,(a.z+b.z)/2);add(a.id,mid,type);add(mid,b.id,type);}else add(a.id,b.id,type);
 }
 // Two real river crossings connect existing bank nodes, separated by 480 metres.
 for(const [column,type]of[[0,'avenue'],[6,'street']]){
  const col=[...nodes.values()].filter(n=>n.i===column).sort((a,b)=>a.z-b.z);
  for(let i=1;i<col.length;i++)if(!dryEdge(col[i-1],col[i])){const id=add(col[i-1].id,col[i].id,type);if(id>=0)p.corridors.bridges.push(id);}
 }
 // Ramps connect the independent highway to the local graph. No invented node-height setter.
 for(const z of[-640,192,576]){const h=highway.reduce((a,b)=>Math.abs(b.z-z)<Math.abs(a.z-z)?b:a);const near=[...nodes.values()].filter(n=>n.x<h.x-45&&Math.abs(n.z-z)<110).sort((a,b)=>Math.hypot(a.x-h.x,a.z-h.z)-Math.hypot(b.x-h.x,b.z-h.z))[0];if(near)add(h.id,near.id,'ramp',{oneWay:true,lanes:1,ctrl:{x:near.x,z:h.z-70}});}
 // A real closed one-way neighbourhood roundabout, with a connected feeder.
 const centre=P.warp(-260,700),ring=[];
 for(let i=0;i<16;i++){const a=i*Math.PI/8,x=centre.x+28*Math.cos(a),z=centre.z+28*Math.sin(a);ring.push({id:node(x,z),x,z});}
 for(let i=0;i<16;i++)add(ring[i].id,ring[(i+1)%16].id,'alley',{oneWay:true,lanes:1});
 const feeder=[...nodes.values()].filter(n=>dryEdge(n,ring[0])).sort((a,b)=>Math.hypot(a.x-ring[0].x,a.z-ring[0].z)-Math.hypot(b.x-ring[0].x,b.z-ring[0].z))[0];if(feeder)add(feeder.id,ring[0].id,'street');
 // A park walk connected at both ends supplies the real props owner's lamps.
 const a=node(400,200),b=node(400,400);add(a,b,'alley');
 for(const q of[{id:a,x:400,z:200},{id:b,x:400,z:400}]){const n=[...nodes.values()].sort((a,b)=>Math.hypot(a.x-q.x,a.z-q.z)-Math.hypot(b.x-q.x,b.z-q.z))[0];if(n)add(q.id,n.id,'alley');}
 // River promenade follows the actual north bank, with bounded 8m dry-land search.
 const river=T.features?.river;
 for(let x=-400;x<=480;x+=40){let z=(river?.zAt?.(x)??-300)-(river?.halfWidthAt?.(x)??30);for(let d=0;d<240;d+=8)if(!T.isWater(x,z-d)&&!T.isWater(x,z-d-12)){z-=d+12;break;}if(T.isWater(x,z))continue;const q={x,z,id:node(x,z)};const prev=p.promenade.points.at(-1);if(prev&&dryEdge(prev,q)){add(prev.id,q.id,'alley');p.promenade.lengthM+=Math.hypot(q.x-prev.x,q.z-prev.z);}p.promenade.points.push(q);}
 for(const q of p.promenade.points.filter((_,i)=>i%6===0)){const n=[...nodes.values()].filter(n=>dryEdge(n,q)).sort((a,b)=>Math.hypot(a.x-q.x,a.z-q.z)-Math.hypot(b.x-q.x,b.z-q.z))[0];if(n)add(q.id,n.id,'street');}
 // Industrial fixtures are on dry land immediately behind the waterfront, before zoning reserves.
 for(const [i,q]of p.promenade.points.filter((_,i)=>i>6&&i<15).entries()){
  const kind=i<3?'silo':i<5?'stack':i<7?'crane':'apron',w=kind==='apron'?46:kind==='crane'?22:14,d=kind==='apron'?30:18;
  const z=q.z-26;if(!P.dry(q.x,z,w,d))continue;
  const item={id:`port-${i}`,name:`Northbank ${kind} ${i+1}`,kind,x:q.x,z,y:T.getHeight(q.x,z),w,d,heading:0};p.landmarks.push(item);P.reserved.push(item);
 }
 // Ordered eight-stop loop on connected southern avenues. Closed return leg is transit-owned.
 const pairs=[[-240,42],[40,42],[390,42],[440,280],[390,522],[40,522],[-240,522],[-360,280]];
 p.transit.stops=pairs.map(([x,z],i)=>({x,z,name:['Westgate','Central Station','East Market','Founders Park','University','South Gardens','Birch Avenue','Medical Quarter'][i]}));
 P.nodes=nodes;return P;
}
export function districtAt(plan,x,z){
 if(!plan)return null;
 for(const id of['park','centre','industry','port','civic','west','east','waterfront','midtown']){const d=plan.districts.find(d=>d.id===id);if(d&&Math.abs(x-d.x)<=d.w/2&&Math.abs(z-d.z)<=d.d/2)return {id:d.id,name:d.name,kind:d.kind};}return null;
}
export function zoneType(P,x,z){
 const r=Math.hypot(x,z-20),blockX=Math.floor((x+40)/80),blockZ=Math.floor((z-40)/80),h=((blockX*17+blockZ*7)>>>0)%10;
 if(z<-430)return ['industrial','low'];
 if(r<260)return h<4?['office','high']:['residential','high'];
 if(r<290)return h<2?['office','high']:h<8?['residential','high']:['commercial','high'];
 if(r<420)return h<8?['residential','high']:['commercial','low'];
 return ['residential','low'];
}
