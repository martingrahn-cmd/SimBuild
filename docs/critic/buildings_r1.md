# CRITIC — buildings, round 1

**Score 6.0 / 10 — FAIL.**
One-line reason: the city reads as a city from 500 m, but at street level and at night it is the module spec's
own definition of a 6 — painted facades on flat prisms, one crown treatment, no lit ground floors, a night facade
only 2.6–3.3× darker than its windows (spec: ≥ 6×), and per-fragment `fract(sin(...))` window static — and five of
the twenty required `api` entries (`styleCounts`, `features`, `forceLod`, `lotSurface`, `cropRects`) do not exist,
so half the acceptance checklist cannot even be measured the way the spec defines it.

Calibrated this round on all eight `$REF/cs2_*.jpg` frames and `docs/reference/CS2-LOOK.md` before scoring.
No previous critic round for this module.

---

## Shots

**Host contention caveat, stated up front so the builder does not chase it.** Another agent's gauntlet was running
on this 4-CPU box for the whole session (load average 22–29, 9 concurrent `screenshot.mjs` processes). Four shots
the spec's §4 command list asks for — `suburb_12`, `suburb_6p5`, `closeup_12`, `block_22`, plus `crops_nightdt_22`,
`all_12`, `all_22` — died on `page.waitForFunction: Timeout 240000ms exceeded` *before* `__sim.ready`, i.e. the
page never finished booting under a saturated CPU. **That is a host problem, not a module fault, and nothing in
this report is graded against those missing frames.** Everything below is graded on the 17 frames that did land
plus three page-evaluate probes.

| Shot | What I actually saw |
|---|---|
| `shots/buildings/r1/aerial_12.png` | Plausible city mass, good colour spread, roof clutter reads at 520 m — but every block is a free-standing rectangular box with bare grass between; no perimeter blocks with courtyards (cf. `cs2_2`). |
| `shots/buildings/r1/aerial_22.png` | The best frame in the set: dark ground, windows carry the image. Distant mid-rise facades speckle (see item 3 numbers). |
| `shots/buildings/r1/skyline_12.png` | Skyline is a bar chart of rectangular prisms; crowns are all the same flat parapet + thin mast. |
| `shots/buildings/r1/skyline_17p5.png` | City washes to flat cream at distance; no warm sky-reflection gradient on glass, just a brighter painted texture. |
| `shots/buildings/r1/skyline_22.png` | Reads as a lit city at range; silhouette still uniform. |
| `shots/buildings/r1/street_12.png` | The damning one. Four glass towers meet **bare green grass** with no plinth, no forecourt, no entrance, no contact shadow. Facades perfectly flat; the "reflection" is a fixed painted gradient in the atlas that does not move with the sun. |
| `shots/buildings/r1/street_6p5.png` | Golden hour: the same glass towers go flat cream-white. Long sun picks out *nothing* — no reveal, no band, no balcony shadow. |
| `shots/buildings/r1/street_22.png` | Night at street level: no lit ground floor, no shopfront, no sign anywhere; grass at the tower base is bright green at 22:00. |
| `shots/buildings/r1/block_12.png` | Mid-rise + houses. The `officelow`/`apt` archetypes *do* carry real floor bands and a parapet cap — the one genuine relief win. The brick apartment beside it is dead flat with painted sills. Roof shingle shows large-scale blotch repetition. |
| `shots/buildings/r1/closeup_22.png` | Facade is flat at 110 m; lit "windows" are bay-sized cream blocks spanning whole floors; unlit facade sits at L≈73 instead of near-black. |
| `shots/buildings/r1/downtown_12.png` | 30 towers, 6 `styleId`s between them. Identical grey HVAC boxes on every roof. Two setbacks; no chamfer, no spire, no terrace, no barrel crown. |
| `shots/buildings/r1/downtown_12_720p.png` | 1280×720, renders clean, 0 errors, `ready`. No layout/overflow problem. |
| `shots/buildings/r1/night_downtown_22.png` | The judged shot. Windows on/off in multi-floor blocks, warm+cool mixed, but the facade between never goes dark; ground floor identical to the shaft; bare grass lit green between towers. |
| `shots/buildings/r1/industry_12.png` | Ribbed cladding, roller doors, dock canopies and one silo cluster are all present and correct — but every shed is the same 3-storey box, and a **black skirt wall** is visible along the downhill lot edges. |
| `shots/buildings/r1/catalog_12.png` | **Not a catalog.** The `catalog` preset is a 620 m top-down of the same downtown; the §8 40-cell grid at ≥ 50 m pitch does not exist. |
| `shots/buildings/r1/street_12.png` crop → `b12_base.png` | Terrain grass tufts render **through** the asphalt lot plate; wall meets ground with no darkening at all. |
| `shots/buildings/r1/skyline_12/17p5` city-box crops | 0.000 % of building-surface pixels above luma 245 — no specular sparkle. |

