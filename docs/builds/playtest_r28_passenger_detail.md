# R28 close passenger-vehicle detail

## Scope

R28 addresses the remaining close-range Traffic art defect after the accepted box-truck, van, semi and bus rounds. Sedan, hatchback, SUV, taxi and police LOD0 models gain body-side window/rocker breaks and two door handles per side. The pickup gains a cabin handle, lower trim and bed-rail break. Authoritative length, width, height, axles, route behavior, materials and LOD1/LOD2 geometry are unchanged.

## Contract evidence

`tools/traffic-passenger-detail-probe.mjs` compares R27 on port 5185 with the R28 candidate on 5186 and repeats the candidate.

- Traffic serialized state remains exact across baseline and both candidate runs: SHA-256 `7e71ef53c5fd12af036044c89d0645a043031ad581e6a8bc8f2f792f514e006c`.
- LOD0 geometry increases only for the intended classes: +96 triangles for sedan, hatchback, SUV, taxi and police; +72 for pickup.
- Van, box truck, bus, semi and motorbike LOD0 counts remain exact.
- The full Traffic causality probe passes empty-road, 22-person settlement, land-use purpose, freight gating, dead-end U-turn, portal, deterministic and exact-restore assertions with zero errors.
- The 90-day Simulation selftest passes same-seed determinism, different-seed divergence and exact mid-run save/load.
- The candidate clean build transforms 164 modules and passes from the externally cloned/recovered repository source.

## Visual and performance evidence

The inspected matched fleet capture gives the previously smooth passenger shells readable side breaks and small handles without changing their silhouette. The pickup bed and cabin separate more clearly. Existing van, truck, bus, semi and motorbike art remains visually identical.

The fleet capture stays at 112 draws and 60.1 fps with zero errors. Submitted triangles rise from 876,298 to 879,058, a +2,760-triangle / +0-draw directed-scene delta. This is close-camera evidence, not a sustained whole-game performance claim.

Evidence directory: `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/evidence/playtest-fixes-r28/`.

## Decision

Accept the bounded Traffic-owned LOD0 improvement. Traffic remains **7.2 FAIL** and whole-game remains **6.0 FAIL**. Passenger cars still share a stylized family language and lack broad animation/asset variety; the change does not justify a score increase.
