# Module spec: `props`

Multi-round spec (rounds 1–4). **The starting state of round `n` is whatever `docs/critic/props_r<n−1>.md`
records, plus the working tree as it stands; round 1 starts from the pre-spec build already in
`src/modules/props/`** — eight files (≈ 110 KB) that contradict this spec: an `api` of
`{rebuild, stats, lamps, signalState, count, serialize, deserialize}`, `count()` with no kind argument, an
*exported* `signalState(nodeId)` (the exact function §2 says props must **read** from traffic), presets
`lamps_night/forest/crossing/bench/canopy`, and `budget.triangles = 1_900_000` (`index.js:144`). §2, §5 and §8 are
normative: bring the `api` to §2's shape, replace the exported `signalState` with `signals()`/`signalFor()`, drop
the triangle budget to §5's 900 000, replace the presets with §8's eight. Never assume the module is empty: read the previous critic file and `src/modules/props/` before
planning, and treat anything already there that contradicts §2 or §4 as work to fix, not as prior art to preserve. Read with `BUILDER.md` / `CRITIC.md`
(invariants live there and are **not** repeated here) and `ARCHITECTURE.md` §3, §4, §5, §6, §9, §10, §12, §15.

`$REF` = the CS2 reference frames `cs2_1.jpg` … `cs2_8.jpg`, resolved in this order: `$SIMBUILD_REF` if set, else
`~/.simbuild/ref/`, else `/tmp/claude-0/-home-user-SimBuild/<session-uuid>/scratchpad/ref/` (the legacy
session-scoped path — it does **not** survive into a new session). The frames are not in the repo and must not be
(ARCHITECTURE §10: CS2 screenshots are never stored here); re-fetch them from the Steam store URLs recorded
alongside `docs/reference/CS2-LOOK.md` if they are missing. **If they cannot be resolved, §3's prose descriptions
are the normative statement of each anchor and the round proceeds against those** — a missing `$REF` is never a
reason to stop, to ask, or to skip an item. (Repointing `$REF` off the session scratchpad is a project-wide edit —
`CS2-LOOK.md` plus the `$REF` line of every module spec — and is out of scope for a props round.)

Standing assumptions, stated so nobody has to ask:

- `dependencies: ['terrain', 'roads']`. The props showcase therefore runs with **core + environment + terrain +
  roads + props only**. There are no buildings, vehicles or pedestrians in frame — `buildings`, `traffic` are not
  initialised under `?showcase=props`. Every CS2 comparison below is made against the **trees, hedges, lamps,
  signals, signs, benches, bins, fences, planters and bus stops** of the reference frames, never against the
  buildings or cars in them.
- **`props` may not add a `THREE.Light` of any kind** (ARCHITECTURE §4: only `environment` may). ARCHITECTURE §12's
  "real point lights only near camera" is **superseded by §4 for this project**: night lamp light is delivered by
  (a) an emissive luminaire head, (b) a small camera-facing halo billboard at the head, and (c) an additive
  **ground light-pool decal** projected onto the road/sidewalk under each lamp. Item 6 grades exactly that. If the
  builder wants real point lights, it files `docs/core-requests/props.md` and **ships without them meanwhile**.
- `environment` owns exposure, tone mapping, fog and the CSM. Props compensates in **albedo, AO, alpha and
  geometry**, never by touching `toneMapping`, `toneMappingExposure`, `scene.fog`, the shadow map, `renderer.render`
  or the composer.
- Props is the only module that may write `world.props`. It **reads** `world.roads`, `world.terrain`, `world.zones`,
  `world.buildings` and `world.weather`, and writes none of them — with one exception: inside
  `showcase.setup(ctx)` it may stage a road network through the public `world.roads.addNode/addEdge` API (as
  `buildings` and `zoning` stage theirs). Never in `init` or `update`.
- `buildings` already generates **its own lot hedge and lot fence** (`generate.js`: `p.hedge`, `p.fence`). To avoid
  doubled boundaries in `?showcase=all`, props places `fence`/`hedge` **only** on lots with `lot.buildingId == null`,
  around parks/plazas, and in its own showcase. Feature-detect `world.buildings.items?.size`.
- **Signal phase clock: props renders the heads, traffic decides the phase — a handover, not a freeze.**
  `traffic` owns the signal state machine (`docs/prompts/modules/traffic.md` §2); this spec does not contest that.
  Props runs its own phase clock **only while `ctx.modules.traffic?.signalState` is absent** — which is always
  true under `?showcase=props`, since `traffic` is not in `dependencies`. The moment that function exists, props
  **reads it every frame** and drives every lens from it, and `api.signalFor(edgeId, atA)` becomes a thin
  read-through of `ctx.modules.traffic.signalState(nodeId)`. Props never runs a competing clock in
  `?showcase=all`, never writes back to traffic, and never rebuilds geometry across the changeover — it is a `?.`
  check per frame, re-confirmed on `module:ready` and `props:changed`. Props' `signals()` is a **superset of
  traffic's** (`traffic.md:101`): the fields `{nodeId, x, z, arms:int, phase:int, greenArms:[edgeId]}` are
  identical in name and meaning in both, so a consumer written against either shape reads both. Item 10 grades
  both branches. (Traffic's own masts disappear when a `trafficlight` item exists in `world.props.items`
  — `traffic.md` item 22 — so after props ships, props renders and traffic decides.)
- Screenshots are taken with `speed=0` (clock pinned by `?time=`). **All animation phase — wind sway, and the
  signal cycle whenever props is the one running it — must be a pure function of
  `world.time.day`/`world.time.hour`, never accumulated from real `dt`, `Date.now()` or `performance.now()`.**
  (When traffic supplies the phase, props reads it and adds nothing of its own.) Two loads at the same `?time=`
  and `?seed=` must produce the same frame.

---

## 1. Purpose

Without `props` the city has no life at ground level and no light at night: bare roads with nothing lining them, bare
lots, an unforested landscape, and a black street after sunset.

## 2. World data owned

Implement exactly this on `world.props` (mutate in place; **never** `world.props = {…}`). Signature copied from
ARCHITECTURE §3:

```js
props: {                           // owner: props
  items: Map<id, {id, kind, x, y, z, heading, scale, edgeId?, lotId?}>,
  kinds: ['streetlamp','trafficlight','tree_oak','tree_pine','bench','bin','hydrant','sign','bus_stop','fence','bush','planter'],
  version: 0,                      // bump on any change
}
```

`items` values may carry **additive** extras (`species`, `variant`, `side`, `t`, `nodeId`, `tint`, `lod`); the
twelve `kinds` strings above are frozen — every one of them must be present in `items` in the showcase, and the
array must not be reordered, extended or renamed. Sub-types live in an extra field, never as a new `kinds` entry:
tree species are `{kind:'tree_oak', species:'oak'|'maple'|'birch'|'poplar'|'willow'|'blossom'}` and
`{kind:'tree_pine', species:'spruce'|'fir'}` — the `species` **strings** are additive and extensible (unlike
`kinds`), and these eight are the ones §3's size table dimensions and item 2's five silhouettes assume; **a clipped hedge is `{kind:'fence', variant:'hedge'}`** and a built fence is
`{kind:'fence', variant:'slat'|'railing'|'wall'}`; ornamental lamps are `{kind:'streetlamp', variant:'lantern'}`.

`api` (reachable as `ctx.modules.props`) — this is the wave-2/3 contract; `transit` consumes it and `traffic`
interoperates through it (see the signal-clock handover in the preamble):

```js
place(kind, x, z, opts?) -> id | -1     // opts: {heading, scale, species, edgeId, lotId, y}; snaps y to terrain/sidewalk
remove(id) -> bool
at(x, z, radius = 2) -> [item]
count(kind?) -> int
rebuild() -> void                        // re-derive all rule-placed props from roads/zones/terrain; idempotent
stats() -> {items, byKind:{…}, instances, draws, tris, chunks, species, ms,
            radii:{kind: metres}}         // footprint radii, exactly §4 item 3d's table — item 3d reads these
lampsFor(edgeId) -> [{id,x,y,z,heading,side,t}]
signals() -> [{nodeId, x, y, z, arms:int, phase:int, greenArms:[edgeId], cycle, source:'traffic'|'props',
               armStates:[{edgeId, atA, state:'red'|'amber'|'green', timeToChange}]}]
     // the first six fields are traffic's signals() shape verbatim (traffic.md:101); armStates is props' extra
signalFor(edgeId, atA) -> {state:'red'|'amber'|'green', timeToChange, source:'traffic'|'props'} | null
     // pure read-through of ctx.modules.traffic.signalState(nodeId) whenever traffic is present (preamble)
stops() -> [{id, x, y, z, heading, edgeId, side, t}]                             // transit reads this
setDensity(v)                            // 0..1 global scatter density multiplier (quality/perf); item 23 uses it
cropRects({project, width, height, camera}) -> {name: [x, y, w, h]}   // §4's pinned landmarks; ARCHITECTURE §8
serialize() -> {version, items:[{id,kind,x,z,heading,scale,species,edgeId,lotId}]} ; deserialize(data)
debug: { setKindVisible(kind, bool), setLod(level|null), setSway(bool), setPools(bool), lodHistogram() }
```

