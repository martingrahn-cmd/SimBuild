# Module spec: `buildings`

Role file: `docs/prompts/BUILDER.md` (builders) / `docs/prompts/CRITIC.md` (critics). Everything invariant lives
there and is not repeated here.

`$REF` = the CS2 reference frames `cs2_1.jpg` … `cs2_8.jpg`, resolved in this order: `$SIMBUILD_REF` if set, else
`~/.simbuild/ref/`, else `/tmp/claude-0/-home-user-SimBuild/<session-uuid>/scratchpad/ref/` (the legacy
session-scoped path — it does **not** survive into a new session). The frames are not in the repo and must not be
(ARCHITECTURE §10: CS2 screenshots are never stored here; `docs/reference/` holds only `CS2-LOOK.md`). **If they
cannot be resolved, §3's prose descriptions and `docs/reference/CS2-LOOK.md` are the normative statement of each
anchor and the round proceeds against those** — a missing `$REF` is never a reason to stop, to ask, or to skip an
item.

---

## 1. Purpose

Without `buildings` the city is roads and coloured zoning cells: nothing has height, nothing is lit at night, and
there is no skyline — this module turns every zoning lot into a piece of architecture with a facade, a roof, a
lot, and windows that come on after dark.

---

## 2. World data owned

Owner of `world.buildings`. Copy these signatures exactly (ARCHITECTURE §3); mutate the section in place, never
replace it, bump `version` on every mutation, emit the event after the mutation is complete.

```js
buildings: {                       // owner: buildings
  items: Map<id, {id, lotId, type, density, level:1-5, footprint:{w,d}, floors, height, x, y, z, heading, styleId, occupants, jobs, lit:boolean}>,
  version: 0,
  spawn(lot) -> id, demolish(id), levelUp(id),
  at(x,z) -> building | null,
}
```

Field contract, enforced by probe:
- `id` integer ≥ 1, unique for the life of the session. `lotId` = `lot.id` or `null` when spawned without a lot.
- `type` ∈ `world.zones.types` = `['residential','commercial','industrial','office']`; `density` ∈ `['low','high']`.
- `level` integer 1–5, clamped. `floors` integer ≥ 1. `height` = metres from `y` to the highest structural point
  (parapet or ridge, excluding masts/aerials). `footprint.w`/`.d` metres, the *building* footprint, never the lot's.
- `x,z` = building centre in metres; `y` = the ground height the building's base plate sits at; `heading` radians,
  0 = the front facade faces north (−Z), matching `lot.heading`.
- `styleId` a stable non-empty string identifying the archetype+facade, e.g. `tower:office_glass_blue`.
- `occupants` (residential) / `jobs` (commercial, office, industrial) integers ≥ 1 derived from floor area.
- `lit` boolean, **kept current every frame**: `true` when the building's windows are emitting (night factor > 0.15).

Extra fields the module may add to an item (`plan`, `drop`, `lot`, `_chunk`) are private; nothing above may be
missing. One more extra field is public because probes read it: `mixedUse` (boolean, defined at the end of this
section).

Events emitted (ARCHITECTURE §5), coalesced to at most one per frame:

| Event | Payload |
|---|---|
| `buildings:changed` | `{added:[id], removed:[id], updated:[id]}` |

Events consumed: `zones:changed` (spawn on new free lots), `terrain:changed` (re-seat and rebuild affected chunks),
`sim:tick` (optional: level-up requests), `time:tick` (night factor — read `world.weather.night`, do not integrate time).

`api` (`ctx.modules.buildings`) must expose exactly the following. The first fourteen already exist in
`src/modules/buildings/index.js` and must keep their signatures:
`requestSpawn(lot)`, `setLevel(id,n)`, `demolish(id)`, `at(x,z)`, `get(id)`, `count()`, `flush()`,
`spawnFreeLots(limit)`, `material()`, `atlasTextures()`, `setNight(v)`, `setLit(v)`, `serialize()`, `deserialize(d)`.
`stats()` also already exists, but its return shape is extended below; `styleCounts()`, `features()`, `forceLod()`,
`lotSurface(id)` and `cropRects()` are new this round. The probes exist so the acceptance criteria are arithmetic,
not opinion — if a criterion below quotes a percentage, the number that settles it comes from here.

`stats`, `styleCounts` and `features` all take an **optional selection** `(x, z, r)`: with no arguments they cover
the whole showcase; with `(x, z, r)` every count is restricted to items whose centre `(item.x, item.z)` lies within
`r` metres of `(x, z)`. A probe therefore reads a preset's target from
`window.__sim.camera.presets['<preset>'].target` (every preset, built-in and declared, carries one) and passes
`target[0], target[2], r`. Selection is world-space; nothing in this spec is defined in screen space.

- `stats(x?, z?, r?) -> {buildings, buildingsL3NonIndustrial, chunks, visible, draws, tris0, tris1, tiles,
  buildMs, chunksBuiltThisFrame, lodSwitch, setupMs}`. Every field is defined here; none may be interpreted:
  - `buildings` — items in the selection. `buildingsL3NonIndustrial` — of those, `level ≥ 3 && type !== 'industrial'`.
  - `chunks` — chunks allocated. `visible` — chunk meshes rendered this frame, one draw call each.
  - `draws` — **this module's own draw calls this frame**: `visible` plus every other mesh the module adds
    (roof-clutter batch, sign batch, lot-surface plates, base skirts). This is the number §5 caps at 285; it is
    not the scene figure in the shot `.json`.
  - `tris0` / `tris1` — triangles of the selection's LOD0 / LOD1 geometry. With a selection given, sum over the
    selected buildings, not over the chunks they sit in, so the number is not diluted by their neighbours.
  - `tiles` — tiles allocated in the procedural facade atlas.
  - `lodSwitch` — the LOD0 → LOD1 switch distance in metres (a distance, not a count or a flag).
  - `buildMs` — ms spent inside chunk rebuild during the last `update()`. `chunksBuiltThisFrame` — chunks rebuilt
    in that same `update()`. Both are per-frame values, reset each frame, not running totals.
  - `setupMs` — wall-clock ms `showcase.setup()` took, written by `showcase.setup()` itself on completion; `0`
    outside `?showcase=buildings`. Unaffected by the selection arguments.
