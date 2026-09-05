# Module spec: `democity`

Role file: `docs/prompts/BUILDER.md` (builders) / `docs/prompts/CRITIC.md` (critics). Everything invariant lives
there and is not repeated here. `$REF` = `/tmp/claude-0/-home-user-SimBuild/c06ed41b-9bdf-5ab7-ace6-40b62a5e4281/scratchpad/ref`.

---

## 1. Purpose

Without `democity` SimBuild is fifteen disconnected demo stages and an empty 2048 m plain: this module is the city
itself — the one scene that is shipped, screenshotted and judged as "the game".

---

## 2. World data owned

**`democity` owns no `world.<section>`.** ARCHITECTURE §3 assigns every section to another module; `democity` is the
stand-in for the player, and it authors the city **only** through the owning module's public functions. Writing into
another section's `Map` directly, or assigning `world.roads = …`, is an automatic fail (ARCHITECTURE §3 rules, §4
"stay in your lane"). The exact call surface it may write through, copied from ARCHITECTURE §3 and from the owners'
code, is in §7. It reads `world.terrain`, `world.weather`, `world.economy`, `world.time` and never writes them.

State it does own, exposed as `api` on `ctx.modules.democity` — every field below is required and is probed:

```js
api: {
  plan()          -> { seed, districts:[{id, name, kind, x, z, w, d, heading, area}], landmarks:[{id, name, kind, x, y, z}],
                       corridors:{highway:[edgeId], arterial:[edgeId], bridges:[edgeId]},
                       transit:{lineName, colour, routeM, stops:[{x, z, name}]} },
  districtAt(x,z) -> {id, name, kind} | null,          // kind ∈ ['downtown','midtown','suburb','industry','port','park','waterfront','civic']
  stats()         -> { stageMs, districts, landmarks,
                       roads:{nodes, edges, lengthM, byType:{street,avenue,highway,alley,gravel}, bridges, ramps},
                       zones:{cells, lots, byType:{residential,commercial,industrial,office}},
                       buildings, services, transitLines, transitStops,
                       own:{drawCalls, triangles, trees, lamps, parked, vehicles, buses},
                       fallbacks:{props, traffic, services, transit} },
  fallbacks()     -> {props:bool, traffic:bool, services:bool, transit:bool},   // true = democity is substituting
  tour()          -> [{id, name, hour, seconds, camera:{position:[x,y,z], target:[x,y,z]}}],   // ≥ 8 stops
  startTour({loop = true, from = 0} = {}) -> bool,   // loop:bool; from:int, an index into tour(); other keys ignored
  stopTour()      -> void,  gotoStop(i) -> bool,
  tourState()     -> {running:bool, index:int, stop:string|null, t:number},
  restage({seed = world.seed, density = 1} = {}) -> Promise<stats>,
                  // seed:int ≥ 0; density:0..1 scales outer-ring lots and ornament counts only (the item 19 lever).
                  // restage() with no argument re-runs the current seed at density 1; other keys ignored.
  cropRects({project, width, height, camera}) -> {name:[x,y,w,h]},
                  // Pixel rects for items 3 and 4, from project(x,y,z) (BUILDER.md "Pinned landmarks"). Four names,
                  // the only ones any item reads: lamp_head + lamp_pool (one lamp's luminaire and the road patch
                  // under it) and sun_patch + shadow_patch (40×40 px of the SAME surface, one sunlit, one in cast
                  // shadow, in the ROAD REGION or on one lot plate). Omit any rect off screen for that camera.
  serialize()     -> {module:'democity', version:1, seed, staged:bool, plan},
  deserialize(d)  -> bool,   // **idempotent, and must not re-run generation**: it applies d.plan and rebuilds
                             // meshes; calling it twice with the same d leaves every stats() count identical
}
```

**Units, stated once so no item is argued.** Every coordinate and distance is metres (`x, z, w, d, routeM`,
`roads.lengthM`); every area is square metres — `districts[].area` is the district's own polygon area, not its
bounding box, and item 1's built area is quoted in km²; every duration in `stats()` is milliseconds; `heading` is
radians with `0` = the district's grid axis running north (−Z), the same convention as `buildings.md` §2 and
`world.zones` `lot.heading` (ARCHITECTURE §2, §3).

Events emitted. `democity:staged` and `democity:tour` are **not** in the ARCHITECTURE §5 table; they follow the
`section:verb` convention, and the builder must add them by writing `docs/core-requests/democity.md` proposing the two
rows (the integrator applies it between waves). Emit them regardless — a missing §5 row is not a reason to skip them.

| Event | Payload |
|---|---|
| `democity:staged` | `{ms, stats}` — once, after `showcase.setup` completes |
| `democity:tour` | `{stop, index, total, seconds}` — on every tour stop change |
| `audio:play` | `{sound, x?, z?, volume?}` — allowed to any module (§5); used for the tour only |

Events consumed: `module:ready` (re-attempt a dependency's staging once it appears), `sim:milestone` (optional toast
via `ctx.modules.ui.toast`), `time:hour` (tour scheduling only). It must **not** listen to `time:tick` for anything
that allocates.

---

## 3. Visual/behavioural target

ARCHITECTURE §12: *a 2 km² city: downtown high-rise, mid-rise mixed, suburbs, industrial park, highway with
interchange, river with 2 bridges, park, coast; camera tour*, plus §15: *also places services so the demo city has
coverage, pollution and land value, and runs one bus line.*

**`$REF/cs2_2.jpg` is the master shot.** What an art director reads in it, and what the composed frame must show:
a city that is *organised*, not scattered. A dense downtown of thin towers on one lobe of land, stepping down through
a continuous mass of mid-rise to low suburbs at the edge — the height falls off with distance from one clear centre,
never randomly. A highway threads through the whole frame as a continuous pale ribbon with sweeping curves and
merging ramps, and it is the only road that never bends sharply (grade separation is out of reach until roads
exposes a node-height setter — §4.7 — so it is a target here, not a requirement). Water cuts the land into lobes; every
crossing is a real bridge with piers and approach embankments, and both banks are developed right up to the water.
Industry sits on its own lobe against the water with a different, flatter, wider grain than the residential blocks.
Green is not decoration: forest wraps the built edge, a park breaks the grid, trees line the arterials. Distance is
carried by haze, and the far third of the frame has lower contrast but is still readable.

**`$REF/cs2_4.jpg` — suburb at low sun.** Detached houses on individual lots, driveways to the kerb, hedges and
fences, mown lawns, street trees at regular spacing, a two-lane road with a yellow centre line and a crosswalk. The
grain here is completely different from downtown: gaps between buildings, gardens, long shadows across grass.

**`$REF/cs2_8.jpg` — downtown at night.** The mass of the buildings goes dark; the light comes from windows,
shopfront interiors, lit signs, lamp heads and vehicle head/tail lights. Lamp pools on the road are soft ellipses,
not sprites brighter than the surface they sit on. This is the single hardest frame in the project.

**`$REF/cs2_7.jpg` — industrial.** Long shallow sheds, silos, stacks with white plumes, a crane, a wide concrete
apron, service roads with a coarser grain, and green service corridors between plots.

**`$REF/cs2_1.jpg` — near top-down on an interchange.** Sweeping ramp geometry with correct radii, a landscaped
loop interior with trees and shrubs, barriers, arrows, crosswalks at the surface junction, vehicles distributed
along the lanes rather than bunched.

**Anchors for this module specifically.** `10` = a stranger shown the aerial and the night street cannot tell it
from `$REF/cs2_2.jpg` / `$REF/cs2_8.jpg`. `8.5` = the city is legible as a real place — clear centre, graded
density, working highway, lit night — with nits in material or prop detail. `7` = a plausible city with one systemic
weakness (e.g. suburbs and midtown look the same, or night is dusk). `6` = a grid of buildings with no district
structure. `5` = boxes on a plain. `3` = an empty map or a black frame.

---

## 4. Acceptance criteria

Every item is checked against a named file from the shot set below, or against a page-evaluate probe at
`?showcase=democity&headless=1&time=<h>` reading `window.__sim.registry.apis.democity` (`src/core/registry.js:15`,
the same object the module sees as `ctx.modules.democity`) and `window.__sim.world` (`src/core/debug.js`). There is
no third source of evidence.

**Shots taken this round.** `<dir>` = `shots/democity/r<n>/` for a critic and `shots/democity/rdev<n>/` for a builder
(`--round dev<n>`, as `BUILDER.md` prescribes); every filename below is relative to it. Run exactly this set — **every
file any acceptance item names appears here, and nothing here is optional**:

```bash
# a. the standard matrix at all four times — 16 frames. This overrides CRITIC.md's default --times 12,22:
#    items 5, 9 and 18 grade 06.5 and 17.5 frames.
node tools/gauntlet.mjs --module democity --round <n> --times 6.5,12,17.5,22
#    -> <dir>/{aerial,street,skyline,closeup}_{6p5,12,17p5,22}.png + .json, and <dir>/summary.json

# b. the two core presets the items name that the matrix does not shoot. Both are real presets in
#    src/core/camera.js (overview :24, pitch 1.35 d1400; night_street :28, d90 target [-40,0,60]) — no §8 entry.
node tools/screenshot.mjs --showcase democity --camera overview     --time 12 --out <dir>/overview_12.png     --timeout 240
node tools/screenshot.mjs --showcase democity --camera night_street --time 22 --out <dir>/night_street_22.png --timeout 240 --crops

# c. the eight declared presets of §8, each at the hour the item that grades it names — 9 frames
node tools/screenshot.mjs --showcase democity --camera downtown       --time 12   --out <dir>/downtown_12.png       --timeout 240
node tools/screenshot.mjs --showcase democity --camera night_downtown --time 22   --out <dir>/night_downtown_22.png --timeout 240
node tools/screenshot.mjs --showcase democity --camera interchange    --time 12   --out <dir>/interchange_12.png    --timeout 240
node tools/screenshot.mjs --showcase democity --camera bridge         --time 12   --out <dir>/bridge_12.png         --timeout 240
node tools/screenshot.mjs --showcase democity --camera suburb         --time 12   --out <dir>/suburb_12.png         --timeout 240
node tools/screenshot.mjs --showcase democity --camera suburb         --time 6.5  --out <dir>/suburb_6p5.png        --timeout 240
node tools/screenshot.mjs --showcase democity --camera industry       --time 12   --out <dir>/industry_12.png       --timeout 240
node tools/screenshot.mjs --showcase democity --camera park           --time 12   --out <dir>/park_12.png           --timeout 240
node tools/screenshot.mjs --showcase democity --camera waterfront     --time 17.5 --out <dir>/waterfront_17p5.png   --timeout 240

# d. the second seed (item 21) — the noon matrix plus the two presets items 7 and 8 grade
node tools/gauntlet.mjs --module democity --round <n>s7 --seed 7 --times 12    # builder: --round dev<n>s7
node tools/screenshot.mjs --showcase democity --camera interchange --time 12 --seed 7 --out shots/democity/r<n>s7/interchange_12.png --timeout 240
node tools/screenshot.mjs --showcase democity --camera bridge      --time 12 --seed 7 --out shots/democity/r<n>s7/bridge_12.png      --timeout 240

# e. 720p and the two whole-game frames (item 20)
node tools/screenshot.mjs --showcase democity --camera aerial --time 12 --w 1280 --h 720 --out <dir>/aerial_12_720p.png --timeout 240
node tools/screenshot.mjs --showcase all --camera aerial --time 12 --out <dir>/all_aerial_12.png --timeout 240
node tools/screenshot.mjs --showcase all --camera aerial --time 22 --out <dir>/all_aerial_22.png --timeout 240

# f. item 17's repeatability pair: the identical URL shot twice (screenshot.mjs already sets speed=0).
#    --crops here also produces item 4's pinned rects for closeup_12: the two frames are the same URL and item 17
#    requires them to be pixel-identical, so one crops.json serves both.
node tools/screenshot.mjs --showcase democity --camera closeup --time 12 --out <dir>/closeup_12_repeat.png --timeout 240 --crops
```

37 PNGs. `?showcase=all` and `?showcase=democity` stage the **same** scene (`src/main.js:87` maps a missing or `all`
showcase to `democity`), so (e)'s two frames are a re-shoot under the other name: they must be as clean as (a)'s, and
their `.json` is where item 20 reads the sixteen module statuses. Budget 30–170 s per capture under SwiftShader.

