# Core requests — `buildings`

## 1. Terrain ground clutter should be suppressed under building lot surfaces (round 2)

**Symptom.** `terrain` scatters grass tufts from its own land-cover mask and skips them only where
`world.roads.isRoad(x, z)` is non-zero. `buildings` owns the lot surface — lawn plates, driveways,
forecourts, parking aprons, industrial concrete — and lays those plates 0.09 m above terrain. Tuft
geometry is taller than that, so tufts render *through* the asphalt and paving of every occupied lot.
Raising the plate further is not a fix: at the 0.3 m that would clear the tufts, the plate reads as a
kerb around every building and z-fights with `roads`' sidewalks.

**Evidence.** `docs/critic/buildings_r1.md`, ranked issue 7 ("terrain grass tufts render through the
asphalt lot plate", crop `b12_base.png`).

**Proposed change** (one of, in order of preference):

1. `terrain` consults a coverage callback the same way it consults `world.roads.isRoad`. Concretely,
   add to `world.terrain` a registry the way roads already has one:
   ```js
   // src/core/world.js — terrain section
   terrain: {
     …,
     clutterMask: [],                       // [(x,z) -> 0..1], consulted by terrain's scatter
     addClutterMask(fn) { this.clutterMask.push(fn); },
   }
   ```
   `buildings` would then call, in `init()`:
   ```js
   world.terrain.addClutterMask?.((x, z) => (api.at(x, z) || lotAt(x, z) ? 1 : 0));
   ```
   and `terrain` multiplies its tuft density by `1 - max(mask)` exactly where it already multiplies by
   `isRoad`.
2. Failing that, `terrain` reads `world.buildings.at(x, z)` directly (it already reads
   `world.roads.isRoad`), plus `ctx.modules.buildings?.lotSurface?.(id)` for the paved rectangles.

**Why not solved in-module.** `buildings` may not touch `src/core/` or `src/modules/terrain/`, and the
tuft geometry belongs to terrain's chunk meshes; there is nothing this module can raise, offset or
depth-test its way out of. `api.lotSurface(id)` (spec §2, item 7) is already implemented this round
and returns the footprint plus every paved rectangle in world coordinates, so the data terrain needs
is published and waiting.

**Workaround meanwhile.** Lot plates sit at 0.09 m and paths at 0.115 m — above the terrain surface,
below the tufts. The tufts still show through on grass-classified ground; this is listed as a
remaining weakness in `docs/builds/buildings_r2.json`.
