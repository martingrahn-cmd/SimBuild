import { chromium } from 'playwright';
import fs from 'node:fs';

const oldUrl=process.env.OLD_SIM_URL;
if(!oldUrl)throw Error('OLD_SIM_URL is required');
const currentUrl=process.env.SIM_URL||'http://127.0.0.1:5180';
const executablePath=process.env.SIM_CHROME||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',chromium.executablePath()].find(path=>fs.existsSync(path));
const browser=await chromium.launch({executablePath,headless:true});
const errors=[];
const open=async url=>{const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',error=>errors.push(`${url}: ${error}`));await page.route('**/@vite/client',route=>route.fulfill({status:200,contentType:'application/javascript',body:''}));await page.goto(`${url}/?showcase=democity&headless=1&time=12&speed=0`,{waitUntil:'domcontentloaded',timeout:240000});await page.waitForFunction(()=>window.__sim?.ready,null,{timeout:240000});await page.evaluate(()=>window.__sim.freeze());return page;};
try{
  const oldPage=await open(oldUrl),oldSave=await oldPage.evaluate(()=>structuredClone(window.__sim.saves.serialize()));
  const currentPage=await open(currentUrl);
  const result=await currentPage.evaluate(async save=>{const s=window.__sim,events={loaded:0,failed:[]};s.events.on('save:loaded',()=>events.loaded++,'version-compat');s.events.on('save:failed',event=>events.failed.push(event),'version-compat');let restored=true,error=null;try{await s.saves.restore(save);}catch(e){restored=false;error=String(e?.message||e);}const current=s.saves.serialize();s.events.offOwner('version-compat');return{restored,error,events,moduleNames:Object.keys(save.modules),moduleExact:Object.fromEntries(Object.keys(save.modules).map(name=>[name,JSON.stringify(save.modules[name])===JSON.stringify(current.modules[name])])),world:{roads:s.world.roads.edges.size,zones:s.world.zones.cells.size,buildings:s.world.buildings.items.size,services:s.world.services.items.size,population:s.world.economy.population,money:s.world.economy.money}};},oldSave);
  result.differentModules=Object.entries(result.moduleExact).filter(([,exact])=>!exact).map(([name])=>name);
  if(result.differentModules.length){
    const currentSave=await currentPage.evaluate(()=>structuredClone(window.__sim.saves.serialize()));
    const firstDiff=(a,b,path='')=>{if(Object.is(a,b))return null;if(!a||!b||typeof a!=='object'||typeof b!=='object')return{path,before:a,after:b};for(const key of new Set([...Object.keys(a),...Object.keys(b)])){const diff=firstDiff(a[key],b[key],path?`${path}.${key}`:key);if(diff)return diff;}return null;};
    result.firstDifference=firstDiff(oldSave.modules,currentSave.modules);
  }
  result.pass=result.restored&&result.events.loaded===1&&!result.events.failed.length&&!result.differentModules.length&&result.world.buildings>0&&errors.length===0;
  const report={oldCommit:'08b1a2d',currentCommit:'working tree after d05eb3c',...result,errors};
  fs.mkdirSync('shots/playtest-fixes-r15',{recursive:true});fs.writeFileSync('shots/playtest-fixes-r15/save-r13-to-r15.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(!report.pass)process.exitCode=1;
  await oldPage.close();await currentPage.close();
}finally{await browser.close();}
