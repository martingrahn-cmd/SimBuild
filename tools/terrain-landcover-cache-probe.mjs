#!/usr/bin/env node
// R19 contract: cache deterministic Worley feature data without changing any generated land-cover byte.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { RNG } from '../src/core/rng.js';
import { generateHeightmap } from '../src/modules/terrain/gen/heightmap.js';
import { generateLandcover } from '../src/modules/terrain/gen/landcover.js';

const expected = new Map([
  [1337, '7f837a05917a4eb03d795939cf538d9ca919a6a67ec8195dfd2f94cc0c1dd8ef'],
  [7, 'f86a454030677eaecf954c777dbad17697d3ada27b2d08b82ff3b059210a0505'],
]);
const result = { contract: 'terrain-landcover-byte-exact-r19', size: 1024, rows: [], pass: false };

for (const [seed, referenceSha256] of expected) {
  const terrainRng = new RNG(seed, 'root').fork('terrain');
  const generated = generateHeightmap(terrainRng.fork('heightmap'), { res: 513, size: 2048 });
  const started = performance.now();
  const landcover = generateLandcover(terrainRng.fork('landcover'), generated, result.size);
  const sha256 = createHash('sha256').update(landcover.data).digest('hex');
  result.rows.push({
    seed,
    bytes: landcover.data.byteLength,
    elapsedMs: +(performance.now() - started).toFixed(1),
    referenceSha256,
    sha256,
    exact: sha256 === referenceSha256,
  });
}
result.pass = result.rows.every((row) => row.exact);
const out = process.env.TERRAIN_LANDCOVER_OUT || 'shots/playtest-fixes-r19/terrain-landcover-cache.json';
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
