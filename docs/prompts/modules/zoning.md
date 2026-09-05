# Module spec: `zoning`

Round contract for `src/modules/zoning/`. Role rules live in `docs/prompts/BUILDER.md` and `docs/prompts/CRITIC.md`
and are not repeated here. Everything below is specific to zoning.

---

## 1. Purpose

Without `zoning` a road network is just asphalt: nothing converts road frontage into buildable land, `buildings` has
no lots to grow on, `simulation` has no demand sink, and the player has no way to say what a block is *for* — the
coloured paint layer that turns CS2 from a road editor into a city builder is missing.

## 2. World data owned

`world.zones`, copied from ARCHITECTURE §3. Mutate in place; never replace the section.

```js
  zones: {                           // owner: zoning
    cellSize: 8,                     // metres; grid aligned to world
    cells: Map<key, {x, z, type, density, edgeId, side, depth}>, // key = `${ix},${iz}`
    types: ['residential','commercial','industrial','office'],
    densities: ['low','high'],
    lots: Map<id, {id, edgeId, side, cells:[key], x, z, w, d, heading, type, density, buildingId?}>,
    version: 0,
    paint(x,z,radius,type,density), erase(x,z,radius),
    lotsFor(edgeId) -> [lot], freeLots() -> [lot],
  },
```

Cell indexing is fixed: `ix = floor((x + 1024) / 8)`, `iz = floor((z + 1024) / 8)`, `key = ix + ',' + iz`, cell centre
`ctr(i) = i*8 - 1024 + 4`. `ix, iz ∈ [0, 255]`. The grid is **world-aligned** — §3 fixes this; a road-aligned cell
lattice is out of scope and must not be substituted (the road-parallel *reading* is achieved in the overlay, §4.7).

Additional fields the module must also install on `world.zones` (already relied on by `buildings` and by probes):

```js
    cellAt(x,z) -> cell | null,
    lotAt(x,z) -> lot | null,                 // point-in-lot in the lot's own frame
    zonableAt(x,z) -> {edgeId, side, depth, lat, t, ix, iz} | null,
    maxDepth: 4,                              // cells; the deepest a lot may reach from a frontage
```

Lot records must additionally carry `y` (terrain height at `x,z`), `nx, nz` (unit vector from road into the lot),
`ax, az` (unit vector along the frontage), `corner:boolean`, `t` (parametric position of the lot mid-point on its
edge). `heading` is the direction a building on the lot faces, i.e. **toward the road**, `0 = north = −Z`, increasing
clockwise seen from above: `heading = atan2(-nx, nz)`. `w` is the frontage width in metres, `d` the depth in metres.
`buildings.spawn(lot)` reads `id, type, density, w, d, x, y, z, heading` and writes back `lot.buildingId` — a rebuild
must never orphan that link (§4.15).

**Module api** (`ctx.modules.zoning`, also reachable as `__sim.registry.get('zoning').def.api`). This is the
required surface — `tools.md` and `infoviews.md` already call it by name, so nothing here may be renamed or dropped:

```js
    paint(x,z,radius,type,density) -> cellsChanged    erase(x,z,radius) -> cellsChanged
    bulk(fn({circle, rect, erase})) -> cellsChanged   // every multi-cell stroke goes through this:
                                                     // one lot regeneration, one zones:changed per call
    cellAt(x,z) -> cell | null                        lotAt(x,z) -> lot | null
    zonableAt(x,z) -> {edgeId, side, depth, lat, t, ix, iz} | null
    lotsFor(edgeId) -> [lot]                          freeLots() -> [lot]
    setOverlayVisible(v)                              overlayVisible() -> bool
    refresh()                                         // rebuild band + lots + overlay after external edits
    stats() -> {cells, zonable, lots, per:{residential,commercial,industrial,office},
                overlay:{cells,lots,tris,draws,ms}}
    probePoints() -> [{type, density, x, z}]          // 8 class-representative block centres — §4.1–4.3
    frontEdge(edgeId, side) -> [{x, z}]               // ordered vertices of the overlay's road-facing edge, ≤ 2 m
                                                      //   apart — the instrument for §4.7 and §4.8
    cropRects({project, width, height, camera})       // pinned landmark rects — §4.18, §4.19
      -> {emptyBand, bareGround, nearBlock, farBlock} //   each [x, y, w, h] in pixels
    serialize() -> {cells:[…]}                        deserialize(data)
```

`bulk`, `cellAt`, `lotAt`, `zonableAt`, `setOverlayVisible`, `refresh` and `stats` already exist in
`src/modules/zoning/index.js` and are enumerated as zoning's contract by `tools.md` §7. `probePoints`, `frontEdge`
and `cropRects` are new in this round. There is deliberately **no** `setBrushPreview`: the brush cursor is `tools`'
(§4.17).

