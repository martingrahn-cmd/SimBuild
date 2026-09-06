(() => {
  const sim = window.__sim, w = sim.world, t = sim.registry.apis.tools;
  const R = { };
  const near = (a,b,e)=>Math.abs(a-b)<=e;

  // ---- 14: layers + shadows on every geometry-bearing object in the tools group
  const grp = sim.registry.modules.get('tools').group;
  const viol = [];
  grp.traverse(o => {
    if (!o.geometry) return;
    if (!o.layers.isEnabled(8)) viol.push(['layer', o.type, o.name]);
    if (o.castShadow || o.receiveShadow) viol.push(['shadow', o.type, o.name]);
  });
  R.layerShadowViolations = viol;

  // ---- 3/15: poses
  R.poses = t.stats().poses;
  const teardown = t._showcasePoses(false);
  R.tornDown = teardown;
  R.afterTeardown = { ghostVerts: t.stats().ghostVerts, phase: t.state().phase, visibleKids: (()=>{let n=0;grp.traverse(o=>{if(o.geometry&&o.visible)n++;});return n;})() };

  // ---- 16: event hygiene
  let changed = 0, preview = 0;
  const offA = sim.events.on('tool:changed', ()=>changed++);
  const offB = sim.events.on('tool:preview', ()=>preview++);
  t.select('road', { type:'street' });
  t.select('road', { type:'street' });
  R.dupSelectEmits = changed;
  changed = 0; t.setOption('elevation', 5); R.setOptionEmits = changed;
  // re-entrancy
  changed = 0;
  const offC = sim.events.on('tool:changed', ()=>{ t.select('road', { type:'street', elevation:5 }); });
  t.select('zone', { type:'commercial' });
  R.reentrantEmits = changed;
  offC();
  // 200 pointer moves -> preview emissions (deferred to update(), ≤20 Hz)
  t.select('road', { type:'street', elevation:0 });
  preview = 0;
  const geo0 = sim.engine.renderer.info.memory.geometries;
  for (let i=0;i<200;i++) t.pointer(-100 + i*0.9, 40 + Math.sin(i*0.3)*8);
  R.previewEmitsFor200Pointer = preview;
  R.geoDelta = sim.engine.renderer.info.memory.geometries - geo0;
  offA(); offB();

  // ---- 7: snapping
  t.select('road', { type:'street', snap:['magnet'] });
  const anyNode = [...w.roads.nodes.values()].find(n => Math.abs(n.z) < 2 && Math.abs(n.x - 80) < 2)
               || [...w.roads.nodes.values()][0];
  t.pointer(anyNode.x + 4, anyNode.z + 3);
  R.snapNode = t.state().snap;
  const edgesBefore = w.roads.edges.size;
  // edge snap: a point on the avenue between nodes
  t.pointer(40, 1.5);
  R.snapEdge = t.state().snap;
  // grid snap
  t.select('road', { type:'street', snap:['snap'] });
  t.pointer(-403.3, 197.7);
  R.snapGrid = t.state().snap;
  // angle snap: anchor then a direction 1 deg off 45
  t.select('road', { type:'street', snap:[] });
  t.pointer(-400, 400); t.click(0);
  t.pointer(-400 + 100*Math.cos(0.7854+0.03), 400 + 100*Math.sin(0.7854+0.03));
  R.snapAngle = t.state().snap;
  t.cancel();

  // T-junction: split an avenue edge
  t.select('road', { type:'street', snap:['magnet'] });
  const e0 = w.roads.edges.size;
  t.pointer(40, 1); t.click(0);
  t.pointer(40, 70); t.click(0);
  const c = t.commit();
  R.tjunction = { ok: c.ok, reason: c.reason, edgesBefore: e0, edgesAfter: w.roads.edges.size, delta: w.roads.edges.size - e0 };
  t.undo();
  R.tjunctionAfterUndo = w.roads.edges.size;

  // ---- 8: invalid commit refused
  t.select('road', { type:'street', snap:[] });
  t.pointer(150, -60); t.click(0);
  t.pointer(150, -120);
  const invSt = t.state();
  const before = w.roads.edges.size;
  const invCommit = t.commit();
  R.invalid = { valid: invSt.valid, reason: invSt.reason, commit: invCommit, edgesUnchanged: w.roads.edges.size === before };
  t.cancel();

  // ---- 18: service road-access validation
  t.select('service', { kind: 'clinic' });
  t.pointer(120, 110);
  const s1 = t.state();
  t.pointer(-420, -420);
  const s2 = t.state();
  R.service = { near: { valid: s1.valid, reason: s1.reason, cost: s1.cost }, far: { valid: s2.valid, reason: s2.reason } };
  R.serviceCommit = t.commit();

  // ---- 19: props degradation
  t.select('prop', { kind: 'tree_oak' });
  t.pointer(40, 40);
  R.propCommit = t.commit();
  R.propsHasPlace = typeof sim.registry.apis.props?.place === 'function';

  // ---- 5/costOf
  R.costOf = {
    road: t.costOf('road', { type:'avenue' }, { points:[{x:0,z:0},{x:0,z:100}] }),
    zone: t.costOf('zone', { density:'high' }, { cells: 10 }),
    terrain: t.costOf('terrain', { size:60, strength:70 }, {}),
    service: t.costOf('service', { kind:'clinic' }, {}),
    bogus: t.costOf('nope', {}, {}),
  };

  // ---- ACCEPTED / unknown names
  R.selectUnknown = t.select('bogusname');
  R.selectTransit = t.select('transit', { line: 'bus' });
  R.selectNull = t.select(null);
  R.serialize = t.serialize();

  // ---- 12: selection contract
  const bld = [...w.buildings.items.values()][0];
  let selEvents = 0;
  const offS = sim.events.on('selection:changed', ()=>selEvents++);
  t.setSelection('building', bld.id);
  R.selection = { after: { ...w.selection }, events: selEvents, pickAt: t.pickAt(bld.x, bld.z) };
  t.clearSelection();
  R.selectionCleared = { ...w.selection, events: selEvents };
  offS();

  // ---- 9: undo/redo of 8 mixed actions
  const sample = [];
  for (let i=0;i<16;i++) sample.push(w.terrain.getHeight(-200 + i*25, 150));
  const base = { edges: w.roads.edges.size, nodes: w.roads.nodes.size, cells: w.zones.cells.size, buildings: w.buildings.items.size };
  const h0 = t.history().undo;
  // 2 roads
  t.select('road', { type:'street', snap:[] });
  t.pointer(-420, 300); t.click(0); t.pointer(-420, 380); t.click(0); t.commit();
  t.pointer(-380, 300); t.click(0); t.pointer(-380, 380); t.click(0); t.commit();
  // 2 zone strokes
  t.select('zone', { type:'commercial', density:'low', brush:'paint', size:24 });
  t.pointer(-100, 40); t.click(0);
  t.pointer(-100, 60); t.click(0);
  // 2 sculpts
  t.select('terrain', { mode:'raise', size:40, strength:40 });
  t.pointer(-200, 150); t.click(0);
  t.select('terrain', { mode:'lower', size:40, strength:40 });
  t.pointer(-160, 150); t.click(0);
  // 1 demolish
  t.select('bulldoze', { mode:'single' });
  const victim = [...w.buildings.items.values()][0];
  t.pointer(victim.x, victim.z); t.click(0);
  // 1 service (stub: fails) -> use a road instead so the count is 8 real actions
  t.select('road', { type:'alley', snap:[] });
  t.pointer(-340, 300); t.click(0); t.pointer(-340, 360); t.click(0); t.commit();
  const h1 = t.history().undo;
  const after = { edges: w.roads.edges.size, nodes: w.roads.nodes.size, cells: w.zones.cells.size, buildings: w.buildings.items.size };
  const n = h1 - h0;
  for (let i=0;i<n;i++) t.undo();
  const sample2 = [];
  for (let i=0;i<16;i++) sample2.push(w.terrain.getHeight(-200 + i*25, 150));
  let maxDelta = 0; for (let i=0;i<16;i++) maxDelta = Math.max(maxDelta, Math.abs(sample[i]-sample2[i]));
  const undone = { edges: w.roads.edges.size, nodes: w.roads.nodes.size, cells: w.zones.cells.size, buildings: w.buildings.items.size };
  for (let i=0;i<n;i++) t.redo();
  const redone = { edges: w.roads.edges.size, nodes: w.roads.nodes.size, cells: w.zones.cells.size, buildings: w.buildings.items.size };
  R.undoTest = { actions: n, base, after, undone, redone, terrainMaxDelta: +maxDelta.toFixed(6),
                 baseMatch: JSON.stringify(base)===JSON.stringify(undone), redoMatch: JSON.stringify(after)===JSON.stringify(redone) };
  for (let i=0;i<n;i++) t.undo();

  // ---- 10: zone preview colour equals the palette exactly
  R.zonePalette = null;

  // ---- 17: sculpt dome
  const rays = [];
  let worst = 0;
  for (let a=0;a<16;a++) {
    const ang = a/16*Math.PI*2;
    let prev = null;
    for (let r=0;r<=60;r+=2) {
      const x = 150 + Math.cos(ang)*r, z = -120 + Math.sin(ang)*r;
      if (w.roads.nearestEdge(x,z,20)) { prev = null; continue; }
      const h = w.terrain.getHeight(x,z);
      if (prev !== null) worst = Math.max(worst, Math.abs(h-prev));
      prev = h;
    }
  }
  R.sculptWorstStep = +worst.toFixed(3);
  R.knoll = +w.terrain.getHeight(150,-120).toFixed(2);
  R.terrainNaN = [...w.terrain.heights].some(v=>!Number.isFinite(v));

  // ---- 13: group draw call diff
  const rend = sim.engine.renderer;
  R.groupDiff = 'see stats()';

  R.errors = sim.errors.slice(0,8);
  R.dom = document.body.children.length;
  return R;
})()