Probes: `shots/buildings/r1/apicheck.mjs` (my own, rewritten this round) at `?time=12&seed=1337`, plus a second
probe at `?time=22&seed=1337` and `?time=12&seed=7`.

---

## Numbers

| Metric | Measured | Budget | |
|---|---|---|---|
| Scene draw calls, max over all shots | **215** (`aerial_12`) | ≤ 400 | pass |
| Scene triangles, max | **2 052 752** (`closeup_22`) | ≤ 2 000 000 | **fail** |
| Scene triangles at `aerial` | **1 817 528** (`aerial_12`) | ≤ 1 400 000 | **fail** |
| Declared `budget` in `index.js:175` | `{ drawCalls: 320, triangles: 2_500_000 }` | must be `{400, 2_000_000}` | **fail** |
| `stats().visible` | 40 | ≤ 96 | pass |
| `stats().draws` | **field does not exist** | ≤ 285 | **not implemented** |
| `stats().setupMs` / `chunksBuiltThisFrame` / `lodSwitch` / `buildingsL3NonIndustrial` | **do not exist** | — | **not implemented** |
| `stats().buildMs` | **1381** — a running total, never reset per frame | ≤ 4 per frame | **contract violation** |
| `tris1 / tris0` | 242 564 / 405 204 = **0.599** | ≤ 0.35 | **fail** |
| `modules.buildings.initMs` | 103–109 ms | ≤ 1800 | pass |
| `moduleMs.buildings` | 0.0 ms | ≤ 2.0 | pass |
| Scene `textures` | 44 | ≤ 60 | pass |
| Atlas textures | map/normal/orm 2048², emissive 1024² (4) | ≤ 5, ≤ 2048² | pass |
| Console errors | **0** in all 17 shot `.json` and all 3 probes | 0 | pass |
| `modules.buildings.status` | `ready` in every shot | ready | pass |
| Staged buildings / chunks | 307 / 40 | ≥ 320 / ≥ 24 | **fail (307 < 320)** |
| `byClass` keys present | 40 / 40 | 40 | pass |
| Buildings > 60 m / tallest | 30 / 146.2 m | ≥ 12 / ≥ 140 | pass |
| `mixedUse === true` | **0** | ≥ 12 | **fail** |
| Lots with `corner === true` | **0** | ≥ 6 | **fail** |
| Seating: worst \|base − terrain\| over 307×8 perimeter samples | **0.05 m**; 0 sunk, 0 floating | ≤ 0.25 m | pass |
| Determinism: seed 1337 `tris0`, two runs | 405 204 / 405 204 | identical | pass |
| Determinism: seed 7 `byClass` | 29 of 40 keys differ (72 %) | ≥ 30 % | pass |
| `grep "Math.random" src/modules/buildings/` | empty | empty | pass |
| `grep "fract(sin(" src/modules/buildings/` | **`material.js:39`** | empty | **fail** |
| `lit === true` at `?time=22` (`world.weather.night === 1`) | **0 / 307 (0 %)** | ≥ 90 % | **fail** |
| `lit === true` at `?time=12` | 0 / 307 | 0 % | pass |
| `setLit(0)` vs `setLit(1)` frame diff at noon | meanAbs **0.000/255** | < 0.5/255 | pass |
| Pixels at 255 in any channel, every shot | **0.000 %** (max 0.012 % at `skyline_17p5`, all sky) | < 0.3 % | pass |
| `?time=22` frame p1 / p99 | 18.2 / 220.9 (`night_downtown_22`) | p1 > 0, p99 < 250 | pass |
| Building-surface pixels > luma 245 | 0.000 % (`skyline_12`, `skyline_17p5` city box 580–1100 × 360–660) | < 0.05 % | pass |
| `material.normalScale` | **1.0**, no distance fade | ≤ 0.6, ≤ 0.25 beyond 150 m | **fail** |
| `toneMapping` / `toneMappingExposure` / `scene.fog` / lights set by this module | none (grep clean) | none | pass |

