# Infoviews — builder round 3

**Self-assessment: 6.3/10, FAIL.** This round fixes the measured cold recompute and exact-waterline continuity defects. It improves, but does not pass, night colour parity. Default terrain/road integration, building volume separation and three distribution gates still fail. Independent criticism is pending.

Production edits are confined to `src/modules/infoviews/data.js`, `render.js` and `index.js`. The r2 native-heightfield mesh in `ground.js` is unchanged. The source was frozen before the final matrix and independent critic. No terrain LOD override, global lighting/fog/exposure edit, simulation fabrication, commit or push was made.

## Changes and rationale

- Split small full-grid clamp/add/normalize/max/subtract loops out of the large twelve-view dispatcher. This reduces initial optimized-code overhead while preserving each formula, clamp and operation order; it does not warm or hide the first explicit sample.
- Convert shader data colour to output space exactly once. Apply the specified `.72 + .28 × normal.y` film top light in output space; use one front-facing shell surface and alpha 0.75 in both material and public callback.
- Owned data haze retains the environment’s live density, ray distance and height integration, but mixes toward achromatic output grey 0.48. This prevents sky/sun colour from remapping the data ramp. It intentionally removes coloured atmospheric tint on the data film, while leaving global fog untouched.
- Multiply the existing coast-distance ramp by a continuous 0–0.20 m height-above-water smoothstep, mirrored in the public alpha probe. This removes the previous 0.027570 exact-boundary jump. The shader’s existing 0.002 alpha discard is unchanged.

## Final evidence

Shared server http://127.0.0.1:5174; Chrome 152.0.7977.76; ANGLE (Apple, ANGLE Metal Renderer: Apple M4, Unspecified Version). Real Apple M4/Metal measurements: final matrix **32/32 ready, zero errors, 56.9–60.3 fps**, maximum **209 scene draws / 1,385,748 scene triangles**. This is real GPU timing, not SwiftShader. All 63 fresh builder PNGs were viewed (32 matrix, 14 final masks, 4 degraded/integrated extra images, 1 before image, 12 development on/off images); all eight CS2 references were freshly viewed. The JSON lists every exact file.

The complete official-tool matrix covers aerial/street/skyline/closeup at 6.5/12/17.5/22, all six declared presets at noon/night, two 720p cases and two integrated all cases. The matrix driver directly calls `tools/screenshot.mjs`; no separate gauntlet invocation is claimed. Final masks are native 1920×1080 frozen on/off pairs, sampled after two frames; statistics use full-resolution pixels.

| Measurement | Final result | Assessment |
|---|---:|---|
| First explicit full recompute | 5.6 ms | Pass ≤12 ms |
| Next ten full recomputes | 2.4–3.9 ms | Pass |
| 60-frame update means, active / inactive | 0.005 / 0.001667 ms | Pass |
| Full-grid derivation maximum error | 2.384185791e-7 | All 12 pass, zero mismatches >1e-5 |
| Landvalue / power / traffic owned draws | 2 / 3 / 2 | Pass |
| Landvalue / power / traffic owned triangles | 238934 / 238998 / 6864 | Pass |
| Native geometry flat / steep samples | 235 / 1765 | All flat pass; steep max 0.703997 m; none below |
| Pollution RGB day/night drift | 10.4990 / 10.7575 / 9.9915 | Fail ceiling 8 |
| Land-value RGB day/night drift | 6.8005 / 8.8380 / 8.4565 | Fail two channels |
| Pollution / land-value night p99 luma | 196.4756 / 212.3292 | Pass ceiling 235 |
| Ten land-value roof/wall luma steps | 0.7047–22.3767 | All fail minimum 25 |
| Ten density confirming face steps | 2.8808–12.8387 | All below 25; crop contamination caveat |
| Exact shoreline / +1e-5 m maximum alpha | 1.114e-24 / 9.543e-12 | No measured finite jump |
| Water / inland alpha, 200 samples each | 0 / 1 | Pass |
| First 20 intersections, 65 arms | Maximum gap 0 m | Pass |

Data parity is measured using the prescribed top-2000 data-pixel ordering. Native ground and building lighting still influence partially transparent film pixels. The improvement is real, but a visible roof/volume fix is not established by the shader formula alone. No claim is made that further owned improvements are impossible.

The exact 21671-cell domain still reports pollution p95−p5 **0.186521**, garbage **0** with **97.5313%** near its mean, density **0.029940** with **94.7487%** near its mean. All twelve arrays agree with the previously independent instrument. The mandated three-day pre-roll yields 246 buildings and 141 residents; actual service-kind queries and empty-items-only fallback remain valid. These fail honestly.

The final shore instrument samples ten x-axis transects at each integer metre from −8 to +8 plus epsilon/12/16/20 m points. All are monotonic; the 200 independent inland samples are one. Some oblique transects remain below one at +20 m (minimum 0.969913), so these do not certify the exact shore-normal eight-metre width.

All twelve UI switches have one synchronous event. At 720p the picker is 316×134 and legend 316×211.4375, with no overflow. Actual play toolbar and all-mode activation produce one HUD legend and no duplicate own panel. The integrated demo city is currently empty: these images verify integration, not a populated playable game. Off mode clears data/legend/geometry within two frames; some water reflections retain stale film colour. The cross-fade reaches one at 319.7 ms. Save/load restores crime on a fresh page and malformed values do not replace it.

Three idle game hours cause three recomputes and a 20-event burst causes one. Heap end−start is −1,228,128 bytes; this is an observed whole-page GC result, not allocation-free proof. Initial API scene stats (224 draws, 1,537,880 triangles) are preserved alongside steadier matrix stats. Earlier GPU toggle samples in `settled-probe.json` and `final-probe.json` are contaminated by native LOD/CSM work; `shore-full.json` retains these effects and supplies settled on/off/on2 pairs.

