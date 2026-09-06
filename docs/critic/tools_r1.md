# tools — critic round 1

**Score 5.5 / 10 — FAIL.**
One-line reason: the tool overlay has real craft in its chips, its guide dashes and its zone brush, but the
ghost ribbon is a 16 %-alpha glass wash instead of CS2's opaque paint band, it covers a third of the frame instead of
a tenth, the staged district is an empty road grid with **zero buildings**, only **4 of the 6 required poses** exist,
and the published api is missing **12 of the 24 contract functions** — including `stats()`, `commit()`, `pointer()`
and a `cropRects()` that publishes the wrong landmarks, which makes four of the graded acceptance items unmeasurable
by the mechanism the spec pins them to. Two overlay meshes also miss `LAYERS.HELPERS` and will show up in water
reflections.

---

## Numbers

| | |
|---|---|
| Console errors | **0** in every shot and every probe (`shots/tools/r1/apicheck.mjs`, `probe2.mjs`, all `*.json`) |
| Module status | `ready` in every shot (`shots/tools/rdev1/*.json`, my own runs) |
| `initMs` | 4 ms (budget ≤ 400) ✓ |
| `moduleMs.tools` | 0.3 ms idle-with-pose (budget ≤ 1.2 / ≤ 0.6) ✓ |
| Declared `budget` | `{drawCalls: 12, triangles: 90_000}` — spec §5 requires **20 / 40 000**. Triangle ceiling is 2.25× over the declared limit. ✗ |
| **Measured tools-group draw calls** | **6** (target ≤ 12) ✓ — group-visibility diff, `probe2.json` `drawCallsWith 55 → without 49` |
| **Measured tools-group triangles** | **3 576** (target ≤ 20 000) ✓ |
| Geometry allocations over 200 pointer drags | **0** ✓ (`probe2.json geoDelta: 0`) |
| Whole showcase frame (observation only) | 50–87 calls / 0.31–0.70 M triangles — well inside everything, because the district is nearly empty |
| DOM children after init | **+1** (`#sbt-hud`) plus `#sbt-style` in `<head>` — spec §7 says tools creates **no** DOM ✗ |
| `dupSelectEmits` | **2** for two identical `select('road',{type:'street'})` — de-duplication absent ✗ |
| `tool:preview` emissions for 200 `pointer`/`setHover` calls | **0** — the event is only ever emitted once, on commit ✗ |
| `LAYERS.HELPERS` violations | **2 meshes** off layer 8 → they render into the water planar reflection ✗ |
| `Math.random` in `src/modules/tools/` | none ✓ |
| `git status` scope | clean w.r.t. this module; the builder touched only `src/modules/tools/`, `docs/builds/`, `docs/core-requests/tools.md`, `shots/tools/` ✓ |

---

## Per-shot notes

Every image below was opened with the image reader.

My own runs (`shots/tools/r1/`), taken with `tools/screenshot.mjs` against the running dev server. The box was
carrying 8 concurrent Chromium captures from other agents (load average 25, ~4–8 min per 1080p frame), so the full
16-frame gauntlet was abandoned after the first frame and replaced with a targeted set covering the graded
conditions; that decision is stated here rather than asked about.

- `shots/tools/r1/aerial_12.png` — visually indistinguishable from the builder's `rdev1/aerial_12.png` at the same
  seed, and the probe counts match exactly (edges 62 / nodes 40 / zone cells 294), which is the determinism evidence: a bare road grid on grass, no buildings, four poses, a 150 m coverage
  ring whose bounding box alone covers ≈ 25 % of the frame, eight chips. All measurements above are from this file.
- `shots/tools/r1/closeup_12.png` (+ `.crops.json`) — **caught the boot splash**. The run itself was valid
  (`status: ready`, `drawCalls 56`, `triangles 620 853`, `errors: []`) but the captured pixels are the
  `SIMBUILD / LOADING` overlay: the box was carrying 8 concurrent Chromium captures from other agents
  (load average 25, 10+ min per 1080p frame) and a concurrent Vite reload beat `screenshot.mjs`'s `#boot.hidden`
  re-wait. That is a harness/contention artifact, **not** a tools defect, and it is not counted against the module.
  Its `crops.json` is empty (`rects: {}`) for the same reason and is not used as evidence; the `crops.json` that
  matters is the 720p one below.
- `shots/tools/r1/closeup_12_720.png` (+ `.crops.json`) — 1280×720. Four chips, all 23–24 px tall, the `∠ 45°`
  pill sitting flush against x = 0 with its left border on the viewport edge. The ghost plus guide band covers
  roughly 45 % of the frame; the blue road-selection ribbon extends about half a lane past the asphalt on each
  side. Criterion 4 wants `chipRects.length ≥ 5` with the `closeup` camera live; there are 4.
