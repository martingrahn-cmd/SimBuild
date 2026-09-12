#!/usr/bin/env node
// Verify the allocation-free Traffic signal key against public signal state and rendered Props lenses.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const out = process.env.OUT_FILE || 'shots/democity/traffic-signal-key-probe.json';
const hours = (process.env.HOURS || '0,0.025,0.05,0.075,0.1,0.475,0.5,0.525,0.575,0.6,0.675,1.075,1.1,1.125,1.175,1.2').split(',').map(Number);
const executablePath = process.env.SIM_CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', chromium.executablePath()].find(path => fs.existsSync(path));
const browser = await chromium.launch({ executablePath, headless: true, args: ['--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu', '--ignore-gpu-blocklist', '--no-sandbox'] });

try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const browserErrors = [];
  page.on('pageerror', error => browserErrors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()); });
  await page.route('**/@vite/client', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto(`${base}/?showcase=democity&time=0&camera=interchange&seed=1337&quality=high&headless=1&speed=0`, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });
  const result = await page.evaluate(async hours => {
    const sim = window.__sim;
    const traffic = sim.registry.apis.traffic;
    const props = sim.registry.apis.props;
    const waitFrames = async count => {
      const start = sim.engine.stats.frames;
      while (sim.engine.stats.frames < start + count) await new Promise(requestAnimationFrame);
    };
    const hashFloats = array => {
      const words = new Uint32Array(array.buffer, array.byteOffset, array.byteLength / 4);
      let hash = 2166136261;
      for (const word of words) { hash ^= word; hash = Math.imul(hash, 16777619); }
      return hash >>> 0;
    };
    const sample = async hour => {
      sim.world.time.hour = hour;
      await waitFrames(2);
      const signals = traffic.signals().map(signal => ({ nodeId: signal.nodeId, phase: signal.phase, greenArms: signal.greenArms }));
      // Each signal arm carries two three-aspect heads (see props SIGNAL_HEADS).
      const expectedLenses = props.signals().reduce((sum, signal) => sum + signal.armStates.length * 6, 0);
      let lens = null;
      sim.registry.get('props').group.traverse(mesh => {
        if (mesh.isInstancedMesh && mesh.count === expectedLenses && mesh.instanceColor) lens = mesh;
      });
      const key = traffic.signalKey();
      return {
        hour,
        key,
        repeatKey: traffic.signalKey(),
        signalDigest: JSON.stringify(signals),
        expectedLenses,
        lensCount: lens?.count ?? null,
        lensColorDigest: lens?.instanceColor ? hashFloats(lens.instanceColor.array) : null,
      };
    };
    const first = [];
    for (const hour of hours) first.push(await sample(hour));
    const second = [];
    for (const hour of hours) second.push(await sample(hour));
    const mutationSample = traffic.signals()[0];
    const originalLength = mutationSample?.greenArms.length ?? 0;
    mutationSample?.greenArms.push(-999);
    const defensiveCopy = (traffic.signalState(mutationSample?.nodeId)?.greenArms.includes(-999) ?? false) === false;
    const transitions = [];
    for (let i = 1; i < first.length; i++) {
      const stateChanged = first[i].signalDigest !== first[i - 1].signalDigest;
      transitions.push({ from: first[i - 1].hour, to: first[i].hour, stateChanged, keyChanged: first[i].key !== first[i - 1].key });
    }
    return {
      signalKeyType: typeof traffic.signalKey,
      first,
      second,
      exactRepeat: JSON.stringify(first) === JSON.stringify(second),
      transitionAgreement: transitions.every(row => row.stateChanged === row.keyChanged),
      transitions,
      defensiveCopy,
      mutationSampleOriginalLength: originalLength,
      errors: sim.errors.slice(),
    };
  }, hours);
  result.browserErrors = browserErrors;
  result.pass = result.signalKeyType === 'function' && result.exactRepeat && result.transitionAgreement && result.defensiveCopy && result.first.every(row => row.key === row.repeatKey && row.lensCount === row.expectedLenses && row.lensColorDigest !== null) && result.errors.length === 0 && browserErrors.length === 0;
  fs.mkdirSync(out.split('/').slice(0, -1).join('/') || '.', { recursive: true });
  fs.writeFileSync(out, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ pass: result.pass, signalKeyType: result.signalKeyType, exactRepeat: result.exactRepeat, transitionAgreement: result.transitionAgreement, defensiveCopy: result.defensiveCopy, transitions: result.transitions, lensCounts: [...new Set(result.first.map(row => row.lensCount))], errors: result.errors, browserErrors }, null, 2));
} finally {
  await browser.close();
}
