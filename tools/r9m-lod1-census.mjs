#!/usr/bin/env node
// R9m: accepted-source LOD1 selector, species and castShadow census. Product source is not changed.
import { chromium } from 'playwright';
import fs from 'node:fs';
import crypto from 'node:crypto';

const base=process.env.SIM_URL||'http://127.0.0.1:5173';
const out=process.env.OUT_FILE||'shots/democity/r9m-lod1-passes/census.json';
const cameras=(process.env.CAMERAS||'interchange,street,park,aerial').split(',').filter(Boolean);
const sourcePath='src/modules/props/chunks.js',source=fs.readFileSync(sourcePath,'utf8'),hook='constructor(ctx, geo, mats) {';
if(source.split(hook).length!==2)throw Error('PropField hook marker must occur once');
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const executablePath=process.env.SIM_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser=await chromium.launch({executablePath,headless:true,args:['--use-angle=metal','--use-gl=angle','--enable-webgl','--enable-gpu','--ignore-gpu-blocklist','--no-sandbox']});
const result={method:'fresh accepted-source actual-Chrome/Metal page per camera; disposable routed PropField pointer and same-update _copy observation',sourcePath,sourceSha256:sha(source),cameras:[],pass:false};

try{
 for(const camera of cameras){
  const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`HTTP ${r.status()} ${r.url()}`);});
  await page.route('**/@vite/client',r=>r.fulfill({status:200,contentType:'application/javascript',body:''}));
  await page.route('**/src/modules/props/chunks.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes(hook))throw Error('transformed hook missing');body=body.replace(hook,`${hook}\n    globalThis.__R9M_FIELD = this;`);await route.fulfill({response,body,contentType:'application/javascript'});});
  await page.goto(`${base}/?showcase=democity&time=22&camera=${camera}&seed=1337&quality=high&speed=0&headless=1`,{waitUntil:'domcontentloaded',timeout:240000});
  await page.waitForFunction(()=>window.__sim?.ready===true&&globalThis.__R9M_FIELD,null,{timeout:240000});
  const row=await page.evaluate(async camera=>{
   const sim=window.__sim,f=globalThis.__R9M_FIELD,wait=async n=>{const start=sim.engine.stats.frames;while(sim.engine.stats.frames<start+n)await new Promise(requestAnimationFrame);};let guard=0;while((sim.camera._fly||f._queue?.length)&&guard++<900)await wait(1);if(sim.camera._fly||f._queue?.length)throw Error('camera/Props did not settle');await wait(30);
   const cam=sim.camera.camera;cam.updateProjectionMatrix();cam.updateMatrixWorld(true);cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
   const ordered=new Map();for(const[i,src]of f.collectSrc(f.placer,null)){const buckets=new Map();for(const t of src.trees){const k=`${Math.floor(t.x/32)},${Math.floor(t.z/32)}`;if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(t);}ordered.set(i,[...buckets.values()].flat());}
   const calls=[],raw=f._copy;f._copy=function(c,mesh,s,n,blend,inverted,isImp=false){const after=raw.call(this,c,mesh,s,n,blend,inverted,isImp);if(mesh===c.lod1){const items=ordered.get(c.i).slice(s.off,s.off+s.count),fade=mesh.geometry.attributes.iFade.array;const species={},activeSpecies={};let active=0;for(let j=0;j<items.length;j++){const sp=items[j].species;species[sp]=(species[sp]||0)+1;if(fade[n+j]>=0){active++;activeSpecies[sp]=(activeSpecies[sp]||0)+1;}}calls.push({chunk:c.i,chunkCenter:[c.cx,c.cy,c.cz],chunkDistance:Math.hypot(c.cx-f._camPos.x,c.cz-f._camPos.z,c.cy-f._camPos.y),source:[s.x,c.cy,s.z],sourceDistance:Math.hypot(s.x-f._camPos.x,s.z-f._camPos.z,c.cy-f._camPos.y),off:s.off,count:s.count,active,blend,inverted,species,activeSpecies});}return after;};
   try{f.update(cam,sim.camera.pitch,true);}finally{f._copy=raw;}
   const chunks=[];for(const c of f.chunks.values())if(c.lod1?.visible&&c.lod1.count>0){const fade=c.lod1.geometry.attributes.iFade.array;let active=0;for(let i=0;i<c.lod1.count;i++)if(fade[i]>=0)active++;chunks.push({chunk:c.i,center:[c.cx,c.cy,c.cz],distance:Math.hypot(c.cx-f._camPos.x,c.cz-f._camPos.z,c.cy-f._camPos.y),count:c.lod1.count,active,castShadow:c.lod1.castShadow});}
   const sumMap=(rows,key)=>{const o={};for(const r of rows)for(const[k,v]of Object.entries(r[key]))o[k]=(o[k]||0)+v;return o;};
   const gl=sim.engine.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
   return{camera,pitch:sim.camera.pitch,distance:sim.camera.distance,position:cam.position.toArray(),target:sim.camera.target.toArray(),fieldCamera:f._camPos.toArray(),topDown:!!f.topDown,histogram:{...sim.registry.apis.props.debug.lodHistogram()},renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),framebuffer:[gl.drawingBufferWidth,gl.drawingBufferHeight],calls,chunks,summary:{calls:calls.length,submitted:calls.reduce((n,r)=>n+r.count,0),active:calls.reduce((n,r)=>n+r.active,0),species:sumMap(calls,'species'),activeSpecies:sumMap(calls,'activeSpecies'),castingChunks:chunks.filter(r=>r.castShadow).length,castingSubmitted:chunks.filter(r=>r.castShadow).reduce((n,r)=>n+r.count,0)},stats:sim.stats(),simErrors:[...sim.errors]};
  },camera);
  result.cameras.push({...row,errors:[...new Set([...errors,...row.simErrors])]});await page.close();
 }
 result.pass=result.cameras.length===cameras.length&&result.cameras.every(r=>r.errors.length===0&&r.renderer.includes('Metal')&&r.framebuffer[0]===1920&&r.framebuffer[1]===1080&&r.summary.submitted===r.histogram.lod1);
 fs.mkdirSync(out.split('/').slice(0,-1).join('/')||'.',{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify({pass:result.pass,sourceSha256:result.sourceSha256,cameras:result.cameras.map(r=>({camera:r.camera,pitch:r.pitch,topDown:r.topDown,histogram:r.histogram,summary:r.summary,errors:r.errors}))},null,2));if(!result.pass)process.exitCode=1;
}finally{await browser.close();}
