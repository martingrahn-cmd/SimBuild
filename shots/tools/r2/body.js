(() => {
  const sim = window.__sim, t = sim.registry.apis.tools, w = sim.world;
  const poses = t.stats();
  // read each pose's evaluation through the real tools
  const S = sim.registry.modules ? null : null;
  return {
    stats: poses, crops: sim.cropRects(),
    errors: sim.errors.slice(0,5),
  };
})()
