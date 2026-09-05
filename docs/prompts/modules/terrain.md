# Module spec: `terrain`

Round 3+ spec. Supersedes whatever the builder inferred in rounds 1–2. Read with `BUILDER.md` / `CRITIC.md`
(invariants live there and are **not** repeated here) and `ARCHITECTURE.md` §3, §4, §5, §6, §9, §10, §12, §15.

Standing assumptions, stated so nobody has to ask:
- The terrain showcase runs with **core + environment + terrain only**. There are no trees, no buildings, no roads
  in the frame. CS2's aerial crispness comes partly from forest and buildings; therefore every contrast/saturation
  target below is measured from **terrain-only crops** of the CS2 references, not from full CS2 frames — with the one
  exception in §3 that is labelled as such and explains why.
- `props` owns trees. Terrain may add **ground cover ≤ 1.5 m tall** (blades, tufts, scrub, heather, reeds, bracken).
  Terrain may **not** add trees, bushes above 1.5 m, rocks-as-props, or anything on `world.props`.
- `environment` owns exposure, fog, tone mapping and all lights. Core-request #2 is unresolved on **both** halves:
  noon exposure (terrain compensates in **albedo**) and the haze cap. Measured today, `partly` publishes
  `world.weather.fogDensity = 0.00011` (`src/modules/environment/index.js:17`); through environment's height-fog term
  (`shaders.js` `fog_fragment`, `fogK = 1/320` for any density below 0.0008) that veils ground 500 m out by
  `1 − exp(−0.00011 · e^(−390.7/320) · 1.958 · 500) = 3.1 %` for the `aerial` camera, which sits 390.7 m up
  (`520·sin(0.85)`) — 0.1 pp over the ≤ 3 % the core request asks for, i.e. terrain is not being sabotaged today.
  **Escape:** the ground probe also reads `__sim.world.weather.fogDensity` at capture. If it is above **0.00011**,
  record the value in the build record, file it in `docs/core-requests/terrain.md`, and grade item 14(a) and item 1's
  "near-clear inside 800 m" clause against the veil that density implies rather than as a terrain failure. Terrain
  still may not set fog itself (item 14).
- `world.roads.isRoad` / `world.roads.coverage` may be absent (core's default `world.roads` has neither). Guard it.

---

## 1. Purpose

Without `terrain` the game has no ground: no height to snap roads, buildings, props and the camera to, no water, no
readable landscape, and every other module renders on a flat void.

## 2. World data owned

Implement exactly this on `world.terrain` (mutate in place; **never** `world.terrain = {…}`). Signatures copied from
ARCHITECTURE §3:

```js
terrain: {                         // owner: terrain
  resolution: 513,                 // vertices per side (power of 2 + 1)
  cellSize: 4,                     // metres (2048/512)
  heights: Float32Array,           // resolution² row-major, [z][x], metres
  seaLevel: 0,
  getHeight(x, z) -> m,            // bilinear; safe outside bounds (clamped)
  getNormal(x, z, out?) -> Vector3,
  getSlope(x, z) -> rad,
  isWater(x, z) -> bool,
  raycast(ray) -> {point, normal} | null,
  modify(brush) ,                  // {x,z,radius,strength,mode:'raise'|'lower'|'flatten'|'smooth'}
  version: 0,                      // bumped by every mutating call
}
```

`version: 0` is an **addition** to the §3 block (§3's "Rules" require every section to bump a `version`; the terrain
block is the only one that does not list the field).

Plus the two contracts ARCHITECTURE §3 records as **"terrain owes"** to `roads` — also an **addition** to the literal
§3 block, made on the integrator's ruling that these are a terrain-module API, not core (`docs/core-requests/terrain.md`,
"Not applied: `world.terrain.writeHeights` / `flattenStrip`: this is a **terrain-module** API, not core"). They are
missing today; add them:

```js
writeHeights(ix0, iz0, ix1, iz1)            // caller wrote world.terrain.heights in that inclusive cell rect;
                                            // rebuild normals/AO/chunk bounds/GPU textures, bump version, emit
flattenStrip(pts, {drop = 0, grade = 0.06, halfWidth = 8, blend = 8}) -> {ix0,iz0,ix1,iz1}
                                            // pts = [{x,z,y}] road centreline; cut/fill the corridor to y - drop,
                                            // blending to natural ground over `blend` m beyond halfWidth,
                                            // never exceeding `grade` on the cross-slope; bump version, emit
```

`halfWidth` defaults to **8 m** — half of `world.roads.types.street.width` (16). Every parameter of the options bag has
a default; `flattenStrip(pts)` with no options is legal and must not throw.

Plus, kept from round 1 because `roads`/`democity` already read it:

```js
features: { river: {zAt(x) -> z, halfWidthAt(x) -> m},
            coast: {xAt(z) -> x},
            island: {x, z, r} }
minHeight, maxHeight                        // metres
```

Plus ARCHITECTURE §15 save/load, on the module `api` (not on `world.terrain`):

```js
api.serialize()   -> {seed, resolution, cellSize, seaLevel, heights: number[] | base64, version}
api.deserialize(data)                       // idempotent; rebuilds textures, chunk bounds, meshes, clutter
```

**Events emitted** (§5), after the mutation is complete:

| Event | Payload |
|---|---|
| `terrain:changed` | `{x, z, radius}` for a region edit, or `{all:true}` after `deserialize` / initial generation |

Terrain emits nothing else and listens to: `roads:changed` (re-fill ground clutter), `time:hour` (optional),
`weather:changed` (optional).

### Public module `api`

Reachable as `ctx.modules.terrain` and, from a probe, as `__sim.registry.apis.terrain`.

**Exists today (`src/modules/terrain/index.js`) — must keep working, same names, same shapes:**
`data()`, `stats()`, `material()`, `setReflection(bool)`, `setGrassTufts(bool)`,
`debug.{setAnisotropy,setWater,setTerrain,setLite,waterRT,setCastShadow,setReceiveShadow,setLodScale,setPlain,setDefines}`.
`setPlain()` is on that list: the r1 critic may use it to separate shading from geometry, so it may not be dropped.

**New this round (do not exist yet; items 10, 21 and half the probes depend on them):**

```js
api.serialize() / api.deserialize(d)        // item 21
api.setSnowLine(metres)                     // item 10
api.coverAt(x, z) -> {                      // the module's own splat weights at a world point, 0..1, summing to ~1
  grass, dirt, rock, scree, sand, snow,     // the six land materials in use (+ snow, new this round)
  id                                        // integer land-cover id from gen/landcover.js, stable across frames
}
api.cropRects({project, width, height, camera}) -> {   // items 12(b) and 15; ARCHITECTURE §8
  islandReflection: [x, y, w, h],           // 64×64, centred on project(island.x, 2*seaLevel - yTop, island.z)
  shadowEdge:       [x, y, w, h],           // 192×192, on a valley-wall cast-shadow edge within 45° of vertical
}                                           // rects in FULL-RESOLUTION pixels of the capture
```

`cropRects` is how a pinned measurement is taken. `node tools/screenshot.mjs … --crops` calls
`window.__sim.cropRects()` (`src/core/debug.js:41`), which collects `api.cropRects` from every ready module and
writes `<out>.crops.json` beside the PNG — **that tool is the only producer of `crops.json`**. If a shot's
`crops.json` is empty or missing, the two items above are ungraded and that is a *builder* defect
(`CRITIC.md` §Pinned landmarks), not a pass.

`stats()` today returns `{visible, lod:[n0,n1,n2]}` from `TerrainMesh`. It must be widened to — keeping those two
fields — the shape the probes read:

```js
api.stats() -> { visible, lod: [n0, n1, n2],      // chunks drawn per LOD level; item 24 counts non-zero entries
                 chunks, drawCalls, triangles,     // terrain-attributable, not the whole frame (§5)
                 texBytes,                         // §5: bytes the module allocated for textures, summed at its
                                                   // own allocation sites (w·h·bpp·1.33 when mipmapped)
                 clutter: { blades, tufts } }      // live instance counts
```

