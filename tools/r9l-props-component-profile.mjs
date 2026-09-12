#!/usr/bin/env node
// R9l: repeated Props component A/B masks with fixed reflection, headless-sync and uncapped diagnostic policies.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base=process.env.SIM_URL||'http://127.0.0.1:5173';
const out=process.env.OUT_FILE||'shots/democity/interleaved-props-components.json';
const camera=process.env.CAMERA||'interchange',time=Number(process.env.TIME||22);
const frames=Number(process.env.SAMPLE_FRAMES||120),warmFrames=Number(process.env.WARM_FRAMES||120),cycles=Number(process.env.CYCLES||3);
const components=(process.env.COMPONENTS||'lod1,pools,lenses').split(',').filter(Boolean);
const reflection=process.env.REFLECTION!=='off',captureSync=process.env.CAPTURE_SYNC!=='off',uncapped=process.env.UNCAPPED==='on';
const executablePath=process.env.SIM_CHROME||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',chromium.executablePath()].find(p=>fs.existsSync(p));
const browser=await chromium.launch({executablePath,headless:true,args:['--use-angle=metal','--use-gl=angle','--enable-webgl','--enable-gpu','--ignore-gpu-blocklist','--no-sandbox',...(uncapped?['--disable-frame-rate-limit','--disable-gpu-vsync']:[])]});
const result={method:'one warmed page per component; A0-B0-A1-B1-A2-B2-A3; each B compared with adjacent A mean',url:base,camera,time,frames,warmFrames,cycles,reflection,captureSync,uncapped,components:[],errors:[]};
const median=a=>a.slice().sort((x,y)=>x-y)[Math.floor(a.length/2)];

try{
 for(const component of components){
  const page=await browser.newPage({viewport:{width:1920,height:1080}}),browserErrors=[];
  page.on('pageerror',e=>browserErrors.push(String(e)));page.on('console',m=>{if(m.type()==='error')browserErrors.push(m.text());});page.on('response',r=>{if(r.status()>=400)browserErrors.push(`HTTP ${r.status()} ${r.url()}`);});
  await page.route('**/@vite/client',r=>r.fulfill({status:200,contentType:'application/javascript',body:''}));
  await page.goto(`${base}/?showcase=democity&time=${time}&camera=${camera}&seed=1337&quality=high&speed=0${captureSync?'&headless=1':''}`,{waitUntil:'domcontentloaded',timeout:240000});
  await page.waitForFunction(()=>window.__sim?.ready===true,null,{timeout:240000});
  const row=await page.evaluate(async({component,frames,warmFrames,cycles,reflection})=>{
   const sim=window.__sim,group=sim.registry.get('props').group;if(!reflection)sim.registry.apis.terrain.setReflection(false);
   const tri=o=>o.geometry?.index?o.geometry.index.count/3:(o.geometry?.attributes?.position?.count??0)/3;
   const match=o=>o.visible&&(
    component==='lod1'&&o.isInstancedMesh&&o.material?.isMeshStandardMaterial&&tri(o)===168||
    component==='impostors'&&o.isInstancedMesh&&o.material?.isMeshStandardMaterial&&tri(o)===4||
    component==='pools'&&o.isInstancedMesh&&o.material?.isShaderMaterial&&tri(o)===288||
    component==='lenses'&&o.isInstancedMesh&&o.material?.isMeshBasicMaterial&&tri(o)===12||
    component==='halos'&&o.isPoints&&o.material?.isShaderMaterial||
    component==='furniture'&&o.isMesh&&!o.isInstancedMesh&&o.material?.isMeshStandardMaterial);
   const objects=[];group.traverse(o=>{if(match(o))objects.push(o);});
   const inventory={objects:objects.length,instances:objects.reduce((n,o)=>n+(o.isInstancedMesh?o.count:1),0),sourceTriangles:objects.reduce((n,o)=>n+tri(o)*(o.isInstancedMesh?o.count:1),0),baseTriangles:[...new Set(objects.map(tri))].sort((a,b)=>a-b)};
   const descriptors=objects.map(o=>[o,Object.getOwnPropertyDescriptor(o,'visible')]);let locked=false;
   const lock=()=>{if(locked)return;for(const[o]of descriptors)Object.defineProperty(o,'visible',{configurable:true,get:()=>false,set:()=>{}});locked=true;};
   const unlock=()=>{if(!locked)return;for(const[o,d]of descriptors)Object.defineProperty(o,'visible',d);locked=false;};
   const wait=async n=>{const start=sim.engine.stats.frames;while(sim.engine.stats.frames<start+n)await new Promise(requestAnimationFrame);};
   const sample=async(label,masked)=>{masked?lock():unlock();const start=sim.engine.stats.frames,started=performance.now();let last=start,count=0,samples=0,draws=0,triangles=0;while(sim.engine.stats.frames<start+frames){await new Promise(requestAnimationFrame);const f=sim.engine.stats.frames;if(f===last)continue;count+=f-last;last=f;samples++;const s=sim.stats();draws+=s.drawCalls;triangles+=s.triangles;}return{label,masked,fps:count/((performance.now()-started)/1000),sampledFrames:count,samples,average:{drawCalls:draws/samples,triangles:triangles/samples},errors:sim.errors.slice()};};
   const blocks=[];
   try{await wait(warmFrames);blocks.push(await sample('A0',false));for(let i=0;i<cycles;i++){blocks.push(await sample(`B${i}`,true));blocks.push(await sample(`A${i+1}`,false));}return{inventory,blocks};}
   finally{unlock();if(!reflection)sim.registry.apis.terrain.setReflection(true);}
  },{component,frames,warmFrames,cycles,reflection});
  const pairs=[];for(let i=0;i<cycles;i++){const before=row.blocks[i*2],masked=row.blocks[i*2+1],after=row.blocks[i*2+2],expected=(before.fps+after.fps)/2;pairs.push({cycle:i,expectedFps:expected,maskedFps:masked.fps,fpsPct:(masked.fps/expected-1)*100,controlDriftPct:Math.abs(after.fps-before.fps)/expected*100,drawCalls:masked.average.drawCalls-(before.average.drawCalls+after.average.drawCalls)/2,triangles:masked.average.triangles-(before.average.triangles+after.average.triangles)/2});}
  const summary={medianFpsPct:median(pairs.map(p=>p.fpsPct)),maxControlDriftPct:Math.max(...pairs.map(p=>p.controlDriftPct)),stableCycles:pairs.filter(p=>p.controlDriftPct<=5).length,medianDrawCalls:median(pairs.map(p=>p.drawCalls)),medianTriangles:median(pairs.map(p=>p.triangles))};
  result.components.push({component,...row,pairs,summary,browserErrors});await page.close();
 }
 result.pass=result.errors.length===0&&result.components.every(r=>r.inventory.objects>0&&r.summary.stableCycles>=2&&!r.browserErrors.length&&r.blocks.every(b=>!b.errors.length));
 fs.mkdirSync(out.split('/').slice(0,-1).join('/')||'.',{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify({pass:result.pass,camera,reflection,captureSync,uncapped,errors:result.errors,rows:result.components.map(r=>({component:r.component,inventory:r.inventory,summary:r.summary,pairs:r.pairs}))},null,2));
 if(!result.pass)process.exitCode=1;
}finally{await browser.close();}
