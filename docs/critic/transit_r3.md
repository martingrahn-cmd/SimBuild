# Transit r3 independent critic

6.8/10 FAIL: working deterministic bus system with clearer interiors, night windows and subject framing; flat materials, night body brightness, obstructions and missing tram remain below8.5.

All33 own images and all8 original CS2references viewed. Five productionfile hashes match frozenr3 manifest. AppleM4Metal/Chrome152; overlapping browsers mean observedFPS is not isolated finalperformance. Builder score was not used as evidence. No r4 authorized.

## Measurements

26transit command captures: max228draws/2252216triangles/min32.5FPS; allcapture700draws/4406074triangles/11.2FPS undercontention. Allerrors0/transitready. Stable on/off/on deltas: aerial12=15/137054tris; aerial22=16/137450; street22=20/147148; bus22=18/144038; overlay12=16/142238. Unstable14→70,0→4,17→13 pairs and initialself21 excluded from stableclaim, retained inrawdata. No guarantee of every-camera20ceiling.

PinnedbusAABB532,124,1309,828 excludesHUD; p1/p50/p99=5.583/89.407/185.349. Literal97.699neighbourexcess1935pixels>40. Group masks include independently movingtraffic, so9.905percentstreet/1.782percentaerial differences are diagnostics, not pure transitmeasurements. Source/shot artifacts include probe.json, focused.json, extra.json, routing.json, draft-check.json, pixels.json, source-hashes.json. Heapgrowth24.85MB/600samples doesnotprove per-frame allocationabsence.

## Acceptance

| Item | Result | Evidence and limits |
|---|---|---|
| 1. Hard gates | FAIL | 27 command captures0errors/transit ready. Stable attributable max20draws/147148triangles; flat surfaces remain. All-mode global4.406Mtriangles is a cross-owner failure. |
| 2. World contract | PASS measured | 20methods,3lines/24stops/12buses; keys/palette/closed routes/lengths/event batches valid. Infinity zero-fleet sentinel correctly serialized null. |
| 3. Modelled bus | FAIL | Hollow interior/glass, wheel arches and roughness.38 improve. Flat surfaces and literal97.699crop excess remain; sub-metre tyre gap unmeasured. |
| 4. Stops and seating | PARTIAL | 24sidewalk records at+0.2m, lateral6.95m;3validpropsadoptions. Timetable and flag improved, no docked bus in close shelter preset. Fullgroundraycasts unestablished. |
| 5. Overlay | PARTIAL | Separated ribbons/arrows/rings; ambient movement confounds groupmask. No fabricated3percent or flicker metric; spec arithmetic ambiguity retained. |
| 6. Night lighting | PARTIAL / visual FAIL | Two tints and dark bays now verified visually; far window/lamp cues retained. Bright broad panels remain, isolatedpanelp50 and shelterratio unestablished. |
| 7. Lane loop and dwell | PASS measured | Onehour at.1s: laneerror5.68e−14 outside explicitjunctions,0overspeed/deadedge,1314dwells of8s.157bisectedjoins max6.17e−10m; footprintspacing not isolated. |
| 8. Repeatability and time | PASS measured | Two fresh state/pose loads equal; repeat PNG MAE.218786<.5. Clockhold/revisit exact; meanSpeed7.606m/s. Separate900s modulo identity not isolated. |
| 9. Graph routing | PASS with limit | Fresh independentDijkstra2160/2160/1800m and1260m newroute exact.24stop routewall1.9ms/reported.1ms. Roadcut no deadvehicles after2rAF; oneframe deadline not isolated. |
| 10. Ridership | PASS measured | Daily1417constant; occupancy.1333–.3048; morning/night curve present. Actualpopulation/jobs demand code unchangedr2; fullnativefiscalintegration still pending. |
| 11. HUD | PASS | Real3rows, finite line data, eight stopnames.720p scroll container retains footer. |
| 12. Actions and draft | PASS module scope | Fresh3stop directdraft createsline/fleet/event1/version1, secondcommitnoop. Fleet0/3/1, colour, edit/cancel/delete and fare7 exact; native tools pending rootintegration. |
| 13. Adoption and ownership | PASS accepted seam | 3validlivepropsadoptions; props/cashunchanged through module mutations. Ownbusrenderer accepted because complete trafficfleetadapter absent. |
| 14. Save/load | PASS accepted seam | Two normal exactrestores/118geometriesstable; JSONzerofleet null→Infinity. nullfalse/legacy{}emptytrue. PostnewID restorestockexact but nextLine5vs4 intentionallymonotonic. |
| 15. Aerial identity | PARTIAL | 3palettecolours and separated sharededge ribbons. Far foliage blocks full tracing. CIE/disc area not isolated. |
| 16. Batching/culling/LOD | PARTIAL | Stablemax20draws/147148tris, offscreen0; near/far180m retainwheels/lights.2m transition unestablished. |
| 17. Shadows/contact | FAIL literal flags | Several lamp/glass batches castShadowfalse. No fabricatedazimuth/contactratio. |
| 18. Material limits | UNESTABLISHED | No ownedtextures. Ambient-contaminated mask cannot prove material-only histogram/autocorrelation. |
| 19. 720p chips | PASS measured | 3visible nonoverlappingchips outsideHUD,95–104pxwide/21high. Residual300m/260mlabeldistance ambiguity retained. |
| 20. Determinism | PASS | Two seed1337serialize/posesexact; seed99moves17/24stops>5m withsamecounts. |
| 21. All startup | PASS transit | Ownallcapture8047people/cash25848: prior democitystartcorrected. Transitinit doesnotstage. All700draws/4406074tris/0errors; pre-rolltoastsawaitrootintegration. |
| 22. Tram stretch | FAIL deferred | Absent; atmost0.3scoreweight; no newround authorized. |

