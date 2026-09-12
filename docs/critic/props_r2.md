# Props — independent critic round 2

**6.0 / 10 — FAIL.** Competent but visibly synthetic foliage, slabs and shelter materials; public rebuild/remove editing semantics fail. Score6.0,FAIL; no gate relaxed.

Root acted as critic independently of the props builder and made no props implementation edits. All8CS2 references viewed anew; references4/7 calibrate crown/hedge volume,8 night sources. Own screenshots and fresh browser probes on5174, ANGLE Metal AppleM4 (not SwiftShader), measured standard59.7–60.3fps is diagnostic. Scope follows current architecture and residual decisions.

## Evidence and limits

35 required/baseline captures plus21 auxiliary images were captured and individually inspected. Every main capture ready/errors0, max139scene draws and1,438,926triangles. Seven same-camera props-on/off pairs: max54 attributable draws/429,940triangles. No point lights; initialbuild147.3ms; sampled update0ms at timer precision.

Measurements and scripts: `shots/props/r2/critic-probe/{contract,evidence,dirty-region}.mjs/.json`, `measure.py`, `measurements.json`. Fixed props masks use noon |ΔL|>6, then nearest mask resize to480px and3×3median speckle. Fullresolution pinned crops recorded separately. Missing/mixed crop diagnostics are builder defects, not permission to invent numerical failures. Road density measurements have1497vs3176trees, not falsely claimed4×totaltrees.

## Ranked issues

1. **major: Forest LODs visibly become repeated flat silhouettes.** Near crowns expose large planar leaf fans and regular angular branches; the forest switches to repetitive conifer cutouts and aerial circular caps. Against CS2 reference 4/7 this is obviously synthetic. Fixed noon props-mask speckle at 480px is forest 1.5814%, skyline 0.9888%, aerial 3.0695%, all above item9c 0.05%. Improve cluster volume, billboard shading/shape and minification together; merely darkening leaves will not restore volume. Evidence: shots/props/r2/forest_12.png; aerial_12.png; treecloseup_12.png; critic-probe/measurements.json.

2. **blocker: Public editing API loses manual props and leaves fence runs behind.** Fresh independent probe places bench3743 at (-138,145); api.rebuild() removes it entirely. Placing then removing fence3743 returns true and deletes the item, but serialized fenceRuns stays15→15; remove() never removes fenceRuns used to regenerate geometry. Keep manual placement and deletion intent across rebuilds and remove all associated geometry/metadata atomically. Evidence: shots/props/r2/critic-probe/contract.json: manualAfterRebuild and fenceRemove; src/modules/props/index.js remove/rebuild.

3. **major: Hedges and shelter lack required material and shape identity.** Avenue/street hedges remain straight green rectangular slabs with repeated leaf noise. The busstop preset shows an opaque dark shelter back/side and hides its seat/timetable; glass does not read as glass. Preserve dimensions but give hedges genuine irregular volume and shelter glazing a legible material/angle. This is visual evidence; exact 0.08m/0.12m thresholds are not claimed measured (residual decisions). Evidence: shots/props/r2/avenue_12.png; street_12.png; busstop_12.png; busstop_22.png.

4. **major: Pinned diagnostic rectangles miss required subjects.** treecloseup has no trunk rect despite a plainly visible trunk; forest/avenue lack canopy_conifer; park lacks hedge. Lamp pool rect [0,752,1849,328] spans nearly the entire image width, so its R−B=-2.63 measures much unrelated cold ground. Replace approximate/offscreen landmark selection with genuinely visible subjects and tighter full-object rectangles. Do not claim unmeasured bark, crown segregation or pool ratios pass/fail from these mixed regions. Evidence: shots/props/r2/treecloseup_12.crops.json; forest_12.crops.json; avenue_12.crops.json; park_12.crops.json; lamp_22.crops.json.

5. **minor: Lamp head clips and local road editing cost still scales with forest density.** Pinned lamp head p99=255 exceeds250, although warm pools and restrained halo are visible. Independent same90m road edit takes reported97.0ms at density.25 (1497trees) and150.2ms at1 (3176trees): ratio1.548>1.25. Absolute CPU limits pass; the density-scaling criterion does not. Preserve fixed-region updates rather than merging unrelated forest work. Evidence: shots/props/r2/critic-probe/measurements.json; dirty-region.json; lamp_22.png.

