# Democity R9k — independent owner-sensitivity diagnosis audit

**ACCEPT the qualified diagnosis and Props-first component investigation. No product optimization is established. Democity and whole-game remain 6.0/10, FAIL; no sustained-performance, memory or 8.5 visual gate is passed.**

## Evidence inspected

Read `docs/builds/democity_r9k_owner_sensitivity.md`, complete `tools/interleaved-owner-profile.mjs`, all five named JSON series, `smoke-metal.json`, relevant R8p/R8q independent reports and current Engine, Effects, debug/staging and terrain-reflection code. Individually viewed `smoke-metal.png` at original 1920×1080 resolution. Also read the accidental SwiftShader smoke sidecar solely to verify its exclusion; its image was not required for this review and was not independently viewed.

All five series were fully parsed: 25 owner rows, 179 sample blocks and 77 adjacent-control A/B cycles. Recomputed every expected-control FPS, percentage response, control drift, draw/triangle difference, stable count, reported summary statistic and aggregate pass flag. All retained sampled-frame and observation counts match the configured 90/120/180 frames. There are 19,200 sampled frames in total, with no recorded engine/browser/HTTP errors. The records contain derived FPS and block counts, not raw elapsed timestamps or individual frame durations, so the original FPS denominator cannot be independently reconstructed from persisted data.

## What the verifier establishes

Each owner uses a fresh page at seed 1337, interchange, 22:00, High, speed 0. After reflection is disabled and initial warmup, blocks alternate A0–B0–A1–B1–A2–B2–A3; the long Services run extends to B4/A5. B locks the owner's root visibility false with an accessor, preventing owner writes from immediately restoring it. Each response compares B with the arithmetic mean of its neighboring A values. A pair passes the diagnostic drift screen when `abs(Aafter−Abefore)/mean(A)*100 <= 5`.

This is a useful local drift screen, not a confidence interval or proof of stable B performance. Adjacent pairs share an A block and are not independent replicates. Owner order is fixed across separate fresh pages; host/run-order drift remains. There is no masked/unmasked block-specific settling interval after each switch. Submission deltas are nevertheless tight and consistently negative, which supports the intended masks having taken effect.

Updates are still dispatched while a root is hidden. Masks alter main/shadow rendering, occlusion, depth and dependent postprocessing; they do not isolate an owner callback or a pure GPU duration. Inventory is taken before warmup, checks each object's local visibility rather than ancestor/frustum visibility, and applies triangle arithmetic even to Points/Lines. Its `sourceTriangles` is not a reliable per-frame submitted count or a tree-only census. Use measured draw/triangle deltas instead.

Descriptor restoration happens between blocks. Final cleanup then forces the root visible and reflection enabled rather than restoring arbitrary original values. That is adequate for these disposable fresh default-visible pages, not a reusable arbitrary-world restoration contract. No gameplay/save/RNG invariance test is supplied or needed to accept only this diagnostic.

## Recomputed series status

| Series | Diagnostic outcome | Reason/qualification |
|---|---|---|
| Initial headless-on, 90 frames | FAIL | Terrain and Buildings have one stable cycle each; terrain max drift 14.42%, Buildings 31.31%. |
| Initial headless-off, 90 frames | FAIL | Roads has one stable cycle, Services zero. Several other A/B series remain near 60 Hz and are ceiling-limited. |
| Uncapped headless-off, 120 frames | PASS | Each of five owners has at least two stable cycles. Buildings responses still vary materially. |
| Uncapped headless-on, 120 frames | Overall FAIL | Terrain/Props/Roads/Buildings individually have ≥2 stable cycles; Services has one and is rejected for attribution. |
| Uncapped headless-on Services, 180 frames ×5 cycles | PASS, bounded | Two stable cycles; other three drift above 5%, maximum 9.47%. |

The initial records are retained failures/limitations, not erased by later runs. The first two files predate an explicit `uncapped` metadata field; their capped interpretation relies on retained method/provenance and observed ceiling, rather than a recorded false field. Traffic and Transit appear only in those initial capped series. No exhaustive uncapped owner ordering is established.

## Owner responses and statistical limits

The revised builder report now uses conventional stable-pair medians, reproduced in the second table below. Its earlier full-series figures remain arithmetically correct and are retained here explicitly as **complete-series medians, including unstable pairs**, not the preferred ranking:

| Owner | Uncapped headless-off | Uncapped headless-on | Headless-on median draw / triangle delta |
|---|---:|---:|---:|
| Terrain | +12.397680% | +9.892574% | −13 / −251187 |
| Props | +10.137503% | +19.437472% | −31 / −832897.2 |
| Roads | +8.873889% | +13.099036% | −21 / −385051.4 |
| Services | +3.165137% | +4.744164% (long) | −33 / −83640 |
| Buildings | +2.771398% | +9.155870% | −67 / −124026.4 |

