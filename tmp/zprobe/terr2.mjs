import { open } from './lib.mjs';
const { browser, page } = await open({ url: 'http://127.0.0.1:5173/?showcase=zoning&headless=1&time=12&camera=zones&seed=1337&speed=0', w: 640, h: 360 });
const r = await page.evaluate(() => {
  const T = window.__sim.world.terrain;
  const rows = [];
  for (let z = -400; z <= 260; z += 20) {
    let s = '';
    for (let x = -440; x <= 440; x += 20) { s += T.isWater(x, z) ? 'W' : (T.getSlope(x, z) > 0.42 ? 'S' : (T.getSlope(x,z) > 0.25 ? 's' : '.')); }
    rows.push(String(z).padStart(5) + ' ' + s);
  }
  const hh = [];
  for (let z = -200; z <= 200; z += 40) { let s=''; for (let x=-440;x<=440;x+=40) s += String(Math.round(T.getHeight(x,z))).padStart(5); hh.push(String(z).padStart(5)+s); }
  return { rows, hh, legend: 'x -440..440 step 20' };
});
console.log(r.legend); console.log(r.rows.join('\n')); console.log('--- heights (x -440..440 step 40)'); console.log(r.hh.join('\n'));
await browser.close();
