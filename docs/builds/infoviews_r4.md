# Infoviews — builder round 4

**Self-assessment: 6.5/10, FAIL.** Final allowed builder round. The street network is much easier to follow and crowns remain tinted above the recorded main-body height. Landvalue night parity now passes; pollution parity, all pinned roof/wall contrasts, native display-terrain integration and three distributions still fail. Independent critic is separate and pending.

Production edits are confined to `src/modules/infoviews/render.js`, new `films.js` and new `roadmask.js`. The native-heightfield geometry, all formulas, alpha 0.75, fixed 0.72–1 top light and crop rectangles remain unchanged. Source was frozen before final evidence and independent criticism. No cross-module production edit, commit or push.

The building film uses one InstancedMesh with a float vertex texture holding public-plan envelopes. All 246 plans are represented, with 74 padded triangles per instance (18,204 GPU triangles; 5,610 nondegenerate). Shapes follow outlines, pitched roofs, shop units, podiums, setbacks and selected crowns. Missing or over-budget plans fall back to footprint boxes; detail shrinks as stock increases. Optional equipment and smaller native details remain uncovered. The texture is 9,830,400 bytes; all generated coordinates were checked finite.

The road mask samples the public centre-lines every 4 m and rasterizes a two-metre lattice with a soft shoulder outside half-width plus 0.75 m. It removes ground film over the street corridor without changing source grids, ribbon geometry, terrain LOD or global materials. The public ground-alpha function multiplies the same bilinear mask. Soft margins and residual median/bridge colouring remain; this is a practical clearance improvement, not exact native surface conformance.

Final evidence: **32/32 official-tool matrix captures ready, zero errors**, maximum **182 scene draws / 1,510,922 scene triangles**. Actual FPS **26.2–60.1** on ANGLE (Apple, ANGLE Metal Renderer: Apple M4, Unspecified Version), Chrome 152.0.7977.76, shared server 5174. All eight references and exactly 34 fresh builder PNGs were individually viewed; exact paths are in the JSON. The complete matrix contains 16 standard camera/time combinations, all six presets at noon/night, two 720p and two integrated all cases. Fourteen final masks use full-resolution frozen on/off images.

| Measurement | Result |
|---|---|
| First explicit recompute / warm range | 5.3 / 2.8–4.1 ms |
| All twelve grid maximum error | 2.384185791e-7; zero mismatches above 1e-5 |
| Landvalue / power / traffic owned draw delta | 2 / 3 / 2 |
| Landvalue / power / traffic owned triangles | 254186 / 254250 / 22116 |
| Native geometry flat / steep samples | 235 / 1765, all flat pass, maximum lift 0.703997 m, zero below |
| Pollution day/night RGB drift | 10.9555 / 11.3210 / 10.5285 — FAIL |
| Landvalue day/night RGB drift | 5.1560 / 7.2115 / 7.1280 — PASS |
| Pollution / landvalue night p99 luma | 195.4166 / 211.5418 — PASS |
| Ten pinned landvalue face steps | 1.8216–19.5793, all below 25 |
| Density confirming face steps | 0.0955–11.5058 |
| Water / inland alpha | 200 samples each: all 0 / all 1 |
| Ribbon intersection gaps | 65 arms across 20 intersections: 0 m |

The broader envelope shapes are visibly more faithful, but this does not establish the required face contrast. Several fixed crop measurements worsen. All ten pinned landvalue buildings have terrace crowns above the main-body height used by the required roof rectangles; some rectangles therefore include crown sides. The crops were preserved and their failures are reported.

Fixed data remain truthful: the exact 21,671-cell mask reports pollution p95−p5 0.186521; garbage 0 with 97.5313% near its mean; density 0.029940 with 94.7487% near its mean. Required three-day pre-roll yields 246 buildings and 141 residents. A separate valid clinic placement works but its short post-placement probe does not establish powered healthcare.

The 720p picker (316×134) and legend (316×211.4375) have no overflowing elements. All twelve switches dispatch synchronously once. Three idle hours trigger three recomputes; a 20-event burst triggers one. Crime restores on a fresh page and invalid values are ignored. Off mode clears owned state in two frames, while some water reflections remain tinted. Integrated ordinary-play images still show the empty democity stub and do not prove a populated playable whole game.

## Acceptance ledger

### Met or measured clauses

