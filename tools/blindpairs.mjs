#!/usr/bin/env node
/**
 * Stage blind A/B pairs for the blind judges (ARCHITECTURE step 5 / docs/prompts/BLIND-JUDGE.md).
 *
 * Both images in a pair are re-encoded to the SAME format, size and quality, and named A/B only, so that
 * nothing but the pixels can tell a judge which is ours and which is the reference: no extension, no
 * resolution, no filename, no directory, no file-size tell. The answer key is written OUTSIDE the directory
 * the judge is given.
 *
 *   node tools/blindpairs.mjs --pairs pairs.json --out /tmp/blind/run1 --key /tmp/blind/key1.json --seed 7
 *
 * pairs.json: [{ "label": "aerial_downtown_day", "ours": "shots/...png", "ref": "/path/cs2_1.jpg" }, ...]
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { const k = a.slice(2); const n = process.argv[i + 1]; args[k] = n && !n.startsWith('--') ? (i++, n) : 'true'; } }
if (!args.pairs || !args.out || !args.key) { console.error('usage: --pairs pairs.json --out DIR --key KEY.json [--seed N] [--size 1600x900]'); process.exit(2); }

const pairs = JSON.parse(fs.readFileSync(args.pairs, 'utf8'));
const seed = +(args.seed || 1);
const [W, H] = (args.size || '1600x900').split('x').map(Number);
fs.mkdirSync(args.out, { recursive: true });
fs.mkdirSync(path.dirname(path.resolve(args.key)), { recursive: true });

// Balanced deterministic assignment: as close to half the pairs put "ours" in slot A as possible, then
// shuffled, so an accidental run of one side cannot bias the aggregate.
function rng32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function balancedAssignment(count, seed) {
  const v = Array.from({ length: count }, (_, i) => i < Math.floor(count / 2));
  const r = rng32(seed);
  for (let i = v.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [v[i], v[j]] = [v[j], v[i]]; }
  return v; // v[i] === true => "ours" is slot A for pair i
}

const PY = `
import sys
from PIL import Image
src, dst, w, h = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
im = Image.open(src).convert('RGB')
# letterbox-free: both sources are 16:9 here; resize to the common size with the same filter
im = im.resize((w, h), Image.LANCZOS)
im.save(dst, 'JPEG', quality=92, optimize=True, progressive=False)
`;
const pyFile = path.join(args.out, '.norm.py');
fs.writeFileSync(pyFile, PY);

const usable = pairs.filter((p) => {
  const ok = fs.existsSync(p.ours) && fs.existsSync(p.ref);
  if (!ok) console.error(`skipping ${p.label || '?'}: missing ${!fs.existsSync(p.ours) ? p.ours : p.ref}`);
  return ok;
});
const assign = balancedAssignment(usable.length, seed);
const key = { seed, size: [W, H], createdAt: new Date().toISOString(), pairs: [] };
let n = 0;
for (const p of usable) {
  n++;
  const id = `pair_${String(n).padStart(2, '0')}`;
  const dir = path.join(args.out, id);
  fs.mkdirSync(dir, { recursive: true });
  const oursIsA = assign[n - 1];
  const jobs = [[p.ours, oursIsA ? 'A' : 'B'], [p.ref, oursIsA ? 'B' : 'A']];
  for (const [src, slot] of jobs) {
    const dst = path.join(dir, `${slot}.jpg`);
    const r = spawnSync('python3', [pyFile, src, dst, String(W), String(H)], { encoding: 'utf8' });
    if (r.status !== 0) { console.error(`normalize failed for ${src}: ${r.stderr}`); process.exit(1); }
  }
  // Pad both files to the same byte length with trailing bytes after the JPEG EOI marker (decoders ignore
  // them), so `ls -l` cannot suggest which image carries more detail.
  const fa = path.join(dir, 'A.jpg'), fb = path.join(dir, 'B.jpg');
  const sa = fs.statSync(fa).size, sb = fs.statSync(fb).size;
  const target = Math.max(sa, sb) + 1024;
  for (const [f, sz] of [[fa, sa], [fb, sb]]) fs.appendFileSync(f, Buffer.alloc(target - sz, 0x20));
  key.pairs.push({ pair: id, label: p.label || id, ours: oursIsA ? 'A' : 'B', reference: oursIsA ? 'B' : 'A', oursFile: p.ours, refFile: p.ref });
  console.log(`${id}  ours=${oursIsA ? 'A' : 'B'}  (${p.label || ''})`);
}
fs.unlinkSync(pyFile);
fs.writeFileSync(args.key, JSON.stringify(key, null, 2));
// leave nothing in the judge's directory that could leak the mapping
fs.writeFileSync(path.join(args.out, 'README.txt'), `Pairs of screenshots from city-building games.\nEach ${'pair_NN'} directory contains A.jpg and B.jpg. Judge which looks better and why.\n`);
console.log(`\n${n} pairs staged in ${args.out}; key written to ${args.key} (do NOT give the key to a judge)`);
