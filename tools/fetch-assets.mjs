#!/usr/bin/env node
// Downloads CC0 PBR sets listed in public/assets/manifest.json (Poly Haven / ambientCG only).
// node tools/fetch-assets.mjs [--only name] [--force]
import fs from 'node:fs';
import path from 'node:path';

const args = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { const k = a.slice(2); const n = process.argv[i + 1]; args[k] = n && !n.startsWith('--') ? (i++, n) : 'true'; } }
const manifest = JSON.parse(fs.readFileSync('public/assets/manifest.json', 'utf8'));
const ALLOWED = ['polyhaven', 'ambientcg', 'procedural'];
let ok = 0, fail = 0, skip = 0;
for (const a of manifest.assets) {
  if (args.only && a.name !== args.only) continue;
  if (!ALLOWED.includes(a.source)) { console.error(`REJECT ${a.name}: source ${a.source} not allowed (CC0 policy)`); fail++; continue; }
  if (a.license !== 'CC0') { console.error(`REJECT ${a.name}: license ${a.license} != CC0`); fail++; continue; }
  if (!a.urls) continue;
  const dir = path.join('public/assets', a.name);
  fs.mkdirSync(dir, { recursive: true });
  for (const [k, url] of Object.entries(a.urls)) {
    const file = a.files?.[k];
    if (!file) { console.warn(`  ${a.name}.${k}: no files entry`); continue; }
    const dest = path.join(dir, file);
    if (fs.existsSync(dest) && !args.force && fs.statSync(dest).size > 1000) { skip++; continue; }
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const buf = Buffer.from(await r.arrayBuffer());
      fs.writeFileSync(dest, buf);
      console.log(`ok   ${a.name}/${file} (${(buf.length / 1024).toFixed(0)} KB)`);
      ok++;
    } catch (e) { console.error(`FAIL ${a.name}/${file}: ${e.message}`); fail++; }
  }
}
console.log(`downloaded=${ok} skipped=${skip} failed=${fail}`);
process.exit(fail ? 1 : 0);
