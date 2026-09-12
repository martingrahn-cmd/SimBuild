#!/usr/bin/env node
// Disposable-page replay of the zoning owner's actual ordered slot/claim pass.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base=process.env.SIM_URL||'http://127.0.0.1:5173',out=process.env.OUT_FILE||'shots/democity/r8u-slot-order/profile.json';
const seeds=(process.env.SEEDS||'1337,7').split(',').map(Number);
const gridSource=process.env.GRID_SOURCE?fs.readFileSync(process.env.GRID_SOURCE,'utf8'):null;
const executablePath=process.env.SIM_CHROME||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',chromium.executablePath()].find(p=>fs.existsSync(p));
const browser=await chromium.launch({executablePath,headless:true,args:['--use-angle=metal','--use-gl=angle','--enable-webgl','--enable-gpu','--ignore-gpu-blocklist','--no-sandbox']});
const result={method:'disposable-page public zoning.diagnose() ordered replay plus complete post-replay lot-cell membership',seeds:[]};
try{
 for(const seed of seeds){
  const page=await browser.newPage({viewport:{width:1280,height:720}}),browserErrors=[];page.on('pageerror',e=>browserErrors.push(String(e)));page.on('console',m=>{if(m.type()==='error')browserErrors.push(m.text());});
  await page.route('**/@vite/client',r=>r.fulfill({status:200,contentType:'application/javascript',body:''}));
  if(gridSource)await page.route('**/src/modules/zoning/grid.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:gridSource}));
  await page.goto(`${base}/?showcase=democity&time=12&camera=aerial&seed=${seed}&quality=high&speed=0&headless=1`,{waitUntil:'domcontentloaded',timeout:240000});await page.waitForFunction(()=>window.__sim?.ready===true,null,{timeout:240000});
  const row=await page.evaluate(seed=>{
   const sim=window.__sim,w=sim.world,Z=w.zones,a=sim.registry.apis.zoning;
   const widths={rl:2,rh:3,cl:2,ch:3,il:3,ih:4,ol:3,oh:4},depths={rl:3,rh:3,cl:3,ch:3,il:4,ih:4,ol:3,oh:4};
   const lotDigest=()=>JSON.stringify([...Z.lots.values()].map(l=>({id:l.id,buildingId:l.buildingId,edgeId:l.edgeId,side:l.side,cells:l.cells})).sort((x,y)=>x.id-y.id));
   const before={lots:Z.lots.size,buildings:w.buildings.items.size,digest:lotDigest()};const ordered=a.diagnose();const after={lots:Z.lots.size,buildings:w.buildings.items.size,digest:lotDigest()};
   const code=c=>c?c.type[0]+(c.density==='high'?'h':'l'):null,membership=[];const global=new Map();let duplicateCellsWithinLots=0,mixedOwnerCells=0,mixedSideCells=0,classMismatchCells=0,beyondPreferredCells=0,lotsBelowMinUniqueArea=0;
   for(const l of [...Z.lots.values()].sort((x,y)=>x.id-y.id)){const raw=l.cells||[],unique=[...new Set(raw)],want=widths[l.type[0]+(l.density==='high'?'h':'l')],depth=depths[l.type[0]+(l.density==='high'?'h':'l')],cells=raw.map(k=>{const c=Z.cells.get(k);return{key:k,edgeId:c?.edgeId??null,side:c?.side??null,depth:c?.depth??null,type:c?.type??null,density:c?.density??null};});const dup=raw.length-unique.length,mixedOwner=cells.filter(c=>c.edgeId!==l.edgeId).length,mixedSide=cells.filter(c=>c.side!==l.side).length,classMismatch=cells.filter(c=>c.type!==l.type||c.density!==l.density).length,beyond=cells.filter(c=>c.depth>depth).length;duplicateCellsWithinLots+=dup;mixedOwnerCells+=mixedOwner;mixedSideCells+=mixedSide;classMismatchCells+=classMismatch;beyondPreferredCells+=beyond;if(unique.length<want*depth)lotsBelowMinUniqueArea++;for(const k of unique){const ids=global.get(k)||[];ids.push(l.id);global.set(k,ids);}membership.push({id:l.id,buildingId:l.buildingId,edgeId:l.edgeId,side:l.side,type:l.type,density:l.density,minimumCells:want*depth,rawCells:raw.length,uniqueCells:unique.length,duplicateCells:dup,mixedOwnerCells:mixedOwner,mixedSideCells:mixedSide,classMismatchCells:classMismatch,beyondPreferredCells:beyond,cells});}
   const overlaps=[...global].filter(([,ids])=>ids.length>1).map(([key,ids])=>({key,ids}));
   let replayLots=0,eligibleSlots=0,shortRunSlots=0,remainderSlots=0,nullSlots=0,shallowSlots=0;const runRows=[];
   for(const edge of ordered){for(const side of ['right','left']){const str=edge.sides?.[side];if(!str||str==='none')continue;const toks=str.split(' ');nullSlots+=toks.filter(t=>t==='x'||t.startsWith('--')).length;let i=0;while(i<toks.length){const t=toks[i],c=t.slice(0,2),avail=Number(t.slice(2));if(!(c in widths)||!Number.isFinite(avail)||avail<depths[c]){if(c in widths&&Number.isFinite(avail))shallowSlots++;i++;continue;}let j=i+1;while(j<toks.length&&toks[j].slice(0,2)===c&&Number(toks[j].slice(2))>=depths[c])j++;const len=j-i,k=Math.floor(len/widths[c]),rem=len-k*widths[c];eligibleSlots+=len;replayLots+=k;remainderSlots+=rem;if(k===0)shortRunSlots+=len;runRows.push({edgeId:edge.id,side,code:c,start:i,end:j,length:len,want:widths[c],lots:k,remainder:rem});i=j;}}}
   const realLots=ordered.reduce((n,e)=>n+e.lots,0);
   return{seed,counts:{cells:Z.cells.size,lots:Z.lots.size,buildings:w.buildings.items.size},diagnoseMutation:{before:{lots:before.lots,buildings:before.buildings},after:{lots:after.lots,buildings:after.buildings},publicLotDigestEqual:before.digest===after.digest},orderedEdges:ordered.length,realLotsFromReplay:realLots,calculatedLotsFromRuns:replayLots,runSummary:{runs:runRows.length,eligibleSlots,shortRunSlots,remainderSlots,nullSlots,shallowSlots},membershipSummary:{lots:membership.length,rawCellReferences:membership.reduce((n,l)=>n+l.rawCells,0),uniqueCellReferences:membership.reduce((n,l)=>n+l.uniqueCells,0),duplicateCellsWithinLots,mixedOwnerCells,mixedSideCells,classMismatchCells,beyondPreferredCells,lotsBelowMinUniqueArea,overlapCellsAcrossLots:overlaps.length},ordered,runRows,membership,overlaps,errors:sim.errors.slice()};
  },seed);row.browserErrors=browserErrors;row.pass=!row.errors.length&&!browserErrors.length&&row.counts.lots===row.realLotsFromReplay&&row.realLotsFromReplay===row.calculatedLotsFromRuns&&row.diagnoseMutation.publicLotDigestEqual;result.seeds.push(row);await page.close();
 }
 result.pass=result.seeds.every(s=>s.pass);fs.mkdirSync(out.split('/').slice(0,-1).join('/')||'.',{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify({pass:result.pass,seeds:result.seeds.map(s=>({seed:s.seed,counts:s.counts,diagnoseMutation:s.diagnoseMutation,orderedEdges:s.orderedEdges,realLotsFromReplay:s.realLotsFromReplay,calculatedLotsFromRuns:s.calculatedLotsFromRuns,runSummary:s.runSummary,membershipSummary:s.membershipSummary,errors:s.errors,browserErrors:s.browserErrors,pass:s.pass}))},null,2));
}finally{await browser.close();}