`setReflection`, `setGrassTufts`, `coverAt`, `cropRects` and `stats` are load-bearing: the critic uses them for
toggled-feature pixel diffs, for every region mask (items 5, 6, 7, 10, 12, 13, 14, 24) and for the two pinned rects
(items 12(b), 15). A frame the probe cannot classify is a frame the critic grades by eye, which is exactly what this
spec exists to prevent.

## 3. Visual/behavioural target

### Which reference images actually apply

Only **three** of the eight references show anything a terrain builder can match. `CRITIC.md` tells the critic to
re-read all eight every round, so the other five are named here with the reason they are not targets.

| Image | Use | What it is |
|---|---|---|
| `$REF/cs2_2.jpg` | **Primary target** | Golden-hour aerial: open water, forested hills, tan eroded mountains, river, shoreline. The only clean natural-terrain aerial in the set. |
| `$REF/cs2_4.jpg` | Street / closeup carpet | Suburban low aerial under strong sun: mown ground carpet, hard contact shadows, dry-to-green grass variation. |
| `$REF/cs2_6.jpg` | **Shape of aerial-perspective banding only** | **Caveat: a winter snowfall frame in flat overcast light, snow lying to the valley floor.** Neither its palette, its light, nor its snow coverage is a target — in particular it must **not** be used to judge item 10's ridge-top dusting or item 14's clear-noon colour. Use it for one thing: the way successive ridges step in saturation and contrast with distance. |
| `$REF/cs2_1.jpg` | **Not a target** | Road-building tool screenshot: roundabout with tool gizmos, dimension labels, magenta zoning ghost, toolbar. Its "grass" is a mown lawn at ~100 m. |
| `$REF/cs2_7.jpg` | **Not a target** | Info-view screenshot: desaturated grey terrain-mode rendering under a fluorescent-yellow industrial zoning overlay, full HUD and legend panel. Any statistic from it is a property of an overlay, not of terrain shading. |
| `$REF/cs2_8.jpg` | **Not a target** | Rainy downtown street canyon at night: emissive signs, streetlights, lit windows, car lights, no natural terrain in frame. |
| `$REF/cs2_3.jpg`, `$REF/cs2_5.jpg` | **Not a target** | Population info view (HUD + overlay) and a citizen panel over a car park. |

**There is no night terrain reference in the set.** The night targets (items 7 and 8) are numeric only; do not
calibrate them against cs2_8.

### Measured anchors, with the rectangle to reproduce them

Every number below is reproducible: downsample the 1920×1080 source JPEG to **480 px wide** with a box filter (the
convention in §4), then take the rect **divided by 4**. Statistics are `L`, `std`, `p5`/`p95` and `sat` as defined in §4.

| Anchor | Source rect (1920×1080) | Measured |
|---|---|---|
| cs2_2 — range → forest, terrain only | x 1500–1920, y 0–300 | mean 132.0, **std 24.0**, p5–p95 107–185, sat 0.141 |
| cs2_2 — near forested slope, terrain only | x 1740–1920, y 900–1080 | mean 49.7, **std 21.2**, p5–p95 20–87, **sat 0.346** |
| cs2_2 — deep water | x 300–660, y 700–880 | mean 31.2, std 7.1, p5–p95 22–45, **sat 0.712, R−B −31.7** |
| cs2_2 — whole frame (city included) | x 0–1920, y 0–1080 | mean 79.3, **std 39.3**, p5–p95 21–142, sat 0.300 |
| cs2_4 — mown lawn in full sun | x 200–500, y 955–1045 | mean 67.7, **std 6.8**, sat 0.657 |
| cs2_4 — grass lit vs. cast shadow | all grass pixels (`G > 1.05R` and `G > 1.15B`), upper vs. lower L-quartile | lit 78.2, shadow 12.9 → **ratio 6.1×** |
| cs2_6 — aerial-perspective bands | near x 600–1500 y 230–300 · mid x 600–1500 y 168–216 · far x 350–900 y 80–140 | sat **0.341 → 0.313 → 0.209**; std 29.6 → 29.5 → 11.2; mean L 141 → 155 → 199 |

**How item 1's thresholds follow from these.** A terrain-only crop of *one* land cover at aerial distance measures
std 21–24 — that is what a single hillside looks like, not what a frame looks like. cs2_2's whole frame measures
std 39.3, but a third of its contrast is city. SimBuild's aerial band has no city and must instead span water, shore,
plain, hill ring and range in one frame, so item 1 sits deliberately between the two anchors: **≥ 26 at noon,
≥ 32 at golden hour**. Item 3 (macro patch variation) is the mechanism that buys that without buildings.

The other two item-1 numbers are derived from the same table, and one of them changed because no anchor supported it.
**Spread, not levels.** Item 1 used to say `p5 ≤ 95` and `p95 ≥ 150`; nothing here supports the absolute level —
cs2_2's whole frame measures p5–p95 = 21–142, so the *primary reference* would fail `p95 ≥ 150` by 8 levels, and the
near forested slope (20–87) by 63. The pair encoded a spread anyway (150 − 95 = 55), so item 1 now asks for that
spread directly: **`p95 − p5 ≥ 55`**, which cs2_2's whole frame (121) clears with room and r1's aerial_12 (118–146,
spread 28) fails by the margin the wording always intended. **Saturation floors.** SimBuild's aerial band is roughly
half near ground and half haze-flattened far ground, whose terrain-only anchors are 0.346 and 0.141 → mean 0.244; the
noon floor **0.22** is 10 % under that. cs2_2 *is* a golden-hour aerial and its whole frame measures 0.300; the golden
hour floor **0.28** is 7 % under that. Both are floors under a measured anchor, not asserted levels.

### What an art director must be able to see

- **Aerial (cs2_2).** The land is *modelled by light*: sunlit slopes clearly brighter than shaded slopes, valley floors
  in cool shadow, ridge tops warm. SimBuild r1 aerial_12 was **std 8.8, p5–p95 118–146** — a flat green carpet; r2
  reached **std 17.3**. Closing that gap is the single biggest score item in this spec.
- **Macro variation (cs2_2).** At 500 m the ground is a patchwork: meadow/pasture fields at 100–250 m scale with
  different dryness, bare-dirt scars and worn tracks, darker forest-floor hollows, lighter dry ridges. No two parts of
  the plain look the same, and no motif (swirl, stroke, blob) repeats across the frame — r1 issue 8 was one
  recognisable curved brush-stroke motif tiled across the whole plain. Item 4 is the mechanical form of this.
- **Aerial perspective (cs2_6, shape only).** Depth is a *stack of bands*: each further ridge less saturated than the
  one before it (0.341 → 0.313 → 0.209 in the reference), while its internal contrast falls more slowly and never to
  zero (std 29.6 → 29.5 → 11.2 under heavy snowfall haze — a clear noon must do better than that far band). Ground
  closer than ~800 m must stay near-clear.
- **Mountains.** Several summits along a ridgeline, spurs descending toward the camera, talus aprons at the foot, a
  broken snow/frost dusting only on the top ridges — never one isolated aliased spike, never a smooth cone. No hill or
  island may read as a smooth featureless cone (item 9 measures the summits; this sentence is the art direction behind it).
- **Street / closeup (cs2_4).** The ground is a **continuous carpet** with fine grain, not a field of discrete tufts on
  a smear. cs2_4's lawn measures std 6.8 — CS2's near ground is *smooth*, not speckled. Item 6(a)'s `std ≥ 12` floor is
  set against r1's blurred smear under a *natural* ground cover, not against a lawn; item 6(c) is the ceiling that stops
  it from becoming speckle. Contact darkening where anything meets the ground. Bare dirt reads as dirt, not pink.
- **Water (cs2_2).** Dark teal (`sat 0.71`, `R−B −32`, mean L 31), wind-textured, a broken sun-glitter path, shoreline
  reflections that ripple rather than mirror, depth tint from shallow shore to deep channel, a shore band that is wet
  sand + foam, not a white line.
- **Night.** Nothing on the ground emits. The land reads as silhouette + faint moonlit relief; ground cover is no
  brighter than the ground it grows from. Graded numerically (items 7, 8) — there is no reference frame for it.

## 4. Acceptance criteria

### Measurement conventions

