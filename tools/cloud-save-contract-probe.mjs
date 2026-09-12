import assert from 'node:assert/strict';
import { cloudBundleSignature, cloudBundleToRecords, decodeCloudBundle, encodeCloudBundle, mergeCloudBundles, recordsToCloudBundle } from '../src/core/cloud-save.js';

const city = (savedAt, marker) => ({ version: 1, savedAt, time: { day: marker }, modules: { simulation: { marker } } });
const local = recordsToCloudBundle([
  { slot: 'auto', data: city(200, 'local-newer') },
  { slot: 'slot1', data: city(100, 'will-delete') },
  { slot: 'slot2', deleted: true, deletedAt: 400 },
]);
const cloud = recordsToCloudBundle([
  { slot: 'auto', data: city(150, 'cloud-older') },
  { slot: 'slot1', deleted: true, deletedAt: 300 },
  { slot: 'slot2', data: city(350, 'must-not-resurrect') },
  { slot: 'slot3', data: city(250, 'cloud-only') },
]);
const merged = mergeCloudBundles(local, cloud);

assert.equal(merged.slots.auto.data.time.day, 'local-newer');
assert.equal(merged.tombstones.slot1, 300);
assert.equal(merged.tombstones.slot2, 400);
assert.equal(merged.slots.slot3.data.time.day, 'cloud-only');
assert.equal(merged.slots.slot1, undefined);
assert.equal(merged.slots.slot2, undefined);
assert.equal(cloudBundleSignature(merged), cloudBundleSignature(recordsToCloudBundle(cloudBundleToRecords(merged))));

const tieSave = recordsToCloudBundle([{ slot: 'tie', data: city(500, 'save') }]);
const tieDelete = recordsToCloudBundle([{ slot: 'tie', deleted: true, deletedAt: 500 }]);
assert.equal(mergeCloudBundles(tieSave, tieDelete).tombstones.tie, 500, 'deletion must win equal timestamps');
assert.equal(cloudBundleSignature(mergeCloudBundles(local, cloud)), cloudBundleSignature(mergeCloudBundles(cloud, local)), 'merge must be commutative');

const encoded = await encodeCloudBundle(merged);
assert.equal(encoded.slots.auto.encoding, typeof CompressionStream === 'function' ? 'gzip-base64' : undefined);
assert.equal(cloudBundleSignature(await decodeCloudBundle(encoded)), cloudBundleSignature(merged), 'compressed round trip must preserve every slot');

console.log(JSON.stringify({ ok: true, slots: Object.keys(merged.slots), tombstones: merged.tombstones, encodedBytes: JSON.stringify(encoded).length }, null, 2));
