#!/usr/bin/env node
// Verify that the road→zoning lifecycle removes invalid building owners in the whole-game `all`
// alias without invoking Democity's eager refill. Normal Simulation remains the construction owner.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base=process.env.SIM_URL||'http://127.0.0.1:5173';
const out=process.env.OUT_FILE||'shots/democity/r9p-zoning-building-lifecycle/construction-timing.json';
const seeds=(process.env.SEEDS||'1337,7').split(',').map(Number).filter(Number.isFinite);
const chrome=process.env.SIM_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser=await chromium.launch({executablePath:chrome,headless:true,args:['--use-angle=metal','--use-gl=angle','--enable-webgl','--enable-gpu','--ignore-gpu-blocklist','--no-sandbox']});
const result={method:'fresh whole-game all-alias worlds, paused; public road commit/undo/redo; no source or showcase mutation',runs:[],errors:[],pass:false};

const settle=(page,frames)=>page.evaluate(async n=>{const s=window.__sim,start=s.engine.stats.frames;while(s.engine.stats.frames<start+n)await Promise.race([new Promise(requestAnimationFrame),new Promise(r=>setTimeout(r,1000))]);},frames);

function snapshot(){
 const s=window.__sim,w=s.world,t=s.registry.apis.tools,lots=[...w.zones.lots.values()],buildings=[...w.buildings.items.values()];
 const lotIds=new Set(lots.map(l=>l.id)),buildingIds=new Set(buildings.map(b=>b.id));
 const orphanBuildings=buildings.filter(b=>!lotIds.has(b.lotId)).map(b=>({id:b.id,lotId:b.lotId}));
 const unbuiltLots=lots.filter(l=>l.buildingId==null||!buildingIds.has(l.buildingId)).map(l=>({id:l.id,buildingId:l.buildingId,edgeId:l.edgeId,side:l.side}));
 const mismatchedLinks=lots.filter(l=>l.buildingId!=null&&buildings.find(b=>b.id===l.buildingId)?.lotId!==l.id).map(l=>({id:l.id,buildingId:l.buildingId}));
 return{showcase:w.flags.showcase,counts:{lots:lots.length,buildings:buildings.length,freeLots:w.zones.freeLots().length},money:w.economy.money,versions:{roads:w.roads.version,zones:w.zones.version,buildings:w.buildings.version},integrity:{orphanBuildings,unbuiltLots,mismatchedLinks,ownerSafe:orphanBuildings.length===0&&mismatchedLinks.length===0},history:t.history(),ready16:Object.values(s.stats().modules).length===16&&Object.values(s.stats().modules).every(m=>m.status==='ready'&&m.errors===0),errors:[...s.errors]};
}

try{
 for(const seed of seeds){
  const page=await browser.newPage({viewport:{width:1280,height:720}}),browserErrors=[];
  page.on('pageerror',e=>browserErrors.push(String(e)));page.on('console',m=>{if(m.type()==='error')browserErrors.push(m.text());});page.on('response',r=>{if(r.status()>=400)browserErrors.push(`HTTP ${r.status()} ${r.url()}`);});
  await page.route('**/@vite/client',r=>r.fulfill({status:200,contentType:'application/javascript',body:''}));
  await page.goto(`${base}/?showcase=all&time=12&camera=aerial&seed=${seed}&quality=high&speed=0&headless=1`,{waitUntil:'domcontentloaded',timeout:240000});
  await page.waitForFunction(()=>{const s=window.__sim,a=s?.registry?.apis;return s?.ready===true&&typeof a?.tools?.select==='function'&&typeof a?.zoning?.serialize==='function'&&typeof a?.buildings?.serialize==='function';},null,{timeout:240000});
  await settle(page,90);const before=await page.evaluate(snapshot);
  const transaction=await page.evaluate(()=>{const t=window.__sim.registry.apis.tools;t.select('road',{type:'alley',mode:'straight',elevation:0,oneWay:false,snap:['magnet']});t.pointer(80,40);t.click(0);t.pointer(80,120);const draft=t.state(),commit=t.commit();t.select(null);return{draft,commit};});
  await settle(page,120);const after=await page.evaluate(snapshot);
  const undoResult=await page.evaluate(()=>window.__sim.registry.apis.tools.undo());await settle(page,120);const undo=await page.evaluate(snapshot);
  const redoResult=await page.evaluate(()=>window.__sim.registry.apis.tools.redo());await settle(page,120);const redo=await page.evaluate(snapshot);
  const run={seed,before,transaction,after,undo:{...undo,result:undoResult},redo:{...redo,result:redoResult},browserErrors};
  run.pass=!browserErrors.length&&[before,after,undo,redo].every(x=>x.ready16&&!x.errors.length&&x.integrity.ownerSafe)&&before.showcase==='all'&&transaction.draft.valid===true&&transaction.commit.ok===true;
  // The paused all-alias must leave invalidated replacement lots to Simulation. One removed
  // building per seed means stock falls by one and at least one live lot is intentionally free.
  run.pass=run.pass&&after.counts.buildings===before.counts.buildings-1&&after.counts.freeLots>=1&&after.integrity.unbuiltLots.length===after.counts.freeLots&&undo.integrity.unbuiltLots.length>=1&&redo.integrity.unbuiltLots.length>=1&&undoResult===true&&redoResult===true&&after.money===before.money-96&&undo.money===before.money&&redo.money===after.money;
  result.runs.push(run);await page.close();
 }
}catch(e){result.errors.push(String(e?.stack||e));}finally{await browser.close();}
result.pass=!result.errors.length&&result.runs.length===seeds.length&&result.runs.every(r=>r.pass);
fs.writeFileSync(out,`${JSON.stringify(result,null,2)}\n`);console.log(JSON.stringify({pass:result.pass,errors:result.errors,runs:result.runs.map(r=>({seed:r.seed,pass:r.pass,before:r.before.counts,after:r.after.counts,undo:r.undo.counts,redo:r.redo.counts,orphanAfter:r.after.integrity.orphanBuildings.length,errors:r.browserErrors}))},null,2));if(!result.pass)process.exitCode=1;
