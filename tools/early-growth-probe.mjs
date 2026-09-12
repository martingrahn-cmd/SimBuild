#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'node:fs';

const base=process.env.SIM_URL||'http://127.0.0.1:5173',out='shots/playtest-fixes-r12/early-growth.json';
const errors=[],browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=metal','--use-gl=angle','--enable-webgl','--enable-gpu','--ignore-gpu-blocklist','--no-sandbox']});
const page=await browser.newPage({viewport:{width:1000,height:700}});
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
  await page.goto(`${base}/?mode=play&headless=1&speed=0&time=12&seed=6200`,{waitUntil:'domcontentloaded',timeout:240000});
  await page.waitForFunction(()=>window.__sim?.ready===true,null,{timeout:240000});
  const result=await page.evaluate(()=>{const s=window.__sim,w=s.world,sim=s.registry.apis.simulation;s.freeze();let id=80000;
    for(let i=0;i<20;i++)w.buildings.items.set(id,{id:id++,type:'residential',density:'low',level:1,footprint:{w:12,d:14},floors:2,x:i*15,z:0});
    for(let i=0;i<5;i++)w.buildings.items.set(id,{id:id++,type:'industrial',density:'low',level:1,footprint:{w:22,d:22},floors:1,x:i*25,z:60});
    for(let i=0;i<4;i++)w.buildings.items.set(id,{id:id++,type:'commercial',density:'low',level:1,footprint:{w:14,d:14},floors:1,x:i*20,z:30});
    w.buildings.version++;s.events.emit('buildings:changed');const initial=sim.serialize();
    const run=()=>{sim.deserialize(structuredClone(initial));const samples=[];for(const ticks of[600,600,1200,2400]){sim.step(ticks);samples.push({day:+((sim.tick()-initial.economy.tick)/2400).toFixed(2),population:w.economy.population,jobs:w.economy.jobs,happiness:w.economy.happiness,attractiveness:w.economy.attractiveness});}return{samples,save:sim.serialize()};};
    const a=run(),b=run();return{samples:a.samples,deterministic:JSON.stringify(a)===JSON.stringify(b),errors:[...s.errors]};});
  const record={...result,browserErrors:errors,pass:!errors.length&&!result.errors.length&&result.deterministic&&result.samples[0].population>=25&&result.samples[2].population>=90};
  fs.mkdirSync(out.slice(0,out.lastIndexOf('/')),{recursive:true});fs.writeFileSync(out,JSON.stringify(record,null,2));console.log(JSON.stringify(record,null,2));if(!record.pass)process.exitCode=1;
}finally{await browser.close();}
