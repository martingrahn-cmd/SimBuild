# Props round 3 independent critique

**6.0/10 — FAIL.** Flat and sparkling foliage remains far below CS2; fresh probes also expose duplicate initial lamps, trees retained on new roads, buried manual props and an aerial triangle-budget overrun. Serialization, signal handover and edit timing improved, but correctness and visual hard failures remain.

Read CRITIC in full, module spec, required architecture sections, CS2-LOOK, previous critic, builder r3 and props residual decisions. Viewed all eight cs2_1.jpg–cs2_8.jpg anew before scoring. Reference 4 sets the organic canopy/hedge and modelled furniture bar; 2/7 the coherent far forest; 8 the small warm source and soft pool bar. No props source was changed for this critique.

## Evidence and conditions

Own evidence root: `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic`. All commands used 5174, Metal, explicit system Chrome and external TMPDIR. The first launches failed with ENOSPC ProcessSingleton socket errors before application startup; these are infrastructure failures, not application errors. After disk recovery the complete matrix and independent probes succeeded. Python required `/usr/bin/python3` 3.9 for the externally installed PIL/numpy. Every own browser was closed in finally.

35 main screenshots  + 25 probe screenshots  + 7 binary masks = 67 images inspected. No standard empty/black/boot frame. The all-showcase frame is an empty initialized city, not a populated integration benchmark. Source files of other modules were changing independently; HMR was disabled inside capture pages.

## Measured results

| Measure | Result |
|---|---|
|Main matrix|35; errors 0; props ready 35/35|
|Whole scene maximum|144 draws; 1758120 triangles,street_12|
|Seven-view props attribution maximum|55 draws; 795744 triangles,aerial_12|
|Fresh initial vs rebuilt|3971→3742 items;3272→3176 trees;172→90 lamps|
|Forbidden overlap count|82, after exempting fence chains and same shelter assemblies|
|Road edit dry ground|22 existing trees remain on asphalt|
|Terrain edit|Manual bench 1.660412 m below new terrain, repeated|
|Manual place|21.5 ms bracket;21.1 ms reported|
|Dirty road densities|1497/3176 trees;10.6/9.9 ms;ratio 0.934|
|Idle 30 samples|median 0;max 0.1 ms|
|GL failures / owned lights|0 / 0|
|Bark pinned std|6.0986745 (required 8)|
|Lamp head pinned p99|254.995668 (required <=250)|

Noon masks come from same-camera props-on/off absolute luminance difference>6; binary masks are resized nearest to 480×270, RGB via Lanczos. This is the required props influence region, including shadows/reflections, not a foliage-only classifier. Same noon mask is held fixed at night. Full numeric crop data and caveats are in probe/measurements.json.

|Mask at 12|p1|p50|p99|std|black%|white%|speckle35%|
|---|---:|---:|---:|---:|---:|---:|---:|
|avenue_12|10.2326|71.8160|166.4864|37.8727|0.4023|0.0000|2.1517|
|lamp_12|14.8042|74.9830|159.0012|35.1011|0.2067|0.0000|2.9464|
|park_12|18.8658|64.5920|151.5867|30.3678|0.0052|0.0000|1.7959|
|street_12|19.3828|68.3654|168.1229|36.1165|0.0382|0.0000|3.6591|
|forest_12|23.8085|62.1424|147.4063|28.4881|0.0000|0.0000|1.5850|
|skyline_12|23.5876|46.1332|109.6108|17.5804|0.0000|0.0000|1.2343|
|aerial_12|50.6693|92.1304|145.3639|21.0463|0.0000|0.0000|3.3195|

## Ranked issues

### 1. major: Foliage still reads as flat fans and repeated cutouts

The closest broadleaf clusters are large flat fern-like fans with little crown volume. Far conifers become repeated stacked silhouettes; the foreground/background representation change is conspicuous in forest_12 and forest_17p5. At 480 px, the fixed noon props mask has 1.585% speckle in forest, 1.234% in skyline and 3.320% in aerial, versus <=0.05%. This is the largest gap from CS2 refs 4, 7 and 2.

Evidence: /Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/forest_12.png; /Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/forest_17p5.png; /Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/treecloseup_12.png; /Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/aerial_12.png; /Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/probe/measurements.json

### 2. blocker: Road and terrain edits leave invalid existing props

