# Module spec: `services`

Role file: `docs/prompts/BUILDER.md` (builders) / `docs/prompts/CRITIC.md` (critics). Everything invariant lives
there and is not repeated here. `$REF` = `/tmp/claude-0/-home-user-SimBuild/c06ed41b-9bdf-5ab7-ace6-40b62a5e4281/scratchpad/ref`.

---

## 1. Purpose

Without `services` the city is a stage set that cannot fail: nothing supplies power or water, nothing collects
garbage, no school/clinic/police/fire/park raises a district's level, no building is ever refused growth for lack
of utilities, and the skyline has none of the civic silhouettes — cooling towers, turbines, water tower, school
yard, fire tower — that make a CS2 city read as a *place that runs on something*.

---

## 2. World data owned

Owner of `world.services`. Copy these signatures exactly (ARCHITECTURE §15); mutate the section in place, never
replace it, bump `version` on every mutation, emit the event after the mutation is complete.

```js
services: {                        // owner: services
  items: Map<id,{id, kind, x, y, z, heading, level, capacity, load}>,
  kinds,                           // the 17 strings below, in this order — do not add or rename
  coverage(kind, x, z) -> 0..1,
  supply: { power, water, sewage, garbage },
  demand: { power, water, sewage, garbage },
  place(kind, x, z, heading) -> id | null,
  remove(id),
  version,
}
```

ARCHITECTURE §15 names `capacity` and `level` without typing them; this spec types both below, and that is the
binding definition. `world.services` already exists in `src/core/world.js:94-103` with no-op `coverage/place/remove`
— replace those three functions and the two objects in place; never reassign `world.services`.

`kinds` is already declared by `src/core/world.js` and mirrored by `ui/hud.js:SERVICE_KINDS`; keep it byte-identical:

```js
['power_coal','power_wind','power_solar','water_pump','sewage','landfill','incinerator',
 'clinic','hospital','school','high_school','university','police','fire','park_small','park_large','plaza']
```

Field contract, enforced by probe:
- `id` integer ≥ 1, unique for the life of the session; `kind` ∈ `kinds`.
- `x,z` metres = footprint centre; `y` = the pad height the base plate sits at (see acceptance 8); `heading`
  radians, 0 = the entrance faces north (−Z), matching `world.roads.frontage(...).heading`.
- `level` is **always `1` in this round.** The field is reserved for a later upgrade pass; no api function changes
  it, no acceptance item exercises an upgrade, and `capacity` does not scale with it. Do not build an upgrade system.
- `capacity` is an **object**, not a scalar: `{power?, water?, sewage?, garbage?, people?}`, every present value a
  number ≥ 0, every absent category read as 0. Table §4.2 gives the literal object per kind. This is the shape
  `catalog()` returns and the shape `place()` copies onto the item. (Rationale: `incinerator` produces two
  categories at once, and the park kinds produce none.)
- `effectiveCapacity(item, c)` = `item.capacity[c] ?? 0` × the kind's live modifier from §4.2 (wind
  `clamp(wind.speed/8, 0.15, 1)`, solar `max(0, sin(sunElevation))`, water pump × 0.35 when > 60 m from `isWater`,
  1.0 for everything else). This is the **only** place a modifier is applied. There is no second multiplier
  anywhere else, and in particular over-subscription is *not* applied again at query time.
- `load` is **derived, never an input**: for a producer of category `c` in road component `k`,
  `load = effectiveCapacity(item, c) × min(1, componentDemand(c,k) / max(1e-6, componentSupply(c,k)))`, so
  `load ≤ effectiveCapacity` always. For a civic/park kind, `load` = the number of people in covered buildings.
  `load` is a scalar, so a producer of **two** categories — `incinerator` is the only one — reports it for its
  larger capacity, `garbage` (700 > 120); item 13(e) grades that item against `effectiveCapacity(item,'garbage')`.
- `supply.<c>` = Σ `effectiveCapacity(item, c)` over **all** live producers in **all** road components;
  `demand.<c>` = Σ of the per-building need (§4.2) of every building within 60 m of any road. Both are plain
  numbers ≥ 0, refreshed at least once per `sim:tick`. **These two are reporting numbers only** — they are what the
  HUD and item 13(a) read. Coverage never divides by them; it divides per component (below).

**The one coverage formula.** This is the module's central algorithm and it is defined here once. Nothing in §4
redefines it; where an acceptance item quotes a number it is a consequence of this formula.

```
componentOf(x,z)   = the id of the connected road component whose roads come within 60 m of (x,z), else NONE
                     (connectivity is a BFS over world.roads.nodes/edges; a bridge edge connects, water does not)

// utility categories c ∈ {power, water, sewage, garbage} and every utility kind
coverage(c, x, z)  = 0                                             if componentOf(x,z) === NONE
                   = 0                                             if component k has no live producer of c
                   = min(1, componentSupply(c,k) / componentDemand(c,k))   otherwise, k = componentOf(x,z)
                     (= 1 when componentDemand(c,k) === 0)

// civic and park kinds (road-distance falloff, radius from §4.2)
coverage(kind,x,z) = max over live items of that kind, reachable from (x,z) along the road graph, of
                     smoothstep(1, 0, roadDistance(item, x, z) / radius(kind))     ∈ [0,1]
```

`componentSupply(c,k)` = Σ `effectiveCapacity(item, c)` over live producers of `c` whose entrance node is in
component `k`; `componentDemand(c,k)` = Σ per-building need of buildings within 60 m of a road in component `k`.
Two disconnected halves of the city therefore brown out independently — that is the intended behaviour, and it is
why coverage uses the component ratio while `supply`/`demand` stay global. In the §8 showcase the road grid is one
connected component, so `componentSupply/componentDemand` and `supply/demand` are numerically equal there.

**The one exception**, and it is a degrade path, not a second rule: when `world.roads.nodes.size === 0` there are no
components, so every facility is treated as its own component and `roadDistance` falls back to euclidean distance
(utility kinds then cover a 400 m disc). Log it once with `ctx.log.warn` and never take this path when roads exist.
The graded scenes all have roads, so no acceptance item is decided by it.

**`coverage(key, x, z)` accepts more keys than `kinds`.** `simulation` (already built) calls it with the aggregate
category keys as well; returning 0 for them silently disables utilities for the whole city. Note the key set is
**20 distinct strings**, not 21: `'sewage'` is both a kind and an aggregate and the two mean the same thing.

| Accepted key | Meaning |
|---|---|
| any of the ten civic/park `kinds` | the road-distance falloff above, over facilities of that kind alone |
| any of the seven utility `kinds` | the component ratio above for that kind's **primary** category, numerator restricted to producers of that kind: `power_coal`/`power_wind`/`power_solar` → `power`, `water_pump` → `water`, `sewage` → `sewage`, `landfill` → `garbage`, `incinerator` → `garbage` (its larger capacity, as for `load`). Diagnostic only — nothing in the game reads these seven; item 3(a) is the whole of their grading. |
| `'power'` | the formula above with `c = power`; producers are `power_coal`, `power_wind`, `power_solar`, `incinerator` |
| `'water'` | `c = water`; producer `water_pump` |
| `'sewage'` | `c = sewage`; producer `sewage` — identical to the kind key of the same name |
| `'garbage'` | `c = garbage`; producers `landfill`, `incinerator` |
| anything else | `0` — never throw, never `NaN`, never `undefined` |

Events emitted (ARCHITECTURE §15), coalesced to at most one per frame:

| Event | Payload |
|---|---|
| `services:changed` | `{added:[id], removed:[id], updated:[id]}` |

Events consumed: `roads:changed` (road graph moved → recompute components and coverage grids), `terrain:changed`
(re-seat pads in the region, rebuild affected chunks), `buildings:changed` (demand changed), `sim:tick` (refresh
`supply`/`demand` and `load`), `time:tick` (read `world.weather.night`/`.wind`; do **not** integrate time yourself).
**There is no `infoview:changed` event** — `infoviews` is a stub and emits nothing. Poll `world.infoview.active` in
`update()` (it is one string compare) and rebuild the desaturation uniform only when the value changes.

