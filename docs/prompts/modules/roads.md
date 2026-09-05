# Module spec: `roads`

Round 3+ spec. Supersedes whatever the builder inferred in rounds 1–2. Read with `BUILDER.md` / `CRITIC.md`
(invariants live there and are **not** repeated here) and `ARCHITECTURE.md` §3, §4, §5, §6, §9, §10, §12, §15.

`$REF` = `/tmp/claude-0/-home-user-SimBuild/c06ed41b-9bdf-5ab7-ace6-40b62a5e4281/scratchpad/ref/` (`cs2_1.jpg` … `cs2_8.jpg`).

Standing assumptions, stated so nobody has to ask:

- The roads showcase runs with **core + environment + terrain + roads only**. There are no lamps, traffic lights,
  signs, trees, buildings, vehicles or pedestrians in frame — `props`, `traffic`, `buildings` are wave 2 and are not
  initialised. Every CS2 comparison below is therefore made against the **road surface, kerb, sidewalk, bridge and
  barrier** of the reference frames, never against the street furniture in them.
- **Roads may not add a light of any kind** (ARCHITECTURE §4: only `environment` may). At 22:00 there are no lamp
  pools in this showcase because lamps do not exist yet. The critic grades night by item 14 — a moonlit road with
  retroreflective paint — and must **not** hard-fail "missing night lighting" for the absence of lamps. Roads
  publishes `api.lampPositions(edgeId)`; `props` will hang lamps on it in wave 2.
- `environment` owns exposure, fog, tone mapping and shadows. Roads compensates in **albedo, AO and geometry**, never
  by touching `toneMapping`, `toneMappingExposure`, `scene.fog`, the shadow map, or `renderer.render`.
- Roads is the only module that may write `world.roads`. It also **conforms the heightfield under its corridor**
  (§12 "conform to terrain (and cut/fill)"). Preferred path: `world.terrain.flattenStrip(pts, opts)` /
  `writeHeights(ix0,iz0,ix1,iz1)` — promised by ARCHITECTURE §3 and specified in `docs/prompts/modules/terrain.md`,
  **but not implemented today**. Until they exist, keep the round-2 fallback (write `world.terrain.heights` directly
  under the corridor, then one `world.terrain.modify({x,z,radius,strength:0})` to rebuild derived data and emit a
  single `terrain:changed`), feature-detect the new API each init, and keep the request in
  `docs/core-requests/roads.md`. Writing heights outside the corridor + its graded slope is forbidden.
- `world.roads.isRoad(x, z)` returns **`0 | 1 | 2`** (0 = unpaved, 1 = asphalt, 2 = sidewalk/kerb/verge), a superset of
  ARCHITECTURE §3's `0..1`. `terrain` already consumes this shape to suppress ground clutter. **This is frozen** —
  changing the return type or the `coverage` object breaks `terrain` and is an automatic fail.
- Round 2 was built but never critiqued. Every ranked issue of `docs/critic/roads_r1.md` is therefore listed here as
  an acceptance item to be **re-verified**, not assumed fixed.

---

## 1. Purpose

Without `roads` the city has no skeleton: nothing for zoning to grow lots against, nothing for traffic to drive on,
nothing for props to line, and no man-made structure on the landscape at all.

## 2. World data owned

Implement exactly this on `world.roads` (mutate in place; **never** `world.roads = {…}`). Signatures copied from
ARCHITECTURE §3:

```js
roads: {                           // owner: roads
  nodes: Map<id, {id, x, y, z, edges:Set<id>}>,        // y = terrain-snapped height
  edges: Map<id, {id, a, b, type, lanes, width, oneWay, ctrl?:{x,z}, length, elevation}>,
  types: { 'street':{width:16,lanes:2,speed:50}, 'avenue':{width:24,lanes:4,speed:60},
           'highway':{width:32,lanes:6,speed:100}, 'alley':{width:8,lanes:1,speed:30},
           'gravel':{width:8,lanes:2,speed:30} },
  version: 0,                      // bump on any change
  addNode(x,z) -> id, addEdge(a,b,type,opts) -> id, removeEdge(id), removeNode(id),
  nearestEdge(x,z,maxDist) -> {edge, t, point, dist} | null,
  coverage / isRoad(x,z) -> 0..1,  // paved mask; terrain skips ground clutter where this is non-zero
  // edges also carry: trimA/trimB, bridge, ring (roundabout member), merge/accel (ramps)
  // types also carry: asphaltHalf, cornerR, laneW, shoulder, median, oneWay; plus a 'ramp' type

  sample(edgeId, t) -> {x,y,z, tangent:{x,z}, normal:{x,z}},   // t ∈ [0,1] along edge
  laneCenter(edgeId, laneIndex, t) -> {x,y,z,tangent},          // lane 0 = rightmost in a→b direction
  frontage(edgeId) -> [{side:'left'|'right', from:t, to:t, x, z, heading}] // for zoning
}
```

Shapes already shipped and depended on downstream — **do not change them**:

```js
coverage = { res, cell, data: Uint8Array(res*res), version }   // res = world.size / terrain.cellSize = 512, cell = 4
isRoad(x, z) -> 0 | 1 | 2
types[t] = { width, lanes, speed, sidewalk, asphaltHalf, cornerR, laneW, shoulder, median, oneWay }
frontage(edgeId)[i] = { side, from, to, x, z, heading, width, length }   // from/to normalised t, extras allowed
```

`api` (reachable as `ctx.modules.roads`) — keep all of these, they are the wave-2 contract:

```js
rebuild()                        // rebuild all meshes + conform terrain; idempotent
lampPositions(edgeId) -> [{x,y,z,heading,side,edgeId,t}]     // props hangs streetlamps here
intersections() -> [{id,x,y,z,roundabout,arms:[{edgeId,dir,trim,stopT,lanesIn,width,type,ring}]}]  // traffic + props
nodeInfo(id) -> {kind,arms,corners,trims} | null
stats() -> {edges,nodes,meshes,tris,bridges,terrainVerts,ms}
types() -> world.roads.types ; edges() -> [{id,a,b,type,len,bridge,ring}] ; edgeDebug(edgeId, step)
serialize() -> {nodes:[{id,x,z}], edges:[{id,a,b,type,lanes,oneWay,ctrl}]} ; deserialize(data)
debug: { setVisible(v) -> void }  // NEW this round: show/hide the whole roads group in one call.
                                  // This is the critic's isolation switch for ROADS REGION (§4 conventions) and for
                                  // every "attributable to roads" diff in §5. Implement it as
                                  // `ctx.group.visible = !!v` — `ctx` is module-local and unreachable from a probe.
```

**Permitted additions this round** (additions only — nothing above is removed, renamed or retyped):

