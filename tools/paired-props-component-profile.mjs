#!/usr/bin/env node
// Same-page A-B-A sensitivity for exact accepted-source Props render components.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base=process.env.SIM_URL||'http://127.0.0.1:5173';
const out=process.env.OUT_FILE||'shots/democity/paired-props-components.json';
const camera=process.env.CAMERA||'interchange',time=Number(process.env.TIME||22);
const sampleFrames=Number(process.env.SAMPLE_FRAMES||120),warmFrames=Number(process.env.WARM_FRAMES||30);
const components=(process.env.COMPONENTS||'lod1,pools,lenses,halos').split(',').filter(Boolean);
const reflection=process.env.REFLECTION!=='off';
const executablePath=process.env.SIM_CHROME||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',chromium.executablePath()].find(p=>fs.existsSync(p));
const browser=await chromium.launch({executablePath,headless:true,args:['--use-angle=metal','--use-gl=angle','--enable-webgl','--enable-gpu','--ignore-gpu-blocklist','--no-sandbox']});
const result={method:'same-page A-B-A exact Props object visibility mask; fixed reflection policy per page',url:base,camera,time,sampleFrames,warmFrames,reflection,components:[]};

try{
 for(const component of components){
  const page=await browser.newPage({viewport:{width:1920,height:1080}}),browserErrors=[];
  page.on('pageerror',e=>browserErrors.push(String(e)));page.on('console',m=>{if(m.type()==='error')browserErrors.push(m.text());});
  await page.route('**/@vite/client',r=>r.fulfill({status:200,contentType:'application/javascript',body:''}));
  await page.goto(`${base}/?showcase=democity&time=${time}&camera=${camera}&seed=1337&quality=high&headless=1&speed=0`,{waitUntil:'domcontentloaded',timeout:240000});
  await page.waitForFunction(()=>window.__sim?.ready===true,null,{timeout:240000});
  const measurements=await page.evaluate(async({component,sampleFrames,warmFrames,reflection})=>{
   const sim=window.__sim,group=sim.registry.get('props').group;
   if(!reflection)sim.registry.apis.terrain.setReflection(false);
   const tri=o=>o.geometry?.index?o.geometry.index.count/3:(o.geometry?.attributes?.position?.count??0)/3;
   const matches=o=>{
    if(!o.visible)return false;const t=tri(o);
    if(component==='lod1')return o.isInstancedMesh&&o.material?.isMeshStandardMaterial&&t===168;
    if(component==='impostors')return o.isInstancedMesh&&o.material?.isMeshStandardMaterial&&t===4;
    if(component==='pools')return o.isInstancedMesh&&o.material?.isShaderMaterial&&t===288;
    if(component==='lenses')return o.isInstancedMesh&&o.material?.isMeshBasicMaterial&&t===12;
    if(component==='halos')return o.isPoints&&o.material?.isShaderMaterial;
    if(component==='furniture')return o.isMesh&&!o.isInstancedMesh&&o.material?.isMeshStandardMaterial;
    return false;
   };
   const objects=[];group.traverse(o=>{if(matches(o))objects.push(o);});
   const inventory={objects:objects.length,instances:objects.reduce((n,o)=>n+(o.isInstancedMesh?o.count:1),0),sourceTriangles:objects.reduce((n,o)=>n+tri(o)*(o.isInstancedMesh?o.count:1),0),baseTriangles:[...new Set(objects.map(tri))].sort((a,b)=>a-b)};
   const wait=async n=>{const start=sim.engine.stats.frames;while(sim.engine.stats.frames<start+n)await new Promise(requestAnimationFrame);};
   const sample=async(label)=>{await wait(warmFrames);const start=sim.engine.stats.frames,started=performance.now();let last=start,count=0,samples=0,draws=0,triangles=0,maxDraws=0,maxTriangles=0;while(sim.engine.stats.frames<start+sampleFrames){await new Promise(requestAnimationFrame);const f=sim.engine.stats.frames;if(f===last)continue;count+=f-last;last=f;samples++;const s=sim.stats();draws+=s.drawCalls;triangles+=s.triangles;maxDraws=Math.max(maxDraws,s.drawCalls);maxTriangles=Math.max(maxTriangles,s.triangles);}return{label,fps:count/((performance.now()-started)/1000),sampledFrames:count,samples,average:{drawCalls:draws/samples,triangles:triangles/samples},max:{drawCalls:maxDraws,triangles:maxTriangles},errors:sim.errors.slice()};};
   const before=await sample('baseline-before');
   const descriptors=objects.map(o=>[o,Object.getOwnPropertyDescriptor(o,'visible')]);
   for(const[o]of descriptors)Object.defineProperty(o,'visible',{configurable:true,get:()=>false,set:()=>{}});
   const masked=await sample('component-hidden');
   for(const[o,d]of descriptors)Object.defineProperty(o,'visible',d);
   const after=await sample('baseline-after');
   if(!reflection)sim.registry.apis.terrain.setReflection(true);
   return{inventory,before,masked,after};
  },{component,sampleFrames,warmFrames,reflection});
  const{before,masked,after}=measurements,expected={fps:(before.fps+after.fps)/2,drawCalls:(before.average.drawCalls+after.average.drawCalls)/2,triangles:(before.average.triangles+after.average.triangles)/2};
  const driftPct=Math.abs(after.fps-before.fps)/expected.fps*100,delta={fps:masked.fps-expected.fps,fpsPct:(masked.fps/expected.fps-1)*100,drawCalls:masked.average.drawCalls-expected.drawCalls,triangles:masked.average.triangles-expected.triangles};
  result.components.push({component,...measurements,expected,delta,baselineDriftPct:driftPct,timingStable:driftPct<=5,browserErrors});await page.close();
 }
 result.pass=result.components.every(r=>r.inventory.objects>0&&r.timingStable&&!r.browserErrors.length&&[r.before,r.masked,r.after].every(s=>!s.errors.length));
 fs.mkdirSync(out.split('/').slice(0,-1).join('/')||'.',{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify({pass:result.pass,camera,reflection,rows:result.components.map(r=>({component:r.component,inventory:r.inventory,expectedFps:r.expected.fps,maskedFps:r.masked.fps,deltaPct:r.delta.fpsPct,driftPct:r.baselineDriftPct,draws:r.delta.drawCalls,triangles:r.delta.triangles,stable:r.timingStable}))},null,2));
}finally{await browser.close();}
