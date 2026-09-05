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
`recompute(id?) -> ms` · `setPanel(bool)` · `overlayDraws() -> int` · `serialize() -> {active}` · `deserialize({active})` ·
`groundAlphaAt(x, z) -> 0..1` (the alpha the ground overlay actually composites at that world point, water mask and
edge fade included — this exists so criterion 10 is a probe and not an argument about a PNG).

Events **emitted**: `infoview:changed` with payload `{ view: id|null, legend, version }` — emitted after
`world.infoview` is fully mutated. (New name, `section:verb` per ARCHITECTURE §5; the bus is generic, no core change.)

Events **consumed**: `ui:action` (act only on `{action:'infoview', args:[id|null|'none']}` — `hud.action(action, ...args)`
emits `{action, args}`, `src/modules/ui/hud.js:382`), `sim:tick`, `buildings:changed`, `roads:changed`, `zones:changed`,
`services:changed`, `terrain:changed`, `time:hour`.

**Synchrony contract for `ui:action` (load-bearing — criteria 1 and 15 depend on it).** The handler must leave
`world.infoview` **fully mutated** — `active`, `data`, `legend`, `desaturation`, `version` — **before it returns**.
`hud.setInfoview()` calls `this.action('infoview', v)` at `hud.js:953` and `this._renderLegend()` at `hud.js:957`,
four lines later on the same synchronous call stack, and `_renderLegend()` reads `this.ctx.world.infoview?.legend`
at that moment (`hud.js:963`). Deferring the grid or legend build to the next frame renders a stale or empty legend
and fails criterion 15. So: recompute synchronously (≤ 12 ms, §5), or serve a cached grid for the view being
activated and recompute in the background **only** for grids that are not the active view.

### 2.1 Where every grid comes from (the derivation table)

This is the part that decides what every frame looks like, so it is not a builder choice: two builders working from
the same words must ship the same heatmap. All 12 grids are 256², cell 8 m, values clamped to `[0,1]`, row-major
`[iz][ix]` — the same layout and the same cell size as
`ctx.modules.simulation.grids()` (`{size:256, cellSize:8, ground, air, noise, landValue}`), so grid-sourced views
are a per-cell copy with **no resampling**.

**The splat kernel is fixed for the whole module** — reuse the one `src/modules/simulation/grids.js:38` already uses,
so infoviews and simulation agree on what a "hotspot" looks like:

```
for each source at world (x,z) with amplitude A and radius R metres:
  for every cell whose centre is within R:  d2 = (dist/R)^2;  if (d2 >= 1) continue
  grid[iz*256+ix] += A * (1 - d2) * (1 - d2)          // accumulate, do not max()
then: grid[i] = clamp01(grid[i])
```

**Normalisation is fixed, never adaptive.** The stored grid value is always `0..1`; the "Domain" column says what
that `0..1` *means*, and that meaning is what `views[i].min`/`views[i].max` publish to the legend. The domain is a
**constant per view** — never renormalise to the current recompute's min/max, or the legend labels and the ramp
colours drift from hour to hour and criterion 3's night parity fails for a reason that has nothing to do with
lighting.

`B` = the building records that have real coordinates: `ctx.modules.simulation.building(b.id)` for each
`b` of `world.buildings.items.values()`, **skipping any record whose `x`/`z` is `NaN`** (virtual buildings,
`economy.js:170/178`). `S(kind)` = `world.services.coverage(kind,x,z)` when `world.services.items.size > 0`,
otherwise the deterministic 8-source fallback of criterion 12 splatted with `R = 260 m`.

