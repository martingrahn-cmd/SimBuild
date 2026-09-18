#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.SIM_URL || 'http://127.0.0.1:5180';
const expectedSha256 = '387862b1a9de129bc79d79aab394e1b3dd54c58873258734fd88071b9718bba0';
const result = { base, errors: [], runsMs: [], medianMs: null, sha256: null, expectedSha256, textureHashes: {}, pass: false };
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu', '--ignore-gpu-blocklist', '--no-sandbox'],
});

try {
  const page = await browser.newPage();
  page.on('pageerror', (error) => result.errors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') result.errors.push(message.text()); });
  await page.route('**/__props_texture_probe__', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body></body></html>' }));
  await page.goto(`${base}/__props_texture_probe__`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const measured = await page.evaluate(async () => {
    const { buildTextures } = await import('/src/modules/props/textures.js');
    const { RNG } = await import('/src/core/rng.js');
    const names = ['leaf', 'impostor', 'bark', 'glow', 'signs', 'furAlbedo', 'detail'];
    const runs = []; let sha256 = null; const textureHashes = {};
    for (let run = 0; run < 5; run++) {
      const t0 = performance.now();
      const textures = buildTextures(new RNG(1337, 'props').fork('tex'), 8, 'high');
      runs.push(performance.now() - t0);
      if (run === 0) {
        const encoder = new TextEncoder(), parts = []; let bytes = 0;
        for (const name of names) {
          const canvas = textures[name].image;
          const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
          const label = encoder.encode(name); parts.push(label, pixels); bytes += label.byteLength + pixels.byteLength;
          const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', pixels));
          textureHashes[name] = [...digest].map((v) => v.toString(16).padStart(2, '0')).join('');
        }
        const joined = new Uint8Array(bytes); let offset = 0;
        for (const part of parts) { joined.set(part, offset); offset += part.byteLength; }
        const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', joined));
        sha256 = [...digest].map((v) => v.toString(16).padStart(2, '0')).join('');
      }
      for (const value of Object.values(textures)) {
        if (value?.dispose) value.dispose();
        else if (value && typeof value === 'object') for (const child of Object.values(value)) child?.dispose?.();
      }
    }
    return { runs, sha256, textureHashes };
  });
  result.runsMs = measured.runs.map((value) => +value.toFixed(1));
  result.medianMs = result.runsMs.slice().sort((a, b) => a - b)[Math.floor(result.runsMs.length / 2)];
  result.sha256 = measured.sha256;
  result.textureHashes = measured.textureHashes;
} catch (error) {
  result.errors.push(String(error?.stack || error));
} finally {
  await browser.close();
}

result.pass = result.errors.length === 0 && result.sha256 === result.expectedSha256;
fs.mkdirSync('shots/playtest-fixes-r21', { recursive: true });
fs.writeFileSync('shots/playtest-fixes-r21/props-texture-dilation.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
