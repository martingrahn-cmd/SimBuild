#!/usr/bin/env node
// R9o: disposable public-Tools commit/undo/redo staging for selected R9n mid-block route.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const base=process.env.SIM_URL||'http://127.0.0.1:5173';
const root=process.env.OUT_DIR||'shots/democity/r9o-infill-owner';fs.mkdirSync(root,{recursive:true});
const chrome=process.env.SIM_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const python=process.env.SIM_PYTHON||'/Users/martingrahn/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3';
const endpoints={a:{x:80,z:40},b:{x:80,z:120}};
const sourcePath='src/modules/democity/plan.js',source=fs.readFileSync(sourcePath,'utf8');
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const browser=await chromium.launch({executablePath:chrome,headless:true,args:['--use-angle=metal','--use-gl=angle','--enable-webgl','--enable-gpu','--ignore-gpu-blocklist','--no-sandbox']});
const result={method:'fresh unchanged-product worlds; candidate uses shipped public Tools alley commit then undo/redo; no source route or product edit',candidate:{key:'1,0:v',endpoints,type:'alley'},source:{path:sourcePath,sha256:sha(source)},runs:[],comparisons:[],errors:[],pass:false};

const settle=async(page,frames=90)=>page.evaluate(async n=>{const s=window.__sim,start=s.engine.stats.frames;let last=start,lastAt=performance.now();while(s.engine.stats.frames<start+n){await Promise.race([new Promise(requestAnimationFrame),new Promise(r=>setTimeout(r,1000))]);if(s.engine.stats.frames!==last){last=s.engine.stats.frames;lastAt=performance.now();}else if(performance.now()-lastAt>15000)throw Error(`render stalled at ${last}`);}},frames);

const run=async(variant,seed,repeat=false)=>{
 const page=await browser.newPage({viewport:{width:1920,height:1080}}),browserErrors=[],warnings=[];
 page.on('pageerror',e=>browserErrors.push(String(e)));page.on('console',m=>{if(m.type()==='error')browserErrors.push(m.text());else if(m.type()==='warning')warnings.push(m.text());});page.on('response',r=>{if(r.status()>=400)browserErrors.push(`HTTP ${r.status()} ${r.url()}`);});
 await page.route('**/@vite/client',r=>r.fulfill({status:200,contentType:'application/javascript',body:''}));
 try{
  await page.goto(`${base}/?showcase=democity&time=12&camera=aerial&seed=${seed}&quality=high&speed=0&headless=1`,{waitUntil:'domcontentloaded',timeout:240000});
  await page.waitForFunction(()=>window.__sim?.ready===true,null,{timeout:240000});await settle(page,90);
  const before=await page.evaluate(snapshot);
  let transaction=null,after=before,undo=null,redo=null;
  if(variant==='candidate'){
   transaction=await page.evaluate(({a,b})=>{const s=window.__sim,t=s.registry.apis.tools;t.select('road',{type:'alley',mode:'straight',elevation:0,oneWay:false,snap:['magnet']});const first=t.pointer(a.x,a.z),click=t.click(0),second=t.pointer(b.x,b.z),draft=t.state(),commit=t.commit();return{first,click,second,draft,commit,history:t.history()};},endpoints);
   await settle(page,120);after=await page.evaluate(snapshot);
  }
  const runId=`${variant}${repeat?'_repeat':''}_seed${seed}`;
  if(!repeat){const aerial=path.join(root,`${runId}_aerial.png`);await page.screenshot({path:aerial,type:'png',timeout:180000});await page.evaluate(()=>window.__sim.setCamera({target:[80,20,80],yaw:.72,pitch:.65,distance:220}));await settle(page,30);const directed=path.join(root,`${runId}_directed.png`);await page.screenshot({path:directed,type:'png',timeout:180000});after.images={aerial,directed};}
  if(variant==='candidate'){
   const undoResult=await page.evaluate(()=>window.__sim.registry.apis.tools.undo());await settle(page,120);undo=await page.evaluate(snapshot);undo.result=undoResult;
   const redoResult=await page.evaluate(()=>window.__sim.registry.apis.tools.redo());await settle(page,120);redo=await page.evaluate(snapshot);redo.result=redoResult;
  }
  const row={variant,seed,repeat,before,after,transaction,undo,redo,browserErrors,warnings:[...new Set(warnings)]};
  row.pass=!browserErrors.length&&!after.errors.length&&after.ready16&&after.integrity.oneBuildingPerLot&&after.integrity.duplicateCells.length===0&&after.integrity.overlaps.length===0&&(variant==='baseline'||(transaction.draft.valid===true&&transaction.commit.ok===true&&undo?.result===true&&redo?.result===true&&!undo.errors.length&&!redo.errors.length));return row;
 }finally{await page.close();}
};

