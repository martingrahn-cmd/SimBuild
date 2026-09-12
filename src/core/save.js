// Save/load: committed IndexedDB slots, legacy localStorage import, JSON download/upload.
import { createSlotStorage } from './save-storage.js';
export const SAVE_VERSION = 1;

export function createSaveSystem(core, registry) {
  const { world, clock, events } = core;
  const storage = createSlotStorage((action, slot, e) => events.emit('save:failed', { action, slot, error: e?.message || String(e) }));
  function collect() {
    const modules = {};
    for (const [name, rec] of registry.modules) {
      if (rec.status !== 'ready' || typeof rec.api?.serialize !== 'function') continue;
      try { modules[name] = rec.api.serialize(); } catch (e) { rec.ctx?.log.error(`serialize failed: ${e?.message}`, e); }
    }
    return { version: SAVE_VERSION, seed: world.seed, savedAt: Date.now(), time: { ...world.time }, camera: { target: core.camera.target.toArray(), yaw: core.camera.yaw, pitch: core.camera.pitch, distance: core.camera.distance }, modules };
  }
  function rollbackSnapshot(data) {
    const snapshot = collect(), missing = [];
    for (const [name, rec] of registry.modules) {
      if (rec.status !== 'ready' || typeof rec.api?.deserialize !== 'function' || !(name in data.modules)) continue;
      if (!Object.hasOwn(snapshot.modules, name)) missing.push(name);
    }
    if (missing.length) throw new Error(`Cannot safely restore: rollback snapshot missing ${missing.join(', ')}`);
    // Detach the rollback state from module-owned arrays/maps before any owner mutates them.
    return typeof structuredClone === 'function' ? structuredClone(snapshot) : JSON.parse(JSON.stringify(snapshot));
  }
  async function apply(data, options = {}) {
    clock.set(data.time?.hour ?? 12); world.time.day = data.time?.day ?? 1;
    const restoredModules = {};
    const order = registry.order([...registry.modules.keys()]);
    for (const name of order) {
      const rec = registry.modules.get(name);
      if (rec?.status !== 'ready' || typeof rec.api?.deserialize !== 'function' || !(name in data.modules)) continue;
      try {
        const restored = await rec.api.deserialize(data.modules[name], options);
        if (restored === false) { const e = new Error(`${name} rejected saved data`); e.restoreModule = name; throw e; }
        restoredModules[name] = data.modules[name];
      } catch (e) {
        if (!e.restoreModule) e.restoreModule = name;
        rec.ctx?.log.error(`deserialize failed: ${e?.message}`, e);
        throw e;
      }
    }
    // Older saves have no democity payload. After a real world owner restored, clear only outgoing demo landmarks.
    if (!Object.hasOwn(data.modules, 'democity') && (Object.hasOwn(restoredModules, 'roads') || Object.hasOwn(restoredModules, 'buildings'))) {
      const demo = registry.modules.get('democity');
      if (demo?.status === 'ready' && typeof demo.api?.deserialize === 'function') {
        const emptyDemo = { module: 'democity', version: 1, staged: false, plan: null };
        try {
          if (await demo.api.deserialize(emptyDemo) === false) { const e = new Error('democity rejected legacy clear'); e.restoreModule = 'democity'; throw e; }
          restoredModules.democity = emptyDemo;
        } catch (e) { if (!e.restoreModule) e.restoreModule = 'democity'; throw e; }
      }
    }
    if (data.camera) core.camera.apply({ target: data.camera.target, yaw: data.camera.yaw, pitch: data.camera.pitch, distance: data.camera.distance });
    return restoredModules;
  }
  async function restore(data) {
    if (!data || data.version !== SAVE_VERSION || !data.modules || typeof data.modules !== 'object' || Array.isArray(data.modules)) throw new Error('unsupported or invalid save');
    // Freeze every target owner before the first mutation. A rejecting owner triggers a full owner rollback.
    const previous = rollbackSnapshot(data);
    events.emit('save:restoring');
    try {
      let restoredModules;
      try {
        restoredModules = await apply(data);
      } catch (failure) {
        try {
          await apply(previous, { rollback: true });
          events.emit('save:rolled-back', { module: failure.restoreModule || null, error: failure?.message || String(failure) });
        } catch (rollbackFailure) {
          const e = new Error(`City restore failed in ${failure.restoreModule || 'an owner'} and rollback failed in ${rollbackFailure.restoreModule || 'an owner'}. Reload a known good save.`);
          e.cause = rollbackFailure;
          throw e;
        }
        throw new Error(`City restore rejected by ${failure.restoreModule || 'an owner'}. Previous city restored.`);
      }
      events.emit('save:loaded', { savedAt: data.savedAt, modules: restoredModules });
    } finally { events.emit('save:restore-finished'); }
  }
  const api = {
    serialize: collect,
    ready: storage.ready,
    async save(slot = 'auto') {
      try {
        const data = collect(), raw = JSON.stringify(data);
        await storage.write(slot, raw, data);
        events.emit('save:saved', { slot, savedAt: data.savedAt });
        return data;
      } catch (e) { events.emit('save:failed', { action: 'save', slot, error: e?.message || String(e) }); return null; }
    },
    async load(slot = 'auto') {
      try {
        const raw = await storage.read(slot);
        if (!raw) throw new Error('Save slot not found');
        await restore(JSON.parse(raw));
        return true;
      } catch (e) {
        events.emit('save:failed', { action: 'load', slot, error: e?.message || String(e) });
        return false;
      }
    },
    restore,
    slots: storage.slots,
    async remove(slot) {
      try { await storage.remove(slot); events.emit('save:removed', { slot }); return true; }
      catch (e) { events.emit('save:failed', { action: 'delete', slot, error: e?.message || String(e) }); return false; }
    },
    download(name = 'city.json') {
      const blob = new Blob([JSON.stringify(collect())], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },
    async upload(file) { const text = await file.text(); await restore(JSON.parse(text)); },
    autosave: true,
  };
  events.on('time:day', () => { if (api.autosave && !core.headless) api.save('auto'); });
  events.on('ui:action', (a) => {
    if (a?.action === 'save') api.save(a.args?.[0] || 'slot1');
    else if (a?.action === 'load') api.load(a.args?.[0] || 'slot1');
    else if (a?.action === 'download') api.download();
  });
  return api;
}
