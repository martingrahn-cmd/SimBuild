# Democity R8o — independent rejection audit

**REJECT all four product candidates. Retain the restored pre-R8o material. Democity and whole-game remain 6.0/10 — FAIL against 8.5.** None of these variants visibly resolves the coarse mountain surface enough to justify keeping it. The diagnostic work is useful; it is not a visual improvement.

I individually inspected all **27 original PNGs**: four baseline city frames, sixteen city candidate frames, three isolated baseline frames, three isolated candidate3 frames and one magenta layer diagnosis. Every corresponding sidecar reports ready modules and zero errors. The earlier count of23 was a counting error, subsequently corrected by the builder.

## Candidate judgments

- **Candidate1 — REJECT:** Scale/rotation/domain warp leaves the broad pale scree islands and repeated mountain motifs essentially unchanged. Crop correlations are mixed, with industry slightly worse; no convincing full-frame gain.
- **Candidate2 — REJECT:** Reduced mask macro noise exposes larger pale areas and clearer contour-like material borders, especially industry. The resulting material organization is more artificial.
- **Candidate3 — REJECT:** Secondary rock sample earns no visible improvement in city or isolated pairs. Isolated mean absolute RGB change is 0.013635–0.061232; extra shader sampling has no demonstrated visual return. Its GPU-time cost was not isolated.
- **Candidate4 — REJECT:** Darker scree reduces brightness and luminance spread but leaves coarse patch layout intact. Less pale is not equivalent to better geology; no clear net improvement in the originals.

Candidate2's expanded pale skirts are particularly evident behind the cooling towers. Candidate4 is less pale but still reads as broad smooth islands over a stretched/noisy slope. The existing black stippling and repeated soft dark shapes remain. The isolated terrain views expose the same simplified landform and surface organization without city occlusion. There is no basis for a higher score.

## Attribution and restored source

The magenta diagnosis marks much of the pale lower slope and scattered upper patches. It supports attributing that component to scree, rather than treating the whole mountain as triplanar rock. Current `terrain/index.js` loads `rock_face` and `gravel_floor_02`; material layer3 is rock and layer5 is scree. The inspected selection combines resolved slope, altitude, 170m/41m macro channels and fine noise before blending rock/scree/grass. Texture palette, material distribution and landform all contribute. These four failures do not prove that every shading-only solution is impossible; they do rule out retaining these particular attempts.

I independently hashed `src/modules/terrain/material.js`: **`fcc1c60e31f321d72be524789ac53da31f0bcdffd68419dc29c04c0ff41478b0`**, exactly the supplied pre-R8o/restored value. The current scree path is the original layer5 sample at14m and palette multiplier; rock retains its original three triplanar samples and scale. No secondary candidate sample, candidate palette or magenta override remains. `git diff --check` passes. The nonempty git diff contains earlier texture-array changes and must not be misreported as residual R8o work. This confirms restoration against the supplied baseline hash; full historical candidate source snapshots are not present in these evidence directories.

With all R8o hunks reverted, there is no retained R8o geometry, RNG, state/save, API or gameplay change to approve. The builder reports a163-module build pass; this critic did not rerun it or rerun broader contracts.

## Independent metric verification

Using Pillow and NumPy on originals, I exactly reproduced all seven matched-difference records (three isolated candidate3 and four candidate4): mean absolute RGB, per-pixel maximum-channel difference thresholds >2/>8, p95 and maximum. Candidate3 isolated mean differences are **0.061231674 (valley12), 0.013634902 (coast12), 0.042187339 (valley17.5)**. Pixels changing >2 are **1.060475%, 0.167535%, 0.528260%** respectively; >8 remains below0.014%. These are small full-image effects, not evidence of geological improvement.

Candidate4's >2 percentages reproduce as **15.391975% industry12, 7.199460% riverfront12, 6.626109% riverfront17.5 and12.332369% interchange12**. These full-image numbers also include unrelated traffic/HUD changes; they cannot be treated as an exact mountain-only mask.

Pinned crop luma spreads reproduce within float32 rounding: **31.127964→29.095728, 30.466208→28.721722, 26.032951→24.988916, 28.124783→26.712694**. Maximum luma-stat residual from stored records is0.000022889. Candidate1/baseline Gaussian-highpass repeat calculations reproduce all lag correlations within3e-8 and high-frequency standard deviations within0.000001908. Industry repeat peak rises0.147275→0.151275 while other peaks fall slightly; this mixed result does not establish a perceptual win. Crop measurements are supporting evidence, not substitutes for the original images.

Cameras, time, seed, quality and dimensions match in the compared pairs. **Not every city geometry counter is identical:** riverfront12 is241draws/1,311,068triangles in baseline and246/1,312,596 in every candidate. Last-frame counters differ there and at industry12 candidate1. All three isolated pairs have matching geometry counts. Different render/reflection and traffic phases are possible; these counters do not prove that terrain geometry changed. The builder's earlier blanket claim of identical per-camera counts was too strong.

## Performance and next priority

Across these mixed experimental captures, minimum FPS is40.0, eight of27 are below50, and raw endpoint heap reaches738.5MB. Those are **not a final production matrix**. Baseline city windows are40.0–49.6FPS; candidate city windows48.3–60.0FPS, while isolated terrain is around60FPS. These separate sessions do not establish a shader optimization or a causal GPU cost. Props update endpoints reach2.3ms in baseline interchange12 and2.1ms in candidate3 interchange12; previous accepted R8n park12 also reached2.1ms. Raw heap is not retained post-GC memory.