- `addEdge(a, b, type, opts)` gains **`opts.width`**: a per-edge paved *half*-width in metres, stored on the edge as
  `edge.asphaltHalf` and defaulting to `types[type].asphaltHalf`. This is the sanctioned mechanism for the
  roundabout ring (item 10) and for any other edge that needs a non-default carriageway. The shipped `opts` set
  (`{ctrl, lanes, oneWay, elevation}`, `src/modules/roads/network.js:45–55`) is otherwise unchanged.
- **Do not add a seventh road type.** `types` stays the closed set of six shipped in `TYPE_DEFAULTS`
  (`network.js:6–12`): `alley, gravel, street, avenue, highway, ramp`. Item 17 grades exactly that set. The numeric
  values in `TYPE_DEFAULTS` are authoritative and are **not** changed this round — where an acceptance item quotes
  one (item 12's `cornerR`), the code value wins and the quote is there to save a lookup.
- `api.debug.setVisible(v)` as above.

**Events emitted** (ARCHITECTURE §5), after the mutation is complete, with `version` already bumped:

| Event | Payload |
|---|---|
| `roads:changed` | `{added:[edgeId], removed:[edgeId], nodes:[id]}` |

Roads **listens** to `roads:changed` (coalesce ≤ 0.05 s, then rebuild) and `terrain:changed` (re-sample design heights
of the affected edges only; ignore the `terrain:changed` its own cut/fill causes — the reentrancy guard is required,
without it the module rebuilds forever).

## 3. Visual/behavioural target

Named references, looked at, not remembered:

- **`$REF/cs2_1.jpg` — aerial roundabout + motorway.** Asphalt is a **warm mid-grey**, not black, with large soft
  patchwork in tone across the carriageway. The roundabout is a **true circle** with a landscaped, kerbed island;
  the ring carries only circulating dashes; entries carry give-way markings and a set-back ladder crosswalk. Bold
  white arrows with fat heads. The motorway has a **grass median with steel guardrail on both sides**, a wide hard
  shoulder, and a continuous pale kerb/edge line separating carriageway from verge. Every road edge has a crisp light
  band (kerb top + concrete) against dark asphalt — that light edge is what makes CS2 roads read at 500 m.
- **`$REF/cs2_4.jpg` — suburban arterial, low sun.** Sidewalk is a **wide, clearly lighter concrete band** with a
  visible kerb face casting a thin shadow onto the gutter; a grass verge sits between kerb and property; driveways
  cross the sidewalk with dropped kerbs; the crosswalk is a **ladder of thick white bars**; the corner radius is
  generous but the intersection is *not* an asphalt lake — the paved area hugs the arms.
- **`$REF/cs2_8.jpg` — night street, rain.** Asphalt is dark blue-grey with wet specular streaks; the paint is the
  brightest thing on the ground but never blows out; sidewalk slabs are individually legible; the kerb is a bright
  edge line all the way to the vanishing point.
- **`$REF/cs2_6.jpg` — motorway in snow.** Yellow left edge line, white dashed lane lines, guardrail silhouette,
  wide shoulder, and the road surface reads as a *material* even at 300 m.
- **`$REF/cs2_5.jpg` — parking closeup.** Paint has soft, slightly worn edges; the surface has fine grain and macro
  mottling; contact shadows under everything are dark and tight.

**Where we are** (`shots/roads/rdev2/*`, round 2, self-scored 7.5): the network, curves, markings system, bridges and
terrain conform are right; the *surface* is not. Asphalt is a flat near-uniform dark fill; the kerb/sidewalk reads as
one grey band with no face, no material, no joints; intersections are oversized bland polygons; there is no verge, no
manhole, no patch, no seam, no guardrail, no roundabout island planting, and night is a dimmed noon. Round 3+ is
about **surface, edge and furniture**, not about re-engineering the graph.

## 4. Acceptance criteria

**Measurement conventions** (builder and critic both use these; deviating from them is a finding, not a defence):

- `L = 0.2126R + 0.7152G + 0.0722B` on the 8-bit sRGB PNG. `whitePct` = % pixels with `min(R,G,B) > 247`;
  `blackPct` = % with `max(R,G,B) < 8`. Two measurement scales, and **every acceptance item names which it uses**:
  - **480-px whole frame** (as `shots/environment/r2/imgstats.mjs` does): only the whole-frame `whitePct` /
    `blackPct` numbers (items 4, 14), item 13's hierarchy and band reads, and item 24's layout comparison.
    Nothing else. No per-material statistic is ever taken at this scale — at 480 px a 0.10–0.15 m edge line is
    sub-pixel and its measured value is asphalt, not paint.
  - **Full-resolution named crops**: every other statistic in items 3–8 and 14–16. Each crop is saved beside the
    shot it came from as `shots/roads/r<n>/<shot>_<CROPNAME>.png`, and its pixel rectangle `(x, y, w, h)` and the
    world extent it covers are listed in the report. A statistic whose crop is not saved and named is **ungraded**:
    the critic records it as missing evidence, not as a failure.
- **The four crops.** Each is a full-resolution rectangle cut from a named shot and reported as above:
  - **CARRIAGEWAY CROP** — ≥ 256 × 128 px, entirely on sunlit asphalt: no marking, no manhole, no kerb, no seam
    running off an edge, no shadow boundary.
  - **SIDEWALK CROP** — ≥ 128 × 64 px, entirely on sunlit sidewalk top: no kerb face, no shadow, no dropped kerb.
  - **PAINT CROP** — a ≥ 64 px run along a single edge line or a single centre-line dash, ≥ 8 px across, containing
    the paint and its ≤ 2 px feather and nothing else.
  - **SHADOW CROP** — ≥ 128 × 64 px of asphalt in cast shadow (kerb, parapet, barrier or deck soffit), taken from
    the **same shot** as the CARRIAGEWAY CROP it is compared against.

  The probe returns, for each crop, the world-space extent of its corners unprojected onto the road surface
  (`{x0,z0,x1,z1}` and the derived metres-per-pixel), so any "per N metres" requirement is computable from the crop
  itself. Where an item asks for a statistic on a material, it means the corresponding crop, at full resolution.
  **One crop per material per shot**, named `<shot>_CARRIAGEWAY.png`, `<shot>_SIDEWALK.png`, `<shot>_PAINT.png`,
  `<shot>_SHADOW.png`: items 4, 5(a) and 5(e) all read `armtop_12_CARRIAGEWAY.png`, and a crop chosen to satisfy one
  of them may not be re-cut to satisfy another. Size the `armtop_12` carriageway crop so its world extent spans
  ≥ 60 m of carriageway (item 5a) as well as ≥ 256 × 128 px.
- **ROADS REGION** = the pixels covered by asphalt + sidewalk + bridge structure. Isolate it in **one page session**:
  capture the frame, call `api.debug.setVisible(false)`, wait 5 frames, capture again, and take the pixels with
  `|ΔL| > 6`. Same process, same camera, same clock — never two separate `screenshot.mjs` runs.
- **Probe** = a throwaway Playwright script under `shots/roads/r<n>/` against
  `http://127.0.0.1:5173/?showcase=roads&headless=1&time=12&seed=1337`, waiting for `window.__sim.ready`. **These
  access paths are verified against the code; use exactly these and invent no others:**
  - world data — `window.__sim.world.roads` (`src/core/debug.js:18`)
  - the module api — `window.__sim.registry.apis.roads` (`src/core/registry.js:15`; the same object the module sees
    as `ctx.modules.roads`, `registry.js:36`)
  - the roads `THREE.Group` — `window.__sim.registry.get('roads').group` (`registry.js:99`, group created at
    `registry.js:12`). Prefer `api.debug.setVisible(v)`; reach for the group only if that call is missing.
  - engine counters — `window.__sim.stats()` → `{fps, frameMs, drawCalls, triangles, moduleMs, heapMB, modules, …}`
    (`debug.js:18–27`)
  - weather — `window.__sim.world.weather` (item 15)

  **There is no `window.__sim.modules`.** `__sim` exposes exactly `ready, readyAt, verbose, errors, warnings, world,
  events, clock, camera, engine, registry, stats(), setTime(), setCamera(), setSpeed(), modulesStatus()`
  (`debug.js:13–32`); module status comes from `stats().modules` or `modulesStatus()`.
- Shot paths are the gauntlet's: `shots/roads/r<n>/<camera>_<time>.png`, `.` → `p` (`street_12.png`, `bridge_17p5.png`).

Ordered by how much each moves the score.

1. **The road is never under the ground.** Probe every non-bridge edge at 2 m arc intervals × 5 lateral offsets
   (`u = 0, ±0.5·asphaltHalf, ±0.95·asphaltHalf`), ≥ 4 000 samples: `terrain.getHeight(x,z) ≤ y − 0.06 m` for
   **100 %** of samples, and `y − getHeight ≤ 0.45 m` for **≥ 99 %** (conformed, not on a plinth). No terrain wedge or
   grass rectangle on any carriageway in `closeup_12`, `intersection_12`, `street_6p5`, `armtop_12` at 4×.
   (r1 blocker 1: 28/1 254 samples sunk, worst −0.44 m.)
2. **Nothing grows through the pavement.** At 4× magnification of `street_12`, `closeup_12`, `kerb_12`: **zero** grass
   blades/tufts on asphalt or sidewalk. Probe: `isRoad` is a function, `coverage.res === 512`, `coverage.cell === 4`,
   `isRoad(40,40) === 1`, a point on a sidewalk returns `2`, a point 40 m off any edge returns `0`, and
   `coverage.version` increases after an `addEdge` + rebuild. (r1 blocker 2.)
3. **Kerb and sidewalk are modelled, material and grounded.** (`$REF/cs2_4.jpg`, `$REF/cs2_8.jpg`; the single largest
   "obviously synthetic" tell left in r2.)
   (a) Kerb face **0.13–0.18 m** tall, continuous along every street/avenue arm and around every corner fillet.
   (b) `kerb_12`, full-res crops: `mean L(kerb face crop) ≤ 0.65 × mean L(SIDEWALK CROP)`, and
   `mean L(SIDEWALK CROP) − mean L(CARRIAGEWAY CROP) ≥ 35` levels. The kerb-face crop is a ≥ 64 × 16 px run of
   kerb face only, saved and named like the others.
   (c) Sidewalk carries **slab joints**: darker lines at **1.0–1.5 m** pitch, ≤ 0.05 m wide, contrast 8–25 L levels
   (subtle, never a checkerboard), resolvable in `kerb_12` and `closeup_12`.
   (d) **Dropped kerb** (face ≤ 0.04 m) across the full width of every crosswalk, with a 0.6–1.0 m contrast landing
   pad at each end.
   (e) The sidewalk outer edge is never a floating plate: probe ≥ 500 points on the outer edge,
   `|sidewalkTopY − h − terrain.getHeight| ≤ 0.15 m` at every one — where `h` is **the kerb height chosen under (a)**,
   reported by the probe as a single number in 0.13–0.18 — and a chamfered verge (0.6–1.0 m) carries it into the
   ground. (r1 issue 8.)
4. **Noon albedo and contrast.** At 12:00, measured on **full-resolution named crops** — not on the 480-px frame.
   One complete set of four crops (CARRIAGEWAY, SIDEWALK, PAINT, SHADOW) from `street_12` and one from `armtop_12`,
   plus a CARRIAGEWAY + SIDEWALK pair from `closeup_12`; every rectangle listed in the report. Thresholds, on every
   set: CARRIAGEWAY CROP `p50 ∈ [72, 120]` and `std ∈ [6, 26]`; SIDEWALK CROP `p50 ∈ [130, 185]`;
   PAINT CROP `p95 ∈ [195, 248]`; `mean L(CARRIAGEWAY CROP) / mean L(SHADOW CROP) ≥ 2.0` — the shadow being a kerb,
   parapet or deck-soffit shadow in that same shot. Whole frame at 480 px, all three shots: `whitePct ≤ 0.15 %`.
   (r1 issue 4: `p1 ≥ 97`, sidewalks near white.)
5. **The asphalt is a used surface, not a fill.** Within 60 m of the camera in `armtop_12` and `closeup_12`:
   (a) surface-age patches, counted in a CARRIAGEWAY CROP whose **reported world extent covers ≥ 60 m** of
   carriageway (this is what the crop's world extent is for — if one crop cannot span 60 m at that camera, report
   two adjacent crops and sum): ≥ 3 regions of ≥ 400 px each whose mean L differs from the crop's median by
   **6–20 levels**; boundaries irregular — at 4× magnification no patch boundary runs straight for more than 3 m,
   and none is parallel or perpendicular to the road axis within 5° over more than half its length;
   (b) ≥ 1 utility cover (manhole / gully grate) per 40 m of street lane and ≥ 2 per 4-way intersection, modelled as a
   0.6–0.8 m disc or 0.4×0.6 m rectangle with a rim, not a painted circle;
   (c) a gutter grime band 0.4–0.8 m wide along every kerb, 6–18 L darker;
   (d) ≥ 2 tar-seam repairs per 100 m of carriageway, none straight-and-parallel to the road axis;
   (e) **no tiling — measured as periodicity, not as correlation.** `shots/roads/r<n>/tiling.mjs`, run on the very
   same CARRIAGEWAY CROP file the report names for item 4: mean-subtract the crop, compute the normalised
   cross-correlation against itself at every integer shift from **24 to 128 px**, horizontally and then vertically,
   and require `max(NCC) − median(NCC) < 0.15` over that range in both directions — i.e. no local peak stands above
   the smooth decay envelope. **Shifts below 24 px are not measured**: the macro mottling 5(a) demands necessarily
   correlates there, and raw NCC magnitude is not the defect — a repeat at the texture period is. The script prints
   `{axis, argmax, max, median, verdict}` and its output is pasted into the report. (r1 issue 10; r2 self-flagged a
   residual crack grid in `armtop`.)
6. **Markings are geometrically correct and crisp.** Verify against `armtop_12` (top-down) with the probe's world
   coordinates: zebra bars 0.45–0.55 m wide with 0.45–0.55 m gaps, ≥ 2.5 m long, ladder starting **≥ 1.0 m beyond the
   corner-fillet tangent**, and **no corner or fillet polygon overlapping any bar**; stop line 0.3–0.5 m wide,
   1.0–2.5 m before the ladder; turn arrows with shaft ≥ 0.28 m, head ≥ 1.0 m wide and ≥ 1.2 m long, total ≥ 4.0 m,
   one per approach lane within 30 m of a stop line, **no hooked "L" shapes**; dashed centre 3 m mark / 6 m gap ±10 %;
   edge line 0.10–0.15 m wide inset 0.2–0.4 m from the asphalt edge; avenue double-solid centre with a 0.10–0.15 m
   gap; yellow (hue 45–55°) inner lines on `highway` only; paint edges soft and worn, measured on the
   PAINT CROP — the per-column mean L along the crop's long axis has **standard deviation ≥ 8 levels** (a dead-flat
   stencil scores ≈ 0), and the cross-section from asphalt to full paint takes **≥ 2 px** at 1080p (a hard
   one-pixel step is a finding). (r1 issues 8, 11.)
