# Module spec: `transit`

Role files: `docs/prompts/BUILDER.md` (builders) / `docs/prompts/CRITIC.md` (critics). Everything invariant —
determinism, instancing, no per-frame allocation, blast radius, the screenshot loop, the scoring anchors — lives
there and is **not** repeated here. Read with `ARCHITECTURE.md` §2, §3, §4, §5, §6, §9, §10, §12, §15.

`$REF` = `/tmp/claude-0/-home-user-SimBuild/c06ed41b-9bdf-5ab7-ace6-40b62a5e4281/scratchpad/ref/` (`cs2_1.jpg` … `cs2_8.jpg`).

Round 1 spec. `src/modules/transit/index.js` is still the 11-line stub. There are no critic reports for this module
yet; §6 below is the list of traps the critics have already booked against `terrain`, `roads`, `environment`,
`effects`, `simulation` and `ui`. They are waiting here too.

**Standing assumptions, stated so nobody has to ask:**

- `?showcase=transit` initialises **core + `environment` + `transit` + `roads` + `traffic` + `props` + `ui` +
  `terrain`** (`selectModules` in `src/core/showcase.js` walks `dependencies` transitively; `roads` pulls
  `terrain`). Declare `dependencies: ['roads', 'traffic', 'props', 'ui']`.
- **`traffic` is a stub** (`src/modules/traffic/index.js`: `api: {}`). **`props` is shipped and it WILL populate
  this showcase** — do not plan around an empty scene. `props` declares `dependencies: ['terrain','roads']`,
  declares `budget: { drawCalls: 400, triangles: 1_900_000 }` (`src/modules/props/index.js:143-144` — that is the
  *declared* ceiling; the figure to plan the frame total against is props' **attributable** cost in a showcase
  shot, ≤ 120 draws and ≤ 700 000 triangles, `props.md:527/530`) and subscribes to
  `roads:changed` (`index.js:190`). `world.roads`'s `_bump()` emits `roads:changed` on **every** `addNode` /
  `addEdge` (`src/modules/roads/network.js:88-91`), so the moment transit's `showcase.setup` stages its grid,
  props flips `S.pending` and rebuilds 0.12 s later (`index.js:199`) into **transit's** scene:
  `scatterForest` at `minRoadDist: 24 m`, up to **16 000 trees** (6 000 at `quality=low`), plus street lamps,
  benches, bins, hydrants, signs — **and its own modelled `bus_stop` shelter with glass** on every `street` or
  `avenue` edge with `len > 66 m`, at 38 % probability, at `t = 0.42`, offset `asphaltHalf + sidewalk + 1.35 m`
  from the centreline (`src/modules/props/place.js:283-297`). On the staged 90 m grid that is roughly a third of
  all edges. Budget, framing and the duplicate-shelter rule in item 13 are all written against that reality.
- **Shelter ownership — which one wins.** `world.props.items` and `world.traffic.vehicles` belong to other
  modules; transit **never writes them**. Instead transit **adopts**: for every stop, transit reads
  `world.props.items` (a `Map<id, {id, kind, x, y, z, heading, scale, edgeId}>`, `props/index.js:44-55`),
  filters to `kind === 'bus_stop'`, and if one lies **within 6 m** of the stop it records that item's id as
  `propId` and **renders no shelter of its own there** — the props shelter is the shelter. Beyond 6 m transit
  renders its own fallback furniture and sets `propId: null`. This is the integration path that works **today**
  (`props.md:652` names it: *"`transit` reads `api.stops()` and `world.props.items` filtered by
  `kind === 'bus_stop'`"*), and item 13 grades it today, not as a future shim. Buses are transit's own instanced
  fleet until `traffic.spawnVehicle` exists; when it does, transit drives that record and renders no body of its
  own for that vehicle.
- `zoning`, `buildings`, `simulation`, `services` and `tools` are **not** in the transit showcase at all.
- **Lights: `BUILDER.md`'s lane rule applies** (ARCHITECTURE §4: only `environment` may add a light, touch
  `toneMapping`, the shadow map, `renderer.render` or a composer). The transit-specific delta: headlights,
  taillights, interior glow, destination blinds and the shelter lamp are **emissive geometry and projected
  decals**, never `PointLight` / `SpotLight`.
- Every graded shot runs on a **frozen clock**. `tools/screenshot.mjs` line 22 *defaults* `speed=0`
  (`speed: args.speed ?? '0'` — overridable with `--speed`), and `src/main.js:82` forces speed 0 whenever
  `--time` is given (`else if (params.time !== null) clock.setSpeed(0)`). Both paths are in play, and every
  gauntlet shot passes `--time`, so `clock.hour` is pinned at the requested hour while `update(dt)` keeps being
  called with real `dt`. Vehicle pose is therefore a **pure function of `world.time.hour`**, not an integration
  of real `dt`. So is `stats().boardings` (item 10). Anything integrated from `dt` makes the shot unrepeatable
  and is a fail (acceptance 8).
- Money: transit reports a `balance` per line for the HUD but **does not debit `world.economy.money`** —
  `simulation` owns that section and is not loaded here.

---

## 1. Purpose

Without `transit` the city has no public transport: no bus lines, no stops that mean anything, no coloured route
overlay, no vehicle that carries people instead of driving one person around — the HUD's Transportation category
and its transit line panel stay empty and CS2's most legible city-shaping system is missing.

## 2. World data owned

`world.transit` is created in `src/core/world.js` as `{ lines: new Map(), stops: new Map(), version: 0 }` and
ARCHITECTURE §15 says only *"Owns `world.transit`"*. This spec fixes the contract. It is chosen to match what
`src/modules/ui/hud.js` already reads (`_renderLines()`, lines 890–948) — those field names are frozen, because the
HUD is built and shipped and renaming any of them silently blanks the panel.

```js
transit: {                         // owner: transit
  lines: Map<id, {id, name, color, mode:'bus'|'tram', stops:[stopId], route:[edgeId], vehicles:int,
                  ridership:number, length:number, fare:number, balance:number,
                  headway:number, active:boolean}>,
  stops: Map<id, {id, name, x, y, z, heading, edgeId, side:'left'|'right', t,
                  lines:[lineId], waiting:number, propId:id|null}>,
  modes: ['bus','tram'],           // frozen array
  version: 0,                      // bumped on every mutating call
  createLine(mode, stopIds, opts) -> id | null,   // opts: {name, color, vehicles, fare}
  removeLine(id) -> bool,
  addStop(x, z, opts) -> id | null,               // opts: {name, edgeId, side, mode}; snaps to road frontage
  removeStop(id) -> bool,
  route(lineId) -> [edgeId],
  stopsNear(x, z, radius) -> [stop],
}
```

Field contract, enforced by probe:

- `id` integer ≥ 1, unique for the life of the session, never reused after removal. Line ids and stop ids are
  separate sequences.
- `name` non-empty string ≤ 24 characters (line: `"12 Riverside"`; stop: `"Market Square"`). The HUD prints these
  raw into a fixed-width panel — see acceptance 19.
- `color` a lowercase 7-character hex string drawn from the HUD's frozen palette
  (`src/modules/ui/hud.js:25`): `#2f8ff5 #e5484d #4cc25a #f5c542 #a66cf5 #34c3c7 #f28c28 #ff6fb1`. No two active
  lines share a colour while ≤ 8 lines exist.
- `stops` an ordered array of stop ids, ≥ 2 entries, first ≠ last (the loop is implicit, not duplicated).
- `route` an ordered array of ids present in `world.roads.edges`; consecutive entries share a node
  (`edges.get(a).b === edges.get(b).a` up to direction). Closed: the last edge reconnects to the first.
