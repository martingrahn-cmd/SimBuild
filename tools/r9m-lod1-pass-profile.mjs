// R9m: split real Props LOD1 total, colour-without-shadow and shadow-only responses.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base=process.env.SIM_URL||'http://127.0.0.1:5173';
const out=process.env.OUT_FILE||'shots/democity/r9m-lod1-passes/profile.json';
const camera=process.env.CAMERA||'street';
const frames=Number(process.env.SAMPLE_FRAMES||180),warmFrames=Number(process.env.WARM_FRAMES||180),settleFrames=Number(process.env.SETTLE_FRAMES||30),cycles=Number(process.env.CYCLES||3);
const modes=(process.env.MODES||'total,color,shadow').split(',').filter(Boolean);
const executablePath=process.env.SIM_CHROME||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',chromium.executablePath()].find(p=>fs.existsSync(p));
const browser=await chromium.launch({executablePath,headless:true,args:['--use-angle=metal','--use-gl=angle','--enable-webgl','--enable-gpu','--ignore-gpu-blocklist','--no-sandbox','--disable-frame-rate-limit','--disable-gpu-vsync']});
const median=a=>{const s=a.slice().sort((x,y)=>x-y),m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2;};
const result={method:'fresh page per mode; wait for camera flight plus fixed 30-frame pre-inventory settle; reflection off; headless on; uncapped; alternating adjacent controls; settle after each state switch',url:base,seed:1337,camera,time:22,quality:'high',frames,warmFrames,settleFrames,cycles,modes:[],errors:[]};

