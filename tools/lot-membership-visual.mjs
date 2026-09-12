#!/usr/bin/env node
// R8v directed zoning-boundary captures; optionally routes a saved grid.js as the baseline.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const base=process.env.SIM_URL||'http://127.0.0.1:5173';
const label=process.env.LABEL||'candidate';
const outDir=process.env.OUT_DIR||`shots/democity/r8v-lot-membership/${label}-visual`;
const gridSource=process.env.GRID_SOURCE ? fs.readFileSync(process.env.GRID_SOURCE,'utf8') : null;
const executablePath=process.env.SIM_CHROME||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',chromium.executablePath()].find(fs.existsSync);
const browser=await chromium.launch({executablePath,headless:true,args:['--use-angle=metal','--use-gl=angle','--enable-webgl','--enable-gpu','--ignore-gpu-blocklist','--no-sandbox']});
const result={label,gridSource:process.env.GRID_SOURCE||'current',views:[]};
const specs=[
 {seed:1337,name:'seed1337-edge444',target:[-512,0,-232]},
 {seed:7,name:'seed7-edge443',target:[-20,0,-340]},
 {seed:7,name:'seed7-edge685',target:[-924,0,148]},
];
try{
 for(const spec of specs){
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.route('**/@vite/client',r=>r.fulfill({status:200,contentType:'application/javascript',body:''}));
  if(gridSource)await page.route('**/src/modules/zoning/grid.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:gridSource}));
  await page.goto(`${base}/?showcase=democity&headless=1&time=12&camera=aerial&speed=0&quality=high&seed=${spec.seed}`,{waitUntil:'domcontentloaded',timeout:240000});
  await page.waitForFunction(()=>window.__sim?.ready===true,null,{timeout:240000});
  const state=await page.evaluate(async(spec)=>{
   const s=window.__sim,z=s.registry.apis.zoning;
   // Remove real-time traffic/transit and wind-driven props from the visual comparison. The product
   // scene is unchanged; this directed evidence isolates static zoning boundaries and buildings.
   for(const name of ['traffic','transit','props','effects']){const rec=s.registry.get(name);if(rec)rec.group.visible=false;}
   z.setOverlayVisible(true);
   s.setCamera({yaw:.72,pitch:1.15,distance:220,target:spec.target});
   const f0=s.engine.stats.frames;while(s.engine.stats.frames<f0+40)await new Promise(requestAnimationFrame);
   const lots=[...s.world.zones.lots.values()];const refs=new Map(),duplicates=[];
   for(const l of lots){const seen=new Set();for(const k of l.cells||[]){if(seen.has(k))duplicates.push([l.id,k]);seen.add(k)}for(const k of seen){let a=refs.get(k);if(!a)refs.set(k,a=[]);a.push(l.id)}}
   const overlaps=[...refs].filter(([,ids])=>ids.length>1);
   const hashArray=(array)=>{let h=2166136261;const bytes=new Uint8Array(array.buffer,array.byteOffset,array.byteLength);for(const v of bytes){h^=v;h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,'0')};
   const zoneGroup=s.registry.get('zoning')?.group,geometry=[];
   zoneGroup?.traverse(o=>{if(!o.isMesh||!o.geometry)return;const attrs={};for(const [name,a] of Object.entries(o.geometry.attributes))attrs[name]={count:a.count,itemSize:a.itemSize,hash:hashArray(a.array)};geometry.push({name:o.name,index:o.geometry.index?hashArray(o.geometry.index.array):null,attrs})});
   geometry.sort((a,b)=>a.name.localeCompare(b.name));
   return{stats:z.stats(),render:s.stats(),duplicates,overlaps,geometry,errors:s.errors.slice(),camera:s.stats().camera};
  },spec);
  await page.evaluate(()=>window.__sim.freeze());await page.waitForTimeout(250);
  const png=path.join(outDir,`${spec.name}.png`);fs.mkdirSync(path.dirname(png),{recursive:true});await page.screenshot({path:png,timeout:180000});
  const row={...spec,png,state,browserErrors:errors,pass:!state.errors.length&&!errors.length};result.views.push(row);await page.close();
 }
 result.pass=result.views.every(v=>v.pass);fs.mkdirSync(outDir,{recursive:true});fs.writeFileSync(path.join(outDir,'summary.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify({label,pass:result.pass,views:result.views.map(v=>({name:v.name,stats:v.state.stats,render:{drawCalls:v.state.render.drawCalls,triangles:v.state.render.triangles},duplicates:v.state.duplicates.length,overlaps:v.state.overlaps.length,errors:v.state.errors,browserErrors:v.browserErrors}))},null,2));
 if(!result.pass)process.exitCode=1;
}finally{await browser.close()}