**Night facade contrast (item 3, pixel half).** `cropRects` does not exist, so `--crops` can only ever write an
empty `rects: {}` — I measured on rects I chose myself on the full-resolution `night_downtown_22.png`, and I name
them so the builder can reproduce:

| 200×200 rect (x, y) | median of brightest 10 % | median of darkest 50 % | ratio | required |
|---|---|---|---|---|
| (1000, 150) near tower | 208.7 | 62.7 | **3.33** | ≥ 6 |
| (1450, 100) | 206.7 | 75.2 | **2.75** | ≥ 6 |
| (250, 50) | 206.3 | 78.2 | **2.64** | ≥ 6 |
| `closeup_22` (420, 60) | 210.9 | 72.6 | **2.90** | ≥ 6 |

**Window static (item 3, far-tower half).** Fraction of pixels differing from *both* horizontal neighbours by
> 40/255, on distant facades (ceiling 0.2 %): `aerial_22` (1180,760) **1.06 %**, (300,520) **2.34 %**,
(960,420) **3.27 %**; `skyline_22` (700,500) **1.84 %**. 5–16× the ceiling, and `material.js:39` contains the exact
`fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123)` construction hashed from the interpolated varying
`vWinCell` that cost `environment` a round.

**Contact darkening (item 9).** `block_12`, horizontal scan across the asphalt approaching the pale office wall:
row y=950, x=600→760 gives L = 93, 90, 91, 108, 94, 95, 94, 93, 92, 94, 93, 92, 94, 91, 93 … i.e. **flat 93 ± 2
right up to the wall face**. No darkening over the last metre, and no darkening of the bottom 1.5 m of the wall.
Evidence crop: `b12_base.png` (from `block_12.png` 560,820–900,1080).

**Item 1 / 9 / 10 sample set.** The five buildings nearest each camera target, by id, class and distance
(from `world.buildings.items`, so the builder can reproduce the selection exactly):

- `block` target (−120, 5, 300): **#77** residential/low/1 `house:res_brick` 18.9 m · **#109** residential/high/3
  `apt:apt_brick` 21.6 m · **#71** residential/low/2 `house:res_siding` 31.2 m · **#105** residential/high/4
  `apt:apt_panel` 34.2 m · **#75** residential/low/2 `house:res_brick` 35.4 m.
  (Note: the spec's preset table says `block` must frame *"a mixed-use corner … facade relief, shopfronts,
  kerb-to-building transition"*. There is not one commercial building in the nearest five. The preset does not
  frame what §8 says it frames.)
- `closeup` target (20, 6, 20): **#121** office/high/5 `tower:office_glass_blue` 11.7 m · **#124** office/high/4
  `tower:office_glass_sky` 17.6 m · **#123** office/high/4 `tower:office_glass_sky` 22.8 m · **#122** office/high/5
  `tower:office_glass_blue` 27.4 m · **#156** office/high/4 `tower:comm_upper` 64.5 m.
  Two pairs of identical `styleId` inside 30 m of each other.