A 100 m street through dry forest centered at (-293.247,-212.626), target birch id 2412, leaves 22 tree origins classified as asphalt; the target item is unchanged. The earlier shoreline probe found18 but crosses water, so the dry-ground reproduction is the primary evidence. A manual bench at (-138,145) remains at y 18.373765 after a radius 10 strength 2 terrain raise changes ground to 20.034178: it is buried 1.660412 m. Both repeated terrain probes agree. patchRoads adds furniture without clearing/resnapping old props; rebuilding manual items passes saved.y back into groundY, which immediately honors that stale height.

Evidence: /Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/probe/edits-land.json; /Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/probe/road_through_land_forest.png; /Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/probe/manual_after_terrain_raise_repeat.png; /Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/probe/edits.json

### 3. major: Initial load duplicates 82 lamps and is not rebuild-idempotent

Two fresh seed1337 loads each produce3971 items,3272 trees and172 lamps. A full rebuild produces3742 items,3176 trees and90 lamps; subsequent rebuilds are stable. The original exact-radius probe excludes fence/fence and same-bus-stop assemblies and finds 82 forbidden overlaps. Follow-up examples are coincident lamp pairs: ids 29/3743 at(-291,51.3), distance 0 versus required 0.5 m. The follow-up raw 91 count includes 9 exempt bus-stop pairs and is not used as a failure count. Fix the pending roads event after showcase construction so existing edges are not appended twice.

Evidence: /Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/probe/contract.json; /Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/probe/init.json

### 4. major: Night pool geometry breaks at kerbs and heads clip

lamp_22, avenue_22 and signal_22 show repeated triangular bright/dark cutouts along pool/kerb edges. The required lamp_head rectangle [815,104,48,48] has p99=254.995668, above 250; busstop_22 head p99=253.121. Pool material settings are correct in source, but they do not prevent visible surface intersections. Fit pool heights to the rendered pavement and preserve soft falloff. The enormous pinned pool rectangle mixes unlit ground, so its cold mean is not treated as a warmth failure.

Evidence: /Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/lamp_22.png; /Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/avenue_22.png; /Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/signal_22.png; /Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/probe/measurements.json

### 5. major: Aerial props exceed the 700k triangle budget

Fresh same-camera props-on/off attribution including rendered passes measures 795744 props triangles in aerial_12,13.68% over 700000. Props draws peak 55 in the seven attributed views; whole-scene peak across35 main shots is 144 draws / 1758120 triangles, under 200 / 1800000. High-pitch detailed foliage must be cheaper while retaining crown volume.

Evidence: /Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/probe/evidence.json; /Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/probe/aerial_on_12.png; /Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/probe/aerial_off_12.png; /Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/summary.json

### 6. major: Pinned evidence cannot establish several required visual thresholds

treecloseup trunk [928,853,64,64] is on visible bark and has luminance std 6.0987 versus required 8. Several other pinned rectangles are unusable for their stated measurements: avenue has no canopy_conifer; park has no hedge; treecloseup crown [547,0,200,200] is clipped and includes branches/background rather than a complete isolated sky crown; lamp pool is 1188 x 434 and mostly unlit surfaces. Implement valid landmarks and provide the missing isolated measurements. No unmeasured foliage, crown-hole or pool-ratio threshold has been marked failed merely from a mixed rectangle.

Evidence: /Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/treecloseup_12.crops.json; /Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/treecloseup_12.png; /Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/avenue_12.crops.json; /Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/park_12.crops.json; /Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/lamp_22.crops.json; /Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/probe/measurements.json

### 7. major: Hedges read as textured walls with thin exposed ends

The nearest avenue/lamp hedge has an abrupt box cap and thin folded-looking end sheets; its vertical green texture reads as streaks rather than clipped foliage volume. The repeating planar faces remain conspicuous beside the well-modelled benches and lamps. Preserve the wavy top but build a rounded, textured crown and convincing ends comparable to cs2_4. Exact0.08m top undulation and0.12m fence gap remain visual-only per residual decisions.

Evidence: /Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/avenue_12.png; /Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/lamp_12.png; /Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/treecloseup_12.png

## Acceptance and API audit

PARTIAL means incomplete evidence, not a pass or an invented numeric failure. All 24 items are accounted for. Required APIs exist; apiContractOk=false because idempotence and terrain/road change handling violate behavior.

