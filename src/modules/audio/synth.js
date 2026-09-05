// Pure-JS procedural sound synthesis. Every sound is rendered into Float32Array channels from a seeded
// RNG stream, with no AudioContext / OfflineAudioContext involved, so the same code runs headless and
// the buffers can be drawn as waveforms. Ambient beds are rendered as seamless loops (equal-power
// crossfade of the tail into the head); one-shots are short.
export const SR = 24000;
const TAU = Math.PI * 2;

// ---------------------------------------------------------------- DSP primitives
class Biquad {
  constructor(type, f0, q = 0.707, gainDb = 0) { this.z1 = 0; this.z2 = 0; this.set(type, f0, q, gainDb); }
  set(type, f0, q = 0.707, gainDb = 0) {
    const w0 = TAU * Math.min(Math.max(f0, 10), SR * 0.45) / SR;
    const cs = Math.cos(w0), sn = Math.sin(w0), alpha = sn / (2 * Math.max(q, 0.05));
    let b0, b1, b2, a0, a1, a2;
    if (type === 'lp') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; a0 = 1 + alpha; a1 = -2 * cs; a2 = 1 - alpha; }
    else if (type === 'hp') { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; a0 = 1 + alpha; a1 = -2 * cs; a2 = 1 - alpha; }
    else if (type === 'bp') { b0 = alpha; b1 = 0; b2 = -alpha; a0 = 1 + alpha; a1 = -2 * cs; a2 = 1 - alpha; }
    else { const A = Math.pow(10, gainDb / 40); b0 = 1 + alpha * A; b1 = -2 * cs; b2 = 1 - alpha * A; a0 = 1 + alpha / A; a1 = -2 * cs; a2 = 1 - alpha / A; }
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = a1 / a0; this.a2 = a2 / a0;
    return this;
  }
  run(x) { const y = this.b0 * x + this.z1; this.z1 = this.b1 * x - this.a1 * y + this.z2; this.z2 = this.b2 * x - this.a2 * y; return y; }
}
class Pink {
  constructor(rng) { this.rng = rng; this.b0 = 0; this.b1 = 0; this.b2 = 0; }
  next() {
    const w = this.rng.float() * 2 - 1;
    this.b0 = 0.99765 * this.b0 + w * 0.0990460; this.b1 = 0.96300 * this.b1 + w * 0.2965164; this.b2 = 0.57000 * this.b2 + w * 1.0526913;
    return (this.b0 + this.b1 + this.b2 + w * 0.1848) * 0.25;
  }
}
class Brown {
  constructor(rng) { this.rng = rng; this.b = 0; }
  next() { const w = this.rng.float() * 2 - 1; this.b = (this.b + 0.02 * w) / 1.02; return this.b * 3.5; }
}
const white = (rng) => rng.float() * 2 - 1;
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
/** attack/release window in seconds for a note of length len at local time t */
const ar = (t, len, a, r) => (t < 0 || t > len ? 0 : Math.min(1, t / a) * Math.min(1, (len - t) / r));
const expo = (t, tau) => (t < 0 ? 0 : Math.exp(-t / tau));

function normalize(chs, peak = 0.85) {
  let m = 0;
  for (const c of chs) for (let i = 0; i < c.length; i++) { const a = Math.abs(c[i]); if (a > m) m = a; }
  if (m > 1e-6) { const k = peak / m; for (const c of chs) for (let i = 0; i < c.length; i++) c[i] *= k; }
  return chs;
}
/** Render seconds+fade of audio with fn(i, t, ch) and fold the tail into the head so the loop is seamless. */
function loop(seconds, fade, stereo, fill) {
  const N = Math.round(seconds * SR), F = Math.round(fade * SR), T = N + F;
  const chs = stereo ? [new Float32Array(T), new Float32Array(T)] : [new Float32Array(T)];
  fill(chs, T);
  const out = chs.map(() => new Float32Array(N));
  for (let c = 0; c < chs.length; c++) {
    const s = chs[c], o = out[c];
    for (let i = 0; i < N; i++) o[i] = s[i];
    for (let i = 0; i < F; i++) { const k = (i / F) * Math.PI * 0.5; o[i] = s[i] * Math.sin(k) + s[N + i] * Math.cos(k); }
  }
  return out;
}
function oneShot(seconds, stereo, fill) {
  const N = Math.round(seconds * SR);
  const chs = stereo ? [new Float32Array(N), new Float32Array(N)] : [new Float32Array(N)];
  fill(chs, N);
  return chs;
}
/** Periodic slow modulation (sum of harmonics of 1/period) so ambient loops stay continuous. */
function makeLfo(rng, period, harmonics, depth) {
  const ph = [], amp = [];
  for (let k = 1; k <= harmonics; k++) { ph.push(rng.float() * TAU); amp.push(depth / k); }
  return (t) => { let s = 0; for (let k = 1; k <= harmonics; k++) s += amp[k - 1] * Math.sin(TAU * k * t / period + ph[k - 1]); return s; };
}

