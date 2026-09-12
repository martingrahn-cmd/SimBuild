const FORMAT = 'simbuild-slots';
const VERSION = 1;
const OWNER_KEY = 'simbuild.cloud.owner';

const timestamp = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const validCity = data => !!data && data.version === 1 && data.modules && typeof data.modules === 'object' && !Array.isArray(data.modules);

export function normalizeCloudBundle(value) {
  const out = { format: FORMAT, version: VERSION, slots: {}, tombstones: {} };
  if (!value || value.format !== FORMAT || value.version !== VERSION) return out;
  for (const [slot, entry] of Object.entries(value.slots || {})) {
    if (!entry || !validCity(entry.data)) continue;
    const savedAt = timestamp(entry.savedAt || entry.data.savedAt);
    if (savedAt > 0) out.slots[slot] = { savedAt, data: entry.data };
  }
  for (const [slot, deletedAt] of Object.entries(value.tombstones || {})) {
    const time = timestamp(deletedAt); if (time > 0) out.tombstones[slot] = time;
  }
  return out;
}

export function recordsToCloudBundle(records = []) {
  const out = normalizeCloudBundle({ format: FORMAT, version: VERSION });
  for (const record of records) {
    if (!record?.slot) continue;
    if (record.deleted) {
      const deletedAt = timestamp(record.deletedAt); if (deletedAt > 0) out.tombstones[record.slot] = deletedAt;
    } else if (validCity(record.data)) {
      const savedAt = timestamp(record.data.savedAt); if (savedAt > 0) out.slots[record.slot] = { savedAt, data: record.data };
    }
  }
  return out;
}

export function mergeCloudBundles(a, b) {
  const left = normalizeCloudBundle(a), right = normalizeCloudBundle(b);
  const out = normalizeCloudBundle({ format: FORMAT, version: VERSION });
  const names = new Set([...Object.keys(left.slots), ...Object.keys(right.slots), ...Object.keys(left.tombstones), ...Object.keys(right.tombstones)]);
  for (const slot of names) {
    const candidates = [
      left.slots[slot] && { kind: 'save', time: left.slots[slot].savedAt, entry: left.slots[slot], tie: JSON.stringify(left.slots[slot].data) },
      right.slots[slot] && { kind: 'save', time: right.slots[slot].savedAt, entry: right.slots[slot], tie: JSON.stringify(right.slots[slot].data) },
      left.tombstones[slot] && { kind: 'delete', time: left.tombstones[slot] },
      right.tombstones[slot] && { kind: 'delete', time: right.tombstones[slot] },
    ].filter(Boolean).sort((x, y) => y.time - x.time || (y.kind === 'delete' ? 1 : 0) - (x.kind === 'delete' ? 1 : 0) || String(y.tie || '').localeCompare(String(x.tie || '')));
    const winner = candidates[0];
    if (!winner) continue;
    if (winner.kind === 'delete') out.tombstones[slot] = winner.time;
    else out.slots[slot] = winner.entry;
  }
  return out;
}

export function cloudBundleToRecords(value) {
  const bundle = normalizeCloudBundle(value), records = [];
  for (const [slot, entry] of Object.entries(bundle.slots)) records.push({ slot, data: entry.data });
  for (const [slot, deletedAt] of Object.entries(bundle.tombstones)) records.push({ slot, deleted: true, deletedAt });
  return records;
}

export function cloudBundleSignature(value) {
  const bundle = normalizeCloudBundle(value), ordered = { format: FORMAT, version: VERSION, slots: {}, tombstones: {} };
  for (const slot of Object.keys(bundle.slots).sort()) ordered.slots[slot] = bundle.slots[slot];
  for (const slot of Object.keys(bundle.tombstones).sort()) ordered.tombstones[slot] = bundle.tombstones[slot];
  return JSON.stringify(ordered);
}

function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value), bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function encodeCloudBundle(value) {
  const bundle = normalizeCloudBundle(value);
  const out = { format: FORMAT, version: VERSION, updatedAt: Date.now(), slots: {}, tombstones: { ...bundle.tombstones } };
  for (const [slot, entry] of Object.entries(bundle.slots)) {
    if (typeof CompressionStream !== 'function') { out.slots[slot] = entry; continue; }
    const stream = new Blob([JSON.stringify(entry.data)]).stream().pipeThrough(new CompressionStream('gzip'));
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    out.slots[slot] = { savedAt: entry.savedAt, encoding: 'gzip-base64', payload: bytesToBase64(bytes) };
  }
  return out;
}