`cropRects` is read by `node tools/screenshot.mjs … --crops`, which writes `<out>.crops.json`
(`{png, width, height, camera, time, rects:{"zoning.<name>":[x,y,w,h]}}`) from `window.__sim.cropRects()` —
ARCHITECTURE §8, and the **authoritative** producer of `crops.json`; `window.__sim.project(x,y,z)` maps a world
point to pixels. `gauntlet.mjs` does not pass `--crops`, so the frames items 18 and 19 measure in are captured by
direct `screenshot.mjs` calls (§4's capture table). The four landmarks, all in pixels of the **full-resolution**
capture: `emptyBand` = 120×120 px centred on an unpainted zonable block (§8.8); `bareGround` = 120×120 px on
unzonable ground ≥ 24 m outside the band; `nearBlock` / `farBlock` = 100×100 px on painted blocks whose distance
from the `zoneswide` camera is 150 ± 30 m and 600 ± 60 m. Return only the landmarks that are on screen for the
camera passed in.

**Zone palette — owned here, quoted elsewhere.** The eight sRGB hexes in `src/modules/zoning/palette.js` are a
cross-module contract:

```js
    residential: { low: 0x5fd634, high: 0x0d8f3c }    commercial: { low: 0x2fb6f5, high: 0x1140c9 }
    industrial:  { low: 0xf7b515, high: 0xd05310 }    office:     { low: 0xc65ff5, high: 0x6a1cb8 }
```

These values are quoted by `tools.md` item 10, which grades its zone-brush cursor against them; changing one is a
core request (`docs/core-requests/zoning.md`), not a local decision. Item 2's pairwise-separation floor is a
*minimum these hexes already satisfy at item 1's alpha floor* (the derivation is in item 2) — it does not license a
re-hue.

**Events emitted** (ARCHITECTURE §5), after the mutation completes and after `zones.version++`:

| Event | Payload |
|---|---|
| `zones:changed` | `{cells:[key], lots:{added:[id], removed:[id]}}` |

Exactly one `zones:changed` per `paint`/`erase`/`bulk` call, never one per cell.

**Events consumed**: `roads:changed` (rebuild zonable band + lots), `terrain:changed` (invalidate validity cache,
rebuild), `zones:changed` (rebuild overlay geometry), `buildings:changed` (refresh lot-occupancy shading),
`tool:changed` (show/hide the overlay when the payload's `tool` matches `/zone|zoning|district/i` or
`options.zone`/`options.zoning` is truthy). Bursts must coalesce: at most one band rebuild per 60 ms of edits.

## 3. Visual / behavioural target

**Anchor image: `$REF/cs2_1.jpg`**, right-hand third — an office block under the violet zone overlay while the road
tool is open. Read what CS2 actually does there:

- The zone colour is a **translucent tint over the world, not a paint bucket**. The building's window grid and its
  roof plant are still legible *through* the violet; the overlay changes hue and lifts value, it does not replace
  texture. Be honest about what the anchor shows: most of that violet block is building facade. The only ground it
  covers is the tinted strip at the **bottom-left of the violet block**, where the grass still reads through — so
  item 1's ground-legibility requirement **extrapolates** cs2_1's facade treatment onto ground cells, using that
  strip as the one place in the anchor where the treatment is visible on ground. Our current build
  (`shots/zoning/dev_zones_12.png`) fails it either way: the blocks are near-opaque pastel slabs and the ground
  under them is gone.
- The **cell lattice is visible as thin lines**, one shade lighter than the fill, at roughly one line per 8 m — a
  grid you could count, not a texture.
- The zoned area's **outer boundary is a crisp bright line** with a soft inner falloff, and it follows the shape of
  the block, including the diagonal cut across the top-right building.
- The saturation is high (that violet is a real violet, not a wash) but the value under it still varies with the
  ground: sunlit grass under the overlay stays brighter than shaded grass under the overlay.
- Compare `$REF/cs2_7.jpg` (industrial info view): that is a *flat* recolour where everything goes one yellow, all
  ground texture destroyed. **That is what zoning must NOT look like** — that treatment belongs to `infoviews`.

**Anchor image: `$REF/cs2_4.jpg`** for what the lots must agree with — a suburban street where every house sits on a
rectangle of the same width, front edge a fixed setback from the kerb, driveway to the road, deep back garden, hedges
on the lot lines, and the corner plot wraps the junction. Our lot rows must be that regular: equal widths in a run,
one consistent setback, backs meeting the backs of the opposite frontage, corners filled instead of notched.

Reading at each camera:

- **`zoneswide` (660 m)** — the district reads as a CS2 land-use map: four hue families, high vs low density
  separable, roads as dark gaps, unzoned buildable land as a faint white lattice, the far edge hazing into the same
  fog as the terrain.
- **`zones` (300 m)** — individual lots readable as a row of equal rectangles along every frontage; region outlines
  pulse; the empty zonable band frames each zoned area.
- **`zonesclose` (140 m)** — the 8 m cell grid, the 45° high-density hatch, the setback gap between overlay and kerb,
  and the corner-lot wrap are all separately identifiable.
- **`zoneslope` (180 m)** — the overlay stops where the ground gets too steep and where it meets water, with a ragged
  organic boundary, not a rectangle.
- **22:00** — the overlay is dimmer, still saturated, and is not the brightest thing in the frame. It reads like a
  lit HUD layer over a dark city, not like glowing paint.

## 4. Acceptance criteria

The critic grades against this list.

**Evidence set (this module's, stated once).** Run exactly:

```
node tools/gauntlet.mjs --module zoning --round <N> \
  --cameras aerial,street,skyline,closeup,zones,zonesclose,zoneswide,zoneslope --times 6.5,12,17.5,22
```

8 cameras × 4 times = **32 frames**, written to `shots/zoning/r<N>/<camera>_<time with . → p>.png` plus
`summary.json`. **This overrides `CRITIC.md`'s default matrix (`--times 12,22` over four cameras) for zoning** — the
override is deliberate, not an oversight: items 4, 6, 13 and the §8 reading notes need 06.5 and 17.5, and
`zoneslope_17p5.png` exists only under this invocation. Budget roughly 30–170 s per capture under SwiftShader.

`P` below means a page-evaluate probe against
`http://127.0.0.1:5173/?showcase=zoning&headless=1&time=<h>`; the module api is reachable as
`__sim.registry.get('zoning').def.api` and its stats as `api.stats()` →
`{cells, zonable, lots, per:{residential,commercial,industrial,office}, overlay:{cells,lots,tris,draws,ms}}`. A `P`
session is a Playwright page, so it can also take the frame it just set up (`page.screenshot()` at 1920×1080 unless
the row says otherwise); frames captured that way are marked *(in-session)* below and are **not** products of
`gauntlet.mjs`.

**Every capture outside the 32-frame matrix**, so nothing is discovered mid-grade. Roughly a dozen extra frames at
the same 30–170 s each — 5 to 30 minutes on top of the matrix; budget it.

| Capture | How | Serves |
|---|---|---|
| overlay-off + overlay-on pair, `zones`/12 | session A: `api.setOverlayVisible(false)`, shoot, `(true)`, shoot *(in-session)* | 1, 2, 4 |
| overlay-off + overlay-on pair, `zones`/22 | session B, same method at `&time=22` *(in-session)* | 4 |
| overlay-off + overlay-on pair, `zoneswide`/12 | session C, same method *(in-session)* | 3 (aliasing clause) |
| pulse-trough + pulse-peak pair, `zones`/12 | session D: drive `uTime` to each extreme, shoot *(in-session)*. Not needed if 6(a) is used | 6(b) |
| two frames 0.5 s apart, `zoneslope`/12, camera static, `speed=1` | session E *(in-session)* | 9 (flicker) |
| two frames 0.5 s apart at 1280×720, `zones`/12 | session F, viewport 1280×720 *(in-session)*; its first frame is also the 720p still | 23 |
| `crops_zones_12.png` + `.crops.json` | `node tools/screenshot.mjs --showcase zoning --camera zones --time 12 --crops --out shots/zoning/r<N>/crops_zones_12.png` | 18 |
| `crops_zoneswide_12.png` + `.crops.json` | same with `--camera zoneswide` | 19 |
| `?showcase=all&time=12` → `shots/zoning/r<N>/all12.json` | `screenshot.mjs --showcase all --time 12` | 16 |
| the two degradation URLs | `screenshot.mjs` on each URL of item 22 | 22, 24 |

**Pinned statistics are taken on the full-resolution PNG** (1920×1080, or 1280×720 for the item-23 pair), never on a
downscaled copy: at 480 px wide a 1 m calibration patch is about two pixels.

**Where items 1–3 measure.** All three sample at `api.probePoints()` — the eight class-representative block centres
the showcase stages, one per (type × density), returned as world coordinates and projected to pixels with
`window.__sim.project(x, y, z)` in the session that captured the frame being graded. Builder and critic
therefore measure the same pixels; "the centre of a zoned block" is not a location, and §8 stages roughly twenty
painted blocks over ground ranging from flat grid to hillside to waterfront, so the choice would otherwise move
item 1's ratio and item 2's 28 distances by more than
their thresholds. The builder lists the eight points in `docs/builds/zoning_r<round>.json`. All eight must sit on
flat inland ground, ≥ 24 m from any water or slope exclusion boundary, so item 1's luminance-std ratio is measuring
the overlay and not terrain shading.

1. **Translucency — the ground survives the overlay.** Session A's two frames, sampling the same 200×200 px crop
   centred on each of `api.probePoints()` projected with `__sim.project`: at every one of the eight points, the
   crop's luminance standard deviation with the overlay on is **≥ 45 %** of its value with the overlay off, and the
   mean luminance rises by **≤ 55 units** (0–255). Fill alpha must sit in **0.50–0.54**, and both ends of that range
   are forced: a flat tint at alpha `a` composites to `a·C + (1−a)·ground`, so the std ratio this item measures *is*
   `1 − a` — 0.54 is the highest alpha that still clears the 45 % floor (1 − 0.54 = 0.46), and 0.50 is the lowest
   that lets item 2 clear its floor (derivation there). `P` + two screenshots.
2. **Eight separable classes.** Mean sRGB of a 40×40 px patch at each of `api.probePoints()` projected into session
   A's overlay-on frame, sampled **between hatch lines** so item 3's darkening cannot eat this margin: all 28 pairs
   among the 8 (type × density) classes are separated by Euclidean RGB distance **≥ 40** (0–255), and the four type
   families remain identifiable by hue family (green / blue-cyan / orange-amber / violet) at `zoneswide_12.png`. The
   palette that produces this is fixed in §2 and may not be re-hued to widen the margin — so the floor has to be one
   the palette reaches. It is: alpha compositing scales every pair distance by the fill alpha, the closest raw pair
   is commercial-high `0x1140c9` vs office-high `0x6a1cb8` at Euclidean distance **97.5**, and 97.5 × 0.50 (item 1's
   alpha floor) = **48.7** before tone mapping. The 40 floor is that 48.7 with headroom for AgX compressing
   saturated hues. Second-closest pair, for margin: industrial low↔high, 105.6 raw → 52.8 at alpha 0.50.
3. **Density is legible by pattern, not only by value.** High density carries a 45° world-space hatch of period
   **3.0 m ± 0.2 m** darkening the fill by **14–22 %**; the hatch is resolvable (≥ 4 px period) in the four
   high-density `probePoints()` crops of `zonesclose_12.png` and `zones_12.png`, and does not alias into per-pixel
   static at `zoneswide_12.png` (no 100×100 px crop centred on a `probePoints()` projection in that frame has
   luminance std > 1.6 × the std of the same crop in session C's overlay-off frame).
4. **Night is night.** Overlay luminance is multiplied by `mix(1.0, 0.42, world.weather.night)` (fall back to
   `1 - clamp((ctx.clock.sunElevation() + 0.13) / 0.15, 0, 1)` if `weather.night` is absent). State the method,
   because "overlay luminance" in a composited frame is otherwise two quantities with opposite verdicts: from
   sessions A and B, **overlay luminance at a probe point is the mean of (overlay-on − overlay-off) over that
   point's 200×200 px crop**. Require L22/L12 ∈ **0.35–0.55** at every one of the eight points. Separately, and read
   on the composited frame as written: `zones_22.png`'s whole-frame p99 is **≤ 200/255**, and no overlay pixel is
   the brightest pixel in that frame.
5. **Cell lattice present and screen-space stable.** The 8 m cell borders are drawn as lines whose on-screen width is
   clamped to **1.0–2.5 px** across the **60–660 m** camera range; region outlines are clamped to **1.5–4.0 px** over
   the same range. Width is read on the full-resolution PNG as the full-width-at-half-maximum of the luminance ridge
   across a lattice line. Verified at the near end in `street_12.png` (60 m) and `closeup_12.png` (110 m), at
   `zonesclose_12.png` (140 m — must not be fat slabs), and at `zoneswide_12.png` (660 m — must not vanish).
6. **Region outline reads in a still and animates.** Every boundary between two different (type, density) regions and
   every boundary against unzoned land carries a bright outline whose peak luminance exceeds the adjacent fill by
   **≥ 35 %**, with a soft 2–3 m inner falloff — measured in `zones_12.png` at the region boundary staged by §8.8.
   *Animation runs* (`P`): read the shared `uTime` uniform twice 1.0 s apart with `speed=1`; it must have advanced by
   **0.8–1.2**. *Amplitude* — the gauntlet stills are captured with the clock parked at a fixed hour, so amplitude
   can never be read from one of them. Two ways, either sufficient: (a) `P` reads the outline material's amplitude
   uniform, which the module must expose as `uPulseAmp`, and requires **0.20–0.31**; or (b) session D drives `uTime`
   to the pulse trough and to the pulse peak, capturing one frame at each, and require the outline's measured peak luminance
   ratio peak:trough to fall in **1.25–1.45** (the same 20–31 % modulation). Anything below 1.25 is a static outline;
   above 1.45 it strobes.
7. **Road-parallel front edge.** A metre tolerance needs a metre instrument, not a PNG: `P` over
   `api.frontEdge(edgeId, side)` for the curved street and the diagonal street of the showcase. For each returned
   vertex take `r = world.roads.nearestEdge(v.x, v.z, 60)`; every vertex of one frontage run must satisfy
   `|r.dist − median(r.dist over that run)| ≤ 1.5 m` — no 8 m staircase steps. (The cell data stays world-aligned;
   the overlay draws this edge from `roads.frontage`/`roads.sample` geometry.) Visual record only:
   `zonesclose_12.png`, crop over the curved street.
8. **Setback gap to the kerb.** `P` over `api.frontEdge(edgeId, side)` for every staged edge. With
   `r = world.roads.nearestEdge(v.x, v.z, 60)` and `T = world.roads.types[r.edge.type]`, the clearance
   `r.dist − (T.asphaltHalf + (T.sidewalk ?? 0))` is **0.5–2.0 m** at every vertex on every road type, and
   `world.roads.isRoad(v.x, v.z) === 0` at every vertex — that is the checkable form of "no overlay colour falls on
   asphalt, kerb or sidewalk". Visual record only: lane markings and crosswalk bars fully unobscured in
   `closeup_12.png` and `street_12.png`.
9. **No z-fighting, no floating.** Overlay is lifted **0.16 m** (cells) / **0.26 m** (lot lines) above
   `terrain.getHeight` at 4 m tessellation (2×2 quads per cell) with `polygonOffset` on and `depthWrite:false`.
   Stipple and flicker are different artifacts and are graded differently:
   - **Stipple** (spatial, readable in a still): in every one of the 32 gauntlet frames, no 100×100 px crop lying
     wholly inside one zoned block contains **≥ 2 %** of pixels whose luminance differs from *both* horizontal
     neighbours by **≥ 30/255**.
   - **Flicker** (temporal, not readable in a still — this is the **two-capture diff**): session E at
     `zoneslope`/12 with the camera static and `speed=1`, two frames **0.5 s** apart. Over the zoned blocks,
     with pixels within 3 px of a region boundary masked out (item 6's pulse is legitimate motion), the per-pixel
     **max |Δluminance| ≤ 12/255** and the **mean |Δluminance| ≤ 2/255**.

   The overlay never detaches from a slope. Because the overlay is (by this item's own construction) a
   piecewise-linear surface through `terrain.getHeight` at the 4 m tessellation nodes, the gap is a terrain-curvature
   quantity and needs no geometry accessor: `P` over every cell in `world.zones.cells` — for each of the cell's four
   4 m quads, `|getHeight(quad centre) − the bilinear interpolation of getHeight at that quad's four corners|` must
   be **≤ 0.3 m**. Any cell that exceeds it must be tessellated finer than 4 m. Visual record: `zoneslope_12.png`.
10. **Lots exist, in rows, everywhere they should.** `P`: `api.stats()` in the showcase reports
    **`cells` ≥ 1500** and **`lots` ≥ 120**; **≥ 70 %** of zoned cells are claimed by a lot (`api.stats()` plus
    `world.zones.lots`), and every lot has `2 ≤ w/8 ≤ 5` slots and `d ∈ {16, 24, 32}` m before corner extension.
    Within one contiguous run of the same class on one frontage, lot widths differ by **≤ 8 m**. Visible as equal
    rectangles in `zones_12.png`.
11. **Lot dimensions per class.** Preferred frontage × depth in metres: residential low 16×24, residential high
    24×24, commercial low 16×24, commercial high 24×24, industrial low 24×32, industrial high 32×32, office low
    24×24, office high 32×32. A corner lot (`lot.corner === true`) may exceed its preferred frontage by **one 8 m
    slot** — `w` up to +8 m, `d` unchanged; every other lot matches exactly. `P` over `world.zones.lots`.
12. **Corner lots fit.** At every junction where two zoned frontages meet, the end lot of each run claims the corner
    cells of its own frontage band (`lot.corner === true`), growing by **one 8 m slot** — `w` increases by ≤ 8 m,
    `d` is unchanged — so the block corner is covered. The rule is stated in the same units as its check on purpose:
    lot membership is quantised to the 8 m grid (`lot.cells` is a list of cell keys), so a sub-cell geometric
    extension claims no additional cells and could not move the number below. The showcase stages **N** such
    junctions; the builder states N and their node ids in `docs/builds/zoning_r<round>.json`, and the critic grades
    that list (there is no fixed count in this spec — §8's staging determines it). Mechanically, `P` over
    `world.zones.cells`: **no notch of unclaimed zoned cells larger than 2 cells** exists within **12 m** of any of
    those N nodes. Visual record: `zonesclose_12.png`.
13. **Slope and water are respected, organically.** No cell exists where `terrain.isWater` is true at the centre or
    any of the 4 corners, where `terrain.getSlope > 0.42 rad`, or where the height range across the cell exceeds
    **6.5 m** — `P`, assert over all of `world.zones.cells`. "Ragged, follows the contour, not a rectangle" is
    graded by a count, not by eye: `P` walks the ordered boundary cell run of the zoned area and counts **direction
    changes** (an axis flip between consecutive boundary steps). The two runs are not left to whoever is arguing:
    the build record names the **first and last cell key** of the river-frontage run and of the hillside run (§8),
    and the critic walks exactly those two sub-runs of the boundary loop and no others. The river-frontage run must
    contain **≥ 12** direction changes; the hillside run, **≥ 8**. A rectangular boundary scores 4. Visual record:
    `zoneslope_12.png` and `zoneslope_17p5.png`.
14. **Highways and ramps carry no frontage.** Zero lots and zero zonable cells reference an edge of type `highway`
    or `ramp`. The showcase contains at least one highway edge to prove it. `P`.
15. **Lot identity is stable.** Adding an unrelated road edge elsewhere and forcing `api.refresh()` leaves every
    pre-existing lot's `id` and `buildingId` unchanged when its road side and its front cell are unchanged; the
    `zones:changed` payload's `lots.added`/`lots.removed` contain only the genuinely new/gone ids. `P`.
16. **Overlay is off by default outside the zoning tool.** In `?showcase=all&time=12` with no zoning tool active,
    the **group-toggle diff** (`P`, one page session: read `__sim.stats().drawCalls`, set
    `__sim.registry.get('zoning').group.visible = false`, render 5 frames, read again) returns a difference of
    **0** draw calls and **0** triangles — zoning is contributing nothing to the frame. `shots/zoning/r<N>/all12.json`
    is the evidence for the *other* half only: zoning's `moduleStatus` is `ready` and the frame logs zero console
    errors. (`all12.json`'s `drawCalls` is the whole scene's and proves nothing about zoning — do not cite it for
    the 0.) Then, in the same session, after `events.emit('tool:changed', {tool:'zone'})` the overlay fades in and
    after `{tool:'road'}` it fades out to invisible. The fade is sampled, not eyeballed: `P` reads the overlay
    material's opacity uniform every 50 ms for 0.4 s after each emit, and the 10 % → 90 % crossing must fall in
    **0.15–0.25 s**.
17. **(withdrawn — the brush cursor belongs to `tools`.)** `tools.md` item 10 already grades the zone-brush preview
    in `tools`' own `zonetool_12.png`, and `tools.md`'s draw-call table already allocates the ground decal batch
    (footprint / zone brush / marquee / coverage ring) inside `tools`' own 12 calls. Two owners for one cursor is a
    round-costing conflict, and this spec is not the place to resolve it unilaterally: zoning renders **no** brush
    cursor this round and exposes no `setBrushPreview`. Zoning's whole contribution to the cursor is
    `world.zones.zonableAt(x,z)` (§2), which `tools.md` §7 already names as the test for which cells the preview may
    fill.
18. **Empty zonable band is visible.** Buildable-but-unpainted land renders as a faint neutral lattice (fill alpha
    **0.08–0.14**, grid lines visible) so the player can see where zoning is possible. Measured on the
    full-resolution `crops_zones_12.png` at the rects `zoning.emptyBand` and `zoning.bareGround` from its
    `crops.json`: the mean RGB distance from `zoning.emptyBand` to the nearest painted class (item 2's 40×40 px
    patches, re-sampled in this frame) is **≥ 30**, and from `zoning.emptyBand` to `zoning.bareGround` is **≥ 20**.
19. **Fog and tone mapping are shared with the scene.** The overlay uses the scene fog uniforms and passes through
    `tonemapping_fragment` + `colorspace_fragment` — `P`: the overlay material's `fog === true`, and its compiled
    fragment shader contains both chunk names. On the full-resolution `crops_zoneswide_12.png`, mean HSV saturation
    inside the `zoning.farBlock` rect (600 ± 60 m from the camera) is **≤ 0.75 ×** that inside `zoning.nearBlock`
    (150 ± 30 m), with no visible seam or "sticker" pop of saturated colour on hazy ground.
20. **Budget.** Two separate measurements — do not confuse them (§5 has the same two rows):
    - **Draw calls attributable to zoning ≤ 10** and **triangles attributable to zoning ≤ 120 000**, by probe in one
      page session at `?showcase=zoning&time=12`: read `__sim.stats()`, set
      `__sim.registry.get('zoning').group.visible = false`, render 5 frames, read again, diff `drawCalls` and
      `triangles`. `summary.json` cannot supply this number.
    - **Scene draw calls in any `?showcase=zoning` shot ≤ 130** from `summary.json.maxDrawCalls`. That field is the
      whole frame (`Math.max` over `screenshot.mjs`'s `renderer.info.render.calls`, `gauntlet.mjs:32`) and the scene
      also holds environment + terrain + roads, whose ARCHITECTURE §9 allocations are 15 + 20 + 80 = 115.

    Plus: `moduleMs.zoning` in every shot JSON **≤ 1.0 ms**; a full band+lot+overlay rebuild of the showcase logs
    **≤ 45 ms**. No allocation in `update()` after the first frame, borrowing `tools.md` item 13's probe because it
    is the one that exists: `P` reads `renderer.info.memory.geometries` at frame 1 and again after 60 idle frames,
    and the delta must be exactly **0** (buffers allocated once and updated in place).
21. **Determinism and persistence.** Two runs at `seed=1337` give identical `api.stats()` (`cells`, `lots`, and the
    per-type histogram) and identical lot id sets. `api.serialize()` → `api.deserialize()` on a fresh load restores
    the same painted cells and the same lot count. `P`. (`CRITIC.md`'s standing `Math.random` grep covers the
    randomness source; it is not restated here.)
22. **Degrades without its dependencies.** Two URLs, two distinct expected outcomes. `modules=` is a real override
    (`src/core/showcase.js` `parseParams`; `src/main.js:78` uses it in place of `selectModules`), so both are
    reachable:
    - **22a — roads absent.** `?showcase=zoning&modules=environment,zoning&time=12`. `world.roads.frontage()` returns
      `[]` and `addEdge` returns `-1` (core defaults, `src/core/world.js`). Zoning reaches status `ready`,
      `api.stats()` reports **`cells: 0`, `lots: 0`, `zonable: 0`**, the overlay is hidden
      (`api.overlayVisible() === false`), and the frame logs **zero console errors**.
    - **22b — terrain absent, roads present.** `?showcase=zoning&modules=environment,roads,zoning&time=12`, with
      `roads` running on the core terrain defaults (`getHeight` → 0, `getSlope` → 0, `isWater` → false). Zoning
      reaches status `ready`, stages its roads, and builds a **flat overlay at y = 0.16** with `cells > 0` and
      `lots > 0`, and logs **zero console errors**. No slope or water exclusion may fire when every height is 0.
23. **Clean at 720p, and no crawl.** Session F's first frame (1280×720 at `zones`/12) shows the same overlay with **no
    outline dropout** — every region boundary present in `zones_12.png` at 1080p is present and continuous here, and
    the cell lattice still satisfies item 5's 1.0–2.5 px clamp, measured on the full-resolution 1280×720 PNG.
    *Crawl* is a frame-to-frame artifact and is not observable in a still: grade it with the same **two-capture
    diff** as item 9, over session F's two frames — 0.5 s apart, camera static, `speed=1`, pixels within 3 px of a
    region boundary masked out; over the cell lattice the per-pixel **max |Δluminance| ≤ 12/255** and the
    **mean |Δluminance| ≤ 2/255**.
24. **Zero console errors** across the whole §4 evidence set: all **32** gauntlet frames (the four declared zoning
    presets at 12 and 22 are already among them), the 720p capture, the two `--crops` captures, the
    `?showcase=all&time=12` frame, and both degradation URLs of item 22.
    `summary.json.totalErrors === 0` plus the `errors` array of each extra shot JSON.
25. **The lot frame is what `buildings` will consume.** §7 spends its longest paragraph on the `frontage().heading`
    trap; this is that paragraph on the checklist, because a lot that fails it ships every building facing backwards
    and surfaces two waves later as a `buildings` bug. `P` over `world.zones.lots` — for every lot:
    - `nx, nz, ax, az, corner, t, y` are all present; `(nx,nz)` and `(ax,az)` are unit and mutually perpendicular to
      **1e-3**;
    - `|wrapPi(lot.heading − Math.atan2(-lot.nx, lot.nz))| ≤ 0.02 rad` (heading faces the road, §2);
    - the point `(lot.x − lot.nx*(lot.d/2 + 3), lot.z − lot.nz*(lot.d/2 + 3))` — 3 m beyond the front edge, i.e.
      *against* `(nx,nz)`, which points from the road *into* the lot — returns `world.roads.isRoad !== 0`;
    - `|lot.y − world.terrain.getHeight(lot.x, lot.z)| ≤ 0.05 m`.
26. **One event per call, and bursts coalesce.** §2 and failure mode 14 both turn on this and neither was gradeable.
    `P` installs a `zones:changed` counter, then: one `api.bulk()` of 20 strokes emits exactly **1**; five separate
    `api.paint()` calls emit exactly **5**; a scripted 10-edge road addition inside 200 ms produces **≤ 4** band
    rebuilds, counted from the `ctx.log` rebuild lines of §5. Every payload matches
    `{cells:[key], lots:{added:[id], removed:[id]}}`, and `world.zones.version` increments exactly once per emission.

## 5. Budget

| Metric | Zoning | How it is measured |
|---|---|---|
| Draw calls **attributable to zoning** | **≤ 10** (typical 6: 4 zone-type meshes + empty-band mesh + lot-outline mesh; the brush cursor is `tools`' call, not zoning's — item 17) | probe, one page session: read `__sim.stats().drawCalls`, set `__sim.registry.get('zoning').group.visible = false`, render 5 frames, read again, take the difference |
| Scene draw calls in any `?showcase=zoning` shot (terrain + environment + roads + zoning) | **≤ 130** | `summary.json.maxDrawCalls` — scene-total, not per module; ARCHITECTURE §9 already allocates 15 + 20 + 80 = 115 to the other three |
| Triangles **attributable to zoning** | **≤ 120 000** (8 tris per 8 m cell at 2×2 subdivision ⇒ ≤ 15 000 cells) | the same group-toggle diff, on `__sim.stats().triangles` |
| `update()` per frame | **≤ 0.4 ms** steady state, **≤ 1.0 ms** worst frame (ARCHITECTURE §9 caps any module at 2 ms) | `moduleMs.zoning` in every shot JSON |
| Rebuild (band + lots + overlay geometry), showcase scale | **≤ 45 ms**, off the steady path, coalesced to ≤ 1 per 60 ms | `ctx.log` line at rebuild |
| `init()` | **≤ 600 ms** | registry `initMs` |
| Texture memory | **≤ 4 MB** (procedural only; at most one 256² helper texture — no PBR sets, this is a UI decal layer) | `__sim.stats().textures` + asset review |
| JS heap contribution | **≤ 24 MB** at showcase scale | `heapMB` in the shot JSON, differenced against `?showcase=zoning&modules=environment,terrain,roads` |

Consistent with `constants.BUDGET.perModuleDrawCalls.zoning = 10`. Declare
`budget: { drawCalls: 10, triangles: 120_000 }` in `index.js`.

## 6. Known failure modes

These have already cost rounds on neighbouring modules (`docs/critic/`) or are visible in the current zoning dev
shots. Do not rediscover them.

1. **Opaque paint-bucket fill.** `shots/zoning/dev_zones_12.png`: blocks are flat pastel slabs; grass, road wear and
   terrain relief under them are gone, so aerial frames read as a spreadsheet. Symptom: block interiors have almost
   no luminance variance. Fix is alpha + preserving the underlying value, not adding noise on top.
2. **Milky, desaturated palette.** Same shot: "residential green" is a mint wash and "office violet" is lilac. CS2's
   overlay is saturated (`cs2_1.jpg`). Symptom: mean chroma of a block < 40/255.
3. **Night frame identical to noon.** `shots/zoning/rdev2/aerial_22.png` is as bright as `aerial_12.png`; the whole
   frame reads as dusk. This is the exact failure that scored `effects` a 6 and `terrain` a 6 ("night tufts are
   self-lit"). An unlit overlay must still be driven by `weather.night`.
4. **Low vs high density indistinguishable at aerial.** Both densities collapse into one hue at 300 m+ because only
   value separates them. The hatch must carry the difference.
5. **Grid/outline aliasing.** A world-space line width becomes a sub-pixel shimmer at 660 m and a 3 m stripe at
   110 m. Symptom at `zoneswide`: per-pixel crawl across the lattice (`environment_r2` issue 2 is the same class of
   bug — a hash fed by an interpolated varying).
6. **Staircase against curved/diagonal roads.** A world-aligned 8 m grid painted up to a 30° road produces a
   sawtooth front edge that no CS2 screenshot ever shows.
7. **Overlay on the asphalt.** The road coverage mask (`roads.isRoad`) is a 4 m grid, so its sidewalk/verge value
   bleeds one cell past the real kerb. Trusting it naively either paints over the kerb or eats a whole cell row of
   legitimate land; the geometric setback (`frontStart`) is the authority, the mask is only a veto.
8. **Z-fighting and floating.** Roads, road markings and this overlay all sit within 0.3 m of the terrain. Too low
   ⇒ stipple; too high ⇒ the overlay visibly hovers on the hillside; too coarse ⇒ it cuts through a ridge.
   `roads_r1` issue 1 (terrain protruding through the carriageway) is the same 0.2 m budget.
9. **Lot soup.** Runs split into unequal widths, single-slot slivers, or lots that appear and disappear as an
   unrelated road is edited — visible as random white polygons instead of `cs2_4.jpg`'s regular row, and fatal for
   `buildings` because `lot.buildingId` gets orphaned.
10. **Corner notches.** Two frontages meet at a junction and neither claims the corner, leaving an L of unclaimed
    cells that renders as a dim hole in every block corner.
11. **Whole-block flood.** Zoning every cell of an 80 m block up to depth 4 from all four sides leaves no back-garden
    core; blocks read as solid rectangles rather than frontage bands.
12. **Fog desync.** The overlay ignores `scene.fog` (or reads a stale fog colour) and distant blocks sit on the hazy
    terrain as bright stickers — the "hard horizon seam" that cost `environment` its round-1 pass.
13. **Overlay left on in the real game.** If the overlay renders in `?showcase=all` with no zoning tool active it
    both burns draw calls and destroys every other module's frame.
14. **Rebuild storms.** `roads:changed` fires per edge while a road is drawn; rebuilding the band per event turns a
    45 ms job into a 2 s stall. Coalesce.

## 7. Dependencies and their real APIs

`dependencies: ['terrain', 'roads']`. These are the only functions this module may call; nothing else exists.

**`world.terrain`** (read only — never call `modify`, never write `heights`):
```js
getHeight(x, z) -> m                 getNormal(x, z, out?) -> Vector3
getSlope(x, z) -> rad                isWater(x, z) -> bool
raycast(ray) -> {point, normal}|null cellSize: 4   resolution: 513   seaLevel: 0
minHeight                            maxHeight
features: {                          // src/modules/terrain/index.js:58-63 — "generation features for other modules"
  river: { zAt(x) -> z, halfWidthAt(x) -> m },
  coast: { xAt(z) -> x },
  island: {…},
}
```
`features` is the only deterministic way to find the river and the coast at `seed=1337`; §8.5 and §8.6 require it,
so it is part of this list rather than something the showcase brute-forces by sampling `isWater` over 2048 m.
Degrade: if `terrain` failed, `getHeight` returns 0, `getSlope` 0, `isWater` false (core defaults in
`src/core/world.js`) and `features` is **absent** — guard with `world.terrain.features?.river` (item 22b). The
overlay must then build flat at y = 0.16 without erroring.

**`world.roads`** (read only — never `addEdge`/`removeEdge` outside `showcase.setup`):
```js
edges: Map<id, {id, a, b, type, lanes, width, oneWay, ctrl?, length, elevation, trimA, trimB, bridge, ring}>
nodes: Map<id, {id, x, y, z, edges:Set<id>}>
types: { alley:{width:8,lanes:1,speed:30,sidewalk:2,asphaltHalf:2.0,cornerR:4,laneW:3.6,shoulder:0,median:0,oneWay:false},
         gravel:{width:8,...,asphaltHalf:4.0}, street:{width:16,lanes:2,speed:50,sidewalk:3,asphaltHalf:5.0,cornerR:6},
         avenue:{width:24,lanes:4,speed:60,sidewalk:4,asphaltHalf:8.0,cornerR:8},
         highway:{width:32,lanes:6,speed:100,sidewalk:0,asphaltHalf:16.0,cornerR:10,shoulder:1.9,median:2.4},
         ramp:{width:10,lanes:1,speed:60,asphaltHalf:5.0,cornerR:8,shoulder:1.0,oneWay:true} }
sample(edgeId, t) -> {x, y, z, tangent:{x,z}, normal:{x,z}}        // t ∈ [0,1]; normal = (-tz, tx) = left→right
laneCenter(edgeId, laneIndex, t) -> {x, y, z, tangent}
frontage(edgeId) -> [{side:'left'|'right', from:t, to:t, x, z, heading, width, length}]
  // ~48 m chunks, trims applied. heading = OUTWARD normal; width = road HALF-width. See the three traps below.
nearestEdge(x, z, maxDist=30) -> {edge, t, point, dist} | null
isRoad(x, z) -> 0 | 1 | 2            // 0 none, 1 asphalt, 2 sidewalk/verge; installed by the roads builder
coverage: {res, cell: 4, data: Uint8Array, version}
version                              // bump ⇒ band is stale
```
Three traps in `frontage()` (`src/modules/roads/network.js:238-260`) that this section exists to prevent — read
these before writing a lot:

- **`heading` points *away* from the road.** It is `atan2(nx·sgn, −nz·sgn)`, the outward normal of the frontage side.
  That is the exact opposite of the lot heading §2 mandates (`heading = atan2(-nx, nz)`, i.e. facing the road).
  Copying `frontage().heading` into `lot.heading` ships every building facing backwards, because
  `src/modules/buildings/index.js` places the front directly from `lot.heading`. Use its reverse.
- **`width` is the road half-width** (`e.width / 2`, e.g. 8 for an avenue), *not* the width of the frontage segment.
  The segment's extent along the road is `length` (`d1 - d0`, ~48 m chunks); its `from`/`to` are normalised `t`.
- **The empty-return condition is `length − trimA − trimB < 12`**, not `< trimA + trimB + 8`: the code insets 2 m at
  each end (`from = trimA + 2`, `to = length − trimB − 2`) and then requires `to − from ≥ 8`.

`frontage()` also returns `[]` for a network that has not been built — treat empty as "no lots here", never as an
error. `isRoad` may be **absent** until `roads` has rebuilt once; guard with `typeof R.isRoad === 'function'`.

**Documentation drift, recorded not carried:** ARCHITECTURE §3 line 99 still writes `isRoad(x,z) -> 0..1`. The code
(`src/modules/roads/build.js:555`) and this spec return **`0 | 1 | 2`**, and `terrain` already consumes that shape;
`roads.md` freezes it. The code and this spec are authoritative — see `docs/core-requests/zoning.md` to get §3 fixed;
do not "correct" the module to match §3.

**`ctx.modules.roads`** (module api, only what exists):
```js
rebuild()            lampPositions(edgeId) -> [{x,y,z,heading,side,edgeId,t}]
intersections() -> [{id,x,y,z,roundabout,arms:[…]}]     nodeInfo(id)      stats()
edges() -> [{id,a,b,type,len,bridge,ring}]              types()
```
Only `rebuild()` may be called, and only from `showcase.setup` after staging roads. Guard it:
`ctx.modules.roads?.rebuild?.()`.

**Core** (`src/core/`): `ctx.rng.fork(label)` / `float/int/range/pick/weighted/gauss/shuffle` and `hash2(x,y,seed)`
from `core/rng.js` for the per-cell variation; `RENDER_ORDER.MARKINGS = 21` from `core/constants.js` (the overlay
draws at `MARKINGS + 4…6`, i.e. above roads and markings, below buildings); `ctx.clock.sunElevation(hour)`;
`world.weather.night` (0–1, published each frame by `environment`) and `world.weather.fogDensity`; `ctx.events`;
`ctx.log`.

**Never** (the module-scoped half only; `BUILDER.md`'s "stay in your lane" and ARCHITECTURE §4 carry the generic
prohibitions and are not restated here): call into `buildings`, `props`, `tools` or `simulation` — none is a
dependency, and `tools` and `props` are stubs. `world.zones` writes are yours alone; `lot.buildingId` is written by
`buildings` and must be preserved, never invented.

## 8. Showcase

`showcase.description`: "Zoned district on generated terrain: avenue spine, street grid, a diagonal, a curved street,
alleys, a cul-de-sac, a waterfront run and a hillside climb; all four zone types in both densities, plus unzoned
buildable band and a highway with no frontage."

**Staged content** (`showcase.setup`, using `world.roads.addNode/addEdge` then `ctx.modules.roads?.rebuild?.()`,
then the band rebuild, then a single `bulk()` paint, then the overlay rebuild):

1. An `avenue` spine along z = 0 running from x = −320 to x = 320.
2. A `street` grid: N–S at x ∈ {−240, −160, −80, 0, 80, 160, 240} and E–W at z ∈ {−160, −80, 80, 160}.
3. A **diagonal** street cutting one south-west block, and a **curved** street off the east side using
   `addEdge(a, b, 'street', {ctrl:{x,z}})` — these two prove acceptance item 7.
4. Two `alley` edges splitting deep blocks, and one **cul-de-sac** stub ending in the middle of a block.
5. A **waterfront** street run following the river so the water exclusion (item 13) has a ragged edge to make.
   Place it from `world.terrain.features.river.zAt(x)` / `halfWidthAt(x)` — not by hand-picked coordinates.
6. A **hillside** street climbing past `slope > 0.42 rad` so the slope exclusion cuts the band mid-block. Find it by
   walking `world.terrain.getSlope` until it exceeds 0.42 rad; record the resulting coordinates in the build record
   alongside the `zoneslope` target.
7. One `highway` edge crossing the north of the district, proving item 14 (no lots on it).
8. Painting, in **one** `bulk(fn({circle, rect, erase}))` call (§2): at least **three blocks of each of the eight
   classes** and **at least 1 700 painted cells at `seed=1337`**. Both floors are needed — an 80 m block is 10×10
   cells, and a 3-cell-deep frontage band around it is 10×10 − 4×4 = **84** cells, so sixteen such blocks come to
   **1 344**, which would satisfy a per-class count and still fail item 10's `cells ≥ 1500`. The staging floor
   therefore sits above item 10's floor, not level with it. State the
   achieved `stats().cells` in `docs/builds/zoning_r<round>.json`.
   Also: **at least two blocks left unpainted** inside the zonable band
   (item 18); **one block painted half residential-low / half commercial-high** so a region boundary with the
   animated outline runs through open ground, not only against a road.
9. *(removed — the brush preview is staged by `tools`, not here; item 17. The numbering is left as-is so item and
   section references from other rounds do not shift.)*
10. `api.probePoints()` returns the eight class-representative block centres (one per type × density) that items 1–3
    measure at, and `api.cropRects()` returns the four landmarks of §2 for items 18–19. Pick probe blocks on flat
    inland ground, ≥ 24 m from any water or slope exclusion boundary, so the luminance-std ratio is not contaminated
    by terrain shading. List the eight world coordinates in the build record.
11. `world.zones.version` bumped and **one** `zones:changed` emitted at the end of staging — not one per block.

**Declared camera presets** (`showcase.cameras`; copy these values so gauntlet and critic agree):

```js
zones:      { yaw: 0.62, pitch: 0.74, distance: 300, target: [0, 0, 0] }        // 3/4 aerial over the grid
zonesclose: { yaw: 0.95, pitch: 0.44, distance: 140, target: [-80, 0, -50] }    // diagonal + curve + corner lots
zoneswide:  { yaw: 0.45, pitch: 1.05, distance: 660, target: [0, 0, 10] }       // whole district + fog
zoneslope:  { yaw: 1.60, pitch: 0.52, distance: 180, target: [ … hillside/waterfront corner … ] }
```
`zoneslope` must point at the block where the hillside street and the waterfront street meet; set its target to the
actual staged coordinates and state them in the build record.

**What the build record must carry so the critic is not guessing** (`docs/builds/zoning_r<round>.json`): the
`zoneslope` target coordinates; the eight `probePoints()` world coordinates (items 1–3); the count **N** of junctions
where two zoned frontages meet, with their node ids (item 12); the **first and last cell key of the river-frontage
boundary run and of the hillside boundary run** (item 13 — without these the direction-change count has no defined
subject); and the achieved `stats().cells` / `stats().lots` at `seed=1337` (items 10 and §8.8). Each of these is a
number the spec deliberately leaves to the staging rather than inventing — the build record is where it becomes
checkable.

**How each frame of the §4 evidence set must read.** §4 fixes *which* frames exist and is the only place that does;
what follows is the module-specific part — what to look for once you have them:

- **06.5** — long low sun; the overlay must not go sepia-monochrome with the terrain (`environment_r1` issue 4).
  Fill hue stays identifiable; region outlines still read against long shadows.
- **12** — the reference frame for items 1–3, 7, 8, 10–13, 18. Highest colour separation; ground texture visible
  through every block.
- **17.5** — warm low light; check the overlay does not blow out toward the sun (`environment_r2` issue 1). p99 of
  any overlay crop ≤ 235/255.
- **22** — item 4. The district reads as a dim coloured plan over a dark landscape; outlines still the brightest part
  of the overlay but below any real light source in the frame.
- **`street` and `closeup`** at all times — items 8 and 9: from 60 m the overlay is a decal on the ground with a
  clean setback from the kerb, no z-fight, no floating edge, markings unobscured.
- **`skyline`** — grazing angle; the overlay must not turn into a moiré sheet (item 3's aliasing clause) and must
  fog out with the terrain (item 19).
