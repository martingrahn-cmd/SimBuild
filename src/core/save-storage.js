// Slot persistence. A transaction owns both payload and metadata; request success is not a commit.
const PREFIX = 'simbuild.save.';
export function createSlotStorage(onFailure = () => {}) {
  const cache = new Map(), legacy = new Map();
  let db = null, unavailable = null;
  const metadata = (slot, data) => ({ slot, savedAt: data?.savedAt, day: data?.time?.day });
  const envelope = raw => { const d = JSON.parse(raw); if (d?.version !== 1 || !d.modules || typeof d.modules !== 'object' || Array.isArray(d.modules)) throw Error('unsupported or invalid save'); return d; };
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i); if (!key?.startsWith(PREFIX)) continue;
      const slot = key.slice(PREFIX.length), raw = localStorage.getItem(key);
      legacy.set(slot, raw);
      try { cache.set(slot, metadata(slot, JSON.parse(raw))); } catch { cache.set(slot, { slot }); }
    }
  } catch (e) { onFailure('storage', null, e); }
  const open = () => new Promise((resolve, reject) => {
    let finished = false;
    const request = indexedDB.open('simbuild-saves', 1);
    request.onupgradeneeded = () => { const d = request.result; for (const name of ['slots', 'metadata']) if (!d.objectStoreNames.contains(name)) d.createObjectStore(name, { keyPath: 'slot' }); };
    request.onerror = () => { finished = true; reject(request.error); };
    request.onblocked = () => { finished = true; reject(Error('Save storage upgrade blocked by another open game. Close it and reload.')); };
    request.onsuccess = () => { if (finished) { request.result.close(); return; } resolve(request.result); };
  });
  function transaction(mode, operation) {
    return new Promise((resolve, reject) => {
      let result, failure;
      const tx = db.transaction(['slots', 'metadata'], mode);
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(failure || tx.error || Error('Save storage transaction aborted'));
      tx.onerror = () => { failure = tx.error; };
      try { operation(tx, value => { result = value; }); } catch (e) { failure = e; tx.abort(); }
    });
  }
  const put = (slot, raw, info) => transaction('readwrite', tx => { tx.objectStore('slots').put({ slot, raw }); tx.objectStore('metadata').put(info); });
  // Recheck the authoritative payload in the same transaction that would insert legacy data.
  // A concurrent tab may have saved or deleted this slot since the initial metadata scan.
  const migrate = (slot, raw, info) => transaction('readwrite', (tx, result) => {
    const slots = tx.objectStore('slots'), request = slots.get(slot);
    request.onsuccess = () => {
      try {
        const winner = request.result;
        if (winner) {
          result(winner.deleted ? { slot, deleted: true } : metadata(slot, envelope(winner.raw)));
        } else {
          slots.put({ slot, raw }); tx.objectStore('metadata').put(info); result(info);
        }
      } catch { tx.abort(); }
    };
  });
  function forgetLegacy(slot, raw) {
    try { if (localStorage.getItem(PREFIX + slot) === raw) localStorage.removeItem(PREFIX + slot); legacy.delete(slot); } catch { /* Committed IndexedDB entry remains authoritative. */ }
  }
  const ready = (async () => {
    try {
      db = await open();
      db.onversionchange = () => { db.close(); db = null; unavailable = Error('Save storage changed in another game. Reload before saving.'); };
      const stored = await transaction('readonly', (tx, result) => { const r = tx.objectStore('metadata').getAll(); r.onsuccess = () => result(r.result); });
      const existing = new Set(stored.map(s => s.slot)); for (const info of stored) { if (info.deleted) cache.delete(info.slot); else cache.set(info.slot, info); }
      for (const [slot, raw] of legacy) {
        if (existing.has(slot)) continue;
        try { const info = await migrate(slot, raw, metadata(slot, envelope(raw))); if (info.deleted) cache.delete(slot); else cache.set(slot, info); forgetLegacy(slot, raw); }
        catch (e) { onFailure('migration', slot, e); }
      }
      return true;
    } catch (e) { unavailable = e; onFailure('storage', null, e); return false; }
  })();
  return {
    ready,
    slots: () => [...cache.values()].map(s => ({ ...s })),
    async write(slot, raw, data) {
      await ready; if (!db) throw unavailable || Error('Save storage unavailable');
      const info = metadata(slot, data); await put(slot, raw, info); cache.set(slot, info);
      if (legacy.has(slot)) forgetLegacy(slot, legacy.get(slot));
    },
    async read(slot) {
      await ready;
      if (db) { const entry = await transaction('readonly', (tx, result) => { const r = tx.objectStore('slots').get(slot); r.onsuccess = () => result(r.result); }); if (entry?.deleted) throw Error('Save slot not found'); if (entry) return entry.raw; }
      const raw = localStorage.getItem(PREFIX + slot); if (raw !== null) return raw;
      if (!db && unavailable) throw unavailable;
      throw Error('Save slot not found');
    },
    async remove(slot) {
      await ready;
      if (!db) throw unavailable || Error('Save storage unavailable');
      // Commit a tombstone before touching legacy storage. A failed transaction preserves both
      // copies; a failed localStorage removal cannot resurrect a successfully deleted save.
      await transaction('readwrite', tx => { tx.objectStore('slots').put({ slot, deleted: true }); tx.objectStore('metadata').put({ slot, deleted: true }); });
      try { localStorage.removeItem(PREFIX + slot); } catch { /* Tombstone remains authoritative. */ }
      legacy.delete(slot); cache.delete(slot);
    },
  };
}