- `styleCounts(x?, z?, r?) -> {byClass:{'office/high/5':n,…}, byKind:{tower:n,…}, byCrown:{parapet_mech:n,setback:n,…}, byRoof:{gable:n,…}}`
  — `byClass` keys are `type/density/level`, exactly 40 of them, whole-showcase.
- `features(x?, z?, r?) -> { totalsByClass:{'office/high':n,…}, totalsByLevel:{1:n,…,5:n},
  commercialOrMixed:n, mixedUse:n, houses:{level2plus:n}, groundFloorDistinct:n, shopfrontSign:n, litInterior:n,
  roofClutter:{0:n,1:n,2:n,3:n,'4+':n}, clutterTwins:n, chimneyOrDormer:n,
  nonRect:{byLevel:{1:n,…,5:n}, byClass:{'office/high':n,…}}, corner:n,
  balconied:{level3plusResHigh:n, totalLevel3plusResHigh:n}, adjacentTwins:n,
  litCells:{total:n, lit:n, tiers:n, warm:n, cool:n}, reliefDepths:{reveal:m, band:m, cornice:m} }`
  — counts of selected items satisfying each predicate, always alongside the denominator the criteria divide by.
  The predicates are fixed here so builder and critic compute the same number:
  - `totalsByClass` — 8 `type/density` keys. `totalsByLevel` — all selected items by `level`.
  - `mixedUse` — items with `item.mixedUse === true`. `commercialOrMixed` — items with
    `type === 'commercial' || mixedUse === true`; this is item 4's denominator.
  - `houses.level2plus` — `type === 'residential' && density === 'low' && level ≥ 2`; item 6's denominator.
  - `groundFloorDistinct` — the ground storey is ≥ 4.5 m tall and, where the building has ≥ 2 storeys, every
    storey above it is 2.9–4.1 m. A single-storey building therefore satisfies it on the first clause alone; the
    second clause is not treated as vacuously false, and nothing is dropped from item 4's denominator.
  - `shopfrontSign` — carries an illuminated fascia or blade sign. `litInterior` — carries a lit ground-floor
    interior volume or card behind the glazing.
  - `roofClutter[k]` — **flat-roofed** buildings carrying exactly `k` pieces of roof clutter (`'4+'` = 4 or more);
    pitched-roof buildings are not counted in this histogram at all.
  - `clutterTwins` — unordered pairs of buildings whose footprint centres are within 45 m of each other and whose
    roof-clutter multisets are identical.
  - `chimneyOrDormer` — pitched-roof houses at `level ≥ 2` carrying a chimney or a dormer.
  - `nonRect` — the footprint is not a single rectangle in plan, or the section steps: L/U plan, podium + set-back
    tower, chamfered corner, stepped top. Counted twice, once by level and once by `type/density`.
  - `corner` — built on a lot with `lot.corner === true` **and** carrying a corner treatment (wrapped facade,
    chamfer or corner entrance).
  - `balconied.level3plusResHigh` — `residential/high`, `level ≥ 3`, with stacked balconies on ≥ 3 floors, slab
    ≥ 1.4 m deep, with a railing. `totalLevel3plusResHigh` — that class and level regardless of balconies.
  - `litCells` — `total` = window cells in the selection's LOD0 geometry, `lit` = cells whose baked on/off vertex
    attribute is on at the current night factor; `tiers` = distinct values of the baked brightness attribute among
    those lit cells; `warm` / `cool` = lit cells whose baked tint has `r > g > b` / `b ≥ r`. All five are read off
    the baked attributes, never estimated from pixels.
  - `reliefDepths` — over the selection, the **minimum** across its buildings of the built depth in metres of the
    window reveal (`reveal`), the floor/spandrel band offset (`band`) and the cornice or parapet cap projection
    (`cornice`), read from the generated geometry. `0` where the selection contains none.
  - `adjacentTwins` — unordered pairs of buildings whose footprint centres are within 45 m of each other **and**
    which share both footprint width (±1 m) and crown key. This is the only definition of "adjacent" in this spec.
- `forceLod(n|null)` — pin every chunk to LOD `n` (0 or 1) or return to distance selection; used to prove LOD parity.
- `lotSurface(id) -> {lotId, x, z, w, d, heading, footprint:{w,d}, paved:[{x,z,w,d,heading}]} | null` — the lot
  surface this module has claimed for building `id`: its built footprint plus every paved rectangle (drive, path,
  forecourt, bay row, apron). `props` reads it to plant street trees and verge planting that do not intersect this
  module's geometry (see item 7).
- `cropRects({project, width, height, camera}) -> {<name>: [x, y, w, h]}` — named pixel rects, the **only**
  mechanism that produces `<shot>.crops.json`: `node tools/screenshot.mjs … --crops` calls
  `window.__sim.cropRects()`, which collects `api.cropRects` from every ready module and keys each rect
  `buildings.<name>` (ARCHITECTURE §8; `project(x, y, z)` maps a world point to pixels). Exactly two landmarks are
  required, both derived from world positions so they follow the camera and are clamped to the frame:
  `nightFacade` — a 200×200 rect on the visible facade of the tallest building within 120 m of
  `presets.night_downtown.target`; `farTower` — a 128×128 rect on the facade of a building 250–400 m from the
  camera. Item 3's pixel statistics are taken inside these rects **on the full-resolution PNG, never on a
  downscaled copy**: at 480 px wide a 1 m patch is about two pixels.

**`mixed-use` is not a zone type.** `world.zones.types` stays `['residential','commercial','industrial','office']`
and `styleCounts().byClass` stays at exactly 40 keys. Mixed-use is a **facade programme**: a retail, lit ground-floor
base applied to a `residential/high` or `office/high` building whose lot fronts an avenue or abuts a commercial lot.
It is recorded on the item as `mixedUse === true` and counted in `features().mixedUse`. Nothing anywhere in this
spec treats it as a class, a type or a `byClass` key.