**Downtown selection (item 2/10), radius 250 m of `presets.downtown.target`:** 100 buildings, 30 above 60 m,
19 distinct roof heights ≥ 4 m apart (pass), tallest/median = 146.2/26.1 = **5.6×** (pass). But the 30 tall
buildings carry only **6 distinct `styleId`** — `office_stone` ×6, `glass_blue` ×8, `comm_upper` ×2,
`glass_green` ×4, `glass_sky` ×6, `glass_dark` ×4 — so **24 of 30 share a style with a neighbour** where the spec
allows zero. My adjacency proxy (within 45 m, footprint width ±1 m, same `styleId`) finds **17 pairs**; the spec
requires 0.

---

## API contract, item by item

`ctx.modules.buildings` must expose exactly 20 entries. **Present (15):** `requestSpawn`, `setLevel`, `demolish`,
`at`, `get`, `count`, `flush`, `spawnFreeLots`, `material`, `atlasTextures`, `setNight`, `setLit`, `serialize`,
`deserialize`, `stats`. **Missing (5):** `styleCounts`, `features`, `forceLod`, `lotSurface`, `cropRects` — all
five return `undefined` from `typeof`.

`stats()` returns `{chunks, tris0, tris1, visible, buildMs, buildings, tiles}`. Missing 5 of the 12 fields the spec
defines: `buildingsL3NonIndustrial`, `draws`, `chunksBuiltThisFrame`, `lodSwitch`, `setupMs`. It takes no
`(x, z, r)` selection, so every criterion that says *"probe with `t = presets.<x>.target`, radius r"* — items 1, 2,
3, 4 — has no implementation to call.

`world.buildings` section (`spawn/demolish/levelUp/at`, `items`, `version`) — all present. Item field contract:
307/307 items carry every required field; `occupants ≥ 1` on all residential, `jobs ≥ 1` on all non-residential;
`styleId` non-empty. `mixedUse` is never set on any item.

Behavioural (item 19), from the probe:

- `spawn(lot)` → id 308, mesh appears after one `flush()` (`tris0` +1366), `version` +1, `buildings:changed`
  `{added:[308]}` — **pass**.
- `at(x,z)` inside the footprint → 308; well outside → `null` — **pass**.
- `levelUp(308)` → level 2→3, floors 1→2, height 9.19→12.59 m, `{updated:[308]}` — **pass**.
- `demolish(308)` → item removed, geometry freed (`tris0` back to baseline), `{removed:[308]}` — but
  `lot.buildingId` is **still 308**. `demolish` frees the lot only via `world.zones.lots.get(b.lotId)`
  (`index.js`), and the showcase's staged lots are never inserted into `world.zones.lots`
  (`showcase.js` builds a local `lots[]` array), so for every staged building the lot is never freed — **fail**.
- `serialize()` → `deserialize()`: count round-trips (307 → 307) but `tris0` does not (405 204 → 405 260), and
  `deserialize` resets `S.nextId = 1`, so ids are **not unique for the life of the session** as §2 requires —
  **fail**.

Item 21 (infoview tint): with `world.infoview.active = 'density'` and `buildingTint()` returning red, the frame
diff is **meanAbs 0.000/255**. The material has no infoview path at all — **fail**.

---

## Acceptance checklist

