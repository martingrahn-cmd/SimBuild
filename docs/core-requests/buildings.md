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

## Integrator decision (local continuation, after buildings r2 captures)

Applied the existing public `buildings.lotSurface(id)` contract in terrain's scatter. `src/modules/terrain/clutter-mask.js` spatially bins occupied lot, paving and building-footprint rectangles; `detail.js` refreshes the mask when `world.buildings.version` changes and rejects grass roots inside it. No new core registry or buildings API indirection is needed. Only terrain files changed. A 0.3 m margin accounts for leaning blades at edges.

Verified rotation, bin-boundary crossing and demolition invalidation with geometry fixtures. Visually compared `shots/buildings/r2/street_12.png` (before, critic evidence preserved) with `shots/integration/w2_lotmask_street_12.png` (after): paving has no protruding tufts, scene remains at 166 draws and zero errors. Existing lawn inset surfaces and building/base defects are unchanged and remain the buildings builder's responsibility.


## Integrator decision (wave 2 final, 2026-09-06)

Retained terrain clutter suppression under real lot surfaces and exact restore behavior. Applied only the infoview fallback-shell bypass: when world.infoview.buildingShellActive===true the native albedo tint is cleared, while published active/data/callback remain available. The controlled final-source probe restores every baseline pixel while active remains health. No native unlit RGBA alpha/top-light capability is claimed. Final4 visual repetition and strict far-roof pixel limit remain failed; this integration is not an extra scoring round.


## Integrator decision (wave 2b final, 2026-09-08)

Retained existing infoview proxy bypass and actual simulation-driven occupancy. Native RGBA/alpha/top-light/versioned rendered-surface film remains deferred because a partial implementation would double-composite or omit real geometry. Existing visual repetition and roof-pixel failures remain recorded.

## Integrator decision (wave 3 final, 2026-09-08)

Retained native zoning/spawn and visible mask contracts. Democity fills only the missing stock up to400 through public spawnFreeLots before preroll, making all/democity equivalent. No capacity/population/stock inflation or inherited showcase score increase. Lot yield, repetitive assets and composed triangle burden remain future coordinated work. See `docs/critic/integration_w3.md` for final checks and open issues. The user requested a checkpoint and pause; no new round is authorized.

## Integrator decision — R9s2 affected-lot restore (2026-09-10)

Added `buildings.restoreTransaction(data, lotIds) -> bool`. A road inverse removes and restores Buildings only for the symmetric set of changed Zoning lot IDs, preserving later unrelated construction and level changes. Full serialization is canonical by building ID. The adversarial all-mode probe advances Simulation, levels an unaffected building, restores the exact retired building record, and preserves that later unrelated record through undo/redo.

## Integrator refinement — R9t later construction (2026-09-10)

The affected-lot restore contract is now paired with Zoning link preservation on unchanged rows. A retained all-mode test frees distant lot3 before the road action, constructs real building692 on that lot afterward, advances Simulation, and verifies the exact building record plus `lot.buildingId=692` through undo and redo. An existing unrelated building is separately changed from level3 to level2 and preserved.
