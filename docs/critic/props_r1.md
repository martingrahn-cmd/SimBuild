# props — critic verdict, round 1

**Score 5.0 / 10 — FAIL.**
The module in the tree is still the pre-spec build the spec header describes, unchanged: it adds four real
`THREE.PointLight`s (ARCHITECTURE §4 blocker), ships 5 of the 15 `api` members §2 requires, pushes three illegal
strings onto the frozen `world.props.kinds`, and blows the triangle budget by 2.7×. Visually it renders coherently
and the night lamp pools work, but the forest is a speckled mat at every distance ≥ 300 m (6.1 % speckle against a
0.05 % cap), foliage at 22:00 is still at 0.62 × its noon luminance, and the ground light pool has a hard
straight-edged rim (48 L step across one pixel).

Calibrated this round against all eight CS2 frames (`cs2_1`…`cs2_8`) plus `docs/reference/CS2-LOOK.md`.

---

## Coverage — what I could actually shoot

Item 21 asks for 34 shots. **7 valid captures exist.** Two reasons, and only one of them is the box:

1. **Six of the eight presets §8 requires do not exist.** `src/modules/props/showcase.js` declares
   `lamps_night, forest, crossing, bench, canopy`. `avenue`, `signal`, `lamp`, `park`, `treecloseup`, `busstop`
   are absent. `CityCamera.apply()` returns `false` for an unknown preset and `tools/screenshot.mjs` does not
   check the return value, so `--camera park` silently captures the default `aerial` framing. Every acceptance
   item pinned to one of those six cameras (1, 4c, 4d, 10 geometry, 11, 12's identification shots, 13e, 14, 17)
   is therefore ungradeable **because of the module**, not because of me.
2. **`api.cropRects` does not exist.** `window.__sim.cropRects()` returns `{}` (probe). Every pinned rect
   (`canopy_broad`, `canopy_conifer`, `crown`, `trunk`, `pool`, `lamp_head`, `hedge`) is missing, so items
   1a–1d, 5a, 6b–6f, 7, 9a and 11a/11b have no defined region. Per §4 this is a **builder defect**; I measured
   what I could with report-named crops and listed every rect below.
3. Nine further captures timed out (`page.waitForFunction`/`page.screenshot` at 240 s) with 8 concurrent
   SwiftShader renders on the box. That part is environmental; it does not change any verdict below, because
   every failing item fails on probe or source evidence as well.

---

## Per-shot notes

| shot | what I saw |
|---|---|
| `shots/props/r1/aerial_12.png` | Grid town on empty grass blocks. **No tree-lined avenue** (§8.2), no park block (§8.3). Woodland is a dark mottled mat with red/brown pixel speckle; individual crowns are not resolvable. **Not one tree or lamp shadow in the whole frame.** |
| `shots/props/r1/aerial_22.png` | Warm pools down the avenue read correctly and the town is legible. Woodland only drops to 0.62 × its noon luminance — it stays a lit green mat, not a dark mass. |
| `shots/props/r1/aerial_6p5.png` | Golden hour with **no long shadows at all**: props cast nothing at this range (LOD1 `castShadow=false`). Frame std 18.5, flat light. Compare `cs2_4`, where every lamp and fir rakes a shadow across the carriageway. |
| `shots/props/r1/crossing_12.png` | Best frame in the set. Signal masts, bus shelter, bench, bin, hydrant, sign, picket fence all present and readable. Trees are spindly two-fork poles with a handful of flat leaf fans; several lean well past 6°. Dappled shadows under the near broadleaves are genuinely good. Detached leaf cards float in mid-air over the carriageway (crop 380,480,520,400). |
| `shots/props/r1/street_22.png` | Lamp pools, lit lenses and glowing luminaire heads all work. The near crown is **as bright as the grass** (crown mean L 60.6, grass 62.4) and warm-cast, not moonlit. Pool has a hard diagonal rim. |
| `shots/props/r1/skyline_12.png` | Tree line holds as massing, but 4.4 % of woodland pixels are speckle; conifer-vs-broadleaf massing is not distinguishable. |
| `shots/props/r1/skyline_17p5.png` | Warm, correctly exposed (whitePct 0.002 %), same speckle problem (2.26 % whole-frame). |
| crops (mine, full-res) | `crop_tree_crossing12.png` (380,480,520,400 ×2), `crop_tree_street22.png` (780,280,520,400 ×2), `crop_forest_aerial12.png` (1300,60,400,300 ×3), `crop_pool_street22.png` (950,560,400,220 ×2) |
| failed captures | `street_12`, `street_6p5` (screenshot timeout), `forest_12`, `canopy_12`, `closeup_12`, `skyline_22`, `bench_12` (ready-flag timeout under load) |

Probe: `shots/props/r1/probe.mjs`. Helpers: `imgstats.mjs`, `crop.mjs`, `scanline.mjs`.

---

## Numbers

| metric | measured | limit | verdict |
|---|---|---|---|
| console errors | **0** across every valid shot and the probe | 0 | pass |
| module status | `ready` in every valid shot | `ready` | pass |
| scene draw calls (`?showcase=props`) | **160** (`aerial_12`, `aerial_6p5`) | ≤ 200 | pass |
| **props-attributable draws** (`group.visible` diff) | 160 − 38 = **122** | ≤ 120 | **fail** |
| **props-attributable triangles** (same diff) | 2 175 798 − 257 031 = **1 918 767** | ≤ 700 000 | **fail (2.7×)** |
| **whole-frame triangles** | **2 175 798** (`aerial_12`); 2 101 985 (`street_22`); 1 956 595 (`crossing_12`) | ≤ 1 800 000 | **fail** |
| declared `budget` (`index.js:144`) | `{drawCalls: 400, triangles: 1_900_000}` | `{400, 900_000}` | **fail** |
| build time `api.stats().ms` | 915 ms | ≤ 3000 ms | pass |
| `update()` in-probe, 30 samples | median 0.0 ms, max 4.3 ms | ≤ 0.6 / ≤ 2.0 ms | median pass, max fail |
| lights inside `props.group` | **4 × `THREE.PointLight`** | 0 | **blocker** |
| `world.props.items` | 18 938 | ≥ 1 500 | pass |

Image statistics (whole frame at 480 px per §4; crops at full resolution):

| shot | mean | std | p1 | p50 | p99 | sat | blackPct | whitePct |
|---|---|---|---|---|---|---|---|---|
| `aerial_12` | 87.6 | 24.9 | 37 | 89 | 134 | 0.290 | 0.00 | 0.000 |
| `aerial_6p5` | 95.4 | 18.5 | 53 | 96 | 138 | 0.277 | 0.00 | 0.000 |
| `aerial_22` | 50.5 | 13.6 | 28 | 50 | 87 | 0.324 | 0.00 | 0.000 |
| `crossing_12` | 105.9 | 35.0 | 33 | 107 | 171 | 0.253 | 0.01 | 0.000 |
| `street_22` | 67.5 | 24.1 | 27 | 63 | 116 | 0.287 | 0.00 | 0.000 |
| `skyline_12` | 112.4 | 45.6 | 34 | 113 | 182 | 0.212 | 0.00 | 0.000 |
| `skyline_17p5` | 162.1 | 54.0 | 45 | 156 | 247 | 0.172 | 0.00 | 0.002 |

Nothing is crushed or blown — exposure is the one thing this build gets right everywhere.

**Speckle**, |px − 3×3 median| ≥ 35 L, full-res, cap 0.05 %:

| region | pct |
|---|---|
| `aerial_12` woodland crop [1300,60,400,300] | **6.103 %** (122×) |
| `skyline_12` woodland crop [600,430,400,200] | **4.400 %** (88×) |
| `aerial_12` whole frame | 3.361 % |
| `skyline_12` whole frame | 2.474 % |
| `skyline_17p5` whole frame | 2.264 % |
| `aerial_22` whole frame | 0.481 % |

**Night foliage**, same rect, same camera, `aerial` [1300,60,400,300]: p50 **89 → 55 = 0.62 ×** (cap 0.35 ×);
mean(B) − mean(R) = +3.4 (cap ≥ +4). At `street_22`, crown rect [830,300,180,180]: mean L 60.6,
mean(B) − mean(R) = **−6.7**; grass [1180,760,200,120]: mean L 62.4, B − R = **−15.1**.

**Lamp pool**, `street_22`: pool [1110,640,50,30] mean L 166.8; road 12 m off-lamp [1400,690,60,30] mean L 74.9 →
ratio **2.23** (pass). Warmth R − B = **+17.5** (pass). Edge, 1-px scanline y = 660, x 1150→1190:
`180, 180, 155.9, 155.7, 107.5, 83.4` — **max adjacent step 48.2 L**, 96.6 L across 4 px, cap 6 L.

---

## API contract, item by item

`api` as shipped: `{rebuild, stats, lamps, signalState, count, serialize, deserialize}`.

| §2 member | result |
|---|---|
| `place(kind,x,z,opts)` | **missing** |
| `remove(id)` | **missing** |
| `at(x,z,radius)` | **missing** |
| `count(kind?)` | present but **ignores its argument** — returns `items.size` for every kind |
| `rebuild()` | present, works, idempotent |
| `stats()` | present but wrong shape: `{trees, props, forest, lamps, signals, ms, draws, tris}`; none of `items, byKind, instances, chunks, species, radii` |
| `lampsFor(edgeId)` | **missing** (an unrelated `lamps()` exists) |
| `signals()` | **missing** |
| `signalFor(edgeId, atA)` | **missing** |
| `stops()` | **missing** — `transit` has nothing to read |
| `setDensity(v)` | **missing** |
| `cropRects(...)` | **missing** — `__sim.cropRects()` returns `{}` |
| `serialize()/deserialize()` | present but `serialize()` returns `{version:1, seed}`, not the item list |
| `debug{setKindVisible,setLod,setSway,setPools,lodHistogram}` | **missing** — no layer can be isolated |
| forbidden extras | `lamps()`, `signalState(nodeId)` — the exact export §2 says to replace with `signals()`/`signalFor()` |

`world.props.kinds` is **15** strings, not the frozen 12: `index.js:191` pushes `tree_birch`, `hedge`, `flowers`.
`items` carries 6 916 of kind `tree_birch`, 401 `hedge`, 226 `flowers` and **no `species` field on any item**.
`props:changed {added, removed}` is emitted after a version bump ✓. `roads:changed` is listened to (0.12 s debounce,
spec says ≤ 0.05 s); `zones:changed`, `buildings:changed`, `terrain:changed` are **not**.

---

## Acceptance checklist

**Failed (22): 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20, 21, 22, 23.**
Items 7, 14 and 23 are failed because the module omits the thing that defines them — `cropRects` for 7's pinned
canopy rects, `debug.lodHistogram`/a cross-fade band for 14, `place`/`setDensity` for 23 — not because the
measurement was inconvenient.

**Not verified (2): 15** (needs an `aerial`/`park` props-off pair I could not capture under load; no
`cameraPosition` appears in any props shader, so the specific `terrain_r1` trap is at least avoided) and
**24** (both 720p captures are among item 21's missing shots).

No item passes cleanly. The closest to a pass are 6b/6c (pool brightness and warmth) and 4a's positional half
(98/98 lamp anchors matched within 0.05 m), both inside otherwise-failing items.

---

## Ranked issues

### 1. blocker — props adds four real `THREE.PointLight`s
`src/modules/props/render.js:266` — `new THREE.PointLight(0xffc987, 0, 34, 2)`, four of them parented into the
props group and steered to follow the nearest lamps. The probe confirms them live:
`lights: 4, lightKinds: ['PointLight','PointLight','PointLight','PointLight']` by traversing
`__sim.registry.get('props').group`. ARCHITECTURE §4 ("never add lights to the scene — only `environment` may"),
the props preamble ("props may not add a `THREE.Light` of any kind") and item 22 all forbid this, and no
`docs/core-requests/props.md` was filed. Delete them; night lamp light is (a) the emissive head, (b) the halo
billboard, (c) the ground pool decal — all three already exist and already work.
*Evidence: `shots/props/r1/probe.mjs` output, `src/modules/props/render.js:263-271`.*

### 2. blocker — the `api` is the pre-spec one: 10 of 15 members missing
`{rebuild, stats, lamps, signalState, count, serialize, deserialize}` against §2's fifteen. `place`, `remove`,
`at`, `lampsFor`, `signals`, `signalFor`, `stops`, `setDensity`, `cropRects` and `debug` do not exist; `count()`
ignores its kind argument; `stats()` returns none of the fields items 2, 3d, 20 and 23 read; `signalState` is the
export §2 explicitly says to replace. `transit` (`stops()`), `traffic` (the `signals()` handover) and the critic
(`debug.*`, `cropRects`) all have nothing to bind to. Everything in §2's block is wave-2 contract, not polish.
*Evidence: probe `apiKeys`/`missing`; `src/modules/props/index.js:246-268`.*

### 3. blocker — the frozen `kinds` array is mutated and three illegal kinds ship
`index.js:191` pushes `tree_birch`, `hedge`, `flowers` onto `world.props.kinds`, making it 15 strings. 6 916 items
carry `kind: 'tree_birch'` (must be `{kind:'tree_oak', species:'birch'}`), 401 `hedge` (must be
`{kind:'fence', variant:'hedge'}`) and 226 `flowers` (no legal kind). No item anywhere carries a `species` field,
so `api.stats().species` and item 2's whole species test have no data source.
*Evidence: probe `kinds`, `byKind`, `species: ['(none)']`.*

### 4. blocker — 1.92 M props triangles against a 700 k cap, and 2.18 M whole-frame against 1.8 M
`group.visible` diff at `aerial_12`: draws 160 → 38 (props = **122**, cap 120); triangles 2 175 798 → 257 031
(props = **1 918 767**, cap 700 000). Whole frame 2 175 798 > 1 800 000. The declared budget in `index.js:144` is
still `triangles: 1_900_000`, not §5's 900 000. Root cause is the geometry rule: `render.js:52-53` builds a
separate bark mesh and leaf mesh **per species per LOD** (15 tree meshes) — §5 forbids splitting trees by species
precisely because it multiplies the cascade count — and there is no 256 m chunking at all, only a 72 m
LOD/cull bucket (`render.js:8`) over global meshes, so nothing is chunk-culled out of the shadow passes.
`docs/core-requests/props.md` (which §5 requires for the 256 m deviation) does not exist.
*Evidence: probe `budgetOn`/`budgetOff`; `shots/props/r1/aerial_12.json`.*

### 5. blocker — the forest is speckle, not woodland, from 300 m out
Woodland crop of `aerial_12` [1300,60,400,300]: **6.103 %** of pixels differ from their 3×3 median by ≥ 35 L
against item 9c's 0.05 % cap — 122× over. `skyline_12` [600,430,400,200]: **4.400 %**. Look at
`crop_forest_aerial12.png` beside `cs2_1` and `cs2_7`: CS2 gives individual crowns with shadow gaps and clumping
at 300 m and distinguishable conifer silhouettes at 1 km; this gives a dark mat with red-brown dots and thin
impostor trunk sticks poking out of it. Fix the impostor atlas (dilate, mip it, `anisotropy = ctx.assets.anisotropy`),
raise foliage roughness ≥ 0.70, drop any normal map beyond 60 m, and stop the LOD1 leaf cards from aliasing at
sub-pixel scale.
*Evidence: `shots/props/r1/crop_forest_aerial12.png`, imgstats speckle table.*

### 6. blocker — 17 051 footprint overlaps, 43 props standing on asphalt, 31 off the ground
Probe over all 18 938 items using §4 item 3d's own radii table: **17 051** pairwise footprint-circle violations
(fence-fence and same-`bus_stop` pairs already exempted) — e.g. `bench`/`hydrant` 0.81 m apart where 1.15 m is
required at (77.4, 206.7); `bus_stop`/`fence` 1.06 m where 2.40 m is required at (190.7, 73.6). **43** props of
kinds forbidden on asphalt sit where `world.roads.isRoad(x,z) === 1`. **31** non-road props miss
`terrain.getHeight` by more than 0.05 m, worst 0.52 m. Zero props in water (pass). This is the "floating and sunk
props" hard-fail, and it is also what makes `crossing_12` read as scattered rather than designed.
*Evidence: probe `ground`, `overlaps`, `overlapEx`.*

### 7. major — night foliage is a dimmed noon, not moonlight
Same rect, same camera, `aerial` [1300,60,400,300]: woodland p50 **89 at 12:00 → 55 at 22:00 = 0.62 ×** against
item 5a's ≤ 0.35 ×. At street range it is worse: the `street_22` near crown [830,300,180,180] has mean L 60.6
while the grass beside it has 62.4 — foliage and lawn are the same brightness at night — and the crown's cast is
**warm**, mean(B) − mean(R) = **−6.7** where item 5c requires ≥ +4. This is `simulation_r1` issue 2 and
`terrain_r1` issue 4 repeating verbatim. Read `world.weather.night` and drive the foliage albedo/ambient term
down with it.
*Evidence: `crop_tree_street22.png`, imgstats crown/grass crops.*

### 8. major — the lamp pool has a hard straight rim and cuts across the kerb
1-px scanline across the pool boundary in `street_22` (y = 660, x 1150→1190):
`180, 180, 155.9, 155.7, 107.5, 83.4` — a single adjacent step of **48.2 L**, 96.6 L over 4 px, against item 6d's
6 L cap, and `crop_pool_street22.png` shows it as a straight diagonal edge slicing the sidewalk. Causes: the pool
is one flat `PlaneGeometry` quad scaled uniformly by 23.0 (`render.js` `setLamps`), so its world major axis is
23 m for an 8.4 m column (item 6a wants 10–16 m), it is clipped by the sidewalk mesh rather than projected onto
it, and its `renderOrder` is `RENDER_ORDER.MARKINGS + 4 = 25` instead of `RENDER_ORDER.TRANSPARENT` (100).
Brightness and warmth are right (2.23 ×, R − B = +17.5) — only the shape and the falloff are wrong.
*Evidence: `shots/props/r1/crop_pool_street22.png`, `scanline.mjs` output.*

### 9. major — three species, no `species` attribute, and `scale` is a height in metres
`trees.js:17` — `SPECIES = ['oak','pine','birch']`. §3's table needs five silhouette classes (conifer spire,
broad round crown, tall narrow, wide low spreading, small ornamental) across eight species strings. No item
carries `species`, so `api.stats().species` cannot be answered. `scale` is being used as an **absolute height**:
over the 200 trees nearest (40, 40) it runs min 5.00, max 18.08, mean 9.25, std 2.73 — item 2 requires
`scale ∈ [0.75, 1.35]` multiplying §3's base height. Heading is properly uniform (max bucket 13.5 % ≤ 15 %) and
no two neighbours share (species, scale, heading) — those halves pass.
*Evidence: probe `species`, `scale`, `heading`, `dupPairs`.*

### 10. major — trees stop casting shadows at ~92 m, so aerial and golden hour have no shadows at all
`render.js:53` sets `{ cast: false }` on the whole LOD1 tier. In `aerial_12`, `aerial_6p5` and `skyline_12` there
is not one tree or lamp shadow in frame; `aerial_6p5` at a low sun has frame std 18.5 and reads as flat light.
Item 8 requires `castShadow = true` on LOD0 **and** LOD1; item 17 requires long prop shadows at 06.5/17.5 and
item 18 requires lamp verticals *with shadows*. `cs2_4` is the reference: every lamp column throws a needle
across the carriageway and the big fir throws a readable dappled shadow. Near-camera dapple at `crossing_12` is
genuinely good — extend it, don't rebuild it.
*Evidence: `shots/props/r1/aerial_6p5.png`, `shots/props/r1/aerial_12.png`, `src/modules/props/render.js:53`.*

### 11. major — the signal clock is a `dt` accumulator that ignores `world.time` and never reads traffic
`index.js:107` — `S.lensT += dt`, and `main.js:121` computes `dt` from `performance.now()` without scaling by
`clock.speed`, so `?speed=0` does not freeze it and `__sim.setTime()` does not move it. The probe set the clock
to 12 → 18 → 12 and the lens colours never changed as a function of the hour. Item 10a needs the phase to be a
pure function of `world.time.day`/`hour`. Item 10b's handover cannot even be attempted: assigning
`registry.get('props').ctx.modules.traffic = {signalState: …}` changes nothing because nothing in
`src/modules/props/` ever reads `ctx.modules.traffic`. There is also no `signals()`/`signalFor()` to mirror it
into, and no `armStates`/`source` field anywhere.
*Evidence: probe `signals`, `det`; `src/modules/props/index.js:105-140`.*

### 12. major — wind sway is a `dt` accumulator, so no two captures at the same `?time=` match
`index.js:213` — `S.wind.uTime.value += dt`. Same root cause as issue 11 and the same consequence: items 14 and
16 are built on pixel diffs between two loads at the same `?time=`, and an accumulator makes every such diff
meaningless. Phase must derive from `world.time.day`/`hour`. (Item 16 also needs `debug.setSway` and a
`wind.speed = 0` byte-identical pair; neither is reachable today.)
*Evidence: `src/modules/props/index.js:207-215`.*

### 13. major — forest scatter is a jittered lattice, not Poisson-disc
`place.js:85,91-96` — a 6.1 m grid with ±0.46 × spacing jitter. §6 names this exactly ("Grid scatter … produces
visible rows from top-down even when it looks fine obliquely"), and item 13d requires a nearest-neighbour
histogram with no bin over 35 %. Item 13e's confirming shot (`canopy_12`, top-down) could not be captured, but
the generator settles it. There is also no 12–18 m street-tree rhythm: `place.js:217,242` offsets verge trees by
`asphaltHalf + sidewalk + 2.6 ± 0.8/1.6 m` with no along-edge spacing rule, and `aerial_12`/`aerial_6p5` show the
avenue with no double line of trees at all — §8.2's "tree-lined avenue" is not staged.
*Evidence: `shots/props/r1/aerial_12.png`, `src/modules/props/place.js:85-96,217-243`.*

### 14. major — six of §8's eight presets, and no park, so a third of the acceptance set is unshootable
`showcase.js` declares `lamps_night, forest, crossing, bench, canopy`. §8 requires
`forest, avenue, signal, lamp, park, treecloseup, busstop, canopy`. `CityCamera.apply()` returns false for an
unknown name and the screenshot tool captures the default `aerial` framing instead, silently. §8's staged scene is
also missing the ≥ 80 × 80 m park/plaza (item 3) and the empty lot boundary with hedge + fence + gate gap (item 5),
so items 11 and 12's park kit have nowhere to appear.
*Evidence: `src/modules/props/showcase.js:6-15`, `src/core/camera.js:37-40`.*

### 15. minor — hedges are 1.1 m card blobs and there is exactly one fence type
`furniture.js:267` — `hedge` is `cardBlob({cards: 20, radius: 0.62, height: 1.1})`: below item 11a's 1.2–1.8 m,
with no modelled undulating top and no interior darkening, i.e. `simulation_r1`'s "green static" again.
`furniture.js:188` builds one 2 m picket section; item 11c needs at least two built variants (`slat` picket and
`railing` with posts ≤ 2.5 m pitch) plus a bottom rail following the ground within 0.12 m.
*Evidence: `src/modules/props/furniture.js:187-188,267`.*

### 16. minor — lamp column geometry is out of spec and there is no ornamental lantern
`furniture.js:22,38-40`: column 8.0 m with the luminaire at 8.365 m (item 4c wants 8.5–9.5 m), base Ø 0.25 m
tapering to 0.17 m (wants ~0.16 → ~0.10 m), mast arm reach **2.62 m** (wants 1.2–2.0 m). No `variant:'lantern'`
ornamental type exists anywhere in the module (item 4d), and `cs2_4` has them lining every driveway. The
positional half of item 4 is right and should be preserved: all 98 anchors from `roads.lampPositions` over 40
sampled edges have a matching lamp within 0.05 m in x/y/z, and no lamp is within 8 m of an intersection.
*Evidence: probe `lampMatch`, `lampNearInt`; `src/modules/props/furniture.js:17-41`.*

### 17. minor — furniture has no albedo texture and trunks read as flat grey
Every opaque piece shares one `MeshStandardMaterial` with `vertexColors: true` and no `map` (`index.js:167-172`),
so bench slats, bins, hydrants, signal housings and lamp columns are flat colour fields broken only by a shared
scuff normal. At `crossing_12` the tree trunks are untextured grey cylinders. This is the "untextured flat
surfaces" hard-fail; item 1d wants `std ≥ 8` on bark, and `cs2_5` shows how much of CS2's read comes from
close-range material identity.
*Evidence: `shots/props/r1/crop_tree_crossing12.png`, `src/modules/props/index.js:167-172`.*

### 18. minor — detached leaf cards float over the carriageway
In `crossing_12`, crop [380,480,520,400], several elongated green leaf cards hang in mid-air above the asphalt
with no trunk or branch under them, near the signal mast. Either LOD1 canopy cards are being placed off their
instance origin or a culled trunk is leaving its canopy behind.
*Evidence: `shots/props/r1/crop_tree_crossing12.png`.*

---

## Strengths to preserve

- **Lamp anchoring is exactly right.** 98/98 `roads.lampPositions` anchors matched within 0.05 m across 40 edges,
  zero lamps inside 8 m of an intersection. Do not re-derive lamp `y`; keep taking the anchor's own value.
- **The night rig lights the ground.** Pool brightness 2.23 × the unlit road and R − B = +17.5 both clear item 6.
  Only the pool's shape, falloff and render order need work — the concept and the numbers are already there.
- **Near-camera dappled shadows.** The broadleaf shadows at `crossing_12` show real branch structure, not an
  ellipse. That is item 8's hard half; extend it to LOD1 rather than rebuilding it.
- **Exposure discipline.** Nothing crushes or blows in any frame: blackPct ≤ 0.01 %, whitePct ≤ 0.002 %,
  p1 ≥ 27 everywhere. Whatever the foliage does at night, do not fix it by lifting exposure.
- **Zero console errors** in every capture and every probe, `ready` in every shot, and procedural-only textures
  with no manifest additions — the asset policy is clean.
- **The trunk skeleton is a real swept tube with branching** (`trees.js`), not a cylinder. Keep it and hang a
  better canopy on it.