- `vehicles` integer 0…20 (the HUD stepper clamps to that range).
- `ridership` **passengers per game day — a daily total, never an instantaneous rate**, finite, ≥ 0, never `NaN`,
  and **constant across the hour** (`ridership` at 08:00 and at 02:00 are the same number; the hour-of-day demand
  curve is observed through `stats().boardings`, item 10, which is where every rate claim in this spec is graded).
  The HUD prints it as "N / day" and divides by `vehicles × 60 × 8` for utilisation (`hud.js`), so the panel reads
  it as a daily total too. `length` metres, `= Σ edge.length` over `route`
  ± 2 %. `fare` integer ¢. `balance` ¢ per game month, may be negative — `balance = 30 × (ridership × fare −
  vehicles × 900)`, i.e. both terms are per game **day** (`900` ¢ is one vehicle's daily running cost) and the
  whole expression is scaled by a 30-day month, which is the only reading under which a per-day `ridership`
  produces a per-month figure. `headway` seconds of game time between
  consecutive vehicles on the loop, `= length / (meanSpeed · vehicles)`, `Infinity` when `vehicles === 0`.
  **`meanSpeed`** (m/s of arc per second of game time, reported by `api.stats()`, pinned to **[4, 13] m/s** by
  item 8 so it cannot be a number the module invents about itself) is the *door-to-door* average
  over one full circuit and therefore **already includes the 6–12 s dwell at every stop** of item 7 — it is
  strictly less than the cruise speed. Every arc-rate claim in this spec is stated against `meanSpeed`; the
  per-vehicle `speed` in `vehicles()` is the instantaneous one and is `0` while `atStop`.
- Stop `x, z` metres world space; `y` = the **top of the sidewalk the shelter stands on**, not the terrain height.
  `heading` radians, **0 = north = −Z, increasing clockwise seen from above** (ARCHITECTURE §2); a stop faces the
  carriageway, so `heading` is the road tangent heading ± π/2 for its side.
- `t` ∈ [0,1] along `edgeId`, the same parameter `world.roads.sample(edgeId, t)` takes.
- `propId` the `world.props.items` key of the adopted `kind === 'bus_stop'` item within 6 m of this stop, else
  `null`. Adoption is a **read**, never a write into `world.props`. (If `props.place()` is ever implemented —
  §7 — a placed id goes here too, but that path does not exist today.)

Never replace the section (`world.transit = {…}` is forbidden — ARCHITECTURE §3). Mutate in place, bump `version`,
emit the event.

**Events emitted.** ARCHITECTURE §5 has no transit row, but `src/modules/ui/index.js:29` already subscribes to
`transit:changed`, so the name is fixed:

| Event | Payload |
|---|---|
| `transit:changed` | `{lines:{added:[id], removed:[id], updated:[id]}, stops:{added:[id], removed:[id]}}` |
| `audio:play` | `{sound, x, z, volume}` — door hiss / pull-away, at most 2 Hz, optional |

Emitted **after** the mutation completes, once per batch, never per frame. Consumed: `roads:changed` (re-route
every line within one frame; a line whose route no longer connects goes `active:false` and keeps its stops),
`terrain:changed` (re-seat stop `y`), `ui:action`, `time:tick`, `props:changed`, `app:ready`.

**`api` (reachable as `ctx.modules.transit`; `registry.js:15` stores `def.api` directly, so callers write
`ctx.modules.transit.setVehicles(…)`, not `.api.…`):**

```js
beginLine(opts) -> bool               // tools calls this: {mode:'line', kind:'bus'|'tram', lineId?}
addStopToDraft(x, z) -> stopId|null   // appends to the line being drawn; snaps to the nearest road frontage
commitLine() -> id|null ; cancelLine() -> void
createLine(mode, stopIds, opts) -> id|null ; removeLine(id) -> bool
setVehicles(id, n) -> bool            // clamped 0..20
setColor(id, hex) -> bool             // must be one of the 8 palette colours
setFare(id, cents) -> bool
setActive(id, on) -> bool
focus(id) -> bool                     // camera.flyTo a framing of that line's bounding box, 1.5 s
lines() -> [lineRecord] ; line(id) -> lineRecord|null ; stops() -> [stopRecord]
setOverlay(on|null) -> bool           // route ribbons + stop discs; null = auto (on when a line is selected)
vehicles() -> [{id, lineId, x, y, z, heading, edgeId, t, speed, occupancy, capacity, doorsOpen, atStop}]
stats() -> {lines, stops, vehicles, source:'traffic'|'own', shelters:'props'|'own'|'mixed',
            adoptedStops:int,        // stops whose shelter came from world.props.items (propId !== null)
            ridership, boardings,    // boardings = cumulative since midnight, a pure function of hour (item 10)
            occupancy, meanSpeed,    // meanSpeed: m of arc per second of game time, dwell included (§2)
            draws, tris, stepMs, routeMs, overlay}
cropRects({project, width, height, camera}) -> {bus, shelter, ribbon}   // pinned landmarks, see below
serialize() -> {version, lines:[…], stops:[…], overlay} ; deserialize(data) -> bool
```

**`api.cropRects` is mandatory** — it is the only sanctioned way to pin a pixel statistic to a thing rather than to
a hand-guessed box (ARCHITECTURE §8, `src/core/debug.js:41`). `window.__sim.cropRects()` collects it from every
ready module and `node tools/screenshot.mjs … --crops` writes the result to `<out>.crops.json` beside the PNG as
`{png, width, height, camera, time, rects: {"transit.<name>": [x, y, w, h]}}`, in pixels of the **full-resolution**
capture. Transit returns exactly three rects, each only when its landmark is on screen, each computed with the
supplied `project(x, y, z)` and clamped to the frame:

| Rect | What it encloses |
|---|---|
| `transit.bus` | the screen-space AABB of the bus nearest the camera (its 12 × 2.55 × 3.2 m box, all 8 corners projected), dilated by 8 px |
| `transit.shelter` | the same AABB for the stop nearest the camera — the adopted props shelter if `propId !== null`, else transit's own — dilated by 8 px |
| `transit.ribbon` | a 64 × 64 px box centred on the `#2f8ff5` line's ribbon at the midpoint of its longest straight edge |

Every pinned statistic in §4 is measured **inside one of these rects on the full-resolution PNG, never on a
downscaled copy** — a 480-px-wide copy of a 1920-px capture discards four pixels in every five across, and the
percentiles below turn into resampling noise. A missing or empty `crops.json` is a builder defect (`CRITIC.md`, "Pinned landmarks"), not a reason to grade the item by eye.

## 3. Visual/behavioural target

ARCHITECTURE §12/§15: *bus lines: create a line by picking stops (bus stop props), route via roads graph, buses run
the loop, passengers boarded from nearby buildings, line panel (ridership, colour). Stretch: tram/metro.* What that
means against the actual reference frames:

**The bus body — `$REF/cs2_5.jpg` is the model-quality bar.** That near-top-down car-park shot is the only
close-range vehicle reference and it sets the floor for anything transit renders itself. Every vehicle there has a
**clearcoat sheen running along the shoulder line and roof edge** — a long soft highlight, never a sparkle — and a
**glasshouse that is near-black and unmistakably separate from the body**, with a visible pillar between windscreen,
side glass and rear screen. Under the arches sit **wheels**: dark tyre, lighter hub, the tyre almost touching the
ground. At the rear there is a **red lamp cluster** and a **pale number plate**. Door shut-lines read as fine dark
creases. A SimBuild bus must clear that bar at `closeup`: a box on four cylinders is programmer art and scores 5.
A bus is ~12 m × 2.55 m × 3.2 m, three axles' worth of arches at most two axles used, two double door bays with a
recessed step, a roof with a raised HVAC hump and vents, a **destination blind panel** above the windscreen, and a
waistband painted in the **line colour** so the vehicle and its route read as the same object from the air.

**The stop — `$REF/cs2_8.jpg` (night, rain, downtown).** Look at the lamp post on the right: **blue vertical
wayfinding signs** stacked on the pole, lit shop signage, a bench on the sidewalk, and pedestrians walking past.
That is the density a stop must sit inside. The shelter itself: a slim four-post frame, a shallow cantilevered
roof, a **glass rear and one glass side panel with a visible frame**, a bench inside, a backlit **timetable panel**,
and a **flag pole carrying a disc in the line colour with the line number**. This is not a hypothetical bar:
`props` **already ships** a modelled `bus_stop` (`src/modules/props/furniture.js:151, 257`) and will place it in
this very showcase, so transit's own fallback shelter stands next to it in the same frame. It must match that
object, not undercut it — and where one is within 6 m, transit renders none at all (item 13).

**The route overlay — `$REF/cs2_1.jpg`.** The tool overlay in that frame is the template: a **white dashed
polyline** riding the ground exactly, a **translucent saturated blue fill** with a crisp edge over the roundabout,
and **small dark rounded chips** carrying values (`39 m`, `−7.7 %`, `¢616`). Nothing z-fights, nothing floats, the
overlay darkens what is under it rather than washing it out, and it is unmistakably *an overlay* — not paint. A
transit route ribbon is the same language in the line colour: a 1.8 m ribbon centred on the carriageway, ~55 %
opacity, a slightly darker 0.15 m outline, directional chevrons every 24 m, a filled disc + white ring at every
stop, and a chip above each stop carrying the line number and stop name.

**Aerial legibility — `$REF/cs2_3.jpg` and `$REF/cs2_7.jpg`.** In both, an active overlay is readable at 1000 m
distance because the colours are saturated and the shapes are big; the un-highlighted city desaturates behind it.
A transit overlay at `aerial` and `skyline` must be traceable end-to-end across the whole loop without the ribbon
breaking up, aliasing into dots, or drowning the asphalt underneath.

**Rail — `$REF/cs2_6.jpg`.** The tram/metro stretch goal has a reference: twin rails on a dark ballast bed with
sleepers, **catenary masts with a visible wire**, a concrete platform with a striped edge, and the vehicle's
livery reading in two colours. Note how the rails are *thin bright lines* even at 100 m — the highlight along the
railhead is the thing that sells them.

**Daylight and night, from `$REF/cs2_4.jpg` and `$REF/cs2_8.jpg`.** At golden hour bodies pick up a warm rim and
throw a long shadow with a contact shadow under the tyres. At night the bus is a **dark silhouette punctured by
lit windows and a lit destination blind**, with a warm interior wash on the ceiling, red taillights and a short
white headlight throw on the asphalt — the vehicle body must stay clearly darker than its own lights. Compare with
`docs/critic/effects_r1.json` ("Night is a milky blue dusk; only lamp heads ever glow") — the failure to avoid is
a bus that glows all over at 22:00.

## 4. Acceptance criteria

Graded exactly as written. Every item is checkable with a named instrument: a named screenshot, a rect in that
shot's `<out>.crops.json` (shoot with `--crops`; §2 lists the three rects transit pins), a field in the screenshot
JSON or the gauntlet `summary.json`, or a `page.evaluate` probe against `window.__sim`. Statistics taken inside a
crop are taken on the **full-resolution** PNG, never on a downscaled copy. Shot paths below are the gauntlet's
(`shots/transit/r<n>/<camera>_<time>.png`, e.g. `closeup_12.png`, `street_22.png`) plus this module's own presets
(§8). Ordered by how much each moves the score.

1. **Hard gates.** `errors: []` in every screenshot JSON including `--showcase all`; `modules.transit.status ===
   'ready'` in all **16** gauntlet shots — `node tools/gauntlet.mjs --module transit --round <n>` with its default
   4 cameras × `6.5,12,17.5,22`; **do not pass `--times 12,22`**, which produces 8 — plus every declared preset
   (§8), each shot with `node tools/screenshot.mjs --showcase transit --camera <preset> --time <h> --crops`;
   **≤ 20 draw calls and ≤ 260 000 triangles
   attributable to transit**, measured by the group A/B in §5 (not by `stats()` self-report, and not by
   subtracting a baseline that omits `props`); and the role-file hard gates hold (no `Math.random`, blast radius
   per `BUILDER.md`).

2. **The world contract is exactly §2.** Probe asserts, for every line and stop record: all listed keys present and
   of the listed type; `color` ∈ the 8-colour palette; `stops.length ≥ 2` with no duplicate id and
   `stops[0] !== stops.at(-1)`; every `route` id ∈ `world.roads.edges`; consecutive route edges share a node;
   `|length − Σ edge.length| / length ≤ 0.02`; `Number.isFinite(ridership|balance|headway||0)`; `vehicles ∈ [0,20]`;
   `stop.y − world.roads.sample(edgeId, t).y ∈ [0.10, 0.30]` m. Every `api` function in §2
   exists, is callable, and returns the documented shape; `version` strictly increases across any mutating call and
   `transit:changed` fires exactly once per batch (listener counts calls).

3. **The bus is a modelled vehicle, not a box** (`$REF/cs2_5.jpg` bar; evidence `bus_12.png` at ≤ 12 m, and
   `closeup_12.png`, both shot `--crops`). Inside `transit.bus` the following are individually identifiable:
   separate near-black glasshouse with
   ≥ 2 pillars; ≥ 4 wheels with a tyre/hub tone split, tyre-to-ground gap ≤ 0.04 m; two door bays reading as
   recessed; a roof hump/vent cluster; a headlight pair and a red rear lamp cluster; a destination blind panel; a
   waistband in the line colour ≥ 0.25 m tall running the full length. Body roughness ∈ [0.25, 0.45] with a
   clearcoat highlight that is a **stretched streak, not a sparkle**. Sparkle probe: on `bus_12.png` (the vehicle
   fills a useful fraction of the frame at ~10 m; at `aerial` a 12 m bus is ~30 px and the test would fire on lane
   markings and foliage instead), take the `transit.bus` rect from `bus_12.png.crops.json` and assert, on the
   full-resolution PNG inside that rect, that no pixel exceeds its 8-neighbour mean by > 40/255. ≥ 4 distinct body
   base colours across the fleet, deterministic from `ctx.rng`.

4. **Stops are modelled and correctly seated** (evidence `stop_12.png`, `stop_22.png`, `street_12.png`). At ≤ 10 m
   the shelter shows: four posts, a cantilevered roof with visible thickness ≥ 0.06 m, a framed glass rear panel
   and one glass side panel (transmission visible: the sidewalk behind reads through it), a bench, a timetable
   panel, and a flag pole with a line-colour disc. Seating probe: for every stop, raycast down from `y + 2` hits
   ground at `y ± 0.03 m`; no shelter footprint pixel is below the sidewalk surface by > 0.05 m.
   **Off the carriageway, measured by distance, not by a mask**: for every stop,
   `world.roads.nearestEdge(x, z, 40)` returns a hit whose `dist` satisfies
   `types[edge.type].asphaltHalf + 0.5 ≤ dist ≤ types[edge.type].asphaltHalf + types[edge.type].sidewalk`
   — i.e. the stop stands on the sidewalk, clear of the asphalt edge by ≥ 0.5 m and not out in the verge. With
   the shipped numbers (`network.js:6-10`) a `street` stop is 5.5–8.0 m from the centreline and an `avenue` stop
   8.5–12.0 m. **This band grades the stop record, not the adopted shelter.** `props` puts its `bus_stop` at
   `asphaltHalf + sidewalk + 1.35` (`place.js:290`) — 9.35 m on a `street`, 13.35 m on an `avenue` — i.e. 1.35 m
   out in the verge, *outside* the legal band by construction. So a stop with `propId !== null` still sits on the
   sidewalk inside the band and its adopted shelter stands ~1.35–2 m further out; that gap is well inside the 6 m
   adoption radius. Do not co-locate the stop record with the shelter it adopts, and frame the `stop` preset for
   two objects 1.35–2 m apart. The props shelter itself is never graded on this band.
   Also: not inside a crosswalk, and ≥ 3 m from any intersection centre in
   `ctx.modules.roads.intersections()`. Do **not** grade this with `world.roads.isRoad(x, z)` — it is a 4 m grid
   and off-contract (§7), too coarse for a sub-metre requirement; a correctly seated stop routinely lands in a
   cell marked `1`. Non-binding sanity check only.

5. **The route overlay reads like `$REF/cs2_1.jpg` and never z-fights** (evidence `aerial_12.png`,
   `overlay_12.png`, `skyline_12.png`). Ribbon width 1.6–2.2 m, opacity 0.45–0.65, drawn at
   `renderOrder = RENDER_ORDER.MARKINGS + 1 (= 22)` with `depthWrite = false`, `polygonOffset = true`,
   `polygonOffsetFactor ≤ −4`, `polygonOffsetUnits ≤ −4`, and vertices generated from `world.roads.sample(edgeId,t)`
   at ≤ 4 m spacing with `y` offset +0.02 m. Directional chevrons every 20–28 m. A filled disc (r = 1.6–2.4 m) with
   a white ring at each stop. Toggling `api.setOverlay(false)` changes ≥ 3 % of screen pixels at `aerial`
   (one page session, group-visibility style: capture, `api.setOverlay(false)`, wait 2 rAFs, capture, diff).
   **The ribbon stays on the carriageway** — graded in world space, not in pixels, because no road mask this repo
   ships resolves it (`isRoad` is a 4 m grid — item 4): every generated ribbon centre-line vertex satisfies
   `world.roads.nearestEdge(x, z, 40).dist ≤ types[edge.type].asphaltHalf − 1.25`, the 1.25 m being the widest
   ribbon's half-width (2.2/2) plus its 0.15 m outline — so the whole ribbon lies on asphalt even on an `alley`,
   whose `asphaltHalf` is 2.0 m and whose limit is therefore 0.75 m. Stop chips and discs are exempt.
   **No flicker**: two consecutive frames at the same
   camera differ by < 0.1 % of pixels on the ribbon area.

6. **Night is a lit vehicle in a dark scene, not a glowing one** (evidence `street_22.png`, `bus_22.png`,
   `stop_22.png`, `night_stop_22.png`, all shot `--crops`; every percentile below is taken inside `transit.bus` or
   `transit.shelter` on the full-resolution PNG). At 22:00: the bus body's unlit panels have `p50 ≤ 60/255`; the lit window
   band, destination blind and rear lamps each have `p99 ≥ 180/255`; the ratio of lit-element luminance to body
   luminance ≥ 3.0. Windows are individually lit with ≥ 2 warm/cool tints and ≥ 1 dark window per bus. Headlights
   throw a decal pool on the asphalt ≤ 14 m long that is elongated along the heading, not a round blob, and does
   not appear at 12:00. The shelter has a warm interior wash (its bench and rear panel measurably brighter than
   the sidewalk 4 m away, ratio ≥ 1.8) without a sprite halo — no additive quad whose centre exceeds its own
   emitter surface luminance. At 12:00 nothing on a bus or shelter is emissive (probe: every emissive intensity
   uniform is 0 within ±0.02 when `clock.sunElevation() > 0.15`).

7. **Buses run the loop, on the lane, with dwell.** Probe over 60 game-minutes stepped through `__sim.setTime`:
   every vehicle's `(x, z)` is within **0.35 m** of `world.roads.laneCenter(edgeId, lane, t)` for the lane it
   claims; `speed ≤ world.roads.types[edge.type].speed / 3.6` at all times; a vehicle's `t` advances monotonically
   along its route and wraps at the loop join with a positional jump < 0.5 m; each vehicle registers `atStop ===
   true`, `doorsOpen === true` and **`speed === 0`** for **6–12 s of game time** at every stop of its line, in
   order, and for no other position; vehicles on the same line are spaced **`length / vehicles` metres ± 20 %**
   apart in arc length (the same quantity as `headway × meanSpeed`, since §2 defines `headway = length /
   (meanSpeed · vehicles)` — seconds and metres are not interchangeable, so the check is stated in metres).
   No vehicle is ever on an edge not in its `route`. Dwell is not optional and item 8 is written to expect it:
   the two items are consistent because item 8 measures against `stats().meanSpeed`, which is defined (§2) to
   include this dwell.

8. **Screenshots are repeatable and time-driven.** Two consecutive `tools/screenshot.mjs` runs at
   `--camera closeup --time 12 --seed 1337` produce vehicle positions identical to **≤ 0.01 m** (probe compares
   `api.vehicles()` across two page loads) and PNGs whose mean absolute pixel difference is < 0.5/255. Holding the
   page at `speed=0` for 5 s changes no vehicle position by more than 0.01 m.
   **Pose is a pure function of the hour**: `pose(h)` for every vehicle, sampled via `__sim.setTime(h)`, is
   identical to ≤ 0.01 m on two separate page loads at the same seed, and revisiting an hour (12.0 → 12.25 → 12.0)
   returns every vehicle to within 0.01 m of where it was.
   **`meanSpeed` is pinned before it is used as a yardstick**: `stats().meanSpeed ∈ [4, 13] m/s`. Derivation, so
   the corners can be checked: the slowest legal fleet is the shortest staged loop, 1400 m (§8), cruising at
   8 m/s with 12 stops × 12 s dwell (item 7) — `1400 / (1400/8 + 144) = 4.4 m/s`; the fastest is bounded above by
   a `street`'s 50 km/h = 13.9 m/s with dwell subtracted, hence 13. Without this bound the identity below is
   self-referential — the module reports whatever its fleet does as `meanSpeed` and the identity holds for a bus
   crawling at 0.4 m/s.
   **Arc advance is then a consistency check on a pinned number**, graded against the dwell-inclusive average:
   with `L` the line's loop length, `((arcLength(pose(12.25)) − arcLength(pose(12.0))) mod L)` equals
   `((900 s × stats().meanSpeed) mod L)` to within **5 % of `L`** for every vehicle. Both sides are reduced mod
   `L` because 900 s of game time is more than one circuit — at the pinned floor, `900 × 4 = 3600 m ≥ 3500 m`,
   the longest staged loop — so the raw difference and the raw product are not comparable. That also gives the
   derived check: **every vehicle completes ≥ 1 full circuit between hour 12.0 and 12.25** — count `t` wraps
   while walking `__sim.setTime` from 12.0 to 12.25 in 0.01 h (36 s) steps. It is *not* graded
   against cruise speed or against the per-vehicle `speed` field; a fleet built with no dwell fails item 7, and a
   fleet graded against cruise speed fails nothing, which is why this item names `meanSpeed` explicitly. Any
   `dt`-integrated vehicle position fails this item outright.

9. **Routing is a real graph search over `world.roads`.** Probe: `api.createLine('bus', [s1, s2, s3])` on the
   staged network returns a route whose length is within **15 %** of the shortest connected walk through those
   stops (compare against a reference Dijkstra run in the probe over `world.roads.edges`); it never traverses the
   same edge twice in the same direction unless the graph forces it; it excludes `highway` edges for `bus` unless
   no alternative exists; it completes in `stats().routeMs ≤ 40` for a 24-stop line. Removing an edge with
   `world.roads.removeEdge(id)` and emitting `roads:changed` re-routes every affected line **within one frame**,
   leaves no vehicle on a dead edge, and sets `active:false` on a line that can no longer be closed.

10. **Ridership is modelled, bounded and legible.** `ridership` per line is derived from stop catchment — the
    number of `world.buildings.items` within **400 m road distance** of each stop, scaled by an hour-of-day
    activity curve with peaks at 07–09 and 16–19 — and, when `buildings` is absent (the transit showcase), from
    the staged catchment the showcase declares. Probe: every line's `ridership ∈ (0, 40_000)` passengers per game
    day and `occupancy ∈ [0,1]`.
    **The hour-of-day curve is graded on `boardings`, not on `ridership`** — `ridership` is a daily total (§2) and
    is the same number at every hour, so an "08:00 vs 02:00 ridership" test is not a test of anything. Instead:
    `boardings(9) − boardings(7) ≥ 2 × (boardings(3) − boardings(1))`, read off the same `__sim.setTime` walk
    below. That is the morning peak against the small hours, in the one field that varies with the clock.
    **How the day is integrated, since the clock is frozen** (there is no wall-clock day to accumulate over, and
    item 8 forbids anything driven by `dt`): the probe walks `__sim.setTime(h)` in **0.25 h steps from 0 to 24**
    and reads `api.stats().boardings` at each step. `boardings` is therefore, like vehicle pose, a **pure
    function of `hour`** reporting the **cumulative count since midnight** — not a per-frame counter, not an
    accumulator that advances when nobody calls `setTime`. `boardings(0) === 0`, the sequence is
    non-decreasing, and `boardings(24) === Σ ridership` over all active lines **± 5 %**. `occupancy` (items 6
    and 15) is read the same way: a pure function of the hour, at the same 0.25 h grid.
    `balance = 30 × (ridership × fare − vehicles × 900)` (¢/month — both bracketed terms are per game day, ×30
    for a game month; §2), finite, and reproduces exactly on reload.

11. **The HUD line panel is populated and correct** (evidence `lines_12.png`, plus the same shot at
    `--w 1280 --h 720`). `lines` is the **sixth declared preset** (§8) precisely so this item has a frame a
    command in this repo actually produces — `tools/screenshot.mjs` and `tools/gauntlet.mjs` can only shoot a
    registered preset, so grading this on an unregistered camera name would silently fall back to the default.
    §8 also requires `showcase.setup` to finish by calling `ctx.modules.ui?.showLines?.(firstLineId)`, so the
    panel is open in this shot rather than closed in every shot.
    The panel must be reading the **real section**: probe asserts
    `__sim.registry.apis.ui.hud.transitSource == null`, because `hud._lines()` (`hud.js:892`) prefers
    `this.transitSource` over `world.transit.lines` and a leftover demo source would make this item pass on
    fake data. Then: ≥ 3 lines listed, each with a colour dot matching `line.color`, its name, its stop count
    and its ridership; the detail block shows Vehicles / Length (km) / Ridership / Ticket price / Monthly balance
    with no `NaN`, no `undefined`, no `Infinity`; the stop list names every stop; the Buses stepper reads the real
    `vehicles`. Probe: `document.querySelectorAll('.sb-line').length === world.transit.lines.size` and
    `document.querySelector('.sb-linelist').textContent` contains no `NaN`.

12. **Every `ui:action` the HUD actually emits is handled.** `src/modules/ui/hud.js` emits
    `{action:'transit', args:[verb, …]}` with verb ∈ `newLine | select | setVehicles(id,n) | setColor(id,hex) |
    focus(id) | edit(id) | delete(id)` (lines 905, 912, 929, 934, 942–944) and `{action:'transitLines'}` (line 316).
    Probe emits each one on `ctx.events` and asserts the observable effect: `setVehicles` changes
    `world.transit.lines.get(id).vehicles` and the on-screen fleet count within 1 s; `setColor` repaints the ribbon
    and every waistband on that line; `delete` removes the line, its ribbon and its buses in the same frame;
    `focus` starts a `camera.flyTo` whose destination frames the line's bounding box. The alias vocabulary in
    `docs/prompts/modules/ui.md` (`transitLine(id)`, `transitEdit(id)`, `transitDelete(id)`, `transitBuses(id, n)`)
    is accepted as equivalent. **These HUD verbs are all real today and are graded unconditionally.**

    The draft flow is graded too, but **called directly, not through `tools`**: the probe calls
    `ctx.modules.transit.beginLine({mode:'line', kind:'bus'})` to put the module in draft mode; three
    `addStopToDraft` calls plus `commitLine()` create a working line; `cancelLine()` leaves `world.transit`
    byte-identical to before the draft. **The `tools` route is deferred and is not graded** — `tools` is a stub
    today (`api: {}`) and the shipped HUD cannot reach it anyway; §7 "Known broken link" has the detail and the
    instruction (file it, do not work around it).

13. **No duplicate shelters — graded against shipped `props`, today**, not as a future shim: `props` is live in
    this showcase and scatters its own `bus_stop` shelters (standing assumptions).
    - **Adoption:** probe asserts `stats().adoptedStops ≥ 1` and that `adoptedStops` equals the number of stops
      whose `propId !== null`. For **every** stop with `propId !== null`, transit's own group contains **no**
      shelter geometry within 6 m of that stop (probe walks
      `__sim.registry.modules.get('transit').group` and checks world-space instance positions), and the adopted
      id is a live key of `world.props.items` whose `kind === 'bus_stop'`.
    - **No double furniture:** for every entry of `world.props.items` with `kind === 'bus_stop'`, the count of
      shelter roofs within 6 m of it across **both** modules is exactly 1. A visual cross-check at `stop`:
      no stop in the frame shows two roofs, two benches or two glass panels.
    - **Nothing written into `props`:** `world.props.version` and `world.props.items.size` are unchanged by
      every transit api call in §2 (probe records both before and after).
    - `stats().shelters` reads `'props'` when every stop adopted, `'own'` when none did, `'mixed'` otherwise —
      all three are legal; the graded requirement is the absence of duplicates, not which source won.
    - **Vehicles still degrade forward:** `stats().source === 'own'` today. With a shim installing
      `spawnVehicle(kind, route)` / `despawn(id)` on `ctx.modules.traffic`, it reads `'traffic'`, transit renders
      **zero** duplicate bodies, and the same camera differs by < 8 % of pixels.
    - No `TypeError` in any mode: every cross-module call is `ctx.modules.x?.fn?.(…)`.

14. **Save / load round-trips** (ARCHITECTURE §15). `api.serialize()` returns plain JSON (no `Map`, no `Vector3`,
    no function) and `JSON.parse(JSON.stringify(x))` equals `x`. After `deserialize(serialize())` on a live scene:
    `world.transit.lines` and `.stops` are deep-equal, ribbons and buses are rebuilt with no leaked geometry
    (`__sim.stats().geometries` returns to ± 2 of its previous value), no console error, and vehicle positions
    match to ≤ 0.01 m at the same hour. `deserialize(null)` and `deserialize({})` return `false` and do not throw.
    **`propId` is re-derived, never trusted from the save.** `props.serialize()` stores only `{version, seed}`
    (`props/index.js:247`) and its `deserialize()` just re-runs `rebuild()`, so props item ids are regenerated
    and a saved `propId` may point at a different item or none. After `deserialize`, transit re-runs adoption by
    position; probe asserts every non-null `propId` is a live key of `world.props.items` with
    `kind === 'bus_stop'` within 6 m of its stop, and that `stats().adoptedStops` matches its pre-save value.

15. **Lines are identifiable from the air** (evidence `aerial_12.png`, `skyline_12.png`, `line_12.png`). ≥ 3
    simultaneous lines, each traceable end-to-end as one continuous ribbon at `aerial` (distance 520 m) without
    breaking into dashes or aliasing to < 1 px.
    **The three bus lines must use exactly `#2f8ff5` (blue), `#e5484d` (red) and `#4cc25a` (green)** from the
    HUD palette — named here because the palette also contains near neighbours (`#2f8ff5` against `#34c3c7` is a
    legal palette choice that would fail this item), and a colour test is not gradable if the builder picks the
    colours. Pairwise **CIE ΔE ≥ 25**, measured on the **composited ribbon pixels as rendered** — i.e. the
    line colour at its 0.45–0.65 opacity over the asphalt beneath, sampled inside `transit.ribbon` (§2) on the
    full-resolution `aerial_12.png` shot with `--crops`, not on the raw palette hex. `transit.ribbon` is pinned to
    the blue line; the red and green ribbons are sampled from the same PNG in a 64 × 64 px box centred on
    `__sim.project(x, y, z)` of a `world.roads.sample()` point on each of their routes (`debug.js:30`). Each bus's
    waistband matches its own line's composited ribbon colour to ΔE ≤ 8, measured inside `transit.bus`.
    **Stop discs at `aerial` (520 m) occupy ≥ 12 connected pixels each** — area, not extent, because a ground
    disc is an ellipse and any "≥ N px" phrased as a linear size passes or fails depending on which axis the
    grader measures. Count the connected component. The threshold is derived, not guessed: at fov 45° over
    1080 px the plate scale at 520 m is `1080 / (2 × 520 × tan 22.5°) = 2.5 px/m`, and `aerial`'s pitch 0.85 rad
    foreshortens the vertical axis by `sin 0.85 = 0.75`, so item 5's *smallest* legal disc (r = 1.6 m, 3.2 m
    across) covers `π/4 × 8.0 × 6.0 ≈ 38 px`. **Discs are not graded at `skyline`**: at 900 m and pitch 0.16 the
    same disc is 4.6 × 0.7 px ≈ 3 px of area, so no achievable disc could pass there — at `skyline` the graded
    thing is the ribbon. Where two lines share a road they run as **parallel offset ribbons**
    0.3–0.6 m apart, not overlapping into a third colour.

