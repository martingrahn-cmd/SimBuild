import * as THREE from 'three';
import { createWorld } from './core/world.js';
import { EventBus } from './core/events.js';
import { Clock } from './core/clock.js';
import { CityCamera } from './core/camera.js';
import { Engine } from './core/engine.js';
import { Assets } from './core/assets.js';
import { RNG } from './core/rng.js';
import { Registry } from './core/registry.js';
import { parseParams, selectModules } from './core/showcase.js';
import { installDebug } from './core/debug.js';
import { MODULE_NAMES } from './core/constants.js';

const bootMsg = (m) => { const el = document.getElementById('bootmsg'); if (el) el.textContent = m; };

async function loadModuleDefs() {
  // Each module is imported in isolation: a syntax/import error in one never blocks the others.
  const loaders = import.meta.glob('./modules/*/index.js');
  const defs = [];
  for (const name of MODULE_NAMES) {
    const key = `./modules/${name}/index.js`;
    const loader = loaders[key];
    if (!loader) { console.warn(`[main] module ${name} has no index.js`); continue; }
    try {
      const m = await loader();
      const def = m.default;
      if (!def || def.name !== name) { console.error(`[main] module ${name}: default export must be a Module with name "${name}"`); continue; }
      defs.push(def);
    } catch (e) {
      console.error(`[main] module ${name} failed to import:`, e);
    }
  }
  return defs;
}

async function boot() {
  const params = parseParams();
  const canvas = document.getElementById('c');
  const world = createWorld(params.seed);
  world.flags.showcase = params.showcase;
  world.flags.headless = params.headless;
  world.flags.weather = params.weather;
  const events = new EventBus((err, name, owner) => console.error(`[events:${name}]${owner ? ` (${owner})` : ''}`, err));
  const engine = new Engine(canvas, { quality: params.quality, headless: params.headless });
  const clock = new Clock(world, events);
  const camera = new CityCamera(world, events, canvas);
  const assets = new Assets(engine.renderer, { warn: (...a) => console.warn('[assets]', ...a) });
  const rng = new RNG(params.seed, 'root');
  const core = { world, events, clock, camera, engine, assets, rng, quality: params.quality, headless: params.headless, params };
  const registry = new Registry(core);
  const sim = installDebug(core, registry);
  sim.verbose = params.verbose;
  sim.params = params;

  const resize = () => {
    const w = window.innerWidth, h = window.innerHeight;
    engine.setSize(w, h); camera.setViewport(w, h);
  };
  window.addEventListener('resize', resize); resize();

  bootMsg('LOADING ASSET MANIFEST');
  await assets.loadManifest();

  bootMsg('LOADING MODULES');
  const defs = await loadModuleDefs();
  for (const d of defs) registry.register(d);
  const wanted = params.modules || selectModules(params.showcase, defs);
  sim.wanted = wanted;

  if (params.time !== null) clock.set(params.time);
  if (params.speed !== null) clock.setSpeed(params.speed); else if (params.time !== null) clock.setSpeed(0);

  bootMsg('INITIALISING ' + wanted.join(', '));
  await registry.initAll(wanted);

  // showcase staging
  const showcaseName = params.showcase && params.showcase !== 'all' ? params.showcase : 'democity';
  const rec = registry.get(showcaseName);
  if (rec && rec.status === 'ready' && rec.def.showcase?.setup) {
    bootMsg('STAGING ' + showcaseName);
    if (rec.def.showcase.cameras) for (const [k, v] of Object.entries(rec.def.showcase.cameras)) camera.registerPreset(k, v);
    try { await rec.def.showcase.setup(rec.ctx); }
    catch (e) { rec.ctx.log.error(`showcase.setup failed: ${e?.message}`, e); events.emit('module:error', { module: showcaseName, phase: 'showcase', error: e }); }
  } else if (params.showcase) {
    console.error(`[main] showcase "${params.showcase}" unavailable (status: ${rec?.status || 'missing'})`);
  }

  if (params.camera) { if (!camera.apply(params.camera)) console.warn(`[main] unknown camera preset ${params.camera}`); }
  if (params.time !== null) clock.set(params.time); // re-apply after modules may have touched it

  bootMsg('LOADING ASSETS');
  const settled = await assets.settle(20000);
  if (!settled) console.error('[main] asset loading timed out after 20 s; pending=' + assets.pending);

  events.emit('app:ready', {});
  document.getElementById('boot')?.classList.add('hidden');

  // frame loop
  let last = performance.now();
  let readyFrames = 0;
  const banner = document.getElementById('errbanner');
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000; last = now;
    if (dt > 0.1) dt = 0.1;
    if (dt <= 0) dt = 1 / 60;
    const t0 = performance.now();
    clock.advance(dt);
    camera.update(dt);
    registry.update(dt);
    engine.stats.updateMs = performance.now() - t0;
    engine.render(camera.camera, dt);
    if (!sim.ready) { readyFrames++; if (readyFrames >= 5) { sim.ready = true; sim.readyAt = performance.now(); } }
    if (banner && !params.headless && sim.errors.length && engine.stats.frames % 30 === 0) {
      banner.style.display = 'block';
      banner.textContent = `${sim.errors.length} error(s) — ` + sim.errors[sim.errors.length - 1].split('\n')[0];
    }
  }
  requestAnimationFrame(frame);
}

boot().catch((e) => {
  console.error('[main] boot failed', e);
  bootMsg('BOOT FAILED: ' + (e?.message || e));
  window.__sim = window.__sim || { ready: false, errors: [String(e?.stack || e)], stats: () => ({}) };
  window.__sim.ready = true; // let the tool capture the failure
});
