import { open } from './lib.mjs';
const { browser, page, errors } = await open({ url: 'http://127.0.0.1:5173/?showcase=zoning&headless=1&time=12&camera=zones&seed=1337&speed=1', w: 800, h: 450 });
const out = await page.evaluate(async () => {
  const S = window.__sim, W = S.world, api = S.registry.get('zoning').def.api;
  const R = {}, Z = W.zones;
  R.staging = api.staging();
  R.stats = api.stats();
  R.probes = api.probePoints();

  // --- item 12: notches near junctions
  const claimed = new Set(); for (const l of Z.lots.values()) for (const k of l.cells) claimed.add(k);
  const idx = (v) => Math.floor((v + 1024) / 8), ctr = (i) => i * 8 - 1020;
  const notches = [];
  for (const j of R.staging.junctions) {
    // 4-connected components of unclaimed painted cells within 12 m of the node
    const near = [];
    for (let iz = idx(j.z - 14); iz <= idx(j.z + 14); iz++) for (let ix = idx(j.x - 14); ix <= idx(j.x + 14); ix++) {
      const k = ix + ',' + iz;
      if (!Z.cells.has(k) || claimed.has(k)) continue;
      if (Math.hypot(ctr(ix) - j.x, ctr(iz) - j.z) > 12) continue;
      near.push(k);
    }
    const set = new Set(near); const seen = new Set(); let worst = 0;
    for (const k of near) { if (seen.has(k)) continue; const st=[k]; seen.add(k); let n=0;
      while (st.length) { const c = st.pop(); n++; const [a,b]=c.split(',').map(Number);
        for (const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nk=(a+dx)+','+(b+dz); if(set.has(nk)&&!seen.has(nk)){seen.add(nk);st.push(nk);} } }
      worst = Math.max(worst, n); }
    if (worst > 2) notches.push({ id: j.id, x: j.x, z: j.z, worst });
  }
  R.junctionCount = R.staging.junctions.length;
  R.notches = notches;

  // --- item 13: boundary loops + direction changes
  const loops = api.boundaryLoops();
  R.loops = loops.map(l => ({ n: l.length, first: l[0], last: l[l.length-1] }));
  // find the loop sub-runs nearest the river and the hillside
  const dirChanges = (run) => { let n=0,last=null; for(let i=1;i<run.length;i++){const [ax,az]=run[i-1].split(',').map(Number),[bx,bz]=run[i].split(',').map(Number);const d=(bx-ax)+','+(bz-az); if(last!==null&&d!==last)n++; last=d;} return n; };
  const big = loops[0] || [];
  const near = (k, x, z, r) => { const [a,b]=k.split(',').map(Number); return Math.hypot(ctr(a)-x, ctr(b)-z) <= r; };
  const seg = (x, z, r) => { const ii = big.map((k,i)=>near(k,x,z,r)?i:-1).filter(i=>i>=0); if(!ii.length) return null;
    const a=ii[0], b=ii[ii.length-1]; const run=big.slice(a,b+1); return { first: big[a], last: big[b], n: run.length, dirChanges: dirChanges(run) }; };
  // river: along the waterfront run's north side
  const wf = R.staging.waterfront;
  const midx = wf[Math.floor(wf.length/2)];
  R.riverRun = seg(40, -150, 150);
  R.hillRun = R.staging.hillside ? seg(R.staging.hillside.peak[0], R.staging.hillside.peak[1], 90) : null;

  // --- item 26: events
  let count = 0; const payloads = [];
  const off = W && S.events.on('zones:changed', (p) => { count++; payloads.push({ cells: Array.isArray(p.cells), added: Array.isArray(p.lots?.added), removed: Array.isArray(p.lots?.removed) }); }, 'probe');
  const v0 = Z.version;
  api.bulk(({ circle }) => { for (let i = 0; i < 20; i++) circle(-40 + i, 20, 6, 'residential', 'high'); });
  R.bulkEvents = count; R.bulkVersion = Z.version - v0;
  count = 0; const v1 = Z.version;
  for (let i = 0; i < 5; i++) api.paint(-40 + i * 9, 28, 6, 'commercial', 'low');
  R.paintEvents = count; R.paintVersion = Z.version - v1;
  R.payloadShape = payloads.every(p => p.cells && p.added && p.removed);
  S.events.off && S.events.off('zones:changed', null, 'probe');

  // --- item 15: lot identity across an unrelated road edge + refresh
  const before = new Map(); for (const l of Z.lots.values()) before.set(l.id, { edgeId: l.edgeId, side: l.side, c0: l.cells[0], b: l.buildingId });
  for (const l of Z.lots.values()) l.buildingId = 'B' + l.id;
  const a = W.roads.addNode(-700, 600), b = W.roads.addNode(-620, 600);
  W.roads.addEdge(a, b, 'street');
  api.refresh();
  let kept = 0, lostB = 0;
  for (const [id, rec] of before) { const l = Z.lots.get(id); if (l && l.edgeId === rec.edgeId && l.side === rec.side && l.cells[0] === rec.c0) { kept++; if (l.buildingId !== 'B' + id) lostB++; } }
  R.identity = { before: before.size, kept, lostB, after: Z.lots.size };

  // --- item 21: serialize round trip
  const ser = api.serialize();
  const cellsBefore = new Set(Z.cells.keys());
  api.deserialize(ser);
  const cellsAfter = new Set(Z.cells.keys());
  R.roundTrip = { same: cellsBefore.size === cellsAfter.size && [...cellsBefore].every(k => cellsAfter.has(k)), n: cellsAfter.size, lots: Z.lots.size };

  // --- item 6: uTime advances, uPulseAmp
  const mats = [];
  S.registry.get('zoning').group.traverse(o => { if (o.material?.uniforms?.uPulseAmp) mats.push(o.material); });
  R.pulseAmp = mats.map(m => m.uniforms.uPulseAmp.value);
  R.fog = mats.map(m => m.fog);
  R.hasChunks = mats.length ? (mats[0].fragmentShader.includes('tonemapping_fragment') && mats[0].fragmentShader.includes('colorspace_fragment')) : false;
  R.fillAlpha = mats.map(m => m.uniforms.uFill.value);
  const t0 = mats[0].uniforms.uTime.value;
  await new Promise(r => setTimeout(r, 1000));
  R.uTimeAdvance = +(mats[0].uniforms.uTime.value - t0).toFixed(3);

  // --- item 20: geometry allocation while idle
  const g0 = S.stats().geometries;
  await new Promise(r => setTimeout(r, 1500));
  R.geoDelta = S.stats().geometries - g0;
  R.moduleMs = S.stats().moduleMs.zoning;

  // --- item 8/7: front edge over every staged edge
  let vTotal = 0, onRoad = 0, clMin = 9, clMax = 0, devMax = 0, gapMax = 0, runs = 0;
  for (const e of W.roads.edges.values()) {
    if (e.type === 'highway' || e.type === 'ramp') continue;
    for (const side of ['right', 'left']) {
      const vs = api.frontEdge(e.id, side);
      if (vs.length < 3) continue;
      runs++;
      const ds = [];
      for (let i = 0; i < vs.length; i++) {
        const v = vs[i]; vTotal++;
        const rr = W.roads.nearestEdge(v.x, v.z, 60);
        if (rr) { ds.push(rr.dist); const T = W.roads.types[rr.edge.type]; const cl = rr.dist - (T.asphaltHalf + (T.sidewalk ?? 0)); clMin = Math.min(clMin, cl); clMax = Math.max(clMax, cl); }
        if (W.roads.isRoad(v.x, v.z) !== 0) onRoad++;
        if (i) gapMax = Math.max(gapMax, Math.hypot(v.x - vs[i-1].x, v.z - vs[i-1].z));
      }
      const med = ds.slice().sort((x, y) => x - y)[ds.length >> 1];
      devMax = Math.max(devMax, Math.max(...ds.map(d => Math.abs(d - med))));
    }
  }
  R.frontEdge = { runs, vTotal, onRoad, clMin: +clMin.toFixed(2), clMax: +clMax.toFixed(2), devMax: +devMax.toFixed(2), gapMax: +gapMax.toFixed(2) };
  R.status = S.modulesStatus().zoning;
  return R;
});
console.log(JSON.stringify(out, null, 1));
console.log('errors', errors.length, errors.slice(0,3));
await browser.close();
