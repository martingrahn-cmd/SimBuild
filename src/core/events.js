// Error-isolated event bus. A throwing listener never breaks the emitter or other listeners.
export class EventBus {
  constructor(onError) {
    this._map = new Map();
    this._onError = onError || ((e, name) => console.error(`[events:${name}]`, e));
  }
  on(name, fn, owner = null) {
    if (!this._map.has(name)) this._map.set(name, []);
    const entry = { fn, owner, once: false };
    this._map.get(name).push(entry);
    return () => this.off(name, fn);
  }
  once(name, fn, owner = null) {
    if (!this._map.has(name)) this._map.set(name, []);
    this._map.get(name).push({ fn, owner, once: true });
    return () => this.off(name, fn);
  }
  off(name, fn) {
    const list = this._map.get(name);
    if (!list) return;
    const i = list.findIndex((e) => e.fn === fn);
    if (i >= 0) list.splice(i, 1);
  }
  /** Remove every listener registered with the given owner (module dispose). */
  offOwner(owner) {
    for (const list of this._map.values()) {
      for (let i = list.length - 1; i >= 0; i--) if (list[i].owner === owner) list.splice(i, 1);
    }
  }
  emit(name, payload = {}) {
    const list = this._map.get(name);
    const wild = this._map.get('*');
    if (list) {
      for (const e of [...list]) {
        try { e.fn(payload, name); } catch (err) { this._onError(err, name, e.owner); }
        if (e.once) this.off(name, e.fn);
      }
    }
    if (wild) {
      for (const e of [...wild]) {
        try { e.fn(payload, name); } catch (err) { this._onError(err, name, e.owner); }
      }
    }
  }
  listenerCount(name) { return (this._map.get(name) || []).length; }
}