// ---------------------------------------------------------------- ambient beds (loops)
function wind(rng) {
  const P = 12;
  const gustL = makeLfo(rng, P, 4, 0.5), gustR = makeLfo(rng, P, 3, 0.25);
  const pk = [new Pink(rng), new Pink(rng)];
  const lp = [new Biquad('lp', 500, 0.8), new Biquad('lp', 500, 0.8)];
  const whistle = [new Biquad('bp', 620, 9), new Biquad('bp', 740, 9)];
  const hp = [new Biquad('hp', 60, 0.7), new Biquad('hp', 60, 0.7)];
  return loop(P, 1.5, true, (chs, T) => {
    for (let i = 0; i < T; i++) {
      const t = i / SR;
      const g = clamp01(0.55 + gustL(t) + 0.12 * gustR(t * 1.7));
      if ((i & 63) === 0) { const fc = 220 + 1400 * g * g; lp[0].set('lp', fc, 0.8); lp[1].set('lp', fc * 1.08, 0.8); }
      for (let c = 0; c < 2; c++) {
        const n = pk[c].next();
        const body = lp[c].run(n) * (0.25 + 0.95 * g);
        const w = whistle[c].run(n) * smooth(0.55, 0.95, g) * 0.35;
        chs[c][i] = hp[c].run(body + w);
      }
    }
    normalize(chs, 0.8);
  });
}
function leaves(rng) {
  const P = 9;
  const gust = makeLfo(rng, P, 4, 0.45);
  const bp = [new Biquad('bp', 3200, 0.6), new Biquad('bp', 3900, 0.6)];
  const fl = [new Biquad('lp', 12, 0.7), new Biquad('lp', 14, 0.7)];
  return loop(P, 1.2, true, (chs, T) => {
    for (let i = 0; i < T; i++) {
      const t = i / SR;
      const g = clamp01(0.45 + gust(t));
      for (let c = 0; c < 2; c++) {
        const flutter = clamp01(0.5 + 3.5 * fl[c].run(white(rng)));
        chs[c][i] = bp[c].run(white(rng)) * g * g * (0.3 + 0.7 * flutter);
      }
    }
    normalize(chs, 0.7);
  });
}
function traffic(rng) {
  const P = 14;
  const br = [new Brown(rng), new Brown(rng)];
  const pk = new Pink(rng);
  const rumble = [new Biquad('lp', 110, 0.9), new Biquad('lp', 120, 0.9)];
  const hiss = [new Biquad('bp', 900, 0.5), new Biquad('bp', 1100, 0.5)];
  const lvl = makeLfo(rng, P, 3, 0.25);
  // three passing cars per loop: bandpassed noise swept down (doppler) with a raised-cosine envelope, panned across
  const passes = [];
  for (let k = 0; k < 3; k++) passes.push({ t0: (k + rng.float() * 0.6) * (P / 3), len: 2.2 + rng.float() * 1.4, dir: rng.bool() ? 1 : -1, f: 1400 + rng.float() * 800, bp: new Biquad('bp', 1000, 1.2), amp: 0.5 + rng.float() * 0.5 });
  const engine = { f: 68 + rng.float() * 20, ph: 0 };
  return loop(P, 2, true, (chs, T) => {
    for (let i = 0; i < T; i++) {
      const t = i / SR;
      const base = 0.7 + lvl(t);
      engine.ph += TAU * (engine.f * (1 + 0.04 * Math.sin(TAU * t / P))) / SR;
      const eng = (Math.sin(engine.ph) * 0.6 + Math.sin(engine.ph * 2) * 0.25 + Math.sin(engine.ph * 3.02) * 0.12) * 0.08 * base;
      const n = pk.next();
      let pL = 0, pR = 0;
      for (const p of passes) {
        const u = (t - p.t0) / p.len;
        if (u < 0 || u > 1) continue;
        const env = 0.5 - 0.5 * Math.cos(TAU * u);
        if ((i & 31) === 0) p.bp.set('bp', p.f * (1.18 - 0.36 * u), 1.4);
        const s = p.bp.run(white(rng)) * env * env * p.amp * 1.6;
        const pan = 0.5 + 0.5 * p.dir * (u * 2 - 1);
        pL += s * Math.sqrt(1 - pan); pR += s * Math.sqrt(pan);
      }
      chs[0][i] = rumble[0].run(br[0].next()) * base * 0.9 + hiss[0].run(n) * 0.28 * base + eng + pL;
      chs[1][i] = rumble[1].run(br[1].next()) * base * 0.9 + hiss[1].run(n) * 0.28 * base + eng + pR;
    }
    normalize(chs, 0.8);
  });
}
function crickets(rng) {
  const P = 8;
  const voices = [];
  for (let v = 0; v < 6; v++) {
    voices.push({
      f: 3900 + rng.float() * 900, pan: 0.15 + rng.float() * 0.7, amp: 0.35 + rng.float() * 0.65,
      period: 0.32 + rng.float() * 0.35, pulses: 3 + rng.int(0, 3), pw: 0.016 + rng.float() * 0.008, gap: 0.021 + rng.float() * 0.006,
      trill: rng.float() < 0.3, ph: rng.float() * TAU, off: rng.float(),
    });
  }
  const air = new Pink(rng), airLp = new Biquad('lp', 380, 0.7);
  return loop(P, 0.6, true, (chs, T) => {
    for (let i = 0; i < T; i++) {
      const t = i / SR;
      let L = 0, R = 0;
      for (const v of voices) {
        // periodic chirp pattern: k pulses of pw seconds every `gap`, then silence until `period`
        const tt = (t + v.off * v.period) % v.period;
        const k = Math.floor(tt / v.gap);
        const inPulse = v.trill ? (tt % v.gap) < v.pw * 1.15 : (k < v.pulses && (tt - k * v.gap) < v.pw);
        if (!inPulse) continue;
        const u = ((tt - k * v.gap) / v.pw);
        const env = Math.sin(Math.PI * clamp01(u));
        v.ph += TAU * v.f * (1 + 0.012 * Math.sin(TAU * 38 * t)) / SR;
        const s = Math.sin(v.ph) * env * v.amp * 0.6;
        L += s * Math.sqrt(1 - v.pan); R += s * Math.sqrt(v.pan);
      }
      const a = airLp.run(air.next()) * 0.05;
      chs[0][i] = L + a; chs[1][i] = R + a;
    }
    normalize(chs, 0.75);
  });
}
function rain(rng) {
  const P = 10;
  const hpF = [new Biquad('hp', 700, 0.6), new Biquad('hp', 760, 0.6)];
  const lpF = [new Biquad('lp', 6500, 0.6), new Biquad('lp', 6000, 0.6)];
  const roof = [new Biquad('lp', 260, 0.7), new Biquad('lp', 240, 0.7)];
  const br = [new Brown(rng), new Brown(rng)];
  const lvl = makeLfo(rng, P, 3, 0.18);
  // droplet ticks: short ringing bandpassed impulses at ~45 per second
  const drops = [];
  const nDrops = Math.round(P * 45);
  for (let k = 0; k < nDrops; k++) drops.push({ t0: rng.float() * (P + 1), f: 1800 + rng.float() * 3800, tau: 0.004 + rng.float() * 0.01, pan: rng.float(), a: 0.3 + rng.float() * 0.7, ph: rng.float() * TAU });
  drops.sort((a, b) => a.t0 - b.t0);
  let di = 0; const active = [];
  return loop(P, 1.2, true, (chs, T) => {
    for (let i = 0; i < T; i++) {
      const t = i / SR;
      const g = 0.8 + lvl(t);
      while (di < drops.length && drops[di].t0 <= t) active.push(drops[di++]);
      let dL = 0, dR = 0;
      for (let k = active.length - 1; k >= 0; k--) {
        const d = active[k], u = t - d.t0;
        if (u > d.tau * 6) { active[k] = active[active.length - 1]; active.pop(); continue; }
        const s = Math.sin(TAU * d.f * u + d.ph) * Math.exp(-u / d.tau) * d.a * 0.35;
        dL += s * Math.sqrt(1 - d.pan); dR += s * Math.sqrt(d.pan);
      }
      for (let c = 0; c < 2; c++) {
        const n = white(rng);
        const sheet = lpF[c].run(hpF[c].run(n)) * 0.55 * g;
        const low = roof[c].run(br[c].next()) * 0.35;
        chs[c][i] = sheet + low + (c ? dR : dL);
      }
    }
    normalize(chs, 0.8);
  });
}