|Item|Verdict|Evidence or limitation|
|---|---|---|
|1. Trees are trees, not lollipops.|FAIL|Flat nearest crowns; valid bark crop std6.099<8. Complete sky-crown holes/transitions unmeasured because landmark is invalid.|
|2. Species, silhouette and colour variety.|PARTIAL|8 species; nearest200 heading max11.5% per bin; scale0.783–1.316,std0.155. Visually multiple silhouettes/colours;12pairwise isolated crops and local clone test unmeasured.|
|3. Nothing floats, nothing sinks, nothing stands in the road.|FAIL|Baseline ground/asphalt/water probe0bad;82non-exempt duplicate-lamp overlaps. Dry new road leaves22trees on asphalt; manual bench sinks1.660m. Trunk-edge and1.5m furniture clearances not exhaustively measured.|
|4. Streetlamps are modelled objects on the roads' own anchors.|PARTIAL|Modelled slim columns with contact shadows; anchor coordinates follow roads. Duplicated initial world items fail item3. Initial anchor multiplicity not separately graded; dimensions/needle coverage not fully instrumented.|
|5. Night is lamplight, not dimmed noon or self-lit foliage.|PARTIAL|Fixed night masks black<=1.049%,B-R>=7.538 in four specified views; dark foliage visually appropriate. Isolated same-foliage ratio and maximum are unmeasured, not passed from mixed crops.|
|6. The lamp actually lights the ground.|FAIL|Head p99=254.996>250 and visible triangular pool/kerb seams. Correct material flags in source; isolated pool ratios, ring steps and every instance axis not independently measured.|
|7. Noon albedo and contrast — not washed out, not crushed.|PARTIAL|Noon fixed masks forest/avenue/park std28.49/37.87/30.37; black<=0.403%,white0. Raw broad crops mix shadow/background; no albedo or shaded/lit pass inferred.|
|8. Tree shadows are dappled, not blobs.|PARTIAL|Dappled shadows visible; alphaTest/cast-shadow source setup exists.15% shadow-hole threshold not independently isolated.|
|9. No card halos, no sprite glow, no sparkle.|FAIL|480px fixed-mask speckle1.585/1.234/3.320% forforest/skyline/aerial versus0.05%. Crown fringe and same-depth impostor ratio unmeasured.|
|10. Traffic signals at every signalised node, and they work — under props' clock *and* under traffic's.|PARTIAL|Standalone0→2→0 phase works; traffic phase3 changed green arm changes actual lens colours without triangle change. Shape and visible lenses work; all visor/lens pixel ratios not measured.|
|11. Hedges and fences are volumes, not green static.|FAIL|Visible thin hedge ends, planar streaked faces and abrupt caps. Two fence styles exist. NCC unmeasured; small undulation and ground gap remain visual-only residuals.|
|12. Twelve kinds, all present, all identifiable.|PASS|All 12 kinds occur; shelter glass, seat and timetable now visible; props recognizable across avenue/park/signal/busstop views.|
|13. Placement is rule-driven and reads as designed, not scattered.|PARTIAL|Road/park layout is legible; spacing thins toward forest edge. ExactPoisson histogram and all lot rejection criteria not exhaustively measured.|
|14. LOD without popping or a visible switch line.|FAIL|Three tiers nonzero(3/511/1821), but clear near/far crown representation boundary in forest. Source dither band exists. Raw 3 m dolly20.93%diff is not used as a failure due parallax residual.|
|15. Reflections and shadows behave under a foreign camera.|PARTIAL|On/off water visibly removes tree reflections; main-camera LOD source respected. Exact water-only0.5%diff/median/speckle thresholds unmeasured.|
|16. Wind sway, deterministic and gentle.|PARTIAL|Pure world time sway source and enabled/disabled pairs verified. Rawdiffs5.754%/0.005%over40L; no optical-flow2–8px assertion, and sun movement explains zero-sway nonidentity.|
|17. Golden hour reads.|PARTIAL|Golden scenes show long directional shadows and warmer foliage; measuredmask black/white0 at17.5.25degree hue rotation and pool counts not independently measured.|
|18. Aerial and skyline coherence.|FAIL|Aerial remains fragmented and skyline uses repeated cutout crowns. Speckle fails item9; exact256px woodland-onlystd not separately inferred from whole props mask.|
|19. Determinism and idempotence.|FAIL|Two initialloads agree, but initial3971 items/3272 trees collapse to3742/3176on rebuild, then stabilize. Manual serialize roundtrip works; all version-delta cases not measured.|
|20. Budget.|FAIL|Attributed aerial795744triangles>700000. Attributedpropsdraw<=55; fullmatrix144draw/1758120triangles. Idle median 0,max 0.1 ms; init about0.4s. Texture/heap delta not fully isolated; no ownership or256mchunk failure invented.|
|21. The whole shot matrix exists — 34 shots, enumerated so the count is not a guess.|PASS|35 mainframes=34enumerated+1080forest22baseline, allerrors 0/props ready.16 standard+19 other frames viewed. External evidence paths authorized to avoid ENOSPC; builder canonical files preserved.|
|22. Stay in lane — the props-specific half.|PASS|NoTHREE.Light ingroup; source review finds no forbidden random/wall-clock animation, externalgroup or renderer-state writes. Shared gitstatus is not attributable solely to this builder.|
|23. Edits are responsive — measured as CPU work, not as wall-clock or frames elapsed.|PASS|CPUbench21.5 ms. Same90medit atdensity.25/1 gave1497/3176 trees,reported10.6/9.9 ms,ratio 0.934. Timing succeeds; edit correctness fails item3 separately.|
|24. 720p parity.|PARTIAL|720p pair visually agrees in composition and props. Downsample comparisons meanDeltaL3.087avenue/1.814forest;0.698%/0.057%over40L. Existing sparkle remains; no unsupported optical crawl claim.|