---

## 3. Visual/behavioural target

The bar is ARCHITECTURE §12: *procedural facades (window grids, floors, balconies, roofs with HVAC/water towers),
per-zone styles, growth levels, emissive windows with per-window random on/off at night warm/cool tint, interior
parallax look for hero close-ups, instanced with LOD.* What that means against the actual references:

**`$REF/cs2_8.jpg` — night downtown street (the hardest shot).** Towers are dark navy-grey masses; the light comes
from *inside*. Individual windows are on or off at random, with at least three brightness tiers (a bright ceiling
strip near the glass, a dim room behind, a curtained/blind pane that is a soft rectangle), warm amber and cool
white mixed on the same facade. The ground floor is a different animal from the shaft: double-height glazing, a
lit shopfront interior, an illuminated fascia sign and a couple of projecting blade signs. Between the lit panes
the spandrel and the mullions stay *dark* — the facade is not uniformly raised in brightness. Slab towers show
stacked balconies whose undersides are black. Nothing in that frame is a flat-shaded box.

**`$REF/cs2_4.jpg` — suburb at low sun.** Detached houses on their own lots: pitched shingle roofs with real ridge
and eave lines, chimneys, dormers, porch roofs on posts, a garage with a door facing a grey driveway, solar panels
on maybe one roof in five. Wall materials differ house to house — white clapboard, brick, warm stucco, stained
timber — with white trim around openings. Every lot is bounded: clipped hedge, timber fence or a low wall, plus
a mown front lawn, a path to the door and a back garden. *In this project buildings owns the boundary on the lots
it occupies as well as the lawn, the path, the drive and the garage; `props` bounds the empty lots (§7, item 7).*
Adjacent houses differ in plan, roof colour and ridge direction; no two neighbours read as the same asset.

**`$REF/cs2_2.jpg` — aerial/skyline.** The downtown is a *cluster of different heights*: a handful of thin towers
above a mass of mid-rise, with visible setbacks, a spire or two and mechanical penthouses breaking every roofline.
Mid-rise blocks are perimeter blocks with courtyards, not free-standing cubes. Colour reads warm-grey and desaturated
at distance with aerial haze; roofs are a mix of pale gravel, dark felt and metal, never one grey.

**`$REF/cs2_1.jpg` — near-top-down on a mid-rise slab.** From above you see the roof plane *and* the facade shading:
each floor band has a shadow line under it, window heads have reveals, and the roof carries plant, a lift overrun
and a parapet with a visible cap thickness.

**`$REF/cs2_7.jpg` — industrial.** Long shallow-pitch metal sheds with ribbed cladding, roof monitors, external
stairs, silos, stacks, loading docks with a concrete apron and truck bays; larger footprints, lower height,
completely different silhouette from commercial.

**Where this module currently is** (`shots/buildings/dev_closeup_12.png`, `dev_nightdt_22.png`, `dev_suburb_12.png`):
prismatic boxes with a painted facade, no geometric relief, one crown treatment, bare green lots, pastel night
windows of a single brightness on a mid-grey facade. That is a 6. The gap to close is *relief, silhouette variety
and lot dressing*, in that order.

---

## 4. Acceptance criteria

Ordered by how much each moves the score. Every item is checked in a named shot, in that shot's `.json`, or in a
page-evaluate probe against `window.__sim.registry.apis.buildings` at `?showcase=buildings&headless=1`.

`tools/gauntlet.mjs` iterates only `--cameras`, so its default matrix does not shoot this module's declared
presets. The round's shot set is exactly these commands — every shot name used below comes from one of them,
written to `shots/buildings/r<n>/<camera>_<time>.png`:

```sh
node tools/gauntlet.mjs --module buildings --round <n>                                                   # aerial/street/skyline/closeup × 6.5/12/17.5/22
node tools/gauntlet.mjs --module buildings --round <n> --cameras downtown,suburb,industry,block,catalog --times 12
node tools/gauntlet.mjs --module buildings --round <n> --cameras night_downtown,block --times 22
node tools/gauntlet.mjs --module buildings --round <n> --cameras suburb --times 6.5
node tools/gauntlet.mjs --module buildings --round <n>_720 --cameras block --times 12 --w 1280 --h 720   # separate round dir so it does not overwrite block_12
node tools/screenshot.mjs --showcase buildings --time 22 --camera night_downtown --crops --out shots/buildings/r<n>/crops_nightdt_22.png  # writes crops_nightdt_22.crops.json (item 3)
node tools/screenshot.mjs --showcase all --time 12 --camera aerial --out shots/buildings/r<n>/all_12.png
node tools/screenshot.mjs --showcase all --time 22 --camera street --out shots/buildings/r<n>/all_22.png
```

A criterion that names a shot not produced above is a bug in this spec, not a licence to invent one.

1. **Geometric facade relief, not painted windows.** Sample, named so it cannot drift: the **five buildings nearest
   the shot's camera target** in `block_12` and in `closeup_12`, listed in the report by id, class and distance.
   Pass = 5/5 in both shots, each showing real depth: a visible shadow along the head and one jamb of the window
   openings at 12:00, and a floor/spandrel band and a cornice or parapet cap that read as separate planes. The
   depths are probed, not eyeballed — a metre cannot be measured in a PNG: with
   `t = __sim.camera.presets.block.target` and `f = features(t[0], t[2], 60)`, `f.reliefDepths.reveal ≥ 0.10`,
   `f.reliefDepths.band ≥ 0.04`, `f.reliefDepths.cornice ≥ 0.15` (metres, minima read from the generated
   geometry, §2); and with `s = stats(t[0], t[2], 60)`, `s.tris0 / s.buildingsL3NonIndustrial ≥ 900`; repeat both
   with `presets.closeup.target`. (The selection radius is what makes it local — whole-showcase
   `tris0 / buildings` is diluted by the suburb and the sheds and proves nothing.)
