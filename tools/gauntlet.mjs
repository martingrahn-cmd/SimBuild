#!/usr/bin/env node
// Standard screenshot matrix for a module: cameras × times. Writes shots/<module>/... and a summary JSON.
// node tools/gauntlet.mjs --module roads [--cameras aerial,street,skyline,closeup] [--times 6.5,12,17.5,22] [--round 1] [--w 1920 --h 1080]
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { const k = a.slice(2); const n = process.argv[i + 1]; args[k] = n && !n.startsWith('--') ? (i++, n) : 'true'; } }
const mod = args.module || 'democity';
const cameras = (args.cameras || 'aerial,street,skyline,closeup').split(',');
const times = (args.times || '6.5,12,17.5,22').split(',').map(Number);
const round = args.round || 'x';
const dir = `shots/${mod}/r${round}`;
fs.mkdirSync(dir, { recursive: true });
const rows = [];
for (const cam of cameras) for (const t of times) {
  const out = path.join(dir, `${cam}_${String(t).replace('.', 'p')}.png`);
  const extra = [];
  if (args.w) extra.push('--w', args.w); if (args.h) extra.push('--h', args.h);
  if (args.seed) extra.push('--seed', args.seed); if (args.weather) extra.push('--weather', args.weather);
  if (args.quality) extra.push('--quality', args.quality);
  const r = spawnSync('node', ['tools/screenshot.mjs', '--showcase', mod, '--camera', cam, '--time', String(t), '--out', out, '--measure', args.measure || '1.5', ...extra], { encoding: 'utf8' });
  process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  try { rows.push(JSON.parse(fs.readFileSync(out.replace(/\.png$/, '.json'), 'utf8'))); } catch { rows.push({ png: out, ok: false, error: 'no json' }); }
}
const summary = {
  module: mod, round, at: new Date().toISOString(),
  shots: rows.map((r) => ({ png: r.png, camera: r.camera, time: r.time, ok: r.ok, fps: r.fps, drawCalls: r.drawCalls, triangles: r.triangles, errors: r.errors?.length || 0, moduleStatus: r.modules?.[mod]?.status })),
  maxDrawCalls: Math.max(...rows.map((r) => r.drawCalls || 0)),
  maxTriangles: Math.max(...rows.map((r) => r.triangles || 0)),
  minFps: Math.min(...rows.map((r) => r.fps ?? 999)),
  totalErrors: rows.reduce((a, r) => a + (r.errors?.length || 0), 0),
  uniqueErrors: [...new Set(rows.flatMap((r) => r.errors || []))].slice(0, 20),
};
fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(`\n== ${mod} r${round}: shots=${rows.length} maxDraws=${summary.maxDrawCalls} maxTris=${summary.maxTriangles} minFps=${summary.minFps} errors=${summary.totalErrors}`);
for (const e of summary.uniqueErrors.slice(0, 10)) console.log('  ERR ' + e.split('\n')[0]);
console.log(`summary: ${path.join(dir, 'summary.json')}`);
