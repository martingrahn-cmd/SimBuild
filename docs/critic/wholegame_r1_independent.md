# Whole-game independent critic — W5/r7x

6.0/10 FAIL. A recognisable and functioning-looking city presentation with coherent roads, detailed facades and a usable HUD, but primitive landmarks, sparse block fabric, planar foliage and schematic night lighting keep it clearly synthetic. Draw/triangle gates pass this full series; raw heap, observed local FPS/update ceilings and requested weather handling do not.

This is an independent review of the supplied fresh capture set, not a new independent capture run. All 35 PNGs and all eight CS2 references were individually viewed. I read the role, ARCHITECTURE§9/12/13/14, CS2-LOOK, STATUS and the latest available module reports. The local `wholegame_r1` verdict was not read before or after scoring. No production code, game state or evidence file was changed.

The scene earns 6.0 on the visual scale: more substantial than flat programmer art, but visibly below the 7.0 good-indie anchor as a complete composition. The strongest road and building details cannot compensate for blank focal landmarks, detached lots, planar foliage and schematic night lighting. The score is a whole-frame judgment, not a module-score average or a reward for completed engineering.

## Scope and gates

The original 28-frame matrix was missing the declared bridge preset. Four fresh bridge images were added and reviewed, giving 32 matrix frames plus 720p/rain/cloudy extras. `riverfront` is the accepted `waterfront` alias. All captures use seed 1337, High, headless=1 and speed=0 through port 5173, Chrome152.0.7977.83 on ANGLE (Apple, ANGLE Metal Renderer: Apple M4, Unspecified Version).

| Gate | Result | Evidence |
|---|---|---|
| Visual quality >=8.5 | FAIL | Independent full-frame judgment6.0; no average of module scores. |
| All declared presets and hours | PASS | 32 frames:8 cameras ×6.5/12/17.5/22; bridge supplement included; riverfront is the waterfront alias. |
| 1280×720 | PASS observed | HUD and full scene fit the supplied downtown view. |
| Active rain and cloudy noon | FAIL | Explicit URL weather is overwritten by democity staging; supplied frames cannot certify active weather. |
| Zero errors / all modules ready | PASS | 35/35 records errors[];16 ready modules each. |
| Draw calls <=1500 / triangles <=3M | PASS measured | 469 draws /2,788,342 triangles maximum. |
| JS heap <=512MB | FAIL raw snapshot | 715.5MB maximum,21/35 samples exceed512MB. No forced-GC claim. |
| FPS >=50 | FAIL local observed | 43.7 minimum on M4 Metal; target-device equivalence and sustained play untested. |
| Each module update <=2ms | FAIL observed endpoints | 1080p props2.4ms, traffic 2.1 ms. These are endpoint observations, not per-frame maxima. |
| No stalls / total JS <=6ms / texture bytes / warm init | UNVERIFIED | The screenshot endpoint and texture-count fields do not certify these. Max recorded frameMs23.3 and max total capture elapsed13,495ms are not corresponding acceptance measurements. |

## Budget verification

`summary.json` matches all 28 underlying records and `summary-full.json` matches all 32. Neither includes the three extras; I included all 35 sidecars when recomputing maxima. No aggregate or per-record errors were found. Draws and triangles are per-capture sampled peaks, including reflection frames; `lastTriangles` was not substituted. Heap and moduleMs are endpoint observations, not forced-GC retained size or a maximum over every frame.

| Metric | Observed | Shot |
|---|---|---|
| drawCalls | 469 | `shots/democity/rwholegame1/park_17p5.png` |
| triangles | 2788342 | `shots/democity/rwholegame1/night_downtown_22.png` |
| heapMB | 715.5 | `shots/democity/rwholegame1/downtown_22.png` |
| textures | 74 | `shots/democity/rwholegame1/downtown_22.png` |
| frameMs | 23.3 | `shots/democity/rwholegame1/interchange_12.png` |
| elapsedMs | 13495 | `shots/democity/rwholegame1/aerial_cloudy_12.png` |
| minimum FPS |43.7| `shots/democity/rwholegame1/downtown_17p5.png` |

FPS ranges 43.7–60.1, with 9/35 samples below 50. Raw heap exceeds 512 MB in 21/35 frames. This does not invalidate earlier forced-GC retained-heap measurements; it measures a different state. Props reaches 2.4 ms in 1080p downtown noon and traffic 2.1 ms in 1080p bridge 17:30. A 720p traffic endpoint reaches 2.2 ms as additional context. The screenshots do not certify long-duration stutter, total update CPU, GPU texture bytes or warm-cache init. The maximum 13,495 ms is total capture elapsed, not init time.