try{
 for(const mode of modes){
  const page=await browser.newPage({viewport:{width:1920,height:1080}}),browserErrors=[];
  page.on('pageerror',e=>browserErrors.push(String(e)));page.on('console',m=>{if(m.type()==='error')browserErrors.push(m.text());});page.on('response',r=>{if(r.status()>=400)browserErrors.push(`HTTP ${r.status()} ${r.url()}`);});
  await page.route('**/@vite/client',r=>r.fulfill({status:200,contentType:'application/javascript',body:''}));
  await page.goto(`${base}/?showcase=democity&time=22&camera=${camera}&seed=1337&quality=high&speed=0&headless=1`,{waitUntil:'domcontentloaded',timeout:240000});
  await page.waitForFunction(()=>window.__sim?.ready===true,null,{timeout:240000});
  const row=await page.evaluate(async({mode,frames,warmFrames,settleFrames,cycles})=>{
   const sim=window.__sim,group=sim.registry.get('props').group;sim.registry.apis.terrain.setReflection(false);
   const wait=async n=>{const start=sim.engine.stats.frames;while(sim.engine.stats.frames<start+n)await new Promise(requestAnimationFrame);};
   let guard=0;while(sim.camera._fly&&guard++<600)await wait(1);if(sim.camera._fly)throw Error('camera flight did not settle');await wait(30);
   const tri=o=>o.geometry?.index?o.geometry.index.count/3:(o.geometry?.attributes?.position?.count??0)/3;
   const objects=[];group.traverse(o=>{if(o.visible&&o.isInstancedMesh&&o.material?.isMeshStandardMaterial&&tri(o)===168)objects.push(o);});
   const inventory={objects:objects.length,instances:objects.reduce((n,o)=>n+o.count,0),sourceTriangles:objects.reduce((n,o)=>n+tri(o)*o.count,0),baseTriangles:[...new Set(objects.map(tri))]};
   const visible=objects.map(o=>[o,Object.getOwnPropertyDescriptor(o,'visible')]);
   const shadow=objects.map(o=>[o,Object.getOwnPropertyDescriptor(o,'castShadow')]);
   let visibleLocked=false,shadowLocked=false;
   const lockVisibleFalse=()=>{if(visibleLocked)return;for(const[o]of visible)Object.defineProperty(o,'visible',{configurable:true,get:()=>false,set:()=>{}});visibleLocked=true;};
   const restoreVisible=()=>{if(!visibleLocked)return;for(const[o,d]of visible)Object.defineProperty(o,'visible',d);visibleLocked=false;};
   const lockShadowFalse=()=>{if(shadowLocked)return;for(const[o]of shadow)Object.defineProperty(o,'castShadow',{configurable:true,get:()=>false,set:()=>{}});shadowLocked=true;};
   const restoreShadow=()=>{if(!shadowLocked)return;for(const[o,d]of shadow)Object.defineProperty(o,'castShadow',d);shadowLocked=false;};
   const setState=masked=>{
    restoreVisible();restoreShadow();
    if(mode==='total'){if(masked)lockVisibleFalse();}
    else if(mode==='shadow'){if(masked)lockShadowFalse();}
    else if(mode==='color'){lockShadowFalse();if(masked)lockVisibleFalse();}
    else throw new Error(`unknown mode ${mode}`);
   };
   const sample=async(label,masked)=>{
    setState(masked);await wait(settleFrames);
    const start=sim.engine.stats.frames,started=performance.now();let last=start,count=0,draws=0,triangles=0;const frameIntervals=[];let previous=performance.now();
    while(sim.engine.stats.frames<start+frames){await new Promise(requestAnimationFrame);const now=performance.now(),f=sim.engine.stats.frames;if(f===last)continue;frameIntervals.push(now-previous);previous=now;count+=f-last;last=f;const s=sim.stats();draws+=s.drawCalls;triangles+=s.triangles;}
    const elapsedMs=performance.now()-started,samples=frameIntervals.length;
    return{label,masked,elapsedMs,fps:count/(elapsedMs/1000),sampledFrames:count,samples,frameIntervals,average:{drawCalls:draws/samples,triangles:triangles/samples},errors:sim.errors.slice()};
   };
   const gl=sim.engine.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
   const renderer=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
   const framebuffer={width:gl.drawingBufferWidth,height:gl.drawingBufferHeight};
   const blocks=[];
   try{setState(false);await wait(warmFrames);blocks.push(await sample('A0',false));for(let i=0;i<cycles;i++){blocks.push(await sample(`B${i}`,true));blocks.push(await sample(`A${i+1}`,false));}return{inventory,renderer,framebuffer,blocks};}
   finally{restoreVisible();restoreShadow();sim.registry.apis.terrain.setReflection(true);}
  },{mode,frames,warmFrames,settleFrames,cycles});
  const pairs=[];for(let i=0;i<cycles;i++){const before=row.blocks[i*2],masked=row.blocks[i*2+1],after=row.blocks[i*2+2],expected=(before.fps+after.fps)/2;pairs.push({cycle:i,expectedFps:expected,maskedFps:masked.fps,fpsPct:(masked.fps/expected-1)*100,controlDriftPct:Math.abs(after.fps-before.fps)/expected*100,drawCalls:masked.average.drawCalls-(before.average.drawCalls+after.average.drawCalls)/2,triangles:masked.average.triangles-(before.average.triangles+after.average.triangles)/2});}
  const stable=pairs.filter(p=>p.controlDriftPct<=5);
  const summary={stableCycles:stable.length,stableMedianFpsPct:stable.length?median(stable.map(p=>p.fpsPct)):null,stableMedianDrawCalls:stable.length?median(stable.map(p=>p.drawCalls)):null,stableMedianTriangles:stable.length?median(stable.map(p=>p.triangles)):null,maxControlDriftPct:Math.max(...pairs.map(p=>p.controlDriftPct))};
  result.modes.push({mode,...row,pairs,summary,browserErrors});await page.close();
 }
 result.pass=result.errors.length===0&&result.modes.every(r=>r.inventory.objects>0&&r.summary.stableCycles>=2&&!r.browserErrors.length&&r.blocks.every(b=>!b.errors.length));
 fs.mkdirSync(out.split('/').slice(0,-1).join('/')||'.',{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify({pass:result.pass,modes:result.modes.map(r=>({mode:r.mode,inventory:r.inventory,renderer:r.renderer,framebuffer:r.framebuffer,summary:r.summary,pairs:r.pairs}))},null,2));
 if(!result.pass)process.exitCode=1;
}finally{await browser.close();}