Both builder and critic use these; deviating from them is a finding, not a defence. *(This paragraph is invariant
across modules and is currently copied into `roads.md`, `props.md`, `effects.md` and `audio.md` as well, and it has
already drifted on the **scale** rule — `roads.md` §4 takes every per-material statistic on full-resolution named
crops, `props.md` §4 splits its items 1–4/8–12 to full resolution, while terrain's version took everything at 480 px.
INTEGRATOR: promote this paragraph to `CRITIC.md §Measurement`, delete it from all five specs, and reconcile the scale
rule to the version below. Until it moves, this block governs every number in this file. Only the GROUND BAND
definition and the ground probe below are terrain-specific.)*

- `L = 0.2126R + 0.7152G + 0.0722B` on the 8-bit sRGB PNG. `sat` = mean of `(max−min)/max` per pixel (this is HSV
  `S`, the same definition `props.md` uses under that name). `blackPct` = % pixels with `max(R,G,B) < 8`;
  `whitePct` = % pixels with `min(R,G,B) > 247`. Percentiles are over `L`.
- **Two scales, and every item names its own.** Whole-frame and GROUND BAND statistics are taken on the frame
  **downsampled to 480 px wide** (box filter): items 1, 3, 4, 5, 6, 7, 8, 10, 13, 14. **Pinned crops are taken on the
  full-resolution PNG, never on a downscaled copy**: item 11's distant-rock crop, item 12(b)'s `islandReflection`
  rect and item 15's `shadowEdge` rect. At 480 px wide a 1 m patch is about two pixels, and item 15's 8 m step is
  about five — the tests do not resolve at that scale.
- **Reference implementation:** `shots/environment/r2/imgstats.mjs` implements exactly this, but it emits **p1/p50/p99**
  and measures the **whole frame** — it cannot produce a `p5`/`p95` or a GROUND BAND number, which items 1, 3, 8, 13 and
  14 all need. Copy it to `shots/terrain/r<n>/imgstats.mjs` and add two flags:
  `--crop x0,y0,x1,y1` (in 480-wide image space) and `--pcts 5,50,95`. Builder and critic run the *same file*; the
  builder ships it in `shots/terrain/r<n>/` and names it in the build record. Builders may not write `tools/`
  (BUILDER.md), so promoting it to `tools/imgstats.mjs` goes in `docs/core-requests/terrain.md` as a request, not a patch.
- **GROUND BAND** = the part of the frame that is ground: full frame for `aerial`, `closeup`, `valley`; the
  **bottom 45 %** of the frame for `skyline`, `street`, `coast`, `ridge`.
- **Probe** = a throwaway Playwright script under `shots/terrain/r<n>/`, `page.evaluate` against
  `http://127.0.0.1:5173/?showcase=terrain&headless=1&time=<h>&seed=1337`, waiting for `window.__sim.ready`.
- Shot paths are the gauntlet's: `shots/terrain/r<n>/<camera>_<time>.png` with `.` → `p`
  (e.g. `aerial_12.png`, `skyline_17p5.png`, `valley_22.png`).

### The ground probe — one script, ten items

Items 2, 3, 5, 6, 10, 12, 13, 14 and 16 all need to know *what a pixel is looking at*. Guessing that from colour is
where two competent critics get two different numbers. Instead, classify every sampled pixel by ray-casting the real
camera against the real heightfield. This is the reference implementation; the critic runs it, the builder must make
it produce passing numbers.

```js
// page.evaluate, after window.__sim.ready. No THREE import needed.
const cam = __sim.camera.camera; cam.updateMatrixWorld();
const T = __sim.world.terrain, api = __sim.registry.apis.terrain;
const o  = { x: cam.position.x, y: cam.position.y, z: cam.position.z };
const tmp = cam.position.clone();                       // a scratch Vector3 (unproject needs a real one)

function groundAt(px, py, W, H) {                       // px,py in the 480-wide image space of the PNG
  const p = tmp.set((px + 0.5) / W * 2 - 1, 1 - (py + 0.5) / H * 2, 0.5).unproject(cam);
  const d = { x: p.x - o.x, y: p.y - o.y, z: p.z - o.z };
  const n = Math.hypot(d.x, d.y, d.z); d.x /= n; d.y /= n; d.z /= n;
  const hit = T.raycast({ origin: o, direction: d });
  if (!hit) return null;                                // sky
  const q = hit.point;
  return { x: q.x, y: q.y, z: q.z,
           dist:  Math.hypot(q.x - o.x, q.y - o.y, q.z - o.z),
           water: T.isWater(q.x, q.z),
           cover: api.coverAt(q.x, q.z) };
}

function sunLit(x, y, z, dir = __sim.world.weather.sunDir) {   // dir points TOWARD the light
  let t = 4;
  for (let i = 0; i < 400 && t < 3000; i++) {
    if (y + dir.y * t < T.getHeight(x + dir.x * t, z + dir.z * t)) return false;
    t += 2 + t * 0.05;
  }
  return true;
}
```

Region masks are then defined once and used everywhere: **water region** = pixels with `water === true`;
**snow pixels** = `cover.snow > 0.5`; **sand pixels** = `cover.sand > 0.5`; **rock pixels** = `cover.rock > 0.5`;
**near / far** = by `dist`. The probe must dump its map to
`shots/terrain/r<n>/groundmap_<camera>_<time>.json` so the critic's numbers are reproducible from the same file.

**Probe cost.** `T.raycast` marches up to 4000 iterations per call (`src/modules/terrain/data.js:99`), so the map is
sampled on a **2 px stride in the 480-wide space** — 240×135 = 32 400 casts — and every item indexes it at the
nearest sampled pixel. The whole probe must finish in **≤ 60 s**; report its wall time. Item 15's `shadowEdge` rect
is the one exception: it re-runs `groundAt` at full resolution inside that 192×192 rect (36 864 casts).
The probe also records `__sim.world.weather.fogDensity` and `sunDir` into the same file (standing assumptions).

### The checklist

Ordered by how much each moves the score. This is the requirement set: if it is not here and not in ARCHITECTURE, it
is a suggestion.

1. **Aerial relief and contrast.** GROUND BAND of `aerial_12.png`: `std ≥ 26`, `sat ≥ 0.22`, `p95 − p5 ≥ 55`.
   `aerial_6p5.png` and `aerial_17p5.png`: `std ≥ 32`, `sat ≥ 0.28`. No frame may have `blackPct > 0.5` or
   `whitePct > 0.2` at 06.5/12/17.5. (r1: std 8.8, p5–p95 118–146 → spread 28, fails; r2: std 17.3. Anchors and the
   derivation of every number here, including why the old absolute `p5 ≤ 95` / `p95 ≥ 150` became one spread: §3.)

2. **Sun-shadow modelling of form.** Two parts, both mechanical.
   (a) *Real slopes must cast and receive.* In `aerial_17p5.png` and `skyline_6p5.png` the probe picks the patches —
   the critic hand-picks nothing, and the selection is fully determined by the groundmap. Over the GROUND BAND, sample
   on an 8 px grid (480-wide scale); keep points whose grade `100·tan(T.getSlope(x,z))` is between **8 % and 25 %**.
   Enumerate **in raster order of the lit member** every pair (lit, shadow) with the same `cover.id`, opposite
   `sunLit()`, and ≤ 300 m apart in world units. Centre a 64×64 px patch on each member and **discard the pair**
   unless ≥ 90 % of each patch's groundmap samples share that patch centre's `sunLit()` state *and* `cover.id` —
   that is what throws out a patch straddling the shadow boundary. Grade the **median** of
   `mean(lit) / mean(shadow)` over the surviving pairs: **≥ 2.5**, and report how many pairs survived.
   (CS2 reaches **6.1×** on mown grass in cs2_4 — 2.5 is a floor, not a target.)
   If no pair survives, the item **fails**: at 06.5 there must be shadowed ground.
   (b) *The plain must shade even though it may not cast.* At 06.5 the core clock puts the sun at **8.46° elevation**
   (`clock.sunElevation(6.5) = sin(2π·0.5/24)·0.72·π/2 = 0.1476 rad`). A lee slope only enters cast shadow above
   `tan 8.46° = 15 %` grade, which item 17 forbids on the plain — so the plain is graded on its Lambert term instead.
   Over 400 stratified samples inside item 17's plain mask, compute `max(0, dot(getNormal(x,z), sunDir))`:
   **p90 / p10 ≥ 2.5**. See the reconciliation note under item 17 for the geometry that satisfies both.

