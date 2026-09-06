import { open, shoot, crop, statsOf, sat, lum } from './lib.mjs';
import { readPng } from './png.mjs';
const cam = process.argv[2] || 'zones';
const res = {};
for (const h of [12, 22]) {
  const { browser, page, errors } = await open({ url: `http://127.0.0.1:5173/?showcase=zoning&headless=1&time=${h}&camera=${cam}&seed=1337&speed=0` });
  const probes = await page.evaluate(() => window.__sim.registry.get('zoning').def.api.probePoints());
  const proj = await page.evaluate((ps) => ps.map(p => { const y = window.__sim.world.terrain.getHeight(p.x, p.z); return window.__sim.project(p.x, y, p.z); }), probes);
  await page.evaluate(() => window.__sim.registry.get('zoning').def.api.setOverlayVisible(false));
  await page.waitForTimeout(900);
  const fOff = `tmp/zprobe/c_${cam}_${h}_off.png`; await shoot(page, fOff);
  await page.evaluate(() => window.__sim.registry.get('zoning').def.api.setOverlayVisible(true));
  await page.waitForTimeout(900);
  const fOn = `tmp/zprobe/c_${cam}_${h}_on.png`; await shoot(page, fOn);
  const off = readPng(fOff), on = readPng(fOn);
  const rows = probes.map((p, i) => {
    const [px, py] = proj[i];
    const cOff = crop(off, px, py, 200), cOn = crop(on, px, py, 200);
    const sOff = statsOf(cOff), sOn = statsOf(cOn);
    const pOn = statsOf(crop(on, px, py, 40));
    let d = 0; for (let k = 0; k < cOn.length; k++) d += lum(cOn[k]) - lum(cOff[k]);
    return { cls: p.type + '-' + p.density, px, py, sdOff: +sOff.sd.toFixed(1), sdOn: +sOn.sd.toFixed(1),
      ratio: +(sOn.sd / sOff.sd).toFixed(3), meanOff: +sOff.mean.toFixed(1), meanOn: +sOn.mean.toFixed(1),
      rise: +(sOn.mean - sOff.mean).toFixed(1), overlayL: +(d / cOn.length).toFixed(1), patch: pOn.rgb.map(v => Math.round(v)) };
  });
  // whole-frame p99
  const L = []; for (let i = 0; i < on.data.length; i += 4) L.push(lum([on.data[i], on.data[i+1], on.data[i+2]]));
  L.sort((a,b)=>a-b);
  res[h] = { rows, p99: +L[Math.floor(0.99*L.length)].toFixed(1), max: +L[L.length-1].toFixed(1), errors: errors.length };
  await browser.close();
}
// pair distances at 12
const p12 = res[12].rows;
let mn = 1e9, mp = '';
for (let i=0;i<p12.length;i++) for (let j=i+1;j<p12.length;j++) {
  const a=p12[i].patch,b=p12[j].patch; const d=Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
  if (d<mn){mn=d;mp=p12[i].cls+' vs '+p12[j].cls;}
}
console.log('== 12 =='); for (const r of p12) console.log(r.cls.padEnd(20), 'sdOff',String(r.sdOff).padStart(5),'sdOn',String(r.sdOn).padStart(5),'ratio',r.ratio,'rise',String(r.rise).padStart(6),'overlayL',String(r.overlayL).padStart(6),'patch',r.patch.join(','));
console.log('== 22 =='); for (const r of res[22].rows) console.log(r.cls.padEnd(20), 'meanOff',r.meanOff,'meanOn',r.meanOn,'overlayL',r.overlayL);
console.log('L22/L12:', res[22].rows.map((r,i)=>r.cls+'='+(r.overlayL/p12[i].overlayL).toFixed(3)).join(' '));
console.log('closest pair', mp, mn.toFixed(1));
console.log('p99@12', res[12].p99, 'p99@22', res[22].p99, 'max@22', res[22].max);
console.log('errors', res[12].errors, res[22].errors);
