import { open } from './lib.mjs';
const url = process.argv[2] || 'http://127.0.0.1:5173/?showcase=zoning&headless=1&time=12&camera=zones&seed=1337&speed=0';
const { browser, page, errors } = await open({ url, w: 800, h: 450 });
const r = await page.evaluate(() => {
  const S = window.__sim;
  const api = S.registry.get('zoning').def.api;
  const W = S.world, Z = W.zones;
  const st = api.stats();
  const out = { stats: st, probes: api.probePoints(), staging: api.staging(), tuning: api.tuning(), status: S.modulesStatus().zoning };
  // lots
  const wh = {}, ds = {}, corners = { true: 0, false: 0 };
  let badFrame = 0, badHeading = 0, badRoad = 0, badY = 0;
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  for (const l of Z.lots.values()) {
    wh[l.w] = (wh[l.w] || 0) + 1; ds[l.d] = (ds[l.d] || 0) + 1; corners[!!l.corner] = (corners[!!l.corner] || 0) + 1;
    if (![l.nx,l.nz,l.ax,l.az,l.t,l.y].every(Number.isFinite) || typeof l.corner !== 'boolean') badFrame++;
    if (Math.abs(Math.hypot(l.nx,l.nz)-1) > 1e-3 || Math.abs(Math.hypot(l.ax,l.az)-1) > 1e-3 || Math.abs(l.nx*l.ax+l.nz*l.az) > 1e-3) badFrame++;
    if (Math.abs(wrap(l.heading - Math.atan2(-l.nx, l.nz))) > 0.02) badHeading++;
    const px = l.x - l.nx*(l.d/2+3), pz = l.z - l.nz*(l.d/2+3);
    if (!(W.roads.isRoad(px,pz) !== 0)) badRoad++;
    if (Math.abs(l.y - W.terrain.getHeight(l.x,l.z)) > 0.05) badY++;
  }
  out.lots = { wh, ds, corners, badFrame, badHeading, badRoad, badY, n: Z.lots.size };
  // cells validity
  let water = 0, steep = 0, relief = 0, hiway = 0, quad = 0;
  const T = W.terrain;
  for (const c of Z.cells.values()) {
    const h = 4;
    if (T.isWater(c.x,c.z) || T.isWater(c.x-h,c.z-h) || T.isWater(c.x+h,c.z-h) || T.isWater(c.x-h,c.z+h) || T.isWater(c.x+h,c.z+h)) water++;
    if (T.getSlope(c.x,c.z) > 0.42) steep++;
    let mn=1e9,mx=-1e9; for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const y=T.getHeight(c.x+i*h,c.z+j*h); if(y<mn)mn=y; if(y>mx)mx=y;}
    if (mx-mn > 6.5) relief++;
    const e = W.roads.edges.get(c.edgeId); if (e && (e.type==='highway'||e.type==='ramp')) hiway++;
    // item 9: 4 m quad centre vs bilinear of corners
    for (const [ox,oz] of [[-2,-2],[2,-2],[-2,2],[2,2]]) {
      const qx = c.x+ox, qz = c.z+oz;
      const bil = (T.getHeight(qx-2,qz-2)+T.getHeight(qx+2,qz-2)+T.getHeight(qx-2,qz+2)+T.getHeight(qx+2,qz+2))/4;
      if (Math.abs(T.getHeight(qx,qz) - bil) > 0.3) quad++;
    }
  }
  out.cellCheck = { water, steep, relief, hiway, quadOverflow: quad };
  let lotHiway = 0; for (const l of Z.lots.values()) { const e = W.roads.edges.get(l.edgeId); if (e && (e.type==='highway'||e.type==='ramp')) lotHiway++; }
  out.lotHiway = lotHiway;
  // front edge on the curved and the diagonal street
  const cand = [...W.roads.edges.values()].filter(e => e.ctrl || (Math.abs(Math.abs(W.roads.nodes.get(e.a).x - W.roads.nodes.get(e.b).x) - Math.abs(W.roads.nodes.get(e.a).z - W.roads.nodes.get(e.b).z)) < 20 && e.length > 40));
  out.frontEdge = [];
  for (const e of cand.slice(0, 4)) for (const side of ['right','left']) {
    const vs = api.frontEdge(e.id, side);
    if (!vs.length) { out.frontEdge.push({ id: e.id, type: e.type, side, n: 0 }); continue; }
    const ds2 = [], cl = [];
    let onRoad = 0, maxGap = 0;
    for (let i=0;i<vs.length;i++) {
      const v = vs[i];
      const rr = W.roads.nearestEdge(v.x, v.z, 60);
      if (rr) { ds2.push(rr.dist); const T2 = W.roads.types[rr.edge.type]; cl.push(rr.dist - (T2.asphaltHalf + (T2.sidewalk ?? 0))); }
      if (W.roads.isRoad(v.x,v.z) !== 0) onRoad++;
      if (i) maxGap = Math.max(maxGap, Math.hypot(v.x-vs[i-1].x, v.z-vs[i-1].z));
    }
    const med = ds2.slice().sort((a,b)=>a-b)[ds2.length>>1];
    out.frontEdge.push({ id: e.id, type: e.type, side, n: vs.length, curve: !!e.ctrl, maxDev: +Math.max(...ds2.map(d=>Math.abs(d-med))).toFixed(2), clMin: +Math.min(...cl).toFixed(2), clMax: +Math.max(...cl).toFixed(2), onRoad, maxGap: +maxGap.toFixed(2) });
  }
  // draw-call attribution
  return out;
});
const tog = await page.evaluate(async () => {
  const S = window.__sim; const g = S.registry.get('zoning').group;
  const a = S.stats(); g.visible = false;
  await new Promise(r => setTimeout(r, 700));
  const b = S.stats(); g.visible = true;
  await new Promise(r => setTimeout(r, 700));
  const c = S.stats();
  return { draws: a.drawCalls - b.drawCalls, tris: a.triangles - b.triangles, back: c.drawCalls, moduleMs: c.moduleMs?.zoning, geo: c.geometries };
});
console.log(JSON.stringify({ ...r, toggle: tog, errors }, null, 1));
await browser.close();
