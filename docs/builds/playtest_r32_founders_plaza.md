# R32 Founders Plaza site integration

## Scope

Fresh R31 park evidence showed a large reserved but unprogrammed civic foreground beside Founders Arena and the accepted R26 large park. R32 places one existing 48×48 `plaza` through the Services owner at `(432,348)`. A public validation sweep across seeds 1337 and 7 found this as the only tested 8 m-grid position in the civic district that passed frontage/slope validation in both worlds without intersecting the arena or large park.

The plaza is a real facility with cost, upkeep, park coverage, paths, fountain, benches, lamps and vegetation. It is not Democity-owned display geometry. Roads, zoning lots, buildings, population, jobs and their existing identities are unchanged.

## Evidence

Evidence directory: `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/evidence/playtest-fixes-r32/`.

- `plaza-contract.json`: seeds 1337/7 preserve exact road, lot and building hashes at 604/612/612 and 646/648/648. Candidate and repeat add exactly one deterministic plaza as service id 33, preserve the existing large park, and round-trip Services exactly with zero errors.
- Population/jobs stay exactly 8,025/19,867 and 8,044/23,105. The real plaza lowers net income by about ¢113.67/day and leaves staged treasury above ¢25,713 on both seeds.
- The inspected matched park view fills the previously blank civic foreground with a coherent surfaced plaza, fountain, seating, planted edge and night lighting. Day submissions remain 493 draws while triangles rise 1,902,568→1,935,258 (+32,690). The candidate night is 453 / 2,290,384 and overview is 580 / 2,983,078, all errors 0.
- Canonical Vite build: PASS, 164 modules.
- `node src/modules/simulation/selftest.mjs 90 1337`: PASS; deterministic repeat and exact mid-run save/load.

Normal single-run fps varied too widely to support a causal performance claim. The overview remains under 3M triangles but only by 16,922, so geometry margin remains a failed-risk item rather than a closed gate.

## Decision

Accept R32 as a bounded real civic-site improvement. Democity remains **6.0/10 FAIL**, Services remains **7.0/10 FAIL**, and whole-game remains **6.0/10 FAIL**. The plaza does not resolve broader block repetition, planar foliage, road/terrain integration, night depth or sustained performance.