16. **Instanced, culled, LOD'd.** Probe `stats()`: buses, shelters, poles, discs and chevrons are `InstancedMesh`
    or merged geometry — `ctx.group.traverse` finds **zero** plain `Mesh` whose geometry is shared by another
    plain `Mesh`, and ≤ 12 plain `Mesh` nodes total. Route ribbons for all lines merge into ≤ 2 draw calls.
    **There is no 128 m chunking requirement here, deliberately.** The whole network fits in a 700 m box (§8) and
    the budget is 20 draws; splitting shelters, ribbons, chips and discs into ~30 tile-sized batches would cost
    more draw calls than item 1 allows, and the indicative split in §5 (shelter frame 1, shelter glass 1, ribbons
    1–2) is written for single merged batches. Chunk nothing; batch per surface.
    **Culling is graded directly, not by orbiting**:
    a 180° yaw at `aerial` cannot drop draws. The `aerial` frustum (fov 45°, distance 520, pitch 0.85) covers a
    ground patch about `2 × 520 × tan 22.5° = 431 m` high in the frame, i.e. ~766 m across at 16:9 and
    `431 / sin 0.85 ≈ 573 m` deep, against §8's 700 m network box — so a 180° yaw only swaps *which* corners of
    the network fall outside, and whatever leaves the frame at one yaw enters at the other. Instead:
    - every batch has `frustumCulled === true` and a **finite** bounding sphere — probe walks
      `__sim.registry.modules.get('transit').group`, calls `mesh.computeBoundingSphere()` on each `InstancedMesh`
      or `Mesh` and reads **`mesh.boundingSphere`**, and fails on any `NaN`/`Infinity` radius. Read the mesh's
      sphere, not `geometry.boundingSphere`: for an `InstancedMesh` the geometry's sphere is the single source
      bus (~6 m) however far the instance cloud is spread, so it tests nothing;
    - **point the camera away and the draws go:** `__sim.camera.apply({position:[1200,200,1200],
      target:[1200,0,1200]})` puts the whole network off-screen. Those coordinates are chosen to survive
      `_clamp()`, which limits target `x` and `z` **per axis** to `WORLD_SIZE/2 + 200 = 1224 m`
      (`camera.js:75`) — 1200 passes on both, leaving the target ~1700 m from the origin and the near corner of
      the network ~1200 m outside a near-top-down 200 m-distance frustum. Render a frame, then run the §5 A/B:
      transit's attributable draw calls must be **≤ 2**. Restore the camera afterwards.

    Buses have ≥ 2 LOD levels with a
    switch distance ≥ 140 m, and the switch is invisible: two shots with the camera nudged 2 m across the
    threshold differ by < 1.5 % of the pixels inside `transit.bus` (§2), both shot `--crops`.