API place/remove/count/at/stats/rebuild/lampsFor/signals/signalFor/stops/setDensity/cropRects/serialize/deserialize and debug visibility/LOD/sway/pools are present. Place/remove and serialized manual restoration were exercised; removed manual fence run metadata decreased 15→14. Read APIs and debug toggles were exercised by the probes. No unsupported all neighbor or version-delta pass is claimed.

Residual decisions honored: raw 3 m dolly cannot isolate popping; windzero time changes lighting; treeheightbase×scale corners conflict; same-depth impostor pairing, small hedge undulation and fence gap, and2–8px wind flow remain unmeasured. Extra 1080p forest at 22 resolves the missing720baseline. No score credit was granted from a waived or unmeasured range.

## Strengths to preserve

- All 35required/extra main captures render with0 errors and props ready;67 images including diagnostics were actually viewed.
- The12 frozen kinds and8 species exist; benches, lamps, signal heads, bins, planters and shelter details are recognizable.
- Signal standalone clock changes at half cycle and resets deterministically; traffic same-phase changed-arm handover updates lens colours without geometry rebuild.
- Manual item serialization/restore and fence metadata removal work; manual items persist across ordinary rebuilds.
- Bench placement21.5 ms, dirty90 m road edit10.6/9.9 ms at1497/3176 trees, ratio 0.934; idle30 samples median 0,max 0.1 ms.
- No props-owned lights or forbidden wall-clock/random animation logic found. Long cast shadows, cool night foliage and warm pools should be preserved.

## Per-image viewing notes

- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/aerial_12.png` → Woodland breaks into small card-like fragments from above; avenue and park layout remain readable.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/aerial_17p5.png` → Woodland breaks into small card-like fragments from above; avenue and park layout remain readable. Golden light preserves the same sparse/noisy crown structure.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/aerial_22.png` → Woodland breaks into small card-like fragments from above; avenue and park layout remain readable. Warm pool chain and dark forest at night.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/aerial_6p5.png` → Woodland breaks into small card-like fragments from above; avenue and park layout remain readable. Golden light preserves the same sparse/noisy crown structure.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/all_aerial_12.png` → Empty all-showcase landscape and HUD; props ready, but no populated city or props integration performance is demonstrated.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/avenue_12.png` → Double tree row, modelled signal heads, slim lamps and benches; hedge ends and flat leaf fans are conspicuous.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/avenue_12_720.png` → Double tree row, modelled signal heads, slim lamps and benches; hedge ends and flat leaf fans are conspicuous. At720p composition and major props agree with1080p; existing foliage aliasing remains.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/avenue_22.png` → Double tree row, modelled signal heads, slim lamps and benches; hedge ends and flat leaf fans are conspicuous. Warm pool crosses kerb with triangular holes.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/busstop_12.png` → Shelter roof, translucent glass, seat and timetable are identifiable with seated bases. Glass remains grey but the seat is visible through it.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/busstop_22.png` → Shelter roof, translucent glass, seat and timetable are identifiable with seated bases. Road lamp pool has angular kerb cutouts.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/canopy_12.png` → Top-down avenue spacing is legible without a strict tree grid, but crowns remain disconnected leaf sheets.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/closeup_12.png` → Intersection massing, lamp heights and furniture placement read clearly; sparse flat clusters and dark hedges dominate. Dappled shadows are visible.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/closeup_17p5.png` → Intersection massing, lamp heights and furniture placement read clearly; sparse flat clusters and dark hedges dominate. Long shadows cross the junction.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/closeup_22.png` → Intersection massing, lamp heights and furniture placement read clearly; sparse flat clusters and dark hedges dominate. Bright pools reveal angular kerb edges.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/closeup_6p5.png` → Intersection massing, lamp heights and furniture placement read clearly; sparse flat clusters and dark hedges dominate. Long shadows cross the junction.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/forest_12.png` → Distinct birch/orange broadleaf/conifer colours, but nearest fan cards and far stacked conifer cutouts create a visible representation boundary.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/forest_17p5.png` → Distinct birch/orange broadleaf/conifer colours, but nearest fan cards and far stacked conifer cutouts create a visible representation boundary. Golden light flattens the far canopy into pale patterned sheets.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/forest_22.png` → Distinct birch/orange broadleaf/conifer colours, but nearest fan cards and far stacked conifer cutouts create a visible representation boundary. Cool dark trees remain readable.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/forest_22_720.png` → Distinct birch/orange broadleaf/conifer colours, but nearest fan cards and far stacked conifer cutouts create a visible representation boundary. Cool dark trees remain readable. At720p composition and major props agree with1080p; existing foliage aliasing remains.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/lamp_12.png` → Tapered lamp and base collar visible; nearby hedge exposes thin end sheets. Material distinction from wood and bark is visible.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/lamp_22.png` → Tapered lamp and base collar visible; nearby hedge exposes thin end sheets. Small head clips; pool is bright and warm but cuts angularly across pavement.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/park_12.png` → Lanterns, benches, planters, bins and multiple tree colours are identifiable; the foliage is sparse and planar.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/park_17p5.png` → Lanterns, benches, planters, bins and multiple tree colours are identifiable; the foliage is sparse and planar. Golden shadows extend across the grass.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/park_22.png` → Lanterns, benches, planters, bins and multiple tree colours are identifiable; the foliage is sparse and planar. Small warm lantern pools read well.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/signal_12.png` → Mast arms, visors and three lenses read as objects; opposing signal states are visible. Foreground leaf fan is oversized and flat.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/signal_22.png` → Mast arms, visors and three lenses read as objects; opposing signal states are visible. Lamps introduce repeated jagged pool edges.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/skyline_12.png` → Forest mass is coherent at a distance but individual broadleaf icons and tiered conifer templates repeat. Cutout tree texture is visibly synthetic.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/skyline_17p5.png` → Forest mass is coherent at a distance but individual broadleaf icons and tiered conifer templates repeat. Warm/cool depth separation is legible.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/skyline_22.png` → Forest mass is coherent at a distance but individual broadleaf icons and tiered conifer templates repeat. Dark silhouette and reflection remain visible.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/skyline_6p5.png` → Forest mass is coherent at a distance but individual broadleaf icons and tiered conifer templates repeat. Warm/cool depth separation is legible.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/street_12.png` → Readable signal masts, benches and lamps; near crowns are flat fans and hedge is a streak-textured wall. Strong contact shadows at noon.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/street_17p5.png` → Readable signal masts, benches and lamps; near crowns are flat fans and hedge is a streak-textured wall. Long needle and tree shadows.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/street_22.png` → Readable signal masts, benches and lamps; near crowns are flat fans and hedge is a streak-textured wall. Warm pools have angular kerb cutouts; foliage is cool and dark.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/street_6p5.png` → Readable signal masts, benches and lamps; near crowns are flat fans and hedge is a streak-textured wall. Long needle and tree shadows.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/treecloseup_12.png` → Trunk and three branch forks are visible; bark is low contrast and clusters are planar fans; crown landmark is clipped at top.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/probe/aerial_off_12.png` → Props-off counterpart; furniture/crowns and their major shadows/reflections disappear, leaving terrain and roads.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/probe/aerial_on_12.png` → Props-on attribution frame; geometry, shadows and tree reflections are visible in the same fixed camera.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/probe/avenue_off_12.png` → Props-off counterpart; furniture/crowns and their major shadows/reflections disappear, leaving terrain and roads.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/probe/avenue_on_12.png` → Props-on attribution frame; geometry, shadows and tree reflections are visible in the same fixed camera.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/probe/dolly_a.png` → Three-metre forest dolly pair: obvious ordinary parallax and the same flat near/far crown representations; raw diff is not a LOD failure metric.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/probe/dolly_b.png` → Three-metre forest dolly pair: obvious ordinary parallax and the same flat near/far crown representations; raw diff is not a LOD failure metric.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/probe/forest_off_12.png` → Props-off counterpart; furniture/crowns and their major shadows/reflections disappear, leaving terrain and roads.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/probe/forest_on_12.png` → Props-on attribution frame; geometry, shadows and tree reflections are visible in the same fixed camera.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/probe/lamp_off_12.png` → Props-off counterpart; furniture/crowns and their major shadows/reflections disappear, leaving terrain and roads.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/probe/lamp_on_12.png` → Props-on attribution frame; geometry, shadows and tree reflections are visible in the same fixed camera.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/probe/manual_after_terrain_raise.png` → Manual bench target is buried below raised ground; surrounding park benches remain visible. Numeric target height retained in edits JSON.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/probe/manual_after_terrain_raise_repeat.png` → Manual bench target is buried below raised ground; surrounding park benches remain visible. Numeric target height retained in edits JSON.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/probe/park_off_12.png` → Props-off counterpart; furniture/crowns and their major shadows/reflections disappear, leaving terrain and roads.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/probe/park_on_12.png` → Props-on attribution frame; geometry, shadows and tree reflections are visible in the same fixed camera.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/probe/road_through_forest.png` → First road probe crosses the shoreline, so bridge geometry complicates visual overlap interpretation; superseded by dry-ground probe.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/probe/road_through_land_forest.png` → New dry-ground street is visibly obstructed by dense pre-existing forest trunks and crowns.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/probe/signal_traffic_stub_12.png` → Traffic stub switches visible lenses to red while mast geometry remains unchanged.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/probe/skyline_off_12.png` → Props-off counterpart; furniture/crowns and their major shadows/reflections disappear, leaving terrain and roads.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/probe/skyline_on_12.png` → Props-on attribution frame; geometry, shadows and tree reflections are visible in the same fixed camera.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/probe/street_off_12.png` → Props-off counterpart; furniture/crowns and their major shadows/reflections disappear, leaving terrain and roads.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/probe/street_on_12.png` → Props-on attribution frame; geometry, shadows and tree reflections are visible in the same fixed camera.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/probe/wind_12.png` → Wind enabled: leaf fans shift while trunk stays fixed; appearance remains planar.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/probe/wind_12p004.png` → Wind enabled: leaf fans shift while trunk stays fixed; appearance remains planar.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/probe/wind_zero_12.png` → Wind disabled: trunk and foliage positions appear stable; small lighting/grass changes remain as world time changes.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/probe/wind_zero_12p004.png` → Wind disabled: trunk and foliage positions appear stable; small lighting/grass changes remain as world time changes.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/aerial_mask.png` → Viewed binary noon |delta luminance|>6 attribution mask; includes props, their shadows and reflections. Used unchanged at other hours.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/avenue_mask.png` → Viewed binary noon |delta luminance|>6 attribution mask; includes props, their shadows and reflections. Used unchanged at other hours.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/forest_mask.png` → Viewed binary noon |delta luminance|>6 attribution mask; includes props, their shadows and reflections. Used unchanged at other hours.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/lamp_mask.png` → Viewed binary noon |delta luminance|>6 attribution mask; includes props, their shadows and reflections. Used unchanged at other hours.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/park_mask.png` → Viewed binary noon |delta luminance|>6 attribution mask; includes props, their shadows and reflections. Used unchanged at other hours.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/skyline_mask.png` → Viewed binary noon |delta luminance|>6 attribution mask; includes props, their shadows and reflections. Used unchanged at other hours.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r3-critic/street_mask.png` → Viewed binary noon |delta luminance|>6 attribution mask; includes props, their shadows and reflections. Used unchanged at other hours.
