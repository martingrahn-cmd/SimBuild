import { open } from './lib.mjs';
const { browser, page } = await open({ url: 'http://127.0.0.1:5173/?showcase=zoning&headless=1&time=12&camera=zones&seed=1337&speed=0', w: 640, h: 360 });
const r = await page.evaluate(() => {
  const W = window.__sim.world, R = W.roads;
  const out = [];
  for (const type of ['street','avenue','alley']) {
    const e = [...R.edges.values()].find(x => x.type === type && x.length > 60);
    if (!e) continue;
    const rows = [];
    for (const t of [0.25, 0.5, 0.75]) {
      const s = R.sample(e.id, t);
      const row = [];
      for (let u = 4; u <= 22; u += 0.5) row.push(R.isRoad(s.x + s.normal.x*u, s.z + s.normal.z*u));
      rows.push({ t, first0: 4 + row.findIndex(v => v === 0) * 0.5, row: row.join('') });
    }
    out.push({ type, asphaltHalf: R.types[type].asphaltHalf, sidewalk: R.types[type].sidewalk, rows });
  }
  return out;
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
