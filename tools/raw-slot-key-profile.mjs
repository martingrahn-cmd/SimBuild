#!/usr/bin/env node
// R8w: route a diagnostic-only ZoneGrid recorder that retains the actual key array of every slot.
import { chromium } from 'playwright';
import fs from 'node:fs';
import crypto from 'node:crypto';
const base=process.env.SIM_URL||'http://127.0.0.1:5173';
const out=process.env.OUT_FILE||'shots/democity/r8w-raw-slot-keys/profile.json';
const sourcePath='src/modules/zoning/grid.js',source=fs.readFileSync(sourcePath,'utf8');
const marker="if (this._rec) this._rec[this._rec.length - 1].sides[side] = S ? S.slots.map((s) => (s ? `${s.type ? s.type[0] + s.density[0] : '--'}${s.avail}` : 'x')).join(' ') : 'none';";
const replacement="if (this._rec) this._rec[this._rec.length - 1].sides[side] = S ? { n: S.n, d0: S.d0, pad: S.pad, front: S.front, sgn: S.sgn, slots: S.slots.map((s) => s ? { dc: s.dc, x: s.x, z: s.z, nx: s.nx, nz: s.nz, type: s.type, density: s.density, avail: s.avail, keys: s.keys.slice() } : null) } : null;";
if(!source.includes(marker))throw new Error('grid recorder marker not found');
const slotMarker=`      let type = null, density = null;
      const keys = [];
      for (let k = 1; k <= MAX_DEPTH; k++) {
        const lat = front + (k - 0.5) * this.cell;
        const key = this.keyAt(o.x + nx * lat, o.z + nz * lat);
        const c = this.cells.get(key);
        if (!c) break;
        if (k === 1) { type = c.type; density = c.density; }
        else if (c.type !== type || c.density !== density) break;
        if (this.claimed.has(key)) break;
        keys.push(key);
      }
      slots.push({ dc, x: o.x, z: o.z, nx, nz, type, density, avail: keys.length, keys });`;
const slotReplacement=`      let type = null, density = null, stopReason = 'max-depth', stopKey = null;
      const keys = [];
      for (let k = 1; k <= MAX_DEPTH; k++) {
        const lat = front + (k - 0.5) * this.cell;
        const key = this.keyAt(o.x + nx * lat, o.z + nz * lat);
        const c = this.cells.get(key);
        if (!c) { stopReason = 'unpainted'; stopKey = key; break; }
        if (k === 1) { type = c.type; density = c.density; }
        else if (c.type !== type || c.density !== density) { stopReason = 'class-change'; stopKey = key; break; }
        if (this.claimed.has(key)) { stopReason = 'prior-claimed'; stopKey = key; break; }
        keys.push(key);
      }
      slots.push({ dc, x: o.x, z: o.z, nx, nz, type, density, avail: keys.length, keys, stopReason, stopKey });`;
