import { chromium } from 'playwright';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox','--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0,300)); });
page.on('pageerror', e => errs.push('PAGEERROR ' + String(e).slice(0,300)));
await page.goto('http://127.0.0.1:5173/?showcase=props&headless=1&time=12&speed=0', { waitUntil: 'domcontentloaded', timeout: 240000 });
await page.waitForFunction(() => window.__sim && window.__sim.ready === true, null, { timeout: 240000, polling: 200 });
await page.waitForTimeout(800);

const res = await page.evaluate(() => {
  const s = window.__sim, w = s.world;
  const P = w.props, R = w.roads, T = w.terrain;
  const items = [...P.items.values()];
  const byKind = {};
  for (const it of items) byKind[it.kind] = (byKind[it.kind] || 0) + 1;
  const nd = (x, z) => { const n = R.nearestEdge(x, z, 300); return n ? n.dist : 9999; };
  const q = (a, p) => a[Math.min(a.length - 1, Math.max(0, Math.floor(a.length * p)))];

  const lamps = items.filter(i => i.kind === 'streetlamp');
  const lampD = lamps.map(l => nd(l.x, l.z)).sort((a,b)=>a-b);
  const lampY = lamps.map(l => +(l.y - T.getHeight(l.x, l.z)).toFixed(2)).sort((a,b)=>a-b);
  const signals = items.filter(i => i.kind === 'trafficlight');
  const sigD = signals.map(l => nd(l.x, l.z)).sort((a,b)=>a-b);

  const trees = items.filter(i => i.kind.startsWith('tree_'));
  const step = Math.max(1, Math.floor(trees.length / 1200));
  const samp = trees.filter((_, i) => i % step === 0);
  let onPaved = 0, within3 = 0, inWater = 0;
  const treeD = [], treeY = [];
  for (const t of samp) {
    const d = nd(t.x, t.z); treeD.push(d);
    if (d < 3) within3++;
    if (typeof R.isRoad === 'function' && R.isRoad(t.x, t.z) > 0) onPaved++;
    if (T.isWater(t.x, t.z)) inWater++;
    treeY.push(+(t.y - T.getHeight(t.x, t.z)).toFixed(2));
  }
  treeD.sort((a,b)=>a-b); treeY.sort((a,b)=>a-b);

  // furniture ground contact
  const furn = items.filter(i => ['bench','bin','hydrant','sign','bus_stop','planter','bush','hedge','flowers','fence'].includes(i.kind));
  const fY = furn.map(f => +(f.y - T.getHeight(f.x, f.z)).toFixed(2)).sort((a,b)=>a-b);

  const rec = s.registry.get('props');
  return {
    itemCount: items.length, byKind, version: P.version,
    kindsList: P.kinds,
    lamp: { n: lamps.length, distMin: +lampD[0]?.toFixed(2), distP50: +q(lampD,0.5)?.toFixed(2), distMax: +lampD[lampD.length-1]?.toFixed(2),
            yMin: lampY[0], yP50: q(lampY,0.5), yMax: lampY[lampY.length-1] },
    signal: { n: signals.length, distMin: +sigD[0]?.toFixed(2), distMax: +sigD[sigD.length-1]?.toFixed(2) },
    tree: { n: trees.length, sampled: samp.length, distMin: +treeD[0]?.toFixed(2), distP01: +q(treeD,0.01)?.toFixed(2), distP50: +q(treeD,0.5)?.toFixed(2),
            within3m: within3, onPavedMask: onPaved, inWater, yP50: q(treeY,0.5), yMin: treeY[0], yMax: treeY[treeY.length-1] },
    furniture: { n: furn.length, yMin: fY[0], yP50: q(fY,0.5), yMax: fY[fY.length-1] },
    status: rec?.status, apiKeys: Object.keys(rec?.api || {}),
    apiCount: rec?.api?.count?.(), apiLamps: rec?.api?.lamps?.().length,
    stats: (() => { const st = s.stats(); return { drawCalls: st.drawCalls, triangles: st.triangles, programs: st.programs, textures: st.textures, propsMs: st.moduleMs?.props }; })(),
    errors: s.errors.slice(0, 5), errorCount: s.errors.length,
  };
});

const evt = await page.evaluate(() => new Promise((resolve) => {
  const s = window.__sim;
  let got = null;
  s.events.on('props:changed', (p) => { got = { added: p.added?.length ?? -1, removed: p.removed?.length ?? -1 }; }, 'critic2');
  const before = s.world.props.version;
  s.events.emit('roads:changed', { added: [], removed: [], nodes: [] });
  setTimeout(() => resolve({ got, versionBefore: before, versionAfter: s.world.props.version }), 3000);
}));

const night = await page.evaluate(() => new Promise((resolve) => {
  const s = window.__sim;
  s.setTime(22);
  setTimeout(() => {
    const out = { points: [], pointLights: [], emissiveMats: [], meshes: 0, instanced: 0 };
    let g = null;
    s.engine.scene.traverse(o => { if (o.name === 'props') g = o; });
    if (g) g.traverse(o => {
      if (o.isPoints) out.points.push({ name: o.name, count: o.geometry?.attributes?.position?.count ?? 0, uOpacity: o.material?.uniforms?.uOpacity?.value ?? null, uSize: o.material?.uniforms?.uSize?.value ?? null, blending: o.material?.blending, visible: o.visible });
      if (o.isPointLight) out.pointLights.push({ intensity: +o.intensity.toFixed(2), distance: o.distance, color: o.color.getHexString(), pos: o.position.toArray().map(v=>+v.toFixed(1)) });
      if (o.isInstancedMesh) { out.instanced++; if (o.material?.emissiveIntensity > 0.01) out.emissiveMats.push({ name: o.name, ei: +o.material.emissiveIntensity.toFixed(2), count: o.count }); }
      else if (o.isMesh) out.meshes++;
    });
    out.found = !!g;
    out.hour = s.world.time.hour;
    out.stats = { drawCalls: s.stats().drawCalls, triangles: s.stats().triangles };
    resolve(out);
  }, 2000);
}));

console.log(JSON.stringify({ res, evt, night, consoleErrors: errs }, null, 1));
await browser.close();