| # | id | Source expression (value at the splat centre, before clamp) | Splat R | Domain (fixed) | High means |
|---|---|---|---|---|---|
| 1 | `traffic` | `ctx.modules.traffic?.flowGrid?.()` if present (copy, it is already 256²). Else per edge: `cong = clamp01(betweenness(e) / (types[e.type].lanes * 380) * activity(hour))`, `activity` = `ctx.modules.simulation.activity(hour)`; splat along the polyline from `world.roads.sample(e.id,t)` at 4 m steps | `types[e.type].width/2 + 6 m` | 0 = free flow, 1 = gridlock | congestion |
| 2 | `landvalue` | per-cell copy of `grids().landValue` | — (no splat) | 0..1 | value |
| 3 | `pollution` | per-cell `min(1, grids().ground + grids().air)` (the same expression `simulation.pollutionAt` uses, `index.js:214`) | — | 0..1 | dirty |
| 4 | `happiness` | **no per-location source exists** — `services()` is city-wide and the building record has no `happiness` field. Derive per building from the terms `economy.js:318-321` uses globally: `h = clamp01(world.economy.happiness + 0.14*(r.education-0.5) + 0.12*(r.health-0.5) + 0.10*(r.parks-0.5) - 0.16*(r.crime-0.5) + 0.10*(r.landValue-0.5) - 0.22*r.pollution - 0.10*r.noise)` for `r` in `B`. No simulation → `clamp01(0.5 + 0.6*(landValue - pollution))` per cell from the fallback grids | 90 m | 0 = unhappy, 1 = happy | happy |
| 5 | `education` | `r.education` for `r` in `B` | 90 m | 0..1 | schooled |
| 6 | `health` | `r.health` for `r` in `B` | 90 m | 0..1 | healthy |
| 7 | `fire` | `r.fireRisk` for `r` in `B` | 90 m | 0..1 | hazard |
| 8 | `crime` | `r.crime` for `r` in `B` | 90 m | 0..1 | crime |
| 9 | `power` | `max(S('power_coal'), S('power_wind'), S('power_solar'))` on a cell lattice, then `min` with `r.power` at building cells | 260 m | 0..1 | powered |
| 10 | `water` | `max(S('water_pump'), S('sewage'))` on the lattice, then `min` with `r.water` at building cells | 260 m | 0..1 | supplied |
| 11 | `garbage` | **no per-building field either.** `load` = splat of `(r.occupants + 0.5*r.jobs) / 40` from `B`; `collect` = `max(S('landfill'), S('incinerator'))`; value = `clamp01(load - collect)` | load 70 m, collect 260 m | 0 = clean, 1 = piling up | uncollected |
| 12 | `density` | `(b.occupants / (b.footprint.w * b.footprint.d)) * 10000 / 250` — residents per hectare normalised to a fixed **250 res/ha** full scale — for `b` in `world.buildings.items` | 60 m | `1.0` = 250 res/ha | dense |

Polarity must match `ui/hud.js` INFOVIEWS (`hud.js:67`), which is where the player reads the words: `fire` is
`Safe → Hazard`, `crime` is `Safe → Crime`, `garbage` is `Clean → Piling up`, `pollution` is `Clean → Polluted`.
Those four ramps run low-good to high-bad; the other eight run low-bad to high-good.

`coveredFraction`, graded by criterion 12, is defined once: the **city mask** is every cell whose centre is within
120 m of any `world.roads.edges` polyline; `coveredFraction = (cells in the mask whose *service term* ≥ 0.5) /
(cells in the mask)`. The service term is the row's value for `power`, `water`, `education`, `health`, and is the
*inverse* of the displayed value for `fire` and `crime` (`1 - value`) and the `collect` term for `garbage` — i.e.
it is always "how well served", never "how bad it is".

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

**Secondary references.** `$REF/cs2_1.jpg`: a translucent overlay done right — the blue road-preview film hugs the
carriageway and the grass without a z-fighting fringe, and the purple building film keeps every window line legible
underneath it. That is the alpha level to aim for on building tint: a film, `a` in `[0.55, 0.75]` (criterion 7),
not paint. `$REF/cs2_2.jpg`: at
aerial distance the overlay must still obey aerial haze — data far away fades toward the sky colour like everything
else, otherwise the overlay looks pasted on the lens. `$REF/cs2_4.jpg`: at street level, colour must not swallow the
kerb, crosswalk and lane markings — the overlay is a film over them, sidewalk geometry still reads.

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

1. **All 12 views exist and switch cleanly.** `api.views().map(v => v.id)` deep-equals, in this order,
   `['traffic','landvalue','pollution','happiness','education','health','fire','crime','power','water','garbage','density']`
   (the ids in `src/modules/ui/hud.js` INFOVIEWS). For each id, `events.emit('ui:action',{action:'infoview',args:[id]})`
   leaves `world.infoview.active === id`, `world.infoview.data instanceof Float32Array` with `length === 65536`,
   `world.infoview.legend` with `title`, `description`, `colors.length >= 3`, `min`, `max`, and `stats` holding 3–6
   entries; `infoview:changed` fires once; `__sim.errors` stays `[]` across all 12. Probe:
   `shots/infoviews/rN/apicheck.mjs`.