The tool's `median()` chooses the upper middle element for an even-sized stable subset. It does not average the two middle values. Thus its saved `stableMedianFpsPct` must not be silently treated as a conventional median. Independently calculated conventional stable-only medians below agree with the revised builder table:

| Owner | Headless-off | Headless-on |
|---|---:|---:|
| Terrain | 11.792607% (2) | 9.892574% (3) |
| Props | 10.137503% (3) | 17.320476% (2) |
| Roads | 7.927248% (2) | 15.858761% (2) |
| Services | 3.165137% (3) | 5.233627% (2, long) |
| Buildings | 6.026264% (2) | 9.155870% (3) |

Parentheses give stable-pair count. Props has a consistent headless-off response (9.168–10.896%), the largest conventional stable-only headless-on median, and the largest submitted-triangle removal. This justifies measuring its components next. It does **not** establish a statistically secure global Props-over-Roads ordering: stable synchronized responses are close, only two pairs survive for each, and their ranges overlap. Buildings headless-off stable responses are 2.771% and 9.281%, illustrating why control drift alone is insufficient. The long Services replacement likewise supports a bounded positive lead, not a precise universal cost.

FPS improvement is not the same percentage as frame-time reduction, and masking responses are not additive owner budget fractions. Removing roughly 833k submitted Props triangles does not prove foliage triangles, overdraw, shading or geometry processing is the causal bottleneck.

## Headless policy is not isolated readback

`CAPTURE_SYNC` changes the entire `headless=1` URL policy. Engine construction also changes `preserveDrawingBuffer`; pixel-ratio selection and startup/UI/input/audio policy have headless branches. Both `Effects.render()` and `Engine.render()` call `readPixels` in headless mode. Therefore these are **headless-on/off policy comparisons**, not a clean intervention changing only a single readback call. The data supports different sensitivity under those policies, not a causal statement that readback alone produces the difference. The revised builder report now makes this distinction explicitly.

The 1×1 readback can wait for previously queued GPU work. Uncapped flags remove frame-rate/vsync throttling for diagnosis and may change queueing/compositor behavior. Neither policy uses GPU timer queries or separates CPU work, GPU work and synchronization wait. Keep both headless reads and ordinary reflection policy for official captures; do not disable them to manufacture a gate pass.

Reflection is disabled through Terrain's public API; source confirms it prevents new planar-reflection renders. A previously generated reflection texture may remain sampled. The tool does not log a reflection-call counter, framebuffer dimensions, actual renderer string, full scene digest or source hashes per row. Launch code requests system Chrome/Metal; the separate smoke confirms Apple M4 Metal, but individual profile pages do not independently retain that renderer proof. Current source hashes in the JSON document the code inspected, not historical per-run source attestation.

## Smoke and score

The inspected Metal original is coherent and visibly retains the accepted city, sparse parcels and planar foliage. Its sidecar identifies Apple M4 via ANGLE Metal and Chrome 152.0.7977.83, all 16 modules ready, zero errors and 55.8 FPS across 112 sampled frames. Capture-window counters are 430 draws and 2061474 triangles; endpoint counters differ at 321 / 1548741. Raw endpoint heap is 489.6 MB. The known furniture-defer and absent reserved university warnings remain. This single daytime aerial neither verifies the nighttime diagnosis visually nor passes sustained 50 FPS, forced-GC retained memory, complete matrix, blind judging or gameplay gates.

The accidental smoke explicitly identifies SwiftShader and 0.9 FPS despite zero errors. Excluding it from Metal performance claims is correct. No new independent build, browser capture or production change was made in this review.

## Next bounded step and ranking

Accept Props component attribution at this same accepted-source interchange/night scene, using interleaved controls and a clearly fixed headless policy with reflection disabled. Classify actual LOD0/LOD1/impostor, pools, lenses, halos and furniture by their real owner representations, avoiding the old generic-instanced-mesh-as-trees error. Report stable-only statistics using a stated median convention, retain failed cycles and verify masks/restoration. If measuring readback causally, hold buffer/context/headless settings fixed and intervene only in disposable readback instrumentation; do not conflate that separate experiment with product optimization.

No geometry, foliage density, range, material or visibility reduction is authorized by these masks. Preserve R9a range, R9c transition/CAP behavior, R9e atlas structure and R9f containment closure. The performance investigation remains rank 8 in the existing whole-game visual ranking; rank 1 sparse fabric and rank 2 foliage still lead the visible gap. A Props investigation intersects the foliage issue but proves no improvement to it. Scores remain unchanged.
