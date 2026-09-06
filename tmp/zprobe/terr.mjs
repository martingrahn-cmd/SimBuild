import { open } from './lib.mjs';
const { browser, page } = await open({ url: 'http://127.0.0.1:5173/?showcase=zoning&headless=1&time=12&camera=zones&seed=1337&speed=0', w: 640, h: 360 });
const r = await page.evaluate(() => {
  const T = window.__sim.world.terrain;
  const out = { hasFeatures: !!T.features, minH: T.minHeight, maxH: T.maxHeight };
  if (T.features?.river) { out.river = []; for (let x = -900; x <= 900; x += 100) out.river.push([x, +T.features.river.zAt(x).toFixed(1), +T.features.river.halfWidthAt(x).toFixed(1)]); }
  if (T.features?.coast) { out.coast = []; for (let z = -900; z <= 900; z += 200) out.coast.push([z, +T.features.coast.xAt(z).toFixed(1)]); }
  // slope map coarse
  const steep = [];
  for (let z = -900; z <= 900; z += 40) for (let x = -900; x <= 900; x += 40) { const s = T.getSlope(x, z); if (s > 0.42 && !T.isWater(x,z)) steep.push([x, z, +s.toFixed(2), +T.getHeight(x,z).toFixed(1)]); }
  out.steepCount = steep.length;
  out.steep = steep.filter(p=>Math.abs(p[0])<700&&Math.abs(p[1])<700).slice(0, 400);
  // height profile along some lines
  out.h = {};
  for (const z of [-400, -200, 0, 200, 400]) { const row=[]; for (let x=-600;x<=600;x+=100) row.push(+window.__sim.world.terrain.getHeight(x,z).toFixed(1)); out.h['z'+z]=row; }
  out.water = [];
  for (let z = -600; z <= 600; z += 100) { const row=[]; for (let x=-600;x<=600;x+=100) row.push(T.isWater(x,z)?1:0); out.water.push([z,row.join('')]); }
  return out;
});
console.log(JSON.stringify(r));
await browser.close();