7. **No sparkle, no shimmer.** In `highway_12`, `merge_12`, `aerial_12`, over **paint-free asphalt only**: pixels
   differing from their 3×3 median by ≥ 35 L are **≤ 0.05 %** of the measured region.
   **Marking edges are exempt, explicitly.** At 520 m a 0.10–0.15 m edge line is 1–2 px wide and every one of its
   pixels differs from its 3×3 median by far more than 35 L — items 6 and 13 require exactly that crispness, so
   blurring markings to pass this item is itself a finding, not a fix. Build the region one of two ways, and say
   which: (i) the shot's asphalt pixels minus a **marking mask dilated by 2 px**, the mask projected from the
   probe's marking geometry; or (ii) paint-free crops of ≥ 256 × 256 px, saved and named like every other crop.
   Regions, stated per shot in the report: `highway_12` — the carriageway strip between the median barrier and the
   outer guardrail, markings masked; `merge_12` — the gore area and the two carriageways either side of it,
   markings masked; `aerial_12` — three paint-free crops, one each over street, avenue and highway asphalt.
   Roughness ≥ 0.55 beyond 60 m, `normalScale` faded
   to ≤ 0.25 beyond 120 m, anisotropy = `ctx.assets.anisotropy` on every road map, dash coverage box-filtered.
   (r1 issue 5: white speckle across the highway; r2 traced it to a non-`flat` packed-integer varying — keep the
   `flat` qualifier and never interpolate a packed flag word.)
