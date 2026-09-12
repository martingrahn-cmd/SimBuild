# Independent whole-game critic r2 — W5 post-r8f

**6.0/10 — FAIL.** The stadium, hospital, water tower, port cranes, distant service silhouettes and real retail bases are visibly better. Explicit rain/cloudy also work. These repairs do not yet change the dominant full-frame impression: sparse repetitive city blocks, planar foliage, shallow night lighting and abrupt site/landscape seams remain clearly synthetic. The 8.5 threshold is unchanged; the full composition remains below the 7.0 good-indie anchor. This is a visual judgment, not an average of module scores or a reward for engineering work.

**All 35 fresh PNGs and all eight CS2 reference images were individually inspected.** I independently checked every sidecar, PNG dimensions and every row and aggregate in `shots/democity/rwholegame2/summary-full.json`. No disagreement was found. This is an independent review of supplied captures, not an independent capture run. I read the prior independent r1 report, STATUS, HANDOFF, the role/reference/architecture requirements and the current r7z/r8a–r8f builder and critic reports. No local post-r8f whole-game verdict or new blind verdict was read.

## Current gates

| Gate | Result | Evidence / scope |
|---|---|---|
| Visual score >=8.5 | FAIL | 6.0/10: competent but obviously synthetic, below the good-indie 7 anchor as a complete frame. |
| Declared camera/time matrix and extras | PASS | All 32 required frames plus 720p, rain and cloudy extras inspected; industry/riverfront are the supplied industrial/waterfront aliases. |
| Zero console errors and all modules ready | PASS | 35/35 ok; zero errors, 16 ready modules in every record. |
| Draw calls <=1500 and triangles <=3M | PASS | 473 draws; 2,807,186 triangles across all 35. |
| 50 FPS | FAIL local observation | 44.5 minimum including rain; 46.2 in the regular matrix. M4 Metal, not a GTX1660 benchmark. |
| JS heap <=512MB | FAIL raw endpoint | 764.3 MB maximum and 20/35 above 512 MB. Retained post-GC heap was not measured this round. |
| Single-module update <=2ms | FAIL observed endpoints | Traffic 2.3 ms; props 2.1 ms at 1080p. Not per-frame peaks or sustained CPU measurements. |
| Explicit weather presentation | PASS observed | Rain streaks/grey haze and cloudy diffuse state are distinct; old override failure no longer applies. |
| 720p layout | PASS observed | Supplied downtown HUD fits and remains legible. |
| No stalls, total update <=6ms, GPU texture bytes, warm init | UNVERIFIED | No matching long-duration/frame trace or byte/init measurement. Endpoint frameMs, texture count and total capture elapsed are not substitutes. |

## Verified measurements

| Metric | Current value | Producing shot |
|---|---|---|
| drawCalls maximum | 473 | `shots/democity/rwholegame2/park_17p5.png` |
| triangles maximum | 2807186 | `shots/democity/rwholegame2/night_downtown_22.png` |
| heapMB maximum | 764.3 | `shots/democity/rwholegame2/industry_22.png` |
| textures maximum | 74 | `shots/democity/rwholegame2/downtown_22.png` |
| frameMs maximum | 20.3 | `shots/democity/rwholegame2/park_6p5.png` |
| elapsedMs maximum | 23844 | `shots/democity/rwholegame2/night_downtown_17p5.png` |
| FPS minimum | 44.5 | `shots/democity/rwholegame2/aerial_rain_12.png` |
| Regular 32-frame FPS minimum | 46.2 | `shots/democity/rwholegame2/interchange_17p5.png` |

The matrix contains eight declared presets at 06:30, noon, 17:30 and 22:00, including bridge. The three extras are downtown 720p, aerial rain and aerial cloudy. The full summary includes all 35 this round. All records report `ok=true`, zero errors and all 16 modules ready. Warnings include deferred initial road furniture and no valid reserved university site; these are disclosed warnings, not fabricated console-error failures.

The 473-draw and 2,807,186-triangle peaks pass 1500/3M. FPS ranges 44.5–60.0, with 16/35 samples below 50 (14/32 regular frames). These approximately 12-second local M4 windows do not establish a sustained GTX1660-class result. Raw endpoint heap exceeds 512 MB in 20/35 samples and peaks at 764.3 MB. Earlier 509.1 MB forced-GC retained memory is a different historical measurement; no leak or retained-memory regression is inferred. The new cloudy raw sample also happens to be 509.1 MB and must not be mistaken for that GC test.