17. **Shadows and contact** (evidence `closeup_6p5.png`, `street_12.png`). Every bus, shelter, pole and rail vehicle
    sets `castShadow = true` and `receiveShadow = true` (instanced meshes included; probe asserts it on every
    object in `ctx.group`). At 06:30 each bus throws a long shadow whose direction matches `world.weather.sunDir`
    to ± 5°, and there is a visible darkening under the body and the shelter roof (shadowed-ground p50 ≤ 0.55 ×
    lit-ground p50 in a 40 px sample either side of the shadow edge). No shadow acne on the bus roof or the
    shelter glass.

18. **No tiling, no washout, no crushed blacks** — the standing traps. "Transit pixels" is not a thing a PNG
    knows; get them from the §5 group toggle in **one** page session — capture, `group.visible = false`, await two
    rAFs, capture, and take every pixel with `|ΔL| > 6`. Over that region in `aerial_12.png` and `street_12.png`:
    `p1 ≥ 4/255` and `p99 ≤ 250/255`; no periodic repeat in a 2D
    autocorrelation of any bus or shelter material at a period < 64 px (measured inside `transit.bus` and
    `transit.shelter`, full resolution); the shelter glass, the bus glass and the
    asphalt under the ribbon each keep distinguishable tone (Δp50 ≥ 12/255 pairwise). Albedo textures are tagged
    `SRGBColorSpace`, normal/roughness/AO linear; any texture transit creates is listed in
    `public/assets/manifest.json` with `"license": "CC0"` or generated through `ctx.assets.procedural.*`.