`api` (`ctx.modules.services`) must expose exactly these 19 functions:
`catalog()` · `place(kind,x,z,heading)` · `remove(id)` · `validate(kind,x,z,heading) -> {ok, reason, x, z, y, heading, slope, frontage}` ·
`footprint(kind) -> {w,d}` · `coverage(key,x,z)` · `coverageGrid(key) -> {res, cell, data:Float32Array, version}|null` ·
`at(x,z) -> item|null` · `get(id)` · `count()` · `stats()` · `setCoverageOverlay(key|null)` ·
`setInfoview(active|null)` · `setNight(v)` · `setEmissive(v)` · `flush()` · `cropRects(c)` · `serialize()` · `deserialize(d)`.
`setNight(v)`/`setEmissive(v)` mirror `buildings`' `setNight/setLit` and exist so the critic can toggle one
feature and diff the frame (item 10); `setEmissive(false)` must kill every emissive contribution this module makes
— windows, floodlight pools, beacons — and change nothing else.

`cropRects({project, width, height, camera})` is the pinned-landmark hook (ARCHITECTURE §8, `core/debug.js:41`):
`window.__sim.cropRects()` collects it from every ready module and `node tools/screenshot.mjs … --crops` writes the
result to `<out>.crops.json`. **That tool is the only producer of `crops.json`.** Return `{name: [x, y, w, h]}` in
pixels, computed with the supplied `project(x, y, z)` so the rect follows the camera, for exactly these seven
landmarks — nothing else in this spec is pinned — omitting any that is off screen for the given `camera`, and
never throwing:

`civic_facade` (the clinic's south wall — items 7, 10a) · `wall_base` (a 40 px column over the bottom 1.5 m of that
wall plus 1.0 m of ground in front of it — item 21) · `park_lawn` and `grass_ref` (equal-area patches of mown lawn
inside the large park and of untouched terrain grass just outside its hedge — item 5) · `solar_field` (item 11) ·
`plume` and `sky_ref` (equal-area patches of the tallest cooling-tower plume at half its height, and of open sky
at the same screen height beside it — item 2).

`stats()` must return
`{items, kinds:{<kind>:n}, decor:{...}, draws, tris, textures, gridMs, buildMs, coverageVersion, supply:{...}, demand:{...}, served:{power,water,sewage,garbage}, plumeQuads, overlay}`
where `draws` = renderable meshes in `ctx.group` with `visible === true` (this is the number the draw-call budget
is graded on), `textures` = the count of `THREE.Texture` objects this module created and still holds (the number
§5 caps), and `served.<c>` = fraction 0–1 of `world.buildings.items` with `coverage(c, b.x, b.z) ≥ 0.5`.

`decor` exists because `kinds` counts facilities and cannot see a bench: it is
`{trees, treeSpecies, benches, bins, pathLamps, hedgePerimeterFrac, treeHash}` over the park/plaza furniture this
module places (§7), where `hedgePerimeterFrac` is 0–1 and `treeHash` is a stable 32-bit hash of the first 64 tree
instance matrices with each element rounded to 0.01. Items 5 and 12 are graded against these fields; without them
their counts have no observation method.

---

## 3. Visual/behavioural target

The bar is ARCHITECTURE §15: *service buildings render with the same PBR/procedural quality as `buildings`
(distinct silhouettes: cooling towers, wind turbines, water tower, school yard, fire tower)*. Against the actual
references:

**`$REF/cs2_6.jpg` — the coal plant at ~2 km, winter dusk.** Two hyperboloid cooling towers, pale warm-grey,
waisted at about 55 % of their height, standing next to a dark low boiler house with a slim chimney. The single
loudest element in the frame is the **steam**: three separate white plumes rise roughly twice the tower height,
widen as they climb, lean downwind, and fade into the haze — they are opaque near the mouth and gone by the top.
This is what makes a power plant read at aerial and skyline distance, and it is the shot this module lives or dies
by. `$REF/cs2_2.jpg` proves it again at 4 km: in a 1920-px golden-hour aerial of a whole city, the two things you
can still name are the airport and *two white plumes*.

**`$REF/cs2_7.jpg` — industrial info view.** Chimney stacks with individual grey plumes; a quarry with a yellow
gantry crane; a cooling tower plume rising above the treeline. Note also how the info view desaturates the whole
world to near-monochrome and lets only the highlighted category keep colour — services must honour the same
treatment (acceptance 18).

**`$REF/cs2_4.jpg` — golden-hour suburb, the bar for parks and plazas.** Mown lawn is a *different green* from the
surrounding grass and holds crisp edges; clipped hedges run as continuous dark-green walls with rounded tops; paths
are pale warm concrete against grey asphalt; ornamental lamp posts stand *inside* the green, not only on the kerb;
every tree, hedge and post throws a long soft shadow with contact darkening where it meets the ground. A park in
this game is a designed ground plane with furniture — not a green rectangle with three trees.

**`$REF/cs2_5.jpg` — the bar for every service car park.** Dark warm-grey asphalt, crisp white bay lines with a
blue accessible bay, cars sitting in the bays with hard contact shadows. Service lots have parking; it must look
like this and not like a grey quad.

**`$REF/cs2_2.jpg` — aerial.** Civic buildings read by *plan* from above: a domed arena, long school ranges around
a yard, a hospital block with a helipad. Colour desaturates and contrast drops with aerial haze; roofs are a mix of
pale gravel, dark felt and metal, never one grey.

Behaviourally: with a power plant placed and connected, buildings on the road network grow; delete it and
`world.economy.servicesActive` stays true while `services.power` collapses and growth stops (`economy.js:355`).
Coverage is visible as a soft ground gradient under `setCoverageOverlay('power')`, not a hard circle.

---

## 4. Acceptance criteria

`BUILDER.md` §Engineering rules and §Definition of done apply in full and are graded. `CRITIC.md` owns the greps
and the 1280×720 shot. **The items below are what is specific to `services`.**

Ordered by how much each moves the score. Every item is checked in a named shot from the command list in §8
(`shots/services/r<n>/<camera>_<time>.png`), in a rect of that shot's `.crops.json`, in its `.json`, or in a
page-evaluate probe against `window.__sim.registry.apis.services` at `?showcase=services&headless=1`.
**Every pinned statistic is taken on the full-resolution 1920×1080 PNG, never on the 1280×720 or any downscaled
copy** — at 480 px wide a 1 m calibration patch is about two pixels.

### 4.1 Checklist

1. **The four hero silhouettes exist and are unmistakable.** At `utilities_12` (~380 m, 0.29 m/px) and
   `skyline_12` (~1.04 km, 0.80 m/px — a 60 m tower is 75 px tall there), an art
   director names, without a caption: two hyperboloid cooling towers (height ≥ 60 m, throat radius ≤ 0.62 × base
   radius, waist at 0.50–0.60 of height, ≥ 24 radial segments so the silhouette has no visible facets), a
   three-blade wind turbine (hub ≥ 45 m, rotor Ø ≥ 50 m, tapered blades, nacelle box), a solar field (≥ 40
   instanced panel rows on a tilted rack, tilt 25–35°), and a water tower (bowl on legs, ≥ 22 m). `$REF/cs2_6.jpg`.
2. **Steam and smoke plumes.** At `plant_close_12`, `utilities_12`, `skyline_12` and `aerial_17p5`, each cooling
   tower and each stack emits a plume that (a) starts inside the mouth with no visible seam, (b) reaches ≥ 2.0 ×
   the emitter height before it fades below 5 % opacity, (c) widens by ≥ 2.5 × from mouth to top, (d) leans in the
   direction of `world.weather.wind` (in the critic's Playwright session of §8.1: set `wind.x = ±1`, re-shoot, the
   plume apex moves ≥ 40 px in the expected direction), (e) is **soft-particle depth-faded** — no hard quad edge
   where a plume crosses a tower or the terrain. Cooling-tower plume near-white (r≈g≈b, luma 190–235 at noon);
   incinerator/landfill smoke warm grey (luma 90–150). Luma is measured inside the `services.plume` rect of
   `utilities_12.crops.json`. At 22:00 the mean luma inside `services.plume` in `utilities_22` is ≤ **0.35 ×** the
   same rect's mean in `utilities_12`, and ≤ the mean inside `services.sky_ref` in the same 22:00 frame.
   `$REF/cs2_6.jpg`.