The 1080p update endpoints reach traffic **2.3 ms** at `park_17p5`, and props **2.1 ms** at `aerial_cloudy_12` and `riverfront_6p5`. These exceed the single-module 2 ms ceiling at those observed instants. They are not every-frame maxima. Maximum recorded endpoint frameMs is 20.3, texture count 74 and total capture elapsed 23,844 ms; none substitutes for stalls, GPU texture bytes or warm-cache init. The longer window in this set prevents a causal timing/heap comparison with r1.

## Ranked current issues

1. **Sparse block fabric and repeated building forms still dominate the city** — owner: **democity**; supporting owners: zoning, buildings, roads, services.

Downtown retains a recognisable height gradient, but isolated towers occupy broad lawns; several central blocks contain one small building or almost no building. Repeated stepped crowns and similar parcel spacing make the skyline and suburb read as an asset layout. The new retail bases are visible in the close canyon, but do not create continuous frontage across the wide city. Compose compact, varied real frontage and purposeful open space through the existing lot and simulation owners. The current reports give 612 buildings/lots and 9,964 cells, below the module scale clauses; those counts were not freshly probed by this critic.

Evidence: `shots/democity/rwholegame2/downtown_12.png`; `shots/democity/rwholegame2/interchange_12.png`; `shots/democity/rwholegame2/aerial_cloudy_12.png`; `shots/democity/rwholegame2/park_12.png`.

2. **Foliage remains visibly planar and inconsistent across distances** — owner: **props**; supporting owners: terrain, democity.

Smaller leaf clusters are an improvement, but park foreground trees still show sparse flat lobes on exposed sticks, while hillside conifers become opaque cut-outs. The close canyon has much denser crowns, making the tier mismatch conspicuous within the same art direction. Colour and species variety are present and should be retained. Improve crown volume, shading continuity and believable distribution rather than merely adding silhouettes. These stills show spatial differences; temporal LOD popping or flicker was not tested.

Evidence: `shots/democity/rwholegame2/park_12.png`; `shots/democity/rwholegame2/park_6p5.png`; `shots/democity/rwholegame2/riverfront_12.png`; `shots/democity/rwholegame2/industry_12.png`; `shots/democity/rwholegame2/night_downtown_12.png`.

3. **Night windows and street lighting lack interior depth and cohesion** — owner: **cross-cutting**; supporting owners: buildings, props, services, effects, democity.

The new café/store strip is visible and improves ground-floor identity. Above it, large luminous rectangles have little occupied-interior variation; wide towers become subdued repetitive window grids. Regular roadside spots and broad service-yard ovals still look schematic. The hospital and arena remain comparatively pale, unoccupied-looking landmarks. Preserve the dark readable sky, warm/cool variation and real retail programme while improving interior depth and the relation between fixtures, facades and ground. No stale wide-view luminance threshold is asserted as a new measurement.

Evidence: `shots/democity/rwholegame2/night_downtown_22.png`; `shots/democity/rwholegame2/downtown_22.png`; `shots/democity/rwholegame2/suburb_22.png`; `shots/democity/rwholegame2/industry_22.png`; `shots/democity/rwholegame2/park_22.png`.

4. **Steep road grades and abrupt site boundaries break landscape plausibility** — owner: **cross-cutting**; supporting owners: terrain, roads, democity, buildings, services.

Opposite-bank roads rise like ramps beside warehouses, the highway runs abruptly up the mountain, and flat pads meet lawns and uneven banks with conspicuous edges. These seams make separately authored systems apparent. Plan shared grades, foundations, access and shore treatment. The present bridge views are coherent crossings; the repaired old bridge-clearance failure is not reopened. Exact road slopes and foundation gaps were not remeasured, so this is a visible composition/grounding issue, not a fabricated numeric collision failure.

Evidence: `shots/democity/rwholegame2/riverfront_12.png`; `shots/democity/rwholegame2/riverfront_6p5.png`; `shots/democity/rwholegame2/interchange_12.png`; `shots/democity/rwholegame2/industry_12.png`; `shots/democity/rwholegame2/bridge_12.png`.

5. **Landmark silhouettes improved, but their materials and surrounding sites remain schematic** — owner: **cross-cutting**; supporting owners: democity, services, buildings, props.

