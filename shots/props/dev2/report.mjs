// node shots/props/dev2/report.mjs <dir>   — roll up every shot in a directory:
// errors, module status, draws, triangles, the pinned rects and the statistics inside them.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const dir = process.argv[2] || 'shots/props/dev2';
const rows = [];
for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.json') && !n.endsWith('.crops.json')).sort()) {
  let j;
  try { j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { continue; }
  if (!j.png) continue;
  const crops = (() => {
    try { return JSON.parse(fs.readFileSync(path.join(dir, f.replace(/\.json$/, '.crops.json')), 'utf8')); } catch { return null; }
  })();
  const stats = (() => {
    try {
      const args = [path.join('shots/props/dev2/imgstats.mjs'), j.png];
      if (crops) for (const [, r] of Object.entries(crops.rects || {})) args.push(...r.map(String));
      return JSON.parse(execFileSync('node', args, { encoding: 'utf8', maxBuffer: 1 << 26 }));
    } catch (e) { return null; }
  })();
  rows.push({
    shot: f.replace(/\.json$/, ''), ok: j.ok, camera: j.camera, time: j.time,
    draws: j.drawCalls, tris: j.triangles, errors: (j.errors || []).length,
    props: j.modules?.props?.status,
    rects: crops ? Object.keys(crops.rects || {}) : [],
    frame: stats?.frame480, speckle: stats?.speckleFull?.pct,
    crops: stats?.crops,
    rectMap: crops?.rects,
  });
}
console.log(JSON.stringify(rows, null, 1));