// ---------------------------------------------------------------- world one-shots
function birdRobin(rng) {
  const notes = [];
  let t = 0.05;
  const n = 4 + rng.int(0, 3);
  for (let k = 0; k < n; k++) {
    const len = 0.09 + rng.float() * 0.12;
    notes.push({ t0: t, len, f0: 2300 + rng.float() * 1500, f1: 2300 + rng.float() * 1900, vib: 30 + rng.float() * 30, vd: 0.02 + rng.float() * 0.04, a: 0.6 + rng.float() * 0.4 });
    t += len + 0.04 + rng.float() * 0.12;
  }
  return oneShot(t + 0.15, false, (chs, N) => {
    const o = chs[0]; let ph = 0;
    for (let i = 0; i < N; i++) {
      const tt = i / SR; let s = 0;
      for (const nt of notes) {
        const u = (tt - nt.t0) / nt.len;
        if (u < 0 || u > 1) continue;
        const glide = nt.f0 + (nt.f1 - nt.f0) * (u * u * (3 - 2 * u));
        const f = glide * (1 + nt.vd * Math.sin(TAU * nt.vib * tt));
        ph += TAU * f / SR;
        const env = Math.sin(Math.PI * u) ** 0.7;
        s += (Math.sin(ph) + 0.18 * Math.sin(2 * ph)) * env * nt.a;
      }
      o[i] = s;
    }
    normalize(chs, 0.7);
  });
}
function birdFinch(rng) {
  const n = 8 + rng.int(0, 6), per = 0.055 + rng.float() * 0.02, len = 0.035;
  const f0 = 3200 + rng.float() * 900, rise = rng.float() < 0.6 ? 1 : -1;
  return oneShot(n * per + 0.15, false, (chs, N) => {
    const o = chs[0]; let ph = 0;
    for (let i = 0; i < N; i++) {
      const tt = i / SR - 0.04;
      const k = Math.floor(tt / per), u = (tt - k * per) / len;
      if (k < 0 || k >= n || u < 0 || u > 1) { o[i] = 0; continue; }
      const f = f0 * (1 + 0.04 * rise * k) * (1.25 - 0.45 * u);
      ph += TAU * f / SR;
      o[i] = (Math.sin(ph) + 0.12 * Math.sin(2 * ph)) * Math.sin(Math.PI * u) * (0.7 + 0.3 * Math.sin(k * 1.3));
    }
    normalize(chs, 0.6);
  });
}
function birdCrow(rng) {
  const caws = [{ t0: 0.05, len: 0.32 }, { t0: 0.55 + rng.float() * 0.2, len: 0.3 + rng.float() * 0.1 }];
  const form1 = new Biquad('bp', 1250, 3), form2 = new Biquad('bp', 2100, 4), lp = new Biquad('lp', 3200, 0.7);
  return oneShot(1.3, false, (chs, N) => {
    const o = chs[0]; let ph = 0;
    for (let i = 0; i < N; i++) {
      const tt = i / SR; let src = 0, env = 0;
      for (const c of caws) {
        const u = (tt - c.t0) / c.len;
        if (u < 0 || u > 1) continue;
        env = Math.sin(Math.PI * u) ** 0.5 * (1 - 0.3 * u);
        const f = 175 * (1.15 - 0.25 * u) * (1 + 0.03 * Math.sin(TAU * 22 * tt));
        ph += TAU * f / SR;
        // harmonic-rich pulse (saw-ish) + breath noise
        let saw = 0; for (let h = 1; h <= 12; h++) saw += Math.sin(h * ph) / h;
        src = saw * 0.5 + white(rng) * 0.35;
      }
      o[i] = lp.run(form1.run(src) * 1.6 + form2.run(src) * 0.8) * env;
    }
    normalize(chs, 0.7);
  });
}
function owl(rng) {
  const hoots = [{ t0: 0.05, len: 0.28, f: 360 }, { t0: 0.42, len: 0.24, f: 340 }, { t0: 0.95 + rng.float() * 0.15, len: 0.5, f: 330 }];
  const lp = new Biquad('lp', 900, 0.7);
  return oneShot(1.8, false, (chs, N) => {
    const o = chs[0]; let ph = 0;
    for (let i = 0; i < N; i++) {
      const tt = i / SR; let s = 0;
      for (const h of hoots) {
        const u = (tt - h.t0) / h.len;
        if (u < 0 || u > 1) continue;
        const f = h.f * (1.06 - 0.09 * u);
        ph += TAU * f / SR;
        const env = Math.sin(Math.PI * u) ** 0.8;
        s += (Math.sin(ph) * 0.8 + Math.sin(2 * ph) * 0.25 + Math.sin(3 * ph) * 0.06 + white(rng) * 0.05) * env;
      }
      o[i] = lp.run(s);
    }
    normalize(chs, 0.7);
  });
}
function carPass(rng) {
  const len = 3.2, dir = rng.bool() ? 1 : -1, f = 1500 + rng.float() * 700;
  const bp = new Biquad('bp', f, 1.3), lpR = new Biquad('lp', 160, 0.8), br = new Brown(rng);
  return oneShot(len, true, (chs, N) => {
    for (let i = 0; i < N; i++) {
      const u = i / N;
      const env = 0.5 - 0.5 * Math.cos(TAU * u);
      if ((i & 31) === 0) bp.set('bp', f * (1.2 - 0.4 * u), 1.4);
      const s = bp.run(white(rng)) * env * env * 1.5 + lpR.run(br.next()) * env * 0.5;
      const pan = 0.5 + 0.5 * dir * (u * 2 - 1);
      chs[0][i] = s * Math.sqrt(1 - pan); chs[1][i] = s * Math.sqrt(pan);
    }
    normalize(chs, 0.8);
  });
}
function thunder(rng) {
  const len = 6, br = [new Brown(rng), new Brown(rng)];
  const lp = [new Biquad('lp', 160, 0.9), new Biquad('lp', 150, 0.9)];
  const crack = new Biquad('bp', 900, 0.8);
  const rolls = [];
  for (let k = 0; k < 5; k++) rolls.push({ t0: 0.3 + k * 0.9 + rng.float() * 0.5, tau: 0.5 + rng.float() * 0.9, a: 0.5 + rng.float() * 0.6 });
  return oneShot(len, true, (chs, N) => {
    for (let i = 0; i < N; i++) {
      const t = i / SR;
      let env = expo(t - 0.02, 0.09) * 1.2;
      for (const r of rolls) env += (t > r.t0 ? (1 - Math.exp(-(t - r.t0) / 0.08)) * Math.exp(-(t - r.t0) / r.tau) * r.a : 0);
      const tail = 1 - smooth(len - 1.2, len, t);
      if ((i & 63) === 0) { const fc = 150 - 90 * smooth(0, 3, t); lp[0].set('lp', fc, 0.9); lp[1].set('lp', fc * 0.95, 0.9); }
      const c = crack.run(white(rng)) * expo(t - 0.02, 0.05) * 0.6;
      chs[0][i] = (lp[0].run(br[0].next()) * env + c) * tail;
      chs[1][i] = (lp[1].run(br[1].next()) * env + c * 0.8) * tail;
    }
    normalize(chs, 0.9);
  });
}