**Next bounded owner-safe priority: profile props frame work and allocations with core instrumentation in the existing slow interchange/park views.** Keep world state, camera, visible content, simulation and reflection behavior fixed; separate CPU work, GPU work and GC before choosing an optimization. Do not infer an improvement by removing city detail or comparing unmatched short FPS windows. This is an actionable investigation supported by repeated endpoint failures, not a promise that props alone explains all slow frames.

Sparse city fabric remains whole-game visual rank1, followed by foliage, night depth, site integration, landmark grounds, landscape/environment, human activity and performance. The mountain defect remains open within rank6. A future terrain-owned redesign may coordinate geological distribution with landform evidence, but this round does not justify a broad heightfield/state change or closing that issue.

## Inspection register

All entries were viewed individually; each listed PNG's same-basename JSON was read and checked.

### r8o-mountain-material-baseline

- `shots/democity/r8o-mountain-material-baseline/industry_12.png`
- `shots/democity/r8o-mountain-material-baseline/interchange_12.png`
- `shots/democity/r8o-mountain-material-baseline/riverfront_12.png`
- `shots/democity/r8o-mountain-material-baseline/riverfront_17p5.png`

### r8o-mountain-material-baseline-isolated

- `shots/democity/r8o-mountain-material-baseline-isolated/coast_12.png`
- `shots/democity/r8o-mountain-material-baseline-isolated/valley_12.png`
- `shots/democity/r8o-mountain-material-baseline-isolated/valley_17p5.png`

### r8o-mountain-material-candidate

- `shots/democity/r8o-mountain-material-candidate/industry_12.png`
- `shots/democity/r8o-mountain-material-candidate/interchange_12.png`
- `shots/democity/r8o-mountain-material-candidate/riverfront_12.png`
- `shots/democity/r8o-mountain-material-candidate/riverfront_17p5.png`

### r8o-mountain-material-candidate2

- `shots/democity/r8o-mountain-material-candidate2/industry_12.png`
- `shots/democity/r8o-mountain-material-candidate2/interchange_12.png`
- `shots/democity/r8o-mountain-material-candidate2/riverfront_12.png`
- `shots/democity/r8o-mountain-material-candidate2/riverfront_17p5.png`

### r8o-mountain-material-candidate3

- `shots/democity/r8o-mountain-material-candidate3/industry_12.png`
- `shots/democity/r8o-mountain-material-candidate3/interchange_12.png`
- `shots/democity/r8o-mountain-material-candidate3/riverfront_12.png`
- `shots/democity/r8o-mountain-material-candidate3/riverfront_17p5.png`

### r8o-mountain-material-candidate3-isolated

- `shots/democity/r8o-mountain-material-candidate3-isolated/coast_12.png`
- `shots/democity/r8o-mountain-material-candidate3-isolated/valley_12.png`
- `shots/democity/r8o-mountain-material-candidate3-isolated/valley_17p5.png`

### r8o-mountain-material-candidate4

- `shots/democity/r8o-mountain-material-candidate4/industry_12.png`
- `shots/democity/r8o-mountain-material-candidate4/interchange_12.png`
- `shots/democity/r8o-mountain-material-candidate4/riverfront_12.png`
- `shots/democity/r8o-mountain-material-candidate4/riverfront_17p5.png`

### r8o-mountain-material-layer-diagnosis

- `shots/democity/r8o-mountain-material-layer-diagnosis/industry_scree.png`

### Additional metric records

- `shots/democity/r8o-mountain-material-baseline/material-metrics.json`
- `shots/democity/r8o-mountain-material-candidate/material-metrics.json`
- `shots/democity/r8o-mountain-material-candidate3-isolated/matched-diff.json`
- `shots/democity/r8o-mountain-material-candidate4/crop-luma.json`
- `shots/democity/r8o-mountain-material-candidate4/matched-diff.json`

### Limits

- Independent inspection of all supplied originals and sidecars, independent original-pixel recomputation, source and hash review. No new captures, production build, gameplay or save/restore tests by this critic.
- Current material hash matches the supplied pre-r8o hash. Existing git differences include earlier texture-array work; restored does not mean identical to repository HEAD. Full historical candidate shader snapshots were not supplied in these evidence directories, so exact rejected hunk attribution relies partly on the builder record.
- Screenshots are not pixel-locked world snapshots: vehicle positions/HUD values can differ despite paused simulation, and render/reflection phases differ. Full-frame changed percentages include these unrelated differences. Isolated matched frames provide cleaner but still finite evidence.
- Candidate1 repeat correlations and crop standard deviations are heuristics, not geological realism or perceptual scores. Candidate4 lower spread alone cannot prove a visual regression; rejection rests on inspecting originals.
- Short local M4 Metal measurements from different capture sessions do not isolate shader GPU time, prove a speedup, certify sustained target hardware performance, or measure retained memory. Raw endpoint heap is not forced-GC heap.
- No new full day/night/weather matrix, eight-reference calibration or blind A/B judging. Whole-game 6.0 FAIL and existing ranking remain; no completed visual repair is claimed.