8. **Bridges land, and read as structures.** (r1 blocker 3; r2 self-flagged "plain box girders".)
   No deck end floats: probe **every deck end and every road terminus** — including the highway's western end where
   it approaches the coast (§8 staged scene, item 9), which is where r1 blocker 3's dark void lived and which no
   camera preset now frames head-on.
   The abutment mesh spans deck soffit to ground with **zero** gap, wing walls extend ≥ 3 m either
   side, and the gravel/verge skirt continues under the deck end. One named full-res crop of the coast terminus, cut
   from `aerial_12` and saved as `aerial_12_COASTEND.png`, goes in the report: no air gap, no black void, no cliff
   face darker than `mean L 25` at noon. Parapet 0.9–1.1 m
   with a coping course and a modelled railing rhythm at ≤ 3.0 m pitch. Pier caps ≤ deck outer width, piers 18–30 m
   apart. Deck soffit and pier sides `mean L ≥ 25` at noon (r2 flagged them as near-black).
   Reflection speckle is graded as a **delta, never as a level** — terrain owns the water mesh and its render target
   (`ctx.modules.terrain.debug.waterRT()`, `src/modules/terrain/index.js:162`), and roads can only influence it
   through deck, pier and abutment albedo. In one page session at `bridge_12`, count water pixels differing from
   their 3×3 median by ≥ 40 L with roads visible, then again after `api.debug.setVisible(false)` + 5 frames: the
   visible run may exceed the hidden run by **≤ 0.3 percentage points** of the water region. A speckly reflection
   that is equally speckly with roads hidden is terrain's finding, not roads'. (r1 issue 9.)
9. **One grade separation.** The highway crosses **over** the avenue: probe the minimum vertical distance between the
   two road surfaces at the crossing ≥ **5.0 m**; piers land clear of both carriageways (≥ 1.0 m from any asphalt
   edge); the two surfaces never intersect and show no z-fighting at `overpass_12` / `overpass_22`. (CS2's signature
   read, `$REF/cs2_1.jpg`, `$REF/cs2_2.jpg`; absent in r1/r2.)
10. **The roundabout is a roundabout.** Outer asphalt edge deviates ≤ 0.5 m from a fitted circle over the whole ring
    (probe the ring edges at 1 m intervals); circulating carriageway **5.0–6.5 m** wide — the ring is built from
    `street` edges given `opts.width` (the per-edge half-width override added in §2), *not* by adding a type and not
    by leaving them at `street`'s default `asphaltHalf 5.0`, which would give 10 m of paved width; the probe reports
    `edge.asphaltHalf` for every ring edge and it is 2.5–3.25; a kerbed central island with a
    0.8–1.2 m over-runnable apron in a distinct material and a 0.10–0.15 m kerb; the island interior is **finished by
    roads** (raised planted mound or paved plaza — not bare heightfield, and no `props`); give-way triangles
    (≥ 4 per entry, base 0.4–0.6 m) on every entry; **no zebra, stop line or turn arrow on any ring arm**; the shape
    reads as a circle, not an octagon, in `aerial_12`. (r1 issue 7.)
