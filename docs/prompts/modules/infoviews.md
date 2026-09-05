# Module spec: `infoviews`

Wave 2b. Folder: `src/modules/infoviews/**`. Read `docs/prompts/BUILDER.md` first — everything invariant lives
there and is not repeated here. Cross-module needs (a `buildings` uniform, an `effects` desaturation pass) go in
`docs/core-requests/infoviews.md`; you may not edit `src/modules/ui/**`, `src/modules/buildings/**`, `src/core/**`.

---

## 1. Purpose

Without `infoviews` the player can see the city but cannot read it: there is no way to find out where the pollution,
the congestion, the cheap land, the unpowered blocks or the uncovered schools actually are.

---

## 2. World data owned

`infoviews` owns `world.infoview`. The default stub in `src/core/world.js` is:

```js
infoview: { active: null, data: null, legend: null, buildingTint: () => null },
```

ARCHITECTURE §3 forbids replacing a section object (`world.infoview = {…}`); other modules and save/load hold the
reference. Mutate in place, bump `version`, emit the event. The four fields above keep their meaning exactly:

```js
world.infoview = {
  active: null,                    // null | one of the 12 view ids in §7 (ui/hud.js INFOVIEWS)
  data: null,                      // Float32Array(256*256) row-major [iz][ix], values 0..1, of the ACTIVE view;
                                   //   null when active === null. Cell 8 m, index = iz*256+ix,
                                   //   ix = clamp(floor((x+1024)/8),0,255), iz = clamp(floor((z+1024)/8),0,255)
  legend: null,                    // { title:string, description:string, colors:[cssColor,…≥3],
                                   //   min:string, max:string, stats:{ [label]: string } }  ← read verbatim by
                                   //   ui/hud.js _renderLegend(); null when inactive
  buildingTint: (id) => null,      // building id -> {r,g,b,a} in 0..1 | null (null = not tinted)
  // additions this module also owns:
  version: 0,                      // bump on every activation, deactivation and grid recompute
  desaturation: 0,                 // 0..1; how far effects/buildings should grey the rest of the world
  views: [ { id, label, description, unit, colors:[…], min, max, kind:'terrain'|'network'|'building' } ],
  set(id) -> boolean,              // id | null; false for an unknown id
  sample(x, z) -> 0..1,            // world metres -> value of the active view (bilinear); 0 when inactive
  valueAt(x, z) -> { value:0..1, text:string } | null,   // text is the formatted value with its unit
  gridFor(id) -> Float32Array(65536) | null,             // any view's grid, active or not
}
```

`api` (reachable as `ctx.modules.infoviews`):
`setView(id|null) -> boolean` · `view() -> id|null` · `views() -> [{id,label,…}]` · `legend() -> legend|null` ·
`grid(id) -> Float32Array|null` · `sample(id, x, z) -> 0..1` · `stats(id) -> {min,max,mean,p5,p50,p95,coveredFraction}` ·
`recompute(id?) -> ms` · `recomputeCount() -> int` (monotonic count of full grid recomputes since `init`, so
criterion 20 is a counter and not an inference) · `transition() -> 0..1` (the cross-fade mix the material is
currently compositing at; `0` and `1` are the settled states — criterion 21 samples this, not a uniform name) ·
`setPanel(bool)` · `overlayDraws() -> int` · `serialize() -> {active}` · `deserialize({active})` ·
`groundAlphaAt(x, z) -> 0..1` (the alpha the ground overlay actually composites at that world point, water mask and
edge fade included — this exists so criterion 10 is a probe and not an argument about a PNG) ·
`cropRects({project, width, height, camera}) -> { name: [x, y, w, h] }` — the pinned landmarks criterion 7 measures
inside. `window.__sim.cropRects()` collects it from every ready module and
`node tools/screenshot.mjs … --crops` writes it to `<out>.crops.json` beside the PNG (ARCHITECTURE §8, which is the
**only** producer of that file); `project(x, y, z)` maps a world point to pixels of the full-resolution capture.
Required names are listed in criterion 7.

Events **emitted**: `infoview:changed` with payload `{ view: id|null, legend, version }` — emitted after
`world.infoview` is fully mutated. (New name, `section:verb` per ARCHITECTURE §5; the bus is generic, no core change.)

Events **consumed**: `ui:action` (act only on `{action:'infoview', args:[id|null|'none']}` — `hud.action(action, ...args)`
emits `{action, args}`, `src/modules/ui/hud.js:382`), `sim:tick`, `buildings:changed`, `roads:changed`, `zones:changed`,
`services:changed`, `terrain:changed`, `time:hour`.

**Synchrony contract for `ui:action` (load-bearing — criteria 1 and 15 depend on it).** The handler must leave
`world.infoview` **fully mutated** — `active`, `data`, `legend`, `desaturation`, `version` — **before it returns**.
`hud.setInfoview()` calls `this.action('infoview', v)` at `hud.js:954` and `this._renderLegend()` at `hud.js:957`,
three lines later on the same synchronous call stack, and `_renderLegend()` reads `this.ctx.world.infoview?.legend`
at that moment (`hud.js:963`). Deferring the grid or legend build to the next frame renders a stale or empty legend
and fails criterion 15. So: recompute synchronously (≤ 12 ms, §5), or serve a cached grid for the view being
activated and recompute in the background **only** for grids that are not the active view.

### 2.1 Where every grid comes from (the derivation table)

This is the part that decides what every frame looks like, so it is not a builder choice: two builders working from
the same words must ship the same heatmap. All 12 grids are 256², cell 8 m, values clamped to `[0,1]`, row-major
`[iz][ix]` — the same layout and the same cell size as
`ctx.modules.simulation.grids()` (`{size:256, cellSize:8, ground, air, noise, landValue}`), so grid-sourced views
are a per-cell copy with **no resampling**.

**The splat weight is fixed for the whole module** — the same `w = (1 - d²)²` kernel
`src/modules/simulation/grids.js:38` uses, so infoviews and simulation agree on what a "hotspot" looks like:

```
w(source, cell) : d2 = (dist/R)^2;  if (d2 >= 1) w = 0;  else w = (1 - d2) * (1 - d2)
```

**The weight is combined as a weighted average, never accumulated** — every source value in this module is already
a `0..1` quantity, and adding those up is the single easiest way to ship twelve white plateaus:

```
ATTRIBUTE (marked per row below; v is the source's value)
  num[i] += v * w ;  den[i] += w
  grid[i] = den[i] > 0 ? clamp01(num[i] / den[i]) : 0
```

The arithmetic that forces it: the staged stock is ≥ 180 buildings in a 1040 m city, and in the residential-high
block a 90 m disc (25 447 m²) holds ≈ 25 of them; the mean of `(1 - d²)²` over a disc is `1/3`, so an accumulating
splat of a value `v` sums to ≈ `25 × 0.333 × v = 8.3 v` and clamps to 1 for any `v > 0.12`. Every splatted view would
then be a map of *building density* rather than of its own quantity, and criterion 2's flat-fraction test would fail
on the clamped plateau. Weight-normalised, a cell surrounded by six buildings at 0.4 reads 0.4. (This is where
infoviews and `simulation` part company: `grids.js:38` accumulates because pollution genuinely adds up.)