- The remaining 720p frames (`closeup_22_720`, `street_6p5_720`, `toolspreset_12_720`) did not complete inside the
  round: the shared box stayed at load average ~25 for the whole session with eight other agents' captures queued,
  and a single 720p frame was taking 30+ minutes. Stated rather than asked. The night and golden-hour reads in this
  report therefore come from the builder's own full-matrix `rdev1` frames, which are the same build at the same
  seed and which I verified reproduce identically (`r1/aerial_12.png` vs `rdev1/aerial_12.png`).

Builder-produced frames I also read in full, because they are the same build and the same seed and they cover the
whole matrix (`shots/tools/rdev1/`, `shots/tools/dev_*`):

| file | what I actually saw |
|---|---|
| `rdev1/aerial_12.png` | An empty road grid on bare grass. **No buildings anywhere.** Four poses visible — road ghost, zone brush (a ~18-cell green patch), service ghost, red invalid ghost. No sculpt pose, no bulldoze pose. A 150 m coverage ring sweeps across half the frame as a giant pale-cyan ellipse. Chips read well. |
| `rdev1/aerial_6p5.png` | Same, warm. The ghost is grey-blue, not neutral white — it takes its colour from whatever is under it. |
| `rdev1/aerial_17p5.png` | The ghost nearly disappears into the hazy ground; the white rim lines are the only thing holding it. |
| `rdev1/aerial_22.png` | Calm at night — nothing glows, no bloom skirt (there is no `effects` in this showcase). The coverage ring still dominates. |
| `rdev1/closeup_12.png` | The hero frame. The ghost is a **translucent veil** — grass texture and lane markings read straight through it — with two thin white rim lines and a dashed centre. Overlay covers ≈ 40 % of the frame. Compare `$REF/cs2_1.jpg`, where the ribbon is opaque paint hiding the surface and the whole overlay is ≈ 12 % of pixels. |
| `rdev1/closeup_6p5.png` | Ghost picks up the amber/green of the ground through it; reads tinted, not neutral. |
| `rdev1/closeup_17p5.png` | Lowest contrast of the set: ribbon and ground are nearly the same luminance. |
| `rdev1/closeup_22.png` | Ghost stays calm; white rims are the brightest thing but do not clip or bloom. |
| `rdev1/street_12.png` / `street_6p5.png` / `street_22.png` | The `street` core preset frames empty grass with an enormous ghost band across the whole viewport; the blue road-selection ribbon is drawn noticeably wider than the asphalt it highlights. |
| `rdev1/skyline_12.png` | **Zero chips** — all culled at 640 m. The district reads as a wireframe test scene: bare grid, one green patch, one huge cyan ellipse. |
| `rdev1/skyline_6p5.png` / `skyline_22.png` | Chips *do* appear here at the same camera, and **overlap badly**: `∠ 45°` is completely hidden behind `avenue · 80 m`, and `↔ 11…` is cut in half by `Cannot end in water`. Chip visibility at the same preset is inconsistent between times. |
| `dev_tools_12.png` / `dev_tools_17.5.png` | The module's own `tools` preset — the best read of the build. Guide dashes beyond the cursor are genuinely CS2-like; the chips are genuinely CS2-like; the zone brush is genuinely CS2-like. The service "footprint" is a wireframe bracket cage floating over the ground, not a filled rectangle. Where the ghost crosses the selected avenue it turns **blue**, because the selection ribbon shows through it. |
| `dev_closeup_17.5.png` | **Chips clipped by the viewport edge**: a pill at x = 0 shows only `low` / `m²`, and a red pill at the right edge is cut in half. The cull test in `chips.js:96` tests the *anchor* point, not the pill box, so a wide pill still overhangs. |

---

## Pinned crops

`api.cropRects` exists but does not implement the contract. Spec §2 requires `{ribbon, ground, wash}` — a 64×64 box
centred on the ghost ribbon, the same box one ribbon-width to the side, and a 32×32 box on the affected-area wash
centroid. The code (`src/modules/tools/index.js:389-406`) can only ever return `{ghost, selection}`, and what
`screenshot.mjs --crops` actually wrote is:

```
shots/tools/r1/closeup_12_720.crops.json  →  { "tools.ghost": [-312, 436, 1736, 158] }
shots/tools/r1/closeup_12.crops.json      →  { }          (that run caught the boot splash — see below)
window.__sim.cropRects() in the api probe →  cropRectsKeys: []
```