## Acceptance ledger

### Met or measured clauses

- 1: All twelve ordered synchronous activations publish exactly one event, a 65536-value grid and complete legend. All twelve full grids match the independent reference instrument within 2.384185791e-7.
- 5: Noon top-decile saturation is 0.553358 pollution and 0.567785 power, both above 0.45; saturation ratios remain diagnostic.
- 6: Land-value deciles occupy five of eight L* buckets; adjacent maximum-channel differences are 60,125,129,224.
- 9: All 65 sampled arms from the first 20 intersections have zero ribbon gaps at 0.5 m spacing.
- 10 measured clauses: 200 water samples equal zero and 200 inland samples equal one. Ten one-metre +/-8 m shoreline transects are monotonic; exact-boundary alpha <=1.114e-24 and +1e-5 m alpha <=9.543e-12. Exact shore-normal transition width remains unmeasured.
- 12: All seven specified coverage fractions are within [0.10,0.85] with the permitted empty-service fallback.
- 13–15: Twelve-icon picker, compact legend, no 720p overflow; actual ordinary-play toolbar activation produces one HUD legend and zero duplicate module panels.
- 16: Within two frames, active/data/legend are null, desaturation zero, no owned mesh visible and overlayDraws zero.
- 17: Declared budget eight is reconciled; owned draws two or three. Settled pairs: landvalue +2/238934 triangles, power +3/238998, traffic +2/6864; within 260000 triangles.
- 18: Terrain-only and terrain-plus-roads degraded scenes remain coherent and ready with zero console errors.
- 19: All twelve grid sums agree to six decimals on two fresh pages.
- 20: First explicit full recompute 5.6 ms, next ten 2.4–3.9 ms; active 60-frame mean 0.005 ms, inactive 0.001667 ms. Three idle hours cause three rebuilds, a 20-event burst one. Whole-page heap delta -1228128 bytes.
- 21–22: Monotonic cross-fade reaches one at 319.7 ms. Fresh-page crime restore works within two frames; invalid deserialization leaves crime unchanged.
- 23: All 32 final matrix images and two degraded images are ready with zero errors; every final mask and probe also has zero console errors.

### Missed

- 2: Exact-domain pollution p95-p5=0.186521, garbage=0 with 97.5313% flat, density=0.029940 with 94.7487% flat. Required three-day pre-roll and true formulas remain unchanged.
- 3: Pollution day/night RGB drift 10.4990/10.7575/9.9915 and landvalue 6.8005/8.8380/8.4565 still exceed the eight-level ceiling. Night p99 luma passes.
- 4: Numerical native-heightfield conformance passes, but default display terrain still cuts hillside holes and ground film loses asphalt/kerb relief and leaves road wedges.
- 7: All ten pinned land-value roof/wall steps 0.7047–22.3767 are below 25/255. Density confirming crops give 2.8808–12.8387. Valid RGBA callback coverage is 246/246 at alpha 0.75, but that does not pass visible volume separation.

### Unmeasured, not failed

- 8: Continuous exact tints are present, but separate ramp-position Spearman measurement was not run; distinct-colour definition remains advisory under residual guidance.
- 10 width: One-metre +/-8 m transects and epsilon continuity were measured, but they are x-axis transects, not shoreline normals. They do not establish exact eight-metre normal width; this is not converted into a false pass or failure.
- 11: Required power and fallback skyline near bands both contain zero <=200 m overlay pixels. Near/far saturation ratio is unmeasurable, not failed; materials retain fog:true and live fog density/height falloff.

## Remaining work and integration requests

- Default terrain display LOD and overlay topology differ, leaving obvious hillside holes. Ground film still obscures road/kerb relief and produces road wedges.
- Building films remain broad footprint boxes that do not follow setbacks, crowns or equipment. Exact fixed top light and front-face-only alpha 0.75 improve compositing but all measured roof/wall contrasts still fail.
- Night colour stability improves but both prescribed image pairs remain above threshold. The grey data-haze choice keeps current density and height falloff while sacrificing sky-coloured atmospheric tint only on owned data surfaces.
- Three mandatory distribution gates fail with only 141 residents in 246 buildings after the required pre-roll; no population invention, per-view normalization or source-formula changes were used.
- Waterline probe is continuous, but exact shore-normal eight-metre width is unverified; shader retains its pre-existing alpha<0.002 discard.
- Traffic/density preset framing is obstructed by foreground buildings, crime has visible grid boundaries, and service source markers are weak.
- Integrated ordinary-play activation is verified on an empty democity and does not establish a populated playable whole game.
- Adaptive mesh refinement has no universal cap for pathological custom terrain, though the prescribed staged seed stays within 260000 owned triangles.
- Some two-frame off plates retain coloured water reflections despite zero visible owned objects; planar-reflection cache/layer integration needs follow-up.

Keep the existing core requests for native terrain display topology or native film support, road surface relief, one native versioned RGBA building-film composite, and reflection invalidation. The building request must preserve alpha 0.75 and the fixed normal term; enabling old sun-lit tint underneath the owned shell would duplicate it. Root owns the core seam decisions.

Evidence: `shots/infoviews/r3/matrix/summary.json`, `masks/`, `pixel-analysis.json`, `api.json`, `builder-probe/data-api.json`, `contracts.json`, `shore-full.json`, `network.json`, `final-probe.json`. Frozen eight-file source SHA-256 values and all image paths are in `docs/builds/infoviews_r3.json`.