**Probes and scripts, four outputs, written beside the shots.** `<dir>/probe.json` — everything read from `api` and
`world` (items 1, 2, 6–17, 19, 21–24). `<dir>/cityfill.json` — item 2's ground-classification grid. `<dir>/imgstats.json`
— the whole-frame luminance rows of items 3, 4, 5 and 18. `<dir>/tiling.json` — item 18's autocorrelation. The critic
writes these scripts under `shots/democity/r<n>/` (CRITIC.md permits a throwaway probe there); the builder keeps its
copies inside its blast radius at `src/modules/democity/tools/` and writes their output to `shots/democity/rdev<n>/`.
**A number whose probe output or named crop is not saved is ungraded** — the critic records it as missing evidence,
not as a failure (roads.md's rule, adopted here unchanged).

**Measurement conventions** (builder and critic both use these; deviating from them is a finding, not a defence).

- `L = 0.2126R + 0.7152G + 0.0722B` on the 8-bit sRGB PNG, 0–255. `p1/p50/p99` are percentiles of `L`; `sat` is mean
  HSV saturation; hue is HSV `H` in degrees. Two scales, and **every item names one**:
  - **480-px whole frame** (the PNG downscaled to 480 px wide, as `shots/environment/r2/imgstats.mjs` does): item 3's
    frame mean, p50, p99/p50 and above-180 fraction; item 4's and item 5's whole-frame percentiles, means, std,
    saturation and pixel-fraction thresholds; item 5's flat-patch test; item 20's letterbox check.
  - **Full resolution** (1920 × 1080, or 1280 × 720 for the 720p frame): item 3's cluster count and its lamp-head vs
    road-pool comparison; item 4's two 40 × 40 patches; item 5's shadowed-asphalt hue; items 16 and 17's pixel
    measurements; item 18's autocorrelation and its `L > 245` count. **No cluster, crop or per-material statistic is
    ever taken at 480 px** — at that scale a lamp pool is four pixels.
- **PINNED CROPS** (items 3 and 4). The only rects any item measures inside are the four named in §2's `cropRects`,
  read from `<shot>.crops.json` as `democity.<name>` — written by `node tools/screenshot.mjs … --crops` from
  `window.__sim.cropRects()`, which is the **authoritative** producer of that file (ARCHITECTURE §8, `src/core/debug.js`).
  No other mechanism produces `crops.json`, and no item may use hand-guessed coordinates. Statistics inside a pinned
  rect are taken on the **full-resolution** PNG, never on a downscaled copy: at 480 px wide a 1 m patch is two pixels.
  If `crops.json` is missing or empty the measurement is a **builder defect** (`cropRects` not implemented) and the
  item is reported as such, not failed unmeasured (CRITIC.md "Pinned landmarks").
- **BRIGHT CLUSTERS** (item 3): on the full-resolution frame, threshold `L > 150`, label **8-connected** components,
  discard components smaller than **4 px**, count what remains. Item 3's "4 × 4 frame tile" is the frame cut into
  sixteen equal rectangles; a tile *contains built area* if ≥ 1 of item 2's `cityfill` grid samples landing in it was
  classified as city.
- **AUTOCORRELATION** (item 18): greyscale the full-resolution frame; form the per-column mean signal and the per-row
  mean signal; detrend each by subtracting its own **101-px moving average**; normalise; take **max |r| over lags
  24–400 px**. Both signals must be **≤ 0.55**. Same algorithm as `simulation.md` item 19 and `audio.md` item 24, at a
  looser threshold because a city frame legitimately contains a repeating street grid.
- **FLAT-PATCH TEST** (item 5): on the 480-px frame, compute the `L` std of every 24 × 24 px window at stride 12; a
  flat patch is a 4-connected group of such windows all with std < 6; the item fails if any single patch covers ≥ 5 %
  of the frame area.
- **ROAD REGION and SHADOWED ASPHALT** (item 5), by group-visibility diff in **one** page session — never two
  `screenshot.mjs` runs: capture the frame, set `__sim.registry.get('roads').group.visible = false`
  (`src/core/registry.js:12` creates the group, `:99` returns the record; `roads` has no `debug.setVisible` yet), wait
  5 frames, capture again. ROAD REGION = pixels with `|ΔL| > 6`. Erode it by 3 px; SHADOWED ASPHALT = the eroded
  region's pixels below its own 40th percentile of `L`. Item 5's hue and saturation are measured over exactly those
  pixels in `street_17p5` and the pixel count is reported; below 2 000 px the statistic is ungraded, not failed.
- **DEMOCITY'S OWN PIXELS**, wherever an item needs them, use the same one-session diff on
  `__sim.registry.get('democity').group`. **BUILT AREA** (item 1) is world-space, not pixels: the union of 64 m cells
  containing a road edge, a lot or a landmark, computed in `probe.json`.

**Weight, so the checklist maps onto the §3 anchors.** Every item carries **[blocker]**, **[major]** or **[minor]**.
Blockers are items 1, 2, 3, 4, 6, 7, 8, 9, 17, 18, 19, 20 — §12's named contents, CRITIC.md's hard-fail list, and the
budget. Majors are 5, 10, 11, 12, 13, 14, 15, 16, 21, 23, 24. Item 22 is the only minor. A camera that moves during a
capture invalidates every other measurement in this list, but it is not graded twice: item 17's blocker already
catches it, because a drifting camera cannot produce two pixel-identical shots of the same URL.

- Any **blocker** failing caps the score at **6**, whatever the frames look like.
- **Three or more majors** failing caps it at **7.5**; one or two cost **0.5 each** off the anchor the frames earn.
- **Minors** are recorded with evidence and cost at most **0.2** in total.
- The tags set a **ceiling, never a floor**: a checklist fully met that still reads as §3's `7` scores 7. The anchors
  decide the number; the tags decide how far a failure drags it down.

**Attribution rule (settled here so no round is spent arguing it).** `?showcase=democity` initialises all 16 modules,
so another module's defect appears in these frames. A defect that reproduces in that module's *own* showcase at the
same camera and time is recorded in democity's report as **inherited** — listed, with evidence, but not scored
against democity. A defect that exists only in the composition — placement, density, seating, framing, coverage,
budget, or a look democity could have changed through the public preset APIs in §7 — is democity's.

1. **[blocker] The city is at the scale of §12.** Probe `api.stats()` at `?showcase=democity&time=12`:
   `roads.lengthM ≥ 18_000`, `roads.edges ≥ 450`, `roads.nodes ≥ 400`, all five non-`ramp` types present
   (`ramp` is a sixth type roads defines, counted separately by `stats().roads.ramps` — §7) with
   `byType.highway ≥ 20`, `byType.avenue ≥ 40`, `byType.alley ≥ 15`; `zones.cells ≥ 11_000` with all four
   `byType` non-zero and `residential ≥ 0.40 × cells`; `zones.lots ≥ 1_400`; `buildings ≥ 1_200` and `≤ 2_400`;
   `landmarks ≥ 6`. The built area — the union of 64 m cells containing a road edge, lot or landmark — is
   `≥ 2.0 km²` and `≤ 3.2 km²`. Nothing is built where `world.terrain.isWater(x,z)` is true except bridge edges.
2. **[blocker] The four default cameras frame the city.** The critic shoots `aerial|street|skyline|closeup` with the *core*
   presets (`src/core/camera.js`), whose targets are fixed at `[0,0,0]`, `[40,0,40]`, `[0,40,0]`, `[20,6,20]`; the
   layout must be built around them. Verified in `aerial_12.png`, `street_12.png`, `skyline_12.png`,
   `closeup_12.png` and by probe:
   - `skyline` (yaw 2.2, pitch 0.16, d 900): ≥ 12 buildings taller than 60 m lie within 260 m of the origin and
     occupy ≥ 18 % of the frame width, with sky visible above the tallest.
   - `aerial` (pitch 0.85, d 520): the frame is filled by city, measured as a **probe, not a colour heuristic** —
     a colour test cannot separate the required park from the required forest edge. Apply the `aerial` preset, sample
     a 40 × 40 grid of NDC points (`x, y` stepping over `−0.975 … 0.975`) through `ctx.camera.screenToGround(x, y)`
     (`src/core/camera.js:123`), and classify each hit. **Discard** samples where it returns `null` (the ray missed
     the ground: sky) and samples where `world.terrain.isWater(x,z)`. Of the remainder, **≥ 75 %** must satisfy
     `world.roads.isRoad(x,z) > 0 || world.zones.cellAt(x,z) || world.buildings.at(x,z) || api.districtAt(x,z)`,
     and **≥ 45 %** must satisfy the first three alone — so a district polygon stretched over open ground cannot
     carry the item. Sky % and water % are written to `cityfill.json` and **reported separately, never counted
     against democity**: a well-framed coastal city legitimately has both. Why the number is reachable next to
     items 1 and 12, derived rather than asserted: at pitch 0.85 rad (48.7°) / d 520 the camera sits 520·sin 0.85 =
     391 m up and 520·cos 0.85 = 343 m back from the origin; with the fixed 45° vertical fov
     (`src/core/camera.js:10`) the frame's ground footprint runs 391/tan(48.7°+22.5°) = 133 m to
     391/tan(48.7°−22.5°) = 794 m from the nadir, and at 16:9 the far corners land 451 m past the origin and 602 m
     to the side — 752 m from the origin, ~0.58 km² of ground in all. That is comfortably inside item 1's
     ≥ 2.0 km² built area, but only if the city is compact and built around the origin.
   - `street` (d 60, target `[40,0,40]`): the target is within 12 m of a `street`/`avenue` centreline
     (`world.roads.nearestEdge(40,40,40).dist ≤ 12`), with ≥ 3 buildings within 45 m on each side.
   - `closeup` (d 110, target `[20,6,20]`): ≥ 6 buildings within 80 m, ≥ 1 signalised intersection in frame.
   - `night_street` (target `[-40,0,60]`, d 90): a downtown canyon, not a suburban street — probe
     `world.buildings.items` for **≥ 12 buildings with `height > 40` within 120 m of `[-40, 60]`**.
3. **[blocker] Night is night, and the city is drawn by its own lights.** `aerial_22.png`, `skyline_22.png`,
   `night_street_22.png`, `night_downtown_22.png`, **at 480 px**: frame mean luminance ≤ 55 and p50 ≤ 42;
   p99/p50 ≥ 4.0; ≥ 0.8 % and ≤ 6 % of pixels above luma 180. **At full resolution**: ≥ 300 BRIGHT CLUSTERS
   (conventions — `L > 150`, 8-connected, ≥ 4 px) in `aerial_22`, distributed so every 4×4 frame tile containing
   built area has ≥ 1. `$REF/cs2_8.jpg` is the look; the cluster count and distribution are what is graded, because
   "window grids, lamp pools and vehicle lights are distinguishable" has no instrument. **No emissive sprite may be
   brighter than the surface it illuminates**: in `night_street_22.crops.json` (PINNED CROPS), peak `L` inside
   `democity.lamp_head` minus peak `L` inside `democity.lamp_pool` ≤ 60, at full resolution.
4. **[blocker] Noon is neither washed out nor crushed.** `aerial_12`, `skyline_12`, `street_12`, `closeup_12`:
   p1 ≥ 3 and ≤ 40; p50 ∈ [55, 130]; p99 ≤ 248; pixels at 255 in any channel < 0.20 %; whole-frame luminance
   std ≥ 28 in `aerial_12` (terrain_r1 failed at 8.8); mean HSV saturation ≥ 0.18; lit-ground to shadowed-ground
   luminance ratio ≥ 2.5:1 measured at full resolution inside `democity.sun_patch` and `democity.shadow_patch` of
   `closeup_12_repeat.crops.json` (PINNED CROPS — the same URL as `closeup_12`, so the rects apply to both frames).
5. **[major] Golden hour is not milky.** `aerial_6p5`, `skyline_17p5`, `street_17p5`, `closeup_6p5` **at 480 px**: pixels
   above luma 235 < 1.5 % of the frame; **no FLAT PATCH (conventions) covers ≥ 5 % of the frame** — that is the flat
   haze wash, measured rather than eyeballed. The far third of `skyline_17p5` — the 120-px band immediately below the
   horizon row `y_h = H/2 × (1 − tan(pitch)/tan(fov/2))`, with `pitch` from the shot's `cameraState` block
   (`tools/screenshot.mjs:101`) and `fov` the fixed 45° — keeps std ≥ 12. Shadows read cool-blue, not steel-cyan:
   over the SHADOWED ASPHALT mask of `street_17p5` (conventions, full resolution, ≥ 2 000 px or ungraded) mean hue is
   within 200–250° and mean saturation ≤ 0.28. This is democity's item because it selects the weather and grade
   preset (§7).
6. **[blocker] District structure, readable from the air.** `aerial_12` and `overview_12`: ≥ 6 districts from
   `api.plan().districts` covering `downtown`, `midtown`, `suburb` (≥ 2 instances), `industry`, `park` and one of
   `port`/`waterfront`. Building height falls monotonically with distance from the downtown centroid when binned
   in 150 m rings (median height of ring *n+1* ≤ median of ring *n* for the first 5 rings). `districtAt` returns
   the right district for 20 probe points. Grain differs: mean building footprint area in `industry` ≥ 2.2× that in
   `suburb`; mean building spacing in `suburb` ≥ 2.0× that in `downtown`. `$REF/cs2_2.jpg`.
7. **[blocker] Highway with an interchange.** `interchange_12.png` and probe: a continuous `highway` corridor
   ≥ 2_200 m from one map edge to another (or to a second edge via a bend), no segment turning more than 0.9°/m;
   one interchange with ≥ 3 `ramp` edges connecting it to the arterial network — roads recognises a merge only when
   the ramp arm is `oneWay` with `lanes: 1` and is not a ring member (`build.js:215`), which is what `type: 'ramp'`
   gives by default; barriers or a median on the highway mainline. `$REF/cs2_1.jpg`.
   **Grade separation is ungraded until the capability exists, and this is not a failure.** roads derives every node
   height from the terrain — `addNode(x,z)` sets `designY` from `terrain.getHeight` (`network.js:41`) with no setter
   afterwards, `nodeHeights()` averages the terrain-smoothed arm profiles (`build.js:470–481`), and `opts.elevation`
   is accepted at `network.js:53` and then overwritten by `e.elevation = e.bridge ? 1 : 0` (`build.js:499`). A deck
   appears only over water or where a blended profile happens to sit `BRIDGE_MIN = 6 m` above terrain, and democity
   may not call `terrain.modify` (§7). Round 1 therefore files `docs/core-requests/democity.md` asking roads for
   `addNode(x,z,{designY})` or `roads.setNodeHeight(id,y)`; until it lands, a Δy between crossing centrelines is
   **not measured and not scored**, and the interchange is graded on continuity, curvature, ramp count and barriers
   alone. Carrying a ramp over the river or a mapped gully counts, but is not required.
8. **[blocker] River with two bridges, no floating decks.** `bridge_12.png` and probe: exactly ≥ 2 distinct edges with
   `edge.bridge` truthy crossing the river centreline (`world.terrain.features.river.zAt(x)`), at least 300 m
   apart, on different road types. For every bridge, sampled at 40 points: deck `y` ≥ water surface + 3.5 m over
   the channel, and at both ends `|deck.y − world.terrain.getHeight| ≤ 0.30 m` within 8 m of the abutment — no
   air gap, no sunken approach. Both banks are built up to within 60 m of the water on ≥ 60 % of the river's
   in-city length.
9. **[blocker] Everything is seated in the ground.** Probe over 400 deterministic samples (every landmark corner, 200 random
   buildings' footprint corners, 100 democity-owned props): `|objectBaseY − world.terrain.getHeight(x,z)| ≤ 0.25 m`
   for the highest corner, and no sample has terrain above the object's base plate. Confirmed visually in
   `closeup_12`, `suburb_6p5`, `industry_12`: no object floats and none is half-buried.
10. **[major] Suburbs read as suburbs.** `suburb_12.png` and `suburb_6p5.png` for the look (`$REF/cs2_4.jpg`), and a
    probe over the buildings whose centre falls in a `suburb` district (`api.districtAt`) for the numbers. democity's
    lever here is which lots it zones and at what level it spawns them; the driveway, hedge, lawn and garden geometry
    is owned by `buildings` and `props`, so the probe reads their data, never the frame:
    - ≥ 250 low-density residential buildings across ≥ 2 pockets.
    - ≥ 70 % of them have `plan.driveway === true` **and** (`plan.hedge || plan.fence`) in
      `world.buildings.items` — `buildings/generate.js:75–77` plans the hedge only at level ≥ 2 (P ≈ 0.82 there,
      P ≈ 0.40 at level 1), so this is a constraint on democity's `setLevel`, not on buildings.
    - ≥ 2 `world.props.items` entries with `kind` starting `tree_` inside the lot rectangle for ≥ 70 % of suburb
      residential lots — props' garden pass (`props/place.js:331–343`) plants exactly two per residential lot, so
      this reduces to "the suburb lots exist and are typed `residential`". Probed **at capture time**, not at the
      end of `setup` (item 15).
    - ≥ 5 distinct `plan.roofTile` values and ≥ 4 distinct `styleId` values across those buildings; no two
      buildings within 25 m of each other share both footprint (±1 m) and `plan.roofTile`.
    A house missing its driveway or hedge when `plan` says it has one is **inherited** against `buildings`.
11. **[major] Industrial park and port.** `industry_12.png` for the look (`$REF/cs2_7.jpg`), probe for the numbers:
    ≥ 40 industrial buildings inside the `industry` district, served by ≥ 6 `gravel` or `street` edges of its own
    (item 6 already grades the coarser grain, as a footprint-area ratio; "block" is not defined anywhere in this
    project and is not measured here). democity-owned landmark meshes in `api.plan().landmarks`: ≥ 3 of kind
    `silo`, ≥ 2 of kind `stack`, ≥ 2 of kind `crane`, every `crane` within 80 m of water
    (`world.terrain.isWater`), plus ≥ 1 of kind `apron`. Industry is ≥ 400 m from the downtown centroid and
    downwind (`world.weather.wind`) or across water from the nearest residential district.
12. **[major] Park, waterfront and the green edge.** `park_12.png`, `waterfront_17p5.png` for the look; the counts are
    probed from `world.props.items` **at capture time** (item 15), never from `stats().own.trees`, which item 15
    requires to be 0 while props is real. **The trees and lamps here are props', and democity's only lever is
    layout**: props scatters forest wherever there is no road and no lot, above 1.2 m, below slope 0.72, and ≥ 15 m
    from a road (`props/place.js:81–121`), and lamps come from `roads.lampPositions` on every edge type **except
    `gravel`** (`props/place.js:202`). So leave the park polygon unlotted and run an `alley` — not a gravel path —
    through it for the lamps, accepting that the alley costs a 30 m-wide band of forest.
    - Park polygon ≥ 25_000 m² in `api.plan().districts` (`kind: 'park'`), with a water or plaza feature and at
      least one `alley` or `street` edge crossing it.
    - ≥ 120 `world.props.items` entries with `kind` starting `tree_` inside that polygon, across ≥ 3 distinct
      `kind` values — props ships exactly three species (`tree_oak`, `tree_pine`, `tree_birch`), so 3 is both the
      floor and the ceiling. Crown colour is a per-instance tint that never reaches `world.props.items` and is
      therefore not graded. The number is reachable: a 25 000 m² park less a 160 m alley's 30 m exclusion band
      leaves ~20 000 m², and props' 6.1 m scatter grid holds ~540 candidate sites there. If props' own scatter
      still yields < 120 in an unlotted park polygon, that is **inherited** against props, with the probe number
      as evidence.
    - ≥ 1 `streetlamp` entry inside the polygon.
    - No two tree entries within 8 m of each other share both `heading` (±5°) and `scale` (±3 %).
    - A coastal or riverside promenade ≥ 350 m with a seawall or beach edge, and a treed edge wrapping the built
      area so no district ends in bare terrain at a straight line — both from `park_12`/`waterfront_17p5`/`aerial_12`.
13. **[major] Services placed and covering (ARCHITECTURE §15).** ≥ 14 service items across ≥ 9 distinct
    `world.services.kinds`. **The enum is exactly** (`src/core/world.js:96`): `power_coal, power_wind, power_solar,
    water_pump, sewage, landfill, incinerator, clinic, hospital, school, high_school, university, police, fire,
    park_small, park_large, plaza`. `'power'` and `'water'` are **not kinds** — `place('power', …)` returns `null`.
    The nine required placements, by exact string: one of `power_coal|power_wind|power_solar`, `water_pump`,
    `sewage`, one of `landfill|incinerator`, one of `clinic|hospital`, one of `school|high_school|university`,
    `police`, `fire`, and one of `park_small|park_large|plaza`.
    **Coverage is a different vocabulary — the aggregate keys** `power`, `water`, `sewage`, `garbage` alongside the
    per-kind keys; precedent, `src/modules/simulation/economy.js:420` calls `env.coverage('power', x, z)` while
    `economy.js:413–414` call `coverage('school'…)` and `coverage('clinic'…)`.
    **Lane one — `services` real:** ≥ 85 % of residential buildings have
    `world.services.coverage('power',x,z) > 0` and `coverage('water',x,z) > 0`; ≥ 60 % have non-zero health
    (`clinic`+`hospital`) **and** education (`school`+`high_school`+`university`) coverage. Every service item is on
    a lot with road frontage (`world.roads.nearestEdge(x,z,60)` non-null).
    **Lane two — `services` stubbed** (the state at the time of writing; `world.services.coverage` is then the
    `src/core/world.js:100` placeholder returning `0`): democity's fallback (item 15) places the same 14 as its own
    landmark meshes, this item is graded **on silhouette and placement only**, the coverage percentages are
    **ungraded** rather than failed, and `stats().services` reports the fallback count.
14. **[major] One bus line running (ARCHITECTURE §15).** Two lanes, exactly as item 13. The critic establishes which lane
    applies **before grading** by testing `typeof ctx.modules.transit?.createLine === 'function'`; the builder states
    the lane it built for in `docs/builds/democity_r<n>.json`. Grading the other lane's clauses is a finding against
    the critic, not the builder.
    - **`transit` real:** `world.transit.lines.size ≥ 1`; the line has ≥ 8 stops, a closed route of ≥ 2_400 m that
      only uses road edges, ≥ 4 buses on it, and a colour. democity creates it **only** through
      `transit.createLine({name, colour, stops})` — §2's ownership rule applies to `world.transit` like any other
      section.
    - **`transit` stubbed** — the state at the time of writing: `src/modules/transit/index.js` is the stub, with no
      line-creating api, and `world.transit` is the bare `{lines: new Map(), stops: new Map(), version: 0}` of
      `src/core/world.js:105`. democity runs the line itself and is graded on **its own** numbers:
      `api.stats().transitLines ≥ 1` and `stats().transitStops ≥ 8`; `api.fallbacks().transit === true`;
      `stats().own.buses ≥ 4`, each driving a `world.roads.laneCenter` lane; and `plan().transit.routeM ≥ 2_400`
      over `plan().transit.stops.length ≥ 8` stops, the route closed (first stop = last stop within 1 m) and every
      leg on road edges. **democity writes nothing into `world.transit`**: probe `world.transit.version === 0` and
      `world.transit.lines.size === 0` after staging. Writing the line into `world.transit` to satisfy lane one is
      the automatic fail of §2, not a shortcut.
    - **Both lanes:** in `street_12` or `downtown_12` at least one bus is visible on the road and at least one
      bus-stop prop is at the kerb.
15. **[major] The fallback layer is correct and self-disabling.** democity substitutes its own instanced
    content for a stubbed dependency and places **nothing** of that kind when the real module is present. Detection
    is by function presence, never by module name — and by **these exact functions**, because the obvious guess is
    wrong for two of the four (§7):
    - `props` real ⟺ `typeof ctx.modules.props?.rebuild === 'function'`. **Not `place`**: the landed props module
      has none, so a `place` test reports "stubbed" for a real props and produces precisely the duplicated-ornament
      failure of §6.
    - `traffic` real ⟺ `typeof ctx.modules.traffic?.spawnVehicle === 'function'`.
    - `services` real ⟺ `typeof ctx.modules.services?.place === 'function'` — **the module api, not
      `world.services.place`**, which always exists as the `src/core/world.js:101` placeholder returning `null`.
    - `transit` real ⟺ `typeof ctx.modules.transit?.createLine === 'function'`.

    `infoviews` and `tools` need no fallback: leave `world.infoview.active` at `null` and place nothing.

    **Only two of the four branches can fire today**, and this is what round 1 builds. `props` and `traffic` are
    real (§7), so their fallback branches are **dormant**: do not write a tree, lamp, moving-vehicle or parked-car
    layer, and the probe grades the real side only — `api.fallbacks()` returns
    `{props:false, traffic:false, services:true, transit:true}`, and
    `stats().own.{trees, lamps, vehicles, parked}` are all `0`. `services` and `transit` are stubs, so their
    fallbacks are live and items 13 and 14 grade them. If a later wave lands `services` or `transit`, the same four
    tests must turn those branches off with no code change; if a wave were ever to *un*-land `props` or `traffic`,
    the branch is written then, against numbers set then. No democity prop within 1.5 m of a `world.props.items`
    entry, measured **at capture time, not at the end of `setup`**: props fills that Map from its own `update()`
    ~0.12 s after the `roads:changed` that `roads.rebuild()` emits (§7), so it is still empty when democity's staging
    finishes. The fallback layer is ≤ 6 draw calls per kind.
16. **[major] Street level is alive.** `street_12`, `closeup_12`, `night_street_22` for the look; the counts come from
    `world.traffic.vehicles` and `world.traffic.pedestrians`, whose entries carry `kind`, `x/y/z`, `heading`,
    `edgeId`, `lane` and `lightsOn` (`traffic/sim.js:238–252`). Within 150 m of the `street` target `[40,0,40]`:
    ≥ 12 vehicles, ≥ 8 pedestrians, and ≥ 5 distinct `kind` values (traffic ships eight classes —
    sedan, hatchback, suv, taxi, pickup, van, truck, bus — `traffic/sim.js:18`). democity's part of this item is
    that the road network carries enough routable street/avenue length at that spot for traffic to populate it;
    lane placement, side of the road and head/tail-light direction are traffic's, and a defect in them is recorded
    as **inherited** under the attribution rule, with the probe number as evidence.
17. **[blocker] No z-fighting, no flicker, no seams.** `closeup_12.png` and `closeup_12_repeat.png` — the identical URL shot
    twice in block (f), `speed=0` being `screenshot.mjs`'s default — differ by meanAbs < 1.5/255 at full resolution
    outside animated content (traffic, water, foliage sway; name the excluded rectangles). **A camera tour left
    running in headless fails here** — that is where item 22's auto-start clause is scored. At `closeup_12` and `aerial_12` no coplanar flicker between road,
    markings, lot plates, park paths and terrain; democity's own ground plates sit 0.03–0.06 m above terrain and
    never rely on `polygonOffset`. No hard straight line where one district's ground treatment meets another's.
18. **[blocker] No tiling, no specular sparkle at city scale.** `aerial_12`, `overview_12`, `aerial_17p5`, full resolution:
    no ground or facade pattern repeats on a visible lattice — **AUTOCORRELATION (conventions): max |r| ≤ 0.55 over
    lags 24–400 px, for both the row signal and the column signal, in all three frames**, written to `tiling.json`.
    Pixels with luma > 245 on non-window surfaces < 0.05 % of the frame. Any material democity itself creates uses roughness ≥ 0.55 and `normalScale` ≤ 0.6.
19. **[blocker] Budget, whole scene** (§5). From every `.json` of the shot set above: `drawCalls ≤ 1500` at every
    camera/time and `≤ 1200` in the four `aerial_*` frames and `overview_12`; `triangles ≤ 3_000_000` and `≤ 2_200_000` at `overview`; `heapMB ≤ 512`;
    `moduleMs.democity ≤ 1.0` when idle and `≤ 2.0` during a tour; `textures ≤ 180`. Probe `stats().own.drawCalls
    ≤ 50` with all dependencies real, `≤ 130` with the `services` and `transit` fallbacks active (§5). If a shot exceeds a limit, democity reduces
    its own staged density (outer ring lots, tree count) — the number is its responsibility because it chooses how
    much city to build.
20. **[blocker] Zero console errors, everything `ready`, and 720p.** `errors: []` in every shot, including
    `--showcase all --time 12`, `--showcase all --time 22`, and one `--w 1280 --h 720 --camera aerial --time 12`.
    `modules.<name>.status === 'ready'` for all 16 modules in every `.json`. In the 720p shot the scene fills the
    viewport with no letterbox and no clipped 3-D content; any HUD overflow is recorded as **inherited** against
    `ui` with the measurement, not scored here (democity adds no DOM of its own).
21. **[major] Deterministic, and it round-trips.** (CRITIC.md already greps for `Math.random`; it is not repeated here.)
    `Date.now()` /
    `performance.now()` appear only in `stageMs`. Two runs at `--seed 1337` give identical `api.stats()` counts and
    identical `plan()` district centroids to 0.01 m; `--seed 7` changes ≥ 30 % of district centroids by > 50 m and
    still satisfies items 1, 2, 7, 8 and 9 — graded on the seed-7 shot set (d) in `shots/democity/r<n>s7/` plus a
    probe at `?showcase=democity&headless=1&time=12&seed=7`, and on nothing else. `serialize()` → reload →
    `deserialize()` reproduces the same `stats()` counts without re-running generation (§2: `deserialize` is
    idempotent). `restage()` twice in a row gives identical counts with no orphaned geometry
    (`stats().own.triangles` returns to within 1 %), and `restage({seed: 7})` gives the same counts as loading the
    page with `&seed=7`.
22. **[minor] Camera tour exists and never moves during a capture.** `api.tour()` returns ≥ 8 stops naming downtown,
    a bridge, the interchange, industry/port, a suburb, the park, the waterfront and a night street, each with an
    hour and 4–10 s dwell. `startTour()` flies between them with `ctx.camera.flyTo`, emits `democity:tour`, and
    loops. **It must not auto-start** when `ctx.headless`, when `world.time.speed === 0`, or when a `camera=` URL
    parameter was given; probe: after `?showcase=democity&camera=aerial&time=12&headless=1`, the camera position
    is unchanged 3 s after `__sim.ready` (Δ < 0.01 m) and `tourState().running === false`. `gotoStop(i)` applies
    the stop's camera and hour immediately. This item costs at most 0.2 like any minor; a tour that actually does
    run during a capture is caught and scored once, by item 17's blocker.
23. **[major] The simulation is running a real city.** Probe after staging at `?showcase=democity&time=12&speed=1`:
    `world.economy.population ≥ 8_000`, `jobs ≥ 3_000`, `money` finite and > 0, `demand` values all in [0,1] with
    at least two above 0.15, `happiness ∈ [0.35, 0.95]`, and `world.economy.grids` non-null with pollution
    non-zero over the industrial district and land value highest within 250 m of the downtown centroid. The HUD in
    the same frame shows these numbers, not placeholders.
    **The tick count is measured, not guessed.** `simulation.step(N)` runs synchronous 4 Hz ticks over every
    building, so with 1 200–2 400 buildings it is the one step in §8's pipeline whose cost is unbounded, and it sits
    inside item 24's 25 s ceiling. The builder measures the smallest `N` that reaches 8 000 once and records both
    `N` and the `stageMs` it cost in `docs/builds/democity_r<n>.json`. If the pre-roll pushes `stageMs` past 20 s,
    cut ticks before cutting city; if population is still < 8 000 at 20 s, report the achieved figure in `stats()`
    and file it as a simulation tuning finding. Writing into `world.economy` to reach the number is the §2
    automatic fail, not a shortcut.
24. **[major] Staging cost.** `init()` ≤ 1_500 ms (the registry hard-kills `init` at 30 s — heavy work belongs in
    `showcase.setup`, which is not timed out); `showcase.setup()` ≤ 25 s under SwiftShader, measured as
    `stats().stageMs`; every asset load democity starts is issued *before* `setup` returns, so
    `assets.settle(20000)` in `main.js` never logs the timeout error; `.json` `elapsedMs` ≤ 240_000 at 1080p on
    this box. On a real GPU the ARCHITECTURE §9 figure (≤ 15 s to interactive) is the target; record it as
    `fpsGpu: null` until measured.

---

## 5. Budget

ARCHITECTURE §9 is the whole-scene contract and `democity` is the module that has to live inside it, because its
showcase *is* the full game. Two budgets therefore apply.

**Assumption, stated because a critic will otherwise flag it, and derived on the module states §7 actually records:**
`constants.BUDGET.perModuleDrawCalls.democity = 50` is the module's own share **with every dependency real**. `props`
and `traffic` are real, so their allotments (400 and 150) are **not** free and no fallback of democity's draws
against them. The only stubs democity substitutes for are `services` (60) and `transit` (20), so the declared budget
in `index.js` is `50 + 60 + 20 = 130` draw calls. Triangles: the ≤ 120 000 of the always-present landmark meshes plus
the services fallback's 14 meshes, 4 buses and 8 stops — under 100 000 more — rounded up to a 300 000 ceiling. When
`services` and `transit` land, `stats().own.drawCalls` must fall back to ≤ 50.

| Metric | Budget | Where measured |
|---|---|---|
| Declared `budget` in `index.js` | `{ drawCalls: 130, triangles: 300_000 }` | source |
| democity's own group, all deps real | ≤ 50 draw calls, ≤ 120_000 tris | probe `stats().own` |
| democity's own group, `services`/`transit` fallbacks active | ≤ 130 draw calls, ≤ 300_000 tris | probe `stats().own` |
| Whole scene, `?showcase=democity` | ≤ 1500 draw calls; ≤ 1200 at `aerial`/`overview` | shot `.json` `drawCalls` |
| Whole scene triangles | ≤ 3_000_000; ≤ 2_200_000 at `overview` | shot `.json` `triangles` |
| `update()` per frame | ≤ 1.0 ms idle, ≤ 2.0 ms during a tour | `.json` `moduleMs.democity` |
| `init()` | ≤ 1_500 ms | `.json` `modules.democity.initMs` |
| `showcase.setup()` | ≤ 25_000 ms under SwiftShader | probe `stats().stageMs` |
| JS heap | ≤ 512 MB | `.json` `heapMB` |
| Scene textures | ≤ 180 | `.json` `textures` |
| Textures democity creates | ≤ 12, none above 1024², ≤ 48 MB total | probe |
| Time to `__sim.ready`, 1080p SwiftShader | ≤ 240 s | `.json` `elapsedMs` |

The one number BUILDER.md's Engineering rules do not already carry: democity's own meshes — landmarks, the services
fallback, the bus line — are chunked to `TILE_SIZE = 128` m (ARCHITECTURE §9), so they cull per tile instead of as
one mesh that is always in frustum.

---

## 6. Known failure modes

BUILDER.md's "Known failure modes" list applies unchanged and is not restated. The citations below are the rounds
where each one landed in a neighbour, plus the consequence specific to a whole-city frame; the bullets after them
are democity-only.

- **Washed-out noon and milky golden hour** — `roads_r1` #4, `environment_r1` #2, `environment_r2` #1,
  `effects_r1` #1. democity picks the weather and effects preset, so a demo staged under `fog`/`cloudy` is scored
  as democity's choice, not inherited.
- **Night that is really dusk** — `effects_r1` #2, `simulation_r1` #2, `ui_r1` #5. Item 3 is the number.
- **Emissive sprites brighter than what they light** — `effects_r1` #2. Item 3's pinned lamp crop is the number.
- **Per-pixel static from an interpolated varying** — `environment_r2` #2. Applies to any shader democity writes.
- **Obvious tiling** — `environment_r1` #3, `terrain_r1` #8, `simulation_r1` #1. At city scale a 13 m repeat is a
  visible grid across the whole aerial frame; item 18 is the number.
- **Specular sparkle** — `roads_r1` #5.
- **Z-fighting between road, markings, lot plates and terrain** — `roads_r1`; park paths flickering against grass
  at distance is the democity-specific instance.
- **Floating and sunk objects** — `roads_r1` #1, #3. At city scale this is 400 samples, not one glance: item 9.
- **A grid, not a city.** Uniform block size, uniform building height, no centre, no green, no water frontage —
  the most likely way this module lands on 6 even with every other module at 8.
- **Everything at once, nothing anywhere.** Density spread evenly across the whole 2048 m map instead of a
  2 km² city with a treed edge; the aerial then has no silhouette and the overview no shape.
- **Camera drift during captures.** A tour left running in headless makes every screenshot different and every
  critic measurement unrepeatable; two shots of the same URL must match.
- **Staging that outlives `setup`.** Assets requested after `showcase.setup` resolves trip
  `assets.settle(20000)` and log `[main] asset loading timed out` — a console error, and therefore a hard fail.
- **Init timeout.** Building the city inside `init()` hits the registry's 30 s `withTimeout` and marks democity
  `failed`, leaving an empty map. Stage in `showcase.setup`.
- **Duplicated ornament.** A fallback layer left on after its module lands — today that means democity's own
  service meshes standing next to `services`' buildings, and its bus line running alongside `transit`'s.
- **Cross-module writes.** Mutating `world.buildings.items` or `world.zones.cells` directly instead of calling the
  owner's function — invisible in a screenshot, fatal to `version`/event consistency, and greppable.

---

## 7. Dependencies and their real APIs

```js
dependencies: ['terrain', 'roads', 'zoning', 'buildings', 'props', 'traffic', 'services', 'simulation', 'transit', 'ui']
```

`environment` is always initialised by the showcase router. `ctx.modules` **is** `registry.apis`
(`src/core/registry.js:36`), so the call form is `ctx.modules.roads.rebuild()` and the guard is
`ctx.modules.props?.place?.(…)`. BUILDER.md's Engineering rules show `?.api?.place?.(…)`, which is wrong for every
module: the builder's first `docs/core-requests/democity.md` entry is that one-line correction to BUILDER.md — the
fix belongs in the role file, not in sixteen module specs. Detect a stub by testing for the function, never by module
name. Determinism, instancing, per-frame allocation, colour space and staying in lane are BUILDER.md's and are not
restated here.

**Module status at the time of writing (verified in source; re-check it and state it in the build report).**
`services`, `transit`, `infoviews` and `tools` are stubs — `dependencies: []`, `api` either `{}` or
`{serialize, deserialize}`, `showcase.setup` a no-op, all four under 15 lines. `terrain`, `roads`, `zoning`,
`buildings`, `simulation`, `environment`, `effects`, `ui`, `audio` and **`traffic`** are real — `traffic` is a
complete module with A\* routing, IDM car-following, signal phases, pedestrians and outside connections, exposing
`spawnVehicle(kind, route)` · `despawn(id)` · `flowGrid()` · `stats()`, so its fallback branch in item 15 is
dormant and its 150-draw-call allotment is **not** free (§5). **`props` is real as well, and its api is not the one a builder
would guess**: `src/modules/props/index.js:234–249` exposes `rebuild()` · `stats()` · `lamps()` ·
`signalState(nodeId)` · `count()` · `serialize()` · `deserialize()` and **no `place()` or `placeAlongEdge()`**
(services.md §7 records the same finding independently). It fills `world.props.items` itself from roads and terrain
on its own schedule: it listens to `roads:changed` and rebuilds 0.12 s later inside `update()`
(`src/modules/props/index.js:190, 199`) — i.e. **after** `showcase.setup` has returned. So democity asks props for
nothing, places no tree or lamp of its own while props is present, and reads `props.stats()` / `world.props.items`
only from a probe at capture time. Item §4.15 is the contract for both worlds.

**`world.terrain`** (single source of height; a flat fallback exists if terrain failed):
`getHeight(x,z) -> m` · `getNormal(x,z,out?) -> Vector3` · `getSlope(x,z) -> rad` · `isWater(x,z) -> bool` ·
`raycast(ray) -> {point,normal}|null` · `modify({x,z,radius,strength,mode})` · `heights: Float32Array` ·
`resolution` · `cellSize` · `seaLevel` · `minHeight` · `maxHeight` · and, exposed by the terrain module for exactly
this purpose, `world.terrain.features = { river:{ zAt(x), halfWidthAt(x) }, coast:{ xAt(z) }, island:{x,z,r} }`.
`ctx.modules.terrain`: `data()` · `stats()` · `material()` · `setReflection(bool)` · `setGrassTufts(bool)` ·
`debug.*`. **The layout must be derived from these functions, not hard-coded**: at seed 1337 the river runs roughly
west–east near `z ≈ −170 … −350`, the coast lies near `x ≈ −640`, hills and mountains rise beyond `|x|,|z| ≈ 540`,
and the central plain around the origin sits at ~16 m — but the acceptance items must hold at `--seed 7` too.
Do not call `terrain.modify` for anything but a deliberate, documented cut; roads owns its own cut/fill.

**`world.roads`** (owner module `roads`): `types` = `{alley w8 l1 s30, gravel w8 l2 s30, street w16 l2 s50,
avenue w24 l4 s60, highway w32 l6 s100, ramp w10 l1 s60 oneWay}` — **six**, not five: `ramp` is in `TYPE_DEFAULTS`
(`network.js:11`) and is merged into `world.roads.types` at construction, and `type: 'ramp'` is what item 7's merge
geometry and gore hatching need (`build.js:215` detects a ramp as `oneWay` + `lanes: 1` + not a ring member) ·
`addNode(x,z) -> id` · `addEdge(a,b,type,opts) -> id` ·
`removeEdge(id)` · `removeNode(id)` · `nearestEdge(x,z,maxDist) -> {edge,t,point,dist}|null` ·
`sample(edgeId,t) -> {x,y,z,tangent,normal}` · `laneCenter(edgeId,laneIndex,t) -> {x,y,z,tangent}` ·
`frontage(edgeId) -> [{side,from,to,x,z,heading}]` · `isRoad(x,z) -> 0..1` · `nodes` · `edges` · `version`.
`opts` carries **only** `{ctrl:{x,z}, lanes, oneWay, elevation}` (`network.js:47–55`); `elevation` is then
overwritten on every rebuild (`build.js:499`), and `bridge` and `ring` are **not inputs** — roads derives `bridge`
from the profile crossing water or standing `BRIDGE_MIN = 6 m` above terrain (`build.js:493–498`) and `ring` from
detecting a closed one-way loop (`build.js:168–184`). So a river crossing becomes a bridge by being drawn across
water, and a roundabout becomes a ring by being drawn as a closed one-way loop. `ctx.modules.roads`: `rebuild()` ·
`lampPositions(edgeId) -> [{x,y,z,heading,side,edgeId,t}]` · `intersections() -> [{id,x,y,z,roundabout,arms}]` ·
`nodeInfo(id)` · `types()` · `edges()` · `stats()` · `edgeDebug(edgeId,step)` · `serialize()` · `deserialize(d)`.
Build the whole network, then call `rebuild()` **once**; it coalesces and also conforms the terrain under the roads.

**Zoning — the two objects are different, and this is the one place in the pipeline where confusing them is fatal.**
`world.zones` (installed at `zoning/grid.js:457–467`) carries **only** `paint(x,z,radius,type,density) -> n` ·
`erase(x,z,radius)` · `lotsFor(edgeId)` · `freeLots()` · `cellAt(x,z)` · `lotAt(x,z)` · `zonableAt(x,z)` ·
`maxDepth`, alongside the plain data `cellSize` · `cells` · `types` · `densities` · `lots` · `version`.
`ctx.modules.zoning` (`zoning/index.js:92–130`) carries those same eight functions **plus** `bulk(fn)` ·
`refresh()` · `setOverlayVisible(bool)` · `overlayVisible()` · `stats()` · `debugEdge(id)` · `serialize()` ·
`deserialize(d)` — **`bulk`, `refresh`, `setOverlayVisible` and `stats` exist ONLY here**, and
`world.zones.bulk(fn)` is `undefined`: calling it throws inside `showcase.setup`, where §8's catch-all turns it into
a staged city of honest zeros. `bulk(fn)` passes `fn({circle, rect, erase})` and batches every stroke into **one**
lot regeneration and one event — use it, painting 11 000 cells one `paint()` at a time will blow the staging budget.
Leave the overlay **off** for the demo city. Zones only exist inside the buildable band derived from road frontage,
so roads must be complete and rebuilt before painting.

**`ctx.modules.buildings`**: `requestSpawn(lot) -> id` · `spawnFreeLots(limit) -> n` · `setLevel(id,n)` ·
`demolish(id)` · `at(x,z)` · `get(id)` · `count()` · `flush()` (build every dirty chunk now — call once after
staging) · `stats()` · `material()` · `atlasTextures()` · `setNight(v)` · `setLit(v)` · `serialize()` ·
`deserialize(d)`. Levels are democity's lever for the height gradient of §4.6: spawn, then `setLevel` per ring.

**`ctx.modules.simulation`**: `step(n)` (advance fixed 4 Hz ticks synchronously — use it to pre-roll the demo city
to a plausible population deterministically) · `profile(hour,out)` · `activity(hour)` · `economy()` · `demand()` ·
`grids()` · `landValueAt(x,z)` · `pollutionAt(x,z)` · `noiseAt(x,z)` · `building(id)` · `milestone()` ·
`setSimSpeed(n)` · `setTaxRate(r)` · `spend(a,force)` · `earn(a)` · `takeLoan(a,days)` · `showPanel(bool)`
(**leave the panel off** in the demo city — the `ui` HUD is the interface) · `serialize()` · `deserialize(d)`.

**`ctx.modules.environment`**: `setWeather('clear'|'partly'|'cloudy'|'rain'|'fog'|{cloudiness,rain,fogDensity,wind})` ·
`getWeather()` · `getSunDirection()` · `getMoonDirection()` · `getExposure()` · `getNight()` ·
`setupMaterial(material)` — **call it on every material democity creates**, or they get no CSM shadows and no fog ·
`hookScene()` after staging · `refreshEnvironment()`. Read `world.weather.{sunDir,sunIntensity,skyLight,fogDensity,
wetness,rain,cloudiness,wind}`; never write them, never add a light, never touch `toneMapping`,
`toneMappingExposure` or `scene.fog` (§4 module contract).

**`ctx.modules.effects`**: `setPreset('default'|'cinematic'|'clean'|'flat')` · `getPreset()` · `setEnabled(bool)` ·
`isEnabled()` · `state()`. Choosing the demo's weather + effects preset is democity's, and §4.4–4.6 grade the result.

**`ctx.modules.ui`**: `setCityName(name)` · `notify(n)` · `toast(t)` · `setCategory(id)` · `setInfoview(name)` ·
`setPhotoMode(bool)` · `showInfo(sel)` · `hideInfo()` · `openMenu(kind)` · `closeMenu()` · `showLines(id)`.
Name the city and let the HUD show the real economy; do not build DOM of your own.

**`ctx.modules.props`** (real, verified above): `rebuild()` · `stats()` · `lamps() -> [{x,y,z}]` ·
`signalState(nodeId)` · `count()` · `serialize()` · `deserialize()`. **There is no placement entry point** — democity
cannot ask props for a tree at a spot and must not try; call `rebuild()` at most once, and only if props has not
already scheduled its own.

**`ctx.modules.traffic`** (real, verified above): `spawnVehicle(kind, route)` · `despawn(id)` · `flowGrid()` ·
`stats()`. It populates itself from the road graph; democity spawns nothing and reads `world.traffic.vehicles` /
`world.traffic.pedestrians` from a probe at capture time (item 16).

**Stubs to program against (all optional, all guarded).** `ctx.modules.services`: expect the api services.md
declares, of which democity uses `place(kind,x,z,heading) -> id|null`, `remove(id)` and `coverage(kind,x,z) -> 0..1`;
read `world.services.kinds`, `supply`, `demand` — and note that `world.services.place`/`coverage` **always** exist as
the core placeholders returning `null`/`0` (`src/core/world.js:100–101`), so they are not the presence test (§4.15).
`ctx.modules.transit`: expect `createLine({name,colour,stops})`, `lines()`. `ctx.modules.infoviews`: honour
`world.infoview.active` by leaving it `null`. Every one of these is feature-tested per §4.15 and none is called
speculatively.

**Core** (`src/core/*.js`, exact). `ctx.rng` → `float() range(min,max) int(min,max) bool(p) pick(arr)
weighted([[v,w]…]) gauss() shuffle(arr) fork(label)`; also `hash2(x,y,seed)` and `makeNoise2D(seed) -> {noise,fbm}`
from `core/rng.js`. `ctx.assets` → `pbr(name,{repeat})` · `texture(url,{srgb,repeat,wrap,anisotropy,flipY})` ·
`hdri(name)` · `gltf(url)` · `procedural.noiseTexture({size,seed,octaves,scale,lo,hi,srgb,colorA,colorB})` ·
`procedural.gradient({size,stops,horizontal,srgb})` · `procedural.noiseNormal({size,seed,scale,strength})` ·
`procedural.solid(hex,size)` · `anisotropy` · `settle(ms)`. `ctx.camera` → `camera` · `target` · `distance` ·
`presets` · `registerPreset(name,preset)` · `apply(presetName|{position,target}|{yaw,pitch,distance,target})` ·
`flyTo(preset,seconds)` · `enableControls(bool)` · `screenToGround(ndcX,ndcY)`. `ctx.clock` → `hour` · `day` ·
`set(hour)` · `setSpeed(n)` · `pause()` · `resume()` · `sunElevation(h?)` · `sunAzimuth(h?)` · `isNight(h?)`.
`constants` → `WORLD_SIZE 2048` · `TILE_SIZE 128` · `LAYERS` · `RENDER_ORDER` · `QUALITY[ctx.quality]`.
Asset policy §10: CC0 only, procedural preferred at this scale; new entries go in `public/assets/manifest.json`
and are fetched with `tools/fetch-assets.mjs`. Albedo `SRGBColorSpace`, data maps linear.

**Degradation, exhaustively.** `terrain` missing → the flat fallback returns height 0 everywhere; still build the
city, skip bridges, log a warning, and do not throw. `roads` missing (`addEdge` returns −1) → skip staging entirely,
emit `democity:staged` with zero counts, keep `status: 'ready'`. `zoning` missing → generate lots from
`roads.frontage(edgeId)` directly and pass them to `buildings.requestSpawn`. `buildings` missing → place democity's
own landmark massing only, so the frame is not empty. `simulation` missing → the HUD shows zeros; do not fabricate
`world.economy`. `ui` missing → nothing to do. In every case: no console error, `status: 'ready'`, and
`api.stats()` reports honestly what was skipped.

`?mode=play` (ARCHITECTURE §15) does **not** call `showcase.setup`: democity must register its camera presets
(main.js does this from `showcase.cameras`), stage nothing, cost < 0.1 ms per frame and log one info line.

---

## 8. Showcase

`?showcase=democity` (and the bare URL) is the full game: all 16 modules plus `democity.showcase.setup`. It stages
one city, and that city is the deliverable.

**Liveness — democity is on everyone else's critical path.** `src/main.js:87` resolves a missing or `all` showcase to
`democity`, so the bare URL *and* every other agent's `--showcase all` capture runs this module's staging. A throw, a
hang or a 60-second stage does not merely cost democity a round: it breaks the screenshots of the fifteen other
builders and critics shooting through the same dev server (`environment_r2` #12 already records four captures lost to
mid-run reloads caused by another agent's save). Therefore, and these are gradeable through items 20 and 24: the repo
stays loadable at **every** commit, mid-refactor included; the whole staging pipeline below is wrapped so that any
failure inside it is caught, logged with `ctx.log.warn`, and degrades to `status: 'ready'` with honest zero counts per
the §7 degradation table — never a throw, never a console error, never an unresolved promise; and `--showcase all`
at 12 **and** 22 is re-shot as the last action before finishing, after any change however small.

Required contents, all verified by §4:

- **Downtown** centred within 180 m of the origin: ≥ 40 buildings, ≥ 12 above 60 m, tallest ≥ 130 m, on a tight
  block grid of `street`/`avenue` with ≥ 3 signalised intersections and a plaza or civic square.
- **Midtown** ring out to ~350 m: continuous mid-rise, perimeter blocks with courtyards, mixed-use with lit
  retail bases, ≥ 2 avenues radiating from downtown.
- **Suburbs**: ≥ 2 pockets, ≥ 250 detached houses at level ≥ 2 (§4.10), curved and cul-de-sac streets, a local
  park. The garden trees, hedges and fences are `props`' and `buildings`', placed from the lots democity zones.
- **Industrial park + port** on the far side of the river or against the coast: ≥ 40 industrial buildings, and the
  ≥1 apron / ≥3 silos / ≥2 stacks / ≥2 cranes of §4.11 registered in `plan().landmarks` under those `kind` strings.
- **Highway** from map edge to map edge with an interchange and ≥ 3 `ramp` edges; ≥ 1 roundabout, drawn as a closed
  one-way loop so roads detects it as a ring (§7). Grade separation is out of reach until roads exposes a node
  height setter (§4.7) and is not staged for.
- **River with two bridges** on different road types, ≥ 300 m apart, with piers and proper abutments.
- **Park** ≥ 25 000 m² with an `alley` through it for lamps, water or a plaza, left unlotted so props' forest
  scatters ≥ 120 trees into it (§4.12); a **waterfront** promenade ≥ 350 m; a treed edge around the built area.
- **Services**: ≥ 14 items across ≥ 9 kinds (§4.13). **Transit**: one bus line, ≥ 8 stops, ≥ 4 buses (§4.14).
- **Landmarks**, democity-owned regardless of `services`: ≥ 6 from {power plant with cooling towers and plume,
  water tower, wind-turbine row, arena/dome, hospital with helipad, university quad, clock tower, port cranes};
  ≥ 4 of them recognisable at `overview`. `plan().landmarks` also carries §4.11's industrial fixtures, so the total
  entry count exceeds 6.
- Population pre-rolled with `simulation.step(N)` to ≥ 8 000 before `setup` returns, `N` measured and recorded
  (§4.23).

**The staging pipeline, in this order.** The ordering constraints in §7 are hard and the cost of interleaving them
differently is the 25 s ceiling of item 24 or the `assets.settle(20000)` console error — which is a hard fail, not a
warning. Two competent builders must produce the same sequence, so it is written out once:

1. **`init()`** (≤ 1 500 ms, item 24): fork `ctx.rng`, read `constants`, register the eight `showcase.cameras`
   presets, create the module group. **Stage nothing here** — the registry hard-kills `init` at 30 s.
2. **Read the terrain and derive the plan.** `world.terrain.features.river.zAt/halfWidthAt`, `coast.xAt`, `island`,
   plus `getHeight`/`getSlope`/`isWater` sampled on a ≤ 32 m grid. Out of it come district centres, corridor
   polylines, the two bridge crossings and the landmark sites — the object `plan()` returns. Nothing is hard-coded
   to seed 1337 (§7), because item 21 re-runs all of this at seed 7.
3. **Issue every `ctx.assets` request now**, before anything awaits: all `texture`/`pbr`/`gltf`/`procedural.*` calls
   democity will *ever* make, their promises kept in one array. **No `ctx.assets` call is made after this step** —
   that is what keeps `assets.settle(20000)` in `main.js` quiet (item 24). Every material democity creates — here,
   at step 11 or at step 13 — goes through `environment.setupMaterial(m)` at its creation, or it gets no CSM shadow
   and no fog (§7).
4. **Detect the stubs** with item 15's four exact tests — `props.rebuild`, `traffic.spawnVehicle`,
   `ctx.modules.services.place`, `transit.createLine`, never by module name — and record the four booleans
   `api.fallbacks()` returns. Place nothing yet.
5. **Build the whole road graph**: `addNode`/`addEdge` for highway → arterials → streets → ramps → alleys/gravel,
   with `opts.ctrl` for curves. `bridge` and `ring` are **not** options (§7): a crossing becomes a bridge by being
   drawn over water, a roundabout becomes a ring by being a closed one-way loop. No `rebuild()` inside the loop.
6. **`roads.rebuild()` — exactly once.** It coalesces and conforms the terrain under the network; `world.roads.isRoad`
   and the frontage tables do not exist before it has run, so items 2 and 13 cannot be probed earlier.
7. **`ctx.modules.zoning.bulk(fn)` — one call, every stroke inside it.** It is on the module api, never on
   `world.zones` (§7). 11 000+ cells painted one `paint()` at a time blows the 25 s budget. Density by ring: high downtown and midtown, low suburb, industrial on its own lobe. Then
   `zoning.refresh()` once if `bulk` did not regenerate lots, and `setOverlayVisible(false)` for the demo city.
8. **`buildings.spawnFreeLots(limit)` ring by ring**, outermost last, so item 1's `≤ 2 400` ceiling is hit by choice
   and not by luck.
9. **`buildings.setLevel(id, n)` per ring** — this is the height gradient item 6 measures, not a per-building random.
10. **`buildings.flush()` — once**, after every spawn and every `setLevel`.
11. **Landmarks, then services.** democity's own landmark meshes always (§8 list, plus §4.11's industrial fixtures);
    `ctx.modules.services.place(kind,…)` — the module api, not `world.services.place`, which is the core placeholder
    returning `null` (§7) — with the exact kind strings of item 13, only when step 4 found the real function.
12. **Transit**: `transit.createLine({name, colour, stops})` if real, otherwise item 14's lane-two fallback line.
    Nothing is written into `world.transit` in either case except through `createLine`.
13. **The fallback layer for the kinds step 4 found stubbed** (item 15) — today `services` meshes and the bus line's
    stops and buses, instanced and chunked to 128 m. `props` and `traffic` are real, so no tree, lamp, parked car or
    moving vehicle of democity's own is placed.
14. **`simulation.step(N)`** to pre-roll `world.economy.population ≥ 8 000` (item 23), with `showPanel(false)`. `N`
    is measured once and recorded in the build report; it is the only unbounded cost in this pipeline.
15. **Await the step-3 promises**, apply the textures, then `environment.setWeather(…)` and `effects.setPreset(…)`
    (the choice items 4–6 grade), `environment.hookScene()` **after** staging, and `ui.setCityName(…)`.
16. **Emit `democity:staged` `{ms, stats}`** and return. `stats().stageMs` is the wall clock of steps 2–15 and is the
    number item 24 reads; if it approaches 25 s, or a shot exceeds item 19, the lever is `restage({density})` —
    outer-ring lots and ornament counts — not fewer districts.

Under `?mode=play` only step 1 runs (§7).

Declared presets — **exactly these eight** in `showcase.cameras`, each with `{position:[x,y,z], target:[x,y,z]}`
so `camera.apply` resolves them without ambiguity. The exact command and output filename for each is block (c) of
§4's *Shots taken this round*; `overview` and `night_street`, which items 2, 3, 6, 18 and 19 also grade, are **core**
presets (`src/core/camera.js`) and are deliberately not among these eight.

| Preset | Frames | Must read as |
|---|---|---|
| `downtown` | tower cluster from ~320 m, pitch ≈ 0.5 | graded heights, varied crowns, roofscape, aerial haze |
| `night_downtown` | canyon at ~90 m, inside the cluster | per-window lighting, lit retail, lamp pools, vehicle lights |
| `interchange` | ~380 m over the highway junction | sweeping ramps, gore hatching, barriers, landscaped loop |
| `bridge` | ~260 m along the river with both bridges | piers, abutments, water, both banks built up |
| `suburb` | ~180 m over detached houses | lots, driveways, hedges, garden trees, roof variety |
| `industry` | ~260 m over the industrial park and port | long low sheds, apron, silos, stacks, cranes |
| `park` | ~120 m inside the park | ≥ 3 tree species, paths, lamps, city framing the green |
| `waterfront` | ~110 m along the promenade | seawall/beach, water reflection, buildings addressing the water |

How it must read on the standard matrix (`aerial|street|skyline|closeup` × `06.5 / 12 / 17.5 / 22`, all sixteen
frames — block (a) of §4's shot set):

- **06.5** — long raking shadows pick out every mass; warm sunlit facades, cool-blue readable shade (p1 > 0).
- **12** — the whole city reads: district structure, road hierarchy, material variety, contact shadows, zero emissive.
- **17.5** — the same city lit from the other side; the highway ribbon catches the light, the far third stays legible.
- **22** — the mass goes dark and the city is drawn by its windows, lamps and traffic; downtown brightest, suburbs
  sparse warm points, the park dark with lamp pools. This is the frame the project is judged on.
