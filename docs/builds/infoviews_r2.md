# Infoviews — builder round 2

**Self-score: 6.0/10; not accepted.** This is the builder assessment, not the independent critic verdict. Production source was frozen before final evidence and the critic was notified. The interrupted round was recovered from disk without discarding useful partial work.

The adaptive ground now uses native 4 m refinement where required, stitches coarse/fine boundaries, promotes unsafe stitched fans, and maintains a +0.055 m base lift. The complete actual staged heightfield diagnostic finds zero below-terrain triangle centres, minimum +0.055 m, maximum vertex lift +0.705 m, using 235,982 ground triangles. The required browser probe passes all 235 flat and 1,765 steep samples. This does **not** repair the visible default-LOD hillside holes: the separately rendered native terrain uses different coarse triangles.

A same-camera diagnostic changing only the native terrain debug LOD from [14,41,133] visible chunks to [188,0,0] removes the mountain holes with the infoview mesh unchanged. This is evidence for native terrain film support or a display-surface contract. The forced finest run costs 2,585,824 total triangles and is not a production fix or passing budget shot. Road wedges and lost kerb relief remain.

The recovered crop helper rejects projections outside the camera depth interval and selects camera-facing walls. Density now returns ten bounded roof/wall pairs rather than invalid whole-frame rectangles. The actual face separation still fails. Cached spatial kernels and coverage grids preserve all twelve exact fixed-domain derivations and improve warmed recomputation to 4.2–4.8 ms; the first two measured calls remain 17.1 and 15.4 ms.

## Evidence and costs

All eight CS2 references, all 32 final matrix images, 14 native-resolution mask on/off plates, two degraded configurations, two real HUD probes, two LOD diagnostic frames and the fresh recovery smoke were viewed. The complete path list is in the JSON report. All final matrix shots are ready with zero errors. Final matrix range: **58.9–60.4 fps, maximum 182 draws and 1,474,718 triangles**, Chrome 152.0.7977.76, ANGLE Metal Apple M4, shared port 5174. The complete four-camera/four-time matrix was captured by the official screenshot tool through a driver; no separate gauntlet invocation is claimed.

Owned maximum is three visible draws and 238,998 triangles against eight/260,000 declared. The clean power activation pair measures +3/+238,998 and traffic +2/+6,864. Land-value pairs are contaminated by host LOD/CSM changes, including a negative delta; they are not treated as clean cost evidence. The separate recovery smoke recorded 228 draws, 1,563,810 triangles and 53.1 fps during concurrent initialization, also zero errors.

## Acceptance

- 1: All twelve ordered views dispatch synchronously with exactly one event, 65536 values and a complete legend; all twelve fixed-domain grids match the independent reference instrument within 2.384185791e-7.
- 5: Pollution and power top-decile saturation are 0.522157 and 0.531446, exceeding 0.45. The world desaturation ratios remain diagnostic.
- 6: Land-value ramp occupies five of eight L* buckets; adjacent maximum-channel differences are 60, 125, 129 and 224.
- 9: All 65 measured arms from the first 20 intersections have zero ribbon coverage gaps at 0.5 m sample spacing.
- 12: All seven coverage fractions lie in [0.10,0.85] under the specified empty-service fallback.
- 13–15: Compact legend/picker, no 720p overflow, one integrated HUD legend and zero duplicate own panels; actual ordinary-play toolbar activation was exercised.
- 16: Within two frames, active/data/legend are null, desaturation is zero and no owned geometry is visible; the API probe active/off scene difference is two draws.
- 17: Declared eight-draw budget reconciled; own visible counts are two or three. Clean power pair adds three draws/238998 triangles and traffic adds two/6864; land-value GPU deltas are contaminated by host LOD/CSM changes and not counted as clean evidence.
- 18: Both terrain-only and terrain-plus-roads degraded configurations render a coherent heatmap/legend, ready with zero errors.
- 19: All twelve grid sums match to six decimals on two fresh pages.
- 21–22: Transition increases monotonically to one at 311.6 ms; crime restores on a fresh page within two frames; invalid deserializations warn without changing the active view.
- 23: All 32 final matrix shots, including all standard times/cameras, all six declared presets at noon/night, two 720p views and two all-showcase views, are ready with zero errors.

### Remaining failures