## Ranked issues and ownership

1. **Landmarks and distant facilities visibly fall below the surrounding asset quality** — major; owner: **cross-cutting** (democity, services).

The park arena is a plain dome with block doors; the suburban hospital and water tower are largely blank, and port cranes are sparse bars on pads. These are close, important subjects, not harmless distant decoration. In downtown views, paid cooling plants become giant featureless boxes while their white plumes remain. Source confirms services proxies use one UNIT_BOX per catalogue footprint and democity landmarks use simple primitive assemblies. Upgrade recognisable silhouette, facade rhythm and access detail, then preserve these features in screen-size-aware LOD. Do not simply remove the paid facilities or raise all geometry budgets.

Evidence: shots/democity/rwholegame1/park_12.png; shots/democity/rwholegame1/suburb_12.png; shots/democity/rwholegame1/downtown_12.png; shots/democity/rwholegame1/bridge_12.png; src/modules/services/render.js:148; src/modules/democity/landmarks.js.

2. **Downtown is a collection of towers in lawns, rather than continuous city blocks** — major; owner: **democity** (zoning, buildings).

The central tower has extensive grass on all sides and many nearby blocks contain one isolated building or a small house. Suburbs and industrial land use are recognisable, but almost all districts share the same oversized parcel rhythm. Repeated stepped crowns strengthen the kit-like appearance. Build purposeful frontage, smaller connected infill and coherent civic/industrial yards through real lots and simulation; retain the visible downtown-to-suburb height transition.

Evidence: shots/democity/rwholegame1/downtown_12.png; shots/democity/rwholegame1/aerial_cloudy_12.png; shots/democity/rwholegame1/interchange_12.png.

3. **Tree crowns expose flat cards and inconsistent detail tiers** — major; owner: **props**.

Park and riverfront views show sparse large leaf fans attached to thin trunks; hillside conifers become solid repeated cut-outs. This is much more obvious than the detailed buildings or road surfaces and prevents a common art direction. Preserve species and colour variety, but match crown volume, scale and shading across the existing detail tiers. This is direct spatial evidence; temporal popping or flicker was not measured.

Evidence: shots/democity/rwholegame1/park_12.png; shots/democity/rwholegame1/riverfront_12.png; shots/democity/rwholegame1/industry_12.png.

4. **Night has readable light points but weak occupied interiors and generic pools** — major; owner: **cross-cutting** (buildings, props, services, effects).

The close night canyon has warm/cool variation but windows remain broad, nearly uniform luminous rectangles. Wide towers reduce to subdued grid textures, and identical roadside dots or equipment ovals do most of the lighting work. Full-frame 480px luma: downtown night mean41.1415, median33.1690, >180 fraction0.5139%; close night mean44.9046, >180 fraction1.7037%. These are descriptive measurements, not imported camera-specific numeric failures. Improve window interior depth and fixture-ground integration while retaining the now-dark sky and readable streets.

Evidence: shots/democity/rwholegame1/night_downtown_22.png; shots/democity/rwholegame1/downtown_22.png; shots/democity/rwholegame1/industry_22.png; shots/democity/rwholegame1/suburb_22.png.

5. **Road grading and site boundaries make the landscape implausible** — major; owner: **cross-cutting** (terrain, roads, democity, buildings).

Riverfront roads climb abruptly from the bank into warehouses; the highway cuts steeply across the mountain. Pads, shallow shore strips and clean lawn edges expose how separate assets meet. The bridge supplement shows coherent crossings, so the old measured bridge-clearance failure is not repeated as a current failure. Resolve shared terrain, road grades, foundation and site-access rules before adding concealment props. Current stills do not measure every base gap or certify contact everywhere.

Evidence: shots/democity/rwholegame1/riverfront_12.png; shots/democity/rwholegame1/interchange_12.png; shots/democity/rwholegame1/industry_12.png; shots/democity/rwholegame1/bridge_12.png.

6. **Atmosphere and water still resemble layered surfaces** — major; owner: **cross-cutting** (environment, terrain, effects).

