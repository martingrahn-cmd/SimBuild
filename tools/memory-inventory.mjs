#!/usr/bin/env node
// Inventory retained CPU-side geometry/texture buffers by module after forced GC.
// This diagnoses backing-store ownership; it does not mutate game state.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const out = process.env.OUT_DIR || 'shots/democity/memory-inventory';
const restageSeed = process.env.RESTAGE_SEED === undefined ? null : Number(process.env.RESTAGE_SEED);
const executablePath = process.env.SIM_CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', chromium.executablePath()].find(p => fs.existsSync(p));
const browser = await chromium.launch({ executablePath, headless: true, args: ['--use-angle=metal','--use-gl=angle','--enable-webgl','--enable-gpu','--ignore-gpu-blocklist','--no-sandbox','--window-size=1920,1080'] });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } }), browserErrors = [];
  page.on('pageerror', e => browserErrors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') browserErrors.push(m.text()); });
  await page.route('**/@vite/client', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto(`${base}/?showcase=democity&time=12&camera=aerial&seed=1337&quality=high&headless=1&speed=0`, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });
  if (Number.isInteger(restageSeed)) await page.evaluate(seed => window.__sim.registry.apis.democity.restage({ seed }), restageSeed);
  await page.evaluate(async () => { const s=window.__sim,start=s.engine.stats.frames; while(s.engine.stats.frames<start+36) await new Promise(requestAnimationFrame); });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('HeapProfiler.enable'); await cdp.send('HeapProfiler.collectGarbage');
  const heap = await cdp.send('Runtime.getHeapUsage');
  const inventory = await page.evaluate(() => {
    const s = window.__sim;
    const bytesForGroup = group => {
      const geometries = new Set(), buffers = new Set(); let meshes = 0, vertices = 0, triangles = 0;
      const addBuffer = array => { if (array?.buffer) buffers.add(array.buffer); };
      group?.traverse(object => {
        if (!object.isMesh || !object.geometry) return; meshes++; const g=object.geometry;
        if (!geometries.has(g)) {
          geometries.add(g); addBuffer(g.index?.array);
          for (const a of Object.values(g.attributes || {})) addBuffer(a?.array);
          for (const list of Object.values(g.morphAttributes || {})) for (const a of list || []) addBuffer(a?.array);
          vertices += g.attributes.position?.count || 0;
          triangles += (g.index?.count || g.attributes.position?.count || 0) / 3;
        }
      });
      return { meshes, geometries: geometries.size, buffers: buffers.size, cpuBufferBytes: [...buffers].reduce((n,b)=>n+b.byteLength,0), vertices, triangles };
    };
    const modules = Object.fromEntries([...s.registry.modules].map(([name, rec]) => [name, bytesForGroup(rec.group)]));
    const textureSources = new Set(); let textureBytes = 0, textures = 0;
    s.engine.scene.traverse(object => {
      for (const material of (Array.isArray(object.material) ? object.material : [object.material])) for (const value of Object.values(material || {})) {
        if (!value?.isTexture || textureSources.has(value.source)) continue;
        textureSources.add(value.source); textures++;
        const data=value.image?.data; if (data?.byteLength) textureBytes += data.byteLength;
        else if (value.image?.width && value.image?.height) textureBytes += value.image.width*value.image.height*4;
      }
    });
    return { modules, textures: { count: textures, estimatedCpuBytes: textureBytes }, stats: s.stats(), errors: s.errors.slice() };
  });
  const result = { heap, inventory, browserErrors, pass: !inventory.errors.length && !browserErrors.length };
  fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(`${out}/memory-inventory.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally { await browser.close(); }
