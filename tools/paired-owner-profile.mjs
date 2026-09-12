#!/usr/bin/env node
// Bracket a temporary owner visibility mask with two same-page controls.
// This is diagnostic-only: it restores visibility and removes its event listener.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const out = process.env.OUT_FILE || 'shots/democity/paired-owner-profile.json';
const camera = process.env.CAMERA || 'interchange';
const time = Number(process.env.TIME || 22);
const speed = Number(process.env.SPEED || 0);
const sampleFrames = Number(process.env.SAMPLE_FRAMES || 180);
const warmFrames = Number(process.env.WARM_FRAMES || 45);
const owners = (process.env.OWNERS || 'terrain,props,roads,services,buildings,traffic,transit').split(',').filter(Boolean);
const executablePath = process.env.SIM_CHROME || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  chromium.executablePath(),
].find(path => fs.existsSync(path));

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--use-angle=metal', '--use-gl=angle', '--enable-webgl', '--enable-gpu', '--ignore-gpu-blocklist', '--no-sandbox', '--window-size=1920,1080'],
});
const result = {
  method: 'same-page A-B-A owner visibility mask; masked B is compared with the mean of bracketing A controls',
  url: base,
  camera,
  time,
  speed,
  warmFrames,
  sampleFrames,
  owners: [],
};

try {
  for (const owner of owners) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const browserErrors = [];
    page.on('pageerror', error => browserErrors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()); });
    await page.route('**/@vite/client', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await page.goto(`${base}/?showcase=democity&time=${time}&camera=${camera}&seed=1337&quality=high&headless=1&speed=${speed}`, { waitUntil: 'domcontentloaded', timeout: 240000 });
    await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });

    const measurements = await page.evaluate(async ({ owner, sampleFrames, warmFrames }) => {
      const sim = window.__sim;
      const propsPools = owner === 'props:pools';
      const propsLod2 = owner === 'props:lod2';
      const propsTrees = owner === 'props:trees';
      const propsKind = owner.startsWith('props:') && !propsPools && !propsLod2 && !propsTrees ? owner.slice(6) : null;
      const propsTarget = propsPools || propsLod2 || propsTrees || propsKind;
      const group = sim.registry.get(propsTarget ? 'props' : owner)?.group;
      if (!group) throw new Error(`Missing owner group: ${owner}`);
      let maskActive = false;
      const listenerOwner = `paired-owner-profile:${owner}`;
      if (owner === 'props') {
        sim.events.on('water:reflection', ({ active }) => {
          if (!active && maskActive) group.visible = false;
        }, listenerOwner);
      }

      async function waitFrames(count) {
        const start = sim.engine.stats.frames;
        while (sim.engine.stats.frames < start + count) await new Promise(requestAnimationFrame);
      }

      async function sample(label, masked) {
        maskActive = masked;
        if (propsPools) sim.registry.apis.props.debug.setPools(!masked);
        else if (propsLod2) sim.registry.apis.props.debug.setLod(masked ? 2 : null);
        else if (propsTrees) {
          sim.registry.apis.props.debug.setKindVisible('tree_oak', !masked);
          sim.registry.apis.props.debug.setKindVisible('tree_pine', !masked);
        } else if (propsKind) sim.registry.apis.props.debug.setKindVisible(propsKind, !masked);
        else group.visible = !masked;
        await waitFrames(warmFrames);
        const startFrame = sim.engine.stats.frames;
        const startedAt = performance.now();
        let lastFrame = startFrame;
        let sampledFrames = 0;
        let samples = 0;
        const sums = { drawCalls: 0, triangles: 0 };
        const max = { drawCalls: 0, triangles: 0 };
        const min = { drawCalls: Infinity, triangles: Infinity };
        while (sim.engine.stats.frames < startFrame + sampleFrames) {
          await new Promise(requestAnimationFrame);
          const frame = sim.engine.stats.frames;
          if (frame === lastFrame) continue;
          const stats = sim.stats();
          sampledFrames += frame - lastFrame;
          lastFrame = frame;
          samples++;
          for (const key of ['drawCalls', 'triangles']) {
            sums[key] += stats[key];
            max[key] = Math.max(max[key], stats[key]);
            min[key] = Math.min(min[key], stats[key]);
          }
        }
        const elapsedMs = performance.now() - startedAt;
        return {
          label,
          masked,
          fps: sampledFrames / (elapsedMs / 1000),
          elapsedMs,
          sampledFrames,
          samples,
          average: { drawCalls: sums.drawCalls / samples, triangles: sums.triangles / samples },
          min,
          max,
          groupVisibleAtEnd: group.visible,
          errors: sim.errors.slice(),
        };
      }

      try {
        const baselineBefore = await sample('baseline-before', false);
        const masked = await sample('owner-hidden', true);
        const baselineAfter = await sample('baseline-after', false);
        return { baselineBefore, masked, baselineAfter };
      } finally {
        maskActive = false;
        group.visible = true;
        if (propsPools) sim.registry.apis.props.debug.setPools(true);
        else if (propsLod2) sim.registry.apis.props.debug.setLod(null);
        else if (propsTrees) {
          sim.registry.apis.props.debug.setKindVisible('tree_oak', true);
          sim.registry.apis.props.debug.setKindVisible('tree_pine', true);
        } else if (propsKind) sim.registry.apis.props.debug.setKindVisible(propsKind, true);
        sim.events.offOwner(listenerOwner);
      }
    }, { owner, sampleFrames, warmFrames });

    const { baselineBefore, masked, baselineAfter } = measurements;
    const expectedBaseline = {
      fps: (baselineBefore.fps + baselineAfter.fps) / 2,
      drawCalls: (baselineBefore.average.drawCalls + baselineAfter.average.drawCalls) / 2,
      triangles: (baselineBefore.average.triangles + baselineAfter.average.triangles) / 2,
    };
    const driftPct = Math.abs(baselineAfter.fps - baselineBefore.fps) / expectedBaseline.fps * 100;
    const delta = {
      fps: masked.fps - expectedBaseline.fps,
      fpsPct: (masked.fps / expectedBaseline.fps - 1) * 100,
      drawCalls: masked.average.drawCalls - expectedBaseline.drawCalls,
      triangles: masked.average.triangles - expectedBaseline.triangles,
    };
    result.owners.push({ owner, ...measurements, expectedBaseline, delta, baselineDriftPct: driftPct, timingStable: driftPct <= 5, browserErrors });
    await page.close();
  }
  result.pass = result.owners.every(row => row.timingStable && row.browserErrors.length === 0 && [row.baselineBefore, row.masked, row.baselineAfter].every(sample => sample.errors.length === 0));
  fs.mkdirSync(out.split('/').slice(0, -1).join('/') || '.', { recursive: true });
  fs.writeFileSync(out, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