The river reflects a broad blotchy cloud sheet; a straight bright horizon strip appears at riverfront 17:30 and22:00. Mountain shading looks stretched and stippled. These layers do not share the continuous depth and natural terrain texture seen in CS2 references2 and6. Golden frames are no longer judged using stale r3 wash measurements; this series retains useful highlight detail. Improve horizon blending, reflection filtering and macro terrain response with current paired evidence.

Evidence: shots/democity/rwholegame1/riverfront_17p5.png; shots/democity/rwholegame1/riverfront_22.png; shots/democity/rwholegame1/industry_6p5.png.

7. **The showcase does not yet communicate much street life** — major; owner: **cross-cutting** (democity, traffic, transit, simulation).

There are real visible buses, cars and small pedestrians, especially in suburb views. The standard near canyon nevertheless shows a quiet shelter and largely empty street behind obstructing foliage; the park and port lack visible use. Improve the ordinary destination/frontage composition and believable stop activity using the managed systems. Still images at speed=0 cannot prove traffic flow, queue discharge, boarding animation, simulation pacing or enjoyable choices; no such functionality is marked broken from these frames.

Evidence: shots/democity/rwholegame1/night_downtown_12.png; shots/democity/rwholegame1/night_downtown_22.png; shots/democity/rwholegame1/suburb_12.png; shots/democity/rwholegame1/park_12.png.

8. **Geometry now passes, but observed memory and frame-time margins do not** — major; owner: **cross-cutting** (core, props, traffic).

Across all 35 images, peak469 draws and2,788,342 triangles pass1500/3M. Raw JS heap reaches715.5MB at downtown22;21/35 samples exceed512MB. Minimum43.7fps at downtown17.5 misses50 on the local M4, with 9/35 samples below 50. 1080p endpoint moduleMs reaches 2.4 ms props at downtown noon and2.1ms traffic at bridge 17:30, above the2ms ceiling. These are raw endpoint samples and short host-dependent FPS measurements, not proof of a retained leak, sustained stall, or GTX1660 equivalence. Earlier forced-GC retained-heap passes are a different metric. Preserve the now-passing geometry while profiling current allocation and update work.

Evidence: shots/democity/rwholegame1/downtown_22.json; shots/democity/rwholegame1/downtown_17p5.json; shots/democity/rwholegame1/downtown_12.json; shots/democity/rwholegame1/bridge_17p5.json; shots/democity/rwholegame1/summary-full.json.

9. **The city overrides the requested rain and cloudy weather** — major; owner: **democity**.

Both weather URLs are recorded correctly, but the resulting images retain hard sunlight and no visible rain. Their full-frame RGB MAE is 0.746251/255; both record431 draws and1,921,702 triangles. Environment init reads flags.weather, then democity/index.js:109 unconditionally calls setWeather({cloudiness:.38,rain:0,fogDensity:.00004}). Respect explicit weather selection at the composition boundary and recapture active rain/overcast. The present files satisfy the URL request but do not verify those weather states or their performance.

Evidence: shots/democity/rwholegame1/aerial_rain_12.png; shots/democity/rwholegame1/aerial_cloudy_12.png; src/modules/democity/index.js:109; src/modules/environment/index.js:109.

## Strengths to preserve

- All 35 supplied PNGs render nonempty scenes; all16 modules report ready with zero recorded console errors.
- The eight declared city cameras are now covered at all four required hours; the added bridge views close the initial matrix gap.
- A recognisable height transition, river crossings, road hierarchy, suburbs and industrial district make the city understandable.
- Building reveals, balconies, roof equipment, road markings, signals, shelters and visible managed buses provide useful detail.
- Day/night colour changes, cool shadows and water reflections work; the close night view contains both warm and cool lit windows.
- The1280×720 HUD fits and remains legible; no visible overlap in the supplied compact view.
- Peak draw calls and geometry remain below1500 and3M across every supplied image, including the three extras.

## Gameplay and measurement limits

Visible cars, buses, lit windows and a populated HUD support a functioning city presentation. They do not prove enjoyable pacing, traffic flow, queue clearance, boarding animation, save durability under every failure, or audio quality. Those need their own evidence. STATUS records newer exact cross-seed, successful-load and atomicity repairs; the old failures are not copied into this verdict. The old bridge clearance failure is also not reasserted, and the closed aerial autocorrelation clause is separate from visible architectural repetition.