`debug.setKindVisible` / `setLod` / `setPools` exist so the critic can isolate a layer with a probe; they are part
of the contract and must work with zero console errors.

**Events emitted** (ARCHITECTURE §5), after the mutation is complete, with `version` already bumped:

| Event | Payload |
|---|---|
| `props:changed` | `{added:[id], removed:[id]}` |

Props **listens** to: `roads:changed` (re-place road furniture on the named edges only), `zones:changed` and
`buildings:changed` (lot props), `terrain:changed` (re-snap `y` of props inside the region only). All four coalesce
over ≤ 0.05 s into one rebuild, and a rebuild triggered by props' own `props:changed` is forbidden (reentrancy
guard — without it the module rebuilds every frame).

## 3. Visual/behavioural target

Named references, looked at, not remembered:

- **`$REF/cs2_4.jpg` — suburban arterial, low sun. This is the primary target for the whole module.** Slim pale-grey
  lamp columns ~9 m tall with a short arm and a downward head march along one side of the arterial at a constant
  ~30 m rhythm, each casting a long thin needle shadow across the carriageway. Shorter dark-bronze **ornamental
  lantern posts** (~5 m, curled arm, glass lantern) stand in the gardens and along the driveway. Boundaries are
  **clipped hedges** — long continuous green volumes ~1.4 m tall with a slightly irregular top and dark interior —
  and **fences**: white vertical-slat, dark metal picket with regular posts, pale rendered wall panels. Trees are
  unmistakably several species: dark blue-green **conifer spires**, broad round-crowned **broadleaves** in gold and
  ochre, slender pale-trunked **birches** with yellow foliage, one large blue-green fir. Crown colour varies
  tree-to-tree *within* a species. Every tree sits in a pool of darkened grass with a tight contact shadow, and the
  big fir throws a **dappled** shadow across the driveway — you can read branch structure in the shadow, it is not
  an ellipse. Small white bollard lights edge the drive; grey wheelie **bins** stand at the side of the house.
- **`$REF/cs2_8.jpg` — night street, rain.** The traffic signal is a real modelled object: an amber-yellow housing,
  three lenses each under its own **visor**, unlit lenses reading as dark bronze discs, only the green lens lit —
  and the lit lens does **not** wash out its own housing. A separate pedestrian head below shows red `DONT WALK`
  text plus a red countdown. Street lamps are tall slim poles with a flat rectangular LED head: the head reads as a
  small hard bright rectangle with a **tight** halo, and lays a soft, clearly bounded pool of light on the wet
  pavement below. Shorter warm lantern posts sit on the sidewalk among them. Small blue street-name plates hang on
  the poles at ~3 m. A green bench sits on the sidewalk. Bloom is restrained: no lamp becomes a glowing ball, no
  pool becomes a hard-edged ellipse.
- **`$REF/cs2_1.jpg` — aerial roundabout.** The central island is planted: mixed autumn canopies, low rounded
  reddish **bushes**, mown grass. Lamp columns around the ring are visible as thin verticals with long shadows even
  from 300 m. Trees at this distance still read as *individual* crowns with gaps between them, not a green mat.
- **`$REF/cs2_7.jpg` and `$REF/cs2_2.jpg` — forest at 1–3 km.** Woodland is a mass of individual crowns with visible
  shadow gaps and clumping; conifer silhouettes are still distinguishable at 1 km; it never shimmers, never turns
  into a flat green carpet, and never breaks into aliasing crawl.
- **`$REF/cs2_5.jpg` — closeup contact shadows.** Every object has a dark, *tight* contact shadow, and the shadowed
  ground under it stays readable rather than going to black.

**Tree size, by silhouette class.** These are the base dimensions at `scale = 1`; item 2's
`scale ∈ [0.75, 1.35]` multiplies them. Without this table one builder ships 7 m oaks and another 16 m oaks and
both satisfy every other item, while tree height is what drives the aerial read (item 18), the avenue read
(item 4 — needle shadows have to compete with crown shadows) and the forest silhouette (item 9c).

| Silhouette class | kind / species | Base height | Trunk Ø at 1.3 m | Crown width |
|---|---|---|---|---|
| Conifer spire | `tree_pine` / `spruce`, `fir` | **12–20 m** | 0.30–0.45 m | 0.30–0.45 × height |
| Broad round crown | `tree_oak` / `oak`, `maple` | **9–14 m** | 0.35–0.55 m | 0.80–1.15 × height |
| Tall narrow | `tree_oak` / `birch`, `poplar` | **10–16 m** | 0.25–0.35 m | 0.30–0.50 × height |
| Wide low spreading | `tree_oak` / `willow` | **6–9 m** | 0.35–0.50 m | 1.20–1.60 × height |
| Small ornamental | `tree_oak` / `blossom` | **4–6 m** | 0.15–0.25 m | 0.80–1.10 × height |