| # | Item | Verdict |
|---|---|---|
| 1 | Geometric facade relief | **FAIL** — `features().reliefDepths` and selection-scoped `stats()` do not exist; visually the `officelow`/`apt` archetypes carry real bands + parapet cap, the brick apartments and every glass tower are flat (`b12_base.png`, `street_6p5.png`). |
| 2 | Silhouette variety downtown | **FAIL** — `styleCounts().byCrown` does not exist and `generate.js` has no `chamfer`/`spire`/`terrace`/`barrel_vault` crown at all (only `setback`, `crown`, `mast`, `podium`). Heights pass (19 distinct, 5.6× ratio); adjacency does not (17 twin pairs). |
| 3 | Night windows per-window, baked, dark between | **FAIL** — `fract(sin(` at `material.js:39`; contrast 2.6–3.3× vs ≥ 6×; 1.06–3.27 % neighbour-static vs < 0.2 %; `features().litCells` does not exist. |
| 4 | Lit ground floor | **FAIL** — `features()` missing; `commercialOrMixed` in the 120 m night selection = 7 (all `commercial`, `mixedUse` = 0); no lit interior, no fascia or blade sign anywhere in `night_downtown_22` or `street_22`. |
| 5 | Zone × density × level visually distinct | **FAIL** — the `catalog` 40-cell grid does not exist (the preset is a top-down of downtown). All 40 `byClass` keys are present, but only 3 of 8 classes carry ≥ 3 distinct `styleId` across their five levels (`commercial/low` 1, `commercial/high` 1, `office/low` 2, `industrial/low` 2, `industrial/high` 2). Floors: `industrial/high` is 3 at every level and `industrial/low` is 2 at every level — 0 of 4 required steps. |
| 6 | Roofscape | **FAIL** — `features().roofClutter/clutterTwins/chimneyOrDormer` do not exist. Parapet caps and 2+ clutter pieces are emitted, but the same HVAC/tank/mast multiset repeats on adjacent roofs across `downtown_12` and `aerial_12`. Chimney/dormer share unverifiable (`suburb_12`/`suburb_6p5` could not be captured). |
| 7 | Lot surface and boundary | **FAIL** — `lotSurface(id)` does not exist, so `props` cannot avoid this module's geometry. Lawn/paving/driveway/path/hedge/fence *are* emitted (`generate.js emitGround`), but (a) the 8.9 m strip between lot edge and kerb is bare terrain grass at every tower (`street_12`), and (b) terrain tufts render **through** the asphalt plate (`b12_base.png`). |
| 8 | Seated in the ground | **PASS** — 307 buildings × 8 perimeter samples: worst \|base − terrain\| 0.05 m, 0 with terrain above the slab, 0 floating; skirt = perimeter drop + 0.35 m. |
| 9 | Contact darkening at the base | **FAIL** — asphalt L = 93 ± 2 from 12 m out to the wall; no wall-base darkening. 0/5 in `block_12`. |
| 10 | No facade tiling repetition | **FAIL** — 24 of the 30 towers > 60 m share a `styleId` with another; the closeup five contain two identical-style pairs inside 30 m; roof shingle shows macro blotch repetition in `block_12`. |
| 11 | Non-box massing | **FAIL** — `features().nonRect` does not exist; `generate.js` produces rectangular prisms plus optional setback/podium only — no L/U plan, no chamfer, no stepped top. `styleCounts().byKind` unavailable; 7 archetype kinds exist in code (`house/town/apt/officelow/tower/shop/ind`). |
| 12 | Corner lots | **FAIL** — `features().corner` missing; staged lots carry no `corner` flag; 0 corner treatments in `block_12`. |
| 13 | Balconies on residential | **FAIL (unmeasurable)** — `features().balconied` missing. Stacked balcony slabs with rails do exist on `apt` (`generate.js:587`), and read correctly in `block_12`; denominator `residential/high` level ≥ 3 = 22. Undersides are not visibly black. |
| 14 | Emissive off by day, never clips | **PASS** — `setLit` diff 0.000/255 at noon, 0.000 % clipped pixels at every time, night p1 = 18.2 / p99 = 220.9. |
| 15 | No specular sparkle / wet plastic | **FAIL** — pixel test passes (0.000 % > 245 on building surfaces), but `normalScale = 1.0` against a ≤ 0.6 ceiling with no fade beyond 150 m; and the glass "reflection" is a fixed painted gradient in the atlas, which is what makes `street_6p5` read as plastic. |
| 16 | LOD parity and no popping | **FAIL** — `forceLod` does not exist, so parity cannot be proved; `tris1/tris0 = 0.599` against a ≤ 0.35 ceiling. |
| 17 | Budget | **FAIL** — declared budget unchanged at `{320, 2_500_000}`; triangles 2 052 752 > 2 M and 1 817 528 > 1.4 M at aerial; `stats().draws`/`setupMs`/`chunksBuiltThisFrame` unimplemented; `buildMs` is a running total. |
| 18 | Zero console errors, `ready` everywhere | **PASS on what was captured** — 0 errors and `ready` in all 17 shots including 1280×720, and in all 3 probes. `--showcase all` at 12 and 22 could not be captured (host contention); no evidence of a problem there. |
| 19 | API contract and events | **FAIL** — 5 of 20 functions missing; `demolish` cannot free staged `lot.buildingId`; serialize round-trip changes `tris0` and resets ids. Spawn/level/at/version/events all correct. |
| 20 | Determinism | **PASS** — no `Math.random`; seed 1337 `tris0` identical across runs; seed 7 differs in 72 % of `byClass` counts. |
| 21 | Info view tint honoured | **FAIL** — frame diff 0.000/255 with a tint applied. |
| 22 | `lit` is live | **FAIL** — 0 of 307 items have `lit === true` at 22:00 with `world.weather.night === 1`. `lit` is set `false` at spawn and never written again. |
| 23 | Growth reads as growth | **FAIL** — `setLevel(id, 1..5)` on one lot gives heights 9.19, 9.19, 12.59, 12.59, 15.99 m and floors 1, 1, 2, 2, 3 — height does not strictly increase at every step. |