2. **No degenerate grid.** For each of the 12 grids, read `api.stats(id)` directly — no hand-recomputed percentiles:
   `min >= 0`, `max <= 1`, `p95 - p5 >= 0.25`, and the fraction of cells within ±0.02 of `mean` `<= 0.60` (counted
   from `api.grid(id)` by the probe). A view that is a constant field, or that is zero everywhere because a
   dependency is a stub, fails this item — §2.1 names the source and the kernel for all 12, and criteria 12 and 18
   give the required fallbacks; there is no view for which "no data was available" is an accepted answer.
3. **Data colour does not change with the sun (night parity).** **Pass condition:** in `iv_pollution_12.png` vs
   `iv_pollution_22.png`, over the 2000 highest-value overlay pixels (mask per §4 preamble), the mean per-channel RGB
   differs by `<= 8/255`; same test on `iv_landvalue_12/22`; and night overlay p99 luminance `<= 235` (it must not be
   additive and must not trip the effects bloom threshold). **Also record, as a diagnostic and not a pass condition,**
   the drop in mean luminance of the non-overlay pixels between 12 and 22. That number is owned by `environment` and
   `effects`, whose night is a live open weakness (`environment_r2` issue 4, `effects_r1` issue 2) and which this
   module may not edit. If the drop is `< 35 %`, log it in `docs/core-requests/infoviews.md` as an
   environment/effects finding — it is **not** an infoviews fail.
4. **The ground layer conforms to the terrain.** Probe 2000 points on the ground overlay's surface against
   `world.terrain.getHeight(x,z)`. The band is split by local relief, because the §6 ridge-crest fix (take the max of
   the vertex height and the four 4 m midpoints) legitimately lifts the surface further on a slope and the two must
   not contradict each other:
   - On points whose **local terrain range < 0.5 m** (max − min of `getHeight` at the vertex and its four 4 m
     midpoints): `>= 99.5 %` sit between **+0.05 m and +0.60 m** above `getHeight`.
   - Everywhere else: above the terrain at every point, and `<= 1.5 m` above it.
   - **No point may sit below the terrain anywhere**, in either band. Report the two populations separately.

   In `iv_pollution_12.png` and `aerial_12.png` there is no stipple, dashed fringe or flicker where the overlay meets
   road edges, kerbs or the zoning overlay: `depthWrite:false`, `polygonOffset` on, and a stated render order above
   `RENDER_ORDER.MARKINGS` (21) and below `RENDER_ORDER.TRANSPARENT` (100).
5. **Saturated data over an unsaturated world.** In `iv_pollution_12.png`, mean HSV saturation of the top-decile-value
   overlay pixels `>= 0.45`, and `>= 2.0 ×` the mean saturation of an equal-area random sample of **non-overlay
   pixels** in the same frame (both populations per the §4 mask; same pixel count, seeded sample). In
   `iv_power_12.png` the same holds for the covered plateau.
6. **A readable ramp, not a wash.** The ramp sampled at 0, 0.25, 0.5, 0.75, 1.0 gives five colours whose adjacent
   pairs differ by `>= 40/255` in max-channel distance, and `iv_landvalue_12.png` contains `>= 5` distinguishable
   value bands across the staged city, measured this way: convert every **overlay-mask** pixel to CIE L\*, quantise
   into **8 equal-width buckets over L\* ∈ [0,100]** (0–12.5, 12.5–25, … 87.5–100); **at least 5 of the 8 buckets each
   hold `>= 2 %` of the overlay pixels.**
