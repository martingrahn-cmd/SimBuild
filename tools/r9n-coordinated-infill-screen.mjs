#!/usr/bin/env node
// R9n: read-only public-tool screen for mid-block edge-split infill roads across accepted seeds.
import { chromium } from 'playwright';
import fs from 'node:fs';
import crypto from 'node:crypto';

const base=process.env.SIM_URL||'http://127.0.0.1:5173';
const out=process.env.OUT_FILE||'shots/democity/r9n-coordinated-infill/screen.json';
const sourcePath='src/modules/democity/plan.js',source=fs.readFileSync(sourcePath,'utf8'),marker='P.nodes=nodes;return P;';
if(source.split(marker).length!==2)throw Error('plan marker must occur once');
const routed=source.replace(marker,'globalThis.__R9N_GRID=[...nodes.values()].map(n=>({...n}));P.nodes=nodes;return P;');
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const chrome=process.env.SIM_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser=await chromium.launch({executablePath:chrome,headless:true,args:['--use-angle=metal','--use-gl=angle','--enable-webgl','--enable-gpu','--ignore-gpu-blocklist','--no-sandbox']});
const result={method:'fresh unchanged product worlds; routed authored-grid pointer; geometric painted/unclaimed ranking followed by public Tools alley drafts only; no commit',source:{path:sourcePath,sha256:sha(source),routedSha256:sha(routed)},seeds:[],common:[],errors:[],pass:false};