function snapshot(){
 const s=window.__sim,w=s.world,api=s.registry.apis,clone=v=>structuredClone(v);
 const roads=clone(api.roads.serialize()),zones=clone(api.zoning.serialize()),buildings=clone(api.buildings.serialize()),simulation=clone(api.simulation.serialize()),services=clone(api.services.serialize()),transit=clone(api.transit.serialize()),terrain=clone(api.terrain.serialize());
 const lots=[...w.zones.lots.values()].sort((a,b)=>a.id-b.id).map(l=>({id:l.id,buildingId:l.buildingId,stableKey:`${l.edgeId}:${l.side}:${l._identityCell||l.cells?.[0]||`${Math.round(l.x)}_${Math.round(l.z)}`}`,edgeId:l.edgeId,side:l.side,identityCell:l._identityCell||l.cells?.[0]||null,x:l.x,y:l.y,z:l.z,w:l.w,d:l.d,heading:l.heading,type:l.type,density:l.density,corner:l.corner,t:l.t,cells:[...(l.cells||[])]}));
 const refs=new Map(),duplicateCells=[];for(const l of lots){const seen=new Set();for(const k of l.cells){if(seen.has(k))duplicateCells.push([l.id,k]);seen.add(k);}for(const k of seen){const ids=refs.get(k)||[];ids.push(l.id);refs.set(k,ids);}}
 const overlaps=[...refs].filter(([,ids])=>ids.length>1).map(([key,ids])=>({key,ids}));
 const hash=v=>JSON.stringify(v);let h=2166136261;for(const c of hash(terrain)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}const components=()=>{const adj=new Map(roads.nodes.map(n=>[n.id,[]]));for(const e of roads.edges){adj.get(e.a)?.push(e.b);adj.get(e.b)?.push(e.a);}let n=0;const seen=new Set();for(const id of adj.keys())if(!seen.has(id)){n++;const q=[id];seen.add(id);while(q.length){for(const v of adj.get(q.pop())||[])if(!seen.has(v)){seen.add(v);q.push(v);}}}return n;};
 const modules=s.stats().modules;
 return{counts:{roadNodes:roads.nodes.length,roadEdges:roads.edges.length,zonedCells:w.zones.cells.size,claimedCells:refs.size,lots:lots.length,buildings:w.buildings.items.size,services:w.services.items.size},roads,lots,zones,buildings,simulation,services,transit,terrainHash:(h>>>0).toString(16).padStart(8,'0'),terrainSamples:Array.from({length:21},(_,i)=>{const z=40+i*4;return{z,y:w.terrain.getHeight(80,z),slope:w.terrain.getSlope(80,z),road:w.roads.isRoad(80,z),surface:api.roads.surfaceHeightAt(80,z)}}),economy:{money:w.economy.money,population:w.economy.population,jobs:w.economy.jobs,net:w.economy.net,demand:clone(w.economy.demand),loans:clone(w.economy.loans),taxRate:clone(w.economy.taxRate)},versions:{roads:w.roads.version,zones:w.zones.version,buildings:w.buildings.version,terrain:w.terrain.version},components:components(),integrity:{oneBuildingPerLot:lots.every(l=>l.buildingId!=null&&w.buildings.items.has(l.buildingId)),duplicateCells,overlaps},ready16:Object.values(modules).length===16&&Object.values(modules).every(m=>m.status==='ready'&&m.errors===0),errors:[...s.errors]};
}

