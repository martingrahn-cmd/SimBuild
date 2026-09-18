#!/usr/bin/env node
import { chromium } from 'playwright';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const baseline = process.env.SIM_BASELINE_URL || 'http://127.0.0.1:5183';
const candidate = process.env.SIM_CANDIDATE_URL || 'http://127.0.0.1:5184';
const out = process.env.SIM_DEMOCITY_PARK_OUT || 'shots/democity/park-contract.json';
const executablePath = process.env.SIM_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');

const browser = await chromium.launch({executablePath,headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist','--enable-webgl','--enable-gpu','--no-sandbox']});
async function capture(base, seed) {
  const page = await browser.newPage({viewport:{width:1280,height:720}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(`${base}/?showcase=democity&seed=${seed}&headless=1&speed=0`,{waitUntil:'domcontentloaded',timeout:300000});
  await page.waitForFunction(()=>window.__sim?.ready===true,null,{timeout:300000});
  const data=await page.evaluate(()=>{
    const s=window.__sim,w=s.world,api=s.registry.apis;
    const ordered=m=>[...m.values()].sort((a,b)=>a.id-b.id);
    const roads=ordered(w.roads.edges).map(e=>[e.id,e.a,e.b,e.type,e.oneWay,e.lanes,e.width,e.length,e.ctrl,e.bridge,e.trimA,e.trimB]);
    const lots=ordered(w.zones.lots).map(l=>[l.id,l.x,l.z,l.w,l.d,l.heading,l.edgeId,l.side,l.type,l.density,l.level,l.buildingId,l.cells]);
    const buildings=ordered(w.buildings.items).map(b=>[b.id,b.lotId,b.x,b.y,b.z,b.heading,b.type,b.density,b.level,b.height,b.footprint,b.plan]);
    const services=ordered(w.services.items).map(v=>[v.id,v.kind,v.x,v.y,v.z,v.heading,v.cost,v.footprint]);
    const before=api.services.serialize();api.services.deserialize(JSON.parse(JSON.stringify(before)));const after=api.services.serialize();
    const park=ordered(w.services.items).filter(v=>v.kind==='park_large').map(v=>({id:v.id,x:v.x,z:v.z,heading:v.heading,footprint:v.footprint}));
    return {roads:JSON.stringify(roads),lots:JSON.stringify(lots),buildings:JSON.stringify(buildings),services:JSON.stringify(services),serviceRoundTripExact:JSON.stringify(before)===JSON.stringify(after),park,stats:api.democity.stats(),economy:{population:w.economy.population,jobs:w.economy.jobs,money:w.economy.money,net:w.economy.net,happiness:w.economy.happiness},errors:s.errors.slice()};
  });
  await page.close();
  return {seed,hashes:{roads:hash(data.roads),lots:hash(data.lots),buildings:hash(data.buildings),services:hash(data.services)},counts:{roads:JSON.parse(data.roads).length,lots:JSON.parse(data.lots).length,buildings:JSON.parse(data.buildings).length,services:JSON.parse(data.services).length},park:data.park,serviceRoundTripExact:data.serviceRoundTripExact,economy:data.economy,engineErrors:data.errors,browserErrors:errors};
}

const runs=[];
for(const seed of [1337,7]){
  const a=await capture(baseline,seed),b=await capture(candidate,seed),repeat=await capture(candidate,seed);
  runs.push({seed,baseline:a,candidate:b,repeat,unchanged:{roads:a.hashes.roads===b.hashes.roads,lots:a.hashes.lots===b.hashes.lots,buildings:a.hashes.buildings===b.hashes.buildings},candidateDeterministic:JSON.stringify(b.hashes)===JSON.stringify(repeat.hashes),candidateServiceRoundTrip:b.serviceRoundTripExact&&repeat.serviceRoundTripExact});
}
const ok=runs.every(r=>Object.values(r.unchanged).every(Boolean)&&r.candidateDeterministic&&r.candidateServiceRoundTrip&&r.candidate.park.length===1&&r.candidate.engineErrors.length===0&&r.candidate.browserErrors.length===0);
const result={ok,baseline,candidate,runs};
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
await browser.close();
if(!ok)process.exitCode=1;