The one rect that did come out is the **bounding box of the whole preview path**, not a landmark box: on a
1280×720 frame it is 1736 px wide starting at x = −312, i.e. **it hangs 312 px off the left edge and 456 px off the
right**, and its area is 30 % of the frame. It is unusable as a measurement rect — and, incidentally, it is the
cleanest possible statement of the restraint problem in issue 8.

Consequence, stated plainly: **criteria 4, 6, 21 and 22 cannot be measured by the mechanism the spec pins them to.**
Per CRITIC.md that is a builder defect, not a reason to pass the items unmeasured — they are recorded as failed,
and the numbers below were taken from hand-placed rects instead, which is exactly what `--crops` exists to avoid.

### Hand-placed measurements (full-resolution `shots/tools/r1/aerial_12.png`, 1920×1080, noon)

Two 48×28 boxes, one inside the ghost ribbon over grass and one the same size a ribbon-width to the side of it:

| | ribbon `[872,688,48,28]` | ground `[872,762,48,28]` |
|---|---|---|
| luminance p1 / p50 / p99 | 74.9 / **150.2** / 250.2 | 87.2 / **95.1** / 146.8 |
| saturation p50 / p90 | **0.154** / 0.203 | 0.055 / 0.256 |
| hue p50 | **146°** (green) | 80° |
| clipped (≥250) | 2.1 % | 0 % |

- **Ribbon-to-ground luminance ratio = 150.2 / 95.1 = 1.58** at noon. Criterion 6 wants the ground ≥ 2.5× darker
  than the ribbon and the 17.5 note wants ≥ 2.0; at 17.5 (`rdev1/closeup_17p5.png`, `street_17p5.png`) it is
  visibly lower still.
- **Ribbon saturation p50 0.154 at hue 146°** — criterion 22 requires ≤ 0.10 and neutral. The ribbon is literally
  green, because it is a 16 %-alpha wash and the grass shows through it.
- The decisive number: the **same ribbon** samples `(121,152,134)` → luminance ≈ 144 where it lies over grass, and
  `(25,35,45)` → luminance ≈ 34 where it lies over the asphalt of the avenue it crosses. A 4.2× swing driven
  entirely by what is underneath it. CS2's ribbon in `$REF/cs2_1.jpg` is the same white over grass, over the
  roundabout island and over the carriageway, because it is opaque.
- Red invalid ghost `[1272,500,28,90]`: luminance p50 85.5, saturation p50 0.512, hue 22°. The road's markings read
  straight through it; criterion 8 wants the whole ghost at `#E5484D` ≥ 0.5 alpha.

---

## API contract, item by item

`ctx.modules.tools` (probe: `shots/tools/r1/apicheck.mjs`). Present keys are exactly:
`beginAt, cancel, controlAt, cropRects, current, deserialize, history, options, pick, redo, select, selectObject,
serialize, setHover, setOption, state, undo`.

| Contract member | Result |
|---|---|
| `select(name, options) -> {tool, options}\|null` | present, **returns a string** (`"road"`). Unknown name `'bogusname'` returned `"select"` — spec requires `null` + a warning; instead it silently activates the select tool. ✗ |
| `setOption(id, value) -> options` | present, **returns `undefined`** ✗ |
| `current() -> {tool, options}\|null` | present, **returns a string** ✗ |
| `options() -> object` | ✓ |
| `pointer(x, z) -> state` | **missing** (there is `setHover`, different name and return) ✗ |
| `pointerNdc(ndcX, ndcY)` | **missing** ✗ |
| `click(button)` | **missing** ✗ |
| `rightClick()` | **missing** ✗ |
| `commit()` | **missing** ✗ |
| `cancel()` | ✓ |
| `state()` | present but a **different object**: `{tool, options, hover, selection, history, tool_state}`. None of `phase`, `points`, `cursor`, `valid`, `reason`, `cost`, `refund`, `affordable`, `snap`, `metrics` exist. ✗ |
| `undo()/redo() -> boolean` | present, **return a label string or `null`** ✗ |
| `history() -> {undo:int, redo:int, entries:[…]}` | present, **returns `{undo: null, redo: null}`** — no counts, no `entries` ✗ |
| `costOf(tool, options, geometry)` | **missing** ✗ |
| `setSelection(kind, id) -> boolean` | **missing** (`selectObject` exists, returns `undefined`) ✗ |
| `clearSelection()` | **missing** ✗ |
| `pickAt(x, z) -> {kind, id}` | **missing** (`pick` exists, returns a much larger record) ✗ |
| `setPreviewVisible(v)` | **missing** ✗ |
| `stats()` | **missing** — so `drawCalls/chips/ghostVerts/poses/ms/ghostLiftMin/ghostLiftMax/chipRects` are all unavailable ✗ |
| `cropRects()` | present, wrong keys, returned `{}` ✗ |
| `_showcasePoses(on)` | **missing** ✗ |
| `serialize()/deserialize()` | present; `serialize()` returns `{selection}` only — spec requires `{options, selection}` ✗ |

