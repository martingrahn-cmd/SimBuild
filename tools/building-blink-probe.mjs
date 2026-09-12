#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'node:fs';
const base=process.env.SIM_URL||'http://127.0.0.1:5180';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=metal','--use-gl=angle','--enable-webgl','--enable-gpu','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await page.goto(`${base}/?showcase=buildings&camera=closeup&time=12&speed=0&headless=1&seed=1337`,{waitUntil:'domcontentloaded',timeout:240000});
await page.waitForFunction(()=>window.__sim?.ready===true,null,{timeout:240000});
const result=await page.evaluate(async()=>{
 const s=window.__sim,w=s.world,building=[...w.buildings.items.values()].find(b=>b.level<5&&b._chunk);
 if(!building)throw Error('No levelable building');
 const key=building._chunk,prefix=`buildings:${key}:`,sample=()=>{
   const meshes=[];s.engine.scene.traverse(o=>{if(o.isMesh&&o.name.startsWith(prefix))meshes.push({name:o.name,visible:o.visible})});
   return{frame:s.engine.stats.frames,meshes,visible:meshes.filter(x=>x.visible).length};
 };
 const before=sample();w.buildings.levelUp(building.id);const frames=[];
 for(let i=0;i<16;i++){await new Promise(requestAnimationFrame);frames.push(sample())}
 return{id:building.id,key,before,frames,blankFrames:frames.filter(x=>x.visible===0).length};
});
const out={...result,errors,pass:result.before.visible===1&&result.blankFrames===0&&!errors.length};
fs.mkdirSync('shots/playtest-fixes-r14',{recursive:true});fs.writeFileSync('shots/playtest-fixes-r14/building-blink.json',JSON.stringify(out,null,2));
console.log(JSON.stringify(out,null,2));await browser.close();if(!out.pass)process.exitCode=1;
