// WebAudio graph. Constructed ONLY by enable() after a user gesture, never in headless mode (the module
// guards that before calling). Graph: layers/one-shots -> bus gains (ambient, world, ui) -> master -> out.
// Every ambient bed is a looping BufferSource through a lowpass (zoom muffling) and a gain; the module
// drives targets with setTargetAtTime so nothing clicks. One-shots are positional via StereoPanner.
const RAMP = 0.12;
const MAX_VOICES = 18;

export class Mixer {
  constructor(sounds, log) {
    this.sounds = sounds;           // Map<name, {channels, sampleRate, loop, gain}>
    this.log = log;
    this.ctx = null;
    this.master = null;
    this.bus = { ambient: null, world: null, ui: null };
    this.busLevel = { ambient: 1, world: 1, ui: 1 };
    this.layers = new Map();        // name -> {src, filter, gain, level}
    this.buffers = new Map();
    this.voices = [];               // active one-shots {gain, src, level, t0}
    this.masterLevel = 0.8;
    this.muted = false;
    this.enabled = false;
    this.onVoiceEnd = null;
    this._duck = 1;
  }

  /** Create the context; resolves true when running. Safe to call repeatedly. */
  async enable() {
    if (this.enabled && this.ctx) {
      if (this.ctx.state !== 'running') { try { await this.ctx.resume(); } catch (e) { /* needs another gesture */ } }
      return this.ctx.state === 'running';
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { this.log?.warn('WebAudio unavailable in this browser'); return false; }
    let ctx;
    try { ctx = new AC({ latencyHint: 'playback' }); } catch (e) { this.log?.warn(`AudioContext failed: ${e?.message}`); return false; }
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this._masterGain();
    // gentle safety limiter so stacked one-shots never clip
    let tail = this.master;
    if (ctx.createDynamicsCompressor) {
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -9; comp.knee.value = 12; comp.ratio.value = 6; comp.attack.value = 0.004; comp.release.value = 0.18;
      this.master.connect(comp); tail = comp;
    }
    tail.connect(ctx.destination);
    for (const b of Object.keys(this.bus)) { const g = ctx.createGain(); g.gain.value = this.busLevel[b]; g.connect(this.master); this.bus[b] = g; }
    for (const s of this.sounds.values()) this._buffer(s);
    for (const s of this.sounds.values()) if (s.loop) this._startLayer(s);
    this.enabled = true;
    try { await ctx.resume(); } catch (e) { /* ignore */ }
    return ctx.state === 'running';
  }

  _buffer(s) {
    if (this.buffers.has(s.name)) return this.buffers.get(s.name);
    const b = this.ctx.createBuffer(s.channels.length, s.channels[0].length, s.sampleRate);
    for (let c = 0; c < s.channels.length; c++) b.copyToChannel(s.channels[c], c);
    this.buffers.set(s.name, b);
    return b;
  }
  _startLayer(s) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this._buffer(s); src.loop = true;
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 8000; filter.Q.value = 0.5;
    const gain = ctx.createGain(); gain.gain.value = 0;
    src.connect(filter); filter.connect(gain); gain.connect(this.bus.ambient);
    src.start(0, s.seconds * (this.layers.size * 0.37 % 1));   // de-phase the loops
    this.layers.set(s.name, { src, filter, gain, level: 0, cutoff: 8000 });
  }

  _masterGain() { return this.muted ? 0 : this.masterLevel * this.masterLevel * this._duck; }
  _applyMaster() { if (this.master) this.master.gain.setTargetAtTime(this._masterGain(), this.ctx.currentTime, 0.05); }
  setMasterVolume(v) { this.masterLevel = Math.min(1, Math.max(0, +v || 0)); this._applyMaster(); }
  setMuted(m) { this.muted = !!m; this._applyMaster(); }
  /** 0..1 attenuation when the tab is hidden */
  setDuck(d) { this._duck = d; this._applyMaster(); }
  setBusVolume(name, v) {
    if (!(name in this.busLevel)) return;
    this.busLevel[name] = Math.min(1, Math.max(0, +v || 0));
    const g = this.bus[name]; if (g) g.gain.setTargetAtTime(this.busLevel[name], this.ctx.currentTime, 0.05);
  }

  /** Drive an ambient bed. level 0..1 (linear gain scaled by the sound's default gain), cutoff Hz. */
  setLayer(name, level, cutoff) {
    const l = this.layers.get(name);
    if (!l) return;
    const s = this.sounds.get(name);
    const g = Math.max(0, level) * s.gain;
    if (Math.abs(g - l.level) > 0.002) { l.level = g; l.gain.gain.setTargetAtTime(g, this.ctx.currentTime, RAMP); }
    if (cutoff && Math.abs(cutoff - l.cutoff) > cutoff * 0.03) { l.cutoff = cutoff; l.filter.frequency.setTargetAtTime(cutoff, this.ctx.currentTime, RAMP); }
  }

  /** Fire a one-shot. opts: {volume 0..1, pan -1..1, rate, bus, delay} */
  play(name, opts) {
    if (!this.enabled || !this.ctx) return false;
    const s = this.sounds.get(name);
    if (!s) return false;
    const volume = opts?.volume ?? 1, pan = opts?.pan ?? 0, rate = opts?.rate ?? 1;
    if (volume <= 0.003) return false;
    if (this.voices.length >= MAX_VOICES) {
      let k = 0; for (let i = 1; i < this.voices.length; i++) if (this.voices[i].level < this.voices[k].level) k = i;
      if (this.voices[k].level >= volume) return false;
      try { this.voices[k].src.stop(); } catch (e) { /* ignore */ }
      this.voices.splice(k, 1);
    }
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this._buffer(s);
    src.playbackRate.value = rate;
    const gain = ctx.createGain(); gain.gain.value = volume * s.gain;
    let head = src;
    if (ctx.createStereoPanner && Math.abs(pan) > 0.01) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); src.connect(p); head = p; }
    head.connect(gain);
    const busName = opts?.bus || (s.group === 'ui' ? 'ui' : s.group === 'ambient' ? 'ambient' : 'world');
    gain.connect(this.bus[busName] || this.bus.world);
    const voice = { src, gain, level: volume, name };
    this.voices.push(voice);
    src.onended = () => {
      const i = this.voices.indexOf(voice); if (i >= 0) this.voices.splice(i, 1);
      try { src.disconnect(); gain.disconnect(); } catch (e) { /* ignore */ }
      this.onVoiceEnd?.(name);
    };
    src.start(ctx.currentTime + (opts?.delay || 0));
    return true;
  }

  get state() { return this.ctx ? this.ctx.state : 'off'; }
  get sampleRate() { return this.ctx ? this.ctx.sampleRate : 0; }
  async suspend() { if (this.ctx && this.ctx.state === 'running') { try { await this.ctx.suspend(); } catch (e) { /* ignore */ } } }
  async resume() { if (this.ctx && this.ctx.state === 'suspended') { try { await this.ctx.resume(); } catch (e) { /* ignore */ } } }

  dispose() {
    for (const v of this.voices) { try { v.src.stop(); } catch (e) { /* ignore */ } }
    this.voices.length = 0;
    for (const l of this.layers.values()) { try { l.src.stop(); } catch (e) { /* ignore */ } }
    this.layers.clear();
    this.buffers.clear();
    if (this.ctx) { try { this.ctx.close(); } catch (e) { /* ignore */ } }
    this.ctx = null; this.master = null; this.enabled = false;
  }
}
