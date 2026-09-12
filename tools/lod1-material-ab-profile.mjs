#!/usr/bin/env node
// Same-page interleaved legacy Standard vs candidate Lambert timing on identical LOD1 meshes.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base=process.env.SIM_URL||'http://127.0.0.1:5173';
const out=process.env.OUT_FILE||'shots/democity/r8s-lod1-material/performance.json';
const camera=process.env.CAMERA||'interchange',time=Number(process.env.TIME||22);
const frames=Number(process.env.SAMPLE_FRAMES||180),warmFrames=Number(process.env.WARM_FRAMES||180),cycles=Number(process.env.CYCLES||3);
const executablePath=process.env.SIM_CHROME||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',chromium.executablePath()].find(p=>fs.existsSync(p));
const browser=await chromium.launch({executablePath,headless:true,args:['--use-angle=metal','--use-gl=angle','--enable-webgl','--enable-gpu','--ignore-gpu-blocklist','--no-sandbox']});
const median=a=>a.slice().sort((x,y)=>x-y)[Math.floor(a.length/2)];
const result={method:'one warmed synchronized page; L0-C0-L1-C1-L2-C2-L3; each candidate block compared with adjacent legacy controls',url:base,camera,time,frames,warmFrames,cycles};
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080}}),browserErrors=[];
 page.on('pageerror',e=>browserErrors.push(String(e))); page.on('console',m=>{if(m.type()==='error')browserErrors.push(m.text());});
 await page.route('**/@vite/client',r=>r.fulfill({status:200,contentType:'application/javascript',body:''}));
 await page.goto(`${base}/?showcase=democity&time=${time}&camera=${camera}&seed=1337&quality=high&speed=0&headless=1`,{waitUntil:'domcontentloaded',timeout:240000});
 await page.waitForFunction(()=>window.__sim?.ready===true,null,{timeout:240000});
 Object.assign(result,await page.evaluate(async({frames,warmFrames,cycles})=>{
  const sim=window.__sim,group=sim.registry.get('props').group;
  const tri=o=>o.geometry?.index?o.geometry.index.count/3:(o.geometry?.attributes?.position?.count??0)/3;
  const lod1=[]; group.traverse(o=>{if(o.isInstancedMesh&&tri(o)===168&&o.material?.isMeshLambertMaterial)lod1.push(o);});
  const candidate=[...new Set(lod1.map(o=>o.material))];
  const legacy=[]; group.traverse(o=>{if(o.material?.isMeshStandardMaterial&&o.material.alphaTest===0.45&&candidate.some(m=>m.map===o.material.map))legacy.push(o.material);});
  const legacyMat=[...new Set(legacy)][0],candidateMat=candidate[0];
  if(!lod1.length||candidate.length!==1||!legacyMat||!candidateMat)throw new Error(`lod1 material inventory mismatch ${lod1.length}/${candidate.length}/${legacy.length}`);
  const original=lod1.map(o=>o.material);
  const setMaterial=m=>{for(const o of lod1)o.material=m;};
  const wait=async n=>{const start=sim.engine.stats.frames;while(sim.engine.stats.frames<start+n)await new Promise(requestAnimationFrame);};
  const sample=async(label,variant)=>{setMaterial(variant==='legacy'?legacyMat:candidateMat);await wait(2);const start=sim.engine.stats.frames,started=performance.now();let last=start,count=0,samples=0,draws=0,triangles=0;while(sim.engine.stats.frames<start+frames){await new Promise(requestAnimationFrame);const f=sim.engine.stats.frames;if(f===last)continue;count+=f-last;last=f;samples++;const s=sim.stats();draws+=s.drawCalls;triangles+=s.triangles;}return{label,variant,fps:count/((performance.now()-started)/1000),sampledFrames:count,samples,average:{drawCalls:draws/samples,triangles:triangles/samples},errors:sim.errors.slice(),visibleInstances:lod1.reduce((n,o)=>n+(o.visible?o.count:0),0)};};
  const blocks=[];
  try{await wait(warmFrames);blocks.push(await sample('L0','legacy'));for(let i=0;i<cycles;i++){blocks.push(await sample(`C${i}`,'candidate'));blocks.push(await sample(`L${i+1}`,'legacy'));}}
  finally{lod1.forEach((o,i)=>{o.material=original[i];});}
  return{inventory:{meshes:lod1.length,instances:lod1.reduce((n,o)=>n+o.count,0),sourceTriangles:lod1.reduce((n,o)=>n+tri(o)*o.count,0),sameGeometry:true,sameMap:legacyMat.map===candidateMat.map,legacyType:legacyMat.type,candidateType:candidateMat.type,legacyAlphaTest:legacyMat.alphaTest,candidateAlphaTest:candidateMat.alphaTest,legacySide:legacyMat.side,candidateSide:candidateMat.side},blocks};
 },{frames,warmFrames,cycles}));
 result.pairs=[]; for(let i=0;i<cycles;i++){const before=result.blocks[i*2],candidate=result.blocks[i*2+1],after=result.blocks[i*2+2],expected=(before.fps+after.fps)/2;result.pairs.push({cycle:i,expectedLegacyFps:expected,candidateFps:candidate.fps,fpsPct:(candidate.fps/expected-1)*100,controlDriftPct:Math.abs(after.fps-before.fps)/expected*100,drawCalls:candidate.average.drawCalls-(before.average.drawCalls+after.average.drawCalls)/2,triangles:candidate.average.triangles-(before.average.triangles+after.average.triangles)/2,visibleInstances:candidate.visibleInstances});}
 result.summary={medianFpsPct:median(result.pairs.map(p=>p.fpsPct)),maxControlDriftPct:Math.max(...result.pairs.map(p=>p.controlDriftPct)),stableCycles:result.pairs.filter(p=>p.controlDriftPct<=5).length,medianDrawCalls:median(result.pairs.map(p=>p.drawCalls)),medianTriangles:median(result.pairs.map(p=>p.triangles))};
 result.browserErrors=browserErrors; result.pass=result.inventory.sameMap&&result.inventory.legacyAlphaTest===result.inventory.candidateAlphaTest&&result.summary.stableCycles===cycles&&!browserErrors.length&&result.blocks.every(b=>!b.errors.length&&b.sampledFrames>=frames);
 await page.close(); fs.mkdirSync(out.split('/').slice(0,-1).join('/')||'.',{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
