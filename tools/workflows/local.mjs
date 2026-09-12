#!/usr/bin/env node
// Runs the existing Workflow script with file-backed agent requests. The coordinating agent dispatches
// each request to a separate builder/critic and writes its structured response to <id>.result.json.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const opts = {};
for (let i = 2; i < process.argv.length; i += 2) opts[process.argv[i].slice(2)] = process.argv[i + 1];
const root = path.resolve(import.meta.dirname, '../..');
process.chdir(root);
const wave = opts.wave || '2';
const queue = path.resolve(opts.queue || `shots/workflows/w${wave}`);
fs.mkdirSync(queue, { recursive: true });
const resume = opts.resume === 'true';
if (!resume && fs.readdirSync(queue).length) throw new Error(`Use a fresh --queue directory; ${queue} already contains run evidence.`);
const refresh = spawnSync(process.execPath, ['tools/status.mjs'], { encoding: 'utf8' });
if (refresh.status !== 0) throw new Error(refresh.stderr);
const status = JSON.parse(fs.readFileSync('docs/STATUS.json', 'utf8'));
const args = resume ? JSON.parse(fs.readFileSync(path.join(queue, 'run.json'), 'utf8')) : {
  wave, root, ref: process.env.SIMBUILD_REF || path.join(os.homedir(), '.simbuild/ref'),
  roundsPerRun: Number(opts.rounds || 4), integrate: opts.integrate !== 'false',
  modules: Object.entries(status.modules).filter(([, m]) => String(m.wave) === wave && m.next && m.next.round <= status.maxRounds)
    .map(([name, m]) => ({ name, ...m.next })),
  notes: `Shared dev server: ${process.env.SIM_URL || 'http://127.0.0.1:5173'}. Every shell invocation for screenshots or probes must export SIM_URL=${process.env.SIM_URL || 'http://127.0.0.1:5173'}, SIM_GL=${process.env.SIM_GL || 'swiftshader'}, and SIMBUILD_REF=${process.env.SIMBUILD_REF || path.join(os.homedir(), '.simbuild/ref')}. Do not stop the server. This machine has an Apple M4 GPU; report actual renderer and fps, never call Metal measurements SwiftShader. Read docs/prompts/_review/residual.json: do not fail unmeasurable spec requirements. Preserve other agents' changes. No commits or pushes. Independent critics must not be the builder for the same module. ${opts.notes || ''}`,
};
if (!resume) fs.writeFileSync(path.join(queue, 'run.json'), JSON.stringify(args, null, 2));
const prior = resume ? fs.readdirSync(queue).filter(n => n.endsWith('.request.json')).map(n => JSON.parse(fs.readFileSync(path.join(queue, n), 'utf8'))) : [];
let serial = Math.max(0, ...prior.map(r => Number(r.id.split('-')[0])));
async function agent(prompt, options) {
  const existing = prior.find(r => r.options.label === options.label);
  const id = existing?.id || `${String(++serial).padStart(3, '0')}-${options.label.replaceAll(':', '-')}`;
  const request = path.join(queue, `${id}.request.json`);
  const result = path.join(queue, `${id}.result.json`);
  if (!existing) fs.writeFileSync(request, JSON.stringify({ id, prompt, options, result }, null, 2));
  console.log(`REQUEST ${request}`);
  while (!fs.existsSync(result)) await delay(1000);
  const value = JSON.parse(fs.readFileSync(result, 'utf8'));
  if (value === null) return null;
  for (const key of options.schema.required) if (!(key in value)) throw new Error(`${id}: result missing ${key}`);
  return value;
}
const script = fs.readFileSync(path.join(root, 'tools/workflows/wave.js'), 'utf8').replace('export const meta =', 'const meta =');
const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;
const run = new AsyncFunction('args', 'agent', 'parallel', 'log', 'phase', script);
const result = await run(args, agent, tasks => Promise.all(tasks.map(task => task())), console.log, console.log);
fs.writeFileSync(path.join(queue, 'complete.json'), JSON.stringify(result, null, 2));
spawnSync(process.execPath, ['tools/status.mjs'], { stdio: 'inherit' });
console.log(`COMPLETE ${path.join(queue, 'complete.json')}`);