export async function decodeCloudBundle(value) {
  if (!value || value.format !== FORMAT || value.version !== VERSION) return normalizeCloudBundle(null);
  const expanded = { format: FORMAT, version: VERSION, slots: {}, tombstones: value.tombstones || {} };
  for (const [slot, entry] of Object.entries(value.slots || {})) {
    if (validCity(entry?.data)) { expanded.slots[slot] = entry; continue; }
    if (entry?.encoding !== 'gzip-base64' || typeof entry.payload !== 'string' || typeof DecompressionStream !== 'function') continue;
    try {
      const stream = new Blob([base64ToBytes(entry.payload)]).stream().pipeThrough(new DecompressionStream('gzip'));
      const data = JSON.parse(await new Response(stream).text());
      if (validCity(data)) expanded.slots[slot] = { savedAt: timestamp(entry.savedAt || data.savedAt), data };
    } catch { /* A corrupt remote slot is ignored; valid local data can repair it on the next sync. */ }
  }
  return normalizeCloudBundle(expanded);
}

function gameVoltHost() {
  return location.hostname === 'gamevolt.io' || location.hostname.endsWith('.gamevolt.io');
}

function loadGameVolt() {
  const hosted = gameVoltHost();
  if (!hosted) return Promise.resolve(window.GameVolt || null);
  if (!document.getElementById('simbuild-gamevolt-style')) {
    const style = document.createElement('style');
    style.id = 'simbuild-gamevolt-style';
    style.textContent = '#gv-user-widget{top:52px!important;right:10px!important}';
    document.head.appendChild(style);
  }
  if (window.GameVolt) return Promise.resolve(window.GameVolt);
  return new Promise(resolve => {
    const script = document.createElement('script');
    script.src = '/sdk/gamevolt.js'; script.async = true;
    script.onload = () => resolve(window.GameVolt || null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

export function connectCloudSaves(core, saves) {
  const state = { available: false, signedIn: false, syncing: false, userId: null, lastSyncedAt: 0, error: null };
  let gameVolt = null, active = null, rerun = false, timer = null;
  const owner = () => { try { return localStorage.getItem(OWNER_KEY); } catch { return null; } };
  const setOwner = id => { try { localStorage.setItem(OWNER_KEY, id); } catch { /* Cloud data remains authoritative. */ } };

  async function syncOnce() {
    const user = gameVolt?.auth?.getUser?.();
    if (!user || !gameVolt?.save) return null;
    state.signedIn = true; state.userId = user.id; state.error = null;
    const cloud = await decodeCloudBundle(await gameVolt.save.get());
    const localRecords = await saves.cloudRecords();
    if (!localRecords) throw Error('Local saves unavailable');
    const local = recordsToCloudBundle(localRecords);
    const previousOwner = owner();
    // The first account claims guest saves. Switching accounts mirrors that account's cloud
    // instead, preventing one person's cities from being copied into another account.
    const merged = previousOwner && previousOwner !== user.id ? cloud : mergeCloudBundles(local, cloud);
    if (cloudBundleSignature(local) !== cloudBundleSignature(merged)) {
      if (!await saves.replaceCloudRecords(cloudBundleToRecords(merged))) throw Error('Could not update local cloud saves');
    }
    if (cloudBundleSignature(cloud) !== cloudBundleSignature(merged)) {
      const result = await gameVolt.save.set(await encodeCloudBundle(merged));
      if (result?.error && !result.savedLocally) throw Error(result.error);
    }
    setOwner(user.id); state.lastSyncedAt = Date.now();
    core.events.emit('save:cloud-synced', { userId: user.id, slots: Object.keys(merged.slots).length });
    return merged;
  }

  function sync() {
    if (active) { rerun = true; return active; }
    state.syncing = true;
    active = (async () => {
      do { rerun = false; await syncOnce(); } while (rerun);
    })().catch(error => {
      state.error = error?.message || String(error);
      core.events.emit('save:cloud-failed', { error: state.error });
    }).finally(() => { state.syncing = false; active = null; });
    return active;
  }

  function queueSync() {
    if (!state.signedIn) return;
    clearTimeout(timer); timer = setTimeout(sync, 700);
  }
  core.events.on('save:saved', queueSync, 'cloud-save');
  core.events.on('save:removed', queueSync, 'cloud-save');

  loadGameVolt().then(sdk => {
    if (!sdk) return;
    gameVolt = sdk; state.available = true;
    sdk.auth.onStateChange(user => {
      state.signedIn = !!user; state.userId = user?.id || null;
      if (user) sync();
    });
    sdk.onReady(() => {
      const user = sdk.auth.getUser?.(); state.signedIn = !!user; state.userId = user?.id || null;
      if (user) sync();
    });
    sdk.init('simbuild');
  });

  return { state, sync };
}