2. **Silhouette variety downtown.** Probe with `t = __sim.camera.presets.downtown.target`, radius 250 m:
   `styleCounts(t[0], t[2], 250).byCrown` has ≥ 6 keys with count ≥ 1, including at minimum `parapet_mech`,
   `setback`, `chamfer`, `spire`, `terrace`, `barrel_vault_or_crown`; within that same selection ≥ 8 distinct roof
   heights separated by ≥ 4 m, and the tallest ≥ 2.5× the median height. Adjacency is probed, not eyeballed:
   `features(t[0], t[2], 250).adjacentTwins === 0` — no two buildings whose footprint centres are within 45 m of
   each other share both footprint width (±1 m) and crown key. Corroborated at `downtown_12` and `skyline_17p5`.
3. **Night windows are per-window, baked, and dark between.** Probe at `?time=22`:
   `features().litCells.lit / features().litCells.total` is between 0.18 and 0.55 — the baked attribute, not a
   pixel estimate. In item 4's selection (`t = presets.night_downtown.target`, radius 120 m): `litCells.tiers ≥ 3`
   (distinct baked brightness values among lit cells) and both `litCells.warm` and `litCells.cool` are
   ≥ 0.20 × `litCells.lit`, so warm and cool panes are mixed rather than one facade warm and the next cool.
   **The on/off state, tint and brightness must be baked per window quad into a vertex attribute from `ctx.rng`**
   — `grep -rn "fract(sin(" src/modules/buildings/` returns nothing. The two pixel checks are made on the
   **full-resolution PNG** of `crops_nightdt_22.png`, inside the rects `crops_nightdt_22.crops.json` names
   (§2 `cropRects`), never on a downscaled copy: in `buildings.nightFacade` (200×200) the median luminance of the
   brightest 10 % of pixels is ≥ 6× the median of the darkest 50 % — disjoint halves of the same histogram, and a
   darker median below 4/255 counts as 4/255 so a near-black facade cannot divide by zero; in `buildings.farTower`
   (128×128, a tower at 250–400 m) fewer than 0.2 % of pixels differ from both horizontal neighbours by > 40/255.
   Corroborated at `night_downtown_22` and `street_22`.
4. **Lit ground floor.** Probe with `t = __sim.camera.presets.night_downtown.target` and
   `f = features(t[0], t[2], 120)`, denominator `f.commercialOrMixed` (items with `type === 'commercial'` or
   `mixedUse === true` in that selection — report the raw counts, not just the ratios):
   `f.groundFloorDistinct / f.commercialOrMixed ≥ 0.80`, `f.litInterior / f.commercialOrMixed ≥ 0.80`, and
   `f.shopfrontSign / f.commercialOrMixed ≥ 0.80`. That is double-height glazing (ground storey ≥ 4.5 m against
   2.9–4.1 m above), a lit interior behind it, and an illuminated fascia or blade sign. Corroborated at
   `night_downtown_22` and `block_22`. `$REF/cs2_8.jpg`.
5. **Zone × density × level are visually distinct.** The `catalog` preset renders one of each of the 8
   type/density combinations at each of the 5 levels (40 buildings, one per cell of the §8 grid). Probed at
   `catalog_12`, all of it from data: `styleCounts().byClass` contains all 40 keys with count ≥ 1; from
   `world.buildings.items`, the five levels within each class carry ≥ 3 distinct `styleId` values (so a level step
   changes the archetype or the facade, not only the floor count); and **floors are non-decreasing with level** in
   every class, with high density gaining ≥ 1 floor at each of the four steps (level 5 therefore has ≥ 4 floors
   more than level 1) and low density gaining ≥ 1 floor at ≥ 2 of the four steps.
6. **Roofscape.** Every flat-roofed building carries a parapet with a cap of visible thickness plus ≥ 2 pieces of
   roof clutter drawn from {HVAC unit, water tank, lift/stair bulkhead, vent stack, roof monitor, solar array,
   aerial mast}; pitched roofs show ridge, hips/gables and eaves overhanging ≥ 0.45 m. Probes:
   `features().roofClutter[0] + features().roofClutter[1] === 0` (the histogram covers flat-roofed buildings only),
   `features().clutterTwins === 0` (no two buildings within 45 m carry an identical clutter multiset), and
   `features().chimneyOrDormer / features().houses.level2plus ≥ 0.40`. Corroborated for the flat roofs at
   `catalog_12` and `downtown_12`; the chimney/dormer share is corroborated at `suburb_12` and `suburb_6p5` and
   **not** at `catalog_12`, where 620 m top-down makes a dormer a few pixels wide.
7. **Lot surface and lot boundary, owned by this module.** buildings owns the lot **surface** and everything
   attached to the building: driveway to a garage or carport, path to the entrance, mown front lawn or paving
   plate distinct in tone from the terrain grass, rear garden surface, commercial/office paved forecourt or marked
   parking-bay row, industrial concrete apron with loading docks — and, on the lots it occupies, the boundary
   itself: clipped hedge, timber fence or low wall along the frontage (`generate.js` already emits `p.hedge` /
   `p.fence`). **The ownership line, so neither module has to guess:** buildings bounds the lots that have a
   building on them; `props` places `fence`/`hedge` only on lots with `lot.buildingId == null`
   (`docs/prompts/modules/props.md`, standing assumptions). Neither doubles the other, and no lot ends up unbounded.
   `props/place.js` `placeGardens()` still fences unconditionally today — that is props' own round-1 fix, not a
   buildings defect: do not compensate for it by dropping buildings' boundary, which would leave every occupied
   lot bare in `?showcase=buildings`. buildings also **publishes** what it has claimed: `lotSurface(id)` (§2)
   returns the built footprint plus every paved rectangle so `props` can place street trees and verge planting
   without intersecting it. Checks: at `suburb_12` and `block_12` no lot is bare terrain, every lot has the
   surface elements listed above for its type, and every occupied residential lot carries exactly one boundary run
   along its frontage; probe `lotSurface(id)` returns a non-null footprint and `paved` list for ≥ 95 % of staged
   buildings.
