# Playtest R34 — street-night render-budget diagnosis

## Scope

R34 started from accepted R33 and investigated the directed Democity street-night peak of about 3.005M triangles. No product change was accepted.

## Evidence

- Fresh R33 owner masks at the locked street/22:00 camera attribute peak submission sensitivity to Terrain (~901.6k triangles), Props (~1.099M), Roads (~712.2k), Services (~383.4k), Buildings (~200.1k), Transit (~56.9k) and Traffic (~42.1k). These complete-owner masks are diagnostic and non-additive.
- R31 already reaches 3,011,174 triangles in a 90-frame same-camera sample. R32/R33 reach about 3,005,384–3,005,400. The Founders Plaza is therefore not the origin of the gate failure.
- Single screenshots can land on the quieter ~2.576M main-frame phase. The official maximum includes recurring reflection/shadow composition; a quiet last frame is not substituted for the recorded peak.

Evidence directory: `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/evidence/playtest-fixes-r34`.

## Rejected candidates

Two disposable Props lamp-pool tessellation candidates changed the existing 12×12 surface-fitted grid:

- 11×11 reduced 46 triangles per lamp but removed the symmetric centre sampling and produced obvious triangular/star-shaped pool gaps at the kerb.
- 10×10 restored a centre point and reduced 88 triangles per lamp, but the close lamp view still showed harder polygonal segmentation than the accepted 12×12 pool.

Both candidates were inspected at original resolution, rejected, and reverted. They must not be described as performance improvements. The accepted soft pool, terrain/pavement height sampling, owner state and save behavior remain unchanged.

## Decision

Close R34 as a diagnosis/rejection checkpoint. Product source remains exactly R33 (`216ab89`). Scores remain unchanged. A future round should address a visible ranked defect from current source or introduce a pass-specific ledger before revisiting the narrow 3M peak; it should not simplify lamp pools solely to satisfy aggregate triangle counts.
