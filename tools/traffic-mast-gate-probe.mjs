#!/usr/bin/env node
// Verify that R8q skips only hidden fallback-mast buffer writes and preserves the visible fallback output.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base=process.env.SIM_URL||'http://127.0.0.1:5173';
const out=process.env.OUT_FILE||'shots/democity/traffic-mast-gate-contract.json';
const source=fs.readFileSync(new URL('../src/modules/traffic/masts.js',import.meta.url),'utf8');
const marker=' if(!m.g.visible)return;\n';
if(!source.includes(marker))throw new Error('Current Traffic mast source lacks the R8q marker');
const executablePath=process.env.SIM_CHROME||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',chromium.executablePath()].find(p=>fs.existsSync(p));
const browser=await chromium.launch({executablePath,headless:true,args:['--use-angle=metal','--use-gl=angle','--enable-webgl','--enable-gpu','--ignore-gpu-blocklist','--no-sandbox']});
const records=[];

async function run({variant,showcase,camera}){
 const page=await browser.newPage({viewport:{width:1920,height:1080}}),browserErrors=[];
 page.on('pageerror',e=>browserErrors.push(String(e)));
 page.on('console',m=>{if(m.type()==='error')browserErrors.push(m.text());});
 await page.route('**/@vite/client',r=>r.fulfill({status:200,contentType:'application/javascript',body:''}));
 if(variant==='legacy')await page.route('**/src/modules/traffic/masts.js*',async r=>{const response=await r.fetch(),body=await response.text();if(!body.includes(marker))throw new Error('Served mast source lacks marker');await r.fulfill({response,body:body.replace(marker,'')});});
 await page.goto(`${base}/?showcase=${showcase}&time=22&camera=${camera}&seed=1337&quality=high&headless=1&speed=0`,{waitUntil:'domcontentloaded',timeout:240000});
 await page.waitForFunction(()=>window.__sim?.ready===true,null,{timeout:240000});
 const value=await page.evaluate(async()=>{
  const sim=window.__sim,api=sim.registry.apis.traffic,rec=sim.registry.get('traffic'),g=rec.group.getObjectByName('traffic:masts'),lens=g?.children.find(o=>o.isInstancedMesh);
  api.freeze(true);
  const hash=attribute=>{const a=attribute.array,d=new DataView(a.buffer,a.byteOffset,a.byteLength);let h=2166136261>>>0;for(let i=0;i<d.byteLength;i++){h^=d.getUint8(i);h=Math.imul(h,16777619)>>>0;}return h>>>0;};
  const before={matrixVersion:lens.instanceMatrix.version,colorVersion:lens.instanceColor.version,matrixHash:hash(lens.instanceMatrix),colorHash:hash(lens.instanceColor)};
  const start=sim.engine.stats.frames;while(sim.engine.stats.frames<start+120)await new Promise(requestAnimationFrame);
  const after={matrixVersion:lens.instanceMatrix.version,colorVersion:lens.instanceColor.version,matrixHash:hash(lens.instanceMatrix),colorHash:hash(lens.instanceColor)};
  return {groupVisible:g.visible,lensCount:lens.count,before,after,signals:api.stats().signals,draws:sim.engine.stats.drawCalls,triangles:sim.engine.stats.triangles,errors:sim.errors.slice()};
 });
 await page.close();records.push({variant,showcase,camera,...value,browserErrors});return records.at(-1);
}

try{
 const hidden=await run({variant:'candidate',showcase:'democity',camera:'interchange'});
 const visibleLegacy=await run({variant:'legacy',showcase:'traffic',camera:'junction'});
 const visibleCandidate=await run({variant:'candidate',showcase:'traffic',camera:'junction'});
 const visibleExact=visibleLegacy.lensCount===visibleCandidate.lensCount&&visibleLegacy.signals===visibleCandidate.signals&&visibleLegacy.after.matrixHash===visibleCandidate.after.matrixHash&&visibleLegacy.after.colorHash===visibleCandidate.after.colorHash;
 const hiddenSkipped=!hidden.groupVisible&&hidden.lensCount>0&&hidden.after.matrixVersion===hidden.before.matrixVersion&&hidden.after.colorVersion===hidden.before.colorVersion;
 const visibleUpdated=[visibleLegacy,visibleCandidate].every(r=>r.groupVisible&&r.lensCount>0&&r.after.matrixVersion>r.before.matrixVersion&&r.after.colorVersion>r.before.colorVersion);
 const result={method:'candidate Democity hidden path plus exact legacy/candidate visible Traffic fallback buffers after120 frozen frames',records,hiddenSkipped,visibleUpdated,visibleExact,pass:hiddenSkipped&&visibleUpdated&&visibleExact&&records.every(r=>!r.errors.length&&!r.browserErrors.length)};
 fs.mkdirSync(out.split('/').slice(0,-1).join('/')||'.',{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