## API and acceptance

API keys place/remove/at/count/rebuild/stats/lampsFor/signals/signalFor/stops/setDensity/cropRects/serialize/deserialize/debug exist. Place/lookup/count and basic serialization roundtrip work; restoreManual true. Baseline rebuild counts stable, but manual bench removed; fence remove leaves15runs. Full API contract therefore fails. Signal standalone/halfcycle/repeat and read-through handover pass fresh probe; noerrors/GLfailures.

| Item | Verdict | Evidence / limitation |
|---|---|---|
| 1 Trees are trees | Partial | Branching/trunk/litter visible; trunk rect missing and crown hull segmentation unverified; flat fans materially limit quality. |
| 2 Species, silhouette and colour variety | Partial | 8species,3176trees; variety visible but no12-canopy six-delta certification. Distant species collapse into repeated silhouettes. |
| 3 Nothing floats/sinks/in road | Pass sampled contract | 3742items: ground/asphalt/water violation arrays empty;0circle overlaps; visual bases seated. Exact every-kind clearance beyond these probes unverified. |
| 4 Streetlamps | Partial | Modelled collar/taper/arm and ornamental lamps present; long pole shadows visible; all-edge anchor equality not exhaustively certified. |
| 5 Night lighting | Partial | Fixed noon-mask blackPct avenue.851/lamp.691/park.371/street1.198% all≤3; B−R10.06/10.50/9.46/13.22 positive. Mixed canopy rectangles prevent foliage-only ratio certification. |
| 6 Lamp ground lighting | Fail | Warm soft pools visible but headp99=255>250. Bad pool rectangle means its warmth/2.2ratio are unverified, not numerical failures. |
| 7 Noon albedo/contrast | Partial | Props-region std forest27.77/avenue36.55/park33.78;black≤.456%,white0. Raw broadrect medians73.93/103.89/84.20 below110 but mixed foliage/background rectangles require repair before judging foliage-only bounds. |
| 8 Dappled shadows | Partial | Leaf-shaped gaps visible and casting enabled; exact15% isolated-shadow test not certified. |
| 9 No halos/glow/sparkle | Fail | 480px fixed-mask speckle forest1.581%,skyline.989%,aerial3.069% exceeds.05%. No invented same-depth LOD comparison. |
| 10 Signals | Pass behavioral sample | Standalone phase repeat/halfcycle,traffic handover and same-phase lens changes pass; geometry counts stable; all geometry luminance dimensions not fully certified. |
| 11 Hedge/fence volumes | Fail visual | Straight thin box hedge, repeated leaf noise; no numeric undulation/rail clearance fail asserted under residual decisions. |
| 12 Twelve kinds identifiable | Fail visual | All12present, but busstop glazing/seat/timetable not legible in prescribed view. |
| 13 Designed placement | Partial | Road trees present and no gross lattice in canopy; exact histogram and full spacing constraints not certified. |
| 14 LOD | Fail visual | All3tiers populated3/497/1806; aerial crowns become flat caps. Dolly21.6766% is recorded, not failed against impossible parallax-only1.5% residual. |
| 15 Foreign camera | Partial | Water visually avoids gross confetti; on/off evidence retained; exact water-mask reflection percentage not certified. |
| 16 Wind | Partial | World-time sway and zero-speed geometry control work visually; exact2–8px motion not certified. Wind-zero RGB changes32.624% include sun/shadow changes, not a determinism failure. |
| 17 Golden hour | Partial | Long shadows, leaf hue variety, no visible17.5pools; fixed-mask white0/black0; exact12-canopy hue spread not certified. |
| 18 Aerial/skyline coherence | Fail | Repetitive caps/cutouts; required speckle fails. |
| 19 Determinism/idempotence | Pass stated baseline; API failure separate | Baseline rebuild counts3742/3176/124228 identical; serialization roundtrip same; manual edits lost on rebuild is separate API blocker. |
| 20 Budget | Pass measured subset | 35scene captures max139draws<200,1,438,926tri. Seven props-on/off pairs max54draw/429940tri within120/700k; no guarantee asserted for unmeasured attribution views. |
| 21 Matrix | Pass | All34required plus1080forest22baseline=35 captured/inspected,ready/errors0. |
| 22 Ownership | Pass review | NoLight,Math.random,Date.now logic;256m exemption recorded. Shared git changes belong to concurrent workers/integrator, not attributed blindly. |
| 23 Responsive edits | Fail | Bench13.6ms and road150.2ms absolute pass; roadedit densityratio1.548>1.25. |
| 24 720p | Partial | Same scene; resized1080vs720 >40L pixels avenue.679%,forest.058%. Gross parity good; speckle criterion unresolved/fails upstream. |

