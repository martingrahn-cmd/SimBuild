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
    /** Project a world point to pixel coordinates in the current framebuffer. */
    project(x, y, z) {
      const v = new (core.camera.camera.position.constructor)(x, y, z);
      v.project(core.camera.camera);
      return [Math.round((v.x * 0.5 + 0.5) * core.engine.width), Math.round((-v.y * 0.5 + 0.5) * core.engine.height), v.z];
    },
    /**
     * Named pixel rects that critics measure inside, collected from every ready module that exposes
     * `api.cropRects({ project, width, height, camera })`. A module returns { name: [x, y, w, h] } in pixels.
     * This is what tools/screenshot.mjs --crops writes to <out>.crops.json, so a measurement can be pinned to a
     * landmark instead of to hand-guessed coordinates that break when a camera preset moves.
     */
    cropRects() {
      const out = {};
      const ctxArg = { project: (x, y, z) => sim.project(x, y, z), width: core.engine.width, height: core.engine.height, camera: core.camera };
      for (const [name, rec] of registry.modules) {
        if (rec.status !== 'ready' || typeof rec.api?.cropRects !== 'function') continue;
        try {
          const r = rec.api.cropRects(ctxArg);
          if (r && typeof r === 'object') for (const [k, v] of Object.entries(r)) out[`${name}.${k}`] = v;
        } catch (e) { console.warn(`[debug] ${name}.cropRects failed: ${e?.message}`); }
      }
      return out;
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
