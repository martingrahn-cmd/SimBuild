#!/usr/bin/env node
// Read-only decomposition of painted but unclaimed zoning cells on the accepted Democity source.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base=process.env.SIM_URL||'http://127.0.0.1:5173';
const out=process.env.OUT_FILE||'shots/democity/r8t-parcel-capacity/profile.json';
const seeds=(process.env.SEEDS||'1337,7').split(',').map(Number);
const executablePath=process.env.SIM_CHROME||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',chromium.executablePath()].find(p=>fs.existsSync(p));
const browser=await chromium.launch({executablePath,headless:true,args:['--use-angle=metal','--use-gl=angle','--enable-webgl','--enable-gpu','--ignore-gpu-blocklist','--no-sandbox']});
const result={method:'read-only accepted-source painted-cell decomposition; component upper bounds are diagnostic, not buildable-lot claims',seeds:[]};
try{
 for(const seed of seeds){
  const page=await browser.newPage({viewport:{width:1280,height:720}}),browserErrors=[];
  page.on('pageerror',e=>browserErrors.push(String(e))); page.on('console',m=>{if(m.type()==='error')browserErrors.push(m.text());});
  await page.route('**/@vite/client',r=>r.fulfill({status:200,contentType:'application/javascript',body:''}));
  await page.goto(`${base}/?showcase=democity&time=12&camera=aerial&seed=${seed}&quality=high&speed=0&headless=1`,{waitUntil:'domcontentloaded',timeout:240000});
  await page.waitForFunction(()=>window.__sim?.ready===true,null,{timeout:240000});
  const row=await page.evaluate(seed=>{
   const sim=window.__sim,w=sim.world,Z=w.zones;
   const slots={residential:{low:2,high:3},commercial:{low:2,high:3},industrial:{low:3,high:4},office:{low:3,high:4}};
   const depths={residential:{low:3,high:3},commercial:{low:3,high:3},industrial:{low:4,high:4},office:{low:3,high:4}};
   const claimed=new Set(); for(const lot of Z.lots.values())for(const k of lot.cells||[])claimed.add(k);
   const unc=new Map([...Z.cells].filter(([k])=>!claimed.has(k)));
   const byClass={},byDepth={},byEdgeType={}; let backland=0,preferredBand=0;
   for(const [k,c] of unc){const cls=`${c.type}/${c.density}`,edgeType=w.roads.edges.get(c.edgeId)?.type||'missing';byClass[cls]=(byClass[cls]||0)+1;byDepth[c.depth]=(byDepth[c.depth]||0)+1;byEdgeType[edgeType]=(byEdgeType[edgeType]||0)+1;if(c.depth>depths[c.type][c.density])backland++;else preferredBand++;}
   const parse=k=>k.split(',').map(Number),key=(x,z)=>`${x},${z}`;
   const componentRows=(source,diagonal=false)=>{const neighbours=diagonal?[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]:[[1,0],[-1,0],[0,1],[0,-1]],seen=new Set(),rows=[];for(const[start,c0]of source){if(seen.has(start)||c0.depth>depths[c0.type][c0.density])continue;const stack=[start],cells=[];seen.add(start);while(stack.length){const k=stack.pop(),c=source.get(k);cells.push(k);const[x,z]=parse(k);for(const[dx,dz]of neighbours){const nk=key(x+dx,z+dz),n=source.get(nk);if(!n||seen.has(nk)||n.depth>depths[n.type][n.density]||n.edgeId!==c0.edgeId||n.side!==c0.side||n.type!==c0.type||n.density!==c0.density)continue;seen.add(nk);stack.push(nk);}}const area=slots[c0.type][c0.density]*depths[c0.type][c0.density];rows.push({edgeId:c0.edgeId,side:c0.side,type:c0.type,density:c0.density,cells:cells.length,minLotCells:area,perfectPackingUpperBound:Math.floor(cells.length/area)});}rows.sort((a,b)=>b.cells-a.cells);return rows;};
   const components=componentRows(unc);
   const upperByClass={};for(const c of components){const cls=`${c.type}/${c.density}`;upperByClass[cls]=(upperByClass[cls]||0)+c.perfectPackingUpperBound;}
   const perfectPackingUpperBound=components.reduce((n,c)=>n+c.perfectPackingUpperBound,0);
   const preferred=new Map([...Z.cells].filter(([,c])=>c.depth<=depths[c.type][c.density])),allComponents=componentRows(preferred),components8=componentRows(unc,true),allComponents8=componentRows(preferred,true),fullPreferredByClass={};
   for(const c of preferred.values()){const cls=`${c.type}/${c.density}`;fullPreferredByClass[cls]=(fullPreferredByClass[cls]||0)+1;}
   const classOnlyRepackBound=Object.entries(fullPreferredByClass).reduce((n,[cls,count])=>{const[type,density]=cls.split('/');return n+Math.floor(count/(slots[type][density]*depths[type][density]));},0);
   const fullRepackUpperBound=allComponents.reduce((n,c)=>n+c.perfectPackingUpperBound,0),fullUpperByClass={};for(const c of allComponents){const cls=`${c.type}/${c.density}`;fullUpperByClass[cls]=(fullUpperByClass[cls]||0)+c.perfectPackingUpperBound;}
   const lotDisconnected8=[...Z.lots.values()].filter(l=>{const cells=new Set((l.cells||[]).filter(k=>preferred.has(k)));if(!cells.size)return true;const seen=new Set(),stack=[cells.values().next().value];seen.add(stack[0]);while(stack.length){const[x,z]=parse(stack.pop());for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const nk=key(x+dx,z+dz);if(cells.has(nk)&&!seen.has(nk)){seen.add(nk);stack.push(nk);}}}return seen.size!==cells.size;}).length;
   return{seed,worldSeed:w.seed,cells:Z.cells.size,lots:Z.lots.size,buildings:w.buildings.items.size,claimed:claimed.size,unclaimed:unc.size,backlandBeyondPreferredDepth:backland,withinPreferredDepth:preferredBand,byClass,byDepth,byEdgeType,components:components.length,componentsWithOneLotCapacity:components.filter(c=>c.perfectPackingUpperBound>0).length,additionalLotPerfectPackingUpperBound:perfectPackingUpperBound,totalLotPerfectPackingUpperBound:Z.lots.size+perfectPackingUpperBound,upperByClass,largestComponents:components.slice(0,30),diagonalAdditionalPackingBound:components8.reduce((n,c)=>n+c.perfectPackingUpperBound,0),fullPreferredCells:preferred.size,fullPreferredByClass,classOnlyRepackBound,fullComponents:allComponents.length,fullComponentsWithOneLotCapacity:allComponents.filter(c=>c.perfectPackingUpperBound>0).length,fullRepackPerfectPackingUpperBound:fullRepackUpperBound,fullUpperByClass,largestFullComponents:allComponents.slice(0,30),fullDiagonalComponents:allComponents8.length,fullDiagonalRepackPackingBound:allComponents8.reduce((n,c)=>n+c.perfectPackingUpperBound,0),existingLotsDisconnectedUnderDiagonalModel:lotDisconnected8,errors:sim.errors.slice()};
  },seed);
  row.browserErrors=browserErrors;row.pass=!row.errors.length&&!browserErrors.length&&row.claimed+row.unclaimed===row.cells;result.seeds.push(row);await page.close();
 }
 result.pass=result.seeds.every(s=>s.pass);fs.mkdirSync(out.split('/').slice(0,-1).join('/')||'.',{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify({pass:result.pass,seeds:result.seeds.map(({seed,cells,lots,claimed,unclaimed,backlandBeyondPreferredDepth,withinPreferredDepth,components,componentsWithOneLotCapacity,additionalLotPerfectPackingUpperBound,totalLotPerfectPackingUpperBound,diagonalAdditionalPackingBound,fullPreferredCells,classOnlyRepackBound,fullComponents,fullComponentsWithOneLotCapacity,fullRepackPerfectPackingUpperBound,fullDiagonalComponents,fullDiagonalRepackPackingBound,existingLotsDisconnectedUnderDiagonalModel,errors,browserErrors})=>({seed,cells,lots,claimed,unclaimed,backlandBeyondPreferredDepth,withinPreferredDepth,components,componentsWithOneLotCapacity,additionalLotPerfectPackingUpperBound,totalLotPerfectPackingUpperBound,diagonalAdditionalPackingBound,fullPreferredCells,classOnlyRepackBound,fullComponents,fullComponentsWithOneLotCapacity,fullRepackPerfectPackingUpperBound,fullDiagonalComponents,fullDiagonalRepackPackingBound,existingLotsDisconnectedUnderDiagonalModel,errors,browserErrors}))},null,2));
}finally{await browser.close();}