19. **The 3D chips and labels survive 720p** (evidence `overlay_12.png` at `--w 1280 --h 720`). Chip screen-rects
    are computed in the probe, not guessed: name each chip object `chip:<stopId>` in `ctx.group` and project its
    world AABB corners with `__sim.project(x, y, z)` (`debug.js:30`) to get its rect at the shot's resolution.
    Chips are ≥ 11 px tall and ≤ 190 px wide at 1280×720, no two rects intersect
    by > 10 % of area, none overlaps the HUD's bottom toolbar band (bottom 96 px) or the left panel (left 340 px),
    are culled beyond 260 m, and cap at 16 on screen (the nearest 16 win). Names longer than 18 characters ellipsis
    rather than overflow. Nothing in transit's own DOM output — it should produce none; the line panel is `ui`'s.

20. **Determinism.** `BUILDER.md`'s determinism rules apply unchanged. Transit-specific: two loads at `?seed=1337`
    produce byte-identical `api.serialize()` output; `?seed=99` produces a *different* stop set (≥ 30 % of stop
    positions differ by > 5 m) but the same record count and no error.

21. **`--showcase all` is unharmed.** `node tools/screenshot.mjs --showcase all --camera aerial --time 12` reports
    `errors: []`, `modules.transit.status === 'ready'`, and total `drawCalls ≤ 1500`. In `--showcase all`,
    `init` alone must stage nothing: with no lines created, `ctx.group.children` renders 0 triangles and
    `stats().lines === 0`. Staging happens only in `showcase.setup` and via the api.

