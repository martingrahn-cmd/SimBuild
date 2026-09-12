# Independent Democity r8i critic — night depth

**ACCEPT as a small local improvement. Democity 6.0/10; whole-game 6.0/10, FAIL against 8.5.** Some previously empty lit panes now contain darker lower blocks and narrow upright shapes. This gives a modest occupied-room cue without an obvious regression in the supplied noon/night views. It does not make the windows convincing interior volumes, and does not close whole-game rank 3. The score and current issue order remain unchanged.

I individually inspected **all 26 original PNGs** (five baseline, five candidate, sixteen final), their 26 sidecars and the three derived comparison/contact sheets. I read current STATUS/HANDOFF, the independent whole-game r2 report, r7w night-source diagnosis, the relevant buildings owner/night/material requirements and the complete current atlas diff. This is an independent review of supplied evidence, not my own capture run.

## Visual judgment and regression scope

The close night pair is the clearest positive evidence: a lower dark rectangle and taller cabinet/partition-like sliver interrupt some white and amber panes. The ceiling strip, dark mullions, varied lit/off pattern and retail base remain intact. The new shapes are themselves repeated simple rectangles; most windows still read as luminous flat panels. There is no view-dependent parallax or new physical interior depth. The wide downtown, suburb and industry pairs show almost no perceptual improvement. Broad service-yard light ovals, regular road spots and pale stadium/hospital masses remain outside this repair.

The matched close noon pair and all eight final noon controls retain readable glass and facade materials. I found no obvious new colour, opacity, geometry or material catastrophe. This is a bounded observed regression pass: the diff also changes glass albedo reflection strength and fallback roughness, so it is inaccurate to describe the entire git diff as emissive-only or to promise unchanged daytime appearance at every angle. Dawn, golden hour and motion are not supplied here.

The r7w diagnosis correctly cautions against treating far emission-floor scalars as a demonstrated fix. This candidate adds near-window structure instead; it has not established a new wide-view brightness solution or improved lamp/facade/ground cohesion. Accepting the small cue is compatible with leaving the larger night issue open.

## Source ownership, determinism and contract evidence

The current `src/modules/buildings/atlas.js` diff stays within the buildings atlas owner. Besides the new variant-0 and variant-2 emissive silhouettes in ordinary and curtain bays, it includes a redistributed `eRoom` gradient, much weaker baked albedo reflection streaks and fallback glass roughness 0.44. Explicit material overrides still take precedence. Shopfront reflection alpha also changes. No new random draws, IDs, world-state records, geometry, lights, global exposure, public API or save schema appear in the inspected diff. Stable formulas support deterministic atlas construction; they do not prove cross-browser pixel equality. The paired evidence principally demonstrates the added silhouette shapes, rather than independently dating every pre-existing-looking git hunk.

The supplied API probe reports all required public methods, both deserializations true, eight valid tour stops and zero errors. Its census is 612 buildings/lots, 9,964 zone cells, 31 services, and one transit line with eight stops. I independently compared the mixed-use payloads: all 32 records have matching building/lot ownership, mixed-use programme and retail plan, and the entire recorded before/first/second snapshots are equal. The stock remains 612. I also compared the actual restage digest strings: original equals returned seed 1337, and both seed-7 results agree. Those digests cover buildings, services and transit only. These are verified supplied results, not freshly executed probes or proof of every world/save failure path.

## Verified image and performance evidence

Every final summary row and aggregate agrees with its sidecar. All 26 records report zero errors and all 16 modules ready. The sixteen final frames report:

| Measure | Verified result |
|---|---|
| Draw-call maximum | 469, park noon — below 1,500 |
| Triangle maximum | 2,808,896, close night — below 3,000,000 |
| Lowest local FPS | 42.6, park noon; 7/16 below 50 |
| Raw endpoint heap | 740.7 MB, downtown noon; 9/16 above 512 MB |
| Largest final module endpoint | props 2.0 ms; none above 2 ms in these endpoint samples |
| Endpoint frame time / texture count | 23.5 ms / 74 textures; neither a GPU byte or stall test |

The five matched baseline/candidate camera pairs have identical reported draw/triangle counts. FPS and raw heap fluctuate; no causal performance improvement or regression is established by these short sequential samples. The final matrix measures 65–91 frames per capture, approximately 1.5 seconds. Total elapsed capture time around thirteen seconds includes startup/settling and is not a sustained benchmark. The earlier baseline close-noon props endpoint of 2.1 ms is not a new candidate CPU failure. Raw heap is not retained post-GC memory and does not demonstrate a leak.

