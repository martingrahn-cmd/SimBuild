import { open } from './lib.mjs';
const { browser, page } = await open({ url: 'http://127.0.0.1:5173/?showcase=zoning&headless=1&time=12&camera=zones&seed=1337&speed=0', w: 640, h: 360 });
const r = await page.evaluate(() => {
  const S = window.__sim, W = S.world;
  const g = S.registry.get('zoning').def.api;
  const grid = S.registry.get('zoning');
  // reach the grid through the api's closure: use world.zones + a diagnose hook exposed on the api
  return g.diagnose ? g.diagnose() : null;
});
if (!r) { console.log('no diagnose api'); } else {
  const zero = r.filter(x => x.lots === 0);
  console.log('edges', r.length, 'zeroLot', zero.length, 'totalLots', r.reduce((a,b)=>a+b.lots,0));
  for (const e of r.slice(0, 30)) console.log(String(e.id).padStart(3), e.type.padEnd(7), String(e.len).padStart(3), 'lots', String(e.lots).padStart(2), '| R:', e.sides.right, '| L:', e.sides.left);
}
await browser.close();
