import * as THREE from 'three';

// Module registry with fault isolation and dependency-ordered init.
export class Registry {
  constructor(core) {
    this.core = core; // {world, events, clock, camera, engine, assets, rng, quality, headless}
    this.modules = new Map(); // name -> record {def, status, api, group, ctx, errors, consecutiveFails, ms}
    this.apis = {};
  }
  register(def) {
    if (!def || !def.name) throw new Error('module must have a name');
    const group = new THREE.Group();
    group.name = `module:${def.name}`;
    this.modules.set(def.name, { def, status: 'registered', api: def.api || {}, group, ctx: null, errors: [], consecutiveFails: 0, ms: 0, initMs: 0 });
    this.apis[def.name] = def.api || {};
  }
  order(names) {
    // topological by dependencies, stable otherwise
    const out = [], seen = new Set(), visiting = new Set();
    const visit = (n) => {
      if (seen.has(n) || !this.modules.has(n)) return;
      if (visiting.has(n)) return; // cycle: ignore
      visiting.add(n);
      for (const d of this.modules.get(n).def.dependencies || []) if (names.includes(d)) visit(d);
      visiting.delete(n); seen.add(n); out.push(n);
    };
    for (const n of names) visit(n);
    return out;
  }
  makeCtx(rec) {
    const c = this.core;
    const name = rec.def.name;
    const log = makeLog(name, rec, c.events);
    return {
      world: c.world, events: c.events, clock: c.clock, camera: c.camera, scene: c.engine.scene, group: rec.group,
      renderer: c.engine.renderer, engine: c.engine, assets: c.assets, rng: c.rng.fork(name), modules: this.apis,
      log, quality: c.quality, headless: c.headless, registry: this,
    };
  }
  async initAll(names) {
    const ordered = this.order(names);
    for (const n of ordered) await this.initOne(n);
    return ordered;
  }
  async initOne(name) {
    const rec = this.modules.get(name);
    if (!rec || rec.status === 'ready' || rec.status === 'failed') return;
    const ctx = this.makeCtx(rec);
    rec.ctx = ctx;
    for (const d of rec.def.dependencies || []) {
      const dr = this.modules.get(d);
      if (!dr || dr.status !== 'ready') ctx.log.warn(`dependency "${d}" not ready (status: ${dr?.status || 'missing'})`);
    }
    this.core.engine.scene.add(rec.group);
    const t0 = performance.now();
    try {
      rec.status = 'initializing';
      await withTimeout(rec.def.init?.(ctx), 30000, `${name}.init timed out`);
      rec.status = 'ready';
      rec.initMs = performance.now() - t0;
      this.core.events.emit('module:ready', { module: name, ms: rec.initMs });
    } catch (e) {
      rec.status = 'failed';
      ctx.log.error(`init failed: ${e?.message || e}`, e);
      this.core.events.emit('module:error', { module: name, phase: 'init', error: e });
      this.core.events.offOwner(name);
    }
  }
  update(dt) {
    for (const rec of this.modules.values()) {
      if (rec.status !== 'ready' || !rec.def.update) continue;
      const t0 = performance.now();
      try {
        rec.def.update(dt, rec.ctx);
        rec.consecutiveFails = 0;
      } catch (e) {
        rec.consecutiveFails++;
        rec.ctx.log.error(`update failed (${rec.consecutiveFails}): ${e?.message || e}`, e);
        this.core.events.emit('module:error', { module: rec.def.name, phase: 'update', error: e });
        if (rec.consecutiveFails >= 3) { rec.status = 'degraded'; rec.ctx.log.error('update disabled after 3 consecutive failures'); }
      }
      rec.ms = performance.now() - t0;
      this.core.engine.stats.moduleMs[rec.def.name] = rec.ms;
    }
  }
  dispose(name) {
    const rec = this.modules.get(name);
    if (!rec) return;
    try { rec.def.dispose?.(rec.ctx); } catch (e) { console.error(e); }
    this.core.events.offOwner(name);
    this.core.engine.scene.remove(rec.group);
    rec.status = 'disposed';
  }
  status() {
    const o = {};
    for (const [n, r] of this.modules) o[n] = { status: r.status, errors: r.errors.length, ms: +r.ms.toFixed(2), initMs: Math.round(r.initMs) };
    return o;
  }
  get(name) { return this.modules.get(name); }
}

function withTimeout(p, ms, msg) {
  if (!p || typeof p.then !== 'function') return Promise.resolve(p);
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(msg)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

function makeLog(name, rec, events) {
  const tag = `[${name}]`;
  return {
    info: (...a) => console.info(tag, ...a),
    warn: (...a) => console.warn(tag, ...a),
    error: (msg, err) => { rec.errors.push({ msg: String(msg), stack: err?.stack }); console.error(tag, msg, err || ''); },
    debug: (...a) => { if (window.__sim?.verbose) console.debug(tag, ...a); },
  };
}