3. **Macro variation, measured.** On `aerial_12.png` at 480-wide scale (the frame is 480×270, so a 3×128 grid would
   not fit) take nine **80×80 px** patches at the **fixed** centres `(px, py) = (120 + 120i, 56 + 80j)` for
   `i, j ∈ {0,1,2}` — the grid origin is pinned so two critics cannot lay it down differently, and both offsets are
   even so every centre lands exactly on the groundmap's 2 px stride grid. A centre
   **qualifies** if the ground probe reports it non-water, `cover.rock < 0.2`, and inside item 17's plain mask; a
   centre that does not qualify moves to the nearest qualifying sampled pixel within 40 px (increasing Chebyshev
   distance, ties in raster order) and is then clamped so its 80×80 patch stays inside the frame. The item **fails if
   fewer than 7 of the 9 qualify** (at the aerial camera the plain mask is only ±600 m, so some will not). Over the
   qualifying patches: the **standard deviation of the patch means must be ≥ 5 L-levels**, and at least two patches
   must differ in `sat` by ≥ 0.06. Uniform plain = fail.

4. **No tiling repetition.** On the GROUND BAND of `aerial_6p5.png` and `valley_12.png` — **not** `coast_12.png`,
   whose GROUND BAND is mostly water, normal-mapped from `makeRippleNormal(…, 256, …)`
   (`src/modules/terrain/index.js:77`), a genuinely periodic 256² texture this test would flag as the tiling it is not
   written to police — restricted to pixels the ground probe reports `water === false`:
   resample to **256 px wide** (box filter), take `L`, subtract a **16×16 box blur** (high-pass, **clamped at the
   border**, never wrapped), then for each horizontal shift `s = 4…128` compute the normalised cross-correlation of
   the overlap, each half mean-subtracted over the overlap, with every mean, variance and product taken **only over
   pixel pairs whose two members are both non-water**. Two requirements, both on the resulting curve `NCC(s)`:
   (a) `max NCC over s ≥ 8` must be **< 0.20**;
   (b) no local maximum at `s ≥ 8` may exceed the **9-shift centred moving average** of the curve — computed only
   where that window is full, i.e. for `s = 8…124` — by more than **0.10**
   (the autocorrelation must decay smoothly, with no periodic echo).
   Reference implementation (the critic runs this; the high-pass is what makes the test about tiling rather than about
   large-scale structure — a mean-subtracted *unfiltered* NCC measures 0.94–0.98 on any natural image and would be
   anti-correlated with items 1 and 3):
   ```js
   const H = L.map((row, y) => row.map((v, x) => v - boxblur16(L, x, y)));
   for (let s = 4; s <= 128; s++) {
     const A = H.cols(0, W - s), B = H.cols(s, W);          // overlapping halves
     ncc[s] = mean((A - mean(A)) * (B - mean(B))) / Math.sqrt(mean((A - mean(A))**2) * mean((B - mean(B))**2));
   }
   ```
   Measured with this implementation on the references: `max NCC(s ≥ 8)` = **0.048** (cs2_2 crop x 1500–1920 y 0–300),
   **0.059** (cs2_2 whole frame), **0.074** (cs2_4), **0.055** (cs2_6); worst peak-over-envelope **0.013–0.026**.
   A synthetic 1/f field with a period-40 motif stamped on it measures 0.251, and a period-64 stamp 0.322 / 0.127 —
   so the thresholds sit ~3× above every natural reference and below a motif that is actually visible.

5. **Water carries no clutter confetti.** In `valley_12.png`, `closeup_12.png`, `coast_12.png`, over the **water
   region** (ground probe, `water === true`): pixels satisfying `sat > 0.5 && R > G > B && (R−B) > 40` must be
   **< 0.3 %** of that region. Confirm with a toggled diff: `__sim.registry.apis.terrain.setGrassTufts(false)` must
   change **< 0.5 %** of water-region pixels by more than 8 L-levels. (r1 blocker 1: yellow/orange speckle across
   every river.)

6. **Street-level ground is a carpet, not tufts.** In `street_12.png` and `closeup_12.png`:
   (a) the nearest-quarter crop (bottom 25 % of the GROUND BAND) has `std ≥ 12` — texture present, not a smear;
   (b) **no fade band**: over the GROUND BAND, the per-row mean-L curve has no local extremum exceeding its ±20-row
   neighbourhood mean by more than 6 L-levels;
   (c) **no resolvable instances**: take the diff of `setGrassTufts(true)` and `(false)` at the same camera, at
   480-wide scale, restricted to pixels the ground probe reports at `dist > 15 m`. No connected component of
   `|ΔL| > 20` in that region may exceed **12 px**. (Near the camera individual blades *should* be resolvable; beyond
   15 m they must merge into a carpet.)
   (r1 issue 3; r2 self-flagged "bare ground between clumps beyond ~10 m" and a visible 17–30 m fade band.)

7. **Night ground cover does not self-light.** At `--time 22`, shoot the same camera twice, with
   `api.setGrassTufts(true)` and `(false)`: mean |ΔL| over the GROUND BAND must be **≤ 4 levels**, and the clutter
   pass must not *raise* the ground-band mean by more than 2 levels. (r1 issue 4: glow-in-the-dark tufts.)

8. **Night is night, and readable.** GROUND BAND at `--time 22` for all four standard cameras: `p50` between 6 and 40,
   `p95 ≥ 16`, `blackPct ≤ 3 %`. In `skyline_22.png` the silhouette must read: using the ground probe, find the
   topmost ground pixel per column; over 100 evenly spaced columns the mean L of the 8 px band below it must differ
   from the 8 px band above it by **≥ 6 levels**. Moonlit relief in `aerial_22.png`: run item 2(a)'s probe with
   `__sim.world.weather.moonDir` — the moon-facing and moon-averted patches must differ by **≥ 6 L-levels**.

