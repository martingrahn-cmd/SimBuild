#!/usr/bin/env node
// R8x: disposable comparison of deterministic within-road-class frontage claim orders.
import { chromium } from 'playwright';
import fs from 'node:fs';
import crypto from 'node:crypto';
const base=process.env.SIM_URL||'http://127.0.0.1:5173',out=process.env.OUT_FILE||'shots/democity/r8x-frontage-order/profile.json';
const sourcePath='src/modules/zoning/grid.js',source=fs.readFileSync(sourcePath,'utf8');
const marker="edges.sort((a, b) => rank(a) - rank(b) || (b.length - a.length) * 0.02 + (jitter(a) - jitter(b)) || a.id - b.id);";
if(!source.includes(marker))throw new Error('edge-order marker not found');
const variants=[
 {id:'current',expression:'rank(a) - rank(b) || (b.length - a.length) * 0.02 + (jitter(a) - jitter(b)) || a.id - b.id'},
 {id:'id-ascending',expression:'rank(a) - rank(b) || a.id - b.id'},
 {id:'shortest-first',expression:'rank(a) - rank(b) || (a.length - b.length) * 0.02 + (jitter(a) - jitter(b)) || a.id - b.id'},
 {id:'jitter-only',expression:'rank(a) - rank(b) || jitter(a) - jitter(b) || a.id - b.id'},
 {id:'reverse-current',expression:'rank(a) - rank(b) || (a.length - b.length) * 0.02 + (jitter(b) - jitter(a)) || b.id - a.id'},
];
for(const v of variants){v.source=source.replace(marker,`edges.sort((a, b) => ${v.expression});`);v.sha256=crypto.createHash('sha256').update(v.source).digest('hex')}
const executablePath=process.env.SIM_CHROME||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',chromium.executablePath()].find(p=>fs.existsSync(p));
const browser=await chromium.launch({executablePath,headless:true,args:['--use-angle=metal','--use-gl=angle','--enable-webgl','--enable-gpu','--ignore-gpu-blocklist','--no-sandbox']});
const result={method:'fresh disposable Democity page per deterministic within-rank edge-order variant and seed',sourcePath,sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),variants:variants.map(({id,expression,sha256})=>({id,expression,sha256})),runs:[]};
try{
 for(const variant of variants)for(const seed of [1337,7]){
  const page=await browser.newPage({viewport:{width:1280,height:720}}),browserErrors=[];page.on('pageerror',e=>browserErrors.push(String(e)));page.on('console',m=>{if(m.type()==='error')browserErrors.push(m.text())});
  await page.route('**/@vite/client',r=>r.fulfill({status:200,contentType:'application/javascript',body:''}));
  await page.route('**/src/modules/zoning/grid.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:variant.source}));
  await page.goto(`${base}/?showcase=democity&time=12&camera=aerial&seed=${seed}&quality=high&speed=0&headless=1`,{waitUntil:'domcontentloaded',timeout:240000});await page.waitForFunction(()=>window.__sim?.ready===true,null,{timeout:240000});
  const row=await page.evaluate(({seed,variant})=>{
   const s=window.__sim,w=s.world,z=s.registry.apis.zoning;
   const lots=[...w.zones.lots.values()].sort((a,b)=>a.id-b.id).map(l=>({id:l.id,buildingId:l.buildingId,stableKey:`${l.edgeId}:${l.side}:${l._identityCell||l.cells?.[0]||`${Math.round(l.x)}_${Math.round(l.z)}`}`,edgeId:l.edgeId,side:l.side,identityCell:l._identityCell||l.cells?.[0]||null,x:l.x,y:l.y,z:l.z,w:l.w,d:l.d,heading:l.heading,nx:l.nx,nz:l.nz,ax:l.ax,az:l.az,type:l.type,density:l.density,corner:l.corner,t:l.t,cells:[...(l.cells||[])]}));
   const refs=new Map(),duplicates=[];for(const l of lots){const seen=new Set();for(const k of l.cells){if(seen.has(k))duplicates.push([l.id,k]);seen.add(k)}for(const k of seen){const a=refs.get(k)||[];a.push(l.id);refs.set(k,a)}}
   const overlaps=[...refs].filter(([,ids])=>ids.length>1).map(([key,ids])=>({key,ids}));
   const byClass={};for(const l of lots){const k=l.type+'/'+l.density;byClass[k]=(byClass[k]||0)+1}
   const buildings=structuredClone(s.registry.apis.buildings.serialize()),simulation=structuredClone(s.registry.apis.simulation.serialize());
   return{seed,variant,counts:{cells:w.zones.cells.size,lots:lots.length,buildings:w.buildings.items.size,claimed:refs.size},byClass,lots,duplicates,overlaps,buildings,simulation,economy:{population:w.economy.population,jobs:w.economy.jobs,money:w.economy.money,happiness:w.economy.happiness,demand:structuredClone(w.economy.demand),net:w.economy.net,loans:structuredClone(w.economy.loans),taxRate:structuredClone(w.economy.taxRate)},democityStats:structuredClone(s.registry.apis.democity.stats()),zoningStats:structuredClone(z.stats()),errors:s.errors.slice()};
  },{seed,variant:variant.id});row.browserErrors=browserErrors;row.pass=row.counts.lots===row.counts.buildings&&!row.duplicates.length&&!row.overlaps.length&&!row.errors.length&&!browserErrors.length;result.runs.push(row);console.log(JSON.stringify({variant:variant.id,seed,counts:row.counts,byClass:row.byClass,economy:row.economy,duplicates:row.duplicates.length,overlaps:row.overlaps.length,errors:row.errors,browserErrors,pass:row.pass}));await page.close();
 }
 for(const seed of [1337,7]){const baseline=result.runs.find(r=>r.seed===seed&&r.variant==='current'),baseMap=new Map(baseline.lots.map(l=>[l.stableKey,l]));for(const row of result.runs.filter(r=>r.seed===seed)){const map=new Map(row.lots.map(l=>[l.stableKey,l])),gained=[...map].filter(([k])=>!baseMap.has(k)).map(([,v])=>v),lost=[...baseMap].filter(([k])=>!map.has(k)).map(([,v])=>v),retained=[...map].filter(([k])=>baseMap.has(k));row.comparison={lotDelta:row.counts.lots-baseline.counts.lots,claimedDelta:row.counts.claimed-baseline.counts.claimed,gainedLots:gained,lostLots:lost,retainedLots:retained.length,retainedSameId:retained.filter(([k,v])=>baseMap.get(k).id===v.id).length,retainedSameBuildingId:retained.filter(([k,v])=>baseMap.get(k).buildingId===v.buildingId).length,buildingSerializationEqual:JSON.stringify(row.buildings)===JSON.stringify(baseline.buildings),simulationSerializationEqual:JSON.stringify(row.simulation)===JSON.stringify(baseline.simulation),economyEqual:JSON.stringify(row.economy)===JSON.stringify(baseline.economy)}}}
 result.pass=result.runs.every(r=>r.pass);fs.mkdirSync(out.slice(0,out.lastIndexOf('/')),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify({pass:result.pass,summary:result.runs.map(r=>({variant:r.variant,seed:r.seed,counts:r.counts,lotDelta:r.comparison.lotDelta,claimedDelta:r.comparison.claimedDelta,gained:r.comparison.gainedLots.length,lost:r.comparison.lostLots.length,retained:r.comparison.retainedLots,retainedSameId:r.comparison.retainedSameId,buildingSerializationEqual:r.comparison.buildingSerializationEqual,simulationSerializationEqual:r.comparison.simulationSerializationEqual,economyEqual:r.comparison.economyEqual,errors:r.errors,browserErrors:r.browserErrors}))},null,2));if(!result.pass)process.exitCode=1;
}finally{await browser.close()}