8. **The building is seated in the ground.** Probe over every staged building, 8 samples on the footprint
   perimeter: `|base − world.terrain.getHeight(x,z)| ≤ 0.25 m` for the highest sample, the base skirt extends
   ≥ 0.30 m below the *lowest* of the 8 samples, and 0 samples show terrain above the ground-floor slab. No visible
   gap or sinking at `block_12`, `suburb_6p5`, `industry_12`.
9. **Contact darkening at the base.** Sample: the **five buildings nearest the camera target** in `closeup_12` and
   in `block_12`, one 40 px-wide vertical luminance column per building, each column's pixel x and its two
   luminance medians listed in the report. Pass = 5/5 in both shots: the bottom 1.5 m of the wall is ≥ 25 % darker
   than the same wall at mid-height, and the lot surface darkens toward the wall over ≤ 1.0 m. Buildings must not
   look pasted onto the ground.
10. **No facade tiling repetition.** Graded at `closeup_12` and `block_12`, the only shots where a bay resolves,
    over the **same five buildings item 1 names** (nearest the camera target, listed by id): pass = 5/5, each
    showing at least one change of bay type, bay width or spandrel colour across the width of its visible facade —
    the atlas' 3-bay row broken by per-building bay-width variation and per-column variant selection — and the
    ground floor, one mid-band and the top floor each visibly different from the typical floor. The macro claim is
    data, not eye: in item 2's selection (`presets.downtown.target`, radius 250 m) no `styleId` is shared by two
    buildings taller than 60 m — read straight off `world.buildings.items`. Corroborated at `skyline_12`.
11. **Non-box massing.** Probe over the whole showcase with `f = features()`:
    `(f.nonRect.byLevel[4] + f.nonRect.byLevel[5]) / (f.totalsByLevel[4] + f.totalsByLevel[5]) ≥ 0.25`;
    `f.nonRect.byClass['office/high'] / f.totalsByClass['office/high'] ≥ 0.40` and the same for
    `residential/high`. Non-rectangular = L/U plan, podium + set-back tower, chamfered corner or stepped top
    (predicate in §2). Also `styleCounts().byKind` shows ≥ 7 distinct archetype kinds with count ≥ 1.
    Corroborated at `downtown_12` and `skyline_17p5`.
12. **Corner lots.** Probe: `features().corner ≥ 6` — at least six buildings spawned on lots with
    `lot.corner === true` and carrying a corner treatment, i.e. the facade (and, for commercial, the shopfront)
    wraps the corner with a chamfer or a corner entrance. Corroborated at `block_12`.
13. **Balconies on residential.** Probe with `f = features()`:
    `f.balconied.level3plusResHigh / f.balconied.totalLevel3plusResHigh ≥ 0.40` — stacked balconies on ≥ 3 floors,
    slab ≥ 1.4 m deep, with a railing (predicate in §2). Their undersides read black at 12:00 at `block_12` and
    `downtown_12`. `$REF/cs2_8.jpg`, right-hand slab.
14. **Emissive is off by day, and never clips.** Probe at `?time=12`: the material's `uNight` uniform is 0 and a
    pixel diff between `api.setLit(0)` and `api.setLit(1)` at `downtown_12` has meanAbs < 0.5/255. At every time,
    < 0.3 % of frame pixels are 255 in any channel; at 22:00 the frame's p1 luminance > 0 (no crushed black
    facades) and p99 < 250.
15. **No specular sparkle, no wet-plastic facades.** At `skyline_12` and `aerial_17p5`, pixels with luma > 245 on
    building surfaces are < 0.05 % of the frame. Roughness floors: glass ≥ 0.30, metal cladding ≥ 0.40, masonry /
    render / concrete ≥ 0.60, roofing felt/shingle ≥ 0.75; facade `normalScale` ≤ 0.6 and faded to ≤ 0.25 beyond
    150 m. Nothing in the module sets `toneMapping`, `toneMappingExposure`, `scene.fog` or adds a light.
16. **LOD parity and no popping.** With `api.forceLod(0)` vs `api.forceLod(1)` at the `skyline` preset, the pixel
    diff has meanAbs < 4/255 and no silhouette edge moves by more than 2 px: LOD1 keeps footprint, height,
    roofline, crown mass and facade colour, dropping only relief. `stats().tris1 ≤ 0.35 × stats().tris0`.
17. **Budget** (§5 below). From every gauntlet `.json`: `drawCalls ≤ 400`, `triangles ≤ 2_000_000` at every camera
    and ≤ 1_400_000 at `aerial`, `moduleMs.buildings ≤ 2.0`, `modules.buildings.initMs ≤ 1800`,
    `textures ≤ 60`. From the probe: `stats().visible ≤ 96`, `stats().draws ≤ 285`, `stats().setupMs ≤ 8000`,
    `stats().chunksBuiltThisFrame ≤ 2` and `stats().buildMs ≤ 4`. The declared `budget` in `index.js` **must be
    changed to** `{ drawCalls: 400, triangles: 2_000_000 }` — it currently reads
    `{ drawCalls: 320, triangles: 2_500_000 }` (`src/modules/buildings/index.js:175`), which fails this item on a
    one-line omission. **The declared budget and the measured scene figure are different
    quantities and both are graded**: the `.json` `drawCalls` is the whole scene in `?showcase=buildings`, which
    also carries terrain, roads, zoning overlay and environment; this module's own share is `stats().draws`.
18. **Zero console errors, `ready` everywhere.** `errors: []` in every shot including `--showcase all --time 12`,
    `--showcase all --time 22`, and one `--w 1280 --h 720` shot; `modules.buildings.status === 'ready'` in all of them.
19. **API contract and events.** Probe: `world.buildings.spawn(lot)` returns a new id and the mesh appears within
    one `flush()`; `levelUp(id)` raises `level` and `floors` and changes the mesh; `demolish(id)` removes the item,
    frees `lot.buildingId` and removes the geometry; `at(x,z)` returns the building for a point inside the
    footprint and `null` 1 m outside it; every mutation bumps `world.buildings.version` and emits
    `buildings:changed` with the right ids; `serialize()` → `deserialize()` round-trips to an identical
    `styleCounts()` and identical `stats().tris0`.