22. **Tram line (ARCHITECTURE §15 stretch; `$REF/cs2_6.jpg`).** *Lowest weight on this list — a miss here costs at
    most 0.3, so build items 1–21 first and add this in round 3+.* One `mode:'tram'` line, 400–900 m, on a reserved
    alignment beside or in the median of a staged avenue: twin rails whose railhead catches a specular highlight
    and reads as a thin bright line at `street` (60 m, where the plate scale is `1080 / (2 × 60 × tan 22.5°) =
    21.7 px/m` and a 0.15 m railhead is ~3 px; at `aerial` it is 0.4 px, so it is not graded there),
    sleepers on a darker ballast bed, catenary masts every 22–30 m carrying a
    visible wire, and a two-section articulated vehicle with a livery in the line colour. It obeys items 2, 6, 7,
    8, 14, 16 and 17 exactly as the bus does, on `world.transit.lines` with `mode === 'tram'`, and adds ≤ 5 draw
    calls and ≤ 60 k triangles. Platform edges are concrete with a striped warning strip, seated per item 4.

**What round 1 must clear.** Twenty-two items on top of an 11-line stub is more than one round; spreading thin
across all of them scores worse than clearing the first list cleanly. **Round 1: items 1, 2, 4, 5, 7, 8, 11, 13,
14, 20, 21** — the contract, the seating, the overlay, repeatability, the HUD, adoption, save/load and the gates.
**Round 2 is the quality pass: 3, 6, 9, 10, 12, 15, 16, 17, 18, 19.** **Item 22 is round 3+.** A round-1 build that
ships a box on wheels but a correct, seated, adopted, save/loading network is on track; one that ships twenty-two
half-items is not.

## 5. Budget

ARCHITECTURE §9 and `src/core/constants.js` (`BUDGET.perModuleDrawCalls.transit = 20`). Declare in `index.js`:

```js
budget: { drawCalls: 20, triangles: 260_000 }
```

**How transit's own draw calls are measured — the group A/B.** Do **not** subtract an
"environment+terrain+roads baseline" from `summary.json.maxDrawCalls`: this showcase also loads **`props`**
(declared 400 draws, `props/index.js:143`) and **`ui`** (`BUDGET.perModuleDrawCalls.ui = 5`,
`src/core/constants.js:23`), so that subtraction overshoots by hundreds and would fail a compliant module. And
do not fall back to `stats().draws`, which is transit reporting its own compliance — unfalsifiable.

Measure it with the renderer, by toggling transit's group. **The probe must be `async` and must await real frames.**
`__sim` exposes no `render()` / `step()`; `engine.render` writes `stats` at the end of each rAF render
(`engine.js:64`, `info.autoReset = true`), so two synchronous reads around `g.visible = false` return the *same*
number and `transitDraws` comes out 0 — the module would pass its primary budget gate unconditionally. Run it in
`page.evaluate` against a page loaded with `headless=1`, where `main.js`'s rAF loop keeps rendering even at
`speed=0` (`main.js:118-136`):

```js
const frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
const g = __sim.registry.modules.get('transit').group;
await frame();                            // two rAFs: the read is never taken on a frame rendered before the toggle
const on  = __sim.stats().drawCalls;      // engine.js:64 — this is renderer.info.render.calls
const onTris = __sim.stats().triangles;
g.visible = false;
await frame();
const off = __sim.stats().drawCalls, offTris = __sim.stats().triangles;
g.visible = true;
await frame();                            // restore, and leave the scene rendering as it was
const transitDraws = on - off;            // ≤ 20
const transitTris  = onTris - offTris;    // ≤ 260 000
```

That delta is attributable to transit by construction, is independent of every other module in the frame, and
cannot be self-reported. `stats().draws` must agree with it to ± 1 — a disagreement is itself a fail, because it
means the module is miscounting its own cost.

