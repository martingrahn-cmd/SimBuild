#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const expected = {
  // Browser-engine reference rendered synchronously from the pre-R20 catalogue at commit a1c89fc.
  1337: 'e81aaf8e2fa94c527015db03e5ad552c700cf85326db29844ea75e3d26e3fc5d',
};
const result = { base, errors: [], readyMs: null, preparedMs: null, moduleInitMs: null, sounds: 0, sha256: null, expectedSha256: expected[1337], enabled: false, uiPlay: false, settingsExact: false, showcasePrepared: false, showcasePanel: false, showcaseSounds: 0, pass: false };
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu', '--ignore-gpu-blocklist', '--no-sandbox'],
});

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', (error) => result.errors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') result.errors.push(message.text()); });
  await page.goto(`${base}/?mode=play&seed=1337`, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForFunction(() => window.__sim?.registry?.apis?.audio, null, { timeout: 240000 });
  await page.waitForFunction(() => document.getElementById('boot')?.classList.contains('hidden'), null, { timeout: 240000 });
  result.readyMs = await page.evaluate(() => performance.now());
  result.moduleInitMs = await page.evaluate(() => window.__sim.modulesStatus().audio.initMs);
  await page.waitForFunction(() => window.__sim.registry.apis.audio.isPrepared(), null, { timeout: 30000 });
  result.preparedMs = await page.evaluate(() => performance.now());
  const audio = await page.evaluate(async () => {
    const api = window.__sim.registry.apis.audio;
    const sounds = api.sounds().sort((a, b) => a.name.localeCompare(b.name));
    const encoder = new TextEncoder();
    let bytes = 0;
    for (const meta of sounds) {
      bytes += encoder.encode(meta.name).byteLength;
      const sound = api.getBuffer(meta.name);
      for (const channel of sound.channels) bytes += channel.byteLength;
    }
    const joined = new Uint8Array(bytes);
    let offset = 0;
    for (const meta of sounds) {
      const name = encoder.encode(meta.name); joined.set(name, offset); offset += name.byteLength;
      const sound = api.getBuffer(meta.name);
      for (const channel of sound.channels) {
        joined.set(new Uint8Array(channel.buffer, channel.byteOffset, channel.byteLength), offset);
        offset += channel.byteLength;
      }
    }
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', joined));
    return { sounds: sounds.length, sha256: [...digest].map((v) => v.toString(16).padStart(2, '0')).join('') };
  });
  result.sounds = audio.sounds; result.sha256 = audio.sha256;

  await page.mouse.click(1425, 885);
  await page.waitForFunction(() => window.__sim.registry.apis.audio.isEnabled(), null, { timeout: 10000 });
  result.enabled = true;
  result.uiPlay = await page.evaluate(() => window.__sim.registry.apis.audio.play('ui_click'));
  result.settingsExact = await page.evaluate(() => {
    const api = window.__sim.registry.apis.audio;
    const before = api.serialize();
    api.setMasterVolume(0.37); api.setBusVolume('ambient', 0.42); api.mute(true);
    const saved = api.serialize();
    api.deserialize(saved);
    const after = api.serialize();
    api.deserialize(before);
    return JSON.stringify(saved) === JSON.stringify(after);
  });
  await page.close();

  const showcase = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  showcase.on('pageerror', (error) => result.errors.push(`showcase: ${String(error)}`));
  showcase.on('console', (message) => { if (message.type() === 'error') result.errors.push(`showcase: ${message.text()}`); });
  await showcase.goto(`${base}/?showcase=audio&headless=1&speed=0&time=12&camera=bandstand&seed=1337`, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await showcase.waitForFunction(() => window.__sim?.registry?.apis?.audio?.isPrepared(), null, { timeout: 240000 });
  await showcase.waitForSelector('.au-panel', { timeout: 30000 });
  const showcaseState = await showcase.evaluate(() => ({
    prepared: window.__sim.registry.apis.audio.isPrepared(),
    sounds: window.__sim.registry.apis.audio.sounds().length,
    panel: !!document.querySelector('.au-panel'),
  }));
  result.showcasePrepared = showcaseState.prepared;
  result.showcasePanel = showcaseState.panel;
  result.showcaseSounds = showcaseState.sounds;
  await showcase.close();
} catch (error) {
  result.errors.push(String(error?.stack || error));
} finally {
  await browser.close();
}

result.pass = result.errors.length === 0 && result.moduleInitMs < 80 && result.sounds === 23 && result.sha256 === result.expectedSha256 && result.enabled && result.uiPlay && result.settingsExact && result.showcasePrepared && result.showcasePanel && result.showcaseSounds === 23;
fs.mkdirSync('shots/playtest-fixes-r20', { recursive: true });
fs.writeFileSync('shots/playtest-fixes-r20/audio-deferred-startup.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