20. **Determinism.** `grep -rn "Math.random" src/modules/buildings/` is empty; `Date.now()`/`performance.now()`
    appear only in the `buildMs` profiling counter. Two runs at `--seed 1337` give byte-identical `styleCounts()`
    and `stats().tris0`; a run at `--seed 7` differs in ≥ 30 % of `byClass` counts.
21. **Info view tint honoured.** When `world.infoview.active` is non-null and `world.infoview.buildingTint(id)`
    returns a colour, the building renders tinted toward it (weight ≥ 0.7) with emissive suppressed; when
    `active` is `null` nothing changes. `infoviews` is a stub, so the probe sets these fields by hand and diffs
    the frame (meanAbs > 20/255 with a tint applied, 0 with it removed). ARCHITECTURE §15.
22. **`lit` is live.** Probe at `?time=22`: ≥ 90 % of items have `lit === true`; at `?time=12`: 0 % do.
23. **Growth reads as growth.** `setLevel(id, n)` for n = 1…5 on the same lot at the `block` preset produces five
    visibly different buildings on the same footprint origin, each re-seated on the terrain, with no orphaned
    geometry left behind (`stats().tris0` returns to within 1 % of its pre-test value after restoring the level).
    `height` strictly increases at every step; for high density by ≥ 2.5 m per step, so ≥ 10 m across the four
    steps; for low density by ≥ 3 m in total across levels 1→5 — roughly one storey, mirroring item 5's floor rule
    for low density.

---

## 5. Budget