try{
 for(const seed of [1337,7]){result.runs.push(await run('baseline',seed));result.runs.push(await run('candidate',seed));result.runs.push(await run('candidate',seed,true));}
 for(const seed of [1337,7]){
  const b=result.runs.find(r=>r.seed===seed&&r.variant==='baseline'),c=result.runs.find(r=>r.seed===seed&&r.variant==='candidate'&&!r.repeat),rr=result.runs.find(r=>r.seed===seed&&r.variant==='candidate'&&r.repeat);
  const bm=new Map(b.after.lots.map(l=>[l.stableKey,l])),cm=new Map(c.after.lots.map(l=>[l.stableKey,l]));const gained=[...cm].filter(([k])=>!bm.has(k)).map(([,v])=>v),lost=[...bm].filter(([k])=>!cm.has(k)).map(([,v])=>v),retained=[...cm].filter(([k])=>bm.has(k));
  const ids=x=>new Set(x.roads.edges.map(e=>e.id)),bi=ids(b.after),ci=ids(c.after),removed=[...bi].filter(id=>!ci.has(id)),added=[...ci].filter(id=>!bi.has(id));
  const identity=e=>({id:e.id,a:e.a,b:e.b,type:e.type,lanes:e.lanes,oneWay:e.oneWay,ctrl:e.ctrl,elevation:e.elevation});const cBy=new Map(c.after.roads.edges.map(e=>[e.id,e]));
  const stable=x=>({counts:x.counts,roads:x.roads,lots:x.lots,zones:x.zones,buildings:x.buildings,simulation:x.simulation,services:x.services,transit:x.transit,terrainHash:x.terrainHash,terrainSamples:x.terrainSamples,economy:x.economy,components:x.components,integrity:x.integrity,ready16:x.ready16,errors:x.errors});
  const semantic=x=>({counts:x.counts,edgeGeometry:x.roads.edges.map(e=>{const a=x.roads.nodes.find(n=>n.id===e.a),d=x.roads.nodes.find(n=>n.id===e.b);return{a:[a?.x,a?.z],b:[d?.x,d?.z],type:e.type,lanes:e.lanes,oneWay:e.oneWay};}).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))),lotKeys:x.lots.map(l=>l.stableKey).sort(),economy:x.economy,components:x.components,integrity:x.integrity});
  result.comparisons.push({seed,countDelta:Object.fromEntries(Object.keys(c.after.counts).map(k=>[k,c.after.counts[k]-b.after.counts[k]])),moneyDelta:c.after.economy.money-b.after.economy.money,gainedLots:gained,lostLots:lost,retainedLots:retained.length,retainedSameLotId:retained.filter(([k,v])=>bm.get(k).id===v.id).length,retainedSameBuildingId:retained.filter(([k,v])=>bm.get(k).buildingId===v.buildingId).length,removedEdgeIds:removed,addedEdgeIds:added,unchangedExistingEdgeIdentity:JSON.stringify([...bi].filter(id=>!removed.includes(id)).map(id=>identity(b.after.roads.edges.find(e=>e.id===id))))===JSON.stringify([...bi].filter(id=>!removed.includes(id)).map(id=>identity(cBy.get(id)))),candidateRepeatExact:JSON.stringify(stable(c.after))===JSON.stringify(stable(rr.after)),undoExact:JSON.stringify(stable(c.before))===JSON.stringify(stable(c.undo)),undoSemantic:JSON.stringify(semantic(c.before))===JSON.stringify(semantic(c.undo)),redoExact:JSON.stringify(stable(c.after))===JSON.stringify(stable(c.redo)),redoSemantic:JSON.stringify(semantic(c.after))===JSON.stringify(semantic(c.redo))});
 }
 const py=String.raw`import json,sys
from pathlib import Path
from PIL import Image,ImageChops
r=Path(sys.argv[1]);out=[]
for seed in (1337,7):
 for view in ('aerial','directed'):
  a=r/f'baseline_seed{seed}_{view}.png';b=r/f'candidate_seed{seed}_{view}.png';A=Image.open(a).convert('RGB');B=Image.open(b).convert('RGB');D=ImageChops.difference(A,B);h=D.histogram();p=A.width*A.height;m=ImageChops.lighter(ImageChops.lighter(*D.split()[:2]),D.split()[2]);mh=m.histogram();q=r/f'seed{seed}_{view}_difference_x4.png';D.point(lambda v:min(255,v*4)).save(q);out.append({'seed':seed,'view':view,'normalizedRgbMae':sum((i%256)*n for i,n in enumerate(h))/(p*3*255),'changedPixels':p-mh[0],'strongPixelsGE8':sum(mh[8:]),'differenceX4':str(q)})
print(json.dumps(out))`;
 result.imageComparisons=JSON.parse(execFileSync(python,['-c',py,root],{encoding:'utf8'}));
}catch(e){result.errors.push(String(e?.stack||e));}finally{await browser.close();}
result.pass=!result.errors.length&&result.runs.length===6&&result.runs.every(r=>r.pass)&&result.comparisons.length===2&&result.comparisons.every(c=>c.candidateRepeatExact&&c.countDelta.roadNodes===2&&c.countDelta.roadEdges===3&&c.removedEdgeIds.length===2&&c.addedEdgeIds.length===5&&c.unchangedExistingEdgeIdentity);
fs.writeFileSync(path.join(root,'summary.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({pass:result.pass,errors:result.errors,runs:result.runs.map(r=>({variant:r.variant,seed:r.seed,repeat:r.repeat,pass:r.pass,commit:r.transaction?.commit,counts:r.after.counts,errors:r.after.errors,browserErrors:r.browserErrors})),comparisons:result.comparisons.map(c=>({seed:c.seed,countDelta:c.countDelta,moneyDelta:c.moneyDelta,gained:c.gainedLots.length,lost:c.lostLots.length,retained:c.retainedLots,sameLotId:c.retainedSameLotId,sameBuildingId:c.retainedSameBuildingId,removedEdges:c.removedEdgeIds.length,addedEdges:c.addedEdgeIds.length,unchangedExistingEdgeIdentity:c.unchangedExistingEdgeIdentity,candidateRepeatExact:c.candidateRepeatExact,undoExact:c.undoExact,undoSemantic:c.undoSemantic,redoExact:c.redoExact,redoSemantic:c.redoSemantic})),imageComparisons:result.imageComparisons},null,2));if(!result.pass)process.exitCode=1;
