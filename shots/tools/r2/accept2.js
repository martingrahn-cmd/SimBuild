(() => {
  const sim = window.__sim, w = sim.world, t = sim.registry.apis.tools;
  const R = {};
  R.money = sim.registry.apis.simulation?.economy?.().money;
  // 13: group draw-call diff over two rendered frames
  const grp = sim.registry.modules.get('tools').group;
  R.statsWithPoses = t.stats();

  // 16 event hygiene
  let changed=0, preview=0;
  const offA = sim.events.on('tool:changed', ()=>changed++);
  const offB = sim.events.on('tool:preview', ()=>preview++);
  t.select('road', { type:'street' }); t.select('road', { type:'street' });
  R.dupSelectEmits = changed;
  changed=0; t.setOption('elevation', 5); R.setOptionEmits = changed;
  preview = 0;
  const geo0 = sim.engine.renderer.info.memory.geometries;
  for (let i=0;i<200;i++) t.pointer(-100 + i*0.9, 40 + Math.sin(i*0.3)*8);
  R.previewEmitsFor200Pointer = preview;
  R.geoDelta = sim.engine.renderer.info.memory.geometries - geo0;
  offA(); offB();

  // 7 T-junction
  t.select('road', { type:'street', snap:['magnet'], elevation:0 });
  const e0 = w.roads.edges.size, n0 = w.roads.nodes.size;
  t.pointer(40, 1); const sn = t.state().snap;
  t.click(0); t.pointer(40, 70); t.click(0);
  const c = t.commit();
  R.tjunction = { snapAtClick: sn, ok:c.ok, reason:c.reason, dEdges: w.roads.edges.size-e0, dNodes: w.roads.nodes.size-n0 };
  t.undo();
  R.tjunctionUndo = { dEdges: w.roads.edges.size-e0, dNodes: w.roads.nodes.size-n0 };

  // node snap reuse: draw from an existing node
  const node = [...w.roads.nodes.values()].find(n=>Math.abs(n.x-80)<1 && Math.abs(n.z-120)<1);
  const nBefore = w.roads.nodes.size;
  t.pointer(node.x+5, node.z+4); const s1 = t.state().snap;
  t.click(0); t.pointer(node.x+5, node.z+70); t.click(0);
  const c2 = t.commit();
  const e2 = w.roads.edges.get(c2.ids[0]);
  R.nodeReuse = { snap:s1, reusedNode: e2 ? (e2.a===node.id||e2.b===node.id) : null, newNodes: w.roads.nodes.size-nBefore };
  t.undo();

  // 18 service
  t.select('service', { kind:'clinic' });
  t.pointer(120, 110); const sv1 = t.state();
  t.pointer(120, 300); const sv2 = t.state();
  R.service = { near:{valid:sv1.valid, reason:sv1.reason, cost:sv1.cost, affordable:sv1.affordable}, far:{valid:sv2.valid, reason:sv2.reason} };
  t.pointer(120,110); R.serviceCommit = t.commit();

  // 19 prop
  t.select('prop', { kind:'tree_oak' }); t.pointer(40, 40);
  R.propCommit = t.commit(); if (R.propCommit.ok) t.undo();

  // 9 undo/redo of 8 mixed committed actions
  const sample=[]; for (let i=0;i<16;i++) sample.push(w.terrain.getHeight(-200+i*25,150));
  const base={edges:w.roads.edges.size,nodes:w.roads.nodes.size,cells:w.zones.cells.size,buildings:w.buildings.items.size};
  const h0=t.history().undo;
  t.select('road',{type:'street',snap:[]}); t.pointer(-420,300); t.click(0); t.pointer(-420,380); t.click(0); t.commit();
  t.pointer(-380,300); t.click(0); t.pointer(-380,380); t.click(0); t.commit();
  t.select('zone',{type:'commercial',density:'low',brush:'paint',size:24}); t.pointer(-100,40); t.click(0); t.pointer(-100,64); t.click(0);
  t.select('terrain',{mode:'raise',size:40,strength:40}); t.pointer(-200,150); t.click(0);
  t.select('terrain',{mode:'lower',size:40,strength:40}); t.pointer(-160,150); t.click(0);
  t.select('bulldoze',{mode:'single'}); const v=[...w.buildings.items.values()][3]; t.pointer(v.x,v.z); t.click(0);
  t.select('service',{kind:'park_small'}); t.pointer(120,110); const svc = t.commit();
  const h1=t.history().undo, n=h1-h0;
  const after={edges:w.roads.edges.size,nodes:w.roads.nodes.size,cells:w.zones.cells.size,buildings:w.buildings.items.size};
  for(let i=0;i<n;i++) t.undo();
  const s2=[]; for (let i=0;i<16;i++) s2.push(w.terrain.getHeight(-200+i*25,150));
  let md=0; for(let i=0;i<16;i++) md=Math.max(md,Math.abs(sample[i]-s2[i]));
  const undone={edges:w.roads.edges.size,nodes:w.roads.nodes.size,cells:w.zones.cells.size,buildings:w.buildings.items.size};
  for(let i=0;i<n;i++) t.redo();
  const redone={edges:w.roads.edges.size,nodes:w.roads.nodes.size,cells:w.zones.cells.size,buildings:w.buildings.items.size};
  R.undoTest={actions:n, svcOk:svc.ok, svcReason:svc.reason, base, after, undone, redone, terrainMaxDelta:+md.toFixed(6),
    baseMatch:JSON.stringify(base)===JSON.stringify(undone), redoMatch:JSON.stringify(after)===JSON.stringify(redone), capacity:t.history().capacity};
  for(let i=0;i<n;i++) t.undo();

  // 17 sculpt dome
  let worst=0;
  for (let a=0;a<16;a++){const ang=a/16*Math.PI*2;let prev=null;
    for(let r=0;r<=60;r+=2){const x=150+Math.cos(ang)*r,z=-120+Math.sin(ang)*r;
      if(w.roads.nearestEdge(x,z,20)){prev=null;continue;}
      const h=w.terrain.getHeight(x,z); if(prev!==null) worst=Math.max(worst,Math.abs(h-prev)); prev=h;}}
  R.sculpt={worstStep:+worst.toFixed(3), knoll:+w.terrain.getHeight(150,-120).toFixed(2), nan:[...w.terrain.heights].some(v=>!Number.isFinite(v))};
  // monotonic rise
  t.select('terrain',{mode:'raise',size:40,strength:60}); t.pointer(-300,300);
  const hs=[w.terrain.getHeight(-300,300)];
  for(let i=0;i<4;i++){t.click(0); hs.push(+w.terrain.getHeight(-300,300).toFixed(3));}
  R.sculpt.rise=hs.map(v=>+v.toFixed(2));
  for(let i=0;i<4;i++) t.undo();

  // 15 teardown
  const torn = t._showcasePoses(false);
  t.select('road',{type:'street'}); t.pointer(0,60); t.click(0); t.pointer(0,120);
  const before = t.stats().ghostVerts;
  t.cancel();
  const afterCancel = { ghostVerts: t.stats().ghostVerts, phase: t.state().phase };
  t.pointer(0,60); t.click(0); t.pointer(0,120); t.commit();
  const afterCommit = { ghostVerts: t.stats().ghostVerts, phase: t.state().phase };
  t.undo();
  t.select(null);
  const afterNull = { ghostVerts: t.stats().ghostVerts, phase: t.state().phase, visibleGeo: (()=>{let n=0;grp.traverse(o=>{if(o.geometry&&o.visible)n++;});return n;})() };
  R.teardown = { torn, before, afterCancel, afterCommit, afterNull, statsIdle: t.stats() };
  t._showcasePoses(true);

  R.zonePreview = null;
  R.errors = sim.errors.slice(0,8);
  R.moneyEnd = sim.registry.apis.simulation?.economy?.().money;
  return R;
})()
