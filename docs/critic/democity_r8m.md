# Independent Democity r8m critic — low-sun horizon

**ACCEPT the bounded visual correction. Democity 6.0/10; whole-game 6.0/10 FAIL.** The 8.5 gate is unchanged. The glaring cream band below the 17:30 riverfront sky is substantially removed, while noon and 22:00 remain visually coherent. This is a useful local repair, insufficient to reach the 7.0 good-indie anchor or close whole-game rank 6. It adds no gameplay, city content or operational industry/port behaviour.

**Next priority: P1 — the 3D scene becomes nearly black at exactly 18:00.** Both the candidate and the supplied pre-r8m rollback capture fail visibly despite `ok=true`, all modules ready and zero errors. R8m is accepted separately because this defect predates it; acceptance does not certify the sunset transition. Environment should lead a numerical/render-pipeline diagnosis with effects/core support before further mountain-art work.

## Inspection register

All **39 original PNGs** were individually inspected, including all daytime controls, not merely contact sheets. All supplied JSON evidence was parsed/reviewed, including 27 individual sidecars and shared component/sweep probe records. The JSON report lists every original and sidecar path. This is independent review of supplied evidence, not a fresh independent capture run.

| Folder under `shots/democity/` | Inspected originals |
|---|---|
| `r8m-low-sun-diagnosis` | baseline, water-hidden, sky-hidden, water-and-sky-hidden (4) |
| `r8m-low-sun-candidate` | riverfront 12, 17.5, 22 (3) |
| `r8m-low-sun-sweep` | riverfront 15, 16, 17, 17.5, 18, 18.5, 19, 20 (8) |
| `r8m-low-sun-boundary` | prechange 18; riverfront 17.75, 18, 18.25 (4) |
| `r8m-low-sun-final` | bridge, downtown, industry, interchange, night_downtown, park, riverfront, suburb at 12 and 22 (16) |
| `r8m-low-sun-weather-cloudy` | aerial and riverfront at 17.5 (2) |
| `r8m-low-sun-weather-rain` | aerial and riverfront at 17.5 (2) |

Read current STATUS/HANDOFF, architecture and preceding independent whole-game/r8l findings. The builder r8m report was read after the provisional decision and pixel replay. No new reference calibration or blind round is claimed.

## Visual evidence and independent pixel replay

The diagnostic water-hidden image removes the bright strip; hiding only the dome leaves it. The candidate gives the distant water and nearby sky similar low-sun values without deleting the island, hillside or river. Warm scene illumination remains; cloudy/rainy views preserve recognisable weather states and the suppressed seam. The older straight geometric boundary remains visible, and mountain material still looks stretched and mottled. Daytime cloud reflection remains a broad graphic sheet. Rain streaks remain oversized and screen-like. None is fixed by this gain adjustment.

I independently sampled the original PNGs with Pillow: x=[220,380), sky y=[150,160), horizon y=[168,178), water y=[181,191). Values are encoded RGB display luma, `0.2126 R + 0.7152 G + 0.0722 B`, not physical radiance.

| Measure | Baseline | Candidate |
|---|---:|---:|
| Sky | 80.740956 | 80.740956 |
| Horizon | 163.604947 | 79.129237 |
| Water strip | 141.201164 | 79.903441 |
| Horizon minus sky | +82.863991 | −1.611719 |
| Water minus sky | +60.460209 | −0.837514 |

The excess reductions are **84.47571025** and **61.297723125**, matching supplied rounded metrics. Water-hidden horizon−sky is −0.896592; sky-hidden is +74.687466; both-hidden is −0.004466. This supports water/LUT attribution for this pinned unobstructed region, not universal horizon equality.

At exactly 18:00, both boundary originals have identical pixels in the large viewport ROI [220,250,1800,950): RGB ranges [0,0], [0,1], [2,3]. They are visually black, technically near-black, with HUD/minimap still visible. The sweep independently contains the same visible failure. 17:45 and 18:15 render a scene, as do the later sweep samples. The failure width, cause and ordinary advancing-time behaviour are unmeasured. The sweep's `pass` only means no recorded errors; it is a **visual FAIL** at 18:00. The display-input contract omits that exact time and cannot certify it.

## Source and state contracts

The bounded r8m addition is in shared environment fog and terrain water shaders. It reproduces the existing dome formula: directional low-sun attenuation times the accepted night gain. Fog applies it to its raw sky sample; water applies it to sky reflection and far-horizon sky samples. Noon and full night retain the r8l gains because low-sun attenuation is zero there. Raw LUT/PMREM, direct lighting, water geometry, planar geometry, RNG, APIs, generation, saves and camera selection are not altered by this addition. Direction dependence is the normal shared rendering formula, not a showcase/preset branch.

Current sky.js and environment/index.js hashes match the prior r8l evidence. The repository diff also contains older accepted night-uniform and reflection-cadence work; those are not attributed to r8m. Source hashes are recorded in JSON. Actual Node imports replayed shared sun/night uniform-wrapper identity and installed fog GLSL. Independently recomputing all eight display-contract rows gives identical sun vectors across API/world/water/sky/fog, matching night values and zero formula error.