Module definition: `dependencies: ['terrain','roads','zoning']` — spec §7 requires
`['terrain','roads','zoning','buildings','props','services','simulation']`. Because `buildings` is not a dependency
it is never initialised in `?showcase=tools` (`src/core/showcase.js:22-30`), which is the direct cause of the empty
district. `budget` is `{12, 90_000}` against the required `{20, 40_000}`.

`ACCEPTED` is not implemented: `S.tools` has `road, zone, terrain, service, prop, bulldoze, select`.
`select('transit')` and `select('infoview')` fall through to the select tool (`index.js:230`) instead of being
stored and forwarded; `select('anything')` never returns `null`.

Ownership: `S.spend()` writes `world.economy.money` directly (`index.js:36-41`). `world.economy` is
`simulation`'s section (`src/core/world.js:89`), and spec §7 says costs go through
`ctx.modules.simulation.spend()` / `.earn()`. `simulation` is not even a declared dependency.

Core request: `docs/core-requests/tools.md` exists and correctly asks for `writeHeights`, `splitEdge`,
`props.place/remove` and a `services` def table. It **does not** contain the item spec §2 makes binding: the
`.api?.` indirection at `src/modules/ui/hud.js:458/518/531`, which is still present and still means the HUD cannot
reach this module at all.

---

## Acceptance checklist