11. **Cut, fill and retaining walls.** Probe every edge at its 4 m rows: longitudinal grade ≤ **8 %** for
    alley/street/avenue and ≤ **6 %** for highway/ramp. **This replaces r2's shipped 15 % limit** (see
    `docs/builds/roads_r2.json`) and is a deliberate tightening, not a misreading of it.
    **Precedence when the seeded terrain will not allow 8 %** — apply in this order, do not re-route and do not
    relax the grade: (1) the grade limit always wins; (2) cut or fill up to **8.0 m** at the corridor edge is
    permitted to meet it; (3) beyond **3.0 m** of cut or fill a retaining wall is **mandatory**, not optional;
    (4) only if 8 m of cut/fill still cannot meet the grade may the edge be re-routed, and the report must name the
    edge and say so. No cut or fill face steeper than 1:1.5 (33.7°) unless a
    retaining wall carries it. Where the corridor edge cuts or fills > **3.0 m**, a retaining wall mesh appears with a
    coping course and a visible batter; at least one is visible in `hillcut_12`. No axis-aligned rectangular terrain
    scar anywhere in `aerial_12` / `aerial_17p5`. (r1 issue 6; r2 self-flagged missing retaining walls.)
12. **Intersections hug their arms.** Probe `nodeInfo`: the paved polygon of a node extends ≤ `max(arm.trim) + 2.0 m`
    from the node centre; corner fillet radius equals the type's `cornerR` ± 0.5 m — the shipped values in
    `TYPE_DEFAULTS` (`src/modules/roads/network.js:6–12`) are **alley 4, gravel 4, street 6, avenue 8, highway 10,
    ramp 8**, they are authoritative, and this round does not change them; the corner sidewalk follows the fillet at
    constant width ± 0.3 m. For the two crossing 16 m
    streets at (40, 40) the paved square measures **≤ 34 × 34 m**. In `closeup_12` no intersection may read as a blank
    asphalt lake — every 4-way carries 4 ladders, 4 stop lines and per-lane arrows inside that envelope.
13. **Hierarchy reads from 520 m.** In `aerial_12`, measured at 480 px wide, these five of the six types are
    distinguishable from one another (`ramp` is graded by item 16, not here): `highway` by median + shoulders
    + 6 lanes, `avenue` by 4 lanes + double-solid centre, `street` by 2 lanes + dashed centre, `alley` by a single
    lane and no centre line, `gravel` by no paint at all. A lighter sidewalk band is visible along **both** sides of
    every street/avenue arm (`ΔL ≥ 18` vs adjacent asphalt at 480-wide scale), and `|mean L(asphalt) − mean L(adjacent
    ground)| ≥ 25` so no road dissolves into the terrain.
14. **Night is moonlit road, not dimmed noon.** At 22:00 (`street_22`, `closeup_22`, `intersection_22`,
    `bridge_22`, `roundabout_22`, `highway_22`, `overpass_22`). Per-material numbers on **full-resolution crops**,
    one CARRIAGEWAY CROP and one PAINT CROP per shot, saved and named like every other crop:
    CARRIAGEWAY CROP `p50 ∈ [8, 38]`; `PAINT CROP p50 / CARRIAGEWAY CROP p50 ≥ 3.0` (retroreflective paint);
    PAINT CROP `p95 ≤ 190`. Over the whole **ROADS REGION** (isolated as the conventions block says): **zero**
    pixels > 225 — nothing on a road may glow — and `mean(B) − mean(R) ≥ +5` (cool night cast). Whole frame at
    480 px: `blackPct ≤ 3 %`. Roads adds no light and no emissive material with intensity > 0.15.
15. **Wet roads under rain.** Roads reads `world.weather.wetness` (never a private timer, never its own rain state).
    **Procedure — one page session, one process, three captures at the `street` camera, at 17.5 and again at 22**
    (this is the rain pair §8 names; `--weather rain` on the command line is *not* how the numbers are taken,
    because `environment` ramps wetness over time — `w.wetness += (w.rain − w.wetness) · min(1, dt·0.25)`,
    `src/modules/environment/index.js:198` — so a capture at t ≈ 1.5 s sits at an indeterminate wetness that varies
    run to run under SwiftShader):
    1. capture **DRY** with `world.weather.wetness = 0` and `world.weather.rain = 0`;
    2. set `world.weather.rain = 1; world.weather.wetness = 1` through the probe, wait **30 frames**, capture **WET**;
    3. set both back to `0`, wait 30 frames, capture **DRY2**.
    Thresholds, all at `wetness = 1` and all on the CARRIAGEWAY / PAINT crops at the same pixel rectangles across
    the three captures: WET CARRIAGEWAY `p50` is **≥ 12 % below** DRY's; a specular response appears — ≥ 0.5 % of
    the carriageway region above DRY's `p99 + 25`; `PAINT p50 / CARRIAGEWAY p50 ≥ 2.0` still holds when wet.
    Reversibility: **≥ 99.9 % of DRY2's pixels are within ±1 level of DRY's** (not "byte-identical" — ARCHITECTURE
    §11 itself says "modulo float driver noise"). (`$REF/cs2_8.jpg`.)
16. **Highway furniture.** Hard shoulder 1.8–2.2 m with a continuous inset edge line; chevron gore hatching ≥ 12 m
    long plus a painted nose triangle at the ramp merge; **steel guardrail** (post + beam silhouette, posts ≤ 4.0 m
    pitch) along both outer edges of the highway; median barrier with a lighter top face (`ΔL ≥ 20` vs its side faces
    at noon). At the mid-distance of `highway_12` the barrier subtends ≥ 3 px vertically — it must read as an object,
    not a line. (r1 issue 12; `$REF/cs2_1.jpg`, `$REF/cs2_6.jpg`.)
17. **Every declared type is in frame and visibly different.** All six of `alley, gravel, street, avenue, highway,
    ramp` (the closed set of §2) appear in the staged scene and each is identifiable in a named shot:
    `gravel` has no paint, no kerb, a 0.4–0.8 m soft edge dissolving into terrain and a coarser normal; `alley` has
    one lane, kerbs, no centre line; `ramp` is one lane with shoulders and no sidewalk. `alley` is already staged
    (two chains, `src/modules/roads/showcase.js:33–35`) but has never been *graded* — name the shot it reads in.
    `gravel` was never staged in r1/r2 — stage it (§8 item 3).
