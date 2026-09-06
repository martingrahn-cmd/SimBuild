import { open, shoot, crop, statsOf } from './lib.mjs';
import { readPng } from './png.mjs';
const { browser, page, errors } = await open({ url: 'http://127.0.0.1:5173/?showcase=zoning&headless=1&time=12&camera=zones&seed=1337&speed=0' });
const pts = [[-200,-120],[-120,-120],[-40,-120],[120,-120],[-200,-40],[-120,-40],[40,-40],[200,-40]];
const out = {};
for (const h of [12, 22]) {
  await page.evaluate((hh) => { window.__sim.setTime(hh); window.__sim.registry.get('zoning').group.visible = false; }, h);
  await page.waitForTimeout(1200);
  const proj = await page.evaluate((ps) => ps.map(([x,z]) => { const y = window.__sim.world.terrain.getHeight(x,z); return window.__sim.project(x,y,z); }), pts);
  const f = `tmp/zprobe/base_${h}.png`;
  await shoot(page, f);
  const png = readPng(f);
  out[h] = proj.map((p,i) => { const s = statsOf(crop(png, p[0], p[1], 200)); return { pt: pts[i], px: [p[0],p[1]], mean: +s.mean.toFixed(1), sd: +s.sd.toFixed(1), rgb: s.rgb.map(v=>+v.toFixed(0)) }; });
}
console.log(JSON.stringify(out, null, 1));
console.log('errors', errors);
await browser.close();