Also failing §8 staging: 307 buildings (< 320), `mixedUse` count 0 (< 12), corner lots 0 (< 6), no catalog grid.

---

## Ranked issues

**1 · blocker · `styleCounts`, `features`, `forceLod`, `lotSurface` and `cropRects` do not exist.**
`typeof api.styleCounts === 'undefined'` for all five, and `stats()` is missing `draws`,
`buildingsL3NonIndustrial`, `chunksBuiltThisFrame`, `lodSwitch` and `setupMs` and accepts no `(x, z, r)`
selection. This is not a reporting nicety: items 1, 2, 3, 4, 6, 11, 12, 13 and 16 are all *defined* as arithmetic
over these calls, so nine acceptance items have no implementation to grade against, and `--crops` can only ever
write `rects: {}`. Implement §2 exactly, including the selection arguments and the `buildMs`/`chunksBuiltThisFrame`
per-frame reset (`buildMs` currently reads 1381 because `chunks.js:85` accumulates and nothing clears it).
Evidence: `shots/buildings/r1/apicheck.mjs` output.

**2 · blocker · Night facade is pastel, not dark, and there is no lit ground floor.**
Median of the brightest 10 % over the darkest 50 % of a 200×200 facade patch is 2.64–3.33 across four rects
(spec ≥ 6): the unlit facade sits at L ≈ 63–78 where `cs2_8` puts it near black, and `material.js:52` adds a
constant `0.03 * uNight` interior term to *every* window cell that raises the whole facade. On top of that, no
building in the module has a distinct ground storey: `commercialOrMixed` in the 120 m night selection is 7, and
none of the 7 carries double-height glazing, a lit interior volume or an illuminated fascia/blade sign — compare
`cs2_8`, where the retail base is the brightest thing in the frame. Kill the uniform glow, drop the unlit spandrel
and mullion to near black, and build the `groundFloorDistinct` / `litInterior` / `shopfrontSign` programme with the
`mixedUse` flag §2 requires (currently 0 items).
Evidence: `shots/buildings/r1/night_downtown_22.png`, `street_22.png`, `closeup_22.png`.

**3 · blocker · Per-fragment window static: `fract(sin(dot(...)))` hashed from an interpolated varying.**
`material.js:39` is the exact construction that cost `environment` a round, and it is fed by `vWinCell`, which is
interpolated across the quad — so at range, adjacent pixels inside one window cell hash to different states.
Measured: 1.06 %, 2.34 %, 3.27 % (`aerial_22`) and 1.84 % (`skyline_22`) of pixels differ from *both* horizontal
neighbours by > 40/255, against a 0.2 % ceiling. Bake on/off, tint and brightness tier per window quad into a
vertex attribute from `ctx.rng`, and expose the result as `features().litCells` (total/lit/tiers/warm/cool) so the
0.18–0.55 lit fraction and the ≥ 3 tiers are checkable.
Evidence: `shots/buildings/r1/aerial_22.png`, `skyline_22.png`, `src/modules/buildings/material.js:39`.