18. **API contract, unchanged and probe-verified** (r1 verified all of this; it must not regress). With zero console
    errors: `addNode`/`addEdge` return ids and build geometry within 3 frames; `version` bumps and `roads:changed`
    fires with `{added,removed,nodes}`; `sample(id,0/1)` lands within 0.5 m of the node, mid-point on the curve,
    unit tangent, `normal` perpendicular, `y` within 1.5 m of terrain, `null` for a bad id; a `ctrl` edge bows off the
    chord (arc/chord ≥ 1.1) with uniform arc-length parametrisation; `laneCenter` puts lane 0 on the **right** in the
    a→b direction and every lane inside `asphaltHalf`; `frontage` returns both sides with `from < to ≤ 1` and finite
    headings; `nearestEdge` hits inside `maxDist` and returns `null` beyond it; `removeEdge` clears both nodes' sets
    and drops orphan nodes; `removeNode` cascades; `lampPositions` spacing 24–32 m, staggered between sides, ≥ 8 m
    from any intersection centre, `y` within 0.05 m of the sidewalk top; `intersections()` returns every node with
    ≥ 3 arms, each arm carrying `trim` and `stopT`; `types.street.width === 16` and every type keeps
    `width/lanes/speed` plus `sidewalk/asphaltHalf/cornerR/laneW/shoulder/median/oneWay` (all ten keys of the frozen
    shapes block in §2); and `api.debug.setVisible` is a function that toggles the group and back.
19. **Determinism and idempotence.** Two loads at `seed=1337` give identical `stats()` `{edges,nodes,meshes,tris}`; a
    second `rebuild()` writes **0** heightfield vertices and yields the identical triangle count;
    `deserialize(serialize())` reproduces the same counts and triangle count. (r1 issue 13. The `Math.random` grep
    is CRITIC.md's standing check, not a roads-specific item — it is not repeated here.)
20. **Budget.** Every number in §5 met, measured as stated there.
21. **The capture manifest is complete.** Every shot in §8's manifest exists, and none outside it was needed:
    **38 captures**, no more, no fewer. BUILDER.md's definition of done and CRITIC.md's pass gate already require
    zero console errors and `ready` in every shot; this item adds only that the manifest is the set they apply to.
22. **The corridor exception.** BUILDER.md's "stay in your lane" applies unchanged; the one roads-specific
    delta is the heightfield: `world.terrain.heights` may be written **strictly inside the road corridor and its
    graded slope**, through the sanctioned path in the standing assumptions, and nowhere else. The probe records the
    index bounds it wrote; any vertex outside the corridor + graded slope is an automatic fail.
23. **Edits are responsive, and `update()` does not allocate.** After init on the 75-edge showcase network, a probe
    that calls `addEdge` and waits settles in ≤ **800 ms** of `api.stats().ms` (dirty-region rebuild, not a
    whole-network rebuild), and the new edge's triangles are present. No-allocation is measured, not asserted:
    `__sim.stats().heapMB` sampled after a forced settle, then again after **600 idle frames** at the `street`
    camera, must have grown by **< 1 MB** (`heapMB` is null when `performance.memory` is absent — then say so and
    the item is ungraded, not failed).
24. **720p parity.** `aerial_12` at `--w 1280 --h 720`, compared with the 1080p `aerial_12`: at 480 px wide both
    frames show the same geometry and marking layout — every road, bridge, roundabout and overpass present in both,
    no marking dropping out. Instrumented, not eyeballed: item 6's probe values (bar widths, dash pitch, edge-line
    inset, in **world** units) are identical to the 1080p run within ± 2 %, and item 7's paint-free speckle number
    at 720p is **≤ 0.05 %** on the same three regions. ("No new aliasing crawl" is temporal and is not graded from a
    still; the speckle number is the proxy.)

## 5. Budget

| Metric | Limit | How measured |
|---|---|---|
| Declared `budget` in `index.js` | `{ drawCalls: 48, triangles: 600_000 }` | ARCHITECTURE §9 allocates roads 80; roads declares **48** so that CRITIC.md's "draw calls within the declared budget" and the row below are the same test. A 60-draw-call build must not pass the role file and fail the spec |
| Draw calls **attributable to roads** in any showcase shot (incl. shadow cascades) | **≤ 48** | probe, one page session: `api.debug.setVisible(false)` → wait 5 frames → diff on `__sim.stats().drawCalls`. r2 = 16 — spend the headroom on furniture, not on unmerged meshes |
| Scene draw calls in any `?showcase=roads` shot (terrain + environment + roads) | ≤ 90 | `summary.json.maxDrawCalls`. r1 = 86, r2 = 44 |
| Triangles attributable to roads, showcase | **≤ 300 000** | same `setVisible` diff on `__sim.stats().triangles`. r2 = 55 587 |
| Triangles, whole frame, any showcase shot | ≤ 1 300 000 | shot JSON |
| `update()` JS per frame, idle | **≤ 0.3 ms** median of 120 frames | `__sim.stats().moduleMs.roads` |
| `update()` JS, any single frame | ≤ 2.0 ms | as above (a rebuild is init/edit work, not a frame cost — see item 23) |
| Full rebuild of the showcase network at init | ≤ 3.5 s | `api.stats().ms`, logged by `index.js` |
| Roads' share of init | ≤ 5 s of the 15 s app budget | `log.info` timings |
| GPU texture memory owned by roads | **≤ 96 MB** | ≤ 4 PBR sets at 1 k (no 2 k), one ≤ 512² noise, one ≤ 1024² paint/decal atlas |
| Heap added | ≤ 60 MB | `__sim.stats().heapMB` delta |

Geometry rule: per-tile merged geometry, tiles ≤ 1024 m, one draw call per (tile × material). Anything repeated more
than ~50 times across the map (manhole covers, guardrail posts, railing balusters, kerb-side gullies) is an
`InstancedMesh` or is merged into the tile — never a `Mesh` each.

Assets: CC0 only, appended to `public/assets/manifest.json`, 1 k JPG (§10). `asphalt_02`,
`concrete_floor_worn_001`, `gravel_floor_02` are already fetched. At most **one** further PBR set is justified
(a kerb/paving-slab concrete); prefer procedural detail (slab joints, patches, seams, paint atlas) over new downloads.

## 6. Known failure modes

Observed on this module or its neighbours — do not spend a round rediscovering them.

- **Terrain teeth through the carriageway.** Brush-based flattening (`strength 3`, skip-if-within-4 cm) does not
  converge on a slope; the symptom is a green rectangle sitting on the asphalt beside an intersection and a hairline
  of grass along one lane edge. Write the corridor heights exactly, then verify every row.
- **Grass through the asphalt.** `coverage`/`isRoad` published but stale after a rebuild, or `terrain` not
  re-scattering; symptom is tufts standing in the middle of the road at street level, glowing green at night.
- **Bald discs and sheer disc cuts.** An earlier coverage mask marked a *disc* around each node, so grass vanished in
  a circle far outside the pavement and the flatten brush sliced a round shelf into a hillside. The mask and the cut
  must be the real paved polygon.