- 1: Twelve synchronous ordered activations each publish exactly one event, a full grid and matching legend; all twelve arrays match the independent reference instrument within 2.384185791e-7, zero mismatches above 1e-5.
- 5: Noon top-decile saturation pollution 0.541461, power 0.556842, above 0.45. Ratios remain diagnostic.
- 6: Fixed ramp deciles occupy five of eight L* buckets; adjacent maximum-channel differences 60,125,129,224.
- 9: Network ribbons preserve the specified 4 m sampling, width and height. All 65 arms from first 20 intersections have zero measured gaps at 0.5 m spacing.
- 10 measured clauses: All 200 water samples are zero, all 200 inland samples are one. Ten one-metre +/-8 m transects retain boundary continuity. Ground alpha now also exposes the actual road clearance mask.
- 12: All seven required coverage fractions stay within the band in the permitted empty-service fallback; actual facility-kind queries remain correct.
- 13–15: Twelve-icon picker and readable legend fit 1280x720 with zero overflowing elements. Actual play toolbar activation and all-mode activation show one HUD legend and zero duplicate module panels.
- 16: Off mode clears active/data/legend, desaturation, callbacks and visible owned geometry within two frames; overlayDraws is zero.
- 17: Settled landvalue/power/traffic pairs are +2/+3/+2 draws and +254186/+254250/+22116 triangles. Within eight draws and 260000 triangles. Vertex-texture envelope remains one InstancedMesh.
- 18: Terrain-only and terrain-plus-roads degraded screenshots remain ready with no errors and meaningful fallback fields.
- 19: Two fresh pages reproduce all twelve sums to six decimals.
- 20: First explicit full recompute 5.3 ms; subsequent ten 2.8–4.1 ms. Active/inactive 60-frame means 0.000000/0.001667 ms. Three idle hours cause three recomputes; 20-event burst causes one.
- 21–22: Cross-fade settles at 320.3 ms. Fresh-page crime restore works; malformed deserialization is a no-op.
- 23: All 32 final matrix captures, two degraded captures, final mask metadata and completed runtime probes report no console errors. Infoviews remains ready.

### Missed

- 2: Fixed-domain distributions remain degenerate: pollution p95-p5 0.186521; garbage 0 with 97.5313% flat; density 0.029940 with 94.7487% flat. All source formulas and mandated pre-roll are preserved.
- 3: Pollution day/night RGB drift 10.9555 / 11.3210 / 10.5285 exceeds 8/255. Landvalue now passes at 5.1560 / 7.2115 / 7.1280. Night p99 luma passes both pairs.
- 4: Native-heightfield numeric conformance passes. Road clearance makes streets traceable again, but residual median/bridge paint, soft road edges and default display-LOD hillside perforations remain.
- 7: All ten landvalue roof/wall steps remain below 25: 1.8216–19.5793. Density confirming steps 0.0955–11.5058. The changed envelopes improve visible crowns, but do not pass the pinned face measurement.

### Unmeasured

- 8: Exact ramp-position Spearman not separately measured.
- 10 width: Axis transects measure continuity, not an exact shoreline-normal eight-metre width.
- 11: Required power and skyline views both have zero near-band pixels; ratio is unmeasurable, not failed.

## Remaining work

- Display terrain topology differs from the native heightfield, causing large hillside holes. Native ground mesh remains untouched; no maximum-LOD override was installed.
- Road clearance restores the continuous street network but soft grassy margins and some median/bridge paint remain. Exact native road-surface/kerb integration is still needed.
- Envelopes follow public plan outlines, pitched roofs, units, podiums, setbacks and selected crowns; they omit equipment, roof parapet interiors, wings, garages and rare barrel crowns. The 1.02x expansion can overlap adjoining envelope surfaces. These are improved proxies, not exact native geometry.
- All pinned roof/wall contrasts still fail and some are numerically worse than r3 despite more faithful silhouettes. Record.height-based roof rectangles often intersect a crown side or foreground occluder. Pinned crops were not moved or replaced.
- Landvalue night drift passes; pollution drift is slightly worse than r3 and still fails. No opacity increase above 0.75, sun-term hack, data normalization or invented population was used.
- Three fixed-domain distribution gates fail with 141 residents in 246 buildings after required pre-roll; eight prescribed service placements are rejected by real validation. A separately valid clinic does not prove successful powered healthcare.
- Far/near haze framing has zero near pixels; inverse-ramp Spearman and exact shoreline-normal eight-metre fade width remain unmeasured.
- Some two-frame off plates retain coloured water reflections after owned meshes and callbacks clear.
- Ordinary-play and integrated checks use the empty democity stub. They verify UI integration, not a populated playable whole game.
- Pathological custom terrain can exceed the adaptive ground budget; that prior limitation remains. A growing stock reduces envelope detail to fit the current triangle allowance.

## Evidence limits

- Matrix driver invokes the official screenshot tool for the complete 16-camera/time gauntlet plus presets, 720p and integrated shots; no separate gauntlet command invocation is claimed.
- 34 fresh builder PNGs were individually viewed; the JSON lists exactly those images. All 32 final matrix JSONs were checked. Fourteen exploratory dev-mask images are retained but not counted as viewed.
- Earlier dev-envelope/dev-roads/before images are exploratory. Final matrix/masks/probes use the frozen source.
- Data probe initially missed snapshot.mjs due to an incomplete evidence-instrument copy. The dependency was copied, the probe reran successfully, and no game error is attributed to that tooling failure.
- Initial GPU toggle pairs in final-probe.json and shore-full.json contain LOD/CSM changes. Settled-probe.json has stable on/off/on2 pairs and supplies the budget values; contaminated measurements are retained.
- 26.2–60.1 fps is the actual full matrix range on Apple M4 Metal during concurrent captures; no SwiftShader claim or frame-rate guarantee.
- Whole-page heap delta is a GC observation, not proof of allocation-free code.

Evidence root: `shots/infoviews/r4`; detailed numbers in `pixel-analysis.json`, `api.json`, `builder-probe/data-api.json`, `settled-probe.json`, `shore-full.json`, `contracts.json`, `network.json`, `final-probe.json`, and `matrix/summary.json`.