9. **Mountain silhouette — measured on the heightfield, not in the picture.**
   Define a **local maximum** as a cell strictly higher than every cell within **80 m** (a 4 m grid with erosion noise
   has thousands of maxima at smaller radii; at 80 m they are summits).
   (a) For the ten highest local maxima, the horizontal radius of the contour at `peak − 20 m` must be **≥ 40 m** for
   every one (no witch-hat spires).
   (b) The eastern range (`x ≥ 560`, where the generator's mountain mask begins) must contain **≥ 4** local maxima
   with height `≥ 0.5 × maxHeight`. If it does not have four, build four — one spire was r1 issue 5.
   (c) **Not a cone:** for `features.island` and the three highest hill-ring maxima (`max(x,|z|) ≥ 540`, height
   `< 0.5 × maxHeight`), sample 36 azimuths at 60 % of the summit's `peak − 20 m` contour radius; the standard
   deviation of those 36 heights must be **≥ 3 m**. (A smooth cone gives ~0.)
   (r1 issue 5. Spurs descending toward the camera and talus aprons are art direction — §3 — not graded here.)

10. **Snow / frost cap** (ARCHITECTURE §12 lists snow in the splat set; absent in r1/r2). A snow layer above a
    configurable `snowLine` (default ≈ 0.78 × `maxHeight`; ≈ 275 m at seed 1337) on slopes < 42°, with a
    noise-broken transition ≥ 25 m tall in elevation and horizontal break-up ≥ 30 m, exposed as `api.setSnowLine(m)`.
    In `ridge_12.png`, **snow pixels** (ground probe, `cover.snow > 0.5`) are **0.5 %–6 %** of the GROUND BAND — a
    dusting on the top ridges, not a cap. If `coverAt` is missing, the fallback classifier is `L > 190 && sat < 0.12`
    and the item is graded on that instead; shipping `coverAt` is cheaper than arguing about it.
    (cs2_6 shows snow to the valley floor. It is a snowstorm. It is not the target — see §3.)

11. **Rock → scree → grass blending.** Measured with `coverAt` on the range flank, along 12 vertical transects spaced
    ≥ 60 m apart:
    (a) the elevation at which `rock` crosses 0.5 must vary between transects with **std ≥ 12 m** (not a contour line);
    (b) on each transect the elevation interval over which `rock` goes 0.2 → 0.8 must be **≥ 30 m** (not a hard edge);
    (c) horizontal break-up: along a horizontal traverse at the mean crossing elevation, the `rock` weight must cross
    0.5 at least **6 times** per 500 m.
    Distant rock must show no dark speckle aliasing: in `skyline_12.png`, take the **rock pixel with the greatest
    `dist`** from the ground probe (ties broken in raster order) and a 128×128 crop centred on it, measured **on the
    full-resolution PNG, never a downscaled copy**: `std ≤ 22`. (r1 issue 5.)

12. **Water reflection and glint.** At `coast_12.png`'s camera:
    (a) `api.setReflection(false)` vs `(true)`: ≥ 8 % of water-region pixels change by > 10 L-levels.
    (b) *The island is actually mirrored:* the module declares `islandReflection` in `api.cropRects` (§2) — a 64×64
    **full-resolution** pixel rect centred on `project(island.x, 2·seaLevel − yTop, island.z)`, where
    `yTop = getHeight(island.x, island.z)`. Shoot `coast_12` with `--crops` twice, `setReflection(true)` and
    `(false)`; inside the rect named `terrain.islandReflection` in `coast_12.png.crops.json`, on the
    **full-resolution PNG**, mean `|ΔL|` between the two must be **≥ 15 levels**.
    (c) *Broken glitter path:* in `coast_17p5.png`, within the water region, `p99.5 − p50 ≥ 60 L-levels` and the pixels
    above `p50 + 60` must form **≥ 25 connected components** (a broken path, not a disc). In `coast_22.png` the moon
    glint needs `p99.5 − p50 ≥ 20` with ≥ 8 components.
    (d) *Depth tint:* mean L of a shore band (water-region pixels within 8 m of the waterline, by the probe's world
    positions) exceeds mean L of mid-channel water by **≥ 12 levels** at noon. (r1 issue 9.)

13. **Shoreline is not a pink ribbon.** Sample the coast every **25 m of arc length** along `features.coast.xAt(z)`
    and measure beach width along the coast normal with `coverAt` (`sand > 0.5`) — the sites are the samples, not a
    grader's choice. Over those widths: **`p10 ≥ 8 m`**, **`p90 ≤ 50 m`** and **`p90 / p10 ≥ 2.0`** (constant-width
    sand is the failure mode; the two bounds are satisfiable together — e.g. 10 m and 30 m). Mean colour
    of **sand pixels** (`cover.sand > 0.5`) in `skyline_6p5.png`: `R − B ≤ 28` and `sat ≤ 0.30` (grey-tan, not pink).
    In `coast_22.png` the foam/wet line must not read as a white outline: `p99 ≤ 90` over sand+water pixels within
    8 m of the waterline. (r1 issue 6.)