The arena is now an open stadium, the hospital has ribbon windows and a medical mark, the water tower has a braced frame, and cranes have structural depth. Distant plants retain recognisable industrial volumes rather than the former single boxes. Those specific repairs are acknowledged. Remaining broad blank surfaces, plain silos, an isolated empty port apron, cranes on separate pads and an arena surrounded by unused lawn still lack the construction detail and working context of the references. Improve each real site as a connected place; do not describe the repaired assets as unchanged primitives.

Evidence: `shots/democity/rwholegame2/park_12.png`; `shots/democity/rwholegame2/suburb_12.png`; `shots/democity/rwholegame2/bridge_12.png`; `shots/democity/rwholegame2/downtown_12.png`; `shots/democity/rwholegame2/interchange_12.png`.

6. **Terrain, horizon and weather effects still read as separate graphic layers** — owner: **cross-cutting**; supporting owners: terrain, environment, effects.

Riverfront 17:30 and 22:00 retain a ruler-straight bright horizon band. Daytime water reflects a broad blotchy cloud sheet, and industrial mountain surfaces are stretched and stippled. Explicit rainy and cloudy states now visibly work: the old weather-override defect is closed for this reviewed presentation. Rain exposes long, broad foreground streaks over a uniformly grey scene, which look graphic rather than naturally integrated. Improve reflection/horizon continuity, terrain material scale and precipitation depth without removing the now-working weather modes.

Evidence: `shots/democity/rwholegame2/riverfront_17p5.png`; `shots/democity/rwholegame2/riverfront_22.png`; `shots/democity/rwholegame2/industry_6p5.png`; `shots/democity/rwholegame2/aerial_rain_12.png`; `shots/democity/rwholegame2/aerial_cloudy_12.png`.

7. **The city presentation communicates limited human use** — owner: **cross-cutting**; supporting owners: democity, traffic, transit, simulation, buildings.

Cars, trucks, buses and small pedestrians are present in the series. Yet the featured shelter and near canyon are quiet, partly hidden by foliage, and the arena/port sites convey little activity. Improve actual destinations, public access and ordinary managed traffic/stop activity with the existing fleets. Speed=0 stills cannot establish flow, queue discharge, boarding, collision safety, long-term balance or enjoyable decisions; none is newly declared broken from an empty instant.

Evidence: `shots/democity/rwholegame2/night_downtown_12.png`; `shots/democity/rwholegame2/night_downtown_22.png`; `shots/democity/rwholegame2/suburb_12.png`; `shots/democity/rwholegame2/park_12.png`; `shots/democity/rwholegame2/bridge_12.png`.

8. **Geometry passes but local FPS and raw allocation/update margins remain below target** — owner: **cross-cutting**; supporting owners: core, props, traffic, environment, effects, buildings.

All 35 sidecars agree with the supplied full summary: 473 draws and 2,807,186 triangles pass the 1500/3M limits. Local minimum is 44.5 fps in active rain; the 32 regular frames alone bottom at 46.2 fps. Sixteen of 35 are below 50. Raw endpoint heap peaks at 764.3 MB, with 20/35 above 512 MB; this is not a retained leak measurement or a rerun of the earlier 509.1 MB forced-GC probe. Traffic reaches 2.3 ms and props 2.1 ms in individual 1080p update endpoints. Profile actual allocation and frame work while preserving current geometry, state, weather and visual repairs. A different measurement duration and host conditions prevent a causal performance comparison with r1.

Evidence: `shots/democity/rwholegame2/aerial_rain_12.png`; `shots/democity/rwholegame2/interchange_17p5.png`; `shots/democity/rwholegame2/industry_22.png`; `shots/democity/rwholegame2/park_17p5.png`; `shots/democity/rwholegame2/riverfront_6p5.png`.

## What changed and what stays open

The old monolithic service-proxy complaint no longer describes the repaired plant silhouettes. The arena is no longer a closed dome, the hospital is no longer blank on its featured elevations, the water tower has a clear braced frame, and the cranes are no longer thin two-post outlines. These improvements move asset articulation below city fabric, foliage, night depth and terrain integration in the current ranking. The new café frontage is visible in the ordinary building stock. Its saved/simulated identity and restore safety are supported by the r8b owner reports; I did not rerun those probes.

