# Services build — round1

Implemented real17-kind services catalog, strict placement and owner charging, connected utility/civic coverage, live simulation supply/demand, persistence, procedural facility/park rendering and22-facility staging. Functional API fixtures work in mode=play; visual fidelity, transient rebuild budgets, some pinned measurements and integration consumer seams remain below acceptance. Round1 is ready for independent criticism, not an AAA or ordinary-gameplay completion claim.

Self-score: **5.8/10**. Recognizable silhouettes and real service simulation now exist, but bland repeated facades, terrain cliffs, plume artifacts and weak night response remain well below the8.5 CS2 bar.5.8 describes this unfinished first round rather than rewarding API completeness as visual polish.

## Verification

- API and catalog: exactly19 public functions;17 UI labels/costs/unlocks/categories match programmatic comparison, capacity objects and literal utility radius:null present; kinds and positions are deterministic across seeds.
- Coverage query checks: all20 valid keys plus unknown/prototype names finite0–1;14 Float32Array128² grids;20,000 calls per key max1.5ms, gridMs unchanged, allocation-free query source.
- Connectivity: real disconnected-road fixture power1/0; adding link changes second component0→1, deleting link1→0; clinic long-detour point remains0;80m off-road utility0. Empty-road fallback finite and warns once.
- Live service consequences: sole coal supplies600 against252 demand and covers100% staged buildings >=0.9; deleting it drops all to0 after flush, and110 simulation ticks drive economy and actual building power to0. Brownout240/252 matches every sampled staged building within2.84e-9.
- Placement and finance: all four physical failure reasons reproduced; invalid/poor placement returns null without mutation; successful small park charges3000 exactly once. Mode=play starts empty at150000, coal+clinic charge44000. Missing spend entry degrades to free placement in controlled fixture.
- Persistence and events: serialized IDs/kinds/positions/headings restored with no money charge; two same-frame removals emit one services:changed event carrying both IDs and increment version twice. Monotonic nextId survives ordinary rebuild and restore.
- Facility and decor presence:22 items cover all17 kinds;70 owned park trees/3 species,26 benches,13 bins,26 lamps,hedge fraction0.78. Seed7 keeps facility placements but changes tree hash2129119487→238951765.
- Pad numeric subset:12 perimeter samples on every item, four pads have >1.5m range; maximum difference from highest sample0.075948m, skirt at least0.35m below lowest. Visual terrain transitions remain missed.
- Render budget subset: standard16 max180 draws/1665503 scene tris, aerial max857615; own baseline17 draws/124274 tris/3 textures/128 plume quads. All34 required matrix images plus all and explicit populated integration captured and viewed; errors0 and services ready. Integrated full scene268 draws/1304999tris/67 textures.
- Noon emission and clipping subset: noon toggle meanAbs0; utilities12/17.5 pixels >245 luma0 and clipped-channel fraction0. night_civic22 p1.02916,p99.93971,clipped fraction0. Syntax and whitespace checks pass; no new lights, composer or renderer calls.
- Acceptance22 handoff: core request names props inLot/forest exclusion and invalidation; exact empty all limitation plus populated103 overlaps are explicitly disclosed.

## Remaining failures and limits

- Visual quality remains below CS2: repetitive window grids, blank industrial walls, coarse concrete noise, generic parked vehicles, flat hedge strips and static fountain water. Clinic parking vehicles intersect its front wall. See closeup_12, plant_close_12, park_12 and night_civic_22.

- Showcase grading creates abrupt terraced road corridors, black/aliased cliff patches and projecting corner geometry. All 22 pad perimeter height checks pass, but the visual batter/retaining requirement does not. See civic_6p5, utilities_12 and skyline_12.

- Plumes form a detached, abruptly clipped patch above the plant in all skyline captures, especially skyline_22. No soft-particle depth intersection fade exists (integrator explicitly deferred a safe depth API). Particle lifespan/top fade and >=40px wind apex movement have not been established; the wind flip changes much of the environment, so its whole-frame difference is not isolated plume evidence.

- Pinned measurement defects: grass_ref is missing from park_12.crops.json. Coal plume landmark ignores item heading, and its sky_ref crosses neighboring plume. The raw reported plume night/noon ratio is about0.390 and night plume/sky about1.094, outside the literal thresholds, but neither is a valid physical plume comparison because the landmarks are wrong. Required lawn separation and physical plume luminance are unverified.

- Night emissive toggle is real but too small: full-frame meanAbs0.00366779 (0.9353/255), below required8/255. Noon toggle exactly0 passes. Civic facade horizontal isolated-edge statistic0.006934 (0.6934%) exceeds0.2%, despite baked per-window attributes rather than a fragment hash. No validated sixfold lit-window/wall contrast pass.

- Coverage overlay has remaining terrain/court intersection patches. Full-frame 1m camera movement meanAbs0.01364/0.01371 (3.48/3.50 per255); not an isolated overlay-region metric and not a pass for <3/255. Component utility ratios intentionally remain flat rather than a fabricated source-distance gradient.

- Initial grid CPU14.2ms (seed1337) and18ms (seed7) exceed12ms. Rebuild throttle of at most once/0.25s is not implemented. Mutation geometry rebuild87.4ms and next-frame114ms exceed the2ms update budget; baseline full static rebuild129.2ms. Idle captures <=0.1ms do not excuse these transients.

- Fourteen coverage grids plus component map consume0.90625MiB; three auxiliary per-cell arrays add0.1875MiB, yielding1.09375MiB before graph records. Counting all coverage cache arrays exceeds the1MiB ceiling.

- Exact --showcase all stages the currently stubbed democity:0 facilities,0 footprint tree overlaps, so this is not a meaningful populated integration pass. Additional explicit all-module services showcase has22 facilities and103 props tree centers inside their oriented footprints (2,981 total trees). Forest/terrain-clutter exclusions remain the integrator-owned request; visible clutter also penetrates owned paths/pads.

- Civic/park load currently sums buildings covered by the union of all facilities of that kind, so individual duplicate parks can receive the same aggregate population rather than their own reachable load. Producer loads use the specified primary category. Preserve the approved capacity-versus-population distinction; the union-load issue is separate.

- Info-view desaturation affects opaque service geometry but not owned park foliage; full-frame >20/255 and exact manual/world-field equivalence were not proved. No pass is claimed for the entire desaturation criterion.

- Service ground/contact details remain incomplete: no validated25% paired contact-darkening measurement, hard pad material boundaries and repetitive atlas detail. wall_base includes the clinic-front parked-car overlap. Solar uses95 tilted rack segments arranged in19 long rows, not40 clearly separate long rows; panel count alone does not prove the40-row visual clause.

- Showcase has126 zoned lots and126 buildings, meeting120 buildings but missing the prescribed140–180 free-lot staging range. The API play fixture deliberately grades terrain and constructs roads through public owner APIs; it proves service behavior in mode=play, not ordinary-UI new-city playability. Tools/economy/inspector/managed-services adapters and the normal-play gate remain integrator work.

## Evidence

All72 own PNGs and8 references were actually viewed. Current evidence includes34 required matrix images,15 controlled-probe images, exact all and a populated all-module services stage. JSON report contains every absolute path and frozen source SHA256.

- [API probes](../../shots/services/r1/final-probe/api-probe.json)
- [Integrated/behavior seams](../../shots/services/r1/final-probe/seams.json)
- [Full-resolution image statistics](../../shots/services/r1/image-metrics.json)
- [Standard16-shot summary](../../shots/services/r1/summary.json)
