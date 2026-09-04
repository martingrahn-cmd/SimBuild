// window.__sim: the contract with tools/screenshot.mjs.
export function installDebug(core, registry) {
  const errors = [];
  const warnings = [];
  const origError = console.error.bind(console);
  const origWarn = console.warn.bind(console);
  const fmt = (a) => a.map((x) => (x instanceof Error ? `${x.message}\n${x.stack}` : typeof x === 'object' ? safeJson(x) : String(x))).join(' ');
  console.error = (...a) => { errors.push(fmt(a).slice(0, 2000)); origError(...a); };
  console.warn = (...a) => { warnings.push(fmt(a).slice(0, 500)); origWarn(...a); };
  window.addEventListener('error', (e) => errors.push(`uncaught: ${e.message} @${e.filename}:${e.lineno}`));
  window.addEventListener('unhandledrejection', (e) => errors.push(`unhandledrejection: ${e.reason?.message || e.reason}`));

  const sim = {
    ready: false,
    readyAt: null,
    verbose: false,
    errors, warnings,
    world: core.world, events: core.events, clock: core.clock, camera: core.camera, engine: core.engine, registry,
    stats() {
      const s = core.engine.stats;
      return {
        fps: +s.fps.toFixed(1), frameMs: +s.frameMs.toFixed(2), drawCalls: s.drawCalls, triangles: s.triangles,
        programs: s.programs, textures: s.textures, geometries: s.geometries, frames: s.frames, moduleMs: { ...s.moduleMs },
        heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null,
        hour: core.world.time.hour, modules: registry.status(),
        camera: { position: core.camera.camera.position.toArray().map((v) => +v.toFixed(1)), target: core.camera.target.toArray().map((v) => +v.toFixed(1)), distance: +core.camera.distance.toFixed(1) },
      };
    },
    setTime(h) { core.clock.set(h); },
    setCamera(p) { return core.camera.apply(p); },
    setSpeed(n) { core.clock.setSpeed(n); },
    modulesStatus() { return registry.status(); },
  };
  window.__sim = sim;
  return sim;
}
function safeJson(o) { try { return JSON.stringify(o); } catch { return String(o); } }