`S(kind)` (coverage) is the other combiner: the **max** over that kind's sources of `w`, so it stays in `0..1`
however many sources overlap.

**Normalisation is fixed, never adaptive.** The stored grid value is always `0..1`; the "Domain" column says what
that `0..1` *means*, and that meaning is what `views[i].min`/`views[i].max` publish to the legend. The domain is a
**constant per view** — never renormalise to the current recompute's min/max, or the legend labels and the ramp
colours drift from hour to hour and criterion 3's night parity fails for a reason that has nothing to do with
lighting.

`B` = the building records that have real coordinates: `ctx.modules.simulation.building(b.id)` for each
`b` of `world.buildings.items.values()`, **skipping any record whose `x`/`z` is `NaN`** (virtual buildings,
`economy.js:170/178`).

`S(kind)` = `world.services.coverage(kind,x,z)` when `world.services.items.size > 0`, otherwise the deterministic
8-source fallback staged in §8 item 4, evaluated as `max` over that kind's sources of `w` with **`R = 520 m`**.
The eight fallback sources map to kinds as: `power_coal`, `water_pump`, `clinic`, `school`, `police`, `fire`,
`park_large`, `landfill` — one source per kind, so `S` of any other kind is `0` in the stub regime.

`R = 520 m` is a stand-in for a missing module, not a claim about real service radii: it is the radius at which one
source per kind lands every coverage view inside criterion 12's band (derivation there). If your staged road mask
differs enough from §8's to push a view outside the band, scale `R` and report the value you used.

**`services` is a stub today, and the stub is not neutral.** With `world.services.items.size === 0`,
`simulation/index.js:119` reports `servicesActive() === false` and `economy.js:424` then sets `r.education = 0`,
`r.health = 0`, `r.parks = 0`, `r.power = 1`, `r.water = 1`, `r.crime = clamp01(0.3*(1 - happiness))` (one city-wide
number) and `r.fireRisk = 0.3` industrial / `0.1` otherwise, **for every building**. Rows 4–8 below therefore give a
second expression for that branch; taking the building record at face value produces four constant grids and fails
criteria 2 and 12 by construction.

| # | id | Source expression (value at the splat centre, before clamp) | Mode | Splat R | Domain (fixed) | High means |
|---|---|---|---|---|---|---|
| 1 | `traffic` | `const fg = ctx.modules.traffic?.flowGrid?.()`; if non-null copy `fg.data` cell-for-cell and `clamp01` it (`fg.cellSize` is `world.size/256` = 8, so no resampling; `fg.data` accumulates to 1.5, `traffic/sim.js:606`, hence the clamp). Else per edge: `cong = clamp01(betweenness(e) * 26 / types[e.type].lanes * activity(hour))`, `activity` = `ctx.modules.simulation.activity(hour)`; splat `cong` along the polyline from `world.roads.sample(e.id,t)` at 4 m steps | ATTRIBUTE | `types[e.type].width/2 + 6 m` | 0 = free flow, 1 = gridlock | congestion |
| 2 | `landvalue` | per-cell copy of `grids().landValue` | — | — (no splat) | 0..1 | value |
| 3 | `pollution` | per-cell `min(1, grids().ground + grids().air)` (the same expression `simulation.pollutionAt` uses, `index.js:214`) | — | — | 0..1 | dirty |
| 4 | `happiness` | **no per-location source exists** — `services()` is city-wide and the building record has no `happiness` field. Per building in `B`: `h = clamp01(world.economy.happiness + 0.14*(E-0.5) + 0.12*(H-0.5) + 0.10*(P-0.5) - 0.16*(C-0.5) + 0.10*(r.landValue-0.5) - 0.22*r.pollution - 0.10*r.noise)`, where `E`, `H`, `C` are rows 5, 6 and 8's per-building values and `P` = `r.parks` with services real, `S('park_large')` with services stubbed. No simulation → `clamp01(0.5 + 0.6*(landValue - pollution))` per cell from the fallback grids | ATTRIBUTE | 90 m | 0 = unhappy, 1 = happy | happy |
| 5 | `education` | services real: `r.education`. Services stubbed: `S('school')` at the building | ATTRIBUTE | 90 m | 0..1 | schooled |
| 6 | `health` | services real: `r.health`. Services stubbed: `S('clinic')` at the building | ATTRIBUTE | 90 m | 0..1 | healthy |
| 7 | `fire` | services real: `r.fireRisk`. Services stubbed: `clamp01(0.55 - 0.5*S('fire'))` at the building | ATTRIBUTE | 90 m | 0..1 | hazard |
| 8 | `crime` | services real: `r.crime`. Services stubbed: `clamp01(0.55 - 0.5*S('police'))` at the building | ATTRIBUTE | 90 m | 0..1 | crime |
| 9 | `power` | `max(S('power_coal'), S('power_wind'), S('power_solar'))` on the cell lattice; with services real also `min` with `r.power` at building cells (stubbed, `r.power` is a constant 1 and the `min` is a no-op) | — (S is a lattice field) | 520 m | 0..1 | powered |
| 10 | `water` | `max(S('water_pump'), S('sewage'))` on the lattice; with services real also `min` with `r.water` at building cells (same no-op when stubbed) | — | 520 m | 0..1 | supplied |
| 11 | `garbage` | **no per-building field either.** `load` = row 12's expression with jobs folded in, `(r.occupants + 0.5*r.jobs) / (r.footprint.w * r.footprint.d) * 10000 / 2500`, splatted from `B`; `collect` = `max(S('landfill'), S('incinerator'))` on the lattice; value = `clamp01(load - collect)` | ATTRIBUTE (`load`) | load 70 m, collect 520 m | 0 = clean, 1 = piling up | uncollected |
| 12 | `density` | `(b.occupants / (b.footprint.w * b.footprint.d)) * 10000 / 2500` for `b` in `world.buildings.items` | ATTRIBUTE | 60 m | `1.0` = 2500 residents per hectare **of building footprint** | dense |

Row 12's full scale is 2500, not 250, and the arithmetic is why: the divisor is the *footprint* area, not the lot.
A 30-occupant building on a 12 × 10 m footprint is `30/120 = 0.25` people/m² = **2500 res/ha of footprint**, so a
250 full scale clamps every residential building to `1.0` and the view becomes a solid plateau. 2500 puts that
building at `1.0`, a 4-occupant house on 80 m² at `0.2`, and a 200-occupant tower on 400 m² at `2.0` → clamped.
At a typical 10 % footprint-to-land ratio, `1.0` is ≈ 250 residents per hectare of land — the number a player reads.

`betweenness(e)` is defined here and nowhere else, because a number two builders compute differently is not a
specification. Over `world.roads.nodes`, for every **ordered** pair `(u, v)`, `u ≠ v`, take the single shortest path
by summed `edge.length` (Dijkstra; break ties by the lower `edge.id` compared as a string). `betweenness(e)` = the
number of those paths that traverse `e`, divided by `N*(N-1)` with `N = world.roads.nodes.size` — so it is a fixed
`0..1` fraction, computed once per `roads:changed`, not per frame. The `26` is calibrated against that definition:
on §8's staged graph (≥ 24 edges, ≥ 20 nodes) the busiest avenue segment carries ≈ 20 % of all pairs, and
`activity(12) ≈ 0.32` (`Activity.commute(12)` = 0.001 + 0.000 + 0.214 + 0.100 = 0.315), so a 2-lane avenue reads
`0.20 * 26 / 2 * 0.32 = 0.83` at noon while a 2-lane side street at `b ≈ 0.03` reads `0.12` — a spread of 0.7,
comfortably past criterion 2's 0.25. Report your measured `p95`; do **not** renormalise the constant away.

