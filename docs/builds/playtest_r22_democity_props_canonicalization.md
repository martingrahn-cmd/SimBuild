# R22 deterministic Democity Props canonicalization

## Scope

The rejected R9v mixed-marquee verification exposed a repeatable Props divergence in the staged seed-7 city: the first public `props.rebuild()` changed 5,972 items to 6,021. Democity first requested a complete density rebuild and then changed the finished landscape by removing 57 generated trees and planting 7 authored trees. Those final clearance and suppression changes had therefore never been canonicalized; a later rebuild could legally fill newly available generated placements and allocate new identities.

R22 performs one public Props rebuild after the complete Democity landscaping transaction. It does not write private Props records, change placement rules, density, geometry, clearance, serialization or normal-play behavior. The rebuild is part of deterministic demo staging only.

## Verification

- Production seed-7 repeated-rebuild diagnosis: PASS with zero simulation errors. Before, first rebuild and second rebuild each contain 6,021 items with the same per-kind counts, 6,101 identities, 7 manual items, 57 suppressed identities and `nextGeneratedId=6109`.
- Both rebuild comparisons are content-exact after excluding the expected owner version increment. No item ID is added, removed or changed.
- `node src/modules/simulation/selftest.mjs 90 1337`: deterministic repeat and exact mid-run save/load PASS.
- Production Democity capture: 60fps, 424 draws, 2,076,882 triangles, errors=0. The image was inspected; the final authored landscaping and dense city remain present.
- Evidence: `shots/playtest-fixes-r22/props-rebuild-production.json` and `shots/playtest-fixes-r22/democity-canonical-props.png`.

## Decision

Accept the owner-safe final canonical rebuild. Props remains **6.4/10 FAIL**, Democity remains **6.0/10 FAIL**, and whole-game remains **6.0/10 FAIL** because this closes a deterministic staging defect rather than improving the visible quality bar.

The broader R9v mixed-marquee change remains rejected. Current product marquee selection does not collect roads, and restoring the selected building/service pair leaves the building-to-lot link non-exact. Atomic failure compensation also fails. These are separate Tools/history defects and require a new bounded round.
