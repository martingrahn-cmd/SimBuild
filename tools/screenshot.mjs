#!/usr/bin/env node
// Headless-Chromium screenshot + JSON log for SimBuild.
// node tools/screenshot.mjs --showcase terrain --time 14 --camera aerial [--seed 1337] [--w 1920 --h 1080]
//   [--out shots/x.png] [--measure 3] [--quality high] [--weather rain] [--url http://127.0.0.1:5173] [--timeout 90]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const args = parseArgs(process.argv.slice(2));
const base = args.url || process.env.SIM_URL || 'http://127.0.0.1:5173';
const showcase = args.showcase || 'democity';
const time = args.time !== undefined ? +args.time : 12;
const camera = args.camera || 'aerial';
const seed = args.seed !== undefined ? +args.seed : 1337;
const W = +(args.w || 1920), H = +(args.h || 1080);
const measure = +(args.measure ?? 2);
const timeout = +(args.timeout || 90) * 1000;
const quality = args.quality || 'high';
const out = args.out || `shots/${showcase}_${camera}_${String(time).replace('.', 'p')}.png`;
fs.mkdirSync(path.dirname(out), { recursive: true });

const q = new URLSearchParams({ showcase, time: String(time), camera, seed: String(seed), quality, headless: '1', speed: args.speed ?? '0' });
if (args.weather) q.set('weather', args.weather);
if (args.modules) q.set('modules', args.modules);
const url = `${base}/?${q.toString()}`;

const t0 = Date.now();
const executablePath = process.env.SIM_CHROME || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'].find((p) => fs.existsSync(p));
// GL backend: software by default (this CI box has no GPU). On a real GPU (e.g. Apple Silicon) set
// SIM_GL=metal (or =gl / =d3d11) to measure true fps; headless Chromium needs the new headless mode for that.
const GL = process.env.SIM_GL || 'swiftshader';
const software = GL === 'swiftshader';
const browser = await chromium.launch({
  executablePath,
  headless: software ? true : (process.env.SIM_HEADED === '1' ? false : true),
  channel: !software && process.env.SIM_CHANNEL ? process.env.SIM_CHANNEL : undefined,
  args: [
    `--use-angle=${GL}`, '--ignore-gpu-blocklist', '--enable-webgl',
    ...(software
      ? ['--enable-unsafe-swiftshader', '--disable-gpu-sandbox', '--enable-features=Vulkan,UseSkiaRenderer']
      : ['--enable-gpu', '--enable-gpu-rasterization', '--use-gl=angle']),
    '--no-sandbox', '--disable-dev-shm-usage',
    `--window-size=${W},${H}`,
  ],
});
const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const page = await context.newPage();
const consoleErrors = [], consoleWarnings = [], pageErrors = [];
page.on('response', (r) => { if (r.status() >= 400) consoleErrors.push(`HTTP ${r.status()} ${r.url()}`); });
page.on('console', (m) => {
  const t = m.type();
  if (t === 'error') { if (!/Failed to load resource/.test(m.text())) consoleErrors.push(m.text().slice(0, 1500)); }
  else if (t === 'warning') consoleWarnings.push(m.text().slice(0, 500));
});
page.on('pageerror', (e) => pageErrors.push(String(e?.stack || e).slice(0, 1500)));
page.on('requestfailed', (r) => consoleWarnings.push(`requestfailed: ${r.url()} ${r.failure()?.errorText || ''}`));

let result = { url, showcase, time, camera, seed, width: W, height: H, quality, gpu: GL, ok: false };
try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
  await page.waitForFunction(() => window.__sim && window.__sim.ready === true, null, { timeout, polling: 100 });
  // settle: let LOD/shadows update
  await page.waitForTimeout(400);
  // A concurrent save makes Vite full-reload the page; re-wait once so we never capture the boot overlay.
  const stillReady = async () => page.evaluate(() => window.__sim?.ready === true && !!document.getElementById('boot')?.classList.contains('hidden')).catch(() => false);
  if (!(await stillReady())) {
    await page.waitForFunction(() => window.__sim && window.__sim.ready === true, null, { timeout, polling: 100 });
    await page.waitForTimeout(600);
  }
  // fps measurement: count frames over `measure` seconds
  const perf = await page.evaluate(async (secs) => {
    const s = window.__sim;
    const f0 = s.engine.stats.frames; const t0 = performance.now();
    // software GL can take >1 s per frame: wait for the window OR at least 3 frames (max 12 s)
    while (true) {
      await new Promise((r) => setTimeout(r, 100));
      const el = performance.now() - t0, fr = s.engine.stats.frames - f0;
      if ((el >= secs * 1000 && fr >= 3) || el > 12000) break;
    }
    const frames = s.engine.stats.frames - f0; const ms = performance.now() - t0;
    const st = s.stats();
    return { fps: +(frames / (ms / 1000)).toFixed(1), measuredFrames: frames, ...st };
  }, measure);
  const gl = await page.evaluate(() => {
    const gl = window.__sim.engine.renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });
  if (!(await stillReady())) {
    await page.waitForFunction(() => window.__sim && window.__sim.ready === true, null, { timeout, polling: 100 });
    await page.waitForTimeout(600);
  }
  await page.screenshot({ path: out, type: 'png', timeout: Math.max(timeout, 180000) });
  if (args.crops) {
    // Named landmark rects for pinned measurements (see src/core/debug.js cropRects).
    const crops = await page.evaluate(() => (window.__sim?.cropRects ? window.__sim.cropRects() : {})).catch(() => ({}));
    fs.writeFileSync(out.replace(/\.png$/, '.crops.json'), JSON.stringify({ png: out, width: W, height: H, camera, time, rects: crops }, null, 2));
    result.crops = Object.keys(crops).length;
  }
  const errors = [...new Set([...(perf.errors || []), ...consoleErrors, ...pageErrors])];
  const simErrors = await page.evaluate(() => window.__sim.errors.slice());
  const simWarnings = await page.evaluate(() => window.__sim.warnings.slice());
  result = {
    ...result, ok: true, gpuRenderer: gl, elapsedMs: Date.now() - t0,
    fps: perf.fps, measuredFrames: perf.measuredFrames, frameMs: perf.frameMs, drawCalls: perf.drawCalls, triangles: perf.triangles,
    programs: perf.programs, textures: perf.textures, geometries: perf.geometries, heapMB: perf.heapMB, moduleMs: perf.moduleMs,
    hour: perf.hour, cameraState: perf.camera, modules: perf.modules,
    errors: [...new Set([...simErrors, ...errors])], warnings: [...new Set([...simWarnings, ...consoleWarnings])].slice(0, 50),
    png: out,
  };
} catch (e) {
  result.error = String(e?.message || e);
  result.errors = [...new Set([...consoleErrors, ...pageErrors])];
  result.warnings = consoleWarnings.slice(0, 50);
  try { await page.screenshot({ path: out, type: 'png', timeout: 60000 }); result.png = out; } catch {}
} finally {
  await browser.close();
}
const jsonPath = out.replace(/\.png$/, '.json');
fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
const errs = result.errors?.length || 0;
console.log(`${result.ok ? 'OK ' : 'FAIL'} ${out}  fps=${result.fps ?? '-'} draws=${result.drawCalls ?? '-'} tris=${result.triangles ?? '-'} errors=${errs}${result.error ? '  ' + result.error : ''}`);
if (errs) for (const e of result.errors.slice(0, 8)) console.log('  ERR ' + e.split('\n')[0]);
process.exit(result.ok ? 0 : 1);

function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true'; o[k] = v; }
  }
  return o;
}
