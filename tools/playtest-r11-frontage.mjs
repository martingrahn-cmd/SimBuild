#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'node:fs';
const base=process.env.SIM_URL||'http://127.0.0.1:5180';
const dir='shots/playtest-fixes-r11';fs.mkdirSync(dir,{recursive:true});
const out={url:`${base}/?mode=play&time=12&seed=217623`,errors:[],attempts:[],pass:false};
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=metal','--use-gl=angle','--enable-webgl','--enable-gpu','--ignore-gpu-blocklist','--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}});page.on('pageerror',e=>out.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')out.errors.push(m.text())});
 await page.goto(out.url,{waitUntil:'domcontentloaded',timeout:240000});await page.waitForFunction(()=>window.__sim?.ready===true,null,{timeout:240000});
 await page.getByText('Continue',{exact:true}).click();await page.waitForTimeout(250);
 out.attempts=await page.evaluate(()=>{const s=window.__sim,t=s.registry.apis.tools,T=s.world.terrain,res=[];const candidates=[];for(let z=-320;z<=320;z+=80)for(let x=-320;x<=240;x+=80){if(T.isWater(x,z)||T.isWater(x+64,z))continue;candidates.push([x,z,x+64,z]);}for(const [x,z,x1,z1] of candidates){t.select('road',{type:'street',mode:'straight',elevation:0,snap:[]});t.pointer(x,z);t.click();t.pointer(x1,z1);t.click();const state=t.state();const r=t.commit();res.push({x,z,x1,z1,state:{valid:state.valid,reason:state.reason,grade:state.metrics.grade},result:r});if(r?.ok)break;t.cancel();}return res;});
 await page.waitForTimeout(500);
 await page.evaluate(()=>{const s=window.__sim,e=[...s.world.roads.edges.values()][0],p=e&&s.world.roads.sample(e.id,.5);if(p)s.camera.apply({target:[p.x,s.world.terrain.getHeight(p.x,p.z),p.z],yaw:.62,pitch:.72,distance:190});});
 await page.waitForTimeout(350);
 out.contract=await page.evaluate(()=>{const s=window.__sim,Z=s.registry.apis.zoning;return{roadEdges:s.world.roads.edges.size,tool:s.registry.apis.tools.current(),zonable:Z.stats().zonable,overlayVisible:Z.overlayVisible(),errors:s.errors.slice(),render:s.stats()}});
 await page.screenshot({path:`${dir}/frontage-road-tool.png`});
 out.pass=out.errors.length===0&&out.contract.errors.length===0&&out.contract.roadEdges>0&&out.contract.zonable>0&&out.contract.overlayVisible;
}finally{await browser.close();fs.writeFileSync(`${dir}/frontage-road-tool.json`,JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));}
