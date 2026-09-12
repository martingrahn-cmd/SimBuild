#!/usr/bin/env node
// Interleave legacy/candidate pages while timing Traffic's update callback.
// Legacy removes only the hidden fallback-mast early return from current source.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base=process.env.SIM_URL||'http://127.0.0.1:5173';
const out=process.env.OUT_FILE||'shots/democity/hidden-mast-ab-profile.json';
const camera=process.env.CAMERA||'interchange',time=Number(process.env.TIME||22);
const frames=Number(process.env.SAMPLE_FRAMES||360),warmFrames=Number(process.env.WARM_FRAMES||90);
const moveCamera=process.env.MOVE_CAMERA==='1';
const order=(process.env.ORDER||'legacy,candidate,candidate,legacy,legacy,candidate').split(',');
const source=fs.readFileSync(new URL('../src/modules/traffic/masts.js',import.meta.url),'utf8');
const marker=' if(!m.g.visible)return;\n';
if(!source.includes(marker))throw new Error('Current Traffic mast source lacks the R8q marker');
const executablePath=process.env.SIM_CHROME||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',chromium.executablePath()].find(p=>fs.existsSync(p));
const browser=await chromium.launch({executablePath,headless:true,args:['--use-angle=metal','--use-gl=angle','--enable-webgl','--enable-gpu','--ignore-gpu-blocklist','--no-sandbox']});
const runs=[];
const median=a=>a.slice().sort((x,y)=>x-y)[Math.floor(a.length/2)];

try{
 for(let runIndex=0;runIndex<order.length;runIndex++){
  const variant=order[runIndex],page=await browser.newPage({viewport:{width:1920,height:1080}}),browserErrors=[];
  page.on('pageerror',e=>browserErrors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')browserErrors.push(m.text());});
  await page.route('**/@vite/client',r=>r.fulfill({status:200,contentType:'application/javascript',body:''}));
  if(variant==='legacy')await page.route('**/src/modules/traffic/masts.js*',async r=>{const response=await r.fetch(),body=await response.text();if(!body.includes(marker))throw new Error('Served Traffic mast source lacks the R8q marker');await r.fulfill({response,body:body.replace(marker,'')});});
  await page.goto(`${base}/?showcase=democity&time=${time}&camera=${camera}&seed=1337&quality=high&headless=1&speed=0`,{waitUntil:'domcontentloaded',timeout:240000});
  await page.waitForFunction(()=>window.__sim?.ready===true,null,{timeout:240000});
  const measurement=await page.evaluate(async({frames,warmFrames,moveCamera})=>{
   const sim=window.__sim,rec=sim.registry.get('traffic'),controller=rec.ctx.camera,original=rec.def.update,samples=[];
   const mastGroup=rec.group.getObjectByName('traffic:masts');
   const lens=mastGroup?.children.find(o=>o.isInstancedMesh);
   rec.def.update=function(...args){const start=performance.now();try{return original.apply(this,args);}finally{samples.push(performance.now()-start);}};
   const wait=async n=>{const start=sim.engine.stats.frames;while(sim.engine.stats.frames<start+n){if(moveCamera)controller.yaw+=.0005;await new Promise(requestAnimationFrame);}};
   try{
    await wait(warmFrames);samples.length=0;
    const matrixVersionBefore=lens?.instanceMatrix?.version??null,colorVersionBefore=lens?.instanceColor?.version??null;
    const start=sim.engine.stats.frames,started=performance.now();let last=start,count=0,draws=0,tris=0;
    while(sim.engine.stats.frames<start+frames){if(moveCamera)controller.yaw+=.0005;await new Promise(requestAnimationFrame);const f=sim.engine.stats.frames;if(f===last)continue;count+=f-last;last=f;draws+=sim.engine.stats.drawCalls;tris+=sim.engine.stats.triangles;}
    const elapsedMs=performance.now()-started,sorted=samples.slice().sort((a,b)=>a-b),pick=p=>sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))]??0,totalMs=samples.reduce((a,b)=>a+b,0);
    return {sampledFrames:count,elapsedMs,fps:count/(elapsedMs/1000),traffic:{samples:samples.length,totalMs,meanMs:totalMs/samples.length,p50Ms:pick(.5),p95Ms:pick(.95),p99Ms:pick(.99),maxMs:sorted.at(-1)??0},averageDrawCalls:draws/count,averageTriangles:tris/count,masts:{groupVisible:mastGroup?.visible??null,lensCount:lens?.count??null,matrixVersionBefore,matrixVersionAfter:lens?.instanceMatrix?.version??null,colorVersionBefore,colorVersionAfter:lens?.instanceColor?.version??null},errors:sim.errors.slice()};
   }finally{rec.def.update=original;}
  },{frames,warmFrames,moveCamera});
  runs.push({runIndex,variant,...measurement,browserErrors});await page.close();
 }
 const summary={};
 for(const variant of ['legacy','candidate']){const a=runs.filter(r=>r.variant===variant);summary[variant]={runs:a.length,medianFps:median(a.map(r=>r.fps)),medianTrafficMeanMs:median(a.map(r=>r.traffic.meanMs)),medianTrafficP95Ms:median(a.map(r=>r.traffic.p95Ms)),drawCallsRange:[Math.min(...a.map(r=>r.averageDrawCalls)),Math.max(...a.map(r=>r.averageDrawCalls))],trianglesRange:[Math.min(...a.map(r=>r.averageTriangles)),Math.max(...a.map(r=>r.averageTriangles))]};}
 summary.delta={fps:summary.candidate.medianFps-summary.legacy.medianFps,fpsPct:(summary.candidate.medianFps/summary.legacy.medianFps-1)*100,trafficMeanMs:summary.candidate.medianTrafficMeanMs-summary.legacy.medianTrafficMeanMs,trafficMeanPct:(summary.candidate.medianTrafficMeanMs/summary.legacy.medianTrafficMeanMs-1)*100};
 const result={method:'six interleaved fresh pages; legacy route removes only hidden mast early return',url:base,camera,time,frames,warmFrames,moveCamera,order,runs,summary};
 result.pass=runs.every(r=>!r.errors.length&&!r.browserErrors.length&&r.masts.groupVisible===false&&r.masts.lensCount>0&&(r.variant==='legacy'?r.masts.matrixVersionAfter>r.masts.matrixVersionBefore&&r.masts.colorVersionAfter>r.masts.colorVersionBefore:r.masts.matrixVersionAfter===r.masts.matrixVersionBefore&&r.masts.colorVersionAfter===r.masts.colorVersionBefore));
 fs.mkdirSync(out.split('/').slice(0,-1).join('/')||'.',{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2));
 console.log(JSON.stringify({pass:result.pass,summary,runs:runs.map(r=>({variant:r.variant,fps:r.fps,trafficMeanMs:r.traffic.meanMs,trafficP95Ms:r.traffic.p95Ms,drawCalls:r.averageDrawCalls,triangles:r.averageTriangles,masts:r.masts,errors:r.errors,browserErrors:r.browserErrors}))},null,2));
}finally{await browser.close();}
