import { open } from './lib.mjs';
const { browser, page, errors } = await open({ url: 'http://127.0.0.1:5173/?showcase=zoning&headless=1&time=12&camera=zones&seed=1337&speed=0', w: 800, h: 450 });
const r = await page.evaluate(() => {
  const S = window.__sim, api = S.registry.get('zoning').def.api, W = S.world;
  const st = api.stats();
  const noLot = [], few = [];
  for (const e of W.roads.edges.values()) {
    if (e.type === 'highway' || e.type === 'ramp') continue;
    const n = api.lotsFor(e.id).length;
    if (n === 0) noLot.push(api.debugEdge(e.id));
  }
  const wh = {}; for (const l of W.zones.lots.values()) wh[l.w + 'x' + l.d] = (wh[l.w + 'x' + l.d] || 0) + 1;
  return { st, edges: W.roads.edges.size, noLotCount: noLot.length, sample: noLot.slice(0, 4), wh };
});
console.log(JSON.stringify(r, null, 1).slice(0, 6000));
console.log('errors', errors.length, errors.slice(0,2).map(e=>e.slice(0,200)));
await browser.close();