Saved API evidence preserves 612 buildings/lots, 9,964 cells, 31 services and one eight-stop line across two successful deserializations. Eight tour stops succeed; invalid tour fails. I recomputed exact equality of all 32 mixed-use records before/after each restore, including owner links and retail flags. Saved restage digests match for both 1337→7→1337→7 returns; digest scope is buildings/services/transit. Reflection arrays retain 15/30/120 submissions per 120 frames at intervals 8/4/1. These are saved-probe replays, not newly run gameplay tests. Build163 is builder-reported.

Maintenance risk remains: equivalent display gain is repeated across three shader consumers. Future sky changes must keep those formulas aligned. Clamped directions, clouds and in-scatter differ between paths; copying the gain does not make the complete fog/reflection pipeline identical at every angle.

## Verified performance and gates

All 16 final sidecars match every summary row and aggregate. All modules are ready and errors=0. All four weather controls likewise match their summaries.

| Evidence | Max draws | Max triangles | Min FPS | Below 50 | Max raw heap |
|---|---:|---:|---:|---:|---:|
| Final 16 | 469 | 2,814,092 | 41.6 | 3/16 | 733.7 MB |
| Cloudy 2 | 426 | 2,052,846 | 46.0 | 1/2 | 691.9 MB |
| Rain 2 | 428 | 2,088,846 | 45.3 | 1/2 | 743.8 MB |

Geometry passes 1500 draws/3M triangles. Regular failures are park12 41.6, interchange12 48.5 and night_downtown22 49.2 FPS; both weather aerials miss50. Raw heap exceeds512 in12/16 regular and3/4 weather records. This is not forced-GC memory or evidence of a retained leak. Props reaches2.1ms at final riverfront12 and traffic2.8ms at rainy riverfront17.5, exceeding the2ms single-module target at those sampled endpoints. No causal shader slowdown is established by differing short M4 Metal windows. Current draw/triangle maxima remain the prior r8l maxima; no new geometry budget claim is needed.

## Remaining ranking and next action

The separate P1 exact-18:00 failure takes immediate debugging priority. The existing art ranking remains open:

1. **democity** — Sparse block fabric and repeated forms remain dominant; the local horizon correction adds no frontage or density.

2. **props** — Planar crowns, exposed sticks and opaque hillside cut-outs remain inconsistent across distances.

3. **cross-cutting** — Repetitive luminous windows, limited occupied-interior depth and broad schematic service light pools remain.

4. **cross-cutting** — Abrupt grades, pads and shore/site boundaries remain visible.

5. **cross-cutting** — Accepted landmark fittings remain local static detail; materials, site connections and functional credibility remain schematic.

6. **cross-cutting** — The measured 17:30 bright LUT/display seam is substantially suppressed. Straight geometric horizon, stretched/stippled mountain material, broad daytime cloud reflection and graphic precipitation remain; see separate P1 exact-18:00 defect.

7. **cross-cutting** — Limited communicated human use. These stills establish neither new gameplay nor functioning port/industry activity.

8. **cross-cutting** — Geometry passes 1500/3M, but three regular and two weather samples miss 50 FPS; raw heap and sampled update endpoints exceed their limits. No retained leak or causal r8m slowdown established.

## Evidence limits

- Independent review of supplied captures and saved probe evidence, not a new independent browser capture run. All 39 supplied originals individually viewed; all JSON evidence parsed/reviewed. Eight CS2 references were not reopened for this bounded review; the existing independently calibrated whole-game anchors are retained.

- Pixel replay uses encoded RGB Rec.709 weighted display luma, not physical radiance. It measures one pinned unobstructed riverfront region, not all camera orientations or weather states.

- Component probe toggles only debug water and sky visibility for attribution; those diagnostic images are not production presentation. Sweep jumps time and settles 24 engine frames, so it is not continuous-play timing or a controlled PMREM settling comparison.

- The nearly black exact-18:00 failure is present before and after r8m. Its numerical cause, duration around 18:00 and behaviour during ordinary advancing time are not established by these stills.

- 16-frame noon/night matrix plus four weather controls is not the complete 32-frame whole-game matrix, a blind A/B round, or a human playtest. No new whole-game pass.

- Short local Apple M4 Metal Chrome 152 measurements do not establish GTX1660 or sustained gameplay performance. Endpoint heap is raw, not forced-GC retained heap. Module update values are sampled endpoints, not every-frame peaks; GPU bytes, stall bounds and warm-cache init are not freshly validated.

- Restore and restage results replay saved summaries/digests; restage digest scope is buildings/services/transit, not the entire world. Build with 163 transformed modules is reported by the builder, not rerun by this critic.

- Git diff includes historical accepted night-uniform and water-cadence changes. R8m attribution is the directional display formula and its three raw-LUT consumers; unchanged sky.js and environment/index.js hashes match r8l.
