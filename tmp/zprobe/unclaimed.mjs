import { open } from './lib.mjs';
const { browser, page } = await open({ url: 'http://127.0.0.1:5173/?showcase=zoning&headless=1&time=12&camera=zones&seed=1337&speed=0', w: 640, h: 360 });
const r = await page.evaluate(() => {
  const S = window.__sim, W = S.world, api = S.registry.get('zoning').def.api;
  const claimed = new Set();
  for (const l of W.zones.lots.values()) for (const k of l.cells) claimed.add(k);
  const byDepth = {}, byClass = {}, byEdgeType = {};
  const un = [];
  for (const [k, c] of W.zones.cells) {
    if (claimed.has(k)) continue;
    byDepth[c.depth] = (byDepth[c.depth]||0)+1;
    byClass[c.type+'-'+c.density] = (byClass[c.type+'-'+c.density]||0)+1;
    const e = W.roads.edges.get(c.edgeId);
    byEdgeType[e?e.type:'?'] = (byEdgeType[e?e.type:'?']||0)+1;
    un.push([c.x, c.z, c.depth]);
  }
  // where are they? bucket by 80m
  const map = {};
  for (const [x,z] of un) { const k = Math.floor(x/80)*80 + ',' + Math.floor(z/80)*80; map[k]=(map[k]||0)+1; }
  const top = Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,14);
  return { total: W.zones.cells.size, unclaimed: un.length, byDepth, byClass, byEdgeType, top };
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