## Per-shot inspection

- `shots/props/r2/aerial_6p5.png` → Morning forest crowns repeat as round caps; avenue and planted park readable.
- `shots/props/r2/aerial_12.png` → Noon cap repetition and speckle obvious; water edge remains clean to eye.
- `shots/props/r2/aerial_17p5.png` → Long shadows improve massing but round forest-cap identity persists.
- `shots/props/r2/aerial_22.png` → Warm lamp chain contrasts dark crowns; city-scale woodland remains legible.
- `shots/props/r2/street_6p5.png` → Long pole shadows cross the road; light flat crown cards and slab hedge remain.
- `shots/props/r2/street_12.png` → Benches/signals/poles identifiable and seated; leaf fans and straight hedge look procedural.
- `shots/props/r2/street_17p5.png` → Golden light warms leaves and casts long needle shadows; hedge still slab-like.
- `shots/props/r2/street_22.png` → Pools visible; heads/lenses legible; foliage darkens substantially.
- `shots/props/r2/skyline_6p5.png` → Woodland silhouette differentiates narrow and broad crowns but repeats templates.
- `shots/props/r2/skyline_12.png` → Repeated conifer cutouts and detached-looking distant trees lack organic woodland depth.
- `shots/props/r2/skyline_17p5.png` → Warm distant tree bands retain repetitive upright silhouettes.
- `shots/props/r2/skyline_22.png` → Dark tree bands remain visible; no luminous impostor glow observed.
- `shots/props/r2/closeup_6p5.png` → Branch structure and warm crowns visible; planted block sparsely furnished.
- `shots/props/r2/closeup_12.png` → Massing seated but canopy card shapes and flat hedge dominate.
- `shots/props/r2/closeup_17p5.png` → Long shadows help depth; procedural foliage remains clear.
- `shots/props/r2/closeup_22.png` → Warm pools and dark cool foliage; no empty or black frame.
- `shots/props/r2/forest_12.png` → Dense varied-height forest; near volume gives way to repeated flat conifer cutouts.
- `shots/props/r2/avenue_12.png` → Both verges have trees and furniture; planar pale clusters, thin slab hedges.
- `shots/props/r2/signal_12.png` → Mast arms, three lens housings and bases visible, one lens active per head.
- `shots/props/r2/lamp_12.png` → Tapered pole, collar, arm/head and nearby bench/sign identifiable; painted material subtle.
- `shots/props/r2/park_12.png` → Several tree silhouettes and lanterns, planters and benches; lawn arrangement still sparse.
- `shots/props/r2/treecloseup_12.png` → Wide trunk with multiple bifurcations and litter ring; regular striped bark and flat leaf fans.
- `shots/props/r2/busstop_12.png` → Shelter roof/frame visible; opaque dark glazing and rear-facing camera hide interior details.
- `shots/props/r2/canopy_12.png` → Street tree spacing readable; no obvious grid scatter, crowns are sparse planar clusters.
- `shots/props/r2/avenue_22.png` → Warm paired pools and cool dark foliage; legible road furniture.
- `shots/props/r2/lamp_22.png` → Warm ground pool and small bright head, but head clips; no obvious hard ellipse rim.
- `shots/props/r2/signal_22.png` → Single active lens per visible head, housing dark but readable.
- `shots/props/r2/busstop_22.png` → Dark opaque shelter still conceals interior; nearby street illumination works.
- `shots/props/r2/park_22.png` → Lantern pools punctuate lawn; foliage and furnishings fall into cool shadow.
- `shots/props/r2/forest_22.png` → Dark forest remains coherent, repetitive distant silhouettes still visible.
- `shots/props/r2/forest_17p5.png` → Warm pale crowns; near/far shape discontinuity persists.
- `shots/props/r2/park_17p5.png` → Long pole/tree shadows with varied leaf hues; no visible pools.
- `shots/props/r2/all_aerial_12.png` → All modules initialize with HUD on empty terrain; this is not populated-city performance evidence.
- `shots/props/r2/avenue_12_720.png` → Same placements and framing at720; crown card identity remains.
- `shots/props/r2/forest_22_720.png` → Same dark forest structure at720 without new gross artifacts.
- `shots/props/r2/critic-probe/avenue_on_12.png` → Independent fixed-camera props-on attribution image; Both verges have trees and furniture; planar pale clusters, thin slab hedges.
- `shots/props/r2/critic-probe/avenue_off_12.png` → Props hidden: underlying road/terrain visible, used only as attribution baseline.
- `shots/props/r2/critic-probe/lamp_on_12.png` → Independent fixed-camera props-on attribution image; Tapered pole, collar, arm/head and nearby bench/sign identifiable; painted material subtle.
- `shots/props/r2/critic-probe/lamp_off_12.png` → Props hidden: underlying road/terrain visible, used only as attribution baseline.
- `shots/props/r2/critic-probe/park_on_12.png` → Independent fixed-camera props-on attribution image; Several tree silhouettes and lanterns, planters and benches; lawn arrangement still sparse.
- `shots/props/r2/critic-probe/park_off_12.png` → Props hidden: underlying road/terrain visible, used only as attribution baseline.
- `shots/props/r2/critic-probe/street_on_12.png` → Independent fixed-camera props-on attribution image; Benches/signals/poles identifiable and seated; leaf fans and straight hedge look procedural.
- `shots/props/r2/critic-probe/street_off_12.png` → Props hidden: underlying road/terrain visible, used only as attribution baseline.
- `shots/props/r2/critic-probe/forest_on_12.png` → Independent fixed-camera props-on attribution image; Dense varied-height forest; near volume gives way to repeated flat conifer cutouts.
- `shots/props/r2/critic-probe/forest_off_12.png` → Props hidden: underlying road/terrain visible, used only as attribution baseline.
- `shots/props/r2/critic-probe/skyline_on_12.png` → Independent fixed-camera props-on attribution image; Repeated conifer cutouts and detached-looking distant trees lack organic woodland depth.
- `shots/props/r2/critic-probe/skyline_off_12.png` → Props hidden: underlying road/terrain visible, used only as attribution baseline.
- `shots/props/r2/critic-probe/aerial_on_12.png` → Independent fixed-camera props-on attribution image; Noon cap repetition and speckle obvious; water edge remains clean to eye.
- `shots/props/r2/critic-probe/aerial_off_12.png` → Props hidden: underlying road/terrain visible, used only as attribution baseline.
- `shots/props/r2/critic-probe/dolly_a.png` → Forest first camera; clear dense near/far detail change.
- `shots/props/r2/critic-probe/dolly_b.png` → Three-metre move changes parallax and LOD; whole-frame difference does not isolate popping.
- `shots/props/r2/critic-probe/wind_12.png` → Near trunk base fixed; foliage in initial sway pose.
- `shots/props/r2/critic-probe/wind_12p004.png` → Leaf clusters move while trunk base/poles remain visually fixed.
- `shots/props/r2/critic-probe/wind_zero_12.png` → Wind-zero near-tree control initial time.
- `shots/props/r2/critic-probe/wind_zero_12p004.png` → Geometry looks fixed; sun/time still changes shading, so bytes are not a wind criterion.
- `shots/props/r2/critic-probe/signal_traffic_stub_12.png` → Stub traffic phase changes visible near signal lenses from green to red as intended.

## Preserve

- All required captures render ready with zero console or GL errors.
- All12kinds and8species; seated furniture and street-tree verges restored.
- Traffic ownership handover and lens updates work without geometry rebuild.
- Night pools, daylight switch-off, long pole shadows and absolute measured budgets work.
