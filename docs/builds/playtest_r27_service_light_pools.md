# R27 service light-pool presentation

## Scope

R27 addresses the current-source night defect exposed by the accepted R26 Founders Park view: real Services path lamps produced large pale discs that competed with the park and road lighting. The retained change gives service light pools their own 128×128 radial texture, warmer colour and lower night opacity. Contact shadows retain their established radial texture and material. Lamp placement, instance geometry, visibility ownership, service state, coverage, upkeep and simulation behavior are unchanged.

## Contract evidence

`tools/services-light-pool-probe.mjs` compares the R26 production build on port 5184 with the R27 candidate on 5185 at 22:00, then inspects the candidate at 12:00.

- Both builds retain exactly 60 service light-pool instances and 179 service contact-shadow instances.
- Pool and contact plane geometry remains four vertices / six indices.
- The Services serialization hash is identical: `6863316911ca5e7ccd4dcfba00e70bba0d13dc4812b8493759fba3ca1b637533`.
- R26 shared one texture for contacts and pools. R27 separates them: contact alpha samples remain `[179,164,128,71,2]`; pool samples become `[133,96,44,12,0]` from centre to edge.
- At 22:00 the pool material remains visible at opacity 0.48 with warm `#d9a45f`; at 12:00 it is invisible with opacity zero.
- The two-seed Democity/Services state probe passes exact road, lot, building and service hashes, deterministic repeat and exact Services serialize/deserialize.
- Browser and engine errors are zero. The 90-day Simulation selftest passes same-seed determinism, different-seed divergence and exact mid-run save/load.
- Canonical Vite build passes with 164 modules.

## Visual and performance evidence

The inspected matched 22:00 park view replaces the R26 broad pale discs with smaller warm cores and a softer falloff. Paths and lamp positions remain legible without the pools becoming the dominant shapes. Submitted geometry is exactly unchanged at 453 draws and 2,258,608 triangles; the candidate reports 60.0 fps and zero errors versus R26's 58.3 fps, with no performance gain claimed from that normal run-to-run variation.

The inspected 12:00 candidate remains visually unchanged. It reports the same 493 draws and 1,903,498 triangles as R26, with zero errors. ImageMagick reports normalized MAE `1.37615e-06` against the accepted R26 day capture, consistent with frame-level rendering variation rather than a daytime presentation change.

Evidence directory: `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/evidence/playtest-fixes-r27/`.

## Decision

Accept the Services-owned presentation repair. It fixes the verified lamp-pool shape while preserving contact shadows, real lamps and all persistent gameplay state. Services remains **7.0 FAIL** and whole-game remains **6.0 FAIL** because physical light interaction, broader night composition, stylized foliage, sparse/repeated city fabric, sustained performance and human play judgment remain open.