- 2: Pollution p95-p5=0.186521; garbage p95-p5=0 with 97.5313% flat; density p95-p5=0.029940 with 94.7487% flat. Fixed derivations and required three-day pre-roll are preserved.
- 3: Pollution night channel deltas are 14.1265/19.0800/14.6780 and land value 8.7940/11.0920/11.0970, all exceeding the eight-level ceiling. Night p99 luminance passes.
- 4: Prescribed 2000-vertex lift/material probes pass and all actual-heightfield triangle centres are above terrain, but default native terrain LOD still cuts visible hillside holes; road wedges and lost kerb relief remain. Visual acceptance fails.
- 7: Crop projection is repaired and both views produce ten valid roof/wall pairs, but all ten land-value face steps (0.942–20.657) and density steps (1.390–13.205) remain below 25.
- 10 partial: 200 water samples are alpha zero and 200 inland samples are alpha one. Ten sampled transects are monotonic, but a waterline jump up to 0.027570 remains. The rerun used offsets 0,2,4,6,8,10,12,16 m rather than the mandated one-metre +/-8 m series, so exact transition width is unverified.
- 20: Full synchronous recompute first call 17.1 ms and next call 15.4 ms exceed 12 ms, despite subsequent 4.2–4.8 ms samples. Active/inactive 60-frame means, hourly/event coalescing and observed heap growth pass.

### Unmeasured / advisory

- 8: Exact continuous tints are present, but no separate ramp-position Spearman instrument was run; the residual distinct-colour definition is advisory.
- 11: Both required power and fallback skyline captures have zero <=200 m overlay pixels. Their near/far saturation ratio is unmeasurable, not failed. Fog material flag is true.

The three-day pre-roll produces 246 buildings, 141 residents, 41 edges, 33 nodes and a 21,671-cell city mask. The eight prescribed real service placements were attempted and rejected by validation, leaving the specification's empty-items fallback valid. Current service facility-kind queries are correct; no aggregate remapping was introduced. A separate valid clinic placement demonstrates the API works but one simulation tick does not establish propagated health coverage.

The exact 12-grid comparison (largest absolute difference 2.384185791e-7) reruns a previously independently authored reference instrument. It is builder verification, not an independent round-2 verdict. No domain normalization, fake residents or fabricated garbage were used to force histogram passes.

Active and inactive 60-frame means are approximately 0.001667 ms. Three idle game hours cost three rebuilds; twenty simultaneous change events cost one. Whole-page heap changed by -31,726,700 bytes over the observed run: a GC observation, not proof of zero allocation. Fresh crime restore and deterministic grid sums pass.

Pollution/power noon saturation is 0.522157/0.531446. Their world-relative ratios are 1.904462/2.694785 (diagnostic); the unconsumed desaturation request remains 0.72. Non-overlay night luminance drops 58.1068% for pollution and 39.0656% for land value (diagnostic). Night p99 overlay luminance is 197.123/214.117, below 235. The remaining failure is colour drift, not additive clipping.

Ordinary-play toolbar activation and all-showcase API activation both display exactly one HUD legend. The all-showcase still contains an empty democity stub; these images verify integration safety and UI wiring, not a populated playable whole game.

## Remaining weaknesses and next level

- Default terrain LOD produces obvious hillside holes; opaque ground paint also erases kerbs/asphalt and leaves dashed road wedges.
- Buildings look like flat coloured shells with roof equipment exposed; fixed top-light compositing does not achieve required roof/wall contrast or night parity.
- The mandated pre-roll produces only 141 residents across 246 buildings. Pollution, garbage and density distributions fail honestly; values were not renormalised or fabricated.
- Cold full recomputation remains over budget. Cached kernel reuse improves warmed calls but does not certify the cold ceiling.
- Shoreline hard cut is much smaller but not fully removed; exact one-metre transect evidence is incomplete.
- Traffic and density preset framing has foreground building obstruction; crime shows hard data-cell boundaries; service source markers are visually weak.
- Integrated HUD activation is verified on the currently empty democity stub and does not establish a playable populated whole game.
- Adaptive refinement has no universal triangle cap for arbitrary pathological terrain; the prescribed staged seed remains within the owned 260000 triangle ceiling.
- Off-plates retain pink/orange water reflections after two frames despite zero owned visible objects, suggesting the existing planar reflection cache/layer integration seam.

Integration requests and correction of the stale round-1 service claim are appended to `docs/core-requests/infoviews.md`. Source SHA-256 values in the JSON bind this report to the frozen module. No production files outside infoviews, core files, renderer settings, commits or pushes were changed by this builder.