The old explicit-weather override is visibly resolved: the rain frame has clear streaks and grey atmosphere, while cloudy noon has diffuse light without those streaks. Weather artistry remains imperfect, but the prior false-weather failure is not carried forward.

Current owner reports still give 612 buildings/lots and 9,964 cells, below the democity 1,200/1,400/11,000 clauses. That is attributed context, not a new census. Reported repaired coverage, bridge clearance, deterministic restage, successful save continuity, atomic rollback and objective balance are retained as prior results. They do not prove human pacing, collision-free combined transit/traffic or subjective play. Stale HANDOFF/STATUS history and prior smoke maxima are not substituted for this fresh matrix.

The scale stays at **6.0 FAIL** because the visibly improved objects occupy a limited part of the composition and the major city-wide defects persist. This does not mean the accepted work was invisible; it means it has not yet moved the complete game into the next visual band.

## Inspection register

| Individually inspected PNG | Observation |
|---|---|
| `shots/democity/rwholegame2/aerial_cloudy_12.png` | Overcast, shadow-softened city is visibly different from rain and default daylight; sparse downtown parcels are especially clear. |
| `shots/democity/rwholegame2/aerial_rain_12.png` | Active rain is unmistakable with long foreground streaks, grey haze and rain HUD icon; road/city layout remains readable. |
| `shots/democity/rwholegame2/bridge_12.png` | Two coherent crossings and improved crane structure are visible; shore/site edges and empty yard remain abrupt. |
| `shots/democity/rwholegame2/bridge_17p5.png` | Warm port silhouettes and reflections are clear; sparse industrial context remains the main defect. |
| `shots/democity/rwholegame2/bridge_22.png` | Crossings stay readable; regular light dots, plain silos and pale apron leave the port schematic. |
| `shots/democity/rwholegame2/bridge_6p5.png` | Braced gantry cranes read better; isolated silos, grass, pads and apron do not form a convincing working port. |
| `shots/democity/rwholegame2/downtown_12.png` | Readable road hierarchy and facade detail; oversized empty central parcels and repetitive massing remain the main defect. |
| `shots/democity/rwholegame2/downtown_12_720p.png` | Full HUD and scene fit 1280×720 without visible overlap; city repetition and lawn gaps remain. |
| `shots/democity/rwholegame2/downtown_17p5.png` | Warm/cool separation survives; broad lawn gaps and repeated tower forms dominate more than the improved distant plants. |
| `shots/democity/rwholegame2/downtown_22.png` | Readable night city with varied lit windows; subdued grids and repeated roadside dots provide limited occupied depth. |
| `shots/democity/rwholegame2/downtown_6p5.png` | Warm facades and clear height gradient; repeated crowns and isolated towers in lawns remain conspicuous. Distant service silhouettes are recognisable. |
| `shots/democity/rwholegame2/industry_12.png` | Road markings and service detail are legible; blank yards, planar conifers and abrupt mountain road grading remain. |
| `shots/democity/rwholegame2/industry_17p5.png` | Warm tower lighting adds depth, but repeated sites and stretched terrain texture remain synthetic. |
| `shots/democity/rwholegame2/industry_22.png` | Plants remain visible; repeated bright equipment pools look schematic against a quiet industrial district. |
| `shots/democity/rwholegame2/industry_6p5.png` | Recognisable plant towers and steam; identical compact sites and severely stippled mountain surface dominate. |
| `shots/democity/rwholegame2/interchange_12.png` | Wide context makes the broad lawn parcels, coarse distant civic volumes and steep highway grading obvious. |
| `shots/democity/rwholegame2/interchange_17p5.png` | Warm light improves relief; broad empty park and repetitive lot/roof rhythm remain visible. |
| `shots/democity/rwholegame2/interchange_22.png` | Road-light pattern gives orientation; sparse occupancy, coarse service masses and repeated window grids persist. |
| `shots/democity/rwholegame2/interchange_6p5.png` | The highway and city hierarchy read despite deep shadow; sparse block occupation and repeated crowns remain. |
| `shots/democity/rwholegame2/night_downtown_12.png` | Clear storefront strip and cars at the junction; repeated blank window gradients and contrasting tree tiers remain. |
| `shots/democity/rwholegame2/night_downtown_17p5.png` | A truck and readable frontage are present; broad identical bays and partly hidden street limit life. |
| `shots/democity/rwholegame2/night_downtown_22.png` | New lit retail strip is visible; large warm/cool panes remain shallow and the shelter/street is quiet. |
| `shots/democity/rwholegame2/night_downtown_6p5.png` | Café awning, shop base and facade reveals improve street identity; foreground foliage partly blocks a quiet road. |
| `shots/democity/rwholegame2/park_12.png` | Roof ring and entrance piers are clear; foliage looks planar and the venue lacks a developed public site. |
| `shots/democity/rwholegame2/park_17p5.png` | Useful long shadows and varied tree colours; empty grass and repeated stepped background crowns remain. |
| `shots/democity/rwholegame2/park_22.png` | Path lamps and skyline are legible; the pale arena and near-black tree shapes convey little evening use. |
| `shots/democity/rwholegame2/park_6p5.png` | The open stadium replaces the former dome; sparse leaf lobes, exposed trunks and broad grass still dominate. |
| `shots/democity/rwholegame2/riverfront_12.png` | The river is readable; exposed flat foliage, undeveloped banks and steep road transitions remain conspicuous. |
| `shots/democity/rwholegame2/riverfront_17p5.png` | A straight bright horizon band and textured mountain separate into layers; warm water retains detail. |
| `shots/democity/rwholegame2/riverfront_22.png` | Near lit windows and dark river are readable; the bright horizontal horizon seam persists. |
| `shots/democity/rwholegame2/riverfront_6p5.png` | Facade reveals, reflections and warm light are clear; opposite-bank ramp-like roads and sparse leaves weaken realism. |
| `shots/democity/rwholegame2/suburb_12.png` | A bus, marked roads and detailed school are visible; the repaired civic pair remains isolated and planar tree tiers are apparent. |
| `shots/democity/rwholegame2/suburb_17p5.png` | Warm roofs and long shadows give depth; water-tower frame reads clearly, while garden/site integration remains thin. |
| `shots/democity/rwholegame2/suburb_22.png` | Windows and roads remain readable; broad yard ovals and pale civic surfaces weaken night cohesion. |
| `shots/democity/rwholegame2/suburb_6p5.png` | Hospital windows and the braced water tower are visible improvements; repeated detached houses still occupy sparse lawns. |