## Ranked issues

1. **major: Bus materials and silhouette remain visibly synthetic** — Transparent glass, interior seats, wheel cutouts and roughness0.38 fix specific r2 issues. Large flat body panels, block seats and rectangular lamp clusters still fall short of reference vehicles. Literal bus-crop8-neighbour excess97.69855 with1935pixels>40 remains above40; whole AABB includes hard geometry/background edges, so this does not isolate paint sparkle. Evidence: /Volumes/ExtDrive/SimBuild-verification-2026-09-06/transit/r3/critic/transit_bus_12.png
2. **major: Night bus body remains too bright and shelter scene incomplete** — Two tinted lit window groups and dark windows now work. Broad gray roof/side panels remain overly bright versus asphalt. Shelter is fully visible and lit, but lacks a nearby docked bus in stop/night_stop, and floor pool is weak. Whole-AABB pixels do not isolate body-panel p50 or shelter1.8ratio: these numerical criteria remain unestablished. Evidence: /Volumes/ExtDrive/SimBuild-verification-2026-09-06/transit/r3/critic/transit_bus_22.png
3. **minor: Foliage and poles still interrupt route and vehicle inspection** — R3 closeup and bus framing now keep complete vehicle above HUD; shelter no longer hidden by giant bus. Street right canopy and noon bus pole still block parts; far route loops vanish through trees. Preserve these framing gains when correcting obstructions. Evidence: /Volumes/ExtDrive/SimBuild-verification-2026-09-06/transit/r3/critic/transit_street_12.png
4. **minor: Literal shadow and LOD acceptance incomplete** — Only body/structural batches cast shadows; glass/lamp/shelter-glass flags remain false. Far fleet now retains wheel/light cues. Exact2m LOD transition and contact/shadow azimuth remain unisolated; owner raw35.06percent cropdiff is confounded by parallax and ambient movement, not a measured isolated failure. Evidence: /Volumes/ExtDrive/SimBuild-verification-2026-09-06/transit/r3/critic/probe.json
5. **minor: Tram stretch remains absent** — No articulated tram, rails, catenary or platforms; round3 stretch is absent with maximum0.3 score weight. Deferred at user stop boundary. Evidence: /Volumes/ExtDrive/SimBuild-verification-2026-09-06/transit/r3/critic/transit_line_12.png

## Strengths

- Continuous deterministic route poses and8s dwell remain verified.
- Hollow interior, tinted/dark night windows and far light/wheel cues improve model readability.
- Bus fits entirely above HUD; shelter has clear timetable and no longer giant bus obstruction.
- Public draft/fleet/fare/cancel/save contracts and readable720p panel/chips pass measured scope.
- Stable attributable maximum20draws/147148triangles; offscreen0;600sampleCPUmean.06767ms/max.2ms.

## Every own image viewed