| Metric | Ceiling | Where measured |
|---|---|---|
| Draw calls (transit's own) | **≤ 20** | the group A/B above; `stats().draws` must match to ± 1 |
| Triangles (transit's own) | **≤ 260 000** | the same A/B on `__sim.stats().triangles`; the whole showcase frame stays ≤ 3 M |
| `update()` JS per frame | **≤ 1.2 ms** mean, **≤ 2.0 ms** worst frame | `__sim.stats().moduleMs.transit` over 300 frames at `aerial` |
| Route solve | **≤ 40 ms** for a 24-stop line, **≤ 120 ms** to re-route every line on `roads:changed` | `stats().routeMs` |
| Texture memory | **≤ 24 MB** (atlases ≤ 1024², one 2048² hero atlas allowed) | count uploaded textures × footprint |
| Init | **≤ 2.5 s** on a warm cache, staging included | `app:ready` timing in the screenshot JSON |
| Per-frame allocation | **zero** in `update()` (`BUILDER.md`) | heap probe: < 0.5 MB growth over 600 frames |

Indicative draw-call split (the builder may redistribute, not exceed): bus bodies 1, bus glass 1, bus emissives 1,
shelter frame 1, shelter glass 1, poles + flag discs 1, route ribbons 1–2, stop discs + chevrons 1, chips 1,
tram rails 1, sleepers/ballast 1, catenary 1, tram body + glass 2 = **≤ 15**, leaving 5 of headroom.

**Frame total, with `props` in the frame.** `props` scatters up to 16 000 trees into this showcase (standing
assumptions). It *declares* `{drawCalls: 400, triangles: 1_900_000}` (`props/index.js:143-144`), but the figure to
plan the frame total against is what its own spec holds it to in a showcase shot: **≤ 120 attributable draws and
≤ 700 000 attributable triangles** (`props.md:527/530`). Transit's 20 / 260 k
sit on top of that, plus terrain, roads, environment and ui. The whole-frame ceilings still apply — **≤ 1500 draw
calls and ≤ 3 M triangles** (ARCHITECTURE §9) — and item 21 grades them. If the staged grid pushes the frame over,
the fix is transit's own staging (fewer/shorter staged edges in §8), **never** reaching into `props` to turn its
scatter down: `setDensity` is not in props' shipped api (§7).

## 6. Known failure modes

Symptoms as they appear on screen, so no round is spent rediscovering them. The first eight are already booked
against neighbouring modules in `docs/critic/`.

- **Washed-out noon / milky golden hour** (`environment_r1`, `roads_r1`, `effects_r1`): the bus roof reads near
  white and the ribbon colour desaturates to pastel at 12:00 and 17:30. Clamp roughness ≥ 0.25 and never add a
  second exposure of your own.
- **Night that is really dusk** (`effects_r1`, `simulation_r1`): at 22:00 the bus body and shelter are fully lit
  and only the window quads are brighter. Drive every emissive from `clock.sunElevation()` / `world.weather`, and
  check the body p50 against item 6's number rather than eyeballing it.
- **Sprite glow brighter than its emitter** (`effects_r1`, `terrain_r1`): an additive halo quad around a headlight
  or a shelter lamp whose centre is brighter than the lamp face. Cap the halo at 0.6 × the emitter luminance and
  fade it with `pow(nDotV, 2)`.
- **Specular sparkle** (`roads_r1`): white pixel twinkle across the bus roof and glass at `aerial` and grazing
  angles, from a normal map without a roughness floor. Clamp, and mip the normal map.
- **Obvious tiling** (`environment_r1`, `simulation_r1`, `terrain_r1`): the shelter's glass or the bus livery
  repeating on a visible lattice. Use per-instance UV offsets and procedural macro variation.
- **Z-fighting / flicker** (`roads_r1`): the route ribbon and the road's own lane markings (render order 21) strobe
  against each other as the camera moves. Fixed by item 5's render order + polygon offset + `depthWrite:false`,
  not by raising the ribbon 10 cm into the air.
- **Floating or sunk objects** (`roads_r1`, `terrain_r1`): shelters hovering 20 cm over the sidewalk on a sloped
  street, or buses whose tyres are buried in the asphalt because `y` came from `terrain.getHeight` instead of
  `world.roads.sample(edgeId, t).y`. **Road surface, not terrain surface** — that is the single most likely
  blocker in this module.
- **UI overflow at 1280×720** (`ui_r1`): a 30-character line name or a 6-digit ridership pushing the HUD line panel
  past its column. Cap names at 24 characters, format numbers with `Intl.NumberFormat`, and shoot the 720p frame.

Transit-specific traps:

- **`dt`-integrated buses**: the shot is unrepeatable, two runs disagree, and under `speed=0` the fleet keeps
  crawling while the clock is frozen. Pose from `world.time.hour` (item 8).
- **The loop join**: the last stop's edge does not connect back to the first, so a bus teleports across the map
  once per circuit, or the ribbon has a visible gap at the join.
- **Ribbons drawn from stop-to-stop straight lines** instead of sampled road geometry: the overlay cuts corners
  across grass at every bend and floats off the carriageway on curves.
- **Buses sharing a lane index with oncoming traffic**: the fleet drives on the wrong side, or two lines' buses
  occupy the same lane centre and interpenetrate. Lane 0 is the rightmost in the `a → b` direction.
- **Dwell that stops the vehicle mid-carriageway** short of the stop, or that never opens the doors, so the bus
  appears to hesitate at nothing.
- **The HUD panel says "No transit lines yet"** because `world.transit.lines` was replaced with a plain object
  rather than mutated in place, or because ids are strings on one side and numbers on the other.
- **`NaN` in the panel** from a division by `vehicles === 0` when computing `headway` or `occupancy`.
- **Double shelters at every stop — the most likely visual blocker in round 1.** A builder who assumes `props` is
  a stub renders a fallback shelter at every stop and gets two roofs, two benches and two glass panels in the
  `stop` frame. Adopt within 6 m and render nothing of your own there (standing assumptions; item 13).
- **Building the showcase for an empty scene.** The same false premise ruins framing and budget: a `stop` or
  `bus` preset framed as if the sidewalk were bare ends up looking through one of props' trees. Frame against the
  populated scene, and check the frame triangle total (§5), not just transit's own.
- **Waiting for `props.place()` / `props.stops()`.** Neither exists (§7). Code that gates shelter adoption on
  them adopts nothing, and item 13 fails while `stats().shelters` cheerfully reports `'own'`.
- **Cross-module writes**: pushing bus records into `world.traffic.vehicles` or shelters into `world.props.items`.
  Forbidden — those sections belong to their owners.

## 7. Dependencies and their real APIs

`dependencies: ['roads', 'traffic', 'props', 'ui']`. `ctx.modules.<name>` **is** the module's `api` object
(`src/core/registry.js:15`), so call `ctx.modules.roads.rebuild()`, never `ctx.modules.roads.api.rebuild()`.
Every call outside `roads` and `world` is optional-chained.

**`world.roads` (`src/modules/roads/network.js`, installed on the section):**

```js
world.roads.nodes: Map<id, {id, x, y, z, edges:Set<id>}>
world.roads.edges: Map<id, {id, a, b, type, lanes, width, oneWay, ctrl?, length, elevation, trimA, trimB, bridge, ring}>
// world.roads.types — the full shipped record per type (src/modules/roads/network.js:6-11). asphaltHalf is
// what item 4 grades against; it is NOT width/2, so do not derive it.
world.roads.types: {
  alley:   {width:8,  lanes:1, speed:30,  sidewalk:2, asphaltHalf:2.0,  cornerR:4,  laneW:3.6, shoulder:0,   median:0,   oneWay:false},
  gravel:  {width:8,  lanes:2, speed:30,  sidewalk:0, asphaltHalf:4.0,  cornerR:4,  laneW:3.5, shoulder:0,   median:0,   oneWay:false},
  street:  {width:16, lanes:2, speed:50,  sidewalk:3, asphaltHalf:5.0,  cornerR:6,  laneW:3.8, shoulder:0,   median:0,   oneWay:false},
  avenue:  {width:24, lanes:4, speed:60,  sidewalk:4, asphaltHalf:8.0,  cornerR:8,  laneW:3.6, shoulder:0,   median:0,   oneWay:false},
  highway: {width:32, lanes:6, speed:100, sidewalk:0, asphaltHalf:16.0, cornerR:10, laneW:3.8, shoulder:1.9, median:2.4, oneWay:false},
  ramp:    {width:10, lanes:1, speed:60,  sidewalk:0, asphaltHalf:5.0,  cornerR:8,  laneW:3.8, shoulder:1.0, median:0,   oneWay:true} }
world.roads.addNode(x, z) -> id ; addEdge(a, b, type, opts) -> id ; removeEdge(id) ; removeNode(id)
world.roads.sample(edgeId, t) -> {x, y, z, tangent:{x,z}, normal:{x,z}} | null
world.roads.laneCenter(edgeId, laneIndex, t) -> {x, y, z, tangent} | null     // lane 0 = rightmost, a -> b
world.roads.frontage(edgeId) -> [{side:'left'|'right', from, to, x, z, heading}]
world.roads.nearestEdge(x, z, maxDist) -> {edge, t, point, dist} | null       // item 4 grades stop seating on .dist
world.roads.version                                                           // read to detect changes
```

`Network.install()` (`network.js:285-296`) installs exactly the eight functions above and nothing else.
**`world.roads.coverage` / `isRoad(x, z)` do exist** — but they are installed by the *builder*, not by
`install()`: `RoadBuild.buildCoverage()` (`build.js:513-559`, called from `build.js:121`) sets them on the
section during a rebuild, so they are `undefined` until `ctx.modules.roads.rebuild()` has run at least once.
Two caveats before relying on them: the mask is a **4 m grid** (`cell = terrain.cellSize`, i.e.
`WORLD_SIZE 2048 / 512`), and it returns **0 / 1 / 2** (none / asphalt / sidewalk) where ARCHITECTURE §3 line 99
advertises `0..1`. Too coarse and too off-contract to grade stop placement — item 4 uses `nearestEdge().dist`
instead. If a true sub-metre paved test is ever wanted, file it in `docs/core-requests/transit.md`.

**`ctx.modules.roads` (`src/modules/roads/index.js:56–95`, real and shipped):**

```js
rebuild() ; lampPositions(edgeId) -> [{x,y,z,heading,side,edgeId,t}]
intersections() -> [{id,x,y,z,roundabout,arms:[{edgeId,dir,trim,stopT,lanesIn,width,type,ring}]}]
nodeInfo(id) -> record|null ; stats() -> {edges,nodes,meshes,tris,bridges,terrainVerts,ms}|null
types() ; edges() -> [{id,a,b,type,len,bridge,ring}] ; edgeDebug(edgeId, step) ; _builder()
serialize() ; deserialize(data)
```

`lampPositions(edgeId)` is the sidewalk anchor used by `props` for lamps; **use its `y` for stop furniture** so the
shelter, the lamps and the kerb agree. Degrade: if it returns `[]`, use `world.roads.sample(edgeId,t).y + 0.15`.

**`ctx.modules.traffic` (spec `docs/prompts/modules/traffic.md` §2; the module is a stub today, `api: {}`):**

```js
spawnVehicle(kind, route) -> id|-1     // route: [edgeId,…] or {edges:[…], loop:bool}
despawn(id) -> bool ; vehicle(id) -> record|null
signalState(nodeId) -> {phase,greenArms,since,cycle}|null ; signals() -> [...]
flowGrid() -> {size:256, cellSize:8, data:Float32Array, version, index(x,z), sample(x,z)}
stats() ; setDensity(v) ; density()
```

Degrade to: transit's **own** instanced bus fleet, its own lane following, and no signal compliance (buses simply
do not stop at junctions). `stats().source === 'own'`. Never fabricate `world.traffic.vehicles` entries.

**`ctx.modules.props` — SHIPPED. Read this block carefully; most of what `props.md` documents does not exist yet.**

**Real today** (`src/modules/props/index.js:234-249`, verified against the source — this is the entire api):

```js
rebuild() -> void                      // re-scatter everything; props calls it itself on roads:changed
stats() -> {trees, props, forest, lamps, signals, ms, …TreeField.stats()}
lamps() -> [{x, y, z}]                 // luminaire positions only — no heading/edgeId/side
signalState(nodeId) -> {phase0, phase1, phase} | null
count() -> int                         // world.props.items.size; takes NO kind argument
serialize() -> {version, seed} ; deserialize() -> void   // deserialize just re-runs rebuild()
```

**The integration path that works today is a world read, not an api call:**

```js
// world.props.items — Map<id, {id, kind, x, y, z, heading, scale, edgeId}>  (props/index.js:44-55)
for (const it of ctx.world.props.items.values())
  if (it.kind === 'bus_stop') { /* candidate shelter to adopt within 6 m of a stop */ }
```

`props.md:652` designates exactly this as transit's read. Adopt (set `propId`, render no shelter of your own),
never write — `world.props.items` is props'. Note `props.serialize()` stores only `{version, seed}`, so adopted
ids are **rebuilt, not persisted**: on `deserialize`, re-run adoption by position rather than trusting a saved
`propId` (item 14).

**Planned but NOT implemented — feature-detect, never assume** (`props.md` §2 calls these "the wave-2/3
contract"; none of them are on the shipped object, so every one is `undefined` today):

```js
place(kind, x, z, opts?) ; remove(id) ; at(x, z, radius) ; count(kind) ; setDensity(v)
stops() -> [{id, x, y, z, heading, edgeId, side, t}]      // props.md:103 "transit reads this"
lampsFor(edgeId) ; signals() ; signalFor(edgeId, atA)
```

Call them only as `ctx.modules.props?.stops?.()` with a working fallback behind every one. When `stops()` does
land, prefer its entries as candidate stops; until then, the `world.props.items` filter above is the whole story.
`count()` **does** exist but ignores a `kind` argument — `count('bus_stop')` returns the total item count, not the
shelter count. Count kinds yourself off `world.props.items`.

**`ctx.modules.ui` (`src/modules/ui/index.js:64–76`, real and shipped):**

```js
notify(n) ; showInfo(sel) ; hideInfo() ; setCategory(id) ; setSource(src) ; setCityName(name)
openMenu(kind) ; closeMenu() ; setPhotoMode(on) ; setInfoview(name) ; showLines(id) ; toast(t)
serialize() ; deserialize(d) ; get hud
```

Transit calls `showLines(id)` and `notify({type,title,body,ttl})` only. The panel itself is `ui`'s DOM; transit
supplies the data through `world.transit.lines` and the `transit:changed` event. Degrade: with `?nohud=1` or `ui`
missing, everything still works headlessly.

**`ctx.modules.tools`** (not a declared dependency; a stub today, `api: {}`): when it ships it will call **into**
transit via `ctx.modules.transit?.beginLine?.(opts)` (`tools.md:93-95`, `ACCEPTED` list). That spec has the
convention right — it says "**no `.api`**" explicitly. Transit only has to accept the call.

**Known broken link, do not work around it in transit.** The shipped HUD cannot reach `tools` at all:
`hud.js:456-458` does `tools?.api?.select?.(name, opts)`, but `ctx.modules.tools` **is** the api object
(`registry.js:15`), so `.api` is `undefined` and the call silently no-ops — the "New line" button and "Edit
route" never reach the tool. That is a one-line `ui` defect, not transit's. Record it in
`docs/core-requests/transit.md`; do **not** patch around it by exposing a self-referential `api.api = api`,
which would make the wrong convention work and entrench it across sixteen modules. Item 12 grades the draft flow
by calling `ctx.modules.transit.beginLine(…)` directly.

**Core (`src/core/*.js`, exact):**

```js
ctx.world.terrain.getHeight(x,z) -> m ; getNormal(x,z,out?) ; getSlope(x,z) ; isWater(x,z) ; raycast(ray)
ctx.clock.hour ; .day ; .speed ; .paused ; set(h) ; setSpeed(n) ; sunElevation(hour) ; sunAzimuth(hour) ; isNight(hour)
ctx.camera.camera ; .target ; .distance ; .presets ; apply(preset) ; flyTo(preset, seconds) ;
                    registerPreset(name, preset) ; screenToGround(ndcX, ndcY)
ctx.assets.pbr(name, {repeat}) -> Promise<{map,normalMap,roughnessMap,aoMap,displacementMap,metalnessMap,armMap,entry}>
ctx.assets.hdri(name) ; gltf(url) ;
ctx.assets.procedural.noiseTexture(opts) ; gradient({size,stops,horizontal,srgb}) ;
                     noiseNormal({size,seed,scale,strength}) ; solid(hex,size)
ctx.rng.float() ; int(a,b) ; range(a,b) ; bool(p) ; pick(arr) ; weighted([[v,w],…]) ; gauss() ; shuffle(arr) ; fork(label)
ctx.events.on(name, fn, 'transit') ; off ; once ; emit(name, payload)
ctx.engine.stats ; onBeforeRender(fn) ; onAfterRender(fn)          // never setComposer, never render
ctx.world.weather.sunDir ; sunIntensity ; skyLight ; rain ; wetness ; fogDensity   // read only
constants: LAYERS.VEHICLES = 5, LAYERS.PROPS = 4, RENDER_ORDER.MARKINGS = 21, RENDER_ORDER.VEHICLES = 50,
           TILE_SIZE = 128
```

Core changes go in `docs/core-requests/transit.md`; work around them meanwhile.

## 8. Showcase

`showcase.description`: *"Three bus lines and one tram line over a staged street grid: 18 sheltered stops, a
terminus interchange, coloured route ribbons and a running fleet."*

**The scene `showcase.setup(ctx)` must stage,** all deterministic from `ctx.rng.fork('showcase')`, all built through
`world.roads.addNode/addEdge` followed by `ctx.modules.roads.rebuild()` so the asphalt underneath is the real roads
module and not a grey plane:

- A road network centred on the origin: a 4×4 `street` grid on ~90 m spacing, one east–west `avenue` through
  `z ≈ 40` for the tram, one gently curved `street` on the east side, and one `alley` — roughly the shape of
  `src/modules/roads/showcase.js`'s grid, re-staged by transit so it owns its own scene.
- **≥ 18 stops** across the network, spaced 220–320 m along each **bus** line (tram platforms sit 100–225 m apart,
  being ≥ 4 on a 400–900 m alignment, item 22), always on the sidewalk, never within 3 m of
  an intersection centre, at least two of them **shared by two lines** (an interchange) and at least one pair
  facing each other across the same street.
- **3 bus lines** in **`#2f8ff5`, `#e5484d` and `#4cc25a`** (the three item 15 grades ΔE on — not builder's
  choice, since the palette also holds near neighbours), **1.4–3.5 km** each, 6–12 stops each (1.4 km, not 1.2:
  the 6-stop minimum at the 220 m minimum spacing above is already 1320 m, so a shorter loop cannot satisfy both
  bounds), and **≥ 10 buses
  total** spread across them by `headway`, so no camera at any standard time sees fewer than **2** buses.
- **1 tram line** on the avenue alignment (item 22), 400–900 m, ≥ 4 platform stops.
- A staged catchment for ridership when `buildings` is absent: a declared array of pseudo-building weights per stop
  so item 10's numbers are real and reproducible, not constants.
- **Staged against a populated scene, not a bare one.** Every `addNode`/`addEdge` here fires `roads:changed`, so
  `props` rebuilds ~0.12 s later and fills this scene with trees, lamps, benches, signs and its own `bus_stop`
  shelters (standing assumptions). Consequences the setup must handle: **(a)** the interchange and the
  `stop` / `bus` framings must still read with furniture and trees around them, not through a trunk; **(b)** stops
  placed within 6 m of a props shelter are adoption sites, and the showcase should deliberately create **at least
  three** of them so item 13 has something to grade (`stats().adoptedStops ≥ 3`); **(c)** the frame total, not
  just transit's own, must stay under §9's 1500 draws / 3 M triangles (§5).
- Framing for the **core presets**, which the critic shoots by default: put the interchange terminus and its
  shelters at `(40, 40)` so `street` (target `[40,0,40]`, distance 60) lands on a shelter with a bus at it; put a
  bus at rest and a stop disc near `(20, 20)` so `closeup` (target `[20,6,20]`, distance 110) frames a vehicle;
  keep the full network inside a 700 m box centred on the origin so `aerial` (distance 520) and `skyline`
  (yaw 2.2, distance 900, target `[0,40,0]`) both hold the whole overlay.

**`showcase.setup` must finish by opening the line panel**: `ctx.modules.ui?.showLines?.(firstLineId)`, so the
HUD's transit panel is open in every shot rather than closed in all of them (item 11 is graded on a picture, and
nothing else in the pipeline opens that panel). Leave `hud.transitSource` untouched — `null` is what makes the
panel read the real `world.transit.lines` (`hud.js:892`).

**`showcase.cameras` must declare exactly these six presets** (registered by `main.js:95/98`, so the critic can
shoot `--camera <name>`; an unregistered name silently falls back to the default, which is why item 11's frame
has to be on this list):

| Preset | Framing | Purpose |
|---|---|---|
| `stop` | position `[52, 6.5, 56]`, target `[40, 2.2, 42]` | one shelter at ~8 m with a bus docked, doors open — the model-quality shot (items 3, 4, 6) |
| `bus` | position `[26, 5.5, 30]`, target `[20, 1.8, 20]` | a single bus at ~10 m, three-quarter rear, waistband + lamps visible (items 3, 6, 17) |
| `line` | position `[-40, 210, 300]`, target `[20, 0, 20]` | the whole of one line's loop from ~250 m, ribbon traceable end-to-end (items 5, 15) |
| `overlay` | position `[0, 300, 380]`, target `[0, 0, 40]` | all four routes plus stop discs and chips; also the 1280×720 shot (items 5, 15, 19) |
| `night_stop` | position `[48, 5.0, 52]`, target `[38, 2.2, 40]` | the `stop` framing tightened for 22:00: lit blind, lit interior, shelter lamp, headlight pool (item 6) |
| `lines` | position `[120, 150, 260]`, target `[30, 0, 30]` | the HUD shot for item 11: the open left panel (left 340 px) clear of the staged network, which sits right of centre with ≥ 3 ribbons and a bus visible. Must read at 1280×720 as well as 1920×1080 |

**How it must read** (`node tools/gauntlet.mjs --module transit --round <n>`; critics shoot **12 and 22** by
default plus golden hour **06.5**, and `17.5` is in the standard matrix):

| Camera | 06.5 | 12 | 17.5 | 22 |
|---|---|---|---|---|
| `aerial` (520 m) | long bus shadows across the grid, warm rim on roofs; ribbons still saturated against low-sun asphalt | all 4 ribbons traceable, ≥ 2 buses per line, stop discs crisp, no tiling in the asphalt or liveries | warm side light, ribbon colours hold, no bloom smear over the overlay | ribbons dim but readable, buses are dark bodies with lit window bands, shelter lamps make small warm pools; no ribbon glow |
| `street` (60 m) | shelter and bus rim-lit, contact shadow under tyres and shelter roof | glass reads through, bench and timetable visible, kerb–shelter seating clean | shadows lengthen east, glass picks up sky reflection | headlight pool on asphalt, lit blind readable, body clearly darker than its lights |
| `skyline` (900 m) | overlay reads across the whole city silhouette | 3 colours distinguishable, ribbons unbroken (discs are sub-pixel here and are graded at `aerial`, item 15) | haze between camera and far ribbons, no colour banding | ribbons and bus windows are the only transit light; nothing blooms |
| `closeup` (110 m) | wheel/hub split, panel shut-lines, roof hump visible | glasshouse separate from body, door bays recessed, waistband colour = ribbon colour | clearcoat streak along the shoulder, not a sparkle | ≥ 2 window tints per bus, ≥ 1 dark window, red rear cluster |

`--showcase all` must stage **nothing** from transit (item 21): `showcase.setup` is the only place scene content is
created; `init` builds materials and empty instanced buffers only.