- **Floating deck ends and black cliff embankments.** The far end of a bridge hovering over the beach with a visible
  air gap; the coast highway ending in a dark void under the deck. Also: on-land "bridges" appearing wherever fill
  exceeded a threshold, producing black parapet tents across ordinary streets.
- **Washed-out noon.** `p1 ≥ 97`, `std ≤ 24`, sidewalks near white because concrete albedo was multiplied by 1.75.
  Fix in albedo and baked AO — never by asking for more exposure, and never by darkening everything until the frame
  is muddy. The opposite failure is now live risk: r2's asphalt reads almost black in `street_12`; CS2 asphalt is a
  warm mid-grey (item 4).
- **White speckle across the asphalt at mid distance.** In r1 it looked like specular aliasing; it was actually a
  packed-integer vertex attribute used as a **smooth** varying, scrambling flags between rows wherever the
  acceleration-lane width changed. Packed flags must be `flat`. Genuine specular aliasing exists too — clamp
  roughness, fade normal strength with distance, box-filter dash coverage.
- **The square roundabout.** A one-way loop of four T-junctions carrying zebras, stop lines and turn arrows on the
  ring, with an octagonal silhouette from the air.
- **Corner fillet over the crosswalk.** The corner sidewalk polygon covering part of the zebra ladder; and sidewalk
  slabs reading as floating grey plates where the ground falls away.
- **Pier caps wider than the deck**, and near-black deck undersides/piers dominating the water reflection as dark
  speckle in every aerial.
- **Asphalt tiling** as a repeating crack grid at the texture repeat period, visible top-down and at aerial distance
  even after a two-scale blend.
- **Hooked "L" turn arrows** — thin polyline shafts with no head.
- **Vertical faces reading near-black at noon** (deck sides, piers, abutments, parapet outer faces) because the scene
  has almost no sky ambient by day. Roads cannot add light: raise those faces' albedo, add a light bounce term in the
  material, and check them at 12:00 as well as 17:30.
- **Non-idempotent rebuild.** Re-running `rebuild()` after its own terrain flattening changed the triangle count
  (45 922 → 45 524) because heights were re-sampled from the already-cut terrain. Design heights are captured when
  the edge is drawn and only re-sampled on a foreign `terrain:changed`.
- **Rebuild feedback loop.** Roads' own cut/fill emits `terrain:changed`; without the `flattening` guard the module
  rebuilds every frame and the frame time collapses.
- **Boot-overlay captures.** Re-shoot anything whose PNG shows the SIMBUILD loading screen, or whose JSON has
  `fps: 0` with `measuredFrames: 1` *and* a loading frame — a boot-overlay capture is not evidence for any item on
  the list. The SwiftShader mechanics behind it (timeouts, `--timeout`, batching) are BUILDER.md's; they are not
  restated here.

## 7. Dependencies and their real APIs

`dependencies: ['terrain']` (init order only — roads must init and render if terrain is missing).

**`world.terrain`** (installed by the terrain module; every one of these is live today):
```js
world.terrain.getHeight(x, z) -> m           // bilinear, clamped outside bounds
world.terrain.getNormal(x, z, out?) -> Vector3 ; getSlope(x, z) -> rad ; isWater(x, z) -> bool
world.terrain.raycast(ray) -> {point, normal} | null
world.terrain.modify({x, z, radius, strength, mode}) -> bool   // bumps version, emits terrain:changed
world.terrain.heights: Float32Array          // resolution² row-major [z][x]; resolution 513, cellSize 4
world.terrain.minHeight / maxHeight / seaLevel / version
world.terrain.features.river.zAt(x) -> z ; .river.halfWidthAt(x) -> m ; .coast.xAt(z) -> x ; .island
// PREFERRED WHEN PRESENT (terrain round 3+, feature-detect, do not assume):
world.terrain.writeHeights(ix0, iz0, ix1, iz1)
world.terrain.flattenStrip(pts, {drop, grade, halfWidth, blend}) -> {ix0,iz0,ix1,iz1}
```
**`ctx.modules.terrain`** (guard every call with `?.`): `data()`, `stats()`, `setReflection(bool)`,
`setGrassTufts(bool)`, `material()`, `debug{…}`.
**Degrade:** if `world.terrain.getHeight` is missing, treat the ground as the plane `y = 0`, skip all cut/fill, still
build every mesh and still publish the full `world.roads` API; `log.warn` once. Never throw in `init`.

**`environment`** (`ctx.modules.environment`, always present in a showcase, still guard with `?.`):
```js
setupMaterial(material)   // hook into CSM + fog uniforms — call it for every material roads owns
hookScene() ; getSunDirection() ; getMoonDirection() ; getLightDirection() ; getExposure() ; getNight()
```
Read per frame from `world.weather`: `sunDir, sunIntensity, skyLight, lightDir, lightIntensity, exposure, night,
wetness, rain, cloudiness, fogDensity, wind`. **Degrade:** plain `MeshStandardMaterial` behaviour, `wetness = 0`.

**Core** (`src/core/`, exact signatures):
```js
ctx.assets.pbr(name, {repeat}) -> Promise<{map, normalMap, roughnessMap, aoMap, displacementMap, metalnessMap, armMap, entry}>
                                  // every field may be null; resolves even on failure with a procedural fallback
ctx.assets.applyPbr(material, set, {normalScale, aoIntensity, displacementScale})
ctx.assets.procedural.noiseTexture(opts) ; ctx.assets.procedural.gradient({size, stops, horizontal, srgb})
ctx.assets.anisotropy
ctx.camera.registerPreset(name, preset) ; .apply(preset) ; .camera / .target / .distance
                                  // preset = {position:[x,y,z], target:[x,y,z]} or {yaw, pitch, distance, target}
ctx.rng.float() / .int(a,b) / .range(a,b) / .pick(arr) / .weighted([[v,w]…]) / .gauss() / .shuffle(a) / .fork(label)
ctx.events.on(name, fn, ownerTag) / .emit(name, payload)
ctx.engine.stats                  // {fps, frameMs, drawCalls, triangles, programs, textures, geometries, moduleMs}
constants: WORLD_SIZE 2048, HALF_WORLD 1024, SEA_LEVEL 0, TILE_SIZE 128,
           LAYERS.ROADS 2, RENDER_ORDER.ROADS 20, RENDER_ORDER.MARKINGS 21, QUALITY[q].anisotropy
ctx.quality ∈ 'low'|'medium'|'high'|'ultra' ; ctx.headless ; ctx.log.info/warn/error
```
Decals and markings use `RENDER_ORDER.MARKINGS` with `polygonOffset`; roads meshes set `castShadow` and
`receiveShadow` and sit on `LAYERS.ROADS`. `Math.random`, `Date.now()` in logic, and writing any `world` section other
than `world.roads` (plus the corridor heights) are forbidden.