- `transit_aerial_6p5.png` — Pale separated three-line ribbons across broad empty forest grid; blue/red/green identifiable near stretches, little vehicle detail. Ground/foliage still visibly synthetic.
- `transit_aerial_12.png` — Three routes remain thin/pastel and partly foliage-occluded; small bus bodies/windows/wheels retained at distance. HUD has real three rows and rates.
- `transit_aerial_17p5.png` — Warm flatter ground with same readable near ribbons; distant path detail weak and repetitive vegetation dominates.
- `transit_aerial_22.png` — Repeated roadside light pools dominate; distant buses now retain small lit window cues. Ribbons remain much brighter than bodies, dark forest contrast.
- `transit_street_6p5.png` — Shelter now foreground and fully readable with bench, timetable lines, numbered flag and transparent rear; large right-side leaves still obscure road and approaching subject.
- `transit_street_12.png` — Owned shelter and shadow are clear, timetable detail visible. A blue bus crosses in background; foreground canopy blocks right approach.
- `transit_street_17p5.png` — Red-waist bus is readable near shelter, with hollow interior/seats, vents and door bays; still a flat square body, foliage partly covers rear and ambient car shares frame.
- `transit_street_22.png` — Shelter readable with slightly brighter bench/timetable. Background bus now has alternating lit/dark window treatment; near shelter pool is weak and right canopy obstructs road.
- `transit_skyline_6p5.png` — Forest and low terrain dominate; near route edges distinguishable but far route obscured by foliage. Pale gray sea and sky, mountain at left.
- `transit_skyline_12.png` — Forest dominates; three route colors visible near corners but full loops cannot be traced. Distant buses minimal.
- `transit_skyline_17p5.png` — Bright cream sea and sky wash right frame; small route edges remain muted. Large flat shadow patch in front.
- `transit_skyline_22.png` — Black forest silhouettes over gray green ground, bright gray blue sky. Near route outlines readable; far network lost in foliage and window cues weak.
- `transit_closeup_6p5.png` — Bus fully framed, hollow seating and glass distinguishable, roof vents and wheel cutouts visible; flat pale body still simplified.
- `transit_closeup_12.png` — Clear full bus with seats and two door bays; traffic pole occludes rear side. Paint/glass treatment remains synthetic.
- `transit_closeup_17p5.png` — Bus and shelter meet in frame; seats, vents, waist and wheel cutouts readable; ambient vehicles overlap the route.
- `transit_closeup_22.png` — Warm/cool lit window sections alternate with a dark bay; dark seats now visible. Gray roof and body remain too bright relative to road.
- `transit_stop_12.png` — Full four-post shelter, translucent glass, bench, timetable rows and numbered flag. Bare roof and plain posts remain simple; bus is background only.
- `transit_bus_12.png` — Entire bus above HUD with hollow interior, recessed glass, roof vents, wheel arches and pillar seams. Big flat side panels and primitive seats remain obvious; pole obstructs rear.
- `transit_line_12.png` — Three thin ribbons trace near grid but far segments obscured by foliage; much empty terrain.
- `transit_overlay_12.png` — Three separate ribbons, arrows, discs and readable chips. Tight framing clips entire loops, but useful local route identity.
- `transit_lines_12.png` — Real three-row line panel with finite data; distant network visually muted and partly tree-occluded.
- `transit_night_stop_22.png` — Entire shelter cleanly framed; emissive roof strip, readable timetable and bench. Weak local warm pool; distant bus at left not docked near shelter.
- `transit_stop_22.png` — Same clear shelter framing with lit strip; no close docked bus, subtle floor light. No giant bus blocking frame as in r2.
- `transit_bus_22.png` — Full bus with two window tints and dark sections, lit seats and destination; broad roof and panels still gray/bright and lamps simple rectangles.
- `transit_lines_12_720.png` — Panel contained within720p with sticky footer and scrollable lower details. Colour controls below fold, no horizontal overflow.
- `transit_overlay_12_720.png` — Three nonoverlapping readable route chips outside HUD; local ribbons visible. Panel lower controls require scrolling.
- `repeat-1.png` — Fixed seed1337 closeup: full red bus, pole occlusion, transparent seating; ambient traffic in background.
- `repeat-2.png` — Same bus pose and composition as first; tiny differences in independently moving ambient cars/pedestrians. Whole PNG mean absolute difference0.218786/255.
- `mask-aerial-on.png` — Diagnostic ribbons and bus models visible across near grid; sparse forest dominates.
- `mask-aerial-off.png` — Owned ribbons and fleet disappear. Ambient cars move between captures; mask is confounded and not pure material evidence.
- `mask-street-on.png` — Full shelter, ribbon and chips visible; right canopy blocks approaching road.
- `mask-street-off.png` — Owned shelter and ribbons vanish, remaining props shelter stays. Ambient movement prevents pure pixel attribution.
- `all_aerial_12.png` — Composed high-rise city, river and bridges. HUD8047people/cash25848 confirms startup correction. Multiple pre-roll milestone notices cover top/right; pending root dismiss integration. Frame4.406Mtriangles exceeds3M global budget.

## Integration boundary

Native tools/input, daily fare/upkeep booking, truthful partial-load failure, cameraaliases and transient pre-roll notificationdismiss remain prepared root integration work at this verdict baseline. Final integration report must verify them against applied production; do not infer nativeplay from directAPI tests. Ordinary404city save remains separately durable and doesnot prove6000progression or sustainableeconomy. Wholegamecritic/blindA-B and furtherdevelopment deferred byuser.
