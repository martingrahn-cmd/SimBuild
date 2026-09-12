#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'node:fs';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=metal','--use-gl=angle','--enable-webgl','--enable-gpu','--ignore-gpu-blocklist','--no-sandbox']});
const page=await browser.newPage({viewport:{width:1280,height:720}}),consoleErrors=[];
page.on('pageerror',e=>consoleErrors.push(String(e)));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
await page.route('**/@vite/client',r=>r.fulfill({status:200,contentType:'application/javascript',body:''}));
await page.goto('http://127.0.0.1:5173/?showcase=all&time=12&camera=aerial&seed=7&quality=high&speed=0&headless=1',{waitUntil:'domcontentloaded',timeout:240000});
const samples=[];for(let i=0;i<48;i++){await page.waitForTimeout(5000);const state=await page.evaluate(()=>{const s=window.__sim;return{exists:!!s,ready:s?.ready??false,frames:s?.engine?.stats?.frames??null,errors:s?.errors??[],modules:s?.stats?.().modules??null,apis:s?.registry?.apis?Object.fromEntries(Object.entries(s.registry.apis).map(([k,v])=>[k,typeof v?.serialize])):null};});samples.push({seconds:(i+1)*5,...state});if(state.ready)break;}
const result={samples,consoleErrors,pass:samples.at(-1)?.ready===true&&!consoleErrors.length};
fs.writeFileSync('shots/democity/r9p-zoning-building-lifecycle/all-seed7-readiness.json',JSON.stringify(result,null,2));
await page.screenshot({path:'shots/democity/r9p-zoning-building-lifecycle/all-seed7-readiness.png'});await browser.close();console.log(JSON.stringify({pass:result.pass,last:samples.at(-1),consoleErrors},null,2));if(!result.pass)process.exitCode=1;