7. **Buildings are tinted as films with their volumes intact.** With `landvalue` active, `>= 90 %` of
   `world.buildings.items` return a tint from `world.infoview.buildingTint(id)` with `a` in `[0.55, 0.75]` (matches
   §3's film reference; above 0.75 the facade stops reading through). Tint faces are shaded by a fixed top-light term
   (`mix(0.72, 1.0, saturate(N·up))`), never by the sun, so criterion 3 holds on buildings too — which means a single
   planar facade is deliberately flat, exactly as cs2_7's yellow factories are. The volume therefore has to come from
   the **step between faces**, and that is what is graded: in `iv_landvalue_12.png`, on the **10 tinted buildings with
   the largest screen footprint** (list their ids in the build report), the mean luminance of a building's roof pixels
   and of its wall pixels differ by `>= 25/255`. Roof and wall pixels are located mechanically, not by eye: project
   the building's roof rectangle (`x, z, footprint, heading, height`) and its camera-facing wall quad through
   `ctx.camera.camera` to screen space, erode each polygon by 3 px, and take the overlay-mask pixels inside. Same
   check on `iv_density_12.png` as a confirming crop. One `InstancedMesh`, `castShadow = false`,
   layer `LAYERS.NO_SHADOW` (9), shell scaled 1.02× so it never z-fights the facade.
8. **Tint is ordered and varied.** Across the staged stock, `>= 6` distinct tint colours; Spearman correlation between
   each building's value and its position along the ramp `>= 0.95`; no run of `>= 8` adjacent buildings sharing an
   identical tint unless their values are genuinely equal.
9. **Network views colour the roads themselves.** With `traffic` active, ribbons are generated from
   `world.roads.sample(edgeId, t)` at `<= 4 m` steps, width `= types[type].width × 0.62`, laid `0.30 m` above the
   sampled road surface. Ribbons stop at `trimA/trimB`, never overshoot into the intersection box.
   **Graded by probe, not by eye:** take the intersections from `ctx.modules.roads.intersections()` — each returns
   `{id, x, y, z, roundabout, arms:[{edgeId, dir, trim, width, …}]}` (`src/modules/roads/build.js:1231`) — and use the
   first 20 in id order. For each arm, walk `world.roads.sample(arm.edgeId, t)` outward from the trim point for 30 m
   at 0.5 m steps and test each sample point against the ribbon geometry's vertex ring: **no gap in ribbon coverage
   longer than 0.5 m along any arm.** Probe: `shots/infoviews/rN/network.mjs`. Plus, in `iv_traffic_12.png`:
   `>= 3` colour classes visible on the network, the ribbon follows every curve, and one confirming crop of a
   3-arm intersection at `<= 120 m` showing no un-ribboned wedge.
10. **Water is not painted.** **Graded by probe:** call `api.groundAlphaAt(x,z)` at 200 points where
    `world.terrain.isWater(x,z)` is true — **all `<= 0.15`** — and along 10 shore transects crossing the waterline
    (sampled at 1 m steps for 8 m either side), the alpha ramp over the **8 m transition band** is monotonic
    (no hard cut-out, no ring). Alpha is not readable
    from a PNG, so the image is the confirming evidence only: `iv_power_12.png` (near-top-down, the river and coast
    in frame) must read as water, not as painted heatmap.
11. **Aerial haze applies.** The overlay materials have `fog: true` and are re-synced when `scene.fog` changes: in
    `iv_power_12.png`, mean HSV saturation of the overlay pixels whose camera distance (from
    `iv_power_12_dist.json`, §4 preamble) is `>= 900 m` is `<= 0.75 ×` that of the overlay pixels at `<= 200 m`.
    Both bands must hold `>= 2000` pixels for the comparison to count; if `iv_power`'s framing does not supply them,
    say so and use `skyline_12` instead. The overlay must fade with distance like the world, not float in front of it.
12. **Coverage views are never a uniform frame.** For `power`, `water`, `garbage`, `education`, `health`, `fire`,
    `crime`: `api.stats(id).coveredFraction` in `[0.25, 0.80]`, with `coveredFraction` computed exactly as §2.1
    defines it (service term `>= 0.5` over the 120 m road mask). When `world.services.items.size === 0` (the `services`
    module is currently a stub), the showcase synthesises 8 deterministic sources from `rng.fork('svc-fallback')` on
    staged road frontage. `iv_power_12.png` shows serviced areas as bright plateaus with a 12–25 m soft edge,
    unserved buildings in the ramp's low colour, and `>= 6` source markers.
13. **Legend panel matches cs2_7.** Own DOM under `#ui`, shown only when `!ctx.modules.ui`. Contains: title row with
    the view icon, one-line description, a gradient bar built from `legend.colors`, min/max end labels, and 3–6
    right-aligned stat rows. Panel `<= 380 × 300 px` at 1920×1080; 11–13 px type; dark translucent
    (`rgba(14,20,30,0.82)` or similar) with a blue accent. Verified in `iv_legend_12.png`.
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
17. **Overlay draw calls.** Probe the drawCall delta across activate/deactivate over 2 frames: `<= 8`, split
    ground `<= 5` (ARCHITECTURE §15), building tint `= 1`, network `<= 2`. `api.overlayDraws()` reports the same
    number. Triangles added `<= 260 000`.
18. **Degrades without its dependencies.** `node tools/screenshot.mjs --showcase infoviews --modules environment,terrain,infoviews --camera aerial --time 12`
    gives `errors: []`, `modules.infoviews.status === 'ready'`, a non-empty coherent heatmap over the terrain, and a
    legend. Same with `--modules environment,terrain,roads,infoviews`. No dependency may be called without an
    optional-chained guard (§7).
19. **Determinism.** Two runs at the same seed produce identical grids: the sum of each view's grid to 6 decimals is
    equal across runs — the probe writes all 12 sums, a second run at the same seed writes them again, and the two
    files must match. (The `Math.random` ban and the `Date.now()` rule are BUILDER.md engineering rules and a
    CRITIC.md grep; they are not restated here.)
20. **Frame cost.** With a view active, `__sim.stats().moduleMs.infoviews` averaged over 60 frames `<= 2.0 ms`;
    with no view active `<= 0.05 ms`. A full 256² grid recompute `<= 12 ms` and happens at most once per game hour or
    on a `*:changed` event (coalesced by `>= 0.1 s`), never per frame. JS heap growth `<= 2 MB` over 300 frames with a
    view active (no per-frame allocation).
21. **Transitions.** Switching `pollution → landvalue` cross-fades in 0.20–0.40 s; no frame shows both ramps composited
    and no frame goes white. Probe: sample `material.uniforms.uMix` (or equivalent) over the transition — monotonic
    0 → 1, never > 1.
22. **Save/load.** `api.serialize()` returns `{active:'crime'}` after selecting `crime`; `api.deserialize({active:'crime'})`
    on a fresh page restores the active view, its grid and its legend within 2 frames; `deserialize(null)` and
    `deserialize({active:'nonsense'})` are no-ops that log a warning and throw nothing.
23. **Zero console errors** in all 16 gauntlet shots, all 6 declared preset shots at 12 and 22, the 720p shot and the
    `--showcase all` shot; `modules.infoviews.status === 'ready'` in every one.

---

## 5. Budget

| Metric | Ceiling | How it is checked |
|---|---|---|
| Declared `budget.drawCalls` | **8** (ground ≤ 5, building tint 1, network ≤ 2) | activate/deactivate drawCall delta probe (criterion 17) |
| Declared `budget.triangles` | **260 000** (ground grid 257² = 131 072; tint shells 12 tris × ≤ 1200; ribbons ≤ 40 000) | probe delta |
| Whole staged showcase frame | ≤ 700 draw calls, ≤ 2.5 M triangles at `iv_power_12` | `summary.json` — the host city's draws belong to `terrain`/`roads`/`buildings`, not to this budget; state that split in your build report |
| Texture memory | ≤ 12 MB: 12 × 256² R32F data textures (3 MB) + 12 × 256×1 sRGB ramp LUTs + one 256² noise. No PBR sets, no HDRIs, no downloads | `stats().textures` delta ≤ 26 |
| `update()` | ≤ 2.0 ms active, ≤ 0.05 ms inactive | `stats().moduleMs.infoviews` |
| Grid recompute | ≤ 12 ms, ≤ 1 per game hour | `api.recompute()` returns ms |
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
- **Uniform frames from stub dependencies.** `services` and `traffic` are stubs today: `world.services.coverage()`
  returns `0` and there is no `flowGrid()`. Without the fallbacks in §2.1, criterion 12 and §7, every coverage view
  and the traffic view render one flat colour — and criterion 2 fails on all of them.
- **Per-pixel static.** `environment_r2` hit this by hashing an interpolated varying. Hash grid indices in JS at
  recompute time, not screen-space derivatives in the fragment shader.
- **Rebuilding geometry on every view change.** Switching views must upload one 256² data texture and swap one ramp
  LUT; regenerating the ground mesh per switch blows criterion 21's transition and the 2 ms budget.
- **A legend built one frame late.** Deferring the grid or legend build to the next frame leaves the `ui` legend empty,
  because `hud.setInfoview()` re-renders on the next statement after emitting `ui:action`. See the synchrony contract
  in §2; criterion 15 grades it.
- **A per-recompute renormalised ramp.** Rescaling a grid to its own current min/max makes the legend's `min`/`max`
  labels and the colours drift hour to hour, and breaks criterion 3's night parity for a non-lighting reason. §2.1
  fixes one domain per view.

---

## 7. Dependencies and their real APIs

`dependencies: ['roads', 'zoning', 'buildings', 'simulation', 'services']` (ARCHITECTURE §15). `ui` is deliberately
**not** a dependency, so the showcase is judged on this module's own panels. Every call below is optional-chained.

**`simulation`** (`ctx.modules.simulation`, real, score 6.5) — primary data source:
- `grids() -> { size:256, cellSize:8, ground, air, noise, landValue, version, index(x,z), sample(name,x,z) }`
  (also at `world.economy.grids`). Grids are recomputed once a game hour and are stateless in the inputs.
- `landValueAt(x,z)`, `pollutionAt(x,z)`, `noiseAt(x,z)`.
- `building(id) -> {type,density,level,capacity,occupants,jobs,education,health,crime,fireRisk,parks,power,water,pollution,noise,landValue,x,z}`
  — **records for virtual buildings have `x`/`z` = `NaN`; skip them.**
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
8-source fallback of criterion 12. Kinds are `world.services.kinds` (17 entries; `park_small`, `park_large`, `plaza`,
`school`, `high_school`, `university`, `clinic`, `hospital`, `police`, `fire`, `power_*`, `water_pump`, `sewage`,
`landfill`, `incinerator`).

**`traffic`** (STUB today) — use `ctx.modules.traffic?.flowGrid?.()` (256², ARCHITECTURE §15) and
`world.traffic.stats.congestion` when present. Otherwise compute congestion deterministically from the road graph
with the exact expression in §2.1 row 1 (edge betweenness ÷ `types[type].lanes` capacity × `simulation.activity(hour)`,
splatted along `roads.sample` at 4 m steps). Repeat the formula in a comment at the call site.

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
4. Services: `ctx.modules.services?.place?.()` for 8 kinds if the module is real, else the deterministic fallback
   sources of criterion 12 at: power (−380,+340), water pump (+250,−330), clinic (−80,+120), school (+120,+60),
   police (−200,−180), fire (+300,+220), large park (−120,−300), landfill (+420,+380).
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

**How it must read.** Critics shoot `aerial, street, skyline, closeup × 06.5, 12, 17.5, 22`, plus the six presets at
12 and 22, plus `iv_legend` at 1280×720.

- **aerial (520 m)** — the whole staged city with the `landvalue` field draping the relief; ≥ 5 value bands; roads and
  building tints legible; water unpainted; the far edge hazed like the rest of the world.
- **street (60 m)** — the film reads as a film: kerbs, crosswalks and lane markings still visible through the ground
  layer, building tint keeps window lines (cs2_1), no z-fight fringe along the kerb at grazing angle.
- **skyline (900 m, pitch 0.16)** — the tinted towers stand as coloured volumes against the sky; the ground layer
  compresses to a legible gradient rather than a single smear; legend and picker do not collide with the horizon
  content.
- **closeup (110 m)** — one block: individual building tints differ from their neighbours (criterion 8), the ramp is
  identifiable without the legend.
- **06.5 / 17.5 (golden hour)** — the data colour is unchanged from noon; only the untinted city warms. No cream haze
  over the overlay, no blown highlights on the bright end of the ramp.
- **22 (night)** — the city goes dark, the overlay does not (criterion 3). No bloom halo on the overlay, no glow around
  markers, legend and picker still at full contrast.