Polarity must match `ui/hud.js` INFOVIEWS (`hud.js:67`), which is where the player reads the words: `fire` is
`Safe → Hazard`, `crime` is `Safe → Crime`, `garbage` is `Clean → Piling up`, `pollution` is `Clean → Polluted`.
Those four ramps run low-good to high-bad; the other eight run low-bad to high-good.

**The stat population is the city mask, and every number in `api.stats(id)` is computed over it.** The **city mask**
is every cell whose centre is within 120 m of any `world.roads.edges` polyline; for §8's layout (nine 240 m-wide road
corridors over a 1040 m city) that is ≈ 1.5 × 10⁶ m² ≈ 23 000 of the 65 536 cells. Statistics over the *whole* grid
would fail two views by construction and are not what is asked for: `landvalue` carries a constant
`base = 0.22 + 0.32*happiness` ≈ 0.41 everywhere (`grids.js:124`), so the ¾ of the map outside the city is one flat
value and criterion 2's flat-fraction test would fail on wilderness; and the traffic ribbons touch ≈ 3 % of the map,
so its `p95` would land in the zero mass.

With no `roads` module the mask is empty (criterion 18's reduced module set); the population then falls back to all
65 536 cells, and criterion 2 is not graded in that configuration.

One exception, for that second reason: for a view with `kind === 'network'` (only `traffic`) the population is the
cells where `grid[i] > 0` — the ribbons — of which there must be `>= 1200`. §8's ≈ 5 150 m of road at a ≈ 22 m splat
band is ≈ 1.13 × 10⁵ m² ≈ 1 770 cells, so that floor is met with margin and cannot be gamed by lighting six cells.

`coveredFraction` uses the city mask in every case:
`coveredFraction = (cells in the mask whose *service term* ≥ 0.5) / (cells in the mask)`. The service term is the
row's value for `power`, `water`, `education`, `health`, and is the *inverse* of the displayed value for `fire` and
`crime` (`1 - value`) and the `collect` term for `garbage` — i.e. it is always "how well served", never "how bad it
is".

---

## 3. Visual/behavioural target

**Primary reference: `$REF/cs2_7.jpg`** — the CS2 "Industrial" info view. Read it before building. What it shows:

- The **data is opaque, flat and saturated**; the world under it is not. Industrial buildings are painted a single
  pure yellow, the roads a single pure green, the resource area a flat yellow field that drapes over the hill relief
  and runs behind the tree line. Everything that is *not* data — terrain, forest, distant downtown, smoke — is
  desaturated to grey-white and keeps only its shading and its shadows. There is no pastel wash and no glow.
- The painted surfaces still read as **volumes, not stickers**: the yellow factories keep their silhouettes, roof
  planes and the shading difference between a wall and a roof; the yellow ground field follows the terrain and dips
  into the hollows. Colour is flat, geometry is not.
- Top-left, the **MAP LEGEND** panel: title row with the view icon, then one row per layer — colour swatch, label,
  and a right-aligned classifier (`Building color`, `Network color`, `Terrain color`) — then gradient bars with
  `Bad`/`Good`, `Low`/`High` end labels. Dark translucent panel, `<= 380 × 300 px` at 1920×1080, 11–13 px type,
  blue accent (criterion 13 — these are the graded numbers, not approximations).
- Left edge, the **view picker**: a compact grid of small rounded icon tiles, one per info view, the active one lit.
- The sky, the bottom bar and the status strip stay in full colour. The info view is a lens on the city, not a filter
  on the screen.

**One alpha per layer, and the two references are reconciled here so nobody has to guess which wins.**

| Layer | Alpha | Reference it follows |
|---|---|---|
| Ground overlay over land | `a >= 0.85` | cs2_7 — the yellow field is paint, not a wash |
| Ground overlay over water | `a <= 0.15` (criterion 10) | cs2_7 — the water is never painted |
| Building tint | `a` in `[0.55, 0.75]` (criterion 7) | cs2_1 — deliberately **not** cs2_7 |

The one deliberate departure: cs2_7 paints its factories opaque and we do not — buildings get cs2_1's film, because
a facade that still reads through the tint is worth more here than matching the reference exactly (at `a > 0.75` the
window lines go). The ground keeps cs2_7's opacity, so "no pastel wash" still describes the frame: the wash risk was
always the ground layer, which covers most of the pixels.

**Secondary references.** `$REF/cs2_1.jpg`: a translucent overlay done right — the blue road-preview film hugs the
carriageway and the grass without a z-fighting fringe, and the purple building film keeps every window line legible
underneath it. That is the building-tint alpha above. `$REF/cs2_2.jpg`: at
aerial distance the overlay must still obey aerial haze — data far away fades toward the sky colour like everything
else, otherwise the overlay looks pasted on the lens. `$REF/cs2_4.jpg`: at street level the overlay drapes the kerb
and the sidewalk instead of flattening them — the silhouette and the height step still read as geometry, even though
an `a >= 0.85` ground layer covers the lane markings themselves.

**Behaviour.** Selecting a view is instantaneous to the player: a 0.20–0.40 s cross-fade in (criterion 21), the legend
appears in the same frame, the picker tile lights. Switching between two views cross-fades the ramp, never flashes through white or
through both ramps stacked. Deselecting removes every infoviews object from the frame. The overlay is **unlit data**:
its colour at 22:00 is the same colour as at 12:00 (the city under it goes dark, the data does not), and it never
blooms — an info view is a chart, and a chart does not change value with the sun.

---

## 4. Acceptance criteria

Evidence paths assume round `N` and the gauntlet layout `shots/infoviews/rN/<camera>_<time>.png`. Probes are
`page.evaluate` against `?showcase=infoviews&headless=1`. Ordered by score impact.

**Definition: overlay pixels.** Criteria 3, 5, 6, 10 and 11 grade "overlay pixels". A PNG carries no overlay channel
and no depth, so the mask is defined once, here, by an **A/B frame pair** — and the builder ships the pair and the
script, so the critic re-runs the same segmentation instead of inventing one:

- Shoot the frame with the view active → `<name>_<time>.png`. Then, at the **same camera, time, seed and window
  size**, call `api.setView(null)`, wait 2 frames, shoot again → `<name>_<time>_off.png`. Criterion 16 guarantees the
  second frame contains zero infoviews objects, so it is a clean plate.
- A pixel is an **overlay pixel** iff `max(|ΔR|, |ΔG|, |ΔB|) > 6/255` between the two frames. Every other pixel is a
  **non-overlay pixel**. "The non-overlay half of the frame" means the non-overlay pixels, whatever their count.
- **Camera distance** for criterion 11 is not read from the image: on a 64 × 36 NDC lattice, take
  `ctx.camera.screenToGround(ndcX, ndcY)` and record `|groundPoint − ctx.camera.camera.position|`; a pixel's distance
  is its lattice cell's value. Write it as `<name>_<time>_dist.json`.
- **Evidence required:** both PNGs, the distance JSON, and the segmentation script at `shots/infoviews/rN/mask.mjs`.
  A criterion in that group with no shipped mask is graded as failed, not argued.
- **Every pixel statistic in §4 — this mask, criterion 7's pinned crops, all luminance and saturation figures — is
  taken on the full-resolution capture, never on a downscaled copy.** At 480 px wide a whole building wall is a few
  pixels and every threshold below becomes noise.

1. **All 12 views exist and switch cleanly.** `api.views().map(v => v.id)` deep-equals, in this order,
   `['traffic','landvalue','pollution','happiness','education','health','fire','crime','power','water','garbage','density']`
   (the ids in `src/modules/ui/hud.js` INFOVIEWS). For each id, `events.emit('ui:action',{action:'infoview',args:[id]})`
   leaves `world.infoview.active === id`, `world.infoview.data instanceof Float32Array` with `length === 65536`,
   `world.infoview.legend` with `title`, `description`, `colors.length >= 3`, `min`, `max`, and `stats` holding 3–6
   entries; `infoview:changed` fires once; `__sim.errors` stays `[]` across all 12. Probe:
   `shots/infoviews/rN/apicheck.mjs`.
2. **No degenerate grid.** For each of the 12 grids, read `api.stats(id)` directly — no hand-recomputed percentiles:
   `min >= 0`, `max <= 1`, `p95 - p5 >= 0.25`, and the fraction of cells within ±0.02 of `mean` `<= 0.60`. Both are
   over §2.1's **stat population** (the city mask; the `grid[i] > 0` ribbon cells for `traffic`, of which `>= 1200`),
   and the probe recounts the second one from `api.grid(id)` over that same population. A view that is a constant
   field, or that is zero everywhere because a dependency is a stub, fails this item — §2.1 names the source, the
   splat mode and the `services`-stub branch for all 12, and §7 and criterion 18 give the missing-module fallbacks;
   there is no view for which "no data was available" is an accepted answer.
3. **Data colour does not change with the sun (night parity).** **Pass condition:** in `iv_pollution_12.png` vs
   `iv_pollution_22.png`, over the 2000 highest-value overlay pixels (mask per §4 preamble), the mean per-channel RGB
   differs by `<= 8/255`; same test on `iv_landvalue_12/22`; and night overlay p99 luminance `<= 235` (it must not be
   additive and must not trip the effects bloom threshold). **Also record, as a diagnostic and not a pass condition,**
   the drop in mean luminance of the non-overlay pixels between 12 and 22. That number is owned by `environment` and
   `effects`, whose night is a live open weakness (`environment_r2` issue 4, `effects_r1` issue 2) and which this
   module may not edit. If the drop is `< 35 %`, log it in `docs/core-requests/infoviews.md` as an
   environment/effects finding — it is **not** an infoviews fail.
4. **The ground layer conforms to the terrain.** **Method, named so it is not re-invented:** in a `page.evaluate`
   probe, find the ground overlay mesh in `ctx.group`, read `geometry.attributes.position`, transform each vertex by
   the mesh's `matrixWorld`, and take 2000 of them by a seeded stride. Compare each vertex `y` against
   `world.terrain.getHeight(x,z)`. The band is split by local relief, because the §6 ridge-crest fix (take the max of
   the vertex height and the four 4 m midpoints) legitimately lifts the surface further on a slope and the two must
   not contradict each other:
   - On points whose **local terrain range < 0.5 m** (max − min of `getHeight` at the vertex and its four 4 m
     midpoints): `>= 99.5 %` sit between **+0.05 m and +0.60 m** above `getHeight`.
   - Everywhere else: above the terrain at every point, and `<= 1.5 m` above it.
   - **No point may sit below the terrain anywhere**, in either band. Report the two populations separately.

   The anti-z-fight state is probed on the material, not judged from a PNG: `depthWrite === false`,
   `polygonOffset === true`, and `renderOrder` strictly between `RENDER_ORDER.MARKINGS` (21) and
   `RENDER_ORDER.TRANSPARENT` (100). `iv_pollution_12.png` and the aerial shot are confirming evidence — no stipple
   or dashed fringe where the overlay meets road edges, kerbs or the zoning overlay.
5. **Saturated data over an unsaturated world.** In `iv_pollution_12.png`, mean HSV saturation of the top-decile-value
   overlay pixels `>= 0.45`. In `iv_power_12.png` the same holds for the covered plateau. **That is the pass
   condition**, because it is the half of the ratio this module owns.
   **Also record, as a diagnostic and not a pass condition,** the same quantity divided by the mean saturation of an
   equal-area seeded sample of **non-overlay pixels** in the same frame (both populations per the §4 mask, same pixel
   count); the target is `>= 2.0 ×`. The denominator is the grey world of cs2_7, and the grey world is owned by
   `effects` and `buildings`: this module may not edit either, publishes `world.infoview.desaturation` and files the
   request, and ships correct with the uniform ignored (§6). So if the numerator clears 0.45 and the ratio does not,
   log the measured ratio and the unhonoured uniform in `docs/core-requests/infoviews.md` — it is **not** an
   infoviews fail. Same device as criterion 3's night-luminance drop, same reason.
6. **A readable ramp, not a wash.** Two probe tests, both on things the builder owns — the ramp stops and the domain
   mapping — and neither on `simulation`'s value distribution, which is not this module's to shape:
   - **Ramp separation.** The ramp sampled at 0, 0.25, 0.5, 0.75, 1.0 gives five colours whose adjacent pairs differ
     by `>= 40/255` in max-channel distance.
   - **Band legibility over the data that actually exists.** Take the deciles of `api.grid('landvalue')` restricted
     to the §2.1 city mask (the values at the 5th, 15th, … 95th percentiles), look each one up in the ramp LUT,
     convert to CIE L\*, and quantise into **8 equal-width buckets over L\* ∈ [0,100]**: **`>= 5` of the 8 buckets are
     occupied.** A ramp whose stops are chosen for the domain's populated range passes; a ramp that spends four of its
     stops on values the city never reaches does not.

   `iv_landvalue_12.png` is the confirming image for both, not the measurement.
7. **Buildings are tinted as films with their volumes intact.** With `landvalue` active, `>= 90 %` of
   `world.buildings.items` return a tint from `world.infoview.buildingTint(id)` with `a` in `[0.55, 0.75]` (matches
   §3's alpha table; above 0.75 the facade stops reading through). Tint faces are shaded by a fixed top-light term
   (`mix(0.72, 1.0, saturate(N·up))`), never by the sun, so criterion 3 holds on buildings too — which means a single
   planar facade is deliberately flat, exactly as cs2_7's yellow factories are. The volume therefore has to come from
   the **step between faces**, and that is what is graded: in `iv_landvalue_12.png`, on the **10 tinted buildings with
   the largest screen footprint**, the mean luminance of a building's roof pixels and of its wall pixels differ by
   `>= 25/255`.
   **Roof and wall pixels are pinned landmarks, not hand-guessed boxes.** `api.cropRects` must return, for exactly
   those 10 buildings, `roof.<buildingId>` and `wall.<buildingId>` — the roof rectangle and the camera-facing wall
   quad (from `x, z, footprint, heading, height`) projected with the supplied `project(x,y,z)`, reduced to their
   axis-aligned bounding rect and eroded by 3 px. The critic shoots
   `node tools/screenshot.mjs --showcase infoviews --camera iv_landvalue --time 12 --crops …`, reads the
   `infoviews.roof.<id>` / `infoviews.wall.<id>` rects from `iv_landvalue_12.crops.json`, and measures the
   overlay-mask pixels inside them **on the full-resolution PNG, never on a downscaled copy** — at 480 px wide a
   whole wall quad is a few pixels. If `crops.json` has no `infoviews.*` rects, that is a builder defect
   (`api.cropRects` was not implemented), reported as such.
   The 25/255 is a **composited** step and reachable across the whole ramp: at `a = 0.65` the fixed top-light term
   contributes `0.65 × (1.00 − 0.72) × L_ramp = 0.18 × L_ramp` (≈ 23/255 at a mid-ramp `L_ramp` of 0.5), and the
   remaining 0.35 of the pixel is the sun-lit facade underneath, whose own noon roof-to-wall step is far larger. That
   is why this item is graded at 12:00 only. Same check on `iv_density_12.png` as a confirming crop.
   One `InstancedMesh`, `castShadow = false`,
   layer `LAYERS.NO_SHADOW` (9), shell scaled 1.02× so it never z-fights the facade.
8. **Tint is ordered and varied.** Across the staged stock, `>= 6` distinct tint colours, and Spearman correlation
   between each building's value and its position along the ramp `>= 0.95`. Both from `world.infoview.buildingTint`,
   no pixels involved.
9. **Network views colour the roads themselves.** With `traffic` active, ribbons are generated from
   `world.roads.sample(edgeId, t)` at `<= 4 m` steps, width `= types[type].width × 0.62`, laid `0.30 m` above the
   sampled road surface. Ribbons stop at `trimA/trimB`, never overshoot into the intersection box.
   **Graded by probe, not by eye:** take the intersections from `ctx.modules.roads.intersections()` — each returns
   `{id, x, y, z, roundabout, arms:[{edgeId, dir, trim, width, …}]}` (`src/modules/roads/build.js:1231`) — and use the
   first 20 in id order. For each arm, walk `world.roads.sample(arm.edgeId, t)` outward from the trim point for 30 m
   at 0.5 m steps and test each sample point against the ribbon geometry's vertex ring: **no gap in ribbon coverage
   longer than 0.5 m along any arm.** Probe: `shots/infoviews/rN/network.mjs`. **That probe is the pass condition.**
   `iv_traffic_12.png` — `>= 3` colour classes on the network, the ribbon following every curve, a crop of a 3-arm
   intersection at `<= 120 m` with no un-ribboned wedge — is **confirming evidence**, the way criterion 10's PNG is:
   it is shipped and looked at, but the 0.5 m gap probe is what fails the item.
10. **Water is not painted, land is.** **Graded by probe** — this is where §3's alpha table is measured, since alpha
    is not readable from a PNG: call `api.groundAlphaAt(x,z)` at 200 points where `world.terrain.isWater(x,z)` is
    true — **all `<= 0.15`** — and at 200 points where it is false and the point is `>= 20 m` from the waterline —
    **all `>= 0.85`** (cs2_7's field is paint, not a wash). Along 10 shore transects crossing the waterline
    (sampled at 1 m steps for 8 m either side), the alpha ramp over the **8 m transition band** is monotonic
    (no hard cut-out, no ring). The image is confirming evidence only: `iv_power_12.png` (near-top-down, the river
    and coast in frame) must read as water, not as painted heatmap.
11. **Aerial haze applies.** The overlay materials have `fog: true` and are re-synced when `scene.fog` changes: in
    `iv_power_12.png`, mean HSV saturation of the overlay pixels whose camera distance (from
    `iv_power_12_dist.json`, §4 preamble) is `>= 900 m` is `<= 0.75 ×` that of the overlay pixels at `<= 200 m`.
    Both bands must hold `>= 2000` pixels for the comparison to count; if `iv_power`'s framing does not supply them,
    say so and use `skyline_12` instead. The overlay must fade with distance like the world, not float in front of it.
12. **Coverage views are never a uniform frame.** For `power`, `water`, `garbage`, `education`, `health`, `fire`,
    `crime`: `api.stats(id).coveredFraction` in **`[0.10, 0.85]`**, with `coveredFraction` computed exactly as §2.1
    defines it (service term `>= 0.5` over the 120 m road mask). `services` is a stub, so the showcase stages the 8
    deterministic sources of §8 item 4 and §2.1 evaluates `S(kind)` from them at `R = 520 m`.
    **Where the band comes from, so nobody chases an unreachable number.** With one source per kind, a *direct*
    coverage view (`power`, `water`, `education`, `health`, and `garbage`'s `collect` term) crosses 0.5 where
    `(1 − d²)² >= 0.5`, i.e. `d <= 0.541 R = 281 m`: an area of `π · 281² = 2.48 × 10⁵ m²`, which against the
    ≈ 1.5 × 10⁶ m² city mask is ≈ **0.17**. An *inverse* view (`fire`, `crime`, whose service term `1 − value` crosses
    0.5 at `S >= 0.10`, i.e. `d <= 0.827 R = 430 m`) reaches `π · 430² = 5.8 × 10⁵ m²` ≈ **0.39**. Both sit inside
    `[0.10, 0.85]` with room for a mask up to ≈ 2.2 × 10⁶ m². The previous `[0.25, 0.80]` was unsatisfiable for the
    direct views at any plausible radius: the ≥ 0.5 disc is always 29 % of the source's full disc, so reaching 0.25 of
    the mask would need a single source to blanket 86 % of the city.
    `iv_power_12.png` is **confirming evidence**: serviced areas as bright plateaus with a soft (not hard-cut) edge,
    unserved buildings in the ramp's low colour, and `>= 6` source markers. The `coveredFraction` probe is the pass
    condition; the edge width is not measurable from the PNG and is not graded.
13. **Legend panel matches cs2_7.** Own DOM under `#ui`, shown only when `!ctx.modules.ui`. Contains: title row with
    the view icon, one-line description, a gradient bar built from `legend.colors`, min/max end labels, and 3–6
    right-aligned stat rows. Panel `<= 380 × 300 px` at 1920×1080 and 11–13 px type — both read from
    `getBoundingClientRect()` and `getComputedStyle().fontSize` in the criterion 14 probe, not measured off a PNG.
    Dark translucent (`rgba(14,20,30,0.82)` or similar) with a blue accent; `iv_legend_12.png` confirms the look.
14. **Picker present and correct.** A grid of 12 icon tiles (one per view, distinct pictograms, not letters), the
    active tile lit with the accent. Visible in every showcase shot. Probe at `--w 1280 --h 720`
    (`shots/infoviews/rN/legend_720.png`): every infoviews DOM node's `getBoundingClientRect()` lies inside
    `[0,0,1280,720]` and does not intersect any other infoviews panel. **Any overflow at 720p is a hard fail.**
15. **The `ui` legend is fed, and only one legend shows.** Under `--showcase all`, `world.infoview.legend` is populated
    and matches the active id, `ui.api.setInfoview(id)` round-trips through `ui:action` into
    `world.infoview.active === id`, and exactly one legend panel is rendered (infoviews suppresses its own DOM when
    `ctx.modules.ui` exists). Evidence: `shots/infoviews/rN/all_aerial_12.png` + probe.
16. **Deactivation is complete.** `api.setView(null)` (or `ui:action` with `'none'`) leaves, within 2 frames,
    `world.infoview.active === null`, `data === null`, `legend === null`, `desaturation === 0`, `buildingTint()`
    returning `null`, and **zero visible objects** in `ctx.group` (probe: no descendant with `visible === true` and a
    geometry). `__sim.stats().drawCalls` returns to its pre-activation value ±1.
17. **Overlay draw calls, and the budget conflict is filed rather than argued.** Probe the drawCall delta across
    activate/deactivate over 2 frames: `<= 8`, split ground `<= 5`, building tint `= 1`, network `<= 2`.
    `api.overlayDraws()` reports the same number. Triangles added `<= 260 000`.
    `src/core/constants.js:23` sets `BUDGET.perModuleDrawCalls.infoviews = 5`, and CRITIC.md's pass condition is
    "draw calls within the declared budget" — so 8 and 5 have to be reconciled by someone, and it cannot be the
    builder, because `src/core/**` is off-limits. ARCHITECTURE §15's "≤ 5 draw calls" is written against a design
    where `buildings` honours the shared tint uniform and there is no network layer; today `buildings` has no
    infoview hook (§7), so the tint shell (1) and the ribbons (2) are this module's own draws. **`docs/core-requests/
    infoviews.md` must therefore contain, in round 1, a request to raise `perModuleDrawCalls.infoviews` to 8, quoting
    the 5/1/2 split.** This item is failed if the declared budget, `api.overlayDraws()` and that filed request do not
    all agree.
18. **Degrades without its dependencies.** `node tools/screenshot.mjs --showcase infoviews --modules environment,terrain,infoviews --camera aerial --time 12`
    gives `errors: []`, `modules.infoviews.status === 'ready'`, a non-empty coherent heatmap over the terrain, and a
    legend. Same with `--modules environment,terrain,roads,infoviews`. No dependency may be called without an
    optional-chained guard (§7).
19. **Determinism.** Two runs at the same seed produce identical grids: the sum of each view's grid to 6 decimals is
    equal across runs — the probe writes all 12 sums, a second run at the same seed writes them again, and the two
    files must match. (The `Math.random` ban and the `Date.now()` rule are BUILDER.md engineering rules and a
    CRITIC.md grep; they are not restated here.)
20. **Frame cost.** With a view active, `__sim.stats().moduleMs.infoviews` averaged over 60 frames `<= 2.0 ms`;
    with no view active `<= 0.05 ms`. A full 256² grid recompute `<= 12 ms`. **Recompute rate is a counter, not an
    inference:** read `api.recomputeCount()`, advance the clock by 3 game hours with a view active and no
    `*:changed` event, read it again — the delta is `<= 3`. Coalescing is in **game seconds off `ctx.clock`, never
    wall-clock** (BUILDER.md bans `Date.now()` in module logic and criterion 19 grades determinism): a burst of
    `*:changed` events inside one 360 game-second window costs at most one recompute, so the counter delta over a
    burst of 20 events fired in the same frame is `1`. JS heap growth `<= 2 MB` over 300 frames with a view active
    (no per-frame allocation).
21. **Transitions.** Switching `pollution → landvalue` cross-fades in 0.20–0.40 s; no frame shows both ramps composited
    and no frame goes white. Probe: sample `api.transition()` once per frame across the switch — it leaves 0, rises
    monotonically, never exceeds 1, and settles at 1 within 0.40 s. No uniform names are reverse-engineered.
22. **Save/load.** `api.serialize()` returns `{active:'crime'}` after selecting `crime`; `api.deserialize({active:'crime'})`
    on a fresh page restores the active view, its grid and its legend within 2 frames; `deserialize(null)` and
    `deserialize({active:'nonsense'})` are no-ops that log a warning and throw nothing.
23. **Zero console errors and `modules.infoviews.status === 'ready'`** in every shot the critic takes per CRITIC.md
    ("Shoot it yourself" — do not restate its matrix here, it has drifted once already), plus the six declared preset
    shots at 12 and 22, the 1280×720 shot and the `--showcase all` shot.

---

## 5. Budget

| Metric | Ceiling | How it is checked |
|---|---|---|
| Declared `budget.drawCalls` | **8** (ground ≤ 5, building tint 1, network ≤ 2) — this **contradicts** `src/core/constants.js:23` (`perModuleDrawCalls.infoviews = 5`), which is core and not yours to edit; file the raise to 8 in `docs/core-requests/infoviews.md` in round 1 | activate/deactivate drawCall delta probe (criterion 17), which grades the filed request too |
| Declared `budget.triangles` | **260 000** (ground grid 257² = 131 072; tint shells 12 tris × ≤ 1200; ribbons ≤ 40 000) | probe delta |
| Whole staged showcase frame | ≤ 700 draw calls, ≤ 2.5 M triangles at `iv_power_12` | `summary.json` — the host city's draws belong to `terrain`/`roads`/`buildings`, not to this budget; state that split in your build report |
| Texture memory | ≤ 12 MB: 12 × 256² R32F data textures (3 MB) + 12 × 256×1 sRGB ramp LUTs + one 256² noise. No PBR sets, no HDRIs, no downloads | `stats().textures` delta ≤ 26 |
| `update()` | ≤ 2.0 ms active, ≤ 0.05 ms inactive | `stats().moduleMs.infoviews` |
| Grid recompute | ≤ 12 ms, ≤ 1 per game hour | `api.recompute()` returns ms; `api.recomputeCount()` gives the rate (criterion 20) |
| `init()` | ≤ 250 ms (no awaited network asset) | log line |
| `showcase.setup()` | ≤ 6 s including road build, building spawn and the simulation pre-roll | log line |

---

## 6. Known failure modes

These have already cost rounds on neighbouring modules. Each is a hard fail here.

- **Milky veil instead of desaturation.** Do **not** fake cs2_7's grey world with a fullscreen grey quad, a camera-
  attached dome or a fog bump — that is exactly the "washed-out noon / milky golden hour" blocker in `effects_r1` and
  `environment_r2`. Publish `world.infoview.desaturation` and file the request in `docs/core-requests/infoviews.md`;
  ship correct with `desaturation` ignored.
- **Night overlay that is really dusk.** An overlay lit by the sun goes dark at 22:00 and the info view becomes
  unreadable — the same "night is a milky blue dusk" failure as `effects_r1`. Data materials are unlit.
- **Sprite glow at night.** Markers, plateau edges or the ramp's bright end rendered additively bloom into white blobs
  at 22:00 (`props`/`effects` history). No `AdditiveBlending` anywhere in this module; alpha blending only.
- **Z-fighting against roads and the zoning overlay.** `zoning` already lifts cells 0.16 m and lots 0.26 m with
  `polygonOffsetFactor:-4/-6`. Land above both, with your own offset, or the aerial shot shows a dashed shimmer along
  every kerb — the same class as the `roads_r1` protrusion blocker.
- **Overlay sunk into or floating over the terrain.** An 8 m overlay grid over a 4 m heightfield pokes through ridge
  crests. Take the max of the vertex height and the four 4 m midpoints toward its neighbours before adding the lift.
  On the staged hillside that max exceeds the vertex height by well over 0.55 m — this is correct and expected, and
  criterion 4's split band is written so the fix does not fail the check it exists to satisfy.
- **A flat wash.** A single-hue translucent film over the whole map scores 5. Value must be legible as bands (crit. 6).
- **Painting the sea.** A heatmap that continues over water reads as a bug at every aerial framing.
- **Legend overflow at 1280×720.** `ui_r1` and `simulation_r1` both lost a round to a panel clipped at 720p. The
  module-specific hook: size the legend body from `min(300px, calc(100vh - 140px))` with `overflow:auto`.
- **Two legends in the full game.** `ui/hud.js` already renders `world.infoview.legend`; if you also render yours under
  `--showcase all` the frame has two panels stacked.
- **Uniform frames from the `services` stub.** `services` — and only `services` — is a stub, and `economy.js:424`
  propagates that into the building records, so `education`, `health`, `crime` and `fire` are constant fields if you
  read `r.*` at face value. §2.1 rows 4–8 give the stub-branch expression for each; use it. (`traffic` is **not** a
  stub — §7 — but is not a declared dependency, so row 1's fallback is what runs in every graded shot.)
- **Per-pixel static.** `environment_r2` hit this by hashing an interpolated varying. Hash grid indices in JS at
  recompute time, not screen-space derivatives in the fragment shader.
- **Rebuilding geometry on every view change.** Switching views must upload one 256² data texture and swap one ramp
  LUT; regenerating the ground mesh per switch blows criterion 21's transition and the 2 ms budget.
- **A legend built one frame late.** Deferring the grid or legend build to the next frame leaves the `ui` legend empty,
  because `hud.setInfoview()` re-renders on the next statement after emitting `ui:action`. See the synchrony contract
  in §2; criterion 15 grades it.
- **A per-recompute renormalised ramp.** Rescaling a grid to its own current min/max drifts the legend labels and
  the colours hour to hour and breaks criterion 3 for a non-lighting reason. §2.1 fixes one domain per view.

- **An accumulating splat on a 0..1 value.** The single easiest way to ship twelve identical white plateaus;
  §2.1's weighted-average rule and its arithmetic exist for this.

---

## 7. Dependencies and their real APIs

`dependencies: ['roads', 'zoning', 'buildings', 'simulation', 'services']` (ARCHITECTURE §15). `ui` is deliberately
**not** a dependency, so the showcase is judged on this module's own panels. Every call below is optional-chained.

**`simulation`** (`ctx.modules.simulation`, real, score 6.5) — primary data source:
- `grids() -> { size:256, cellSize:8, ground, air, noise, landValue, version, index(x,z), sample(name,x,z) }`
  (also at `world.economy.grids`). Grids are recomputed once a game hour and are stateless in the inputs.
- `landValueAt(x,z)`, `pollutionAt(x,z)`, `noiseAt(x,z)`.
- `building(id) -> {type,density,level,capacity,occupants,jobs,education,health,crime,fireRisk,parks,power,water,pollution,noise,landValue,x,z}`
  — **records for virtual buildings have `x`/`z` = `NaN`; skip them.** And **`education`, `health`, `parks`, `crime`,
  `fireRisk`, `power`, `water` are constants on every record while `services` is stubbed** (`economy.js:424`); §2.1
  rows 4–8 say what to use instead.
- `services() -> {education,health,police,fire,parks,power,water,garbage}` — **city-wide averages only, 0..1**
  (`economy.js:69` `SERVICE_KEYS`); there is no per-location variant. Note what the building record does **not**
  carry: **no `happiness` and no `garbage`.** Those two views therefore have no per-location source anywhere in this
  API, and §2.1 row 4 and row 11 give the derivation you must use — do not invent a third one.
- `economy()`, `demand()`, `step(n)`, `constants.TICKS_PER_DAY` (2400), `curves`, `profile(hour, out)`.
- Missing → derive every grid from the road graph, the building stock and terrain water with `rng.fork('fallback')`,
  using the same kernel and the same fixed domains as §2.1; never render a constant field (criterion 2).

**`roads`** (real, score 6) — geometry for network views and for the service-fallback frontage:
- `world.roads.edges: Map<id,{id,a,b,type,lanes,width,oneWay,ctrl,length,elevation,trimA,trimB,bridge,ring}>`,
  `world.roads.nodes: Map<id,{id,x,y,z,edges:Set}>`, `world.roads.types[type] = {width,lanes,speed,sidewalk}`.
- `world.roads.sample(edgeId, t) -> {x,y,z,tangent:{x,z},normal:{x,z}}` — the only legal source of road geometry.
- `world.roads.laneCenter(edgeId, laneIndex, t)`, `world.roads.frontage(edgeId)`, `world.roads.nearestEdge(x,z,maxDist)`.
- `ctx.modules.roads.intersections() -> [{id, x, y, z, roundabout, arms:[{edgeId, dir:{x,z}, trim, width, sidewalk,
  type, ring, lanesIn, stopT, atA}]}]` (`src/modules/roads/build.js:1231`; only nodes with `>= 3` arms) — this is the
  list criterion 9's ribbon-coverage probe walks. Also `.lampPositions(edgeId)`, `.rebuild()`, `.edges()`, `.stats()`.
- Missing → no network ribbons; ground and building layers still render; the traffic view falls back to its grid form.

**`buildings`** (real, score 6) — the tint subjects:
- `world.buildings.items: Map<id,{id,lotId,type,density,level,footprint:{w,d},floors,height,x,y,z,heading,styleId,occupants,jobs,lit}>`.
- `ctx.modules.buildings.requestSpawn(lot)`, `.spawnFreeLots(limit)`, `.flush()`, `.at(x,z)`, `.get(id)`, `.count()`, `.stats()`.
- There is **no** infoview hook in `buildings` yet. Render your own tint shells; publish `world.infoview.buildingTint(id)`
  and `world.infoview.active` and file the uniform request. If a future `buildings` honours them, `api.setPanel`-style
  switch `api.setBuildingShell(false)` must turn your shells off in one call.
- Missing → skip the tint layer; ground and network layers still render.

**`zoning`** (real, score 6) — lots for staging and for the density view:
- `ctx.modules.zoning.paint(x,z,radius,type,density)`, `.erase(x,z,radius)`, `.bulk(fn)` (batch — one lot regen),
  `.freeLots()`, `.lotsFor(edgeId)`, `.lotAt(x,z)`, `.cellAt(x,z)`, `.zonableAt(x,z)`, `.refresh()`,
  `.setOverlayVisible(v)` — **call `setOverlayVisible(false)` in `showcase.setup`; the zone overlay must not
  fight your data overlay in the shots.**
- `world.zones.lots: Map<id,{id,edgeId,side,cells,x,z,w,d,heading,type,density,buildingId}>`.

**`services`** (STUB today) — `world.services.coverage(kind,x,z)` returns `0`, `items` is empty, `place()` returns
`null`. Use `ctx.modules.services?.place?.(kind,x,z,heading)` when it exists; otherwise the deterministic
8-source `S(kind)` fallback of §2.1, staged by §8 item 4. **The stub also reaches you second-hand through
`simulation`**: `simulation/index.js:119` needs `world.services.items.size > 0` to report `servicesActive()`, and
without it `economy.js:424` writes constants into `education`, `health`, `parks`, `crime`, `fireRisk`, `power` and
`water` on every building record — §2.1 rows 4–8 exist for exactly that branch.
Kinds are `world.services.kinds` (17 entries; `park_small`, `park_large`, `plaza`,
`school`, `high_school`, `university`, `clinic`, `hospital`, `police`, `fire`, `power_*`, `water_pump`, `sewage`,
`landfill`, `incinerator`).

**`traffic`** (REAL, 244 lines — **not** a stub, and **not** in this module's `dependencies`) —
`ctx.modules.traffic?.flowGrid?.() -> { size: 256, cellSize: world.size/256 (= 8), data: Float32Array(65536),
sample(x, z) }` (`src/modules/traffic/index.js:133`; returns `null` before its sim exists). It returns an **object,
not a grid array** — copy `.data`, do not assign the return value, and `clamp01` it: `traffic/sim.js:606` accumulates
`flow` up to 1.5. `world.traffic.stats.congestion` is a single city-wide number.
Because `traffic` is absent from `dependencies`, it is **not loaded under `--showcase infoviews`**: the real grid
appears only under `--showcase all`, and §2.1 row 1's `betweenness` fallback is what every graded infoviews shot
actually renders. Build and tune the fallback first; the `flowGrid()` path is the bonus. Repeat row 1's formula in a
comment at the call site.

**Core** — `ctx.world`, `ctx.events` (`on(name, fn, owner) -> unsubscribe`, `emit(name, payload)`), `ctx.clock`
(`hour`, `day`, `set(h)`, `sunElevation(hour)`), `ctx.camera` (`camera`, `target`, `distance`, `apply(preset)`,
`registerPreset(name, preset)`, `screenToGround(ndcX,ndcY)`), `ctx.group` (add everything here), `ctx.renderer`,
`ctx.assets.procedural.gradient({size, stops:[[0,'#rrggbb'],…], horizontal:true, srgb:true})` for the ramp LUTs and
`.noiseTexture({size,seed,octaves,scale})` for edge break-up, `ctx.rng.fork(label)`, `ctx.log`, `ctx.quality`,
`ctx.headless`. Constants: `RENDER_ORDER.MARKINGS = 21`, `RENDER_ORDER.TRANSPARENT = 100`, `LAYERS.NO_SHADOW = 9`,
`WORLD_SIZE = 2048`. `tools/screenshot.mjs` passes only `showcase/time/camera/seed/quality/headless/speed/weather/modules`
— **the active view must therefore be selectable from `?camera=`**: read
`new URLSearchParams(location.search).get('camera')` inside `showcase.setup` and set the view its preset declares
(core applies `camera=` *after* `setup`, so you cannot read it from the camera object).

---

## 8. Showcase

`showcase.description`: one sentence naming the staged city and the default view.

**Staged scene** (all inside x,z ∈ [−520, 520], on the terrain module's generated heightfield so there is real relief
and real water):

1. Roads via `world.roads.addNode/addEdge` then `ctx.modules.roads.rebuild()`: three N–S avenues at x = −300, 0, +300;
   four E–W streets at z = −300, −100, +100, +300; one highway along x = +460; one curved street
   (−300,+300) → (0,+180) with a `ctrl`. `>= 24` edges, `>= 20` nodes.
2. Zoning via `ctx.modules.zoning.bulk(...)`: residential-low NW, residential-high around the origin, commercial along
   the central avenue, office SE of centre, industrial SW around (−330, +300) — the industrial block is the pollution
   and fire-risk hotspot and must be visibly hot in `iv_pollution_12.png`. Then `setOverlayVisible(false)`.
3. Buildings: `ctx.modules.buildings.spawnFreeLots(240)` + `flush()`; `>= 180` items in `world.buildings.items`.
4. Services: `ctx.modules.services?.place?.()` for these 8 kinds if the module is real, else the same 8 as the
   deterministic `S(kind)` fallback sources of §2.1 (`R = 520 m`), one per kind, at:
   `power_coal` (−380,+340), `water_pump` (+250,−330), `clinic` (−80,+120), `school` (+120,+60),
   `police` (−200,−180), `fire` (+300,+220), `park_large` (−120,−300), `landfill` (+420,+380).
   They are spread across four quadrants on purpose: each coverage view then has its bright plateau somewhere
   different, which is what gives the `happiness` row its spatial spread when every record field is stubbed flat.
5. Simulation: `ctx.modules.simulation.step(3 * 2400)` (3 game days) so land value, pollution and noise have
   structure; log the resulting population and the 12 grid means.
6. Default active view when the requested camera is one of the six core presets: **`landvalue`** (non-zero everywhere,
   so no core-preset frame is ever empty).

**Declared `showcase.cameras`** — each pins its own view, and this is the only way the standard tools can reach a
specific view:

| Preset | Camera | View pinned |
|---|---|---|
| `iv_pollution` | `{ yaw: 0.62, pitch: 0.78, distance: 620, target: [-120, 10, 40] }` | `pollution` |
| `iv_traffic` | `{ yaw: 1.10, pitch: 0.22, distance: 110, target: [0, 4, 100] }` | `traffic` |
| `iv_landvalue` | `{ yaw: 2.25, pitch: 0.18, distance: 760, target: [0, 40, 0] }` | `landvalue` |
| `iv_density` | `{ yaw: 0.70, pitch: 0.34, distance: 150, target: [20, 10, 20] }` | `density` |
| `iv_power` | `{ yaw: 0.30, pitch: 1.10, distance: 1150, target: [0, 0, 0] }` | `power` |
| `iv_legend` | `{ yaw: 0.90, pitch: 0.30, distance: 260, target: [60, 8, 60] }` | `crime` |

**How it must read** at the framings the critic shoots (CRITIC.md owns which those are; it is not restated here):

- **aerial (520 m)** — the whole staged city with the `landvalue` field draping the relief; ≥ 5 value bands; roads and
  building tints legible; water unpainted; the far edge hazed like the rest of the world.
- **street (60 m)** — the ground layer is opaque (§3) but drapes rather than flattens: the kerb and sidewalk still
  read as geometry with their height step, and the building tint keeps window lines (cs2_1). No z-fight fringe along
  the kerb at grazing angle.
- **skyline (900 m, pitch 0.16)** — the tinted towers stand as coloured volumes against the sky; the ground layer
  compresses to a legible gradient rather than a single smear; legend and picker do not collide with the horizon
  content.
- **closeup (110 m)** — one block: individual building tints differ from their neighbours (criterion 8), the ramp is
  identifiable without the legend.
- **06.5 / 17.5 (golden hour)** — the data colour is unchanged from noon; only the untinted city warms. No cream haze
  over the overlay, no blown highlights on the bright end of the ramp.
- **22 (night)** — the city goes dark, the overlay does not (criterion 3). No bloom halo on the overlay, no glow around
  markers, legend and picker still at full contrast.
