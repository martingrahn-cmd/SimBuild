// The eight tree species of the spec's size table, grouped into five silhouette classes.
// `kinds` stays frozen at twelve strings (world.props.kinds); a species is an ADDITIVE per-item field
// and, on the GPU, a per-instance attribute inside ONE tree mesh per (LOD tier x 256 m chunk).
//
// Canonical geometry is a unit tree: total height 1.0, trunk radius 0.030 at the base. Everything that
// makes a spruce a spruce and a willow a willow is a handful of numbers fed to the vertex shader:
//   crownR    canonical crown radius (fraction of height)
//   profA/B   crown envelope  p(t) = (t+0.02)^B * (1-t)^A , normalised to max 1
//   crownBot  where the crown starts, as a fraction of height
//   spread    horizontal scale applied to the branch skeleton
//   leafK     canonical size of one leaf card
//   trunkK    radial scale of the trunk tube so the world trunk diameter matches the table

/** p(t) for the crown envelope, normalised so max(p) === 1 over t in [0,1]. */
export function crownProfile(t, a, b) {
  return Math.pow(Math.max(0, t) + 0.16, b) * Math.pow(Math.max(0, 1 - t), a);
}
export function profileNorm(a, b) {
  let m = 1e-6;
  for (let i = 0; i <= 64; i++) m = Math.max(m, crownProfile(i / 64, a, b));
  return m;
}

// leafCell / impCell index into the 4x4 atlases built in textures.js
export const SPECIES = {
  // --- conifer spire (tree_pine)
  spruce: {
    name: 'spruce', kind: 'tree_pine', cls: 'conifer', base: 15.0, trunkD: 0.36,
    crownW: 0.38, profA: 1.35, profB: 0.16, crownBot: 0.12, spread: 0.30, leafK: 0.115,
    leafCell: 6, impCell: 0, tints: [[0.80, 0.94, 0.86], [0.70, 0.88, 0.82], [0.88, 0.98, 0.90]],
  },
  fir: {
    name: 'fir', kind: 'tree_pine', cls: 'conifer', base: 16.5, trunkD: 0.40,
    crownW: 0.43, profA: 1.15, profB: 0.20, crownBot: 0.10, spread: 0.32, leafK: 0.125,
    leafCell: 7, impCell: 0, tints: [[0.74, 0.90, 0.90], [0.66, 0.84, 0.86], [0.82, 0.94, 0.92]],
  },
  // --- broad round crown (tree_oak)
  oak: {
    name: 'oak', kind: 'tree_oak', cls: 'broad', base: 12.0, trunkD: 0.55,
    crownW: 0.96, profA: 0.55, profB: 0.45, crownBot: 0.30, spread: 1.00, leafK: 0.155,
    leafCell: 0, impCell: 1, tints: [[0.92, 1.00, 0.80], [1.06, 1.00, 0.74], [0.98, 1.02, 0.90], [1.10, 0.98, 0.68]],
  },
  maple: {
    name: 'maple', kind: 'tree_oak', cls: 'broad', base: 10.5, trunkD: 0.50,
    crownW: 1.06, profA: 0.48, profB: 0.52, crownBot: 0.28, spread: 1.05, leafK: 0.160,
    leafCell: 1, impCell: 1, tints: [[1.08, 0.98, 0.78], [1.02, 1.00, 0.86], [0.96, 1.00, 0.92], [1.12, 0.94, 0.70]],
  },
  // --- tall narrow (tree_oak)
  birch: {
    name: 'birch', kind: 'tree_oak', cls: 'narrow', base: 13.0, trunkD: 0.30,
    crownW: 0.44, profA: 0.62, profB: 0.40, crownBot: 0.34, spread: 0.52, leafK: 0.120,
    leafCell: 2, impCell: 2, tints: [[1.08, 1.04, 0.76], [1.02, 1.04, 0.86], [0.98, 1.02, 0.94]],
  },
  poplar: {
    name: 'poplar', kind: 'tree_oak', cls: 'narrow', base: 13.5, trunkD: 0.32,
    crownW: 0.36, profA: 0.72, profB: 0.34, crownBot: 0.22, spread: 0.42, leafK: 0.108,
    leafCell: 3, impCell: 2, tints: [[1.02, 1.02, 0.84], [1.08, 1.00, 0.76], [0.96, 1.02, 0.92]],
  },
  // --- wide low spreading (tree_oak)
  willow: {
    name: 'willow', kind: 'tree_oak', cls: 'wide', base: 7.5, trunkD: 0.48,
    crownW: 1.44, profA: 0.34, profB: 0.74, crownBot: 0.26, spread: 1.20, leafK: 0.165,
    leafCell: 4, impCell: 3, tints: [[0.94, 1.04, 0.86], [0.88, 1.00, 0.92], [1.00, 1.02, 0.80]],
  },
  // --- small ornamental (tree_oak)
  blossom: {
    name: 'blossom', kind: 'tree_oak', cls: 'ornamental', base: 5.0, trunkD: 0.20,
    crownW: 0.98, profA: 0.50, profB: 0.46, crownBot: 0.36, spread: 0.92, leafK: 0.135,
    leafCell: 5, impCell: 4, tints: [[1.14, 0.94, 0.96], [1.08, 1.00, 0.88], [1.02, 1.00, 0.94]],
  },
};

export const SPECIES_NAMES = Object.keys(SPECIES);
export const CLASSES = ['conifer', 'broad', 'narrow', 'wide', 'ornamental'];

for (const s of Object.values(SPECIES)) s.profNorm = profileNorm(s.profA, s.profB);

/** Scale multiplier range: inside item 2's [0.75, 1.35] and inside the size table's 0.7x..1.4x band. */
export const SCALE_MIN = 0.78, SCALE_MAX = 1.32;

/** Instance shape attributes for a species at a given world height (metres). */
export function shapeFor(sp, worldHeight) {
  const s = SPECIES[sp];
  // canonical trunk radius 0.030 at y = 0 must become (trunkD/2)*1.12 metres at the base
  const trunkK = ((s.trunkD * 0.5) * 1.12) / (0.030 * worldHeight);
  return {
    crownR: s.crownW * 0.5 / s.profNorm,
    profA: s.profA, profB: s.profB, crownBot: s.crownBot,
    trunkK, leafK: s.leafK, spread: s.spread, cell: s.leafCell, impCell: s.impCell,
  };
}

/** Footprint radii — EXACTLY the spec's item 3d table. api.stats().radii returns this object. */
export const RADII = {
  streetlamp: 0.25, trafficlight: 0.30, tree_oak: 0.60, tree_pine: 0.50,
  bench: 0.90, bin: 0.30, hydrant: 0.25, sign: 0.20, bus_stop: 2.20,
  fence: 0.20, bush: 0.70, planter: 0.60,
};

/** The frozen twelve. Never mutated onto world.props.kinds — compared against it. */
export const KINDS = [
  'streetlamp', 'trafficlight', 'tree_oak', 'tree_pine', 'bench', 'bin',
  'hydrant', 'sign', 'bus_stop', 'fence', 'bush', 'planter',
];