// ---------------------------------------------------------------- interface one-shots
function uiClick(rng) {
  const hp = new Biquad('hp', 1800, 0.7);
  return oneShot(0.07, false, (chs, N) => {
    const o = chs[0];
    for (let i = 0; i < N; i++) {
      const t = i / SR;
      o[i] = hp.run(white(rng)) * expo(t, 0.0025) * 0.9 + Math.sin(TAU * 1900 * t) * expo(t, 0.012) * 0.7 + Math.sin(TAU * 320 * t) * expo(t, 0.02) * 0.35;
    }
    normalize(chs, 0.75);
  });
}
function uiHover(rng) {
  return oneShot(0.04, false, (chs, N) => {
    const o = chs[0];
    for (let i = 0; i < N; i++) { const t = i / SR; o[i] = Math.sin(TAU * 2600 * t) * expo(t, 0.006) + white(rng) * expo(t, 0.001) * 0.4; }
    normalize(chs, 0.35);
  });
}
function uiSlide(up) {
  return () => oneShot(0.24, false, (chs, N) => {
    const o = chs[0]; let ph = 0;
    for (let i = 0; i < N; i++) {
      const t = i / SR, u = clamp01(t / 0.16);
      const f = up ? 620 + 330 * smooth(0, 1, u) : 900 - 320 * smooth(0, 1, u);
      ph += TAU * f / SR;
      o[i] = (Math.sin(ph) + 0.3 * Math.sin(2 * ph) + 0.08 * Math.sin(3 * ph)) * ar(t, 0.2, 0.01, 0.08);
    }
    normalize(chs, 0.55);
  });
}
function uiConfirm() {
  return oneShot(0.6, false, (chs, N) => {
    const o = chs[0];
    for (let i = 0; i < N; i++) {
      const t = i / SR;
      const bell = (f, t0) => (t < t0 ? 0 : (Math.sin(TAU * f * (t - t0)) * expo(t - t0, 0.16) + 0.5 * Math.sin(TAU * f * 2.76 * (t - t0)) * expo(t - t0, 0.05) + 0.25 * Math.sin(TAU * f * 5.4 * (t - t0)) * expo(t - t0, 0.03)));
      o[i] = bell(880, 0) + bell(1318.5, 0.09) * 0.85;
    }
    normalize(chs, 0.6);
  });
}
function uiError() {
  const lp = new Biquad('lp', 1400, 0.8);
  return oneShot(0.34, false, (chs, N) => {
    const o = chs[0]; let ph = 0;
    for (let i = 0; i < N; i++) {
      const t = i / SR;
      const on = ar(t, 0.11, 0.004, 0.03) + ar(t - 0.16, 0.13, 0.004, 0.04);
      ph += TAU * 196 / SR;
      let sq = 0; for (let h = 1; h <= 9; h += 2) sq += Math.sin(h * ph) / h;
      o[i] = lp.run(sq) * on;
    }
    normalize(chs, 0.55);
  });
}
function buildPlace(rng) {
  const grav = new Biquad('bp', 1900, 0.9), lpG = new Biquad('lp', 2600, 0.7);
  return oneShot(0.5, false, (chs, N) => {
    const o = chs[0]; let ph = 0;
    for (let i = 0; i < N; i++) {
      const t = i / SR;
      const f = 62 + 90 * expo(t, 0.03);
      ph += TAU * f / SR;
      const thud = Math.sin(ph) * expo(t, 0.085) * 1.2 + Math.sin(ph * 2.3) * expo(t, 0.03) * 0.3;
      const crackle = (rng.float() < 0.08 ? white(rng) * 2.5 : white(rng) * 0.4);
      const gravel = lpG.run(grav.run(crackle)) * expo(t - 0.01, 0.13) * 0.9;
      o[i] = thud + gravel;
    }
    normalize(chs, 0.8);
  });
}
function roadPlace(rng) {
  const lp = new Biquad('lp', 300, 0.9), br = new Brown(rng), slap = new Biquad('bp', 1200, 1.2);
  return oneShot(0.55, false, (chs, N) => {
    const o = chs[0];
    for (let i = 0; i < N; i++) {
      const t = i / SR, u = clamp01(t / 0.4);
      if ((i & 31) === 0) lp.set('lp', 220 + 800 * u, 0.9);
      const roll = lp.run(br.next() * 0.9 + white(rng) * 0.25) * ar(t, 0.42, 0.03, 0.12) * 1.2;
      const hit = slap.run(white(rng)) * expo(t - 0.4, 0.02) * 1.5;
      o[i] = roll + hit;
    }
    normalize(chs, 0.7);
  });
}
function zonePaint(rng) {
  const bp = new Biquad('bp', 1500, 1.0);
  return oneShot(0.34, false, (chs, N) => {
    const o = chs[0];
    for (let i = 0; i < N; i++) {
      const t = i / SR, u = clamp01(t / 0.3);
      if ((i & 31) === 0) bp.set('bp', 700 + 2200 * Math.sin(Math.PI * u), 1.1);
      o[i] = bp.run(white(rng)) * ar(t, 0.3, 0.06, 0.1);
    }
    normalize(chs, 0.5);
  });
}
function bulldoze(rng) {
  const lp = new Biquad('lp', 1300, 0.8), rum = new Biquad('lp', 90, 0.9), br = new Brown(rng);
  const bursts = [];
  for (let k = 0; k < 5; k++) bursts.push({ t0: 0.02 + k * 0.11 + rng.float() * 0.06, tau: 0.03 + rng.float() * 0.05, a: 0.6 + rng.float() * 0.6 });
  return oneShot(0.8, false, (chs, N) => {
    const o = chs[0];
    for (let i = 0; i < N; i++) {
      const t = i / SR;
      let env = 0; for (const b of bursts) env += expo(t - b.t0, b.tau) * b.a;
      const crunch = lp.run((rng.float() < 0.15 ? white(rng) * 2 : white(rng) * 0.5)) * env;
      o[i] = crunch + rum.run(br.next()) * ar(t, 0.7, 0.02, 0.3) * 1.4;
    }
    normalize(chs, 0.8);
  });
}
function cash() {
  const partials = [[2380, 0.09], [3720, 0.06], [5130, 0.045], [6860, 0.03], [9100, 0.02]];
  return oneShot(0.45, false, (chs, N) => {
    const o = chs[0];
    for (let i = 0; i < N; i++) {
      const t = i / SR; let s = 0;
      for (const [f, tau] of partials) s += Math.sin(TAU * f * t) * expo(t, tau) + 0.7 * Math.sin(TAU * f * 1.013 * (t - 0.09)) * expo(t - 0.09, tau);
      o[i] = s;
    }
    normalize(chs, 0.5);
  });
}
function milestone() {
  const notes = [[523.25, 0], [659.25, 0.11], [783.99, 0.22], [1046.5, 0.33]];
  return oneShot(1.6, true, (chs, N) => {
    for (let i = 0; i < N; i++) {
      const t = i / SR; let L = 0, R = 0;
      notes.forEach(([f, t0], k) => {
        const u = t - t0; if (u < 0) return;
        const env = Math.min(1, u / 0.012) * (0.55 * expo(u, 0.55) + 0.45 * (1 - smooth(0.9, 1.25, u)));
        const s = (Math.sin(TAU * f * u) + 0.4 * Math.sin(TAU * 2 * f * u) * expo(u, 0.4) + 0.18 * Math.sin(TAU * 3 * f * u) * expo(u, 0.25)) * env;
        const pan = 0.3 + 0.4 * (k / 3);
        L += s * Math.sqrt(1 - pan); R += s * Math.sqrt(pan);
      });
      const shimmer = Math.sin(TAU * 2093 * t) * expo(t - 0.36, 0.5) * 0.12;
      chs[0][i] = L + shimmer; chs[1][i] = R + shimmer;
    }
    normalize(chs, 0.6);
  });
}