if(!source.includes(slotMarker))throw new Error('slot stop-reason marker not found');
const instrumented=source.replace(slotMarker,slotReplacement).replace(marker,replacement.replace('keys: s.keys.slice()','keys: s.keys.slice(), stopReason: s.stopReason, stopKey: s.stopKey'));
const executablePath=process.env.SIM_CHROME||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',chromium.executablePath()].find(p=>fs.existsSync(p));
const browser=await chromium.launch({executablePath,headless:true,args:['--use-angle=metal','--use-gl=angle','--enable-webgl','--enable-gpu','--ignore-gpu-blocklist','--no-sandbox']});
const result={method:'diagnostic source-route of accepted ZoneGrid recorder; public diagnose() on disposable pages',sourcePath,sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),instrumentedSha256:crypto.createHash('sha256').update(instrumented).digest('hex'),seeds:[]};
try{
 for(const seed of [1337,7]){
  const page=await browser.newPage({viewport:{width:1280,height:720}}),browserErrors=[];page.on('pageerror',e=>browserErrors.push(String(e)));page.on('console',m=>{if(m.type()==='error')browserErrors.push(m.text())});
  await page.route('**/@vite/client',r=>r.fulfill({status:200,contentType:'application/javascript',body:''}));
  await page.route('**/src/modules/zoning/grid.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:instrumented}));
  await page.goto(`${base}/?showcase=democity&time=12&camera=aerial&seed=${seed}&quality=high&speed=0&headless=1`,{waitUntil:'domcontentloaded',timeout:240000});await page.waitForFunction(()=>window.__sim?.ready===true,null,{timeout:240000});
  const row=await page.evaluate(seed=>{
   const s=window.__sim,w=s.world,z=s.registry.apis.zoning,Z=w.zones;
   const code=x=>x?.type?x.type[0]+(x.density==='high'?'h':'l'):null;
   const widths={rl:2,rh:3,cl:2,ch:3,il:3,ih:4,ol:3,oh:4},depths={rl:3,rh:3,cl:3,ch:3,il:4,ih:4,ol:3,oh:4};
   const lotInvariant=()=>JSON.stringify([...Z.lots.values()].sort((a,b)=>a.id-b.id).map(l=>[l.id,l.buildingId,l.edgeId,l.side,l._identityCell||l.cells?.[0],l.x,l.y,l.z,l.w,l.d,l.heading,l.type,l.density,l.corner,l.t]));
   const before={lots:Z.lots.size,buildings:w.buildings.items.size,invariant:lotInvariant()};const ordered=z.diagnose();const after={lots:Z.lots.size,buildings:w.buildings.items.size,invariant:lotInvariant()};
	   const summary={edges:ordered.length,sides:0,slots:0,nullSlots:0,unpaintedSlots:0,paintedSlots:0,fullDepthSlots:0,shallowSlots:0,shallowByReason:{unpainted:0,'class-change':0,'prior-claimed':0,'max-depth':0},unpaintedByReason:{unpainted:0,'class-change':0,'prior-claimed':0,'max-depth':0},runs:0,calculatedLots:0,nominalLotWidthSlots:0,shortRunSlots:0,remainderSlots:0,absorbedRemainderSlots:0,absorbedShallowSlots:0,unabsorbedFullDepthSlots:0,preferredKeyReferences:0,uniquePreferredKeys:0,duplicatePreferredKeyReferences:0,withinSlotDuplicateKeys:0,adjacentSlotOverlapKeys:0,adjacentExactColumnPairs:0,nonAdjacentRepeatedKeys:0,classBreaks:0,depthBreaks:0,nullBreaks:0};
   const allPreferred=new Map(),runRows=[],sideRows=[];
   for(const edge of ordered)for(const side of ['right','left']){
    const data=edge.sides[side];if(!data)continue;summary.sides++;const slots=data.slots;summary.slots+=slots.length;
	    const full=slots.map(sl=>{if(!sl){summary.nullSlots++;return false}const c=code(sl);if(!c){summary.unpaintedSlots++;summary.unpaintedByReason[sl.stopReason]=(summary.unpaintedByReason[sl.stopReason]||0)+1;return false}summary.paintedSlots++;const ok=sl.avail>=depths[c];if(ok)summary.fullDepthSlots++;else{summary.shallowSlots++;summary.shallowByReason[sl.stopReason]=(summary.shallowByReason[sl.stopReason]||0)+1}return ok});
    const preferred=slots.map((sl,i)=>sl&&full[i]?sl.keys.slice(0,depths[code(sl)]):[]);
    let priorClass=null,priorFull=false;
    for(let i=0;i<slots.length;i++){
     const sl=slots[i],c=code(sl);if(i&&priorFull&&!full[i]){if(!sl||!c)summary.nullBreaks++;else summary.depthBreaks++}if(i&&priorFull&&full[i]&&priorClass!==c)summary.classBreaks++;
     priorFull=full[i];priorClass=c;
     if(!full[i])continue;const keys=preferred[i],u=new Set(keys);summary.preferredKeyReferences+=keys.length;summary.withinSlotDuplicateKeys+=keys.length-u.size;
     for(const k of keys){const a=allPreferred.get(k)||[];a.push([edge.id,side,i]);allPreferred.set(k,a)}
     if(i&&full[i-1]){const prev=new Set(preferred[i-1]),overlap=keys.filter(k=>prev.has(k)).length;summary.adjacentSlotOverlapKeys+=overlap;if(keys.length===preferred[i-1].length&&keys.every((k,j)=>k===preferred[i-1][j]))summary.adjacentExactColumnPairs++}
    }
	    let i=0;while(i<slots.length){if(!full[i]){i++;continue}const c=code(slots[i]);let j=i+1;while(j<slots.length&&full[j]&&code(slots[j])===c)j++;const len=j-i,want=widths[c],lots=Math.floor(len/want),remainder0=len-lots*want;let remainder=remainder0,absorbedRemainder=0,absorbedShallow=0;summary.runs++;summary.calculatedLots+=lots;summary.nominalLotWidthSlots+=lots*want;summary.remainderSlots+=remainder0;if(!lots)summary.shortRunSlots+=len;
	     if(lots){const same=t=>t&&code(t)===c&&t.avail>=1;const road=w.roads.edges.get(edge.id),junction=id=>{const n=w.roads.nodes?.get(id);return!!n&&n.edges&&n.edges.size>=2};const corners=new Array(lots).fill(false);if(i>0&&same(slots[i-1])){absorbedShallow++;corners[0]=true}else if(remainder>0&&i===0&&junction(road?.a)){absorbedRemainder++;remainder--;corners[0]=true}if(j<slots.length&&same(slots[j])&&!corners[lots-1]){absorbedShallow++;corners[lots-1]=true}else if(remainder>0&&j===slots.length&&junction(road?.b)&&!corners[lots-1]){absorbedRemainder++;remainder--;corners[lots-1]=true}}
	     summary.absorbedRemainderSlots+=absorbedRemainder;summary.absorbedShallowSlots+=absorbedShallow;summary.unabsorbedFullDepthSlots+=remainder;
	     const keys=[];for(let q=i;q<j;q++)keys.push(...preferred[q]);runRows.push({edgeId:edge.id,edgeType:edge.type,side,start:i,end:j,length:len,code:c,want,depth:depths[c],lots,remainderBeforeExtensions:remainder0,absorbedRemainder,absorbedShallow,unabsorbedFullDepthSlots:remainder,preferredReferences:keys.length,uniquePreferredKeys:new Set(keys).size,adjacentOverlapKeys:Array.from({length:Math.max(0,j-i-1)},(_,n)=>preferred[i+n+1].filter(k=>new Set(preferred[i+n]).has(k)).length).reduce((a,b)=>a+b,0)});i=j}
    sideRows.push({edgeId:edge.id,edgeType:edge.type,side,n:data.n,d0:data.d0,pad:data.pad,front:data.front,sgn:data.sgn,slots});
   }
   summary.uniquePreferredKeys=allPreferred.size;summary.duplicatePreferredKeyReferences=summary.preferredKeyReferences-allPreferred.size;summary.nonAdjacentRepeatedKeys=[...allPreferred.values()].filter(refs=>refs.length>1&&!refs.some((a,i)=>refs.slice(i+1).some(b=>a[0]===b[0]&&a[1]===b[1]&&Math.abs(a[2]-b[2])===1))).length;
	   const lotById=new Map([...Z.lots.values()].map(l=>[l.id,l])),finalOwners=new Map();for(const l of lotById.values())for(const key of l.cells||[])finalOwners.set(key,l.id);
	   const repeatedKeys=[...allPreferred].filter(([,refs])=>refs.length>1).map(([key,refs])=>{const ownerId=finalOwners.get(key)??null,owner=lotById.get(ownerId);return{key,refs,ownerId,ownerEdgeId:owner?.edgeId??null,ownerSide:owner?.side??null}});
	   const repetitionScope={sameEdgeSameSideAdjacent:0,sameEdgeSameSideNonAdjacent:0,sameEdgeOppositeSide:0,differentEdge:0,ultimatelyUnclaimed:0};for(const r of repeatedKeys){if(r.ownerId==null)repetitionScope.ultimatelyUnclaimed++;let adjacent=false,nonAdjacent=false,opposite=false,different=false;for(let a=0;a<r.refs.length;a++)for(let b=a+1;b<r.refs.length;b++){const x=r.refs[a],y=r.refs[b];if(x[0]!==y[0])different=true;else if(x[1]!==y[1])opposite=true;else if(Math.abs(x[2]-y[2])===1)adjacent=true;else nonAdjacent=true}if(adjacent)repetitionScope.sameEdgeSameSideAdjacent++;if(nonAdjacent)repetitionScope.sameEdgeSameSideNonAdjacent++;if(opposite)repetitionScope.sameEdgeOppositeSide++;if(different)repetitionScope.differentEdge++}
	   const lotWidthSlots=[...lotById.values()].reduce((n,l)=>n+l.w/8,0);summary.expectedLotWidthSlots=summary.nominalLotWidthSlots+summary.absorbedRemainderSlots+summary.absorbedShallowSlots;summary.lotWidthAccountingExact=summary.expectedLotWidthSlots===lotWidthSlots;summary.fullDepthAccountingExact=summary.nominalLotWidthSlots+summary.remainderSlots===summary.fullDepthSlots;
	   return{seed,counts:{cells:Z.cells.size,lots:Z.lots.size,buildings:w.buildings.items.size},diagnoseStable:{countsEqual:before.lots===after.lots&&before.buildings===after.buildings,invariantEqual:before.invariant===after.invariant},summary,lotWidthSlots,repetitionScope,runRows,repeatedKeys,sideRows,lots:[...lotById.values()].sort((a,b)=>a.id-b.id).map(l=>({id:l.id,edgeId:l.edgeId,side:l.side,type:l.type,density:l.density,w:l.w,d:l.d,identityCell:l._identityCell||l.cells?.[0],cells:[...(l.cells||[])]})),errors:s.errors.slice()};
  },seed);row.browserErrors=browserErrors;row.pass=row.diagnoseStable.countsEqual&&row.diagnoseStable.invariantEqual&&row.summary.calculatedLots===row.counts.lots&&!row.errors.length&&!browserErrors.length;result.seeds.push(row);await page.close();
 }
 result.pass=result.seeds.every(x=>x.pass);fs.mkdirSync(out.slice(0,out.lastIndexOf('/')),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2));
 console.log(JSON.stringify({pass:result.pass,sourceSha256:result.sourceSha256,seeds:result.seeds.map(x=>({seed:x.seed,counts:x.counts,diagnoseStable:x.diagnoseStable,summary:x.summary,lotWidthSlots:x.lotWidthSlots,repeatedKeys:x.repeatedKeys.length,errors:x.errors,browserErrors:x.browserErrors,pass:x.pass}))},null,2));if(!result.pass)process.exitCode=1;
}finally{await browser.close()}
