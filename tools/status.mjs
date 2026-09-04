#!/usr/bin/env node
// Aggregates docs/critic/<module>_r<n>.json verdicts into docs/STATUS.json (resumable state).
// node tools/status.mjs [--print]
import fs from 'node:fs';
import path from 'node:path';
const STATUS = 'docs/STATUS.json';
const status = JSON.parse(fs.readFileSync(STATUS, 'utf8'));
const dir = 'docs/critic';
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^[a-z]+_r\d+\.json$/.test(f)) : [];
const byModule = {};
for (const f of files) {
  const m = f.match(/^([a-z]+)_r(\d+)\.json$/);
  let v; try { v = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { continue; }
  (byModule[m[1]] ||= []).push({ round: +m[2], ...v });
}
for (const [mod, rounds] of Object.entries(byModule)) {
  rounds.sort((a, b) => a.round - b.round);
  const last = rounds[rounds.length - 1];
  const rec = status.modules[mod] || (status.modules[mod] = { wave: 0, round: 0, score: null, status: 'stub', openIssues: [], history: [] });
  rec.round = last.round;
  rec.score = last.score;
  rec.pass = !!(last.pass && last.score >= status.passThreshold && last.consoleErrors === 0);
  rec.status = rec.pass ? 'pass' : (last.round >= status.maxRounds ? 'exhausted' : 'needs-work');
  rec.openIssues = (last.issues || []).map((i) => `[${i.severity}] ${i.title}: ${i.detail}`.slice(0, 300));
  rec.strengths = last.strengths || [];
  rec.consoleErrors = last.consoleErrors;
  rec.maxDrawCalls = last.maxDrawCalls;
  rec.apiContractOk = last.apiContractOk;
  rec.history = rounds.map((r) => ({ round: r.round, score: r.score, pass: !!r.pass, errors: r.consoleErrors, draws: r.maxDrawCalls, report: `docs/critic/${mod}_r${r.round}.md` }));
}
status.updatedAt = new Date().toISOString();
const mods = Object.entries(status.modules);
status.summary = {
  passed: mods.filter(([, m]) => m.pass).map(([n]) => n),
  needsWork: mods.filter(([, m]) => !m.pass).sort((a, b) => (a[1].score ?? -1) - (b[1].score ?? -1)).map(([n, m]) => `${n}:${m.score ?? 'unscored'}:r${m.round}`),
  weakest: mods.filter(([, m]) => !m.pass).sort((a, b) => (a[1].score ?? -1) - (b[1].score ?? -1))[0]?.[0] || null,
};
fs.writeFileSync(STATUS, JSON.stringify(status, null, 2));
console.log(JSON.stringify(status.summary));