**Consumers to not break:** `terrain` reads `coverage`/`isRoad`; `zoning` will read `frontage`; `traffic` will read
`sample`/`laneCenter`/`intersections`; `props` will read `lampPositions`/`intersections`; `democity` builds through
`addNode`/`addEdge`/`types`.

## 8. Showcase

`showcase.description`: one sentence naming the road features in frame.

**Staged scene** — everything derived from `world.terrain` so it follows the seed; nothing hard-coded that drifts if
the heightfield changes. `setup(ctx)` must produce:

1. A 5 × 4 **street grid** with an `avenue` running east–west through it and a signalised 4-way crossroads at
   (40, 40) with ladder crosswalks, stop lines and per-lane arrows on all four approaches.
2. Two `alley` links through blocks, and one gently curved (`ctrl`) residential street.
3. A **gravel** spur of ≥ 120 m leaving the grid into open ground, ending in a dead-end cap.
4. A true-circle **roundabout** (radius 26–30 m) west of the grid with four radial entries, give-way markings and a
   finished central island.
5. A dual-carriageway **highway** S-curve with median barrier, guardrails, hard shoulders, and a `ramp` on-ramp with
   an acceleration-lane taper and gore hatching.
6. A **grade separation** where the highway crosses over the avenue (item 9).
7. A **street bridge** over the river with abutments, wing walls, piers and parapets, plus its embankment approaches.
8. One street climbing a hillside steep enough to require a **retaining wall** (cut or fill > 3 m).
9. **The highway's western end.** The r1/r2 `coastwest` camera is gone from the preset list, so the coast transition
   that produced r1 blocker 3 ("dark void under the deck", black cliff embankment) now has no dedicated frame. It
   does not therefore stop being graded: the highway's west end **terminates on land, ≥ 40 m east of
   `world.terrain.features.coast.xAt(z)`**, with a modelled dead-end cap, a graded verge and no deck over the beach.
   Item 8 probes it as a terminus and the report carries one named crop of it cut from `aerial_12`
   (`aerial_12_COASTEND.png`).
10. Never call `setWeather`, never move the clock (the showcase router owns `?time=`), never add anything that is not
    road, kerb, sidewalk, verge, barrier, bridge or retaining wall.

**Declared `showcase.cameras`** — exactly these nine, no more (each costs the critic ~2 minutes of SwiftShader):

| Preset | Frames | Must show |
|---|---|---|
| `intersection` | The (40, 40) crossroads from ~45 m, 30° | Ladder crosswalks clear of the fillets, stop lines, per-lane arrows, kerb faces, dropped kerbs, gutter grime |
| `kerb` | 8–15 m from a kerb line, near-grazing | Kerb face height and shadow, slab joints, verge, contact darkening, gutter |
| `armtop` | Top-down over one avenue arm, ~40 m | Marking geometry (item 6), patchwork, manholes, seams, absence of tiling |
| `roundabout` | Aerial-oblique over the ring | Circular silhouette, apron, island, give-way teeth, no zebra/arrows on the ring |
| `highway` | Along the highway from ~40 m up | Median barrier, guardrails, shoulders, edge lines, no sparkle at mid distance |
| `merge` | The ramp nose | Gore hatching, nose triangle, taper, guardrail transition |
| `bridge` | Across the river, deck three-quarter | Abutments landing, wing walls, piers, parapet/railing, lit soffit |
| `overpass` | Under/beside the highway–avenue crossing | ≥ 5 m clearance, pier placement, deck soffit, no z-fighting |
| `hillcut` | The hillside street | Graded cut/fill slopes, retaining wall with coping, verge marching to the ground |

Register each with `ctx.camera.registerPreset(name, {position, target})` computed from real node positions.

**How each standard camera must read** (critic shoots `aerial, street, skyline, closeup` × `06.5, 12, 17.5, 22`,
noon and night by default plus golden hour; all nine presets at 12, with `intersection`, `bridge`, `roundabout`,
`highway` and `overpass` also at 22 — `overpass` is at 22 because item 9 grades z-fighting at `overpass_22`):

- **aerial (520 m, pitch 0.85)** — the network as infrastructure: hierarchy readable (item 13), sidewalk bands
  visible, roundabout circular, bridge and overpass legible, no rectangular terrain scars, no marking crawl.
  06.5/17.5: long shadows across the carriageway from parapets, barriers and retaining walls. 22: dark ribbons with
  paint still visible.
- **street (60 m, pitch 0.18)** — this is where CS2 is won: kerb face, sidewalk slabs, verge, gutter grime, surface
  patchwork and manholes in the near half; markings converging cleanly to the vanishing point with no shimmer.
- **skyline (900 m, pitch 0.16)** — roads as thin ribbons; the test is that they stay coherent — no sparkle, no
  disappearing edges, no aliasing crawl, the highway still distinguishable from the avenue.
- **closeup (110 m, pitch 0.35)** — intersection geometry and material identity: fillets the right size, crosswalks
  clear, asphalt vs concrete vs gravel obviously different materials, contact darkening everywhere.

**The capture manifest.** This is the closed set every acceptance item resolves against: item 21 grades it as a
whole, and no item may name a shot that is not in it. **38 captures**, all under `shots/roads/r<n>/`:

| # | Group | Shots | Count |
|---|---|---|---|
| A | Gauntlet standard | `aerial, street, skyline, closeup` × `6p5, 12, 17p5, 22` → `<cam>_<t>.png` | 16 |
| B | Presets at 12 | `intersection, kerb, armtop, roundabout, highway, merge, bridge, overpass, hillcut` → `<preset>_12.png` | 9 |
| C | Presets at 22 | `intersection, bridge, roundabout, highway, overpass` → `<preset>_22.png` | 5 |
| D | Rain session (item 15) | `street` camera, one page session per hour: `rain_dry_17p5.png`, `rain_wet_17p5.png`, `rain_dry2_17p5.png`, and the same three at `_22` | 6 |
| E | Cross-module | `?showcase=all --camera aerial --time 12` → `all_aerial_12.png` (item 21) | 1 |
| F | 720p | `aerial` at 12, `--w 1280 --h 720` → `aerial_12_720p.png` (item 24) | 1 |

Every named crop (§4 conventions) is saved beside the shot it came from as `<shot>_<CROPNAME>.png` and is *not*
counted in the 38. Groups A, B, C and F come from `tools/gauntlet.mjs` / `tools/screenshot.mjs` and keep the
gauntlet's `.` → `p` naming; groups D and E are driven by the probe script and named exactly as above.
