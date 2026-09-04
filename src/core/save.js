// Save/load: collects api.serialize() from every ready module; localStorage slots + JSON download/upload.
const KEY = (slot) => `simbuild.save.${slot}`;
export const SAVE_VERSION = 1;

export function createSaveSystem(core, registry) {
  const { world, clock, events } = core;
  function collect() {
    const modules = {};
    for (const [name, rec] of registry.modules) {
      if (rec.status !== 'ready' || typeof rec.api?.serialize !== 'function') continue;
      try { modules[name] = rec.api.serialize(); } catch (e) { rec.ctx?.log.error(`serialize failed: ${e?.message}`, e); }
    }
    return { version: SAVE_VERSION, seed: world.seed, savedAt: Date.now(), time: { ...world.time }, camera: { target: core.camera.target.toArray(), yaw: core.camera.yaw, pitch: core.camera.pitch, distance: core.camera.distance }, modules };
  }
  async function restore(data) {
    if (!data || data.version !== SAVE_VERSION) throw new Error('unsupported save');
    clock.set(data.time?.hour ?? 12); world.time.day = data.time?.day ?? 1;
    // dependency order: same as registry init order
    const order = registry.order([...registry.modules.keys()]);
    for (const name of order) {
      const rec = registry.modules.get(name);
      if (rec?.status !== 'ready' || typeof rec.api?.deserialize !== 'function' || !(name in data.modules)) continue;
      try { await rec.api.deserialize(data.modules[name]); } catch (e) { rec.ctx?.log.error(`deserialize failed: ${e?.message}`, e); }
    }
    if (data.camera) core.camera.apply({ target: data.camera.target, yaw: data.camera.yaw, pitch: data.camera.pitch, distance: data.camera.distance });
    events.emit('save:loaded', { savedAt: data.savedAt });
  }
  const api = {
    serialize: collect,
    save(slot = 'auto') {
      const data = collect();
      try { localStorage.setItem(KEY(slot), JSON.stringify(data)); } catch (e) { console.warn('[save] localStorage failed', e); return null; }
      events.emit('save:saved', { slot, savedAt: data.savedAt });
      return data;
    },
    async load(slot = 'auto') {
      let raw = null; try { raw = localStorage.getItem(KEY(slot)); } catch {}
      if (!raw) return false;
      await restore(JSON.parse(raw)); return true;
    },
    restore,
    slots() {
      const out = [];
      try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('simbuild.save.')) { const d = JSON.parse(localStorage.getItem(k)); out.push({ slot: k.slice(14), savedAt: d.savedAt, day: d.time?.day }); } } } catch {}
      return out;
    },
    remove(slot) { try { localStorage.removeItem(KEY(slot)); } catch {} },
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