Still images cannot certify absence of temporal flicker, all floating contacts, or every UI panel state. The 720p observation applies to the supplied HUD view. Weather URL metadata alone is insufficient: direct source inspection confirms democity resets rain to 0 after the environment reads the requested preset. All pixel measurements in the JSON include the HUD and are descriptive, using Rec.709 luma at 480×270; no new unrequested numerical visual threshold was invented.

Bridge sidecars retain their original `rwholegame1bridge` png field after the parent copied the files into the review folder. They were matched by basename/camera/time; the reviewed paths below are the actual copies.

## Per-shot notes — all 35 PNGs viewed

| Image | Observation |
|---|---|
| `shots/democity/rwholegame1/aerial_cloudy_12.png` | Almost the same sunlit composition as the rain-labelled image. Clear shadows and reflected patchy clouds do not demonstrate a distinct overcast condition. |
| `shots/democity/rwholegame1/aerial_rain_12.png` | Detailed roads, tower height hierarchy and river are visible, but the scene is sunlit with hard shadows and no convincing rainfall or wet-road response. |
| `shots/democity/rwholegame1/bridge_12.png` | Bridge decks and vehicles read clearly. The paired cranes and isolated silos are primitive, and the concrete apron is almost empty. |
| `shots/democity/rwholegame1/bridge_17p5.png` | Warm river and port view retain detail; clean empty pads, thin cranes and sparse developed shoreline still look like separate placed assets. |
| `shots/democity/rwholegame1/bridge_22.png` | Both crossings remain readable from lights and vehicles. Port equipment is dark and schematic, while bright repeated roadside dots do most of the visual work. |
| `shots/democity/rwholegame1/bridge_6p5.png` | Two river crossings and native traffic are visible. Basic cranes, cylinders and stacks sit on individual grass-surrounded pads with little working-port context. |
| `shots/democity/rwholegame1/downtown_12.png` | Road markings and facade reveals read clearly. A tall tower occupies a small part of a full grass block; distant cooling plants become large featureless boxes. |
| `shots/democity/rwholegame1/downtown_12_720p.png` | The full viewport and HUD fit at 1280×720; icons and city totals remain legible. No visible toolbar overlap. Sparse blocks and distant blank facilities remain obvious. |
| `shots/democity/rwholegame1/downtown_17p5.png` | Golden light is controlled enough to retain buildings; broad vacant blocks, repeated roof crowns and hazy mirror-like water still look synthetic. |
| `shots/democity/rwholegame1/downtown_22.png` | The city stays readable against dark water. Fine dark window grids and regular lamp pools dominate; the blank distant facilities remain conspicuous. |
| `shots/democity/rwholegame1/downtown_6p5.png` | Warm facades, recognisable tower hierarchy and river; large central lawn blocks, repeated stepped crowns and two blank facility proxies break the city fabric. |
| `shots/democity/rwholegame1/industry_12.png` | Plant geometry and roof equipment are legible, but the yard is mostly lawn. Dark base edges, simple shed repetition and unnaturally steep access roads are conspicuous. |
| `shots/democity/rwholegame1/industry_17p5.png` | Low sun gives readable tower shadows. Repeated plant geometry, upright plume columns and sparse working yards still lack industrial complexity. |
| `shots/democity/rwholegame1/industry_22.png` | Plant walls remain pale while small sheds are very dark. Warm circular equipment pools are visible, but smoke has little visible presence and the scene feels quiet. |
| `shots/democity/rwholegame1/industry_6p5.png` | Two nearly identical cooling-tower plants dominate small sheds, clean lawns and tiny equipment; straight dense steam columns and stippled mountainside look schematic. |
| `shots/democity/rwholegame1/interchange_12.png` | Road lanes and curved ramps read clearly, with traffic present. Sparse park foliage looks like scattered cut-outs; giant blank civic proxies intrude behind the mid-rise blocks. |
| `shots/democity/rwholegame1/interchange_17p5.png` | Warm directional light is visible but the left hillside is veiled. Repeated plots, sparse tree cards and abrupt road grades remain. |
| `shots/democity/rwholegame1/interchange_22.png` | Roads are traceable from repeating light spots, and vehicles are visible. Uniform pools and the pale dome give a diagrammatic night landscape. |
| `shots/democity/rwholegame1/interchange_6p5.png` | A highway, ramps and smaller streets provide road hierarchy. The network climbs the mountain abruptly; repetitive plots and a plain park dome dominate the backdrop. |
| `shots/democity/rwholegame1/night_downtown_12.png` | A recognisable street canyon with readable junction and shelter. Repetitive glass interiors and foliage occupy most of the frame; few people or vehicles are visible. |
| `shots/democity/rwholegame1/night_downtown_17p5.png` | Warm facade edges and cool road shadows are readable. Identical-looking window bays and an almost empty, partly hidden street retain a staged appearance. |
| `shots/democity/rwholegame1/night_downtown_22.png` | Warm and cool windows visibly glow against dark facades. Broad rectangular panes lack interior variation, halos soften their edges and foreground foliage hides much street activity. |
| `shots/democity/rwholegame1/night_downtown_6p5.png` | Facade reveals, balconies, shelter and road markings are clear; similar blank window gradients repeat and foreground trees obstruct the street. |
| `shots/democity/rwholegame1/park_12.png` | Foreground trees clearly show large flat leaf clusters and thin exposed trunks. The plain dome, repeated stepped roofs and empty lawn overwhelm small park details. |
| `shots/democity/rwholegame1/park_17p5.png` | Warm light gives useful ground contrast. The same sparse planar foliage, primitive dome and repeated skyline crowns remain the principal visual weaknesses. |
| `shots/democity/rwholegame1/park_22.png` | The path and surrounding streets remain readable. Regular pools, pale dome and very dark trees provide little sense of a populated evening park. |
| `shots/democity/rwholegame1/park_6p5.png` | Long shadows and several tree colours are present. The central dome resembles a simple grey cap, and widely spaced leaf clusters sit above broad undeveloped grass. |
| `shots/democity/rwholegame1/riverfront_12.png` | Water and architecture are readable, with rooftop tanks and facade detail. The shore is largely undeveloped grass and the opposite roads climb like ramps. |
| `shots/democity/rwholegame1/riverfront_17p5.png` | Warm reflections retain scene detail. A ruler-straight horizon band, stretched mountain texture and steep opposite-bank road transitions spoil the natural setting. |
| `shots/democity/rwholegame1/riverfront_22.png` | Near windows vary warm and cool and the river darkens. The far bank stays sparse, while a bright horizontal horizon strip separates water and sky. |
| `shots/democity/rwholegame1/riverfront_6p5.png` | River reflections, balcony fronts and opposite-bank warehouses read clearly; roads rise steeply from the bank and foreground trees have sparse planar leaves. |
| `shots/democity/rwholegame1/suburb_12.png` | Bus glazing, road paint and school courtyard are visible. Broad lawns and thin card-like tree crowns weaken the gardens; landmark surfaces are almost blank. |
| `shots/democity/rwholegame1/suburb_17p5.png` | Warm roofs and long shadows give depth. House shells repeat and the plain water tower, hospital and isolated parcels still read as an asset layout. |
| `shots/democity/rwholegame1/suburb_22.png` | House windows and the school glow, with a bus on the right. Repeated bright oval pools and pale unlit landmark masses weaken night cohesion. |
| `shots/democity/rwholegame1/suburb_6p5.png` | Detached houses, varied roof colours, hedges and a real bus communicate a suburb; the huge plain water tower and hospital contrast sharply with the detailed school. |

## Context read

`docs/critic/terrain_r1.json`, `docs/critic/environment_r2.json`, `docs/critic/roads_r1.json`, `docs/critic/simulation_r1.json`, `docs/critic/ui_r1.json`, `docs/critic/effects_r1.json`, `docs/critic/zoning_r4.json`, `docs/critic/buildings_r4.json`, `docs/critic/props_r4.json`, `docs/critic/traffic_r4.json`, `docs/critic/tools_r4.json`, `docs/critic/democity_r7v.json`, `docs/critic/services_r4.json`, `docs/critic/infoviews_r4.json`, `docs/critic/transit_r5.json`, `docs/critic/integration_transit_load_r7x.json`. Audio has no current scored verdict in STATUS. The historical module scores and closed issues are context, not present-day measurements of this image set.

All eight official reference images were freshly viewed at `/Users/martingrahn/.simbuild/ref/cs2_1.jpg` through `cs2_8.jpg`. CS2_2 supplied city massing/depth calibration, CS2_4 lot and foliage integration, CS2_1 road hierarchy, CS2_5 vehicle/human scale, CS2_6 landscape depth and CS2_8 close night lighting. CS2_3/7 overlay views supplied layout and UI/industrial context without treating their overlay colours as normal material targets.