Consistent with ARCHITECTURE §9 (buildings' allotment is 500 of the 1500 total draw calls); this module declares
400 so the demo city keeps headroom.

**Three different draw-call numbers, kept apart on purpose.** (a) The *declared* `budget.drawCalls = 400` in
`index.js` — what CRITIC.md's "within the declared budget" compares against; it currently reads 320 and must be
changed (item 17). (b) The *measured scene* figure in a `?showcase=buildings` shot `.json` — the whole scene,
which also carries terrain, roads, the zoning overlay and environment. (c) This module's *own* draws,
`stats().draws`. **285 is a cap, not a subtraction from (b):** ARCHITECTURE §9's per-module allotments are
demo-city figures, not measurements of this showcase — the neighbours' real cost is a shot's `.json` `drawCalls`
minus `stats().draws`, and today's dev shots put the *whole* scene, buildings included, at 158
(`dev_aerial_12.json`) and 128 (`dev2_closeup_12.json`). Measure it; do not plan a chunk budget against an
assumed neighbour share.

| Metric | Budget | Where measured |
|---|---|---|
| Declared `budget` in `index.js` | `{ drawCalls: 400, triangles: 2_000_000 }` (currently 320 / 2_500_000 — change it) | source |
| Scene draw calls, `?showcase=buildings` | ≤ 400 at every camera/time | shot `.json` `drawCalls` |
| **This module's own draw calls** | ≤ 285 | probe `stats().draws` |
| Chunk meshes rendered | ≤ 96 | probe `stats().visible` |
| Triangles, `?showcase=buildings` | ≤ 2_000_000; ≤ 1_400_000 at `aerial` | shot `.json` `triangles` |
| LOD1 / LOD0 triangle ratio | ≤ 0.35 | probe `stats().tris1 / tris0` |
| `update()` per frame | ≤ 2.0 ms; ≤ 0.5 ms with no dirty chunk | shot `.json` `moduleMs.buildings` |
| Chunk rebuild work per frame | ≤ 2 chunks and ≤ 4 ms | probe `stats().chunksBuiltThisFrame`, `stats().buildMs` |
| `init()` | ≤ 1800 ms (procedural atlas build) | `.json` `modules.buildings.initMs` |
| `showcase.setup()` incl. staging + flush | ≤ 8000 ms under SwiftShader | probe `stats().setupMs` (written by `setup()`; the `.json` `elapsedMs` is whole-page time to ready and is **not** this number) |
| GPU texture memory | ≤ 96 MB: at most 5 textures, none above 2048² (albedo + normal + ORM at 2048², emissive mask at 1024²) | probe `atlasTextures()` |
| Scene texture count | ≤ 60 | shot `.json` `textures` |

Chunking is 128 m (`constants.TILE_SIZE`), one merged geometry per chunk per LOD, one shared material, so a chunk
is one draw call and three frustum-culls it by bounding sphere. Nothing in this module allocates per frame.

---

## 6. Known failure modes

Symptoms as they appear on screen. Neighbouring modules' critics have already lost rounds to most of these.

- **Painted facades.** Windows are texture, not geometry: at closeup the facade is perfectly flat and the "reveal"
  reads as a dark stripe with no shadow that moves with the sun. Currently visible in `dev_closeup_12.png`.
- **One box, repeated.** Every tower is the same extruded rectangle with the same flat parapet and the same bay
  rhythm; the skyline is a bar chart. `dev_nightdt_22.png`.
- **Per-pixel window static.** `fract(sin(dot(cell,…)))` evaluated in the fragment shader from an *interpolated*
  varying produces random bright/dark pixels inside window cells at 100–400 m. This exact bug cost `environment`
  a round (`docs/critic/environment_r2.md`, issue 2) and the current `material.js` has the same construction.
  Bake per-window state into the vertex attribute instead.
- **Pastel night.** Lit windows are flat mid-brightness rectangles on a mid-grey facade: the frame reads as dusk,
  not night, and the windows never cross the effects bloom threshold (0.79 after exposure). Compare `$REF/cs2_8.jpg`,
  where the unlit facade is near-black and the windows are the only bright thing.
- **Uniform interior glow.** A constant "so it isn't pure black" term added to every window raises the whole facade
  and kills contrast; keep it ≤ 3 % of the lit tier and only inside window cells.
- **Emissive leaking into daylight.** Windows still faintly glowing at 12:00 makes noon frames look milky; gate all
  emissive on `world.weather.night`.
- **Washed-out noon.** Facade albedo above ~0.75 plus a bright PMREM ambient gives flat cream buildings with p1 ≥ 100
  and std ≤ 25 (this is exactly what failed `roads_r1` and `environment_r1`). Keep albedo ≤ 0.72 and let the
  environment's exposure do the work.
- **Specular sparkle.** Normal maps without a roughness floor produce white speckle on facades at grazing angles and
  mid distance (`roads_r1` issue 5).
- **Buildings floating or sunk.** A single terrain sample at the centre leaves the corners in the air on any slope;
  the base skirt must be driven by the *minimum* of the perimeter samples plus a margin.
- **Z-fighting.** Coplanar sills, balcony slabs, signs, cornices and lot plates at the same height as the wall or
  ground flicker at distance; offset every applied element ≥ 0.02 m and every ground plate 0.03–0.06 m above terrain,
  and never rely on `polygonOffset`.
- **Hard material seams.** A brick wall meeting a concrete plinth on the same plane with no reveal, band or shadow
  line reads as a texture swap. Put geometry at every material change.
- **Bare green lots.** The building sits on untouched terrain grass with no driveway, no path, no lawn plate, no
  forecourt — the single biggest "obviously synthetic" tell at street level after facade flatness.
- **Doubled lot boundaries.** Two coplanar boundary runs on one frontage z-fight and spend two modules' draw
  budget on one object. Invisible in `?showcase=buildings` (props is not initialised there), obvious in
  `--showcase all` and `democity`. The ownership line in item 7 is what prevents it — buildings bounds occupied
  lots, `props` bounds `lot.buildingId == null` lots — and `lotSurface(id)` (§2) is what keeps props' planting off
  this module's geometry.
- **LOD popping and unstitched silhouettes.** LOD1 dropping the crown or shrinking the parapet makes towers snap at
  300 m during a camera move.
- **Grass and ground clutter through the lot surface.** Terrain tufts render through paving unless the lot plate is
  drawn above them; if the lot surface flickers, publish the footprint or raise the plate, do not touch terrain.
- **UI/720p.** Not a UI module, but every acceptance shot must also render clean at `--w 1280 --h 720`.

---

## 7. Dependencies and their real APIs

`dependencies: ['terrain', 'roads', 'zoning']`. Only these are guaranteed initialised. Guard everything else with
optional chaining.

**`ctx.modules.<name>` IS that module's api object — there is no `.api` wrapper.** `src/core/registry.js:15` sets
`this.apis[def.name] = def.api || {}` and line 36 passes `modules: this.apis` into every ctx, so
`ctx.modules.environment.api` is `undefined` and `ctx.modules.environment?.api?.x` silently no-ops forever. This
module's own code already has it right: `index.js:187` `ctx.modules.environment?.setupMaterial?.(S.mat)`. Every
path below is written that way.

**Which neighbours are real, stated here because ownership depends on it (checked in the working tree, not in
`docs/STATUS.json`, which still lists `props` as "stub" at round 0 and is stale):** `props` is **BUILT** —
`src/modules/props/index.js` declares `dependencies: ['terrain','roads']` and a real `api`
(`rebuild/stats/lamps/signalState/count/serialize/deserialize`) — and it owns street furniture, trees, bushes and
planters, plus hedges and fences **on lots with no building on them** (`props.md`, standing assumptions).
buildings keeps the boundary on the lots it occupies (item 7) and publishes `lotSurface(id)` so `props` can plant
around what buildings has built. `traffic`, `services`, `infoviews` and `democity` **are** stubs this
wave (`dependencies: []`, empty `api`) — do not call them, and degrade where §4 relies on them (item 21).
`props` is not initialised in `?showcase=buildings` either, so any collision with it is invisible there and only
shows up in `--showcase all` and `democity`: assume it is present, do not test against its absence.

**`world.terrain`** (single source of height, always present — flat fallback if terrain failed):
`getHeight(x, z) -> m` · `getNormal(x, z, out?) -> Vector3` · `getSlope(x, z) -> rad` · `isWater(x, z) -> bool` ·
`raycast(ray) -> {point, normal}|null`. Never write heights; if a lot is too steep, refuse to spawn.
`ctx.modules.terrain`: `data()`, `stats()`, `material()`, `setGrassTufts(enabled)`, `setReflection(enabled)`.

**`world.roads`**: `types` (`street w16 lanes2`, `avenue w24 lanes4`, `highway w32 lanes6`, `alley w8`, `gravel w8`) ·
`nearestEdge(x,z,maxDist) -> {edge,t,point,dist}|null` · `sample(edgeId,t) -> {x,y,z,tangent,normal}` ·
`laneCenter(edgeId,laneIndex,t)` · `frontage(edgeId) -> [{side,from,to,x,z,heading}]` · `isRoad(x,z) -> 0..1`.
`ctx.modules.roads`: `rebuild()` · `lampPositions(edgeId)` · `intersections()` · `nodeInfo(id)` · `types()` ·
`edges()` · `stats()` · `edgeDebug(edgeId, step)`. Use `isRoad`/`nearestEdge` so driveways meet the kerb and lot
plates stop at the sidewalk.

**`world.zones`**: `lots: Map<id, lot>` · `lotsFor(edgeId)` · `freeLots()`. A real lot carries
`{id, edgeId, side, cells, x, y, z, w, d, heading, nx, nz, ax, az, type, density, corner, t, buildingId}`.
`ctx.modules.zoning`: `freeLots()` · `lotsFor(edgeId)` · `lotAt(x,z)` · `cellAt(x,z)` · `zonableAt(x,z)` ·
`refresh()` · `stats()` · `paint(x,z,radius,type,density)` · `erase(x,z,radius)`.
**Assumption:** zoning lots carry **no `level`**. Buildings derives it: `simulation.landValueAt(x,z)` and
`world.economy.demand[type]` when `simulation` is present, otherwise a deterministic function of density and
`ctx.rng`, clamped 1–5. State the chosen rule in the build report.

**`ctx.modules.environment`** (present in every showcase): `setupMaterial(material)` — **must** be called on the
building material so CSM shadows and fog uniforms are injected · `hookScene()` after staging · `getNight()` ·
`getSunDirection()` · `getMoonDirection()` · `getExposure()` · `getWeather()` · `setWeather(preset)`.
Read `world.weather.night` (0–1), `.wetness`, `.exposure`, `.sunDir`, `.sunIntensity`, `.skyLight` — never set them.
If `environment` is missing the material still compiles as a plain `MeshStandardMaterial`; degrade, do not throw.

**`ctx.modules.simulation`** (optional): `profile(hour, out)` · `activity(hour)` · `demand()` · `economy()` ·
`building(id)` · `landValueAt(x,z)` · `pollutionAt(x,z)` · `noiseAt(x,z)` · `milestone()`. Degrade to the built-in
hour curve for the lit fraction and to density-based levels when absent.

**Core** (`src/core/*.js`, exact): `ctx.rng` → `float() range(min,max) int(min,max) bool(p) pick(arr)
weighted([[v,w]…]) gauss() shuffle(arr) fork(label)`. `ctx.assets` → `pbr(name, {repeat})`, `texture(url, {srgb,
repeat, wrap, anisotropy, flipY})`, `hdri(name)`, `gltf(url)`, `procedural.noiseTexture(opts)`,
`procedural.gradient({size, stops, horizontal, srgb})`, `procedural.noiseNormal({size, seed, scale, strength})`,
`procedural.solid(hex, size)`, `assets.anisotropy`. `ctx.camera` → `camera`, `target`, `distance`, `presets`,
`registerPreset(name, preset)`, `apply(preset)`, `flyTo(preset, seconds)`, `screenToGround(ndcX, ndcY)`.
`ctx.clock` → `hour`, `day`, `set(hour)`, `sunElevation(hour?)`, `sunAzimuth(hour?)`, `isNight(hour?)`.
`constants` → `LAYERS.BUILDINGS = 3`, `RENDER_ORDER.BUILDINGS = 30`, `TILE_SIZE = 128`, `QUALITY[ctx.quality]`.
`world.infoview` → `{active, data, legend, buildingTint(id)}` (stub returns `null`; honour it anyway).

Asset policy (§10): the facade/roof atlas is **procedural** (canvas-drawn, seeded from `ctx.rng`), which is the
right choice at city scale; any photographic detail must be CC0 from Poly Haven or ambientCG, added to
`public/assets/manifest.json` and fetched with `tools/fetch-assets.mjs`. Albedo canvases `SRGBColorSpace`;
normal, ORM and emissive-mask textures linear.

---

## 8. Showcase

`?showcase=buildings` stages a continuous city with roads and lots the module creates itself (zoning's lot
generator is used where it works; the staged grid is the fallback and is what the presets frame). It must contain,
verifiable by `styleCounts()`:

- ≥ 320 buildings across ≥ 24 chunks, covering **all 8** type/density combinations at **all 5** levels.
- A downtown core (≥ 12 buildings above 60 m, tallest ≥ 140 m) with a podium/tower pair, a set-back tower, a
  chamfered corner tower and a spire.
- A mid-rise ring: perimeter blocks with courtyards, balconied residential slabs, and ≥ 12 buildings carrying the
  mixed-use programme (`item.mixedUse === true`, §2) with lit retail bases.
- A suburb of ≥ 60 detached houses on individual lots with driveways, garages, paths, lawns, rear garden surfaces
  and a frontage boundary (item 7).
- An industrial park: ≥ 8 sheds with loading docks, silos, stacks and a concrete apron.
- ≥ 6 corner lots, and ≥ 10 buildings on ground sloping more than 1.5 m across the footprint.
- A `catalog` block: the 40 type/density/level combinations laid out on a flat grid, one per cell, at a cell
  pitch of **≥ 50 m** — above item 6's 45 m twin radius, so no two catalog entries can form a `clutterTwins` or
  `adjacentTwins` pair and the grid does not have to carry 40 globally distinct clutter multisets. At 8 × 5 cells
  that is 400 × 250 m, inside the ~913 × 514 m the 620 m top-down `catalog` preset covers at the core camera's 45°
  fov (`src/core/camera.js:10`), so all 40 still land in one frame.

Declared presets (`showcase.cameras`, registered via `ctx.camera.registerPreset`) — exactly these six names:

| Preset | Frames | Must read as |
|---|---|---|
| `downtown` | tower cluster from ~330 m | varied crowns and heights, roofscape visible, aerial haze |
| `night_downtown` | 200 m, inside the cluster | per-window lighting, lit ground floors, dark facades between |
| `suburb` | 200 m over detached houses | roof/material/plan variety, dressed lots, driveways |
| `industry` | 220 m over the sheds | long low metal masses, docks, silos, apron |
| `block` | 90 m street-level at a mixed-use corner | facade relief, shopfronts, kerb-to-building transition |
| `catalog` | 620 m top-down over the catalog grid | all 40 classes legible in one frame |

How it must read on the standard matrix (critics shoot `aerial`, `street`, `skyline`, `closeup` at 06.5 / 12 /
17.5 / 22, plus each preset above — night presets at 22, `suburb` also at 6.5; the exact commands are in §4, and
the preset shots need the extra `--cameras` runs listed there because the gauntlet default does not produce them):

- **06.5 golden hour** — long shadows across facades pick out every reveal, band and balcony; sunlit walls warm,
  shadowed walls cool-blue and *readable* (p1 > 0), no cream white-out on the sun side.
- **12 noon** — full material read: brick, render, glass, metal and shingle are each identifiable; zero emissive;
  contact darkening at every base; roofs show clutter shadows.
- **17.5 late afternoon** — same as golden hour with the sun on the other side; glass towers show a warm sky
  reflection gradient rather than a flat blue tint.
- **22 night** — the facade mass goes dark and the city is drawn by its windows: individual panes, three brightness
  tiers, warm/cool mix, lit retail bases, and enough contrast that `--showcase all --time 22` blooms only on the
  windows and signs. This is the shot the module is judged on.
