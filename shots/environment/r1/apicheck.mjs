// Critic API-contract probe for the environment module (throwaway). Run: node shots/environment/r1/apicheck.mjs
import { chromium } from 'playwright';

const exe = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'];
const browser = await chromium.launch({ executablePath: exe, headless: true, args });
const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } });
const page = await ctx.newPage();
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + String(e).slice(0, 300)));

async function open(url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__sim && window.__sim.ready === true, null, { timeout: 120000, polling: 100 });
}

const probe = async () => page.evaluate(async () => {
  const s = window.__sim;
  const waitFrames = async (n) => { const f0 = s.engine.stats.frames; while (s.engine.stats.frames - f0 < n) await new Promise((r) => setTimeout(r, 50)); };
  const w = s.world.weather;
  const env = s.registry.status().environment;
  const api = s.registry.modules?.environment || s.registry.api?.environment || null;
  const snap = () => ({
    hour: s.world.time.hour,
    sunDir: w.sunDir.toArray().map((v) => +v.toFixed(4)),
    sunIntensity: +w.sunIntensity.toFixed(4),
    lightDir: w.lightDir?.toArray().map((v) => +v.toFixed(4)),
    lightIntensity: +(w.lightIntensity ?? NaN).toFixed(4),
    skyLight: [w.skyLight.r, w.skyLight.g, w.skyLight.b].map((v) => +v.toFixed(5)),
    exposure: +s.engine.renderer.toneMappingExposure.toFixed(4),
    fogDensity: w.fogDensity, night: w.night,
    finite: [w.sunDir.x, w.sunDir.y, w.sunDir.z, w.sunIntensity, w.lightIntensity, w.exposure, w.skyLight.r, w.skyLight.g, w.skyLight.b, s.engine.renderer.toneMappingExposure, s.engine.scene?.fog?.density ?? 0].every(Number.isFinite),
  });
  const out = { moduleStatus: env, hours: {} };
  await waitFrames(1);
  out.hours['12'] = snap();
  for (const h of [6.5, 17.5, 22, 0, 3, 5.9, 18.1, 19]) { s.setTime(h); await waitFrames(2); out.hours[String(h)] = snap(); }
  s.setTime(12); await waitFrames(2);

  // lights: who owns them?
  const scene = s.engine.scene;
  const lights = [];
  scene.traverse((o) => {
    if (o.isLight) {
      let p = o, owner = '(scene)';
      while (p) { if (p.parent === scene) { owner = p.name; break; } p = p.parent; }
      lights.push({ type: o.type, name: o.name, owner, castShadow: !!o.castShadow, intensity: +o.intensity.toFixed(3), mapSize: o.shadow?.mapSize?.x, hasMap: !!o.shadow?.map });
    }
  });
  out.lights = lights;
  out.rendererState = { shadowMap: s.engine.renderer.shadowMap.enabled, shadowType: s.engine.renderer.shadowMap.type, toneMapping: s.engine.renderer.toneMapping, envMap: !!scene.environment, fog: scene.fog ? { type: scene.fog.constructor.name, density: scene.fog.density, color: scene.fog.color.getHexString() } : null };

  // materials hooked with CSM?
  let litCount = 0, csmCount = 0, envKey = 0;
  scene.traverse((o) => { const m = o.material; if (!m) return; const ms = Array.isArray(m) ? m : [m]; for (const mm of ms) { if (mm.isMeshStandardMaterial || mm.isMeshPhysicalMaterial) { litCount++; if (mm.defines && mm.defines.USE_CSM) csmCount++; if (mm.customProgramCacheKey && /env2/.test(mm.customProgramCacheKey())) envKey++; } } });
  out.materials = { litCount, csmCount, envKey };

  // weather API
  const apiObj = s.registry.modules?.environment ?? s.registry.apis?.environment ?? s.registry.get?.('environment')?.api ?? null;
  out.apiKeys = apiObj ? Object.keys(apiObj) : null;
  if (apiObj && apiObj.setWeather) {
    const before = { cloud: w.cloudiness, rain: w.rain, fog: w.fogDensity, preset: w.preset };
    let evt = null; s.events.on('weather:changed', (p) => { evt = p; });
    apiObj.setWeather('rain'); await waitFrames(3);
    const rain = { cloud: w.cloudiness, rain: w.rain, fog: w.fogDensity, preset: w.preset, wetness: +w.wetness.toFixed(3), sceneFog: scene.fog.density, sunIntensity: +w.sunIntensity.toFixed(3), evt };
    apiObj.setWeather('fog'); await waitFrames(3);
    const fog = { cloud: w.cloudiness, rain: w.rain, fog: w.fogDensity, preset: w.preset, sceneFog: scene.fog.density, sunIntensity: +w.sunIntensity.toFixed(3) };
    apiObj.setWeather('bogus'); await waitFrames(1);
    const bogus = { preset: w.preset, cloud: w.cloudiness };
    apiObj.setWeather({ cloudiness: 5, rain: -1 }); await waitFrames(1);
    const clamp = { cloud: w.cloudiness, rain: w.rain, preset: w.preset };
    out.weather = { before, rain, fog, bogus, clamp };
  }
  out.simErrors = s.errors.slice(0, 10); out.simWarnings = s.warnings.slice(0, 10);
  out.drawCalls = s.stats().drawCalls;
  return out;
});

const res = {};
await open('http://127.0.0.1:5173/?showcase=environment&headless=1&time=12');
res.main = await probe();
// ?weather param respected at boot
await open('http://127.0.0.1:5173/?showcase=environment&headless=1&time=12&weather=rain');
res.bootRain = await page.evaluate(() => { const w = window.__sim.world.weather; return { preset: w.preset, rain: w.rain, cloudiness: w.cloudiness, fogDensity: w.fogDensity, rainVisible: (() => { let v = null; window.__sim.engine.scene.traverse((o) => { if (o.name === 'rain') v = o.visible; }); return v; })(), drawCalls: window.__sim.stats().drawCalls }; });
await open('http://127.0.0.1:5173/?showcase=environment&headless=1&time=12&weather=fog');
res.bootFog = await page.evaluate(() => { const w = window.__sim.world.weather; return { preset: w.preset, fogDensity: w.fogDensity, sceneFog: window.__sim.engine.scene.fog.density, sunIntensity: w.sunIntensity }; });
// determinism: same seed twice
await open('http://127.0.0.1:5173/?showcase=environment&headless=1&time=6.5');
const d1 = await page.evaluate(() => JSON.stringify([window.__sim.world.weather.sunDir.toArray(), window.__sim.world.weather.sunIntensity, window.__sim.engine.renderer.toneMappingExposure]));
await open('http://127.0.0.1:5173/?showcase=environment&headless=1&time=6.5');
const d2 = await page.evaluate(() => JSON.stringify([window.__sim.world.weather.sunDir.toArray(), window.__sim.world.weather.sunIntensity, window.__sim.engine.renderer.toneMappingExposure]));
res.deterministic = d1 === d2; res.detSample = d1;
res.consoleErrors = consoleErrors;
console.log(JSON.stringify(res, null, 2));
await browser.close();