**4 · blocker · `lit` is never updated: 0 of 307 buildings are lit at 22:00.**
`spawn()` writes `lit: false` and nothing in `update()` ever writes it again, although `world.weather.night` is 1
and the windows are visibly emitting. §2 says "kept current every frame"; item 22 wants ≥ 90 % at 22:00 and 0 % at
noon. One line in `update()`.
Evidence: probe at `?showcase=buildings&time=22`, `litTrue: 0`.

**5 · major · Downtown is one archetype in six colours: no crown variety, 24 of 30 towers share a style.**
Within 250 m of the `downtown` target, the 30 buildings above 60 m carry only 6 distinct `styleId`
(`glass_blue` ×8, `office_stone` ×6, `glass_sky` ×6, `glass_dark` ×4, `glass_green` ×4, `comm_upper` ×2), and 17
pairs sit within 45 m sharing both footprint width (±1 m) and style. `generate.js` emits no chamfer, spire,
terrace or barrel-vault crown at all — only `setback`, an optional flat `crown` box and a `mast`. Item 2 needs
≥ 6 crown keys including those four; item 10 needs zero shared styles above 60 m; item 11 needs L/U plans,
podium+set-back towers, chamfered corners and stepped tops at ≥ 40 % of `office/high` and `residential/high`.
Evidence: `shots/buildings/r1/downtown_12.png`, `skyline_12.png`, probe `downtown.tallStyleHistogram`.

**6 · major · Facades are painted, not built, on the archetypes that matter most.**
The `officelow`/`apt` families do carry a projecting floor band and a parapet cap with visible thickness — keep
that. But the glass towers (`tower:*`, which is what `closeup` and `street` frame) are single flat prisms whose
windows, mullions and "reflections" are all atlas paint: at 06.5 the low sun picks out nothing, and at noon there
is no head or jamb shadow anywhere on them; the brick `apt` variant is equally flat with painted sills. Item 1
wants `reliefDepths.reveal ≥ 0.10 m`, `band ≥ 0.04 m`, `cornice ≥ 0.15 m` measured off the generated geometry and
`tris0 / buildingsL3NonIndustrial ≥ 900` inside a 60 m selection — none of which is currently measurable.
Evidence: `street_6p5.png`, `street_12.png`, `b12_base.png` crop of `block_12.png`.

**7 · major · Buildings are pasted onto the ground: no contact darkening, and bare grass from lot edge to kerb.**
`block_12` row y=950: the asphalt reads L = 93 ± 2 continuously from 12 m out to the wall face — no AO, no
gradient over the last metre, and no darkening of the bottom 1.5 m of the wall (item 9 wants ≥ 25 %). Separately,
lots are inset 8.9 m from the block line, so every downtown tower stands on a green verge with no forecourt,
plinth or entrance (`street_12`), and terrain grass tufts render *through* the asphalt plate. Raise the plate or
publish the footprint via `lotSurface(id)`; do not touch terrain.
Evidence: `b12_base.png`, `street_12.png`, `street_22.png`.

**8 · major · Triangle budget blown and LOD1 is barely cheaper than LOD0.**
`closeup_22` renders 2 052 752 triangles (cap 2 M) and `aerial_12` renders 1 817 528 (cap 1.4 M at aerial), while
`tris1/tris0 = 0.599` against a ≤ 0.35 ceiling — LOD1 is not dropping enough, and `forceLod` does not exist to
prove parity. The declared `budget` at `index.js:175` is also still `{ drawCalls: 320, triangles: 2_500_000 }`
and must read `{ drawCalls: 400, triangles: 2_000_000 }` (item 17, one line).
Evidence: `shots/buildings/r1/closeup_22.json`, `aerial_12.json`, probe `stats()`.

