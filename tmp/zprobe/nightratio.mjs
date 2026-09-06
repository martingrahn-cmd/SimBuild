import { open, shoot, crop, statsOf } from './lib.mjs';
import { readPng } from './png.mjs';
const pts = [[-200,-120],[-120,-120],[-40,-120],[120,-120],[-200,-40],[-120,-40],[40,-40],[200,-40]];
const res = {};
for (const h of [12, 22]) {
  const { browser, page } = await open({ url: `http://127.0.0.1:5173/?showcase=zoning&headless=1&time=${h}&camera=zones&seed=1337&speed=0` });
  const info = await page.evaluate(() => {
    window.__sim.registry.get('zoning').group.visible = false;
    return { exposure: window.__sim.engine.renderer.toneMappingExposure, night: window.__sim.world.weather.night, sunI: window.__sim.world.weather.sunIntensity };
  });
  await page.waitForTimeout(600);
  const proj = await page.evaluate((ps) => ps.map(([x,z]) => { const y = window.__sim.world.terrain.getHeight(x,z); return window.__sim.project(x,y,z); }), pts);
  const f = `tmp/zprobe/gnd_${h}.png`;
  await shoot(page, f);
  const png = readPng(f);
  res[h] = { info, pts: proj.map((p,i) => ({ pt: pts[i], mean: +statsOf(crop(png, p[0], p[1], 200)).mean.toFixed(1), sd: +statsOf(crop(png, p[0], p[1], 200)).sd.toFixed(1) })) };
  await browser.close();
}
const r = res[22].pts.map((p,i) => +(p.mean / res[12].pts[i].mean).toFixed(3));
console.log(JSON.stringify(res, null, 1));
console.log('ground night/day ratios:', r.join(' '));