I recomputed all eight `imgstats.json` rows from the original PNGs using the documented 480-wide Lanczos/luminance procedure. Results agree, except insignificant mean/std floating-point rounding below 1.5e-14. Close-night mean falls 46.4404→46.0719 and pixels above luminance 180 fall 1.8063%→1.7886%; p99/p50 moves 6.2719→6.2868. Downtown above-180 stays 0.5131%; suburb stays 0.5671%. Flat-component measures are unchanged. This supports small localized darkening, not a city-wide lighting improvement. These full-frame numbers cannot substitute for the buildings specification's full-resolution facade contrast/alias crops.

The sidecars still warn about deferred initial road furniture and no valid reserved university site. These are disclosed warnings, not fabricated console-error failures.

## Current ranked issues

1. **Sparse city fabric and repeated forms remain dominant.** Owner: democity; supporting owners: zoning, buildings, roads, services. Open; atlas change does not alter parcels or massing. Evidence: `downtown_12`, `interchange_12`, `park_12` in the final directory.

2. **Planar crowns and inconsistent foliage tiers remain.** Owner: props; supporting owners: terrain, democity. Open; retain the earlier bounded r8h improvement without implying completion. Evidence: `park_12`, `riverfront_12`, `industry_12` in the final directory.

3. **Night interiors remain flat and lighting remains disconnected from occupancy and ground.** Owner: cross-cutting; supporting owners: buildings, props, services, effects, democity. Small near-window improvement accepted; rank remains open and unchanged. Evidence: `night_downtown_22`, `downtown_22`, `suburb_22`, `industry_22`, `park_22` in the final directory.

4. **Abrupt grades, banks and site boundaries remain.** Owner: cross-cutting; supporting owners: terrain, roads, democity, buildings, services. Open; no new numeric collision or bridge-clearance failure asserted. Evidence: `riverfront_12`, `interchange_12`, `industry_12`, `bridge_12` in the final directory.

5. **Landmark materials and working-site context remain schematic.** Owner: cross-cutting; supporting owners: democity, services, buildings, props. Open; acknowledge repaired silhouettes. Evidence: `park_12`, `suburb_12`, `industry_12`, `bridge_12` in the final directory.

6. **Horizon/reflection/terrain layer seams remain.** Owner: cross-cutting; supporting owners: terrain, environment, effects. Open; explicit weather artistry was not retested in this bounded round. Evidence: `riverfront_12`, `riverfront_22`, `industry_12` in the final directory.

7. **Featured streets and destinations communicate limited human use.** Owner: cross-cutting; supporting owners: democity, traffic, transit, simulation, buildings. Open presentation issue; paused stills do not establish simulation or boarding failures. Evidence: `night_downtown_12`, `night_downtown_22`, `park_22`, `bridge_12` in the final directory.

8. **Local FPS and raw memory targets remain unmet.** Owner: cross-cutting; supporting owners: core, props, traffic, environment, effects, buildings. 42.6 FPS minimum; 7/16 below 50; raw heap 740.7 MB; not a causal atlas regression or retained leak finding. Evidence: `park_12`, `downtown_12` in the final directory.

## Inspection register

Every listed file was viewed individually; comparisons did not replace original inspection.

