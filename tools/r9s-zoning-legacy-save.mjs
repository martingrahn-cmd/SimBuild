#!/usr/bin/env node
// R9s2: prove pre-envelope Zoning saves containing only cells still restore atomically.
import { chromium } from 'playwright';
import fs from 'node:fs';
const base=process.env.SIM_URL||'http://127.0.0.1:5173';
const out=process.env.OUT_FILE||'shots/democity/r9s2-road-safe-restore/zoning-legacy-save.json';
const chrome=process.env.SIM_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser=await chromium.launch({executablePath:chrome,headless:true,args:['--use-angle=metal','--use-gl=angle','--enable-webgl','--enable-gpu','--ignore-gpu-blocklist','--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),browserErrors=[];
 page.on('pageerror',e=>browserErrors.push(String(e)));page.on('console',m=>{if(m.type()==='error')browserErrors.push(m.text());});
 await page.route('**/@vite/client',r=>r.fulfill({status:200,contentType:'application/javascript',body:''}));
 await page.goto(`${base}/?showcase=democity&time=12&camera=aerial&seed=7&quality=high&speed=0&headless=1`,{waitUntil:'domcontentloaded',timeout:240000});
 await page.waitForFunction(()=>window.__sim?.ready===true,null,{timeout:240000});
 const result=await page.evaluate(async()=>{
  const s=window.__sim,clone=v=>structuredClone(v),canonical=()=>clone(s.saves.serialize());
  const first=canonical();await s.saves.restore(first);const before=canonical();
  const legacy=clone(before);legacy.modules.zoning={cells:[...before.modules.zoning.cells]};
  const restored=[false,false];for(let i=0;i<2;i++){try{await s.saves.restore(legacy);restored[i]=true;}catch{restored[i]=false;}}
  const after=canonical(),z=s.registry.apis.zoning.serialize(),b=s.registry.apis.buildings.serialize(),lotIds=new Set(z.lots.map(x=>x.id)),buildingIds=new Set(b.items.map(x=>x.id));
  const orphanBuildings=b.items.filter(x=>!lotIds.has(x.lotId)).map(x=>x.id),brokenLots=z.lots.filter(x=>x.buildingId!=null&&!buildingIds.has(x.buildingId)).map(x=>x.id);
  const perModule=Object.fromEntries(Object.keys(before.modules).map(k=>[k,JSON.stringify(before.modules[k])===JSON.stringify(after.modules[k])]));
  const stripVersion=v=>{const x=clone(v);delete x.version;return x;};
  const zoningSemanticExact=JSON.stringify(before.modules.zoning.cells)===JSON.stringify(after.modules.zoning.cells)&&JSON.stringify(before.modules.zoning.lots)===JSON.stringify(after.modules.zoning.lots);
  const propsSemanticExact=JSON.stringify(stripVersion(before.modules.props))===JSON.stringify(stripVersion(after.modules.props));
  const exactRequired=['terrain','roads','buildings','traffic','simulation','tools','services','ui','audio','infoviews','transit','democity'].every(k=>perModule[k]);
  const nextLotSafe=Number.isInteger(z.nextLot)&&z.nextLot>Math.max(0,...z.lots.map(x=>x.id));
  const diffs=[];const walk=(a,b,p='')=>{if(diffs.length>=20||Object.is(a,b))return;if(!a||!b||typeof a!=='object'||typeof b!=='object'){diffs.push({path:p,before:a,after:b});return;}const keys=new Set([...Object.keys(a),...Object.keys(b)]);for(const k of keys)walk(a[k],b[k],p?`${p}.${k}`:k);};
  walk(before.modules.zoning,after.modules.zoning,'zoning');walk(before.modules.props,after.modules.props,'props');
  return{restored,legacyKeys:Object.keys(legacy.modules.zoning),canonicalEnvelope:{lots:z.lots.length,nextLot:z.nextLot,nextLotSafe},perModule,moduleExact:Object.values(perModule).every(Boolean),zoningSemanticExact,propsSemanticExact,exactRequired,diffs,timeExact:JSON.stringify(before.time)===JSON.stringify(after.time),cameraExact:JSON.stringify(before.camera)===JSON.stringify(after.camera),orphanBuildings,brokenLots,errors:[...s.errors]};
 });
 result.browserErrors=browserErrors;result.pass=result.restored.every(Boolean)&&result.legacyKeys.length===1&&result.legacyKeys[0]==='cells'&&result.zoningSemanticExact&&result.propsSemanticExact&&result.exactRequired&&result.canonicalEnvelope.nextLotSafe&&result.timeExact&&result.cameraExact&&!result.orphanBuildings.length&&!result.brokenLots.length&&!result.errors.length&&!browserErrors.length;
 fs.mkdirSync(out.slice(0,out.lastIndexOf('/')),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(!result.pass)process.exitCode=1;
 await page.close();
}finally{await browser.close();}
