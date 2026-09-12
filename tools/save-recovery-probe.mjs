import { chromium } from 'playwright';
import fs from 'node:fs';

const url=process.env.SIM_URL||'http://127.0.0.1:5180';
const executablePath=process.env.SIM_CHROME||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',chromium.executablePath()].find(path=>fs.existsSync(path));
const browser=await chromium.launch({executablePath,headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',error=>errors.push(String(error)));
try{
  await page.goto(`${url}/?mode=play&headless=1&time=12&speed=0`,{waitUntil:'domcontentloaded',timeout:240000});
  await page.waitForFunction(()=>window.__sim?.ready,null,{timeout:240000});
  const result=await page.evaluate(async()=>{
    const s=window.__sim,slot='save-recovery-probe',events=[];
    s.events.on('save:recovered',event=>events.push({type:'recovered',...event}),'save-recovery-probe');
    s.events.on('save:failed',event=>events.push({type:'failed',...event}),'save-recovery-probe');
    const base=s.world.economy.money;
    const first=!!(await s.save(slot));
    s.registry.apis.simulation.earn(1111);
    const newest=s.world.economy.money,second=!!(await s.save(slot));
    const cloudRecords=await s.saves.cloudRecords(),cloudReplace=await s.saves.replaceCloudRecords(cloudRecords);
    const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('simbuild-saves',1);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
    const beforeCorrupt=await new Promise((resolve,reject)=>{const tx=db.transaction('slots','readwrite'),store=tx.objectStore('slots'),get=store.get(slot);get.onsuccess=()=>{const row=get.result;resolve({hasBackup:!!row.backupRaw,savedAt:row.savedAt,backupSavedAt:row.backupSavedAt});store.put({...row,raw:'{"version":1,"broken":'});};tx.onerror=()=>reject(tx.error);});
    await new Promise((resolve,reject)=>{const tx=db.transaction('slots','readonly');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.objectStore('slots').get(slot);});
    s.registry.apis.simulation.earn(999);
    const loaded=await s.load(slot),recoveredMoney=s.world.economy.money;
    const recoveryNotice=document.body.innerText.includes('Previous save recovered');
    const savedAfterRecovery=!!(await s.save(slot));
    const afterSave=await new Promise((resolve,reject)=>{const tx=db.transaction('slots','readonly'),get=tx.objectStore('slots').get(slot);get.onsuccess=()=>{const row=get.result;let primary=false,backup=false;try{primary=JSON.parse(row.raw)?.version===1;}catch{}try{backup=JSON.parse(row.backupRaw)?.version===1;}catch{}resolve({primary,backup});};get.onerror=()=>reject(get.error);});
    db.close();await s.saves.remove(slot);
    return{base,newest,first,second,cloudReplace,beforeCorrupt,loaded,recoveredMoney,recoveryNotice,savedAfterRecovery,afterSave,events};
  });
  await page.screenshot({path:'shots/playtest-fixes-r15/save-recovered.png',fullPage:true});
  const pass=result.first&&result.second&&result.cloudReplace&&result.beforeCorrupt.hasBackup&&result.loaded&&result.recoveredMoney===result.base
    &&result.recoveryNotice&&result.events.some(event=>event.type==='recovered')&&!result.events.some(event=>event.type==='failed')
    &&result.savedAfterRecovery&&result.afterSave.primary&&result.afterSave.backup&&errors.length===0;
  const report={pass,...result,errors};
  fs.mkdirSync('shots/playtest-fixes-r15',{recursive:true});
  fs.writeFileSync('shots/playtest-fixes-r15/save-recovery.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));if(!pass)process.exitCode=1;
}finally{await browser.close();}
