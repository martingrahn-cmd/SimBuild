(() => {
  const sim = window.__sim, t = sim.registry.apis.tools, w = sim.world;
  t.select('road', { type:'avenue', mode:'curve', snap:['magnet'] });
  t.pointer(0,0); t.click(0);
  const s1 = t.state();
  t.pointer(48,40); t.click(0);
  const s2 = t.state();
  const n0 = [...w.roads.nodes.values()].filter(n=>Math.hypot(n.x,n.z)<14).map(n=>({id:n.id,x:+n.x.toFixed(2),z:+n.z.toFixed(2),
     edges:[...n.edges].map(e=>{const ed=w.roads.edges.get(e); const o=w.roads.nodes.get(ed.a===n.id?ed.b:ed.a); return {type:ed.type, ox:+o.x.toFixed(1), oz:+o.z.toFixed(1), deg:+(Math.atan2(o.z-n.z,o.x-n.x)*180/Math.PI).toFixed(1)};})}));
  t.cancel(); t.select(null); t._showcasePoses(true);
  return { p1: s1.points, p2: s2.points, snap1: s1.snap, snap2: s2.snap, nodesNearOrigin: n0 };
})()