**9 · major · The `catalog` preset does not stage a catalog, and `block` does not frame a mixed-use corner.**
`showcase.js:12` points `catalog` at (40, 0, 40) — the downtown core — and `stage()` never builds the 8 × 5 grid at
≥ 50 m pitch that §8 requires, so item 5's "one of each of the 40 classes, one per cell" cannot be read. `block`
at (−120, 5, 300) frames five residential buildings with no shopfront in sight, where the preset table says
"90 m street-level at a mixed-use corner". Staging also misses §8's floors: 307 buildings (< 320), 0 `mixedUse`
(< 12), 0 corner lots (< 6).
Evidence: `catalog_12.png`, `block_12.png`, `src/modules/buildings/showcase.js:6-13, 74-125`.

**10 · major · Growth does not read as growth, and industrial ignores level entirely.**
`setLevel(id, 1..5)` on one commercial lot gives heights 9.19 / 9.19 / 12.59 / 12.59 / 15.99 m — flat across two of
the four steps, where item 23 wants a strict increase at every step. `industrial/high` is 3 floors at every level
and `industrial/low` 2 floors at every level, and both classes carry only 2 `styleId` across all five levels, so
levels 1–5 are indistinguishable in the industrial park (`industry_12`).
Evidence: probe `growth`, probe `floorsByClassLevel`, `industry_12.png`.

**11 · minor · No infoview support.** `world.infoview.active` + `buildingTint()` produce a frame diff of
0.000/255. ARCHITECTURE §15 / item 21 want tint weight ≥ 0.7 with emissive suppressed.

**12 · minor · `serialize()`/`deserialize()` is not a round trip, and ids restart.**
`tris0` 405 204 → 405 260 after a round trip (the lot `w`/`d` fallback in `deserialize` differs from the staged
lot), and `S.nextId = 1` breaks §2's "unique for the life of the session". Also `demolish()` looks the lot up in
`world.zones.lots`, which never contains a staged lot, so `lot.buildingId` is never freed in the showcase.

**13 · minor · `normalScale = 1.0` with no distance fade, and a black skirt wall on sloped lots.**
Item 15 caps facade `normalScale` at 0.6 and 0.25 beyond 150 m. Separately, the base skirt is visible as an
unlit black wall along the downhill lot edges of the industrial sheds (`industry_12.png`, foreground right) —
give it the ground material and an AO gradient rather than leaving it a raw dark face.

**14 · minor · Suburb reads as one house repeated.** In `block_12` every house has the same ridge direction,
the same roof pitch and the same grey shingle; only the wall colour changes. `cs2_4` gets its life from ridge
direction, plan shape and roof colour changing house to house. (Graded on `block_12` only — `suburb_12` and
`suburb_6p5` could not be captured this round.)

---

## Strengths to preserve

- **Seating is exact.** 307 buildings × 8 perimeter samples: worst error 0.05 m, nothing sunk, nothing floating,
  skirt driven by the *minimum* perimeter sample. This is the failure mode that has cost other modules rounds, and
  it is simply solved here. Do not regress it.
- **Zero console errors, `ready` in every frame including 1280×720, and clean determinism** (seed 1337
  byte-identical `tris0`, seed 7 differing in 72 % of class counts, no `Math.random` anywhere).
- **Chunked merged geometry works**: 40 chunks, 40 draw calls for the whole city, one shared material, four
  atlas textures, `initMs` ≈ 105 ms, `moduleMs` 0.0. The architecture underneath is right; the content is what
  is thin.
- **The `officelow` / `apt` archetypes already have real relief** — projecting floor bands with a shadow line and
  a parapet cap with visible cap thickness (`b12_office.png`). That is the standard the towers and the brick
  variants need to be brought up to, not something to trade away.
- **Houses have real content**: pitched roofs with fascia and soffit, chimneys, dormers, solar panels, garages
  with doors, porches, driveways, paths, lawn plates and hedges. The suburb needs variety, not new features.
- **The industrial sheds are genuinely a different animal** — ribbed cladding, roller-door docks, dock canopies,
  silos — and `aerial_22` is a convincing night city at 520 m. Both are worth keeping while the rest is fixed.
