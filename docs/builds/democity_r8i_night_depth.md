# Democity r8i — deterministic occupied-window cues

**Decision: accepted as a small local night-depth improvement. Democity and whole-game remain 6.0/10 FAIL.**

## Diagnosis

Fresh matched seed-1337 captures confirm the independent whole-game r2 finding: the night city is readable and retains warm/cool variation, dark facade mass and a real retail base, but many upper-storey bays read as broad, empty luminous panels. The earlier r7w experiment already proved that changing far-window emission floors does not fix the wide-view bright-source shortfall, so this round does not change exposure, the lit ratio, emission distance, lamps or global effects.

The buildings atlas already provides three stable bay variants, a ceiling-biased emissive room gradient, baked per-window on/off state and real mullions/reveals. Variant 1 already contains blinds. Variants 0 and 2 had the same empty room mask.

## Bounded change

The buildings owner now adds small emissive-atlas occlusion shapes to variants 0 and 2 in ordinary and curtain-wall bays. One variant exposes a low cabinet-like block; the other exposes a narrow full-height partition and a lower block. They interrupt otherwise empty lit panes while preserving the existing baked window state.

The change adds no random draws, lights, geometry, IDs, records, save data, simulation rules or public APIs. It does not alter the lit-window decision, warm/cool choice or brightness tier. The complete current git diff for `atlas.js` also contains earlier room-gradient, albedo-reflection and fallback-roughness work; the r8i matched pairs principally prove the new occlusion shapes and must not be used to reattribute those older hunks.

## Verification

- Production build passes with 163 transformed modules.
- Public Democity API, double deserialize, eight tour stops and invalid-stop rejection pass. Counts remain 468 road nodes, 604 edges, 9,964 cells, 612 lots/buildings, 31 services and one eight-stop line.
- All 32 mixed-use lots, their building-owner plans, live lot links and repeated whole-save restores match exactly.
- The recorded 1337 and 7 authored restage digests repeat exactly. This digest covers buildings, services and Transit, not every world owner or GPU resource.
- All five matched baseline/candidate views keep identical draw and triangle counts and report zero errors. The close-night full-frame mean changes 46.4404 to 46.0719 and the above-luma-180 fraction changes 1.8063% to 1.7886%; downtown and suburb wide-view bright fractions are unchanged. This is localized darkening and structure, not a wide lighting solution.
- All 16 final High/Metal images are ready and zero-error. They peak at 469 draws and 2,808,896 triangles. Minimum sampled FPS is 42.6 and 7/16 frames are below 50, so the performance gate remains failed. Maximum raw endpoint heap is 740.7 MB and is not retained post-GC memory.
- The independent critic inspected all 26 original images, all 26 sidecars and three derived comparisons. The new shapes provide a modest occupied-room cue without an obvious supplied-view regression. Most panes remain flat, and lamp/facade/ground cohesion, service-yard ovals and pale destination sites are unchanged.

## Limits

The accepted scope is only the stable near-window cue. No dawn, golden-hour, weather, motion, temporal LOD, full-resolution specification crop, forced-GC memory, independent browser execution or new blind A/B run is supplied. Rank 3 remains open, and the score stays 6.0/10.

Evidence:

- `shots/democity/r8i-night-depth-baseline/`
- `shots/democity/r8i-night-depth-candidate/`
- `shots/democity/r8i-night-depth-final/`
- `shots/democity/r8i-night-depth-contract/`
- `docs/critic/democity_r8i.md`
- `docs/critic/democity_r8i.json`
