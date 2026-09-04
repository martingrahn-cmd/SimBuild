#!/usr/bin/env node
// Deterministic self-test for the simulation core (no browser needed):
//   node src/modules/simulation/selftest.mjs [days] [seed]
// 1. runs the economy + virtual city for N game days and prints a daily trajectory,
// 2. runs it again with the same seed and asserts byte-identical state (determinism),
// 3. serialises at the half-way point, continues, and asserts the resumed run matches (save/load).
import { RNG } from '../../core/rng.js';
import { Economy, TICKS_PER_DAY, ZONE_TYPES } from './economy.js';
import { VirtualCity } from './virtualcity.js';
import { profile } from './activity.js';

const days = +(process.argv[2] || 90);
const seed = +(process.argv[3] || 1337);

function makeEcon() {
  return { money: 150000, population: 0, jobs: 0, happiness: 0.5, demand: { residential: 0.5, commercial: 0.3, industrial: 0.3, office: 0.2 }, taxRate: 0.1, history: [] };
}
function makeSim(seed) {
  const root = new RNG(seed, 'root').fork('simulation');
  const econ = makeEcon();
  const eco = new Economy(root.fork('economy'), econ);
  const city = new VirtualCity(eco, root.fork('virtualcity'));
  return { eco, city, econ };
}
function stepSim(s, ticks) {
  for (let i = 0; i < ticks; i++) {
    s.eco.step();
    s.city.apply(s.eco.requests);
    for (const id of s.eco.levelups) s.city.levelUp(id);
  }
}
const snapshot = (s) => JSON.stringify({ e: s.eco.serialize(), c: s.city.serialize() });
const fmt = (n) => Math.round(n).toLocaleString('en-US');

// 1. trajectory
const A = makeSim(seed);
const t0 = performance.now();
console.log('day     pop   jobs  unemp  happy   money      net/day   R    C    I    O   bld  roadKm');
for (let d = 1; d <= days; d++) {
  stepSim(A, TICKS_PER_DAY);
  const e = A.econ;
  if (d <= 10 || d % 10 === 0 || d === days) {
    console.log(`${String(d).padStart(3)} ${fmt(e.population).padStart(7)} ${fmt(e.jobs).padStart(6)} ${(e.unemployment * 100).toFixed(1).padStart(5)}% ${(e.happiness * 100).toFixed(0).padStart(4)}% ${fmt(e.money).padStart(10)} ${fmt(e.net).padStart(9)}  ` +
      ZONE_TYPES.map((k) => (e.demand[k] * 100).toFixed(0).padStart(3)).join('  ') + `  ${String(A.city.count).padStart(4)} ${e.roadKm.toFixed(1).padStart(6)}`);
  }
}
const ms = performance.now() - t0;
console.log(`\n${days} days = ${days * TICKS_PER_DAY} ticks in ${ms.toFixed(0)} ms (${(ms / (days * TICKS_PER_DAY) * 1000).toFixed(2)} µs/tick)`);
console.log(`history: ${A.econ.history.length} daily samples, fine ring ${A.eco.fine.count}/${A.eco.fine.len}`);

// 2. determinism
const B = makeSim(seed);
stepSim(B, days * TICKS_PER_DAY);
const same = snapshot(A) === snapshot(B);
console.log(`determinism (same seed, ${days} days): ${same ? 'OK identical' : 'FAIL differs'}`);
const C = makeSim(seed + 1);
stepSim(C, days * TICKS_PER_DAY);
console.log(`different seed differs: ${snapshot(A) !== snapshot(C) ? 'OK' : 'FAIL (seed ignored?)'}`);

// 3. save / load
const half = Math.floor(days / 2) * TICKS_PER_DAY + 137;
const D = makeSim(seed);
stepSim(D, half);
const saved = JSON.parse(JSON.stringify({ e: D.eco.serialize(), c: D.city.serialize() }));
stepSim(D, days * TICKS_PER_DAY - half);
const E = makeSim(seed);
stepSim(E, 555);                       // desync first, then restore
E.eco.deserialize(saved.e); E.city.deserialize(saved.c);
stepSim(E, days * TICKS_PER_DAY - half);
const resumed = snapshot(D) === snapshot(E) && snapshot(D) === snapshot(A);
console.log(`save/load round-trip at tick ${half}: ${resumed ? 'OK identical' : 'FAIL differs'}`);

// 4. activity curves
const p = {};
console.log('\nactivity  ' + [0, 3, 6, 8, 12, 17.5, 20, 22].map((h) => String(h).padStart(6)).join(''));
for (const k of ['commute', 'traffic', 'residential', 'commercial', 'office', 'streetLights']) {
  console.log(k.padEnd(10) + [0, 3, 6, 8, 12, 17.5, 20, 22].map((h) => profile(h, p)[k].toFixed(2).padStart(6)).join(''));
}
if (!same || !resumed) process.exit(1);
