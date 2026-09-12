#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'node:fs';
const base=process.env.SIM_URL||'http://127.0.0.1:5180';
const dir='shots/playtest-fixes-r11';fs.mkdirSync(dir,{recursive:true});
const play=process.env.PLAY==='1';
const hour=Number(process.env.HOUR||12);
const out={url:play?`${base}/?mode=play&time=${hour}&seed=217623`:`${base}/?showcase=terrain&time=${hour}&camera=valley&seed=1337&quality=high&headless=1&speed=0`,errors:[],pass:false};
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=metal','--use-gl=angle','--enable-webgl','--enable-gpu','--ignore-gpu-blocklist','--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080}});page.on('pageerror',e=>out.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')out.errors.push(m.text())});
 await page.goto(out.url,{waitUntil:'domcontentloaded',timeout:240000});await page.waitForFunction(()=>window.__sim?.ready===true,null,{timeout:240000});
 if(play){const b=page.getByText('Continue',{exact:true});if(await b.count())await b.click();await page.waitForTimeout(250);}
 out.contract=await page.evaluate(async()=>{const s=window.__sim,T=s.world.terrain,z=T.features.river.zAt(0),y=T.getHeight(0,z);s.setCamera({target:[0,y,z],yaw:.58,pitch:1.02,distance:950});const start=s.engine.stats.frames;while(s.engine.stats.frames<start+36)await new Promise(requestAnimationFrame);s.freeze();const water=s.registry.get('terrain')?.group?.getObjectByName('water');const shader=water?.material?.fragmentShader||'';return{river:{x:0,z,y,halfWidth:T.features.river.halfWidthAt(0)},waterVisible:!!water?.visible,shader:{inlandMask:shader.includes('float inland = 1.0 - sea'),inlandReflection:shader.includes('mix(0.48, 1.0, sea)'),inlandFresnel:shader.includes('mix(0.10, 0.24, sea)'),flowCue:shader.includes('float flowCue = inland')},render:s.stats(),errors:s.errors.slice()};});
 await page.screenshot({path:`${dir}/river-candidate-${play?'player':'aerial'}-${String(hour).replace('.','p')}.png`,type:'png',timeout:180000});
 out.pass=out.errors.length===0&&out.contract.errors.length===0&&out.contract.waterVisible&&Object.values(out.contract.shader).every(Boolean);
}finally{await browser.close();fs.writeFileSync(`${dir}/river-contract-${play?'player':'showcase'}-${String(hour).replace('.','p')}.json`,JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));}