3. **`coverage()` is correct, fast and allocation-free.** Probe:
   (a) all 17 kinds + `power|water|sewage|garbage` + `'nonsense'` return a finite number in [0,1], never NaN/undefined;
   (b) with one `power_coal` on the staged network, `coverage('power', b.x, b.z) ≥ 0.9` for ≥ 95 % of staged
   buildings and `= 0` at a point 300 m off the road network across water;
   (c) `remove(id)` of that plant drops the same measure to 0 within one `flush()`;
   (d) 20 000 calls to `coverage('power', …)` at random points complete in **≤ 8 ms** and allocate nothing
   (`stats().gridMs` unchanged, no `new` in the query path — the query is a bilinear read of a precomputed grid);
   (e) `coverageGrid('power')` returns `{res: 128, cell: 16, data: Float32Array(16384)}`; `coverageGrid()` returns
   `null` for the six ungridded kinds named in §5 and for any unknown key, and never throws.
   (a)–(c) apply to **all 20 keys**; (d) applies to the **14 gridded keys** only (§5 names them and the six
   ungridded utility kinds). This is graded first among the non-visual items because `simulation/grids.js` calls
   `coverage()` **12 288 times per game hour** (a 64² coarse grid × the 3 park kinds, `grids.js:119`); a per-call
   graph walk stalls the whole game. The 20 000-call / 8 ms figure in (d) is §5's ≤ 0.4 µs per query × 20 000.