All reference files `/Users/martingrahn/.simbuild/ref/cs2_1.jpg` through `cs2_8.jpg` were freshly inspected. Reference 1 calibrates road construction/detail; 2 city massing and depth; 4 lot fit, gardens and foliage; 5 vehicles and human scale; 6 landscape/crown depth; 8 close night interiors and street life. References 3 and 7 provide overlay/layout/UI and industrial context; their overlay colours are not normal material targets.

## Evidence limits

- Independent review and recomputation of parent-provided fresh captures, not an independent capture run. No browser probes or production/source/status/handoff edits were performed.
- Every one of the 35 PNGs and all eight reference JPGs was individually inspected. PNG dimensions and every full-summary row/aggregate were checked against sidecars. This verifies internal evidence consistency, not an independent source-hash or runtime-state audit.
- One seed (1337), High quality, Chrome 152.0.7977.83, Apple M4 ANGLE Metal, port 5173. All URLs use headless=1 and speed=0. Traffic may advance on its documented independent real-time clock.
- 534–721 sampled/measured frames per capture correspond to approximately 12-second FPS windows. These are not sustained-play or GTX1660-equivalent measurements; r1 used different windows, so no causal FPS/heap change is inferred.
- Draw/triangle fields are sampled render peaks, including periodic reflection frames; lastTriangles was not substituted. Heap, frameMs and moduleMs are endpoint observations, not full-window maxima. Texture count is not GPU memory in bytes; total capture elapsed is not warm init.
- The earlier 509.1 MB forced-GC retained-heap result in STATUS is historical, uses a different memory state and remains distinct from the present raw maximum. The current cloudy raw sample happens also to be 509.1 MB; it is not that GC test.
- No new functional API, save/restore, rollback, seed-diversity, simulation economy, flow/queue/boarding, collision, temporal flicker or exact ground-contact test was run. Current owner reports are attributed context; previously repaired clauses are not reopened from historical data.
- Audio is disabled in headless and is ungraded. Human pacing, choice quality and subjective ordinary play remain unverified. No new blind A/B verdict was read or inferred.

Only `docs/critic/wholegame_r2_independent.md` and `.json` were written. No production, status, handoff or evidence files were changed.
