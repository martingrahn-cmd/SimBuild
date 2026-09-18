# R26 Founders Park service integration

## Scope

R26 addresses a fresh current-source whole-game defect: the Founders Arena camera showed a landmark surrounded by a large, weakly programmed lawn. The accepted change places one existing `park_large` facility through the Services owner at `(460, 268)` after the established zoning allocation. It therefore provides real park coverage, upkeep, paths, fountain, seating, lamps and vegetation without adding Democity-only display geometry or changing road, lot and building identities.

Two earlier candidates were rejected and reverted. Scattered Props benches remained visually disconnected on grass. A Democity-owned arena forecourt read as an isolated slab and initially exposed an incorrect geometry-argument order during inspection. Neither candidate is retained.

## Contract evidence

`tools/democity-park-contract-probe.mjs` compares the R25 production build on port 5183 with the R26 candidate on 5184 for seeds 1337 and 7, then repeats each candidate.

- Seed 1337 retains exact SHA-256 hashes for 604 roads, 612 lots and 612 building records.
- Seed 7 retains exact SHA-256 hashes for 646 roads, 648 lots and 648 building records.
- Each candidate has one deterministic 96×96 `park_large` service, ID 32, at `(460, 268)`; repeated service hashes match.
- Services serialize/deserialize is exact in every baseline and candidate page.
- Population and jobs remain exact against R25: 8,025/19,867 and 8,044/23,105.
- The real park changes operating cost as intended: candidate net is about ¢185.51/day lower on each seed. Treasury still finishes positive at about ¢25,719 after deterministic staging.
- Browser and engine errors are zero. The 90-day Simulation selftest passes same-seed determinism, different-seed divergence and exact mid-run save/load.
- Canonical Vite build passes with 164 modules.

## Visual and performance evidence

The matched 12:00 park capture changes the empty eastern lawn into a readable public park with paths, fountain, lamps, benches and planted edges. The existing city buildings, arena and road fabric remain identical. The candidate reports 493 draws, 1,903,498 triangles, 60.0 fps and zero errors versus the matched R25 park's 483 draws, 1,846,476 triangles and 59.9 fps. The local cost is +10 draws and +57,022 submitted triangles.

The inspected 22:00 view remains readable at 58.3 fps with zero errors. Its service lamp pools remain conspicuous pale discs, an existing Services presentation weakness; R26 does not claim to repair it. The inspected overview is zero-error at 54.6 fps and shows the new park as a coherent real block. These are directed captures, not a replacement for the full whole-game performance matrix.

Evidence directory: `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/evidence/playtest-fixes-r26/`.

## Decision

Accept the owner-correct park service. It materially improves one verified schematic landmark site while preserving the established road, parcel, building and simulation identity contracts. Democity remains **6.0 FAIL**, Services remains **7.0 FAIL**, and whole-game remains **6.0 FAIL** because sparse block fabric, repeated building forms, foliage quality, night light-pool presentation, wider performance margin and human play judgment remain open.