4. **Road-distance coverage, not a euclidean circle.** The formula is §2's, once, and this item only names its
   observable consequences. Probe on the staged network: a point 120 m from a clinic along the road returns
   ≥ 0.55; a point 120 m away in a straight line but ≥ 400 m away by road returns ≤ 0.15; a point on the far side
   of the river with no road link returns 0 for every key. For utilities, a cell 80 m from any road returns 0 even
   with a plant 100 m away (CS2's no-pipes rule, ARCHITECTURE §15), and a cell on a road component with no live
   producer of that category returns 0 however large `supply.<c>` is. Visual: in the `coverage_12` capture (the
   probe-driven shot defined in §8, **not** a gauntlet shot) the covered region follows the streets and is visibly
   *not* a disc.
5. **Parks and plazas are designed ground, not green rectangles.** *Ownership: this module emits the park
   vegetation, furniture and path lamps itself, out of its own 60-draw budget* — `props` declares
   `dependencies: ['terrain','roads']` and is therefore **not loaded** at `?showcase=services` (`core/showcase.js`
   `selectModules`), and its api has no placement entry point (§7). Match props' look rather than inventing one:
   same three species and the same crown-tint palette as `src/modules/props/place.js:128-135`.
   Graded at `park_12` and `park_6p5` — **not** at `street_*`, whose core preset frames the civic street (§8).
   Counts come from `stats().decor` (§2), which is why that field exists; the rest is read off the shot:
   `decor.trees ≥ 24`, `decor.treeSpecies ≥ 3`, `decor.benches ≥ 8`, `decor.bins ≥ 4`, `decor.pathLamps ≥ 6`,
   `decor.hedgePerimeterFrac ≥ 0.60`. In the shot: a mown lawn plate whose mean hue inside the
   `services.park_lawn` rect of `park_12.crops.json` differs from `services.grass_ref` by ≥ 12°, or whose mean
   luminance differs by ≥ 12/255; ≥ 2 curved (not axis-aligned) paths in pale concrete, 2.5–3.5 m wide; path lamps
   standing inside the green rather than only on the kerb; and a water feature or sports court. The plaza is paved
   with a **patterned** surface (banded or radial paving, ≥ 2 tones) plus a fountain or monument at its focus.
   `$REF/cs2_4.jpg`.
6. **Every facility is seated in the ground on a graded pad.** Probe over every staged item, 12 samples on the
   footprint perimeter: `|item.y − world.terrain.getHeight(x,z)| ≤ 0.30 m` at the highest sample (`y` is the pad
   height, the field named in §2 — there is no `padY`); the base skirt
   extends ≥ 0.35 m below the **lowest** of the 12 samples; 0 samples show terrain above the ground-floor slab; and
   for pads on slope the surrounding grade is a batter or retaining wall, never a sheer black cliff (`roads_r1`
   issue 6). Visual check at `civic_6p5` and `utilities_12`. No item floats, no item is sunk.
7. **Civic buildings match the `buildings` module's material quality.** Two shots, two scales, and both thresholds
   are set by what the pixels resolve. At the core `closeup` preset (distance 110, 45° vertical fov, 1080 px) one
   pixel is `2 × 110 × tan 22.5° / 1080 = 0.084 m`; at `civic` (260 m) it is 0.20 m. So a 0.10 m reveal is barely
   one pixel even up close and is not gradable; 0.25 m is three.
   At **`closeup_12`**, inside the `services.civic_facade` rect of `closeup_12.crops.json` (§2 pins it to the
   clinic's south wall; §8 stages the clinic on the core `closeup` target so the rect is always in frame), read on
   the full-resolution PNG: window openings are recessed ≥ 0.25 m behind the wall plane and read as holes with a
   head shadow at 12:00, not as painted rectangles; a parapet or eave cap projects ≥ 0.25 m; and there is a signed,
   canopied entrance facing the road frontage.
   At **`civic_12`** (~260 m): every civic building (clinic, hospital, school, high_school, university, police,
   fire) reads by massing — a broken roofline or a wing/setback rather than one extruded box, and ≥ 2 roof-clutter
   pieces (HVAC, vent, lift bulkhead, roof monitor, mast, solar array) casting their own shadows.
   Flat-shaded boxes are an automatic fail. `$REF/cs2_2.jpg`.
8. **Distinct plan per civic kind.** At `civic_12` (looking down on roofs) the seven civic kinds are told apart by
   *plan* alone: school = ranges around a fenced yard with a marked sports court and ≥ 2 school buses in a bay;
   high_school = larger yard plus a running track; university = a quad with ≥ 3 wings and a colonnade; hospital =
   slab block with a marked helipad (`H` on the roof) and a covered ambulance bay; clinic = small L; police = block
   with a mast/antenna array and a marked vehicle yard; fire = engine bays with ≥ 3 roller doors, an apron and a
   hose-drying tower ≥ 12 m. Probe: `stats().kinds` shows ≥ 1 of each of the 17 kinds staged.
9. **Parking and service yards, marked.** Every civic facility and both power plants have a hard-surface yard with
   painted bay lines at 2.5 × 5.0 m, a marked access from the kerb, and ≥ 4 parked vehicles or plant items where
   the bay count allows. At `civic_6p5` and `civic_12` the bays read as a regular marked grid (a 2.5 m bay is 12 px
   at `civic`'s 0.20 m/px) and do not shimmer or break into dashes — mip-aware line width or a box-filtered decal,
   per `roads/materials.js`. `$REF/cs2_5.jpg`.
10. **Night: lit, not glowing.** At `night_civic_22`, `utilities_22` and `street_22`: emissive is present as
    (a) per-window on/off lighting in civic buildings baked to a vertex attribute from `ctx.rng` (**not** a
    `fract(sin(...))` fragment hash — `grep -rn "fract(sin(" src/modules/services/` returns nothing, and inside the
    `services.civic_facade` rect of `civic_22.crops.json` — the clinic wall at `civic`'s 260 m, in the 250–400 m
    band where this artefact shows — < 0.2 % of pixels differ from both horizontal neighbours by > 40/255; this
    exact bug cost `environment` a round, `docs/critic/environment_r2.md` issue 2);
    (b) floodlit yards — school yard, fire apron, plant yard — as a *pool on the ground*, brightest under the mast
    and falling off, not a uniform lift;
    (c) red aviation warning lights on every stack, cooling tower and turbine nacelle, phase derived from
    `world.time.hour` so a frozen clock gives a repeatable frame.
    Constraints: inside that same `services.civic_facade` rect the unlit wall mass is ≥ 6 × darker than its lit
    windows; the frame's
    p1 luminance > 0 and p99 < 250; < 0.3 % of pixels are 255 in any channel; and no emissive element is visible at
    `?time=12` — probe: capture `civic_12`, then `setEmissive(false)`, capture again, diff: **meanAbs < 0.5/255**
    (at 22:00 the same toggle must move the frame by meanAbs > 8/255, proving the switch is real).
11. **Solar panels do not sparkle or blow out.** At `utilities_12` and `utilities_17p5`, pixels with luma > 245 are
    < 0.05 % of the full 1920×1080 frame (≈ 1000 px), and the `services.solar_field` rect of
    `utilities_12.crops.json` says where to look for them. Panel glass roughness ≥ 0.25, albedo ≤ 0.09 (dark blue-black),
    `normalScale` ≤ 0.3 and faded to ≤ 0.15 beyond 150 m; metal racking roughness ≥ 0.40; concrete/render ≥ 0.60;
    gravel/roofing ≥ 0.75 (`roads_r1` issue 5, `environment_r1` issue 7).
12. **Placement validation is real and deterministic.** Probe `validate(kind,x,z,heading)` returns `ok:false` with a
    named `reason` for each of: `'water'` (any footprint corner where `world.terrain.isWater`), `'slope'` (max−min
    terrain height across the footprint > 4.0 m, or `getSlope` > 0.35 rad at the centre), `'overlap'` (footprint
    intersects another service item, a `world.buildings` footprint, or `world.roads.isRoad(x,z) !== 0`), and
    `'no_frontage'` (no `world.roads.nearestEdge(x,z,40)` hit on the entrance side). `place()` returns `null` for
    every invalid case and mutates nothing; on success it returns a new id, adds the item, bumps
    `world.services.version`, and emits `services:changed {added:[id]}` within one frame. Two runs at `--seed 1337`
    give identical `stats().kinds`, `tris`, `supply` and `stats().decor.treeHash`; a run at `--seed 7` keeps the
    **facility placements identical** (they are laid out from the road grid, not from noise) — same `stats().kinds`
    and the same `x, z, heading` on every item — while `stats().decor.treeHash` differs, which is what proves the
    park vegetation is re-scattered from the seed. `treeHash` (§2) is the only instrument for this; no api function
    exposes tree matrices and none is being added.
13. **Supply, demand and load are live and drive growth.** Probe with `simulation` running:
    (a) `world.services.supply.power` equals Σ `effectiveCapacity(item,'power')` over live producers — including
    `incinerator`'s `capacity.power = 120` — with wind scaled by `world.weather.wind.speed` and solar 0 at
    `sunElevation < 0` and ≥ 0.8 × rated at noon; ± 0.5 units;
    (b) `demand.power` > 0 whenever ≥ 1 building exists and grows with building count;
    (c) with `componentSupply('power') < componentDemand('power')`, every covered `coverage('power',…)` equals
    that ratio ± 0.02 — a brownout, not an on/off switch. The showcase network is a single component, so on the
    staged scene this is `supply.power / demand.power ± 0.02`;
    (d) after `remove()` of the only power plant, `world.economy.services.power` is below 0.5 **within 110
    `sim:tick`s** — `simulation` recomputes per-building service levels once per game hour, at
    `tick % TICKS_PER_HOUR === GRID_TICK` (`economy.js:227`, `TICKS_PER_HOUR = 100`, `GRID_TICK = 50`), so the
    worst case is 100 ticks and 25 is unreachable by any correct implementation. Drive it with
    `ctx.modules.simulation.step(110)` before reading. Then `ctx.modules.simulation.building(id).power < 0.5` for a staged
    building (growth blocked, `economy.js:355`);
    (e) each item's `load` ≤ its `effectiveCapacity` for the category §2 assigns it (`incinerator` → `garbage`)
    and is refreshed at least once per second of game time.
14. **Coverage overlay reads like CS2 and is off by default.** `setCoverageOverlay('power')` draws a single ground
    decal (≤ 2 draw calls, one texture ≤ 512²) with a soft gradient from full at the source to 0 at the edge, a
    2-colour ramp (served / unserved), ≥ 40 % transparency and no hard aliased rim. It renders **above** roads and
    below props: `RENDER_ORDER.UI3D`-ordered with `depthWrite:false` and `polygonOffset` off — verified z-fight-free
    by a 3-frame capture in the `coverage_12` probe session with the camera moved 1 m between frames (no flicker,
    mean frame-to-frame diff on the overlay region < 3/255). `setCoverageOverlay(null)` removes it completely, and
    it is **null in every shot the gauntlet takes** — the module never enables it by itself, never sniffs the
    camera or URL, and `stats().overlay === null` in every `.json` produced by the §8 gauntlet commands. The only
    thing that turns it on is an explicit `setCoverageOverlay(key)` call from a probe.
15. **Budget.** Every row of §5's table holds, at every camera and every time, read from the instrument that row
    names. The numbers live in §5 only, so there is one copy of each to keep true.
16. **Catalogue matches the UI contract exactly.** `catalog()` returns all 17 kinds with `{label, cost, category,
    unlock, footprint:{w,d}, capacity, radius, upkeep, output}`; `label`, `cost` and `unlock` are **identical** to
    `src/modules/ui/hud.js:SERVICE_KINDS`, and `category` equals that table's `cat` field (one of
    `electricity, water, garbage, health, education, police, fire, parks`). `capacity` is the object from §4.2,
    key-for-key. `radius` is `null` for the seven utility kinds (`power_coal`, `power_wind`, `power_solar`,
    `water_pump`, `sewage`, `landfill`, `incinerator`) — they use component connectivity, not a radius — and a
    number for the other ten. The critic diffs the whole table programmatically: `label`/`cost`/`unlock`/
    `category`/`capacity`/`radius:null` must be **exact**, and `footprint` plus the ten numeric `radius` values
    must match §4.2 within ± 10 %.
17. **Save/load round-trips.** `serialize()` → `deserialize()` restores identical `items` (id, kind, x, z, heading,
    level), identical `stats().tris`, identical `coverage('power', x, z)` at 32 sample points, and leaves no
    orphaned geometry (`stats().draws` returns to within 1 of its pre-test value). `deserialize()` is idempotent:
    calling it twice yields the same `count()`.
18. **Info view desaturation honoured.** When `world.infoview.active` is a non-null string, service meshes
    desaturate toward grey by ≥ 0.7 and suppress emissive, except items whose `category` matches the active view,
    which keep full colour; when `active` is `null` nothing changes. `infoviews` is a stub and emits no event, so
    the module polls the field (§2) and the probe sets it by hand — assign `world.infoview.active = 'electricity'`,
    wait one frame, diff (meanAbs > 20/255), clear it, diff again (0). `setInfoview(active|null)` must produce the
    identical result, so a future `infoviews` module can drive it directly. `$REF/cs2_7.jpg`, ARCHITECTURE §15.
19. **No tiling, no seams on service ground.** At `aerial_12` and `civic_12`, no yard, apron, lawn or car park
    shows an identical texture cell repeating more than 4 times in a row; every plate/terrain junction has either
    a kerb, a band or ≥ 0.4 m of blended edge — no hard material line (`terrain_r1` issue 8 — brush-stroke swirl
    repetition of the coarse layer at aerial scale — and `environment_r1` issue 3). Plates sit 0.03–0.06 m above
    the terrain and never rely on `polygonOffset` alone.
20. **Wind turbine blades read at every distance.** At `utilities_12` (~380 m, so one pixel is
    `2 × 380 × tan 22.5° / 1080 = 0.29 m`) blades are ≥ 3 px wide at their root — a root chord ≥ 0.88 m — and do not
    alias into dashed lines; blade pitch angle differs between turbines (≥ 3 distinct rotor
    azimuths across the staged turbines at a frozen clock, derived from `world.time.hour` + instance index) so the
    field does not look like one asset copy-pasted; and blade rotation rate follows `world.weather.wind.speed`.
21. **Contact darkening.** Measured in the `services.wall_base` rect of `closeup_12.crops.json` (§2: a 40 px column
    over the bottom 1.5 m of the clinic wall and the 1.0 m of ground in front of it): its mean luminance is ≥ 25 %
    below the mean of the same column at mid height and 5 m out, read on the full-resolution PNG. Judged again by
    eye at `civic_12` and `park_12`. Trees, benches, lamps and parked vehicles each have a visible contact shadow at 12:00
    (`effects_r1` issue 5 — do not rely on the post-AO pass to supply it).
22. **The props overlap at `--showcase all` is not left silent.** §7: props' forest avoids roads, water, steep
    ground and zoned lots, and a service pad is none of those, so trees grow through the coal-plant pad, the school
    yard and the fire apron in the integrated build. The keep-out lives in `props/place.js` and you may not touch
    it, so what is graded here is the handoff: (a) `docs/core-requests/services.md` exists and asks `props` to skip
    cells covered by a `world.services.items` footprint, naming the `inLot` guard as the place to add it; (b) the
    `--showcase all` aerial that BUILDER.md already requires is shot and looked at, and the number of trees
    standing inside a service footprint in it is reported in `docs/builds/services_r<n>.json` under
    `remainingWeaknesses`. A round that ships an unreported overlap fails this item; a round that reports it
    honestly and files the request passes it.

### 4.2 Catalogue (the numbers the builder must ship)

`cost`, `label`, `category` and `unlock` are fixed by `ui/hud.js`; the rest are this spec's.
`capacity` is the literal object `catalog()` must return (§2): categories in supply units, `people` for civic
kinds, `{}` where the kind produces nothing. `radius` is the road-distance falloff radius for civic and park kinds
and **literally `null`** for the seven utility kinds, which use component connectivity instead (§2's formula).

| kind | footprint w×d (m) | cost ¢ | upkeep ¢/day | capacity | radius (m) | notes |
|---|---|---|---|---|---|---|
| `power_coal` | 72 × 48 | 32000 | 480 | `{power:600}` | `null` | 2 cooling towers ≥ 60 m, boiler house, 1 stack ≥ 70 m, coal yard |
| `power_wind` | 24 × 24 | 8000 | 90 | `{power:60}` | `null` | hub ≥ 45 m, rotor Ø ≥ 50 m; × `clamp(wind.speed/8, 0.15, 1)` |
| `power_solar` | 64 × 64 | 24000 | 180 | `{power:220}` | `null` | ≥ 40 panel rows; × `max(0, sin(sunElevation))` |
| `water_pump` | 32 × 24 | 9000 | 140 | `{water:400}` | `null` | water tower ≥ 22 m + pump house; × 0.35 if > 60 m from `isWater` |
| `sewage` | 40 × 24 | 7000 | 110 | `{sewage:400}` | `null` | outfall + settling tanks; must be ≤ 60 m from water |
| `landfill` | 96 × 72 | 11000 | 90 | `{garbage:500}` | `null` | graded mound, tipping face, fence, dozer |
| `incinerator` | 48 × 40 | 38000 | 420 | `{garbage:700, power:120}` | `null` | stack ≥ 55 m with smoke plume; counts in both aggregates |
| `clinic` | 28 × 20 | 12000 | 200 | `{people:1200}` | 340 | |
| `hospital` | 64 × 44 | 45000 | 700 | `{people:5000}` | 720 | helipad + ambulance bay |
| `school` | 56 × 44 | 14000 | 260 | `{people:900}` | 420 | fenced yard, sports court, bus bay |
| `high_school` | 72 × 52 | 26000 | 420 | `{people:1400}` | 620 | running track |
| `university` | 120 × 80 | 60000 | 900 | `{people:2400}` | 1100 | quad, ≥ 3 wings |
| `police` | 36 × 28 | 11000 | 240 | `{people:1500}` | 480 | mast array, vehicle yard |
| `fire` | 32 × 28 | 10000 | 220 | `{people:1500}` | 460 | ≥ 3 roller doors, hose tower ≥ 12 m |
| `park_small` | 40 × 40 | 3000 | 40 | `{}` | 180 | |
| `park_large` | 96 × 96 | 12000 | 150 | `{}` | 380 | water feature or sports court |
| `plaza` | 48 × 48 | 8000 | 90 | `{}` | 220 | patterned paving, fountain/monument |

Per-building demand (used for `world.services.demand`): power `1 + level` for residential/commercial/office,
`3 + 2·level` for industrial; water = power × 0.8; sewage = water; garbage = `0.5 + 0.4·level` (× 2 for industrial).
State any deviation in the build report.

---

## 5. Budget

Consistent with ARCHITECTURE §9 (≤ 3 M triangles on screen, ≤ 768 MB textures scene-wide, ≤ 2 ms per module).
§9's draw-call table does **not** itemise `services`; the 60 comes from
`constants.BUDGET.perModuleDrawCalls.services = 60` (`src/core/constants.js:23`).

| Metric | Budget | Where measured |
|---|---|---|
| Declared `budget` in `index.js` | `{ drawCalls: 60, triangles: 800_000 }` | source |
| Module's own visible meshes | ≤ 60 | probe `stats().draws` |
| Module's triangles | ≤ 800 000 | probe `stats().tris` |
| Scene draw calls, `?showcase=services` | ≤ 300 at every camera/time | shot `.json` `drawCalls` |
| Scene triangles, `?showcase=services` | ≤ 2 400 000; ≤ 1 800 000 at `aerial`/`overview` | shot `.json` `triangles` |
| `update()` per frame | ≤ 2.0 ms; ≤ 0.4 ms with nothing dirty | shot `.json` `moduleMs.services` |
| Coverage-grid rebuild | ≤ 12 ms, at most once per 0.25 s, sliced so no frame pays > 4 ms | probe `stats().gridMs` |
| `coverage()` query | ≤ 0.4 µs, zero allocation (20 000 calls ≤ 8 ms) | probe |
| `init()` | ≤ 1500 ms | `.json` `modules.services.initMs` |
| `showcase.setup()` | ≤ 8 s under SwiftShader | `.json` `elapsedMs` vs baseline |
| Textures created by this module | ≤ 16 | probe `stats().textures` |
| Their sizes | ≤ 1024², except the facade/clutter atlas at ≤ 2048² | source check — no tool reports texture bytes |
| Scene texture count | ≤ 70 | shot `.json` `textures` |
| Coverage grids in JS heap | ≤ 1.0 MB (14 × `Float32Array(128²)` = 0.875 MB + one `Uint16Array(128²)` component id) | probe |
| Plume quads | ≤ 40 per emitter, ≤ 320 total, one instanced draw | probe `stats().plumeQuads` |

There is deliberately **no per-module megabyte ceiling**: nothing in the toolchain reports texture bytes, and the
"≤ 64 MB" this replaces contradicted the count beside it (16 textures at 2048² RGBA with mips is
`16 × 4 B × 2048² × 1.33 ≈ 340 MiB`, 5× the stated ceiling). ARCHITECTURE §9's 768 MB is the scene-wide bound.

**The 16-texture line is a count of `THREE.Texture` objects, not of atlases** — one `ctx.assets.pbr()` set is 3–4
maps (`core/assets.js:62`, `applyPbr` at :89) and would eat a 6-texture cap by itself. The material list the
checklist demands (facade/clutter, patterned paving, bay-line decals, plume, coverage ramp, mown lawn, hedge,
gravel roofing, dark solar glass, metal racking, concrete/render) is meant to be served by **four atlases**, each
albedo + normal + ORM, plus the plume sprite, the coverage ramp and one detail normal: 15 textures. Share
aggressively — do not ship a separate PBR set per material.

**Which coverage grids exist.** 14 `Float32Array(128²)` grids: the ten civic/park kinds (`clinic`, `hospital`,
`school`, `high_school`, `university`, `police`, `fire`, `park_small`, `park_large`, `plaza`), plus `sewage` and
the three aggregates `power`, `water`, `garbage` — which is exactly the 13 keys `simulation` queries plus
`sewage`. The remaining six utility kinds (`power_coal`, `power_wind`, `power_solar`, `water_pump`, `landfill`,
`incinerator`) are **computed on demand** from the item list and the component grid: they are still correct and
still never throw, they are exempt from item 3(d)'s ≤ 8 ms / zero-allocation rule, and `coverageGrid()` returns
`null` for them. Nothing queries them in a hot loop; `simulation` never asks for them.

Chunk at 128 m (`constants.TILE_SIZE`); one merged geometry per chunk per material so a chunk is one draw call and
frustum culling works by bounding sphere. Park vegetation, benches, bins, lamps, panels, parked vehicles and bay
lines are the repeated content BUILDER.md §Engineering rules is about.

---

## 6. Known failure modes

Symptoms as they appear on screen. The neighbouring modules' critics have already lost rounds to most of these.

- **Coverage as a per-call graph walk.** `simulation/grids.js` calls `coverage()` 12 288 times every game hour; a
  BFS per call makes the whole app hitch once an hour and blows the 2 ms module budget. Precompute grids, sample.
- **`coverage('power', …)` returning 0.** `simulation` queries the four aggregate category keys, which are *not*
  in `kinds`. If they return 0, `world.economy.services.power` collapses, every building stops growing, and the
  demo city looks correct while being silently dead. Test the aggregates first.
- **Terrain-flatten feedback loop.** `world.terrain.modify()` emits `terrain:changed`; `roads` listens, resamples
  and rebuilds; if `services` also listens to `terrain:changed` and re-flattens, the two rebuild each other every
  frame and fps collapses. Flatten every pad in one pass during `setup()`/`place()`, guard with a re-entrancy flag,
  and never flatten inside `update()`.
- **Pads slicing the hillside.** A raw flatten leaves a sheer rectangular cliff around the pad, exactly the dark
  rectangle that cost `roads` its round (`roads_r1` issue 6). Grade the surround at ≤ 1:1.5 or emit a retaining wall
  where the cut exceeds 1.5 m.
- **Sprite glow at night.** Plumes, floodlight cones and lamp halos drawn as additive sprites read brighter than
  the surfaces they sit on, and the frame becomes a milky dusk (`effects_r1` issue 2, `terrain_r1` issue 4).
  Multiply plume and halo opacity by the night factor, cap plume luminance at the sky behind it.
- **Hard plume quads.** Billboards without soft-particle depth fade cut visible straight edges where the plume
  crosses a cooling tower or a hillside.
- **Solar-field specular sparkle and blow-out.** A large flat glossy plane with a normal map produces white speckle
  at grazing angles and a blown highlight at 17.5 (`roads_r1` issue 5, `environment_r1` issue 7). Roughness floor,
  low `normalScale`, distance fade.
- **Washed-out noon.** Concrete/render albedo above ~0.72 plus bright PMREM ambient gives flat cream buildings with
  p1 ≥ 97 and std ≤ 24 — the exact failure of `roads_r1` and `environment_r1`. Let the environment's exposure work.
- **Z-fighting on ground plates.** Yards, lawns, paving, bay lines and coverage overlays coplanar with terrain or
  roads flicker at distance. Offset 0.03–0.06 m and order explicitly; never rely on `polygonOffset` alone.
- **Terrain grass tufts through paving.** Roads hit this (`roads_r1` issue 2). Publish nothing to terrain; if tufts
  poke through a yard, raise the plate — do not touch another module's group. `ctx.modules.terrain.setGrassTufts(false)` is
  a showcase-only fallback, and only in *this* module's showcase.
- **Green-rectangle parks.** A flat lawn quad with a handful of lollipop trees is the single loudest "programmer
  art" tell at street level (`simulation_r1` issues 7 and 8, `effects_r1` issue 7). Layered leaf-card canopies,
  ≥ 3 species, path network, furniture, hedges.
- **One asset copy-pasted.** Six identical wind turbines at identical rotor azimuth, six identical park trees at
  identical scale and rotation. Vary per instance from `ctx.rng`.
- **Facade tiling and per-pixel window static.** `fract(sin(dot(...)))` over an interpolated varying gives random
  bright/dark pixels inside window cells at 100–400 m (`environment_r2` issue 2). Bake per-window state into a
  vertex attribute.
- **Overlay left on.** A coverage overlay still enabled during the gauntlet tints every ground shot and reads as a
  bug. Default null, restore null after any probe.
- **Coverage stale after an edit.** Placing a road, moving terrain or removing a plant without invalidating the
  grids leaves the overlay and `simulation` reading last minute's world. Version and rebuild on
  `roads:changed`/`services:changed`/`terrain:changed`.
- **Floating or sunk facilities.** A single centre height sample leaves the corners in the air on any slope.

---

## 7. Dependencies and their real APIs

`dependencies: ['roads', 'zoning', 'buildings', 'simulation']` (ARCHITECTURE §15). `terrain` and `environment` are
pulled in transitively by the showcase router and are always present. Guard everything else with optional chaining.

**`ctx.modules.<name>` *is* that module's api object** — `registry.js:36` passes `modules: this.apis` and
`registry.js:14` stores `def.api` directly, so the call is `ctx.modules.roads.rebuild()`. There is no `.api`
sub-object: `ctx.modules.roads.api` is `undefined`, and `ctx.modules.roads?.api?.rebuild?.()` silently does
nothing — no rebuild, no frontage, no `isRoad` mask, no components, and coverage, `validate()` and the whole
showcase fail in a way that looks like a logic bug. Every shipped module uses the short form
(`buildings/showcase.js:70`, `zoning/index.js:143`, `props/index.js:256`). BUILDER.md §Fail soft's example
(`ctx.modules.props?.api?.place?.(…)`) has the extra `.api` and is wrong; the headings below are the real paths.

**Verified state of the repo at the time this module is built** (checked module by module, not assumed):
`terrain`, `environment`, `roads`, `zoning`, `buildings`, `simulation`, `props`, `effects`, `ui` and `audio` are
**built and shipped**. The stubs are `traffic`, `tools`, `infoviews`, `transit` and `democity` — plus `services`
itself. Do not write a spec-of-convenience around a module that already exists.

**`props` is fully built** — 281 lines of module across 8 files: oak/pine/birch trees with 2 LODs, impostors and
wind sway, street lamps with night halos and ground light pools, signalised intersections, and a sidewalk kit
(benches, bins, hydrants, signs, bus shelters, fences, bushes, hedges, planters). Its api is
`rebuild()` · `stats()` · `lamps() -> [{x,y,z}]` · `signalState(nodeId) -> {phase0,phase1,phase}|null` · `count()` ·
`serialize()` · `deserialize()`. **There is no `place()` and no way to ask it for content at a given spot** —
`rebuild()` regenerates everything from the road graph and the terrain (`props/place.js`) and knows nothing about
service pads.

**Decision, so nobody argues about it in round 1: `services` places its own park trees, hedges, benches, bins,
path lamps, parked vehicles and yard markings, and pays for them out of its own 60-draw-call budget.** Two reasons,
both mechanical: props exposes no placement api (above), and props is **not even loaded** at
`?showcase=services` — it declares `dependencies: ['terrain','roads']`, so `core/showcase.js:selectModules` never
pulls it in for this showcase, and a park that delegated to props would render empty in every graded shot.
Acceptance item 5 says the same. To keep the two subsystems looking like one city, reuse props' species set and
crown-tint palette (`props/place.js:128-135`: `HEIGHTS` oak 8.5–15.5 m, pine 12–24 m, birch 8–15 m, and the
per-species `TINT` triples) rather than inventing a second tree look. `ctx.modules.props?.stats?.()` may be
read for diagnostics; nothing in this module may depend on props being present.
The reverse direction is not yours to solve: props' forest skips roads, water, steep ground and **zoned lots**
(`place.js:61` `lotTest`) but knows nothing about service pads, so at `--showcase all` it grows trees through them.
Item 22 says what you owe instead.

**`world.terrain`** (single source of height; a flat fallback exists if terrain failed):
`getHeight(x, z) -> m` · `getNormal(x, z, out?) -> Vector3` · `getSlope(x, z) -> rad` · `isWater(x, z) -> bool` ·
`raycast(ray) -> {point, normal}|null` · `modify({x, z, radius, strength, mode:'raise'|'lower'|'flatten'|'smooth', target}) -> bool`
(flatten uses `target ?? getHeight(x,z)`, weight `min(1, w*strength)`, emits `terrain:changed`).
Also `world.terrain.features.river`, `.minHeight`, `.maxHeight`. `ctx.modules.terrain`: `data()`, `stats()`,
`material()`, `setGrassTufts(enabled)`, `setReflection(enabled)`, `debug.*`.

**`world.roads`**: `nodes: Map<id,{id,x,y,z,designY,edges:Set<edgeId>}>` — this is the graph to BFS ·
`edges: Map<id,{id,a,b,type,lanes,width,oneWay,ctrl,length,elevation,trimA,trimB,bridge,ring}>` ·
`types` (`alley w8/l1`, `gravel w8/l2`, `street w16/l2`, `avenue w24/l4`, `highway w32/l6`, each with `sidewalk`) ·
`nearestEdge(x,z,maxDist=30) -> {edge,t,point,dist}|null` · `sample(edgeId,t) -> {x,y,z,tangent,normal}` ·
`laneCenter(edgeId,laneIndex,t)` · `frontage(edgeId) -> [{side,from,to,x,z,heading,width,length}]` ·
`addNode(x,z)`, `addEdge(a,b,type,opts)`, `removeEdge(id)`, `removeNode(id)`, `version`.
**`isRoad(x,z)` returns `0 | 1 | 2`** (0 none, 1 asphalt, 2 sidewalk/verge) — *not* 0..1 as ARCHITECTURE §3 says —
and it only exists after the first `rebuild()`; guard with `typeof world.roads.isRoad === 'function'`.
`world.roads.coverage = {res, cell, data: Uint8Array, version}` is the same mask.
`ctx.modules.roads`: `rebuild()` · `lampPositions(edgeId)` · `intersections()` · `nodeInfo(id)` · `types()` ·
`edges()` · `stats()` · `edgeDebug(edgeId, step)` · `serialize()` · `deserialize(d)`.
Degrade: with an empty road graph, coverage takes the §2 exception path (euclidean) and `validate()` skips the frontage test
(reason `'no_frontage'` is never returned) — log it once with `ctx.log.warn`.

**`world.zones`**: `cells`, `lots: Map<id, {id, edgeId, side, cells, x, y, z, w, d, heading, nx, nz, ax, az, type,
density, corner, t, buildingId}>`, `lotsFor(edgeId)`, `freeLots()`, `paint()`, `erase()`, `version`.
`ctx.modules.zoning`: `paint(x,z,radius,type,density)` · `erase(x,z,radius)` · `bulk(fn)` · `lotsFor(edgeId)` ·
`freeLots()` · `lotAt(x,z)` · `cellAt(x,z)` · `zonableAt(x,z)` · `debugEdge(id)` · `refresh()` ·
`setOverlayVisible(v)` · `overlayVisible()` · `stats()` · `serialize()` · `deserialize(d)`.
Use `lotAt`/`zonableAt` so a service pad never lands inside a zoned lot.

**`world.buildings`**: `items: Map<id,{id,lotId,type,density,level,footprint:{w,d},floors,height,x,y,z,heading,
styleId,occupants,jobs,lit}>`, `at(x,z)`, `spawn(lot)`, `demolish(id)`, `levelUp(id)`, `version`.
`ctx.modules.buildings`: `requestSpawn(lot)` · `setLevel(id,n)` · `demolish(id)` · `at(x,z)` · `get(id)` ·
`count()` · `flush()` · `spawnFreeLots(limit)` · `stats()` · `material()` · `atlasTextures()` · `setNight(v)` ·
`setLit(v)` · `serialize()` · `deserialize(d)`. Used for the demand denominator and for the overlap test in
`validate()`. Degrade: no buildings ⇒ `demand` is 0 and every coverage value is 1 on the served network.

**`ctx.modules.simulation`**: `profile(hour, out)` · `activity(hour)` · `demand()` · `economy()` ·
`building(id)` · `landValueAt(x,z)` · `pollutionAt(x,z)` · `noiseAt(x,z)` · `milestone()` · `isUnlocked(what)` ·
`canAfford(a)` · `spend(a, force=false)` · `earn(a)` · `grids()` · `step(n)` · `constants` · `serialize()` ·
`deserialize(save)`. `place()` charges its `cost` through `spend(cost)` and returns `null` when unaffordable in
play mode; in `showcase.setup()` it uses `spend(cost, true)`. Upkeep is *reported*, not deducted — `economy.js`
already models service expense per capita; do not double-charge. Degrade: no simulation ⇒ placement is free and
`supply`/`demand` still update from `world.buildings`.
**How simulation consumes you** (already shipped, do not break): `simulation/index.js:119-120` gates on
`ctx.modules.services && world.services.items.size > 0`, then calls
`world.services.coverage(kind, x, z)` for `school, high_school, university, clinic, hospital, police, fire,
park_small, park_large, plaza, power, water, garbage`, catching throws to 0. `economy.js:355` blocks growth when
`power < 0.5 || water < 0.5`. `grids.js:119` calls the three park kinds on a 64² grid.

**`ctx.modules.environment`** (present in every showcase): `setWeather(preset|obj)` · `getWeather()` ·
`getSunDirection()` · `getMoonDirection()` · `getLightDirection()` · `getExposure()` · `getNight()` ·
`setupMaterial(material)` — **must** be called on every custom `ShaderMaterial` so CSM shadows and fog uniforms are
injected — · `hookScene()` after staging · `refreshEnvironment()` · `presets` · `_debug()`.
Read `world.weather.night`, `.wetness`, `.exposure`, `.sunDir`, `.sunIntensity`, `.skyLight`, `.wind`,
`.cloudiness`, `.rain` — never set them. If `environment` is missing, materials must still compile as plain
`MeshStandardMaterial`; degrade, do not throw.

**Core** (`src/core/*.js`, exact): `ctx.rng` → `float() range(min,max) int(min,max) bool(p) pick(arr)
weighted([[v,w]…]) gauss() shuffle(arr) fork(label)`. `ctx.assets` → `pbr(name,{repeat})`,
`texture(url,{srgb,repeat,wrap,anisotropy,flipY})`, `hdri(name)`, `gltf(url)`, `applyPbr(mat,set,opts)`,
`procedural.noiseTexture({size,seed,octaves,scale,lo,hi,srgb,colorA,colorB})`,
`procedural.gradient({size,stops,horizontal,srgb})`, `procedural.noiseNormal({size,seed,scale,strength})`,
`procedural.solid(hex,size)`, `assets.anisotropy`, `assets.settle(ms)`.
`ctx.camera` → `camera`, `target`, `distance`, `presets`, `registerPreset(name, preset)`, `apply(preset)`,
`flyTo(preset, seconds)`, `enableControls(bool)`, `screenToGround(ndcX, ndcY)`.
`ctx.clock` → `hour`, `day`, `speed`, `paused`, `set(hour)`, `setSpeed(n)`, `sunElevation(hour?)`,
`sunAzimuth(hour?)`, `isNight(hour?)`. `ctx.engine` → `stats`, `onBeforeRender(fn)`, `onAfterRender(fn)`,
`onResize(fn)` (never `renderer.render`, never `setComposer`).
`constants` → `LAYERS.BUILDINGS = 3`, `LAYERS.PROPS = 4`, `RENDER_ORDER.BUILDINGS = 30`, `RENDER_ORDER.PROPS = 40`,
`RENDER_ORDER.UI3D = 200`, `TILE_SIZE = 128`, `QUALITY[ctx.quality]`, `BUDGET.perModuleDrawCalls.services = 60`.
`world.infoview` → `{active, data, legend, buildingTint(id)}` (stub; honour it anyway, item 18).

Asset policy (§10): the facade/clutter atlas, paving patterns, bay-line decals, plume sprite and coverage ramp are
**procedural** (canvas-drawn, seeded from `ctx.rng`); any photographic detail must be CC0 from Poly Haven or
ambientCG, added to `public/assets/manifest.json` and fetched with `tools/fetch-assets.mjs`. Colour space is
BUILDER.md's rule and is not restated here.

---

## 8. Showcase

`?showcase=services` initialises `environment`, `terrain`, `roads`, `zoning`, `buildings`, `simulation` and this
module. The stage is a **compact service district**, laid out by this module: it creates its own road grid through
`world.roads.addNode/addEdge` (pattern: `src/modules/zoning/showcase.js:stageRoads`), calls
`ctx.modules.roads?.rebuild?.()`, paints enough zoning for **140–180 free lots** and calls
`ctx.modules.buildings?.spawnFreeLots?.(160)` so there is a real demand load — then places services.
One reconciled number, because the two constraints do not actually conflict: `buildings` merges per 128 m chunk,
so ~150 houses over a ~400 m district is ~16–32 draw calls, and the scene sums to roughly
terrain 20 + environment 15 + roads 80 + zoning 10 + buildings ~30 + services 60 ≈ 215, inside the 300 of §5. If a
gauntlet `.json` still reads over 300 `drawCalls`, **cut lots, not services**.

It must contain, verifiable by `stats()`:

- **All 17 kinds, ≥ 1 of each**, and **≥ 22 items total**: the 17 plus 3 extra wind turbines (so the row below is
  ≥ 4) plus 2 extra parks — 17 + 3 + 2 = 22.
- A **utilities yard** on the west: coal plant (2 cooling towers + stack, all plumed), a wind row of ≥ 4 turbines
  on a ridge at differing rotor azimuths, a solar field, landfill and incinerator.
- A **water group** on the river: pump station with water tower ≤ 60 m from water, sewage outfall on the bank.
- A **civic street** on the east: clinic, hospital, school, high_school, university, police, fire, each on its own
  road frontage with parking, yards and marked access.
- A **green core**: large park with lawn/paths/water feature, small park, plaza with patterned paving and fountain,
  all fronting the same avenue as `$REF/cs2_4.jpg`.
- ≥ 4 facilities on ground sloping more than 1.5 m across their footprint (pad grading proof, item 6).
- ≥ 120 buildings on the surrounding blocks so `demand` is non-zero and `served.*` is meaningful — probe
  `world.buildings.items.size ≥ 120` after `spawnFreeLots(160)` (it returns fewer than its limit when the free
  lots run out, which is why the limit is 160 and the floor is 120).
- The coverage overlay **off** (`stats().overlay === null`).

**Staging coordinates — binding, because five items are graded through core presets this module does not own.**
`showcase.cameras` declares exactly the six names below and **overrides none of the core presets**
(`aerial|street|skyline|closeup`, `core/camera.js:22-29`), so the only way the graded content lands in those frames
is to build the district around them. The whole district fits a **560 × 560 m box centred on the world origin**:
at the core `aerial` preset (distance 520, target `[0,0,0]`, 45° vertical fov, 16:9, pitch 0.85) the visible ground
is `2 × 520 × tan(atan(tan 22.5° × 16/9)) ≈ 766 m` across and `2 × 520 × tan 22.5° / sin 0.85 ≈ 573 m` deep, so
±280 m fits both ways. Within the box:

- The **civic street** is an avenue on the centreline `z = 46`, running `x = −40 … 160`. The **clinic** stands on
  its north side with its footprint centre within 6 m of `(20, 20)`, entrance facing south. The core `closeup`
  preset (distance 110, target `[20, 6, 20]`) therefore looks at that facade from `(78, 44, 105)` — this is the
  frame item 7 and item 21 are graded in, and the rect `services.civic_facade` must be inside it. The core
  `street` preset (distance 60, target `[40, 0, 40]`) stands on the avenue's north verge looking north-west along
  the same frontages — the frame item 10 is graded in.
- The **green core** (large park, small park, plaza) is centred within 120 m of the origin, fronting that same
  avenue. It is graded only through the module's own `park` preset (item 5), never through `street`.
- The **utilities yard** is centred near `(−200, −60)`, framed by the module's `utilities` preset and 9.3° off the
  core `skyline` preset's axis at ~1.04 km (camera `(718, 183, −523)` looking at `[0, 40, 0]`), well inside its
  36.4° horizontal half-angle — so the cooling towers and turbine row are in `skyline_12` (item 1).
- The **water group** sits on the river bank inside the same box; `sewage` must be ≤ 60 m from water (§4.2).

Declared presets (`showcase.cameras`, registered through `ctx.camera.registerPreset`) — exactly these six names:

| Preset | Frames | Must read as |
|---|---|---|
| `utilities` | ~380 m over the utilities yard | cooling towers + plumes + turbine row + solar field in one frame |
| `plant_close` | ~110 m at the coal plant base | tower surface material, mouth, plume origin, coal yard, contact shadows |
| `civic` | ~260 m over the civic street | seven distinct plans, yards, parking, entrances, roof clutter |
| `park` | ~90 m street level in the large park | lawn tone, paths, ≥ 3 tree species, benches, lamps, hedge, water feature |
| `coverage` | ~700 m top-down over the district centre — at 700 m the ground is 1031 × 580 m, the smallest round distance that contains the 560 × 560 m box above (560 m of depth needs 560 / (2 tan 22.5°) = 676 m) | with `setCoverageOverlay('power')` on: gradient follows roads, no hard rim |
| `night_civic` | ~140 m at the civic street, shot at 22 | per-window lighting, floodlit yards, red stack lights, dark mass between |

### 8.1 The exact shot list the checklist is graded against

`tools/gauntlet.mjs` is a plain `cameras × times` cross product (default `aerial,street,skyline,closeup` ×
`6.5,12,17.5,22`, and it forwards only `--w/--h/--seed/--weather/--quality/--timeout`, **not `--crops`**) and
`tools/screenshot.mjs` accepts only `--showcase/--time/--camera/--seed/--w/--h/--out/
--measure/--quality/--weather/--modules/--speed/--url/--timeout/--crops` — **there is no `--eval` and no script
hook**, and
`ctx.camera` presets are inert data (`core/camera.js:36-52`), so no preset can turn anything on by itself. These
four commands produce every file the checklist names. Run them in this order (each `gauntlet` invocation rewrites
`summary.json` in `shots/services/r<n>/`, so the standard matrix goes last and owns the summary):

```bash
node tools/gauntlet.mjs --module services --round <n> --cameras utilities,plant_close,civic,park --times 6.5,12,17.5,22
node tools/gauntlet.mjs --module services --round <n> --cameras night_civic --times 22
node tools/screenshot.mjs --showcase services --camera civic --time 12 --w 1280 --h 720 \
  --out shots/services/r<n>/civic_12_720.png --timeout 240
node tools/gauntlet.mjs --module services --round <n>          # the standard 16: aerial|street|skyline|closeup × 6p5|12|17p5|22

# pinned-measurement shots. gauntlet.mjs does NOT pass --crops, so the five shots that carry a pinned
# statistic are re-taken to the SAME paths by screenshot.mjs, which writes <shot>.crops.json beside each PNG.
for s in closeup_12 civic_22 park_12 utilities_12 utilities_22; do
  node tools/screenshot.mjs --showcase services --camera "${s%_*}" --time "${s##*_}" --crops \
    --out "shots/services/r<n>/$s.png" --timeout 240
done
```

`screenshot.mjs` defaults to 1920×1080, which is what "full-resolution PNG" means throughout §4. The
`civic_12_720` shot above is for CRITIC.md's layout check only — **no pinned statistic may be read off it.**

Resulting files in `shots/services/r<n>/` (each with a sibling `.json`, and five of them with a sibling
`.crops.json`) — 34 PNGs:

| From | Files |
|---|---|
| preset batch | `utilities_6p5` `utilities_12` `utilities_17p5` `utilities_22` `plant_close_6p5` `plant_close_12` `plant_close_17p5` `plant_close_22` `civic_6p5` `civic_12` `civic_17p5` `civic_22` `park_6p5` `park_12` `park_17p5` `park_22` |
| night preset | `night_civic_22` |
| 720p | `civic_12_720` |
| standard matrix | `aerial_6p5` `aerial_12` `aerial_17p5` `aerial_22` `street_…` `skyline_…` `closeup_…` (16) |

**`coverage_12` is not a gauntlet shot** — nothing on the command line can enable an overlay, and item 14 forbids
the module enabling it for itself. It is captured by the critic's own Playwright session (`CRITIC.md`
§"Evidence, not impressions" already opens one), which turns the overlay on, applies the preset, shoots, and turns
it back off:

```js
await page.evaluate(() => { window.__sim.registry.apis.services.setCoverageOverlay('power'); window.__sim.setCamera('coverage'); });
await page.waitForTimeout(1200); await page.screenshot({ path: 'shots/services/r<n>/coverage_12.png' });
await page.evaluate(() => window.__sim.registry.apis.services.setCoverageOverlay(null));
```

(`window.__sim.setCamera(name)` is `core/debug.js:30`; `registry.apis` is `core/registry.js:8`. Open the page at
`?showcase=services&headless=1&time=12`.) The same session takes the `setCoverageOverlay('clinic')` variant for
item 4 and the 3-frame z-fight capture for item 14, and is where every page-evaluate probe in §4 runs.

How it must read across the four times:

- **06.5 golden hour** — long shadows rake across the cooling towers, the school yard and the park lawn, picking out
  every band, parapet and hedge; the plume catches warm light on its sun side and stays cool on the other; shadowed
  walls are cool-blue and readable (p1 > 0), no cream white-out on the sun side, no cyan cast on unlit surfaces
  (`effects_r1` issue 4).
- **12 noon** — full material read: concrete, render, ribbed metal, dark solar glass, gravel roof, mown lawn and
  paving are each identifiable; zero emissive; contact darkening at every base; plumes bright but not clipped
  (< 0.3 % of pixels at 255).
- **17.5 late afternoon** — sun on the other side; the solar field must show a broad soft sheen, not a sparkle
  field; the far end of the district loses contrast to aerial haze rather than only colour (`$REF/cs2_2.jpg`).
- **22 night** — the district goes dark and is drawn by its lights: window grids in the civic block, floodlight
  pools on the school yard and fire apron, red beacons on the stack and nacelles, plumes dimmed to ≤ 0.35 × their
  noon luminance and never brighter than the sky behind them. This is the shot the module is judged on, together
  with `utilities_12`.
