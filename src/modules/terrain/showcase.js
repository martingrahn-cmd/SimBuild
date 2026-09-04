// Showcase staging for the terrain module: the landscape itself is the show; we add two presets that frame
// the river valley and the estuary/coast. Positions are derived from the generated features so they follow the seed.
import * as THREE from 'three';

export function makeShowcase(S) {
  return {
    description: 'Eroded heightfield: rolling buildable plains around the origin, a meandering river valley to the north, an estuary and beach coast to the west with an island, ridged mountains east/north/south; PBR splat, planar-reflective water with shore foam.',
    cameras: {
      // sensible defaults (seed 1337); refined in setup() from the actual river/coast
      valley: { position: [420, 60, -40], target: [60, 0, -190] },
      coast: { position: [-230, 95, 40], target: [-720, 0, -250] },
    },
    async setup(ctx) {
      const d = S.data, g = S.gen;
      if (!d || !g) return;
      const cell = d.cell, half = d.half;
      const zr = (x) => g.river.zAt[Math.max(0, Math.min(d.res - 1, Math.round((x + half) / cell)))];
      // valley: from a hillside east of the origin looking west along the river
      {
        const tx = 40, tz = zr(40);
        const px = 470, pz = zr(470) + 150;
        const py = Math.max(d.getHeight(px, pz) + 26, 50);
        ctx.camera.registerPreset('valley', { position: [px, py, pz], target: [tx, d.getHeight(tx, tz), tz] });
      }
      // coast: over the estuary toward the sea and the island, from the south-east
      {
        const mouthX = g.coast.xAt[Math.round((zr(-560) + half) / cell)];
        const tx = mouthX - 140, tz = zr(-560);
        const px = -170, pz = zr(-170) + 260;
        const py = Math.max(d.getHeight(px, pz) + 70, 95);
        ctx.camera.registerPreset('coast', { position: [px, py, pz], target: [tx, 0, tz] });
      }
      ctx.log.info(`showcase staged: height range ${d.minH.toFixed(0)}..${d.maxH.toFixed(0)} m, river z(0)=${zr(0).toFixed(0)}, coast x(0)=${g.coast.xAt[Math.round(half / cell)].toFixed(0)}`);
    },
  };
}

export const _three = THREE;
