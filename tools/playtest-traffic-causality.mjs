#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const out = 'shots/playtest-fixes-r10/traffic-causality.json';
fs.mkdirSync('shots/playtest-fixes-r10', { recursive: true });
const result = { errors: [], emptyRoad: null, smallCity: null, mixedUse: null, deadEnd: null, portals: null, pass: false };
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-angle=metal','--use-gl=angle','--enable-webgl','--enable-gpu','--ignore-gpu-blocklist','--no-sandbox'],
});

async function open(seed) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  page.on('pageerror', e => result.errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') result.errors.push(m.text()); });
  await page.goto(`${base}/?mode=play&headless=1&speed=0&time=12&seed=${seed}`, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });
  await page.evaluate(() => window.__sim.freeze());
  return page;
}

async function addRoad(page, type, ax, az, bx, bz) {
  return page.evaluate(({type,ax,az,bx,bz}) => {
    const s=window.__sim,w=s.world,a=s.registry.apis;
    const n0=w.roads.addNode(ax,az),n1=w.roads.addNode(bx,bz),edgeId=w.roads.addEdge(n0,n1,type);
    a.roads.rebuild({preserveTerrain:true});
    a.traffic.setDensity(1);
    return {n0,n1,edgeId};
  }, {type,ax,az,bx,bz});
}

async function mixedUse(page) {
  return page.evaluate(() => {
    const s=window.__sim,w=s.world,a=s.registry.apis;
    const nodes=[-400,-200,0,200,400].map(x=>w.roads.addNode(x,0)),edges=[];
    for(let i=0;i<4;i++)edges.push(w.roads.addEdge(nodes[i],nodes[i+1],'street'));
    a.roads.rebuild({preserveTerrain:true});
    const types=['residential','commercial','office','industrial'],values=[[45,0],[0,18],[0,24],[0,35]];
    types.forEach((type,i)=>{const id=99100+i;w.zones.lots.set(id,{id,edgeId:edges[i],type,cells:[`${i}_0`]});w.buildings.items.set(id,{id,lotId:id,type,occupants:values[i][0],jobs:values[i][1]});});
    w.buildings.version++;w.economy.population=45;w.economy.jobs=77;a.traffic.setDensity(1);a.traffic.step(2);
    const saved=a.traffic.serialize(),heavy=saved.vehicles.filter(v=>v.kind==='box_truck'||v.kind==='semi');
    const restored=a.traffic.deserialize(structuredClone(saved)),after=a.traffic.serialize();
    return {stats:a.traffic.stats(),saved,purposes:Object.fromEntries([...new Set(saved.vehicles.map(v=>v.purpose))].sort().map(k=>[k,saved.vehicles.filter(v=>v.purpose===k).length])),heavy:heavy.map(v=>({kind:v.kind,purpose:v.purpose,edgeId:v.edgeId})),heavyPurposeValid:heavy.every(v=>v.purpose==='freight'||v.purpose==='delivery'),restored,restoreExact:JSON.stringify(saved)===JSON.stringify(after)};
  });
}

try {
  {
    const page=await open(5101), road=await addRoad(page,'street',-120,0,120,0);
    result.emptyRoad=await page.evaluate(road => {
      const s=window.__sim,a=s.registry.apis;
      a.traffic.step(120);
      return {road, population:s.world.economy.population, jobs:s.world.economy.jobs, portals:a.traffic.outsideConnections(), stats:a.traffic.stats(), saved:a.traffic.serialize()};
    },road);
    await page.close();
  }
  {
    const page=await open(5102), road=await addRoad(page,'street',-120,0,120,0);
    result.deadEnd=await page.evaluate(road => {
      const s=window.__sim,w=s.world,a=s.registry.apis;
      w.zones.lots.set(900001,{id:900001,edgeId:road.edgeId,type:'residential'});
      w.buildings.items.set(900001,{id:900001,lotId:900001,type:'residential',occupants:30,jobs:0});
      w.buildings.version++;
      w.economy.population=30;w.economy.jobs=0;
      a.traffic.step(1);
      const before=a.traffic.serialize(), beforeStats=a.traffic.stats();
      a.traffic.step(2400);
      const after=a.traffic.serialize(), afterStats=a.traffic.stats();
      return {
        road, beforeStats, afterStats, beforeCount:before.vehicles.length, afterCount:after.vehicles.length,
        routesContainUTurn:before.vehicles.length>0&&before.vehicles.every(v=>v.route.some((step,i)=>i>0&&step.edgeId===v.route[i-1].edgeId&&step.dir===-v.route[i-1].dir)),
        directionsAfter:[...new Set(after.vehicles.map(v=>v.dir))], portals:a.traffic.outsideConnections(),
      };
    },road);
    await page.close();
  }
  {
    const page=await open(5104), road=await addRoad(page,'street',-120,0,120,0);
    result.smallCity=await page.evaluate(road => {
      const s=window.__sim,w=s.world,a=s.registry.apis;
      w.zones.lots.set(900002,{id:900002,edgeId:road.edgeId,type:'residential'});
      w.buildings.items.set(900002,{id:900002,lotId:900002,type:'residential',occupants:22,jobs:0});
      w.buildings.version++;w.economy.population=22;w.economy.jobs=0;
      a.traffic.step(240);
      return {stats:a.traffic.stats(),live:a.traffic.serialize().vehicles.length};
    },road);
    await page.close();
  }
  {
    const page=await open(5105);result.mixedUse=await mixedUse(page);await page.close();
    const repeat=await open(5105),again=await mixedUse(repeat);await repeat.close();
    result.mixedUse.deterministic=JSON.stringify(result.mixedUse.saved)===JSON.stringify(again.saved);
  }
  {
    const page=await open(5103), road=await addRoad(page,'avenue',-1010,0,1010,0);
    result.portals=await page.evaluate(road => {
      const s=window.__sim,a=s.registry.apis;
      a.traffic.step(1);const before=a.traffic.stats();
      a.traffic.step(4000);const after=a.traffic.stats();
      return {road, connections:a.traffic.outsideConnections(), before, after, live:a.traffic.serialize().vehicles.length};
    },road);
    await page.close();
  }
  result.pass = result.errors.length===0 &&
    result.emptyRoad.population===0 && result.emptyRoad.stats.targetVehicles===0 && result.emptyRoad.stats.vehicles===0 &&
    result.smallCity.stats.targetVehicles>=1 && result.smallCity.stats.targetVehicles<=8 &&
    result.smallCity.stats.byKind.box_truck===0 && result.smallCity.stats.byKind.semi===0 &&
    result.smallCity.live===result.smallCity.stats.targetVehicles &&
    result.mixedUse.heavy.length>0 && result.mixedUse.heavyPurposeValid && result.mixedUse.purposes.freight>0 && result.mixedUse.purposes.commute>0 && result.mixedUse.deterministic && result.mixedUse.restored && result.mixedUse.restoreExact &&
    result.deadEnd.portals.length===0 && result.deadEnd.beforeCount>0 && result.deadEnd.routesContainUTurn &&
    result.deadEnd.afterCount===result.deadEnd.afterStats.targetVehicles && result.deadEnd.afterStats.despawned===0 && result.deadEnd.directionsAfter.length===2 &&
    result.portals.connections.length===2 && result.portals.before.targetVehicles>0 && result.portals.after.despawned>0 && result.portals.live===result.portals.after.targetVehicles;
} catch (error) {
  result.errors.push(String(error?.stack||error));
} finally {
  await browser.close();
}
fs.writeFileSync(out,JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
if(!result.pass)process.exitCode=1;
