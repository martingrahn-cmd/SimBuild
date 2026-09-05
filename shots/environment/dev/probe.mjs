// probe: exposure / ambient / cloud coverage at a given hour. node shots/environment/dev/probe.mjs 17.9 [weather]
import { chromium } from 'playwright';
const exe = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 320, height: 180 } })).newPage();
const hours = (process.argv[2] || '12').split(','), weather = process.argv[3] ? `&weather=${process.argv[3]}` : '';
await page.goto(`http://127.0.0.1:5173/?showcase=environment&headless=1&time=${hours[0]}&camera=skyline${weather}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => window.__sim && window.__sim.ready === true, null, { timeout: 300000, polling: 200 });
for (const h of hours) {
  const r = await page.evaluate(async (h) => {
    const s = window.__sim; const scene = s.engine.scene;
    s.setTime(+h);
    const waitFrames = async (n) => { const f0 = s.engine.stats.frames; while (s.engine.stats.frames - f0 < n) await new Promise(r => setTimeout(r, 50)); };
    await waitFrames(3);
    const w = s.world.weather; const d = s.registry.get('environment').def.api._debug();
    const S = d.S, U = d.U;
    const out = { hour: h, exposure: +w.exposure.toFixed(3), rendererExp: +s.engine.renderer.toneMappingExposure.toFixed(3), envI: +scene.environmentIntensity.toFixed(3), sunY: +S.sunDir.y.toFixed(3), sunI: +w.sunIntensity.toFixed(3), lightI: +w.lightIntensity.toFixed(3), night: +w.night.toFixed(3), moonPhase: +w.moonPhase.toFixed(2), moonY: +S.moonDir.y.toFixed(3) };
    out.zenith = S.zenith.map(v => +v.toFixed(4)); out.mid = S.mid.map(v => +v.toFixed(4)); out.horizon = S.horizon.map(v => +v.toFixed(4));
    out.skyLight = [w.skyLight.r, w.skyLight.g, w.skyLight.b].map(v => +v.toFixed(4));
    out.sunColor = [w.sunColor.r, w.sunColor.g, w.sunColor.b].map(v => +v.toFixed(3));
    out.cloudSun = S.sky.mat.uniforms.uCloudSun.value.toArray().map(v => +v.toFixed(3));
    out.cloudAmb = S.sky.mat.uniforms.uCloudAmb.value.toArray().map(v => +v.toFixed(3));
    // cloud map coverage
    const rt = S.cloudMap.rt; const px = new Uint8Array(rt.width * rt.height * 4);
    s.engine.renderer.readRenderTargetPixels(rt, 0, 0, rt.width, rt.height, px);
    let sum = 0, n = 0, cov = 0; for (let i = 0; i < px.length; i += 4) { sum += px[i + 1]; n++; if (px[i + 1] > 128) cov++; }
    out.cloudMeanDensity = +(sum / n / 255).toFixed(3); out.cloudCoverage = +(cov / n).toFixed(3);
    out.fogColor = scene.fog.color.getHexString(); out.fogDensity = scene.fog.density;
    out.errors = s.errors.length; out.warnings = s.warnings.slice(0, 3);
    return out;
  }, h);
  console.log(JSON.stringify(r));
}
await browser.close();