14. **Aerial perspective, not blanket haze.** In `skyline_12.png`, with crops located by the ground probe's `dist`
    field, not by eye. The geometry is fixed and known: the `skyline` preset is `yaw 2.2, pitch 0.16, distance 900,
    target [0,40,0]`, so the camera sits at **(718, 183, −523)**; the nearest ground in frame is ≈ 300 m away, the
    farthest world corner is **2330 m** and the terrain edge along the view axis ≈ 2150 m. *Nothing in this frame is
    more than 2330 m away* — do not write a test above that.
    (a) A near crop of ≥ 64×64 px whose pixels are all `300 m ≤ dist < 800 m`: `sat ≥ 0.22`, `std ≥ 26`.
    (b) A far crop of ≥ 64×64 px whose pixels are all `1400 m ≤ dist ≤ 1900 m`: `sat ≤ 0.6 × sat(near)` and
    `std ≥ 10` (the far ridge desaturates but does not go flat — cs2_6's heavily hazed far band still measures 11.2).
    Terrain must use `environment`'s fog uniforms via `setupMaterial` and must not add its own fog. (r1 blocker 2.)

15. **Terrain shadows are smooth.** The module declares `shadowEdge` in `api.cropRects` (§2): a 192×192
    **full-resolution** pixel rect, one per frame, centred on a valley-wall cast-shadow edge whose run is within 45°
    of vertical in screen space. The module knows the heightfield and `sunDir`, so it can place it; the critic does
    not choose the crop. Shoot `aerial_6p5` and `aerial_17p5` with `--crops` and measure inside
    `terrain.shadowEdge` **on the full-resolution PNG, never a downscaled copy** (at 480 px wide 8 m is ~5 px at this
    camera and the test cannot resolve it). Re-run the probe's `groundAt` at full resolution over the rect for each
    pixel's world position. Let `Llit`/`Lshadow` be the mean L of the pixels the probe reports `sunLit() === true` /
    `=== false`; trace the boundary per row as the first column where L crosses `(Llit + Lshadow)/2`. Requirement:
    **no two adjacent boundary rows may differ by ≥ 8 m** in world position (2 heightfield cells — that difference
    *is* a staircase step; a smoothly cast edge moves sub-metre between rows, which at this camera are ~0.4 m apart
    on the ground). Shadows are cast from the visible LOD, not a coarser proxy. (r1 issue 7.)

16. **Erosion reads — counted on the heightfield.** Compute D8 flow accumulation on the 4 m grid over the **whole
    513² grid** — the domain may not be restricted, because accumulation over a truncated domain silently discards
    the flow entering from outside it. A **channel cell** has accumulation ≥ 200 cells **and**
    `getHeight > seaLevel + 45` (hill ring and range). Take connected components of ≥ 40 channel cells; from each
    component's lowest cell follow the D8 pointer downstream until the height drops below `seaLevel + 45` or the path
    leaves the grid. Count the components whose path **reaches below `seaLevel + 45`** — a channel that drains
    somewhere rather than a scratch that ends on the hillside: **≥ 8**. (The earlier wording restricted the *domain*
    to cells above `seaLevel + 45` and then counted components whose lowest cell was *below* it, which is always
    zero.) In `aerial_17p5.png` the same flanks must show sediment/flow-lightened valley floors and darkened
    gullies (art direction; the count is what is graded).

17. **Buildable plains, verified by probe.** Over the square `x,z ∈ [−600, 600]` sampled on an **8 m grid** (151² =
    22 801 cells), a cell is **in the plain mask** unless any of:
    (a) `getHeight < seaLevel + 0.5`;
    (b) `|z − features.river.zAt(x)| < features.river.halfWidthAt(x) + 150` — channel, shore, floodplain and **both
        valley walls** (the generator builds those walls at 14–22 % grade by design);
    (c) `max(x, |z|) > 520` — the hill ring and eastern range feet (the generator's masks start at 540 and 560);
    (d) `getHeight > seaLevel + 45` — any residual hill body.
    Grade is `100·tan(getSlope(x,z))` throughout (`getSlope` returns radians).
    Requirement: **≥ 85 %** of masked cells have grade < 8 % and the mean grade is **≤ 5.5 %**, and the mask must
    retain **≥ 45 %** of the 22 801 cells (so the mask cannot be tuned into a pass). Report the retained count, both
    percentages, **and** the same two numbers over the unmasked square — r2's 75 % / 7.6 % was unmasked and is not
    comparable to the requirement.

    **Reconciling item 17 with items 1, 2 and 16.** These pull against each other and the round is lost if the builder
    guesses. The resolution is a wavelength, not a compromise. Size the plain undulation by the **maximum grade** of
    the sinusoid, `k = 2πA/λ`, which must land in **[7.0 %, 7.8 %]** — with `A = 2.0 m` that is `λ = 161–179 m`, and
    the worked pair is **`A = 2.0 m, λ = 170 m` → `k = 2π·2/170 = 7.39 %`**. The undulation must also be
    **anisotropic, with its dominant ridge axis within 30° of north–south**, i.e. its phase advancing along **x**:
    `clock.sunAzimuth(6.5) = 97.5°` and `(17.5) = 262.5°` (`src/core/clock.js:41`), so the golden-hour sun rakes
    almost due east/west, and an isotropic 2D undulation gives away most of the along-sun slope component that
    item 2(b) actually measures.

    *The arithmetic, in the form the critic will run it.* Item 2(b) grades the **p90/p10** of the Lambert term, not
    its extremes. For `h = A·sin(2πx/λ)` the slope is `k·cos u` with `u` uniform, so `cos u` is arcsine-distributed
    and its p10/p90 are `∓0.951`; the Lambert term is `sin(e ∓ θ)`, monotone in `cos u`, so
    `p90/p10 = sin(e + atan(0.951k)) / sin(e − atan(0.951k))` at `e = 8.46°`. Setting that equal to 2.5 gives
    `tan θ = 1.5·tan(8.46°)/3.5 = 0.0638`, i.e. `k = 6.71 %` — hence the **7.0 %** floor, which yields **2.62** with
    a little margin. At the top, the mean grade of a sinusoid is `k·(2/π)` and item 17 caps the mean at 5.5 %, so
    `k ≤ 8.64 %`; **7.8 %** yields mean grade **4.97 %**, leaving 0.53 pp of that cap for everything else on the
    plain, and stays under item 17's 8 % per-cell grade outright (it yields p90/p10 **2.99**). The worked pair
    `A = 2, λ = 170` gives **p90/p10 = 2.79** and **mean grade 4.71 %** — both clear with margin.
    The earlier "1.5–2.5 m at 120–200 m" range was wrong at both corners and is withdrawn: `A = 1.5, λ = 200` gives
    p90/p10 = **1.86**, below item 2(b)'s 2.5 floor, and `A = 2.5, λ = 120` gives mean grade **8.3 %**, above item
    17's 5.5 % cap. The "2.9×" quoted with it was the *extreme-value* ratio `sin(e+θmax)/sin(e−θmax)`, which is not
    what item 2(b) computes.

    At noon (sun elevation 64.8°) the same undulation swings the direct term by only **1.07×**, so item 1's *noon*
    contrast must come from albedo, macro land cover (item 3) and cavity AO — never from slope. Cast shadows on the
    plain are
    impossible at 8.46° sun below a 15 % grade and are **not** required there; items 2(a) and 15 are graded on the
    valley walls, hill ring and range, which item 17's mask excludes. Item 16's channels live above
    `seaLevel + 45 m`, also outside the mask.

18. **River and coast are usable by `roads`/`democity`.** Probe: `features.river.zAt(x)` and `halfWidthAt(x)` are
    finite for all `x ∈ [−1024, 1024]`; there exist **≥ 2 crossing sites** where the two banks are < 90 m apart and
    within 3 m of each other in height; `features.coast.xAt(z)` is finite for all `z`; `features.island` is on land
    (`getHeight(island.x, island.z) > seaLevel + 4`).

19. **API contract.** Probe must confirm, with zero console errors: `heights` is a `Float32Array` of `resolution²`
    (263 169) and is the same buffer the mesh reads; `getHeight` returns finite metres and is clamped (finite at
    ±99 999); 7 scattered samples all differ; `getNormal` is unit length; `getSlope ∈ [0, π/2]`; `isWater` is `true`
    in the river channel and `false` at a plains point; `raycast` straight down from `(0, 500, 0)` hits `y` within
    0.05 m of `getHeight(0,0)`, an oblique ray hits on the surface, an upward ray returns `null`; each of
    `modify({mode:'raise'|'lower'|'flatten'|'smooth'})` changes heights, bumps `version` and emits `terrain:changed`
    with `{x,z,radius}`, and a +12 m raise changes the rendered frame. `coverAt(x,z)` returns six finite weights
    summing to 1 ± 0.02 and a stable integer `id` at 20 scattered points, including one in water and one above the
    snow line. `cropRects` returns both named rects with every corner inside the frame at the `coast` and `aerial`
    cameras, so `--crops` produces a non-empty `crops.json` (items 12(b), 15).

20. **`writeHeights` / `flattenStrip`.** Probe: writing `heights` directly then calling
    `writeHeights(ix0,iz0,ix1,iz1)` updates the rendered mesh, normals and chunk bounds, bumps `version`, emits
    `terrain:changed`, and leaves no seam at the rect border. `flattenStrip` over a 200 m polyline crossing a 12 m
    slope produces a corridor whose cross-slope is ≤ the requested `grade` at every sample and which blends to
    natural ground within `blend` m — verified by sampling `getHeight` across the corridor at 10 stations.
    `flattenStrip(pts)` with no options bag uses the documented defaults and does not throw.

21. **Save / load.** `api.serialize()` returns JSON-serialisable data; `api.deserialize(api.serialize())` is a no-op
    (max |Δ| over `heights` ≤ 1e-4, `version` bumped once, frame unchanged by > 1 L-level); deserialising a modified
    heightfield reproduces it exactly and rebuilds meshes, water and clutter.

22. **Determinism.** Two runs of `aerial_12` at `--seed 1337` differ by mean |Δ| ≤ 1.0 L-level. `--seed 7` produces a
    visibly different landscape (mean |Δ| ≥ 15 L-levels vs seed 1337) and still satisfies items 17 and 18.

23. **Budget and hygiene.** Every shot's JSON: `errors: []`, `modules.terrain.status === "ready"`, draw calls and
    triangles within the four draw-call/triangle rows of §5 (terrain-attributable ≤ 25, whole frame ≤ 40, triangles
    ≤ 900 000 / ≤ 500 000 by camera). Probe: `__sim.stats().moduleMs.terrain` median over 120 frames **≤ 2.0 ms**.
    `?showcase=all --camera aerial --time 12` renders with 0 errors and every module `ready`.

24. **LOD, seams and 720p.** No chunk-grid line, crack, skirt flash or LOD pop is visible in any shot; a probe reading
    `api.stats()` at the `aerial` camera must report **≥ 2 non-zero entries in `stats().lod`** while item 1's frame
    shows no seam. `--w 1280 --h 720` at `aerial_12` reproduces items 1 and 3 within 10 % of the 1080p numbers.

### Artefacts the checklist consumes

All 1920×1080 unless stated. `CRITIC.md`'s standard routine produces the noon/night set and the declared presets; the
four **starred** rows are not in it and are ungraded unless shot explicitly.

| Artefact | Produced by | Read by |
|---|---|---|
| `aerial_12.png` | gauntlet `--times 12,22` | 1, 3, 22, 24 |
| `aerial_22.png` | gauntlet | 8 |
| `street_12.png` / `street_22.png` | gauntlet | 6 / 8 |
| `skyline_12.png` / `skyline_22.png` | gauntlet | 11, 14 / 8 |
| `closeup_12.png` / `closeup_22.png` | gauntlet | 5, 6 / 8 |
| `valley_12.png`, `ridge_12.png`, `coast_22.png` | gauntlet, declared presets at 12 and 22 (§8) | 4, 5 / 10 / 12(c), 13 |
| `aerial_6p5.png` **\*** + `.crops.json` | `--camera aerial --time 6.5 --crops` | 1, 4, 15 |
| `aerial_17p5.png` **\*** + `.crops.json` | `--camera aerial --time 17.5 --crops` | 1, 2(a), 15, 16 |
| `skyline_6p5.png` **\*** | `--camera skyline --time 6.5` | 2(a), 13 |
| `coast_17p5.png` **\*** | `--camera coast --time 17.5` | 12(c) |
| `coast_12.png` + `.crops.json`, reflection on/off pair | re-shot with `--crops` (the gauntlet's `coast_12` has none), probe toggling `setReflection` | 12(a), 12(b) |
| `setGrassTufts` on/off pairs at `street_12`, `closeup_12`, `valley_12`, and all four cameras at 22 | probe re-shooting the same frame twice | 5, 6(c), 7 |
| `aerial_12` at `--seed 1337` twice and at `--seed 7` once | `--seed` | 22 |
| `groundmap_<camera>_<time>.json` | the ground probe above, once per frame it grades | 2, 3, 5, 6, 10, 12, 13, 14, 15 |
| `aerial_12` at `--w 1280 --h 720` | `--w 1280 --h 720` | 24 |
| `?showcase=all --camera aerial --time 12` | screenshot.mjs | 23 |

```bash
node tools/gauntlet.mjs --module terrain --round <n> --times 12,22 --timeout 240
node tools/screenshot.mjs --showcase terrain --camera aerial  --time 6.5  --out shots/terrain/r<n>/aerial_6p5.png   --crops --timeout 240
node tools/screenshot.mjs --showcase terrain --camera aerial  --time 17.5 --out shots/terrain/r<n>/aerial_17p5.png  --crops --timeout 240
node tools/screenshot.mjs --showcase terrain --camera skyline --time 6.5  --out shots/terrain/r<n>/skyline_6p5.png  --timeout 240
node tools/screenshot.mjs --showcase terrain --camera coast   --time 17.5 --out shots/terrain/r<n>/coast_17p5.png   --timeout 240
node tools/screenshot.mjs --showcase terrain --camera coast   --time 12   --out shots/terrain/r<n>/coast_12.png     --crops --timeout 240
```

## 5. Budget

Declare in `index.js`: `budget: { drawCalls: 25, triangles: 900_000 }`.

**Reading ARCHITECTURE §9 correctly.** §9 allocates **terrain 20 _and_ water 5** (water is terrain-owned) **and
environment 15**. A `?showcase=terrain` frame therefore contains up to 40 draws legitimately, and
`summary.json.maxDrawCalls` — which is the whole frame, `renderer.info.render.calls` — must be graded against that,
not against terrain's 20. r1's 16 and r2's 19 are whole-frame numbers, so there is real headroom: roughly six terrain
draws for the snow layer (item 10) and any clutter rework, not zero. **INTEGRATOR:** this per-module-versus-whole-frame
rule is not terrain-specific and does not change how `CRITIC.md`'s pass condition ("draw calls within the declared
budget") reads, so it will be re-argued in `roads.md` next round; it belongs in `CRITIC.md`. Until it moves, terrain
declares the two numbers below and the critic grades both.

**Triangles: three numbers exist in three places.** ARCHITECTURE §4 shows `triangles: 400_000` in its illustrative
terrain snippet — that is an example of the *field*, not a budget (§9 caps the whole scene at 3 M). The code currently
declares `1_300_000`. The number graded this round is **900 000**, and the declaration in `index.js` must be lowered
to match it. Do not grade against §4's example.

| Metric | Limit | How it is checked |
|---|---|---|
| Draw calls attributable to terrain (surface + skirts + water + clutter + 3 shadow cascades) | **≤ 25** | ARCHITECTURE §9: terrain 20 + water 5. `api.stats().drawCalls`, cross-checked with the frame delta from `debug.setTerrain(false)` + `debug.setWater(false)` + `setGrassTufts(false)` |
| Draw calls, whole `?showcase=terrain` frame | **≤ 40** | `summary.json.maxDrawCalls` (terrain's 25 + environment's §9 allowance of 15). r1 = 16, r2 = 19 |
| Triangles, `street` / `closeup` / `valley` | **≤ 900 000** | shot JSON. r2 hit 1 018 696 — over. Trim clutter instance counts or blade complexity. |
| Triangles, `aerial` / `skyline` / `overview` / `ridge` / `coast` | **≤ 500 000** | shot JSON |
| `update()` JS per frame | **≤ 2.0 ms** median of 120 frames | `__sim.stats().moduleMs.terrain` (JS only; SwiftShader does not distort it, CPU contention does — take the median) |
| GPU texture memory owned by terrain | **≤ 120 MB** | `api.stats().texBytes` — the module sums `w·h·bpp·1.33` (mipmapped) at its own allocation sites — cross-checked against `__sim.stats().textures`, which is a *count* (`renderer.info.memory.textures`) and can only confirm nothing extra was allocated. The composition this cap was written for: 6 PBR sets × 3 maps × 1024² RGBA8 × 4/3 (mips) = 6·3·5.33 = **96.0 MB**, + height 513² R32F 1.0 + derived 513² RGBA8 1.0 + land-cover 1024² RGBA8 4.0 + macro/ripple 2 × 256² 0.5 + one 768² half-float RGBA reflection RT 4.5 = **≈ 107 MB**, i.e. **13 MB of headroom** |
| Init time (generation + land cover + textures) | ≤ 6 s warm cache | `log.info` timings, part of the 15 s app budget |
| Heap added | ≤ 80 MB | `__sim.stats().heapMB` at `?showcase=terrain` **minus** the same at `?showcase=environment`, both after `window.__sim.ready` plus 60 frames (`src/main.js` imports only the wanted module + environment in showcase mode, so that delta is terrain's). **Not** `debug.setTerrain(false)`: it sets `S.mesh.group.visible` and disposes nothing (`src/modules/terrain/index.js:160`), so its delta is ~0 whatever the module allocates, and GPU texture memory is not in the JS heap at all |

Assets: CC0 only, appended to `public/assets/manifest.json`, 1 k JPG (§10). The six sets in use
(`aerial_grass_rock`, `leafy_grass`, `brown_mud_leaves_01`, `rock_face`, `aerial_beach_01`, `gravel_floor_02`) are
already fetched. They cost **≈ 107 MB of the 120 MB cap** (table above), so the headroom is **13 MB** and one more
1 k set is 3 × 5.33 = **16 MB**: a snow/frost set would land at ≈ 123 MB and breach the cap. It is justified only if
it **replaces** one of the six — and only if procedural snow looks worse.

## 6. Known failure modes

Observed on this module — do not spend a round rediscovering them.

- **Confetti on water.** Ground clutter rendered into the planar reflection appears as yellow/orange speckle across
  every river and estuary (r1 blocker). Two independent causes were found: the clutter mesh being on a layer the
  reflection camera includes, and the reflection lookup distortion being so large (3.0 × width) that the sunlit far
  bank smeared over the channel. Hide clutter in `onReflection(true)` **and** keep the distortion ≤ 0.4 × width.
- **Milky, relief-free aerial.** Fog already at ~30 % by 500–700 m in r1 — note that the `partly` preset alone
  computes to 3.1 % at 500 m today (standing assumptions), so most of that veil was terrain's own material, not
  environment's density; measure both before blaming either. Albedo pulled toward luminance
  (`mix(vec3(lum), c, 0.45)`, `min(c, 0.62)`), flat plains that never self-shadow, cavity AO too weak to read.
  Symptom: a green carpet with `std < 15` and no visible valley at 500 m.
- **Bleached noon.** `skyline_12` at `sat 0.16` — the frame is technically lit but has no colour. Fix in albedo and
  macro variation, not by raising exposure (that is `environment`'s and would blow the sky).
- **Programmer-art street level.** Identical-scale sprite tufts on a jittered grid over a blurry ground, with a hard
  fade radius that appears as a horizontal band of pale blobs at 17–30 m and again at ~140 m. Also: clumps so sparse
  that bare ground shows between them beyond ~10 m, and mid-range instances that read as dark specks.
- **Self-lit clutter at night.** `instanceColor` × a bright blade atlas with an upward normal against a ground at
  L ≈ 23 makes the clutter glow. Derive its albedo from the ground palette at that point, light it with the **ground**
  normal, and let the night exposure drive it.
- **Witch-hat peaks and smooth cones.** One aliased spire on the ridge, featureless cones for islands and outlying
  hills, a hard rock→grass skirt at constant elevation, dark speckle aliasing on distant rock.
- **Pink shore ribbon.** Constant-width sand of a pink tint around every water body, with a white foam outline at
  night.
- **Stair-stepped shadows.** Shadows cast by 8 m/16 m LOD proxies rather than the visible mesh, so valley-wall shadows
  step and blob at 4× magnification.
- **Brush-stroke swirl.** A warped-UV coarse grass sample produces one recognisable curved-stroke motif repeated
  across the whole plain — visible at aerial distance even when the per-pixel detail is fine. Item 4 is the test.
- **The "valley" preset with no valley.** A −7.5 m channel with a 22 m shore lerp cut into a near-flat floodplain,
  framed from above so nothing frames it.
- **Silent contract gaps.** `writeHeights`/`flattenStrip`, `serialize`/`deserialize`, `setSnowLine` and `coverAt` do
  not exist yet; `roads` is currently forced to write `heights` and call `modify()` with strength 0.
- **Budget creep.** Two clutter layers took triangles from 196 k (r1) to 1 019 k (r2) and draws from 12 to 19. Any new
  ground-cover layer must pay for itself by removing another.

## 7. Dependencies and their real APIs

`dependencies: ['environment']` (init order only — terrain must init and render if it is missing).

**`environment`** (`ctx.modules.environment`, guard every call with `?.`):
```js
setupMaterial(material)      // hook a material into CSM + fog uniforms — REQUIRED for every material terrain owns
                             // (surface, lite/proxy, water, each clutter material) because they are ShaderMaterial-like
hookScene()                  // re-sweep the scene for new materials
getSunDirection() -> Vector3 ; getMoonDirection() -> Vector3 ; getLightDirection() -> Vector3
getExposure() -> number ; getNight() -> 0..1
setWeather(preset | {cloudiness, rain, fogDensity, wind}) ; getWeather() -> string
refreshEnvironment()         // force a PMREM rebuild
```
All ten verified in `src/modules/environment/index.js:296–323`. `sunDir`/`moonDir`/`lightDir` point **toward** the
light (`sunDirectionAt`, index.js:44 — `y = sin(elevation)`), which is what the ground probe's `sunLit()` assumes.

Read per frame from `world.weather`. **`src/modules/environment/index.js` is the source of truth for what is on it**,
not ARCHITECTURE §3: §3's `weather` block still lists only `cloudiness, rain, wind, fogDensity, temperature, sunDir,
sunIntensity, skyLight`, and the wave-1 integrator note in `docs/core-requests/terrain.md` claims the rest were added
to §3 when they were not. There is no "§3 addendum" to find — read the code and file the omission in
`docs/core-requests/terrain.md`. The published set is `sunDir, sunIntensity, skyLight, moonDir, moonPhase, lightDir,
lightIntensity, sunColor, exposure, night` (publish block, `:271–281`), `wetness` (integrated at `:198`), and
`cloudiness, rain, fogDensity, wind:{x,z,speed}, preset` (set by `applyPreset`, `:53–55`).
**Degrade:** if `environment` is absent or `setupMaterial` is missing, log a warning once, keep the materials as plain
`MeshStandardMaterial`s, use `world.weather`'s defaults (`sunDir (0.3,0.8,0.5)`, `sunIntensity 3`), and render. Never
throw, never add a light of your own to compensate.

**`roads`** (not a declared dependency; optional at runtime):
`world.roads.isRoad(x, z) -> 0..1` and `world.roads.coverage` (with a `version`) are **not in core's default world**
(`src/core/world.js` defines `nodes/edges/types/version/addNode/addEdge/…` and neither of these). Use exactly the
guard already in `detail.js` (~line 161):
```js
const cov = this.world?.roads?.coverage;
this._isRoad = (cov && typeof this.world.roads.isRoad === 'function') ? this.world.roads.isRoad : null;
```
and re-fill clutter on `roads:changed` or when `coverage.version` changes. **Degrade:** no clutter suppression.

**Core** (`src/core/`, exact signatures):
```js
ctx.assets.pbr(name, {repeat}) -> Promise<{map, normalMap, roughnessMap, aoMap, displacementMap, metalnessMap, armMap, entry}>
                              // every field may be null; resolves even on failure with a procedural fallback
ctx.assets.procedural.noiseTexture(opts) ; ctx.assets.procedural.gradient({size, stops, horizontal, srgb})
ctx.assets.anisotropy          // = min(8, renderer max) — do not exceed it
ctx.camera.camera / .target / .distance / .registerPreset(name, preset) / .apply(preset) / .updateCamera()
                              // presets accept {position:[x,y,z], target:[x,y,z]} or {yaw, pitch, distance, target}
ctx.rng.float() / .int(a,b) / .range(a,b) / .pick(arr) / .weighted([[v,w]…]) / .gauss() / .shuffle(a) / .fork(label)
hash2(x, y, seed) -> 0..1     // from src/core/rng.js — stateless placement hashing
ctx.engine.stats              // {fps, frameMs, drawCalls, triangles, programs, textures, geometries, moduleMs}
constants: WORLD_SIZE 2048, HALF_WORLD 1024, SEA_LEVEL 0, TILE_SIZE 128,
           LAYERS.TERRAIN 1, LAYERS.WATER 6, LAYERS.NO_SHADOW 9,
           RENDER_ORDER.TERRAIN 0, RENDER_ORDER.WATER 10, QUALITY[q].{shadowMap,anisotropy,instanceLod}
ctx.quality in 'low'|'medium'|'high'|'ultra' ; ctx.headless ; ctx.log.info/warn/error
```
`clock.sunElevation(h) = sin(2π(h−6)/24) · 0.72 · π/2` — **8.46° at 06.5 and 17.5**, 64.8° at 12, −56° at 22. Items 2
and 17 are derived from those numbers; do not assume a different golden-hour sun.

## 8. Showcase

`showcase.description`: one sentence naming the landscape features the frames contain.

**Staged scene** — the landscape itself is the show; `setup(ctx)` must, from the *generated* features so it follows
the seed:
1. Register the three presets below from real feature positions (never hard-coded constants that drift off the seed).
2. Leave the clock and weather alone (the showcase router sets `?time=`); do not call `setWeather` in `setup`.
3. Add nothing that is not terrain: no trees, no markers, no helper gizmos.

**Declared `showcase.cameras`** (all three are shot by the critic at 12 and 22, so each must earn its place):

| Preset | Frames | Must show |
|---|---|---|
| `valley` | From low on the **southern valley wall**, looking west along the river | Both valley walls in frame with **≥ 18 m of relief** between the water surface and the near wall's skyline; the meander, shore bands, and clean water with no confetti |
| `coast` | Over the estuary from the south-east toward the sea and the island | Beach of varying width, estuary mouth, sun/moon glint, deep-water tint, and **`features.island` and its inverted reflection both inside the frustum** — item 12(b) is unmeasurable otherwise |
| `ridge` | From the plains toward the eastern range, sun raking across it | Spurs, talus aprons, the rock→scree→grass band, the snow dusting (item 10), aerial-perspective banding, and **≥ 4 of item 9(b)'s eastern-range summits inside the frustum** — otherwise item 10's "0.5–6 % of the GROUND BAND" is satisfied by choosing the pitch rather than by building the snow layer |

**How each standard camera must read** (critic shoots `aerial, street, skyline, closeup` × `06.5, 12, 17.5, 22`;
noon and night are default, golden hour always added). The four core presets are
`aerial {yaw 0.6, pitch 0.85, distance 520}`, `street {yaw 0.9, pitch 0.18, distance 60, target [40,0,40]}`,
`skyline {yaw 2.2, pitch 0.16, distance 900, target [0,40,0]}`, `closeup {yaw 0.6, pitch 0.35, distance 110,
target [20,6,20]}` (`src/core/camera.js:23–27`).

No number appears in this list: §4 is the only place a threshold lives, so it cannot drift into a second copy here.
- **aerial (520 m, pitch 0.85)** — the whole landscape as a modelled surface: river meander, hill ring, coast, macro
  patchwork, drainage channels. 06.5/17.5: long slope shadows, warm ridges, cool valleys. 12: crisp and near-clear in
  the foreground. 22: navy-blue relief, moonlit slopes, no black frame. (Items 1, 3, 8, 15.)
- **street (60 m, pitch 0.18)** — a continuous ground carpet with fine grain to the horizon line, no fade band, no
  discrete tufts in the middle distance; middle distance rolls, far ridge hazed. 22: clutter invisible as a light
  source. (Items 6, 7, 8.)
- **skyline (900 m, pitch 0.16)** — banded aerial perspective toward the eastern range; water plane with glint;
  horizon not a razor line; noon not bleached. Nothing in this frame is further than 2330 m away. (Items 11, 13, 14.)
- **closeup (110 m, pitch 0.35)** — material identity readable: grass grain, dirt patch, rock face, wet shore band,
  water depth tint, contact darkening. Nothing may be resolvable as a repeating sprite. (Items 5, 6.)
- One shot at `--w 1280 --h 720` (item 24) and one `?showcase=all --camera aerial --time 12` (item 23).
