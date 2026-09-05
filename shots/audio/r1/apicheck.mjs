// Critic API-contract probe for the audio module (throwaway). Run: node shots/audio/r1/apicheck.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';

const url = 'http://127.0.0.1:5173/?showcase=audio&headless=1&time=12';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [], warnings = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 500)); else if (m.type() === 'warning') warnings.push(m.text().slice(0, 300)); });
page.on('pageerror', (e) => errors.push('pageerror: ' + String(e?.stack || e).slice(0, 500)));
// instrument AudioContext construction BEFORE any script runs
await page.addInitScript(() => {
  window.__acCount = 0;
  for (const k of ['AudioContext', 'webkitAudioContext', 'OfflineAudioContext']) {
    const Orig = window[k]; if (!Orig) continue;
    window[k] = new Proxy(Orig, { construct(t, a) { window.__acCount++; return Reflect.construct(t, a); } });
  }
});
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForFunction(() => window.__sim && window.__sim.ready === true, null, { timeout: 120000, polling: 100 });
await page.waitForTimeout(500);
const r = await page.evaluate(async () => {
  const sim = window.__sim; const reg = sim.registry || sim.engine?.registry;
  const api = sim.modules?.audio || sim.registry?.apis?.audio || (reg && reg.apis && reg.apis.audio);
  const out = { acCount: window.__acCount, hasApi: !!api };
  if (!api) return out;
  out.fns = {}; for (const k of ['play', 'mute', 'setMasterVolume', 'enable', 'getMix', 'sounds', 'serialize', 'deserialize', 'unmute', 'isMuted', 'state']) out.fns[k] = typeof api[k];
  out.state = api.state();
  out.enableResult = await api.enable();
  out.acCountAfterEnable = window.__acCount;
  out.playResult = api.play('ui_click');
  out.playUnknown = api.play('nope_not_a_sound');
  out.playPositional = api.play('bird_robin', { x: 0, z: 0, volume: 1 });
  out.mute = api.mute(true); out.isMuted = api.isMuted(); out.unmute = api.mute(false);
  out.setVol = api.setMasterVolume(0.37); out.getVol = api.getMasterVolume();
  out.setVolClamp = api.setMasterVolume(7); out.setVolNaN = api.setMasterVolume('abc');
  api.setMasterVolume(0.8);
  out.sounds = api.sounds().length;
  out.soundNames = api.sounds().map((s) => s.name);
  const mix = api.getMix(); out.mix = { wind: +mix.wind.toFixed(3), leaves: +mix.leaves.toFixed(3), traffic: +mix.traffic.toFixed(3), crickets: +mix.crickets.toFixed(3), rain: +mix.rain.toFixed(3), birdRate: +mix.birdRate.toFixed(3), factors: { ...mix.factors } };
  // event listener: audio:play
  const ev = sim.events; out.hasEvents = !!ev;
  if (ev) {
    const names = typeof ev.listenerCount === 'function' ? ev.listenerCount('audio:play') : (ev.listeners?.get?.('audio:play')?.length ?? ev._listeners?.['audio:play']?.length ?? 'unknown');
    out.audioPlayListeners = names;
    ev.emit('audio:play', { sound: 'ui_confirm', x: 10, z: 10, volume: 0.9 });
    ev.emit('ui:action', { action: 'pause' });
  }
  // events log in panel
  const log = document.querySelector('.au-log'); out.panelLog = log ? log.textContent : null;
  out.panelPresent = !!document.querySelector('.au-panel'); out.rows = document.querySelectorAll('.au-row').length;
  out.pill = document.querySelector('.au-pill')?.textContent;
  out.panelHeight = document.querySelector('.au-panel')?.getBoundingClientRect().height;
  out.bodyScroll = (() => { const b = document.querySelector('.au-body'); return b ? { sh: b.scrollHeight, ch: b.clientHeight } : null; })();
  // determinism: hash of a buffer
  const b = api.getBuffer('bird_robin'); let h = 0; for (let i = 0; i < b.channels[0].length; i++) { h = (h * 31 + Math.round(b.channels[0][i] * 1e6)) | 0; } out.robinHash = h; out.robinLen = b.channels[0].length;
  const w = api.getBuffer('wind'); let hw = 0; for (let i = 0; i < w.channels[0].length; i += 7) { hw = (hw * 31 + Math.round(w.channels[0][i] * 1e6)) | 0; } out.windHash = hw;
  // loop seam check: |first - last| sample on each loop
  out.seams = {}; for (const n of ['wind', 'leaves', 'traffic', 'crickets', 'rain']) { const s = api.getBuffer(n); const c = s.channels[0]; out.seams[n] = +Math.abs(c[0] - c[c.length - 1]).toFixed(4); }
  // peak & rms per sound
  out.levels = {}; for (const s of api.sounds()) { const bb = api.getBuffer(s.name); let pk = 0, sq = 0; const c = bb.channels[0]; for (let i = 0; i < c.length; i++) { const a = Math.abs(c[i]); if (a > pk) pk = a; sq += c[i] * c[i]; } out.levels[s.name] = { peak: +pk.toFixed(3), rms: +Math.sqrt(sq / c.length).toFixed(3), sec: +s.seconds.toFixed(2) }; }
  // serialize roundtrip
  out.ser = api.serialize(); api.deserialize({ master: 0.5, muted: true, bus: { ui: 0.2 } }); out.ser2 = api.serialize(); api.deserialize({ master: 0.8, muted: false, bus: { ui: 1 } });
  out.status = reg?.modules?.get?.('audio')?.status ?? sim.stats?.()?.modules?.audio?.status;
  out.stats = sim.stats ? sim.stats() : null;
  out.acCountEnd = window.__acCount;
  return out;
});
await page.waitForTimeout(1500);
const r2 = await page.evaluate(() => { const log = document.querySelector('.au-log'); return { panelLog: log ? log.textContent : null, acCount: window.__acCount }; });
const result = { ...r, after1500ms: r2, errors, warnings: warnings.slice(0, 20) };
fs.writeFileSync('shots/audio/r1/apicheck.out.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
await browser.close();