// ---------------------------------------------------------------- catalogue
/**
 * Every sound the module knows. group: 'ambient' (looping bed mixed by the module), 'world' (positional
 * one-shots the scheduler and other modules trigger), 'ui' (interface feedback). gain = default level.
 */
export const CATALOGUE = [
  { name: 'wind',        group: 'ambient', label: 'Wind',            desc: 'Gusting pink noise, low-pass tracks the gust; faint whistle at the peaks',   gen: wind,      loop: true, gain: 0.8 },
  { name: 'leaves',      group: 'ambient', label: 'Leaves',          desc: 'High-band rustle with flutter modulation, follows the wind gusts',           gen: leaves,    loop: true, gain: 0.55 },
  { name: 'traffic',     group: 'ambient', label: 'Traffic',     desc: 'Brown-noise rumble, tyre hiss, engine drone and three doppler passes',       gen: traffic,   loop: true, gain: 0.7 },
  { name: 'crickets',    group: 'ambient', label: 'Crickets',        desc: 'Six pulsed 4 kHz voices with chirp patterns, panned across the field',        gen: crickets,  loop: true, gain: 0.6 },
  { name: 'rain',        group: 'ambient', label: 'Rain',            desc: 'Band-limited sheet noise, roof rumble and 45 ringing droplets per second',   gen: rain,      loop: true, gain: 0.85 },
  { name: 'bird_robin',  group: 'world',   label: 'Robin',           desc: 'Warbled phrase of FM-glided notes with vibrato',                             gen: birdRobin, gain: 0.55 },
  { name: 'bird_finch',  group: 'world',   label: 'Finch',           desc: 'Fast rising trill of short chirps',                                          gen: birdFinch, gain: 0.45 },
  { name: 'bird_crow',   group: 'world',   label: 'Crow',            desc: 'Two formant-filtered pulse-train caws',                                      gen: birdCrow,  gain: 0.5 },
  { name: 'owl',         group: 'world',   label: 'Owl',             desc: 'Three soft low hoots with breath noise',                                     gen: owl,       gain: 0.55 },
  { name: 'car_pass',    group: 'world',   label: 'Car pass',        desc: 'Doppler-swept tyre noise panned across the stereo field',                    gen: carPass,   gain: 0.6 },
  { name: 'thunder',     group: 'world',   label: 'Thunder',         desc: 'Crack followed by five rolling low-passed rumbles',                          gen: thunder,   gain: 0.8 },
  { name: 'ui_click',    group: 'ui',      label: 'Click',           desc: 'Noise transient, 1.9 kHz ping and a soft knock',                             gen: uiClick,   gain: 0.6 },
  { name: 'ui_hover',    group: 'ui',      label: 'Hover',           desc: 'Tiny 2.6 kHz tick',                                                          gen: uiHover,   gain: 0.35 },
  { name: 'ui_open',     group: 'ui',      label: 'Open',      desc: 'Rising two-harmonic glide',                                                  gen: uiSlide(true),  gain: 0.5 },
  { name: 'ui_close',    group: 'ui',      label: 'Close',     desc: 'Falling two-harmonic glide',                                                 gen: uiSlide(false), gain: 0.5 },
  { name: 'ui_confirm',  group: 'ui',      label: 'Confirm',         desc: 'Bell pair a fifth apart with inharmonic partials',                           gen: uiConfirm, gain: 0.55 },
  { name: 'ui_error',    group: 'ui',      label: 'Error',           desc: 'Double low buzz of odd harmonics',                                           gen: uiError,   gain: 0.5 },
  { name: 'build_place', group: 'ui',      label: 'Build',  desc: 'Pitch-dropping thud with a gravel scatter',                                  gen: buildPlace, gain: 0.7 },
  { name: 'road_place',  group: 'ui',      label: 'Lay road',        desc: 'Roller sweep with a slap at the end',                                        gen: roadPlace, gain: 0.6 },
  { name: 'zone_paint',  group: 'ui',      label: 'Paint zone',      desc: 'Soft band-pass brush swish',                                                 gen: zonePaint, gain: 0.5 },
  { name: 'bulldoze',    group: 'ui',      label: 'Bulldoze',        desc: 'Five crunch bursts over a low rumble',                                       gen: bulldoze,  gain: 0.7 },
  { name: 'cash',        group: 'ui',      label: 'Cash',            desc: 'Two metallic coin clinks',                                                   gen: cash,      gain: 0.5 },
  { name: 'milestone',   group: 'ui',      label: 'Milestone',       desc: 'C-major arpeggio fanfare with a sustained chord',                            gen: milestone, gain: 0.6 },
];

/** Render one catalogue entry with its own RNG fork: {name, group, label, desc, loop, gain, sampleRate, channels, seconds}. */
export function renderOne(e, rng, log) {
  let channels;
  try { channels = e.gen(rng.fork(`synth/${e.name}`)); }
  catch (err) { log?.error?.(`synth "${e.name}" failed: ${err?.message}`, err); channels = [new Float32Array(SR / 10)]; }
  return { name: e.name, group: e.group, label: e.label, desc: e.desc, loop: !!e.loop, gain: e.gain, sampleRate: SR, channels, seconds: channels[0].length / SR };
}
/** Render every catalogue entry synchronously. Returns Map<name, sound>. */
export function renderCatalogue(rng, log) {
  const out = new Map();
  for (const e of CATALOGUE) out.set(e.name, renderOne(e, rng, log));
  return out;
}