| Original PNG | Observation |
|---|---|
| `shots/democity/r8i-night-depth-baseline/downtown_22.png` | Wide window grids and road dots remain essentially unchanged; little city-scale interior-depth gain. |
| `shots/democity/r8i-night-depth-baseline/industry_22.png` | Matched industrial view is nearly unchanged; bright repeated equipment pools are not repaired by the building atlas. |
| `shots/democity/r8i-night-depth-baseline/night_downtown_12.png` | No obvious noon material or facade readability regression in the matched pair; restrained glass, blinds, retail base and geometry remain legible. |
| `shots/democity/r8i-night-depth-baseline/night_downtown_22.png` | Small dark lower blocks and tall slivers make some lit bays less empty; repeating flat panes and ceiling strips still dominate. Warm/cool variation and café strip survive. |
| `shots/democity/r8i-night-depth-baseline/suburb_22.png` | Matched night view remains stable; pale civic surfaces and broad yard ovals still look schematic. |
| `shots/democity/r8i-night-depth-candidate/downtown_22.png` | Wide window grids and road dots remain essentially unchanged; little city-scale interior-depth gain. |
| `shots/democity/r8i-night-depth-candidate/industry_22.png` | Matched industrial view is nearly unchanged; bright repeated equipment pools are not repaired by the building atlas. |
| `shots/democity/r8i-night-depth-candidate/night_downtown_12.png` | No obvious noon material or facade readability regression in the matched pair; restrained glass, blinds, retail base and geometry remain legible. |
| `shots/democity/r8i-night-depth-candidate/night_downtown_22.png` | Small dark lower blocks and tall slivers make some lit bays less empty; repeating flat panes and ceiling strips still dominate. Warm/cool variation and café strip survive. |
| `shots/democity/r8i-night-depth-candidate/suburb_22.png` | Matched night view remains stable; pale civic surfaces and broad yard ovals still look schematic. |
| `shots/democity/r8i-night-depth-final/bridge_12.png` | Coherent crossings and articulated cranes retained; empty apron and isolated industrial pads remain. |
| `shots/democity/r8i-night-depth-final/bridge_22.png` | Bridge and near tower remain readable; schematic port lighting and pale blank site surfaces persist. |
| `shots/democity/r8i-night-depth-final/downtown_12.png` | Readable height hierarchy, but towers remain isolated on broad lawns with repeated forms. |
| `shots/democity/r8i-night-depth-final/downtown_22.png` | Wide window grids and road dots remain essentially unchanged; little city-scale interior-depth gain. |
| `shots/democity/r8i-night-depth-final/industry_12.png` | Service structures and warehouse materials remain coherent; stretched terrain, abrupt grades and sparse site context persist. |
| `shots/democity/r8i-night-depth-final/industry_22.png` | Matched industrial view is nearly unchanged; bright repeated equipment pools are not repaired by the building atlas. |
| `shots/democity/r8i-night-depth-final/interchange_12.png` | Broad empty parcels and repeated tower crowns dominate; no new visible geometry or noon material regression. |
| `shots/democity/r8i-night-depth-final/interchange_22.png` | Regular lamp dots and subdued window grids remain; sparse city composition unchanged. |
| `shots/democity/r8i-night-depth-final/night_downtown_12.png` | No obvious noon material or facade readability regression in the matched pair; restrained glass, blinds, retail base and geometry remain legible. |
| `shots/democity/r8i-night-depth-final/night_downtown_22.png` | Small dark lower blocks and tall slivers make some lit bays less empty; repeating flat panes and ceiling strips still dominate. Warm/cool variation and café strip survive. |
| `shots/democity/r8i-night-depth-final/park_12.png` | Stadium silhouette and foliage colour retained; flat foliage and empty surrounding lawns remain. |
| `shots/democity/r8i-night-depth-final/park_22.png` | Readable paths and skyline; pale stadium and repeated ground lights still lack evening occupancy. |
| `shots/democity/r8i-night-depth-final/riverfront_12.png` | Near glass retains material identity; planar foliage, cloudy water reflections and ramp-like opposite-bank roads remain. |
| `shots/democity/r8i-night-depth-final/riverfront_22.png` | Warm/cool near panes remain readable but flat; ruler-straight bright horizon seam persists. |
| `shots/democity/r8i-night-depth-final/suburb_12.png` | Hospital, braced water tower and house materials remain legible; repetitive garden/lot spacing persists. |
| `shots/democity/r8i-night-depth-final/suburb_22.png` | Matched night view remains stable; pale civic surfaces and broad yard ovals still look schematic. |

Also inspected both derived near-window comparison images and the final contact sheet.

## Evidence limits

- Independent source/evidence review, not independent screenshot capture or browser/probe execution. All 26 original PNGs, all 26 sidecars and three derived images individually inspected; derived images do not increase the independent sample count.
- The 16 final frames cover eight presets at noon and 22:00 only. No fresh dawn, sunset, weather, 720p, free-camera motion, LOD flicker or blind A/B test. Eight CS2 references were calibrated in the preceding independent whole-game round, not freshly reopened for this bounded review.
- One seed 1337, High quality, 1920x1080, Chrome 152.0.7977.83, Apple M4 ANGLE Metal, port 5173, headless=1 and speed=0. FPS uses 65–91 measured frames in final sidecars, roughly 1.5 seconds; 12.5–13.2 second total capture elapsed is not the FPS window or warm init.
- Draw/triangle values are reported sampled render counts, not lastTriangles substitutions. Raw endpoint heap is not forced-GC retained memory. Module CPU and frameMs are endpoint samples, not sustained or worst-frame traces; no GTX1660-class certification.
- Current git diff also includes eRoom gradient, albedo reflection and default glass roughness changes. The supplied image pairs mainly isolate the added dark silhouettes; attribution of every older-looking diff hunk to this same pair is not independently established. Daylight pass is observed noon stability, not proof that all albedo/ORM changes are day-neutral.
- Contract files are supplied successful runs. Exact restage digests cover buildings/services/transit, not every world subsystem, atlas pixels or GPU objects. Mixed-use equality after two restores is not a general failed-save or transactional recovery proof.
- 480-wide full-frame imgstats are not the buildings specification full-resolution 200x200 facade or 128x128 far-tower crop tests. A p99/p50 ratio above 6 does not certify its separate strongest-10-percent/darkest-50-percent crop requirement.
- No source/status/handoff edits, extra capture files or test scripts were produced. Only the two requested critic reports were written.

Reviewed atlas SHA-256: `2d980256e58f9aa24dd29171a3a5188d9faa67837a1d3bbeca3f64fb28fd35f3`.
