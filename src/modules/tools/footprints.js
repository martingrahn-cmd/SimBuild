// Preview bounds for the published prop kinds. Dimensions follow the current props kits, in
// metres before the per-item scale. Keep offsets: lamp arms and signal heads are not centred on
// their pole. A future props.boundsOf(id) can replace this guarded metadata fallback.
const KITS = {
  streetlamp: [0.5, 2.4, 9.2, 0, -0.9],
  streetlamp_lantern: [0.55, 0.95, 5.2, 0, -0.2],
  trafficlight: [3.75, 0.7, 6.65, 1.52, -0.05],
  bench: [1.8, 0.72, 1.08, 0, 0.08],
  bin: [0.6, 0.6, 0.94, 0, 0],
  hydrant: [0.43, 0.44, 0.86, 0, -0.02],
  sign: [0.66, 0.16, 2.5, 0, 0],
  bus_stop: [4.25, 2, 2.66, 0, 0.02],
  planter: [1.3, 1.3, 1.25, 0, 0],
  bush: [1.5, 1.5, 1.5, 0, 0],
  fence: [0.22, 2.1, 1.3, 0, 0],
};
const TREES = {
  spruce: [15, 0.38], fir: [16.5, 0.43], oak: [12, 0.96], maple: [10.5, 1.06],
  birch: [13, 0.44], poplar: [13.5, 0.36], willow: [7.5, 1.44], blossom: [5, 0.98],
};

export function propBounds(p, modules) {
  const supplied = modules?.props?.boundsOf?.(p.id);
  if (supplied) return supplied;
  const scale = p.scale || 1, heading = p.heading || 0;
  let kit;
  if (p.kind.startsWith('tree_')) {
    const [h, crown] = TREES[p.species] || TREES[p.kind === 'tree_pine' ? 'spruce' : 'oak'];
    kit = [h * crown, h * crown, h, 0, 0];
  } else kit = KITS[p.kind === 'streetlamp' && p.variant === 'lantern' ? 'streetlamp_lantern' : p.kind] || [1, 1, 1, 0, 0];
  const [w, d, h, ox, oz] = kit, c = Math.cos(heading), s = Math.sin(heading);
  return { x: p.x + (ox * c + oz * s) * scale, z: p.z + (-ox * s + oz * c) * scale,
    // Gizmo rectangles rotate in the opposite XZ convention to Three's rotateY.
    heading: -heading, w: w * scale, d: d * scale, height: h * scale, baseY: p.y };
}

export function propVictim(p, modules) {
  return { kind: 'prop', id: p.id, ...propBounds(p, modules), label: p.kind };
}