(`species` strings are an **additive** field and may be extended — only the 12 `kinds` are frozen. `oak` and
`willow` are the two additions this spec expects beyond §2's examples, because item 2 asks for five distinct
silhouettes and §2's list names species for only four of them.)

Probe-checkable: over the 200 nearest tree instances grouped by `species`, each group's median bounding height
falls inside its row's range, and no instance is below 0.7 × or above 1.4 × its row's midpoint.

**Where we are:** see the header — round 1 starts from the pre-spec build in `src/modules/props/`, later rounds
start from `docs/critic/props_r<n−1>.md`. Neighbouring critics have already named the traps this build will
walk into: `simulation_r1` "Trees are lollipops", "Hedges read as green static", "Nights are dusk: lawn, trees and
hedges fully lit at 22:00"; `effects_r1` "AO is imperceptible and halos the tree cards", "Night is a milky blue
dusk; only lamp heads ever glow"; `terrain_r1` "Grass tufts render into the planar reflection as confetti",
"Night tufts are self-lit against a dark ground".

## 4. Acceptance criteria

**Measurement conventions** (builder and critic both use these; deviating from them is a finding, not a defence):

- `L = 0.2126R + 0.7152G + 0.0722B` on the 8-bit sRGB PNG. **Whole-frame statistics** — `whitePct`, `blackPct`,
  and any `p50`/`std` taken over the whole PROPS REGION (items 5b, 5c, 7's frame-wide numbers, 9c, 17) — are
  measured on the frame downsampled to 480 px wide, as `shots/environment/r2/imgstats.mjs` does. **Every statistic
  taken inside a crop or a rect is taken on the full-resolution PNG, never on a downscaled copy** (ARCHITECTURE
  §8): at 480 px a 1 m feature is about two pixels, and a trunk, a lens, a pool edge or a hedge top is simply not
  there to measure. `whitePct` = % pixels with `min(R,G,B) > 247`; `blackPct` = % with `max(R,G,B) < 8`.
  Saturation = HSV `S`.
- **Pinned rects come from `--crops`, and from nothing else.** `node tools/screenshot.mjs … --crops` writes
  `<out>.crops.json` beside the PNG (ARCHITECTURE §8): `{png, width, height, camera, time, rects:
  {"<module>.<name>": [x, y, w, h]}}`, in pixels of the full-resolution capture, collected from every ready
  module's `api.cropRects` by `window.__sim.cropRects()` (`src/core/debug.js:41`). **Props must implement
  `api.cropRects`** (§2) and return exactly these names, each only when that landmark is in frame at that camera
  and meets its minimum size:

  | rect | must enclose | min size | read by |
  |---|---|---|---|
  | `canopy_broad` | one broadleaf crown, its lit side — foliage only, no sky, no trunk, no 12:00 shadow boundary | 128 × 128 px | 5a, 7 |
  | `canopy_conifer` | one conifer crown, same exclusions | 128 × 128 px | 7 |
  | `crown` | one crown whose upper half borders the SKY MASK, centred on that crown | 200 × 200 px | 1b, 1c, 9a |
  | `trunk` | bark only, on the nearest trunk, no foliage and no background | 64 × 64 px | 1a, 1d |
  | `pool` | one arterial lamp's ground pool plus ≥ 2 m of unlit surface beyond its edge | 128 × 128 px | 6b, 6c, 6d, 6f |
  | `lamp_head` | one luminaire head and its halo, nothing else | 48 × 48 px | 6e |
  | `hedge` | one hedge run's side face — hedge only, no ground, no sky | 256 × 64 px | 11a, 11b |

  Where an item names one of these rects, that rect **is** the region and a hand-placed crop is a finding. Where an
  item does not — item 2's twelve canopies, item 8's shadow region, item 18's woodland patch, item 24's 720p pair —
  the crop is report-named: list its pixel rect in the report. A missing rect that should have been in frame, or a
  `[debug] props.cropRects failed` warning in the shot JSON, is itself a finding.
- **CROWN REGION** = the 4-connected component of non-SKY-MASK pixels containing the centre of the `crown` rect,
  after a 3×3 median filter. Its convex hull is item 1c's denominator; report the region's pixel count. (A hull
  over the whole box and a hull over the crown differ by more than item 1c's 6–22 % band is wide, so this rule is
  not optional.)
- **PROPS REGION** = the pixels props owns, as a **fixed pixel mask computed once per camera at `time=12`** by
  shooting that camera twice with a probe toggling props' group off — `__sim.registry.get('props').group.visible =
  false` (`src/core/registry.js:14,99`; there is no global `ctx`, see **Probe** below) — and diffing (`|ΔL| > 6`),
  then saved next to the shot as `<camera>_mask.png`. **That same mask is reused unchanged for the 06.5, 17.5 and 22 items of the
  same camera** — never recomputed at night. (Recomputed at 22:00 the mask drops exactly the darkest props,
  because they move no pixel by 6 L, and item 5b then measures only the props that are already bright enough to
  pass it.)
- **SKY MASK** = pixels with `B − R ≥ 20` **and** `L ≥ 120`, computed on the `time=12` frame of the same camera.
  "Silhouetted against sky" means the pixel's outward neighbour along the direction being tested is in the SKY
  MASK. Every item that reads a crown edge or counts sky-through-crown (1b, 1c, 9a) is evaluated **only** on a
  crown whose tested boundary borders the SKY MASK; a crown backed by terrain, water or a building is skipped and
  another chosen — that choice is what `cropRects`' `crown` rect must return.
- **CANOPY CROP** = a ≥ 128×128 px full-res rectangle lying entirely on one sunlit crown — report-named where an
  item does not pin it to `canopy_broad` / `canopy_conifer`. Item 6's pool statistics are pinned to the `pool`
  rect; there is no separately-defined "POOL CROP".
- **Probe** = a throwaway Playwright script under `shots/props/r<n>/` against
  `http://127.0.0.1:5173/?showcase=props&headless=1&time=12&seed=1337`, waiting for `window.__sim.ready`. The page
  exposes **only** `window.__sim` (`src/core/debug.js`) — `world`, `events`, `clock`, `camera`, `engine`,
  `registry`, `stats()`, `project()`, `cropRects()`, `setTime()`, `setCamera()`, `setSpeed()`. There is no global
  `ctx`. The handles, all verified: `__sim.world.props` for the data; `const rec = __sim.registry.get('props')`
  (`registry.js:99`) for `rec.api` (this is `ctx.modules.props`), `rec.group` (the mask toggle above) and
  `rec.ctx`; and `rec.ctx.modules` **is** the single shared api object every module was handed (`registry.js:36`),
  so assigning into it — `rec.ctx.modules.traffic = stub` — is visible to props on its next update. That is the
  assignment item 10b means.
- **Probe captures are outside item 21's 34.** They are written under `shots/props/r<n>/probe/` and there are
  **14** of them: the props-off frame each PROPS REGION mask needs, one per masked camera (`avenue`, `lamp`,
  `park`, `street`, `forest`, `skyline`, `aerial` — 7), item 14's dolly pair (2), item 16's `setTime` pair and its
  `wind.speed = 0` pair (4), and item 10b's re-shot `signal_12` under the traffic stub (1). Item 15 re-uses the
  `aerial` and `park` mask captures rather than shooting its own. At §8's 354 s median that is ≈ 1.4 h on top of
  the matrix — budget for it.
- Shot paths are the gauntlet's: `shots/props/r<n>/<camera>_<time>.png`, `.` → `p` (`avenue_12.png`, `lamp_22.png`).

Ordered by how much each moves the score.

1. **Trees are trees, not lollipops.** At `treecloseup_12` and `forest_12`, for the nearest crowns:
   (a) a modelled trunk **≥ 35 px wide at 8 m** (measured across the `trunk` rect) with **≥ 3 visible branch
   bifurcations** reaching into the crown
   — no cylinder-plus-sphere, no single card on a stick. (At 1080p and fov 45° — `src/core/camera.js:10` — the
   scale is 1080 / (2·tan 22.5°) ≈ 1304 px/rad, so 35 px at 8 m is a trunk Ø of 0.215 m; §3's table floors every
   class at 0.15 m ornamental / 0.25 m tall-narrow / 0.35 m broadleaf, so at `treecloseup` a compliant broadleaf
   measures 57–90 px and this is a floor with margin, not the target. The old 8 px floor passed a 0.05 m stick —
   a lollipop by another name.)
   (b) the crown silhouette is **broken**: over the `crown` rect, a horizontal scanline through the rect's centre
   makes **≥ 40 transitions between SKY MASK and non-SKY-MASK pixels** (a lollipop gives ≤ 4). Graded artefacts are opaque PNGs — this is a
   luminance/chroma boundary test, never an alpha-channel test;
   (c) sky visible **through** the crown: 6–22 % of the pixels inside the **convex hull of the CROWN REGION**
   (§4 conventions — the segmentation rule is fixed there so the denominator is not invented) are in the SKY MASK;
   report the region's pixel count alongside the percentage;
   (d) bark reads as material — the `trunk` rect has `std ≥ 8` and is not a flat fill;
   (e) ground litter/darkening ring 1.0–2.5 m around every trunk, 8–25 L darker than open grass.
2. **Species, silhouette and colour variety.** Probe `api.stats().species ≥ 5`. In `forest_12` and `canopy_12`:
   ≥ 5 species distinguishable **by silhouette alone** — the five silhouette classes of §3's size table, whose
   height ranges are what makes them separable; **≥ 4 crown-colour variants** across the CS2 autumn palette —
   sample **12 separate canopies** (one CANOPY CROP each, every rect listed in the report) and **of those 12, at
   least 4 must differ pairwise** by mean hue ≥ 12° **or** mean L ≥ 25. No clustering algorithm is involved:
   name the 4 crops and show the C(4,2) = **6** pairwise deltas. (Headline and test are the same number on
   purpose: an earlier draft demanded 6 in the prose and tested 4.)
   Probe over the 200 nearest tree instances: heading is uniform over `[0, 2π)` (no bucket of 12 wider than 15 %),
   scale ∈ [0.75, 1.35] **multiplying the base height of that instance's silhouette class in §3** with
   `std ≥ 0.08`, lean ≤ 6°, and **no two instances within 12 m of each other share
   (species, scale rounded to 0.05, heading rounded to 5°)**. (`$REF/cs2_4.jpg`.)
3. **Nothing floats, nothing sinks, nothing stands in the road.** Probe every item in `world.props.items`
   (≥ 1 500 items):
   (a) `|item.y − groundY(item)| ≤ 0.05 m` for **100 %**. `groundY` is decided **by kind, never by `isRoad`** —
   `isRoad(x,z) === 2` marks the whole corridor out to `corridorHalf + 0.4`, including the graded flat verge
   outside the sidewalk back (`src/modules/roads/build.js:503,532`), so a coverage-based rule would stand every
   street tree of item 13a on stilts at sidewalk height:
   - **sidewalk furniture** — `bench`, `bin`, `hydrant`, `sign`, `bus_stop`, and any `streetlamp` /
     `trafficlight` placed from a roads anchor — sits on the **sidewalk top**, which is
     `world.roads.laneCenter(edgeId, 0, t).y + 0.21` (= `ROAD_LIFT 0.08 + SW_H 0.16 − 0.03`,
     `src/modules/roads/build.js:12,18` — the same figure `traffic.md` uses for vehicle height, verified against
     the source). For a lamp taken straight from `ctx.modules.roads.lampPositions(edgeId)`, `groundY` is **that
     entry's own `y`, whatever it is** — roads adds `SW_H − 0.03 + ROAD_LIFT` (= 0.21 m) on sidewalk sides but
     `+ 0.95 m` when `side === 'median'` (`build.js:1222,1225`). Never re-derive it and never hardcode 0.21 for a
     lamp: 0.95 − 0.21 = 0.74, so a hardcoded 0.21 sinks every highway median lamp 0.74 m into the barrier and
     fails this item's ± 0.05 m on the very case the rule exists to protect;
   - **everything else** — every verge, lot, garden, park, plaza and forest prop, **including the street trees
     planted in the verge under item 13a** — uses `world.terrain.getHeight(x, z)`, whatever `isRoad` returns
     there. A street tree at sidewalk-top height is a fail, not a pass;
   (b) **zero** props of kind `tree_oak`, `tree_pine`, `bush`, `fence`, `planter`, `bench`, `bin` at a point where
   `world.roads.isRoad(x,z) === 1` (asphalt);
   (c) **zero** props where `world.terrain.isWater(x,z)` is true;
   (d) no tree trunk within **1.2 m** of an asphalt edge; ≥ **1.5 m** clearance between a `streetlamp` and any
   `bench`/`bin`/`sign`; and no prop footprint circle overlapping another's — pairwise centre distance
   ≥ `r_a + r_b`, where `r = api.stats().radii[kind] × item.scale` and `radii` is **exactly** this table, so
   builder and critic compute from the same numbers (metres):

   | kind | r | kind | r | kind | r |
   |---|---|---|---|---|---|
   | `streetlamp` | 0.25 | `trafficlight` | 0.30 | `tree_oak` | 0.60 |
   | `tree_pine` | 0.50 | `bench` | 0.90 | `bin` | 0.30 |
   | `hydrant` | 0.25 | `sign` | 0.20 | `bus_stop` | 2.20 |
   | `fence` | 0.20 | `bush` | 0.70 | `planter` | 0.60 |

   Exempt from the pairwise test **against each other only**: `fence` segments (a hedge or fence run is a chain
   of touching segments by construction) and the parts of one `bus_stop` assembly. Everything else is in it;
   (e) visually: 4× crops of `avenue_12`, `park_12`, `street_12` show no prop half-buried in the ground and none
   hovering with a visible gap under its base or its contact shadow detached from it. (`$REF/cs2_5.jpg`.)
4. **Streetlamps are modelled objects on the roads' own anchors.**
   (a) **Anchors.** Probe, for every `street`/`avenue`/`highway` edge: every entry of `api.lampsFor(edgeId)`
   matches an entry of `ctx.modules.roads.lampPositions(edgeId)` within **0.05 m in x, y and z**, and the two
   lists are the **same length** (no lamp invented off-anchor, none dropped);
   (b) **Intersection clearance.** No lamp centre lies within **8 m** of an intersection centre from
   `roads.intersections()`.
   **Spacing and stagger are roads' business and props is not graded on them.** For reference only, from
   `src/modules/roads/build.js:1203–1228`: base spacing 40 m where `median > 0`, 30 m where `lanes ≥ 4`, else
   28 m, then redistributed evenly as `count = max(1, floor(range / spacing))`, so realised spacing runs from
   under 28 m to nearly twice the base; sides alternate only on 2-lane types, an avenue
   (`lanes ≥ 4 && median === 0`) gets **paired** lamps opposite each other, and a highway gets median-only lamps
   at 40 m. An earlier draft of this item demanded 24–32 m staggered spacing — unsatisfiable on the avenue this
   showcase's hero camera looks straight down. Props does not second-guess the generator.
   (c) **Column geometry** at `lamp_12`: arterial column **8.5–9.5 m** tall, tapering ~0.16 m at base to ~0.10 m
   at head, a base collar/foundation 0.35–0.50 m across, a mast arm of 1.2–2.0 m reach, and a luminaire head
   modelled as a body ~0.55 × 0.25 × 0.10 m — not a glowing quad;
   (d) **Ornamental variant.** A second, distinct ornamental lamp type **4.5–5.5 m** with a lantern head appears
   in the park/plaza;
   (e) **Needle shadows.** Poles cast shadows: at 06.5 and 17.5 each column throws a needle shadow that reaches
   **all the way across the carriageway**, traceable in the full-res PNG unbroken from the column base to the far
   kerb line, in **`street_6p5` / `street_17p5`**. The standard `street` camera targets the staged (40, 0, 40)
   crossroads on the avenue (§8), so the avenue's lamps are in frame; there is no `avenue_6p5` or `avenue_17p5` in
   item 21's matrix and none is added. An avenue carriageway is 16 m wide
   (`world.roads.types.avenue.asphaltHalf` = 8.0, §7), so this is the old "≥ 12 m" restated against a landmark in
   the same frame — nothing at this camera converts pixels to metres. (`$REF/cs2_4.jpg`, `$REF/cs2_8.jpg`.)
5. **Night is lamplight, not dimmed noon or self-lit foliage.** At 22:00 over the PROPS REGION in `avenue_22`,
   `lamp_22`, `park_22`, `street_22`:
   (a) foliage `p50` at 22:00 ≤ **0.35 ×** the `p50` of the **same** `canopy_broad` rect at 12:00, and **no pixel
   of that rect or of the `hedge` rect exceeds `L = 150`** — pick rects that do not overlap a lamp pool, and say
   so in the report. (The earlier "no foliage, hedge, bench, bin or fence pixel" needed a per-kind classification
   no mask here defines, and a per-kind toggle mask is 5 kinds × 4 cameras ≈ 20 more frames ≈ 2 h. Bench, bin and
   fence at night are already held by (b), (c) and (d).)
   (b) `blackPct ≤ 3 %` over the PROPS REGION **as fixed at 12:00** (§4 conventions — the mask is never
   recomputed at night, or the darkest props exclude themselves from their own test) — props must still be
   readable, not silhouettes;
   (c) `mean(B) − mean(R) ≥ +4` over non-pool props (cool moonlit cast), matching `environment`'s night;
   (d) props adds no emissive material with `emissiveIntensity > 2.0` other than luminaire heads, signal lenses and
   the halo/pool billboards.
6. **The lamp actually lights the ground.** At `lamp_22` and `avenue_22`, per lamp:
   (a) **from the probe, not from pixels** — for every pool decal instance the **world-space** major axis
   (instance scale × geometry extent, read off the instance matrix) is **10–16 m** for a 9 m column. The crop
   cannot give this: the pool lies on a receding ground plane, so its on-screen major axis has no fixed
   metres-per-pixel and two people measuring the same `lamp_22` crop disagree by metres. The `pool` rect is used
   only for (b), (c), (d) and (f);
   (b) `mean L` of the `pool` rect `≥ 2.2 ×` `mean L` of the same surface 12 m from any lamp;
   (c) the pool is **warm**: over the `pool` rect, `mean(R) − mean(B) ≥ +6`, identical in sign for every lamp of
   that kind;
   (d) the pool edge is soft — walking a 1 px-wide radial ring outward across the boundary, no step > 6 L between
   adjacent rings, and **no visible ellipse rim**;
   (e) the luminaire head reads as a hard small source: inside the `lamp_head` rect on the full-res PNG,
   `p99 ≤ 250`, halo radius ≤ 3 × head width and halo peak L < head peak L; `whitePct ≤ 0.05 %` is whole-frame
   (480 px, §4 conventions);
   (f) **no z-fighting where the pool meets the road** — graded from the probe and one crop, not from a
   frame-to-frame diff (with `speed=0` two captures at the same camera are the same frame, and
   `tools/screenshot.mjs` cannot produce a 1-frame delta): the pool material reports `depthWrite === false`,
   `blending === THREE.AdditiveBlending`, `polygonOffset === true` with `polygonOffsetFactor < 0`, and
   `renderOrder === RENDER_ORDER.TRANSPARENT` (100); and in the `pool` rect of `lamp_22` the pool crosses the kerb
   and lane-marking lines with no seam — no run of ≥ 20 consecutive pixels along that boundary differing from
   both of their perpendicular neighbours by ≥ 25 L. (`$REF/cs2_8.jpg`.)
7. **Noon albedo and contrast — not washed out, not crushed.** At 12:00 in `forest_12`, `avenue_12`, `park_12`,
   the `canopy_broad` rect has `p50 ∈ [110, 185]` and the `canopy_conifer` rect `p50 ∈ [45, 95]` (full-res, §4
   conventions); the shaded side of any crown `≥ 18` and `≤ 0.55 ×` its own sunlit `p50`; `canopy_broad` mean
   saturation `∈ [0.28, 0.75]`; and over the PROPS REGION: `whitePct ≤ 0.10 %`; `blackPct ≤ 1.5 %`; PROPS REGION `std ≥ 22`.
8. **Tree shadows are dappled, not blobs.** In `treecloseup_12` and `avenue_12`, inside the ground shadow cast by
   one broadleaf crown, ≥ 15 % of pixels are brighter than the shadow region's median by ≥ 20 L (light leaking
   through the canopy). A solid ellipse fails. `castShadow = true` on LOD0 and LOD1 instanced meshes; foliage uses
   **`alphaTest` (0.40–0.50), never `transparent:true`**, so the shadow map cuts leaf shapes. (`$REF/cs2_4.jpg`.)
9. **No card halos, no sprite glow, no sparkle.**
   (a) along the silhouette of the `crown` rect in `treecloseup_12` (§4 conventions — the same crown as item 1b),
   ≤ 1 % of boundary pixels are darker than **both** their inward and outward
   neighbours by ≥ 40 L (dilated/premultiplied atlas; a black fringe is a fail);
   (b) far impostor billboards are **lit, not emissive**: at `skyline_22` an impostor tree's `p50` is within 25 % of
   a LOD1 tree at the same screen depth, and no impostor is brighter at 22:00 than at 12:00;
   (c) speckle: over the PROPS REGION in `skyline_12`, `aerial_12` and `forest_12`, pixels differing from their 3×3
   median by ≥ 35 L are **≤ 0.05 %**. Foliage roughness ≥ 0.70, no normal map beyond 60 m, `anisotropy =
   ctx.assets.anisotropy` on every props texture. (`$REF/cs2_2.jpg`, `$REF/cs2_7.jpg`.)
10. **Traffic signals at every signalised node, and they work — under props' clock *and* under traffic's.**
    Probe `api.signals()`: one entry for every node with ≥ 3 arms of type `street`/`avenue` from
    `ctx.modules.roads.intersections()`; one signal assembly per arm; at any instant exactly one of
    `red|amber|green` per arm in `armStates`; opposing arms share a state; conflicting arms are never both
    `green`; `signalFor(edgeId, atA)` agrees with `signals()` for every arm. (Those four invariants are graded on
    whoever owns the clock: in branch (a) they are props'; in branch (b) they are traffic's, and props is graded
    only on mirroring `greenArms` faithfully.)
    (a) **Standalone** (`?showcase=props`, no traffic module): every entry reports `source === 'props'`, and the
    phase is a pure function of `world.time.day`/`hour` — setting the clock to the same hour twice gives the same
    `phase`, and advancing it by half a cycle flips the phase.
    (b) **Handover** (the preamble's rule, graded): the probe assigns a stub onto the **shared** api object —
    `__sim.registry.get('props').ctx.modules.traffic = { signalState: () => ({ phase: 3,
    greenArms: [<one arm's edgeId>], since: 0, cycle: 60 }) }` (§4 conventions; `registry.js:36` — that object is
    the same `ctx.modules` props itself was handed, so stubbing a per-module copy would grade the wrong branch) —
    and steps one frame. Within **one frame** every entry reports `source === 'traffic'`,
    `phase === 3`, `greenArms` matching, `armStates` derived from it, and the rendered lens colours in a re-shot
    `signal_12` change to match — props' own clock stops driving anything. Deleting the stub restores
    `source === 'props'` within one frame. Across both transitions: no console error, and `api.stats().draws`
    and `tris` are unchanged (a clock change is not a geometry rebuild).
    Geometry at `signal_12`: mast arm carrying the head **5.2–6.0 m** above the
    carriageway and reaching ≥ 0.5 × the approach width; head with **3 lenses ≈ 0.30 m**, each under a visor, on a
    backplate; a pedestrian head on the pole at 2.4–2.8 m; a base collar. At `signal_22`, exactly one lens lit per
    head, the housing still legible around it (housing `mean L ≥ 30`), and the lit lens `p99 ≤ 250`.
    (`$REF/cs2_8.jpg`.)
11. **Hedges and fences are volumes, not green static.** At `park_12` and `avenue_12`:
    (a) hedge height 1.2–1.8 m with a **modelled undulating top** of ≥ 0.08 m amplitude and a darker interior
    (top-to-side `ΔL ≥ 15`);
    (b) no tiling in the hedge: normalised cross-correlation of a 256-px-wide mean-subtracted hedge crop against
    itself at horizontal shifts 8…128 px has `max NCC < 0.45`;
    (c) ≥ 2 distinct built-fence variants in frame (`variant:'slat'` picket, `variant:'railing'` metal with posts
    at ≤ 2.5 m pitch; `variant:'wall'` optional), each with
    a modelled post rhythm visible in silhouette and a bottom rail clearing the ground by ≤ 0.12 m over undulating
    terrain — a fence must **follow the ground**, never cut into it or hover.
12. **Twelve kinds, all present, all identifiable.** Probe: `world.props.kinds` is exactly the frozen 12-string
    array, and `api.count(k) ≥ 1` for every one of them. Visually, in the named shot each is identifiable as its own
    object at 4×: `streetlamp` + `sign` + `bench` + `bin` + `hydrant` (`avenue_12`), `trafficlight` (`signal_12`),
    `bus_stop` with a modelled shelter, roof, glass side panel, seat and timetable panel (`busstop_12`),
    `tree_oak` + `tree_pine` (`forest_12`), `bush` + `planter` + `fence` (`park_12`).
13. **Placement is rule-driven and reads as designed, not scattered.** Probe:
    (a) street trees along every `street`/`avenue` edge whose type has `sidewalk ≥ 3`, spacing **12–18 m**, planted
     in the verge between kerb and property, offset 0.8–1.6 m from the sidewalk outer edge — and standing on
    `world.terrain.getHeight`, not on the sidewalk top, even though `isRoad` returns 2 out there (item 3a);
    (b) benches/bins on sidewalks at ≥ 40 m spacing, set 0.6–1.2 m back from the kerb face, facing the road
    (`|heading − roadHeading ± π/2| ≤ 0.15 rad`);
    (c) ≥ 1 `bus_stop` per 250 m of `street`/`avenue`, within 40 m of an intersection, on the sidewalk, never in a
    crosswalk;
    (d) forest scatter is **Poisson-disc, not a grid**: over 500 forest trees, the histogram of nearest-neighbour
    distances has no spike (no bin holding > 35 % of samples) and the mean nearest-neighbour distance ∈ [4, 9] m;
    no forest tree where `terrain.getSlope > 0.6 rad`, above `terrain.maxHeight − 20 m`, or inside a `world.zones`
    lot;
    (e) in `canopy_12` (top-down) no row, lattice or repeat pattern is visible in the tree layout.
14. **LOD without popping or a visible switch line.** Probe `api.debug.lodHistogram()` returns three tiers with
    non-zero counts at the `forest` preset. Tiers cross-fade over a band of ≥ 10 m (dither or alpha), and the
    switch is invisible: two shots of the same camera dollied 3 m across the LOD0→LOD1 boundary differ by
    ≤ 1.5 % of pixels by ≥ 40 L. Impostors are **view-dependent quads billboarded in the vertex shader from the
    view matrix** — at `canopy_12` (top-down, pitch 0.75+) not a single impostor renders as an edge-on sliver or a
    flat card lying on the ground; if the tier cannot face a top-down camera it must fall back to LOD1 there.
15. **Reflections and shadows behave under a foreign camera.** Terrain's water reflection camera renders
    `LAYERS.PROPS`. In `aerial_12` and `park_12` with water in frame: trees are reflected (probe: toggling props
    changes ≥ 0.5 % of water pixels by ≥ 10 L), and over the water region, pixels differing from their 3×3 median
    by ≥ 40 L are **≤ 0.3 %** — no confetti. Any distance fade or LOD select in a props shader must read a uniform
    the module writes from `ctx.camera.camera`, **never `cameraPosition`** (that is exactly what put grass confetti
    on the river in `terrain_r1`).
16. **Wind sway, deterministic and gentle.** Probe: `__sim.setTime(12.000)` then `__sim.setTime(12.004)` and diff
    the frames — canopy pixels move by 2–8 px, the trunk base moves **0 px**, and hard props (lamps, signals,
    benches, bins, fences) move 0 px. Sway amplitude scales with `world.weather.wind.speed`; with
    `wind.speed = 0` the two frames are byte-identical. Phase derives from `world.time`, never from real time, so
    two independent loads at `?time=12&seed=1337` produce the same frame.
17. **Golden hour reads.** At 06.5 and 17.5 (`street_6p5`, `forest_17p5`, `park_17p5` — all three are in item 21's
    matrix): long prop shadows across the ground (item 4(e)), rim-lit crown edges on the sun side, `whitePct ≤ 0.15 %`, `blackPct ≤ 4 %`, and the frame is
    not sepia-monochrome — hue spread of the 12 sampled canopies ≥ 25°. No lamp pool or halo is visible at 17.5
    (lamps switch on from `world.weather.night > 0.5`, verified by a probe reading the pool material opacity at
    17.5 = 0 and at 22 > 0).
18. **Aerial and skyline coherence.** In `aerial_12` (520 m) individual crowns are still resolvable — a 256×256 crop
    of woodland has `std ≥ 18` and is not a flat mat; lamp columns along the avenue are visible as ≥ 1 px verticals
    with shadows. In `skyline_12` / `skyline_22` (900 m) the props layer stays coherent: item 9c's speckle test
    passes, no aliasing crawl on impostors, and the woodland silhouette against the ground still shows conifer vs
    broadleaf massing. (`$REF/cs2_7.jpg`, `$REF/cs2_2.jpg`.)
19. **Determinism and idempotence.** Two loads at `seed=1337` give identical `api.stats()`
    `{items, instances, tris, chunks}`; a second `api.rebuild()` yields the identical counts and triangle count;
    `deserialize(serialize())` reproduces the same counts and the same `world.props.version` delta. The generic
    determinism checks (RNG source, no wall-clock in module logic) are **graded per `BUILDER.md` / `CRITIC.md`**
    and are not restated here. The props-specific addition is: **wind phase and signal phase are computed from
    `world.time`, never accumulated across frames** — no `phase += dt` anywhere in `src/modules/props/`, because
    an accumulator makes every capture at the same `?time=` a different frame and every pixel diff in items 14
    and 16 meaningless.
20. **Budget.** Every number in §5 met, measured as stated there. **Chunk size is graded against §5's 256 m, not
    against ARCHITECTURE §9's or `BUILDER.md`'s 128 m**: §5 derives the deviation and requires it on record in
    `docs/core-requests/props.md`. If that file is absent the finding is the missing request, not the chunk size.
21. **The whole shot matrix exists — 34 shots, enumerated so the count is not a guess.** All of these under
    `shots/props/r<n>/`, each with `errors: []`, `modules.props === 'ready'` and no boot-overlay frame (those
    pass conditions are `CRITIC.md`'s; the enumeration is this spec's):
    - **16 standard** — `aerial`, `street`, `skyline`, `closeup` × `06.5, 12, 17.5, 22`;
    - **15 preset** — all 8 of §8's presets at 12 (8), plus `avenue`, `lamp`, `signal`, `busstop`, `park` at 22
      (5), plus `forest` and `park` at 17.5 (2);
    - **1 integration** — `?showcase=all --camera aerial --time 12`;
    - **2 at 720p** — `avenue_12` and `forest_22` at `--w 1280 --h 720` (item 24; these also serve as this
      item's 720p shots).

    16 + 15 + 1 + 2 = **34**. A missing shot is a missing item, not a rounding error.
22. **Stay in lane — the props-specific half.** No `THREE.Light` instance anywhere in `src/modules/props/`; no
    `renderer` state, `scene.fog`, tone mapping or composer touched; no other module's `group`; no `world`
    section written except `world.props` — and `world.roads` **only** through `addNode` / `addEdge`, **only**
    inside `showcase.setup`, never in `init` or `update`. The writable-path list and the
    `git status --porcelain` check are not repeated here: **blast radius per `BUILDER.md`, graded per
    `CRITIC.md`**, so a change to how all builders work stays one edit rather than sixteen.
23. **Edits are responsive — measured as CPU work, not as wall-clock or frames elapsed.** One SwiftShader frame
    of this showcase costs seconds (§8), so any deadline shorter than a frame is unobservable here; both numbers
    below are **CPU milliseconds spent inside props**, read from `api.stats().ms` (the cost of the most recent
    build/rebuild) and cross-checked with `performance.now()` bracketing the call **inside the probe**, with no
    rendering in between. After init on the showcase set: a probe that calls `api.place('bench', x, z)` sees the
    item in `world.props.items`, a `props:changed` carrying the new id, and new triangles, for ≤ **250 ms** of
    props CPU; a probe that calls `world.roads.addEdge(...)` then `ctx.modules.roads.rebuild()` sees lamps and
    street trees on the new edge for ≤ **800 ms** of props CPU. That second number must be a **dirty-region**
    rebuild, and the probe proves it with the api that exists rather than trusting it: in one page, run the same
    edit twice — once after `api.setDensity(0.25)` and once after `api.setDensity(1.0)` — and the 1.0 measurement
    must cost **≤ 1.25 ×** the 0.25 one — the same 4× forest (1.0 / 0.25 = 4), reachable with the api that
    exists. (`setDensity` is a 0..1 multiplier and can only thin, so the earlier "a scene with 4× the forest"
    named a scene §2's api cannot build.) Report `api.stats().byKind.tree_oak + .byKind.tree_pine` at both
    densities so the 4× is shown to have landed.
    `update()` allocates nothing per frame.
24. **720p parity.** `avenue_12` and `forest_22` at `--w 1280 --h 720` show the same props, the same LOD tiers and
    the same lamp pools as at 1080p, with no new aliasing crawl (item 9c applies at 720p too).

## 5. Budget

| Metric | Limit | How measured |
|---|---|---|
| Declared `budget` in `index.js` | `{ drawCalls: 400, triangles: 900_000 }` | ARCHITECTURE §9 gives props 400 |
| Draw calls **attributable to props** in any showcase shot (incl. shadow cascades) | **≤ 120** | probe: `ctx.group.visible = false` diff on `__sim.stats().drawCalls` |
| Scene draw calls in any `?showcase=props` shot (terrain + environment + roads + props) | **≤ 200** | `summary.json.maxDrawCalls` |
| Draw calls attributable to props in `?showcase=all` | ≤ 400 | same diff |
| Triangles attributable to props, showcase | **≤ 700 000** | same diff |
| Triangles, whole frame, any showcase shot | ≤ 1 800 000 | shot JSON |
| `update()` JS per frame, idle | **≤ 0.6 ms**, median of **30 consecutive `update()` calls** | Probe: bracket props' update path with `performance.now()` (or step the registry one frame at a time) and take the median **in the probe**. `__sim.stats().moduleMs.props` cannot serve: `src/core/registry.js:83` overwrites it every frame with the last value and no tool in `tools/` computes a median — and at 5–10 s per SwiftShader frame here, "120 frames" would be ~15 minutes per measurement |
| `update()` JS, any single frame | ≤ 2.0 ms | max of the same 30 samples (rebuilds are init/edit work — item 23) |
| Full scatter + build of the showcase set at init | ≤ 3.0 s | `api.stats().ms`, logged by `index.js` |
| Props' share of init | ≤ 4 s of the 15 s app budget | `log.info` timings |
| GPU texture memory owned by props | **≤ 72 MB** | ≤ 2 new PBR sets at 1 k, one ≤ 1024² RGBA foliage atlas, one ≤ 1024² impostor atlas (≤ 2 pages, albedo + packed normal), one ≤ 512² noise |
| Heap added | ≤ 50 MB | `__sim.stats().heapMB` delta |

**Geometry rule.** One `InstancedMesh` per (**kind-class** × LOD tier × **256 m chunk**), chunks frustum-culled;
8 × 8 = 64 chunks span the 2048 m world and only non-empty chunks may exist. There are exactly **four
kind-classes**, and **`species` is a per-instance attribute inside the mesh, never a mesh of its own**:

| Kind-class | Tiers | Casts shadow |
|---|---|---|
| trees — every species, one atlas, species as an instance attribute | LOD0, LOD1, impostor | LOD0 + LOD1 yes; impostor no |
| hard furniture — lamp, signal, bench, bin, hydrant, sign, planter, fence, bus stop | one | yes |
| alpha foliage — bush, hedge | one | yes |
| transparent — halos, light pools | one | no |

So one visible chunk costs at most **4 shadow-casting meshes + 2 non-casting**.

**Where the ≤ 120 comes from.** At `quality=high`, `QUALITY.high.cascades = 3` (`src/core/constants.js:42`), and
three.js counts every cascade's shadow pass in `renderer.info.render.calls`, so a casting mesh costs 1 colour draw
plus one draw per cascade frustum it intersects. Worst preset is `forest`:

```
casting: 4 meshes/chunk × [ 2 near chunks × (1 colour + 3 cascades)
                          + 7 far-but-in-CSM chunks × (1 colour + ~1.5 cascades) ]  ≈ 102
impostor tier, castShadow = false, ≤ 9 visible chunks                                   9
transparent (halos + pools), castShadow = false, ≤ 9 visible chunks                      9
                                                                                     -----
                                                                                     ≈ 120
```

That closes **only** under two rules, which are requirements and not advice: (i) one mesh per
(chunk × class × tier) — splitting trees per species multiplies the 102 by ~5 and fails item 20 on its own;
(ii) beyond the CSM range (> ~220 m from the camera) a chunk contributes **exactly one** non-casting impostor
draw, which is what keeps `skyline` and `aerial` inside the cap. If a measured shot exceeds 120 with both rules
obeyed, the builder reports the measured number and the per-chunk mesh count in `docs/builds/` and the critic
grades the two rules plus the **absolute** caps (≤ 200 scene draws in `?showcase=props`, ≤ 400 props draws in
`?showcase=all`): the 120 is derived from this arithmetic, the scene caps are not.

**256 m chunks, deliberately, not ARCHITECTURE §9's 128 m.** §9, `BUILDER.md` and `src/core/constants.js:5`
(`TILE_SIZE = 128`) all say 128 m tiles; props supersedes that for its own chunking, the way it supersedes §12's
point lights, and for a reason visible in the arithmetic above: chunk count is what the cascade multiplier
multiplies, and 128 m tiles put ~4× as many chunks in frame — the same geometry becomes ~380 draws. Props has few
meshes and very many instances, so larger chunks are strictly better here; terrain and buildings keep 128 m.
**Land the deviation where the critic reads it.** `CRITIC.md` ranks ARCHITECTURE above a module spec, so a
conscientious critic can fail a builder who followed this paragraph. Until ARCHITECTURE §9 carries the exemption,
the builder files `docs/core-requests/props.md` recording it — one paragraph: 256 m for props only, the draw-call
arithmetic above, terrain and buildings unchanged. Item 20 grades chunk size against this section and the missing
request file, not against §9.

Anything appearing more than ~50 times (every tree, lamp, bench, bin, hydrant, sign, bollard, fence post, hedge
segment, light pool) is an `InstancedMesh` or merged into its chunk — never a `Mesh` each. Impostor tiers are
2 triangles per tree, `castShadow = false`.

Assets — the licensing and manifest policy is ARCHITECTURE §10 and is **not** restated here; what follows is only
what props specifically decides. Nothing suitable is fetched today
(`asphalt_02`, `aerial_grass_rock`, `brown_mud_leaves_01`, `rock_face`, `aerial_beach_01`, `concrete_wall_008`,
`concrete_floor_worn_001`, `gravel_floor_02`, `leafy_grass`). At most **two** further PBR sets are justified —
a bark and a painted/galvanised metal. **Foliage, impostor and signal-lens atlases must be procedural**
(`ctx.assets.procedural`, canvas-generated leaf clusters + render-to-target impostor bake): a photo leaf atlas at
CC0 is not reliably available and a tiled one looks worse at city scale.

## 6. Known failure modes

Observed on this module's neighbours in rounds already graded — do not spend a round rediscovering them.

- **Lollipops.** A sphere or a single billboard on a cylinder. Named in `simulation_r1` issue 8. Reads as programmer
  art instantly at street and closeup, and it is the single fastest way to a 5.
- **Hedges as green static.** A box with a noise texture: per-pixel fizz at 1 m, a flat slab at 50 m.
  `simulation_r1` issue 7. Hedges need volume, an undulating top, a dark interior and no tiling.
- **Dark halos around foliage cards.** Non-premultiplied / non-dilated alpha leaves a black fringe on every leaf
  edge, and AO then "halos the tree cards" (`effects_r1` issue 5). Dilate the atlas RGB under the alpha, use
  `alphaTest`, never `transparent:true` for foliage.
- **Night that is dusk, and foliage that is self-lit.** `simulation_r1` issue 2 and `terrain_r1` issue 4: lawn,
  trees and hedges fully lit at 22:00, tufts glowing against a dark ground. Any emissive or ambient-floor term you
  add to make foliage "readable" at noon will glow at night. Read `world.weather.night` and drive it down.
- **Only the lamp head glows.** `effects_r1` issue 2: the light source is bright but nothing under it is lit, so
  the street stays black. The ground pool decal is not optional — item 6 is worth more than the head itself.
- **Sprite glow at night.** Halo billboards sized in world units grow huge at street distance, or use additive
  blending without a distance clamp, and every lamp becomes a ball. Clamp halo screen size and keep its peak below
  the head's.
- **Clone army.** One tree mesh at one scale and one rotation, repeated: the eye reads the repeat immediately at
  aerial. Item 2's per-instance test exists because this is the default outcome of a first pass.
- **Grid scatter.** Placing on the terrain grid or on a jittered lattice produces visible rows from top-down even
  when it looks fine obliquely. Poisson-disc, and check `canopy_12`.
- **Confetti in the water.** `terrain_r1` blocker 1: a distance fade written against `cameraPosition` breaks under
  the mirrored reflection camera (which sits *under* the water), so nothing fades and the reflection fills with
  speckle. Props renders into that reflection too — feed distances from a uniform.
- **Edge-on impostors from above.** CPU-side billboards oriented once for the main camera become slivers in the
  reflection and flat cards on the ground under `canopy`/`aerial`. Billboard in the vertex shader, or fall back to
  LOD1 above a pitch threshold.
- **LOD popping and a visible switch ring.** A hard distance switch draws a circle of changing detail around the
  camera, and dollying makes the forest flicker. Cross-fade over ≥ 10 m with hysteresis.
- **Z-fighting between the light pool, road markings and the sidewalk.** Roads' markings already sit at
  `RENDER_ORDER.MARKINGS` with `polygonOffset`; a pool decal at the same depth flickers. Use
  `RENDER_ORDER.TRANSPARENT`, `depthWrite:false`, additive, `polygonOffset`.
- **Floating and sunk props.** Snapping `y` at scatter time and never re-snapping after `terrain:changed` or a road
  cut/fill leaves lamps buried in the new embankment and benches hovering over the graded verge.
- **Props standing in the carriageway.** Scattering before reading `world.roads.isRoad`, or reading a stale
  `coverage` before roads' rebuild has landed. Re-place on `roads:changed`, and check `isRoad` at place time.
- **Specular sparkle on leaves.** A normal map plus low roughness on thin alpha-tested geometry gives white
  speckle at mid distance and crawling aliasing at skyline — the same failure `roads_r1` issue 5 hit on asphalt.
- **Non-repeatable screenshots.** Sway or a signal cycle driven by accumulated real `dt` makes every capture
  different and every pixel diff meaningless (`simulation_r1` issue 6). Drive both from `world.time`.
- **Doubled lot boundaries.** `buildings` already draws a hedge or fence on lots it fills; adding another produces
  two parallel hedges 0.5 m apart in `?showcase=all`.
- **Two clocks for one signal.** An earlier draft of this spec and `traffic.md` both claimed to own the signal
  phase, with incompatible `signals()` payloads. In `?showcase=all` the lenses and the vehicles then obey
  different clocks — cars stop on green — and neither builder is at fault. The preamble settles it: traffic
  decides, props renders, `signalFor` is a read-through, and props' `signals()` is a superset of traffic's shape.
  Item 10b exists to catch a props build that keeps running its own clock after traffic appears.
- **Grading a dependency's behaviour as if it were yours.** Item 4 once required a lamp spacing that roads'
  generator cannot produce on an avenue. If an acceptance number describes what a dependency emits rather than
  what props does with it, it belongs in §7 as an observation, not in §4 as a requirement.
- **Boot-overlay captures and screenshot timeouts.** Under SwiftShader with other agents editing, `page.screenshot`
  times out and Vite full-reloads are captured as the SIMBUILD loading screen. Use `--timeout 240`, and re-shoot
  anything whose PNG shows the overlay or whose JSON has `fps: 0` with `measuredFrames: 1`.

## 7. Dependencies and their real APIs

`dependencies: ['terrain', 'roads']` (init order only — props must init and render if either is missing).

**`ctx.modules.roads`** (guard every call with `?.`; every one of these is live today in
`src/modules/roads/index.js`):
```js
lampPositions(edgeId) -> [{x, y, z, heading, side:'left'|'right'|'median', edgeId, t}]
intersections() -> [{id, x, y, z, roundabout, arms:[{edgeId, dir:{x,z}, trim, width, sidewalk, type, ring, lanesIn, stopT, atA}]}]
nodeInfo(id) -> {kind, arms, corners, trims, node, hasRing} | null
rebuild() ; stats() ; types() ; edges() -> [{id,a,b,type,len,bridge,ring}] ; edgeDebug(edgeId, step)
serialize() ; deserialize(data)
```
**`world.roads`** (installed by the roads module; frozen shapes it already ships):
```js
world.roads.nodes: Map ; world.roads.edges: Map ; world.roads.version
world.roads.types[t] = { width, lanes, speed, sidewalk, asphaltHalf, cornerR, laneW, shoulder, median, oneWay }
   // street: width 16, sidewalk 3, asphaltHalf 5.0 ; avenue: 24 / 4 / 8.0 ; highway: 32 / 0 / 16.0 ;
   // alley: 8 / 2 / 2.0 ; gravel: 8 / 0 / 4.0 ; ramp: 10 / 0 / 5.0
world.roads.addNode(x,z) -> id ; addEdge(a,b,type,opts) -> id ; removeEdge(id) ; removeNode(id)
world.roads.sample(edgeId, t) -> {x,y,z, tangent:{x,z}, normal:{x,z}} | null
world.roads.laneCenter(edgeId, laneIndex, t) -> {x,y,z,tangent} | null
world.roads.frontage(edgeId) -> [{side:'left'|'right', from, to, x, z, heading, width, length}]
world.roads.nearestEdge(x,z,maxDist) -> {edge, t, point, dist} | null
world.roads.isRoad(x, z) -> 0 | 1 | 2      // 0 unpaved, 1 asphalt, 2 sidewalk/kerb/verge — FROZEN
world.roads.coverage = { res: 512, cell: 4, data: Uint8Array, version }
```
**Heights off the road** (verified in `src/modules/roads/build.js`; no API returns these, so they are published
here as constants): `laneCenter(edgeId, lane, t).y` is the *profile* height; the asphalt surface is
`ROAD_LIFT = 0.08 m` above it and the **sidewalk top is `+ 0.21 m`** (`ROAD_LIFT + SW_H − 0.03`, `build.js:12,18`)
— the same figure `traffic.md` uses for vehicle height. A **lamp's** `y` is never re-derived from it: take
`lampPositions`' own `y`, which is `+0.95` on a median (`build.js:1222`) and `+0.21` otherwise (item 3a).
`isRoad(x,z) === 2` is **not** a sidewalk test: the
coverage mask marks the whole corridor out to `corridorHalf(type) + 0.4` (`build.js:503,532`), which includes the
0.8 m flat verge outside the sidewalk back and the graded slope beyond it. Item 3a is scoped by prop kind for
exactly this reason.
**Degrade:** if `world.roads.edges.size === 0`, place no road furniture, still scatter forest/park props, still
publish the full `api`; `log.warn` once. Never throw in `init`.

**`world.terrain`** (live today):
```js
getHeight(x, z) -> m       // bilinear, clamped outside bounds
getNormal(x, z, out?) -> Vector3 ; getSlope(x, z) -> rad ; isWater(x, z) -> bool
raycast(ray) -> {point, normal} | null ; heights: Float32Array ; resolution 513 ; cellSize 4
minHeight / maxHeight / seaLevel / version
features.river.zAt(x) ; features.river.halfWidthAt(x) ; features.coast.xAt(z) ; features.island
```
`ctx.modules.terrain` (guard with `?.`): `data()`, `stats()`, `material()`, `setGrassTufts(bool)`,
`setReflection(bool)`, `debug{…}`. **Degrade:** treat the ground as the plane `y = 0`; skip water/slope rejection.

**`environment`** (`ctx.modules.environment`, present in every showcase, still guard with `?.`):
```js
setupMaterial(material)   // CSM + fog uniforms — call it for EVERY material props owns, including ShaderMaterials
hookScene() ; getSunDirection() ; getMoonDirection() ; getLightDirection() ; getExposure() ; getNight()
```
`environment` also auto-sweeps new materials on `module:ready` and on any `*:changed` event, so emitting
`props:changed` after a rebuild is what hooks newly created materials — do it. Read per frame from `world.weather`:
`sunDir, lightDir, lightIntensity, skyLight, exposure, night, wetness, rain, cloudiness, fogDensity, wind{x,z,speed}`.
**Degrade:** plain `MeshStandardMaterial` behaviour, `night = 0`, `wind.speed = 2`.

**Read-only world sections** (present even when the owning module is absent — guard on `.size`):
`world.zones.lots: Map<id,{id, edgeId, side, cells, x, y, z, w, d, heading, nx, nz, type, density, corner, t, buildingId}>`,
`world.buildings.items: Map<id,{id, lotId, type, density, level, footprint, floors, height, x, y, z, heading, lit}>`.
Props reads these for lot props (gardens, driveway bollards, boundary hedge on **empty** lots only) and writes
neither.

**Core** (`src/core/`, exact signatures):
```js
ctx.assets.pbr(name, {repeat}) -> Promise<{map, normalMap, roughnessMap, aoMap, displacementMap, metalnessMap, armMap, entry}>
ctx.assets.applyPbr(material, set, {normalScale, aoIntensity, displacementScale})
ctx.assets.texture(url, {srgb, repeat, wrap, anisotropy, flipY}) ; ctx.assets.anisotropy ; ctx.assets.settle(ms)
ctx.assets.procedural.noiseTexture({size, seed, octaves, scale, lo, hi, srgb, colorA, colorB})
ctx.assets.procedural.noiseNormal({size, seed, scale, strength}) ; .gradient({size, stops, horizontal, srgb}) ; .solid(hex)
ctx.camera.registerPreset(name, preset) ; ctx.camera.apply(preset) ; ctx.camera.camera / .target / .distance
                                  // preset = {position:[x,y,z], target:[x,y,z]} or {yaw, pitch, distance, target:[x,y,z]}
ctx.rng.float() / .int(a,b) / .range(a,b) / .bool(p) / .pick(arr) / .weighted([[v,w]…]) / .gauss() / .shuffle(a) / .fork(label)
ctx.events.on(name, fn, 'props') / .emit(name, payload) ; ctx.engine.stats ; ctx.quality ; ctx.headless
ctx.log.info/warn/error
constants: WORLD_SIZE 2048, HALF_WORLD 1024, SEA_LEVEL 0, TILE_SIZE 128,   // props chunks at 256 m — see §5
           LAYERS.PROPS 4, LAYERS.NO_SHADOW 9, RENDER_ORDER.PROPS 40, RENDER_ORDER.TRANSPARENT 100,
           QUALITY[q].anisotropy / .instanceLod
```
Props meshes sit on `LAYERS.PROPS` at `RENDER_ORDER.PROPS`, set `castShadow`/`receiveShadow` (impostors:
`castShadow = false`), and scale scatter density by `QUALITY[ctx.quality].instanceLod`. `Math.random`, `Date.now()`
in logic, adding a light, and writing any `world` section other than `world.props` are forbidden.

**Consumers to not break:** `transit` reads `api.stops()` and `world.props.items` filtered by `kind === 'bus_stop'`;
`democity` builds through `api.place`/`api.rebuild`; `tools` will select props through `world.props.items`.
`traffic` is a **provider**, not a consumer, of the signal phase: props calls
`ctx.modules.traffic?.signalState(nodeId)` when it exists (preamble, item 10) and exposes
`api.signalFor(edgeId, atA)` as the read-through for anything else that wants an arm's state.

## 8. Showcase

`showcase.description`: one sentence naming the prop families in frame.

**Staged scene** — everything derived from `world.terrain` so it follows the seed; nothing hard-coded that drifts
if the heightfield changes. `setup(ctx)` must produce:

1. A **street grid with a signalised 4-way crossroads at (40, 40)** and an `avenue` running east–west through it,
   staged via `world.roads.addNode`/`addEdge` and `ctx.modules.roads.rebuild()`. The core `street` and `closeup`
   presets target (40, 0, 40) and (20, 6, 20) — furniture must be there or half the critic's matrix is empty.
2. A **tree-lined avenue**: street trees in both verges at 12–18 m, streetlamps on the roads' own anchors, benches,
   bins, hydrants, street-name and regulatory signs, and a **bus stop** with shelter, glass, seat and timetable.
3. A **park/plaza** of ≥ 80 × 80 m south-west of the grid: ornamental lantern posts, benches, bins, planters,
   bushes, clipped hedge runs, two fence types, and specimen trees of ≥ 3 species.
4. A **forest** of ≥ 2 500 trees on the rising ground north of the grid: ≥ 5 species, Poisson-disc, thinning with
   slope and altitude, stopping at the water's edge and at the road corridor.
5. At least one **empty zoned-style lot boundary** (hedge + fence + gate gap) so item 11c has both fence types in
   frame without `buildings` present.
6. A **water edge** in frame from `aerial` so item 15's reflection test has something to measure.
7. Never call `environment.setWeather`, never move the clock (the showcase router owns `?time=`), never add
   anything that is not a prop, and never add a light.

**Declared `showcase.cameras`** — exactly these eight, no more. Measured on this box, one SwiftShader shot of this
scene costs **254–660 s**: the nine `shots/props/dev_*.json` report `elapsedMs` of 253 761, 276 912, 299 511,
332 798, **353 644**, 478 753, 507 020, 530 838 and 659 980 ms, so the median is **≈ 354 s**. Item 21's 34-shot
matrix therefore runs to 34 × 354 s ≈ **3.3 h** per round per critic, and §4's 14 probe captures add
14 × 354 s ≈ **1.4 h** — **≈ 4.7 h** in all. That is the whole reason the preset list is capped at eight: a ninth
preset costs ≈ **6 min** for its 12:00 frame alone, and ≈ **18 min** if it is also shot at 22 and 17.5. Do not add
one — if a view is genuinely missing, replace one and say which in `docs/builds/`. (An earlier draft said
"300–592 s, median ≈ 500 s, ~25 minutes"; the nine files above contradict it.)

Register each with `ctx.camera.registerPreset(name, {yaw, pitch, distance, target})` computed from real node
positions.

| Preset | Frames | Must show |
|---|---|---|
| `forest` | Woodland from ~120 m, pitch 0.30 | ≥ 5 species by silhouette, crown-colour variety, no clone rows, dappled shadows (items 1, 2, 8) |
| `avenue` | Along the tree-lined avenue from ~45 m, pitch 0.20 | Lamp rhythm and needle shadows, street trees, benches, bins, signs, hedges (items 4, 11, 13) |
| `signal` | The (40, 40) crossroads from ~25 m, pitch 0.22 | Mast arm, 3-lens head with visors and backplate, ped head, pole base (item 10) |
| `lamp` | 12 m from one lamp base looking up-street, pitch 0.12 | Column taper, base collar, luminaire body, contact shadow; at 22 the pool and halo (items 4, 6) |
| `park` | The park from ~60 m, pitch 0.28 | Benches, bins, planters, bushes, hedge undulation, both fence types, lantern posts (items 11, 12) |
| `treecloseup` | 8 m from one broadleaf, pitch 0.15 | Trunk, ≥ 3 bifurcations, leaf clusters, sky through the crown, bark, litter ring, no alpha halo (items 1, 9a) |
| `busstop` | 15 m from the bus stop, pitch 0.18 | Shelter roof, glass panel, seat, timetable, kerb contact, sidewalk clearance (item 12) |
| `canopy` | Top-down over the avenue, ~90 m, pitch 0.95 | Tree spacing without a lattice, shadow dapple, impostors not edge-on (items 13e, 14) |

Shot at 12 by default; `avenue`, `lamp`, `signal`, `busstop` and `park` **also at 22**; `forest` and `park` also at
17.5.

**How each standard camera must read** (critic shoots `aerial, street, skyline, closeup` × `06.5, 12, 17.5, 22`,
noon and night by default plus golden hour):

- **aerial (520 m, pitch 0.85)** — props as landscape structure: woodland resolvable into crowns (item 18), the
  avenue readable as a double line of trees and lamp verticals, the park a distinct planted block. 06.5/17.5: long
  tree and lamp shadows raking across the ground. 22: a chain of warm pools down the avenue and a dark, still
  legible forest.
- **street (60 m, pitch 0.18, target 40/0/40)** — this is where CS2 is won: kerbside furniture at correct heights
  and spacings, trunk detail, hedge volume, contact shadows under everything, the signal head reading as an object.
  22: lamp pools on the road, one lit lens per signal, foliage falling away into the dark.
- **skyline (900 m, pitch 0.16)** — props as texture: coherent woodland massing, no speckle, no crawl, no impostor
  flicker; the tree line must not dissolve into a flat green band.
- **closeup (110 m, pitch 0.35, target 20/6/20)** — the core preset is pinned at **distance 110**
  (`src/core/camera.js:27`), where a 0.35 m trunk is ~4 px wide: it physically cannot show material identity, so
  it is not asked to. What it must show at 110 m: correct massing and heights against §3's table, contact
  darkening under **every** object, no card halos on any crown edge, no speckle (item 9c), and the park reading
  as a planted block rather than a scatter. **Material identity — bark vs painted metal vs glass vs foliage
  obviously different materials — is graded at `treecloseup` (8 m), `lamp` (12 m) and `busstop` (15 m)**, the
  presets close enough to resolve it.
- Plus `?showcase=all --camera aerial --time 12` (item 21) and one `--w 1280 --h 720` pair (item 24).