try{
 for(const seed of [1337,7]){
  const page=await browser.newPage({viewport:{width:1280,height:720}}),browserErrors=[];
  page.on('pageerror',e=>browserErrors.push(String(e)));page.on('console',m=>{if(m.type()==='error')browserErrors.push(m.text());});page.on('response',r=>{if(r.status()>=400)browserErrors.push(`HTTP ${r.status()} ${r.url()}`);});
  await page.route('**/@vite/client',r=>r.fulfill({status:200,contentType:'application/javascript',body:''}));
  await page.route('**/src/modules/democity/plan.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes(marker))throw Error('transformed plan marker missing');body=body.replace(marker,'globalThis.__R9N_GRID=[...nodes.values()].map(n=>({...n}));P.nodes=nodes;return P;');await route.fulfill({response,body,contentType:'application/javascript'});});
  await page.goto(`${base}/?showcase=democity&time=12&camera=aerial&seed=${seed}&quality=high&speed=0&headless=1`,{waitUntil:'domcontentloaded',timeout:240000});
  await page.waitForFunction(()=>window.__sim?.ready===true&&Array.isArray(globalThis.__R9N_GRID),null,{timeout:240000});
  const row=await page.evaluate(async seed=>{
   const s=window.__sim,w=s.world,tools=s.registry.apis.tools,grid=globalThis.__R9N_GRID,by=new Map(grid.map(n=>[`${n.i},${n.j}`,n]));
   const before={nodes:w.roads.nodes.size,edges:w.roads.edges.size,lots:w.zones.lots.size,buildings:w.buildings.items.size,cells:w.zones.cells.size};
   const claimed=new Set([...w.zones.lots.values()].flatMap(l=>l.cells||[])),cells=w.zones.cells,cell=w.zones.cellSize||8,half=w.size/2;
   const ctr=i=>i*cell-half+cell*.5;
   const candidates=[];
   const measure=(key,a,b)=>{const dx=b.x-a.x,dz=b.z-a.z,dd=dx*dx+dz*dz,len=Math.sqrt(dd);let unclaimedBand=0,claimedCore=0,claimedEndpoint=0,paintedBand=0,water=0,maxSlope=0;
    for(const[k]of cells){const [ci,cj]=k.split(',').map(Number),x=ctr(ci),z=ctr(cj),t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/dd)),px=a.x+dx*t,pz=a.z+dz*t,d=Math.hypot(x-px,z-pz),end=Math.min(Math.hypot(x-a.x,z-a.z),Math.hypot(x-b.x,z-b.z));if(t>.08&&t<.92&&d>=7&&d<=34){paintedBand++;if(!claimed.has(k))unclaimedBand++;}if(t>.04&&t<.96&&d<10&&claimed.has(k))claimedCore++;if(end<24&&claimed.has(k))claimedEndpoint++;}
    for(let n=0;n<=20;n++){const t=n/20,x=a.x+dx*t,z=a.z+dz*t;water+=w.terrain.isWater(x,z)?1:0;maxSlope=Math.max(maxSlope,w.terrain.getSlope(x,z));}
    const na=w.roads.nearestEdge(a.x,a.z,8),nb=w.roads.nearestEdge(b.x,b.z,8);if(!na||!nb||na.edge.id===nb.edge.id||na.edge.ctrl||nb.edge.ctrl)return;
    candidates.push({key,a,b,length:len,boundaryEdges:[na.edge.id,nb.edge.id],boundaryDistances:[na.dist,nb.dist],unclaimedBand,paintedBand,claimedCore,claimedEndpoint,waterSamples:water,maxSlope,rank:unclaimedBand*4-claimedCore*8-claimedEndpoint*2-water*20});};
   for(let j=-12;j<=10;j++)for(let i=-11;i<=11;i++){const n00=by.get(`${i},${j}`),n10=by.get(`${i+1},${j}`),n01=by.get(`${i},${j+1}`),n11=by.get(`${i+1},${j+1}`);if(!n00||!n10||!n01||!n11)continue;measure(`${i},${j}:h`,{x:(n00.x+n01.x)/2,z:(n00.z+n01.z)/2},{x:(n10.x+n11.x)/2,z:(n10.z+n11.z)/2});measure(`${i},${j}:v`,{x:(n00.x+n10.x)/2,z:(n00.z+n10.z)/2},{x:(n01.x+n11.x)/2,z:(n01.z+n11.z)/2});}
   candidates.sort((a,b)=>b.rank-a.rank||b.unclaimedBand-a.unclaimedBand||a.claimedCore-b.claimedCore||a.key.localeCompare(b.key));
   const screened=[];for(const c of candidates.slice(0,100)){
    tools.select('road',{type:'alley',mode:'straight',elevation:0,oneWay:false,snap:['magnet']});const first=tools.pointer(c.a.x,c.a.z),click=tools.click(0),second=tools.pointer(c.b.x,c.b.z),draft=tools.state();tools.cancel();
    screened.push({...c,firstSnap:first.snap,firstClick:click,secondSnap:second.snap,draft:{valid:draft.valid,reason:draft.reason,cost:draft.cost,points:draft.points,metrics:draft.metrics,snap:draft.snap}});
   }
   const after={nodes:w.roads.nodes.size,edges:w.roads.edges.size,lots:w.zones.lots.size,buildings:w.buildings.items.size,cells:w.zones.cells.size};
   return{seed,before,after,gridNodes:grid.length,candidateCount:candidates.length,screened,valid:screened.filter(c=>c.draft.valid),simErrors:[...s.errors]};
  },seed);
  result.seeds.push({...row,browserErrors});await page.close();
 }
 const maps=result.seeds.map(r=>new Map(r.valid.map(c=>[c.key,c])));for(const[key,a]of maps[0])if(maps[1].has(key)){const b=maps[1].get(key);result.common.push({key,minUnclaimedBand:Math.min(a.unclaimedBand,b.unclaimedBand),maxClaimedCore:Math.max(a.claimedCore,b.claimedCore),maxClaimedEndpoint:Math.max(a.claimedEndpoint,b.claimedEndpoint),maxGradePct:Math.max(Math.abs(a.draft.metrics.grade),Math.abs(b.draft.metrics.grade)),seeds:{1337:a,7:b}});}
 result.common.sort((a,b)=>b.minUnclaimedBand-a.minUnclaimedBand||a.maxClaimedCore-b.maxClaimedCore||a.maxClaimedEndpoint-b.maxClaimedEndpoint||a.key.localeCompare(b.key));
 result.pass=result.errors.length===0&&result.seeds.length===2&&result.seeds.every(r=>!r.simErrors.length&&!r.browserErrors.length&&JSON.stringify(r.before)===JSON.stringify(r.after))&&result.common.length>0;
 fs.mkdirSync(out.split('/').slice(0,-1).join('/')||'.',{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify({pass:result.pass,source:result.source,seeds:result.seeds.map(r=>({seed:r.seed,gridNodes:r.gridNodes,candidateCount:r.candidateCount,screened:r.screened.length,valid:r.valid.length,unchanged:JSON.stringify(r.before)===JSON.stringify(r.after),errors:r.simErrors.length+r.browserErrors.length})),common:result.common.slice(0,20).map(c=>({key:c.key,minUnclaimedBand:c.minUnclaimedBand,maxClaimedCore:c.maxClaimedCore,maxClaimedEndpoint:c.maxClaimedEndpoint,maxGradePct:c.maxGradePct,seed1337:{a:c.seeds[1337].a,b:c.seeds[1337].b,snaps:[c.seeds[1337].firstSnap,c.seeds[1337].secondSnap]},seed7:{a:c.seeds[7].a,b:c.seeds[7].b,snaps:[c.seeds[7].firstSnap,c.seeds[7].secondSnap]}}))},null,2));if(!result.pass)process.exitCode=1;
}catch(e){result.errors.push(String(e?.stack||e));fs.mkdirSync(out.split('/').slice(0,-1).join('/')||'.',{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2));console.error(e);process.exitCode=1;}finally{await browser.close();}