| # | Item | Verdict |
|---|---|---|
| 1 | District built by the tools | **FAIL** — `showcase.js:37-38` calls `R.addNode` / `R.addEdge` directly (the exact grep the spec forbids); zones go through `zoning.bulk`; there are **0 terrain sculpts** and `history()` has no `entries` at all; `world.buildings.items.size = 0` against a required ≥ 30. Counts that do pass: edges 62 ≥ 18, nodes 40 ≥ 16, zone cells 294 ≥ 240. |
| 2 | Ghost conforms, never z-fights, never floats | **FAIL as specified** — the material is right (`transparent, depthWrite:false, polygonOffset:true, -6/-12`, in front of `roads`' `-3/-6`) and no z-fighting is visible in any frame, but the centreline is resampled at **6 m** (`sampleCurve` default, spec ≤ 2 m), the lift is **0.24 m** (`gizmos.js:395`, spec 0.10–0.20), and `stats().ghostLiftMin/Max` do not exist so the pinned check cannot run. |
| 3 | Six posed states simultaneously | **FAIL** — four poses (road, zone, service, invalid). No terrain-sculpt pose, no bulldoze pose. `_showcasePoses` and `stats().poses` do not exist. |
| 4 | Chips legible and correctly placed | **FAIL** — `stats().chipRects` missing; chips are DOM, height **23 px** measured off the live 1280×720 DOM (spec 24–28); with the `closeup` camera live only **4** chips are visible (spec ≥ 5); at `skyline` 6.5/22 two pairs overlap by well over 10 % of the smaller pill (`∠ 45°` fully occluded by `avenue · 80 m`); at `closeup` 17.5 pills are clipped by both viewport edges, and in my own 720p frame the `∠ 45°` pill sits with its left border on x = 0. |
| 5 | Chip content right | **PARTIAL/FAIL** — one length chip for the **whole path**, not one per segment; angle, grade (0.1 %) and a single `¢` cost chip at the cursor node are all correct and correctly placed; `state().metrics` and `costOf` do not exist so the numeric cross-check cannot be run. |
| 6 | Night reads without glowing | **FAIL as specified** — visually correct (nothing clips, nothing blooms, all overlay materials are `toneMapped:false`), but the p50/p99/ratio must be taken inside `tools.ribbon`/`tools.ground` and those rects do not exist; the `--showcase all` bloom on/off diff is likewise unpinnable. |
| 7 | Snapping works and says so | **PARTIAL** — node/edge/angle/grid snapping is genuinely implemented (`tools.js:89-140`) and T-junction splitting works, but the radii are wrong (node 16 m vs 12, min segment 12 m vs 8, angle engages within 8.25° vs 3.5°), there is no cyan ring at 1.5× the disc radius, no snap chip, and `state().snap` does not exist. |
| 8 | Invalid states unmistakable | **PARTIAL** — a real evaluation produces a real red ghost with the real reason chip (`Cannot end in water`) and commit is refused; but the red is a low-alpha striped band, not ≥ 0.5-alpha solid; the grade limit is 13 % not 12 %/8 % highway; there is no ±1024 m rule, no water-crossing-with-elevation rule, no shared-node-angle rule; and there is no `invalid` camera preset. |
| 9 | Undo/redo exact | **FAIL (unverifiable)** — inverse operations exist for roads, zones, terrain, services and demolitions, and the terrain path uses exactly the sanctioned `heights` write + `modify(strength:0)` trick; but with no `click()`/`commit()` the 8-action probe cannot be driven, `history()` reports no counts and no entries, `undo()` returns a string, and there is no stroke coalescing. |
| 10 | Zone-brush preview matches the overlay | **PARTIAL** — 8 m grid ✓, alpha **0.42** ✓, `zonableAt` respected ✓; but the colours are a hand-copied float table (`tools.js:21-26`) that is off the palette in the last bit (e.g. `0x5FD633` vs `0x5fd634`) rather than the palette value exactly, and there is no 0.3 m white brush outline. |
| 11 | Bulldoze marks its victims | **FAIL** — no bulldoze pose, no `bulldoze` camera, and **no buildings to demolish**. In code the marquee draws only an outline; objects inside it get **no** red volume (only the single hovered target gets a cage), and there is no `−N items` chip. |
| 12 | Selection is a real contract | **PARTIAL** — `world.selection` is mutated in place ✓ and one `selection:changed` fires per change ✓ (de-duplicated, verified: 2 identical `selectObject` calls → 1 emit); but `setSelection`/`clearSelection`/`pickAt` do not exist, the payload carries an extra `data` field, and a road selection draws a blue ribbon visibly wider than the asphalt rather than a white 0.9-alpha footprint outline. |
| 13 | Draw calls and per-frame cost | **PASS on the measured figures, FAIL on the declared ones** — 6 calls / 3 576 triangles measured, 0 geometry allocations over 200 drags, `moduleMs` 0.3; but `budget` is declared `{12, 90_000}` instead of `{20, 40_000}`. |
| 14 | Nothing leaks into reflections or shadows | **FAIL** — `ConformDisc` (`gizmos.js:294-300`) never calls `mesh.layers.set(LAYERS.HELPERS)`. The probe found **2 meshes off layer 8** — the terrain-brush ring and the service coverage circle. The planar reflection camera disables exactly that layer (`terrain/water.js:192`), so those two land in the water reflection. This is the `terrain_r1` blocker-1 class of bug. |
| 15 | Preview never survives its tool | **FAIL** — `_showcasePoses` does not exist, so the item's own teardown step is impossible, and the showcase installs a permanent `S._showcaseDraw` composite that keeps every pose live regardless of `select(null)`. `stats().ghostVerts` does not exist. |
| 16 | Event hygiene | **FAIL** — two identical `select('road',{type:'street'})` emit **2** `tool:changed`; `select` emits unconditionally (`index.js:240`). `tool:preview` is emitted **once, on commit** (`tools.js:273`) and never while the preview changes — 200 pointer moves produced **0** emissions, and its payload is `{kind, points:[[x,z]], cost, committed}` rather than `{kind, points:[{x,y,z}]}`. `setOption` correctly emits exactly one ✓. The HUD half is unobservable: the `.api?.` indirection at `hud.js:458/518/531` is unfixed and the core request does not mention it. |
| 17 | Terrain sculpt reads as a brush | **FAIL** — no sculpt pose, no `sculpt` camera, and the knoll the spec asks for at (150, −120) is at **2.3 m**, i.e. never sculpted. The two-ring brush and the signed-delta chip exist in code but are never staged. |
| 18 | Service placement validates against roads | **PARTIAL** — coverage circle ✓ (conformed, 64 segments), road-frontage tie line ✓, a real reject when no road is in reach; but the footprint is a **wireframe bracket cage**, not a filled rectangle, the reason string is `Needs road access` where the spec requires exactly `No road access`, and the coverage ring at 150 m radius dominates every aerial frame. |
| 19 | Degrades cleanly | **PARTIAL** — zero console errors ✓, status `ready` ✓, ghost stays visible ✓, nothing charged ✓, and the prop path correctly gates on `typeof ctx.modules.props?.place === 'function'` ✓. But there is no `commit()`, so `{ok:false, reason}` is never returned; the strings are toasts reading `Prop placement not available yet` and `Service placement unavailable`, neither of which is the exact required `props placement unavailable` / `service placement unavailable`. |
| 20 | Determinism | **PASS (as far as observable)** — no `Math.random` anywhere in the module, the district is authored, and the two runs I made at `seed=1337` produced identical `edges 62 / nodes 40 / zoneCells 294`. The `history().entries` and `state().metrics` halves of the check have no API to read. |
| 21 | 1280×720 holds | **FAIL** — chip height is 23 px at 720p (spec 24–28) and identical to 1080p, so chips are screen-space ✓; but pills are clipped by the viewport edge (visible at 1080p in `dev_closeup_17.5.png`, same cull rule at 720p), and with `tools.ribbon` absent the world-space 0.60–0.72× width ratio cannot be recorded. |
| 22 | Golden hour is not white-out | **FAIL as specified** — nothing clips at 06.5 ✓, but the ghost is a 16 %-alpha wash so it takes on the ground's amber/green rather than staying neutral, and the required `tools.ribbon` / `tools.wash` crops do not exist. |

---

## Ranked issues

### 1 — blocker — The ghost ribbon is glass, not paint
`gizmos.js:21` sets `uFillA: 0.16`. The ribbon body is a 16 %-alpha wash: in `rdev1/closeup_12.png` the grass
texture, the lane markings and the crosswalk bars under the ghost are all fully legible through it, and where the
ghost crosses the selected avenue the ghost itself turns blue because the selection ribbon shows through.
`$REF/cs2_1.jpg` is the opposite: an **opaque near-white band that hides the surface under it**, which is what makes
it read as paint and what makes the alignment legible at a glance. This one number is most of the gap between this
build and the reference. Raise the body to a near-opaque neutral white (linear ≤ 0.70 so criterion 6's bloom
ceiling still holds — that is roughly 196–218/255 encoded), keep `depthWrite:false`, and let the rim be a subtle
brightening rather than the only thing carrying the shape.
Evidence: `shots/tools/rdev1/closeup_12.png`, `shots/tools/dev_tools_12.png`, `src/modules/tools/gizmos.js:21`.

### 2 — blocker — The staged district is empty: no buildings, and it is not built by the tools
`world.buildings.items.size = 0` (`shots/tools/r1/apicheck.mjs`). `buildings` is not in `dependencies`, so
`src/core/showcase.js:22-30` never initialises it; `showcase.js` also never calls `spawnFreeLots`. The result in
`rdev1/aerial_12.png` and `rdev1/skyline_12.png` is a bare road grid on grass that reads as a wireframe test bed,
not a district — and it removes bulldoze's victims entirely (criterion 11). Separately, criterion 1's construction
rule is broken at the root: `showcase.js:37-38` builds every road with `R.addNode` / `R.addEdge` directly, which is
the exact grep the spec says must return nothing. Add `buildings, props, services, simulation` to `dependencies`,
build the district by driving `select/pointer/click/commit`, and call `spawnFreeLots(40)` + `flush()` with the
`≥ 30` assertion the spec asks for.
Evidence: `shots/tools/rdev1/aerial_12.png`, `src/modules/tools/showcase.js:37-38`, `src/modules/tools/index.js:394`.

### 3 — blocker — Twelve of the twenty-four api functions do not exist, and five return the wrong shape
Missing: `pointer`, `pointerNdc`, `click`, `rightClick`, `commit`, `costOf`, `setSelection`, `clearSelection`,
`pickAt`, `setPreviewVisible`, `stats`, `_showcasePoses`. Wrong shape: `select`, `current`, `setOption`, `state`,
`history`, `undo`, `redo`, `serialize`. `cropRects` returns `{ghost, selection}` (and in practice `{}`) instead of
`{ribbon, ground, wash}`. This is not a bookkeeping complaint: without `stats()` there is no `ghostLiftMin/Max`,
`poses`, `chips`, `chipRects` or `ghostVerts`, and without `commit()`/`click()` no undo, cost or validity item can be
driven headlessly — which is why criteria 2, 3, 4, 6, 9, 15, 21 and 22 are recorded as failed rather than measured.
Build the whole surface in §2 verbatim, including the `{tool, options}` / `{ok, ids, cost, reason}` return shapes.
Evidence: `shots/tools/r1/apicheck.mjs` output, `src/modules/tools/index.js:363-408`.

### 4 — major — Only four of the six poses are staged, and three required camera presets do not exist
`showcase.cameras` declares `tools`, `toolsclose`, `toolswide`. The spec requires `roadtool`, `zonetool`, `sculpt`,
`bulldoze`, `service`, `invalid` with the exact positions and targets in §8, and `aerial` must show all six at once.
There is no terrain-sculpt pose and no bulldoze pose anywhere in `composite()` (`showcase.js:129-172`), so the two
tools with the most visible ground gizmos — the two concentric brush rings and the doomed-object volumes — are never
seen in any frame. The knoll at (150, −120) is at 2.3 m, i.e. `terrain` was never driven at all.
Evidence: `shots/tools/rdev1/aerial_12.png`, `src/modules/tools/showcase.js:12-16`, `probe2.json heightAt.knoll`.

### 5 — major — Chips are DOM elements, they overlap, and they clip at the viewport edge
`chips.js` injects `#sbt-style` into `<head>` and `#sbt-hud` into `<body>`. Spec §7 is explicit: tools creates **no**
DOM; every readout is 3D geometry in `ctx.group` so it survives with `ui` absent and is countable in
`renderer.info`. Consequences that are visible, not theoretical: pill height is 23 px (spec 24–28); in
`rdev1/skyline_6p5.png` and `skyline_22.png` `∠ 45°` is completely hidden behind `avenue · 80 m` and `↔ 11…` is cut
in half by `Cannot end in water`; in `dev_closeup_17.5.png` pills hang off both the left and right viewport edges,
because the cull at `chips.js:96` tests the anchor point rather than the pill box; and at `skyline_12.png` all chips
vanish (640 m cull) while at the same preset at 06.5 and 22 they do not. Move them to an instanced quad batch with a
`CanvasTexture` atlas at 2× and resolve overlaps along the anchor's screen normal, capped at 12.
Evidence: `shots/tools/rdev1/skyline_6p5.png`, `shots/tools/dev_closeup_17.5.png`, `src/modules/tools/chips.js:6-70`.

### 6 — major — The brush ring and the coverage circle are not on `LAYERS.HELPERS`, so they enter water reflections
`ConformDisc` (`gizmos.js:294-300`) sets `renderOrder`, `castShadow` and `receiveShadow` but never
`mesh.layers.set(LAYERS.HELPERS)`. My probe walked `ctx.group` and found exactly two geometry-bearing meshes off
layer 8. The terrain planar-reflection camera disables layer 8 and nothing else (`terrain/water.js:192`), so the
sculpt brush ring and the service coverage ring will appear in the water — the same defect class booked as
`terrain_r1` blocker 1. One line each.
Evidence: `shots/tools/r1/probe2.mjs` output `layerShadowViolations: [["layer","Mesh"],["layer","Mesh"]]`.

### 7 — major — `cropRects` returns the wrong landmarks, so four pinned criteria cannot be measured at all
Spec §2 and ARCHITECTURE §8 require `{ribbon, ground, wash}`; `index.js:389-406` can only return
`{ghost, selection}`, and the one rect that ever came out —
`closeup_12_720.crops.json → {"tools.ghost": [-312, 436, 1736, 158]}` — is the bounding box of the entire preview
path, 1736 px wide on a 1280 px viewport, hanging 312 px off the left edge and 456 px off the right. Criteria 4, 6,
21 and 22 all take their statistics inside `tools.ribbon` / `tools.ground` / `tools.wash`; with none of them there is
no honest number for the night p50/p99, the ribbon-to-ground ratio, the golden-hour saturation, the wash hue or the
720p world-space width ratio, and I had to hand-place rects — exactly what `--crops` exists to prevent.
Evidence: `shots/tools/r1/closeup_12_720.crops.json`, `shots/tools/r1/apicheck.mjs` (`cropRectsKeys: []`).

### 8 — major — The overlay has no restraint: the ghost's own bounding box is 30 % of the frame
The module's own `cropRects` measures it for us: the ghost bounding box at `closeup` is 1736 × 158 px on a
1280 × 720 frame — **30 % of the image, with 36 % of its width off-screen**. In `rdev1/closeup_12.png`,
`closeup_17p5.png` and `street_12.png` the ghost plus guide band occupies 35–45 % of the pixels; in every aerial
frame a single 150 m service coverage ring sweeps across the frame as a pale-cyan ellipse whose bounding box alone
is ≈ 25 % of a 1920×1080 image, with no visual anchor to the small wireframe footprint it belongs to.
`$REF/cs2_1.jpg` keeps the entire overlay to ≈ 12 % of the frame and never fights the city: no outlines on
unaffected roads, no gizmos, only the ribbon, the dashes, the discs, the blue wash on the affected roundabout and
six small pills. Narrow the ghost to exactly `world.roads.types[type].width`, draw the coverage ring as a thin
conformed annulus rather than a filled sweep, and add the one reference element that is missing entirely — the
saturated translucent blue wash with a brighter edge over the area the action will change.
Evidence: `shots/tools/r1/closeup_12_720.crops.json`, `shots/tools/r1/aerial_12.png`.

### 9 — major — `tool:preview` is never emitted, and `tool:changed` is not de-duplicated
`tool:preview` appears once in the whole module (`tools.js:273`) and only fires **on commit**, with
`points` as `[[x,z]]` pairs and an undocumented `committed:true`. 200 `setHover` calls emitted **zero**. Meanwhile
`selectTool_` emits `tool:changed` unconditionally (`index.js:240`), so two identical `select()` calls emit twice —
which is exactly the ping-pong the spec's §6 "HUD feedback loop" note warns about, and the reason the de-duplication
rule exists. Emit `tool:preview` throttled to ≤ 20 Hz whenever the preview geometry changes, with the §5 payload,
and compare tool + deep-equal options before emitting `tool:changed`.
Evidence: `shots/tools/r1/probe2.mjs` output `previewEmitsFor200Pointer: 0`; `apicheck.mjs` `dupSelectEmits: 2`.

### 10 — minor — Costs are charged straight to `world.economy.money`, bypassing `simulation`
`index.js:36-41` does `e.money -= n`. `world.economy` is `simulation`'s section; spec §7 routes spend through
`ctx.modules.simulation.spend(a)` and refunds through `.earn(a)`, falling back to "nothing is charged, `affordable`
is true" when `simulation` is absent. As written, `tools` writes another module's world section on every commit and
would double-count the moment `simulation` is in the same showcase.
Evidence: `src/modules/tools/index.js:36-41`, `src/core/world.js:89`.

### 11 — minor — Rule constants and reason strings do not match the spec
Max grade 13 % with no highway exception (spec 12 % / 8 %); min segment 12 m (spec 8 m); node snap 16 m (spec 12 m);
angle snap engages within 8.25° (spec 3.5°); map bound ±1010 m (spec ±1024 m); no water-crossing-unless-elevated
rule; no shared-node-angle-below-25° rule. Reason strings: `Needs road access` (spec `No road access`),
`Service placement unavailable` (spec `service placement unavailable`), `Prop placement not available yet`
(spec `props placement unavailable`). The road price table is 10× the spec's stated assumption
(`street 24/m` = ¢2 400 per 100 m against ¢240).
Evidence: `src/modules/tools/tools.js:14-19,171-174,729`, `src/modules/tools/costs.js:6-13`.

### 12 — minor — Declared budget does not match the spec, and `ACCEPTED` is not implemented
`budget: {drawCalls: 12, triangles: 90_000}` against the required `{20, 40_000}` — the triangle ceiling is 2.25×
too high even though the measured figure (3 576) is far inside it. `select('transit')` and `select('infoview')` are
not accepted, stored or forwarded; they silently activate the select tool, and no unknown name ever returns `null`.
Evidence: `src/modules/tools/index.js:394,228-241`.

### 13 — minor — Ghost sampling and lift are outside the specified bands
`sampleCurve(..., step = 6)` resamples the centreline every 6 m (spec ≤ 2 m); the ribbon lift is 0.24 m
(spec 0.10–0.20 m). No z-fighting is visible at any camera, so this is a tolerance miss rather than a rendering
fault — but at 6 m spacing the ribbon will cut corners on a tight curve over rolling ground.
Evidence: `src/modules/tools/tools.js:34`, `src/modules/tools/gizmos.js:395`.

### 14 — minor — Core request omits the binding HUD item
`docs/core-requests/tools.md` covers `writeHeights`, `splitEdge`, `props.place` and the `services` table, but not the
one §2 makes mandatory: dropping the `.api?.` indirection at `src/modules/ui/hud.js:458/518/531`. Until that is
filed and fixed the HUD cannot reach this module and the HUD half of criterion 16 stays unobservable.
Evidence: `docs/core-requests/tools.md`, `src/modules/ui/hud.js:458`.

---

## Strengths to preserve

- **The chips.** Dark rounded pills, white 600-weight text, a leading stroke glyph, a green money glyph on the cost
  pill, a red-tinted pill for the reason. Side by side with `$REF/cs2_1.jpg` the language is the same; this is the
  single closest thing in the build to the reference and it should survive the move off DOM unchanged.
- **The alignment guide.** A white dashed centre stripe continuing past the cursor across open ground
  (`tools.js:385`) — dash rhythm and width read correctly against `cs2_1`.
- **The zone brush.** Cells on the true 8 m grid, in the zone colour at 0.42 alpha, inside a dashed ring, filtered by
  `zonableAt` so nothing lights outside the buildable band. Closest pose to the reference after the chips.
- **The invalid state is honest.** `findRejected` searches the real map for a real segment that the real evaluator
  rejects, and the chip prints the real reason. No faked red.
- **Snapping is genuinely implemented** — node, edge (with a real T-junction split via `removeEdge` + two
  `addEdge`s), 15° angle including angles relative to roads already at the anchor, and an 8 m grid.
- **Undo has real inverse operations** for every tool including the sanctioned terrain-heights write-back.
- **Cost discipline**: 6 draw calls, 3 576 triangles, zero geometry allocations across 200 drags, `moduleMs` 0.3.
- **Zero console errors and `ready` in every frame and every probe.**
