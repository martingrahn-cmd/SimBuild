// Headless probe against ?showcase=tools. node shots/tools/r2/probe.mjs [--time 12] [--fn <name>]
import { chromium } from 'playwright';
import fs from 'node:fs';
const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').slice(1).map(s=>{const i=s.indexOf(' ');return i<0?[s.trim(),true]:[s.slice(0,i).trim(),s.slice(i+1).trim()];}));
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome','/opt/pw-browsers/chromium/chrome-linux/chrome'].find(p=>fs.existsSync(p));
const browser = await chromium.launch({ executablePath: exe, headless: true, args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--disable-dev-shm-usage','--window-size=1920,1080'] });
const page = await (await browser.newContext({viewport:{width:+(args.w||1920),height:+(args.h||1080)},deviceScaleFactor:1})).newPage();
const errs=[], warns=[], logs=[];
page.on('console', m=>{ const t=m.type(); if(t==='error') errs.push(m.text().slice(0,900)); else if(t==='warning') warns.push(m.text().slice(0,300)); else logs.push(m.text().slice(0,300)); });
page.on('pageerror', e=>errs.push(String(e?.stack||e).slice(0,900)));
const url = `http://127.0.0.1:5173/?showcase=tools&time=${args.time||12}&camera=${args.camera||'aerial'}&seed=${args.seed||1337}&quality=high&headless=1&speed=0`;
await page.goto(url, { waitUntil:'domcontentloaded', timeout: 240000 });
page.setDefaultTimeout(300000);
try { await page.waitForFunction(()=>window.__sim && window.__sim.ready, null, { timeout: 300000 }); } catch(e){ console.log('WAIT FAILED', String(e).slice(0,200)); }
await page.waitForTimeout(2500);
const script = fs.readFileSync(args.fn || 'shots/tools/r2/body.js','utf8');
let out;
try { out = await page.evaluate(script); } catch(e){ out = {PROBE_ERROR: String(e).slice(0,2000)}; }
console.log(JSON.stringify({ out, errors: errs, warnings: warns.slice(0,10), logs: logs.filter(l=>/tools|showcase/.test(l)).slice(-14) }, null, 1));
await browser.close();
