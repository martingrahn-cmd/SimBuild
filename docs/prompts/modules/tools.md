# Module spec — `tools`

Round 1 of 4. No critic report exists yet; this spec is grounded in ARCHITECTURE §12 (`tools`), §15 (service
placement), the CS2 reference `$REF/cs2_1.jpg` (which *is* the road tool mid-drag), and the failure modes the
`terrain`, `roads`, `environment`, `effects`, `simulation` and `ui` critics have already booked against this codebase.

`$REF` = `/tmp/claude-0/-home-user-SimBuild/c06ed41b-9bdf-5ab7-ace6-40b62a5e4281/scratchpad/ref`.

---

## 1. Purpose

Without `tools` the world is read-only: nothing in SimBuild can draw a road, paint a zone, sculpt a hill, demolish a
block, place a service or select an object, and the CS2-defining moment — a white ghost road with live length /
angle / grade / cost readouts snapped to the network before you commit it — never happens.

## 2. World data owned

`tools` owns exactly one world section (ARCHITECTURE §3), copied verbatim:

```js
selection: { kind:null, id:null }, // owner: tools
```

`kind ∈ 'building'|'road'|'node'|'prop'|'service'|'lot'|'zone'|null`; `id` is that section's key (`null` when
`kind` is `null`). Mutate in place — never `world.selection = {...}`.

Events it emits (ARCHITECTURE §5, payloads exactly as written there):

| Event | Payload | When |
|---|---|---|
| `tool:changed` | `{tool, options}` | active tool or any option changes. **De-duplicated**: identical `tool` + deep-equal `options` emits nothing. |
| `tool:preview` | `{kind, points}` | pending preview geometry changed; `kind` = the tool name, `points` = `[{x,y,z}]` of the pending polyline/brush centre. Throttled to ≤ 20 Hz. |
| `selection:changed` | `{kind, id}` | after `world.selection` is written, including on clear (`{kind:null,id:null}`). |

It **writes no other world section directly**. It drives the owners' documented command surfaces, which ARCHITECTURE
§3 already publishes on `world` and which are verified real in §7 below:

```js
world.roads.addNode(x,z) -> id
world.roads.addEdge(a,b,type,opts) -> id            // opts: {lanes, oneWay, ctrl:{x,z}, elevation}
world.roads.removeEdge(id) ; world.roads.removeNode(id)
world.roads.nearestEdge(x,z,maxDist) -> {edge, t, point, dist} | null
world.zones.paint(x,z,radius,type,density) ; world.zones.erase(x,z,radius)
world.terrain.modify({x,z,radius,strength,mode:'raise'|'lower'|'flatten'|'smooth', target?}) -> bool
world.buildings.demolish(id)
world.services.place(kind,x,z,heading) -> id|null ; world.services.remove(id)
```

Its own public API (`ctx.modules.tools` **is** this object — there is no `.api` indirection; see §7).

The shipped HUD already reaches for `select` / `setOption`: `src/modules/ui/hud.js:458` (in `_toolsSelect()`, declared
at `hud.js:456`), and the two `setOption` call sites at `hud.js:518` (mode / toggle buttons) and `hud.js:531`
(stepper). **But all three are
written `this.ctx.modules?.tools?.api?.select(...)` / `?.api?.setOption(...)`** — through an `.api` property that
does not exist on an api object — so they optional-chain to `undefined` inside a `try` and the HUD does **not** in
fact drive `tools` today. Consequences for this round, all of them binding:

- Keep `select(name, options)` and `setOption(id, value)` on `api` with exactly the signatures below; they are what
  the HUD will call the moment the bug is fixed, and the option ids below are already what it passes.
- Do **not** work around it by publishing an `api` property on your own api object, and do not edit `src/modules/ui/`.
  File `docs/core-requests/tools.md` (per `BUILDER.md:27-31`) asking for the three `.api?.` indirections at
  `hud.js:458/518/531` to be dropped, and note that until they are, the HUD cannot reach this module.
- The HUD-driven half of criterion 16 is therefore not observable in `?showcase=tools` (where `ui` is not
  initialised at all — `src/core/showcase.js:22-30` only loads `environment` + the showcase module + its declared
  dependencies). It is graded in the required `--showcase all` run instead.

```js
select(name, options) -> {tool, options} | null   // name ∈ ACCEPTED (below) or null to clear. Never throws.
setOption(id, value)  -> options                  // one option by id; re-validates and re-previews
current() -> {tool, options} | null ; options() -> object
// virtual cursor — the only way a headless probe or the showcase can drive the tool
pointer(x, z) -> state          // world point; snaps y to world.terrain.getHeight
pointerNdc(ndcX, ndcY) -> state // via ctx.camera.screenToGround
click(button = 0) -> {ok, id?, cost, reason?}   // primary action at the cursor
rightClick() -> {ok, reason?}                   // cancel one node / erase / deselect
commit() -> {ok, ids:[], cost, reason?} | null  // finish a multi-point action
cancel() -> void                                // drop the pending action and the preview
state() -> { tool, options, phase:'idle'|'drawing'|'dragging'|'placing', points:[{x,y,z}],
             cursor:{x,y,z}|null, valid:boolean, reason:string|null, cost:number, refund:number,
             affordable:boolean, snap:{kind,id,x,z}|null,
             metrics:{length,angle,grade,cells,volume,items} }
undo() -> boolean ; redo() -> boolean ; history() -> {undo:int, redo:int, entries:[{label,cost}]}
costOf(tool, options, geometry) -> number       // integer ¢, never NaN/Infinity
setSelection(kind, id) -> boolean ; clearSelection() -> void ; pickAt(x, z) -> {kind, id} | null
setPreviewVisible(v) -> void
stats() -> {drawCalls, chips, ghostVerts, poses, ms,
            ghostLiftMin, ghostLiftMax,     // metres above world.terrain.getHeight, min/max over every live ribbon vertex
            chipRects:[{x, y, w, h}]}       // one per visible chip pill, device pixels at the current viewport (criteria 4/21)
cropRects({project, width, height, camera}) -> {ribbon:[x,y,w,h], ground:[x,y,w,h], wash:[x,y,w,h]}
   // ARCHITECTURE §8: window.__sim.cropRects() collects this from every ready module and
   // `node tools/screenshot.mjs … --crops` writes it to <shot>.crops.json as "tools.ribbon" / "tools.ground" /
   // "tools.wash", in pixels of the full-resolution capture. ribbon = 64×64 box centred on the ghost ribbon;
   // ground = the same 64×64 box one ribbon-width to the side of it; wash = 32×32 box centred on the
   // affected-area wash centroid. Return {} for a landmark that is not on screen or has no live pose.
_showcasePoses(on) -> int   // showcase/probe only, never reachable from select(): false tears down every pinned
                            // pose and returns the count removed (criterion 15)
serialize() -> {options, selection} ; deserialize(d) -> void   // §15; the undo stack is NOT serialized
```

`ACCEPTED = ['road','zone','terrain','prop','bulldoze','service','transit','infoview']` — exactly the `tool:` strings
`ui/hud.js` emits (`buildCategories()`, lines 107–178). `transit` and `infoview` are accepted, stored and forwarded
as `ctx.modules.transit?.beginLine?.(opts)` / `ctx.modules.infoviews?.setActive?.(opts.view)` — **no `.api`**, see §7.
Both modules are stubs today whose whole api is `{serialize, deserialize}` (`transit/index.js:9`,
`infoviews/index.js:9`), so both forwards are a logged no-op that still emits `tool:changed` and still stores the
tool + options. Unknown names return `null` and warn.

Option ids per tool are fixed by the HUD and must be honoured verbatim:

| tool | options |
|---|---|
| `road` | `type` ∈ street/avenue/highway/alley/gravel, `oneWay`, `junction` ∈ crossing/lights/roundabout, `mode` ∈ straight/curve/free/grid, `elevation` −20…60 step 5, `snap` ⊆ [snap, parallel, magnet] |
| `zone` | `type`, `density`, `brush` ∈ fill/paint/marquee, `size` 8…96 step 8 |
| `terrain` | `mode` ∈ raise/lower/flatten/smooth, `size` 10…200 step 10, `strength` 10…100 |
| `prop` | `kind` (a `world.props.kinds` member), `mode` ∈ single/line/brush, `spacing` 2…40 |
| `bulldoze` | `mode` ∈ single/marquee |
| `service` | `kind` (a `world.services.kinds` member) |

## 3. Visual / behavioural target

**Reference: `$REF/cs2_1.jpg`** — a road being drawn across a roundabout, aerial, ~50 m up. Reproduce its
world-space overlay layer, not its HUD (the bottom-left option panel and the bottom bar belong to `ui`; do not build
them and do not declare `ui` as a dependency). What that image actually shows, element by element:

- **Ghost ribbon.** An opaque near-white band the exact width of the selected road type, laid flat on the ground,
  following the terrain, hiding the surface under it. It reads as *paint*, not as glass and not as a glowing bar.
- **Guide line.** Beyond the cursor the alignment continues as a **dashed** white centre stripe running off across
  the grass — long dashes, roughly 3:2 dash-to-gap, the same white as the ribbon, narrower than it.
- **Node discs.** Flat white filled circles at each placed node; the live cursor node is a larger disc with a pale
  cyan halo. They stay the same apparent size whether they sit on grass or on the ghost.
- **Affected-area highlight.** A saturated translucent blue wash over the roundabout island and its ring, with a
  brighter blue edge — trees and grass are clearly visible *through* it. This is "what this action will change".
- **Readout chips.** Small dark rounded pills with white text and a leading glyph, floating just off the geometry
  they annotate: `↔ 39 m`, `∠ 14 °`, `↔ 61 m`, `◺ -7.7 %`, `∠ 85 °`, `↔ 41 m`. Each segment gets a length; each
  corner gets an angle; a grade chip appears where the slope is non-trivial.
- **Cost chip.** The same pill with a green money glyph and `¢616`, attached to the cursor node — not to a corner
  of the screen.
- **Restraint.** Everything else in the frame is the untouched city. The overlay covers maybe 12 % of the pixels and
  never fights the scene: no outlines on unaffected roads, no grid, no gizmos.

`$REF/cs2_4.jpg` (suburban street, golden hour) and `$REF/cs2_8.jpg` (rainy night street) set the *background*
standard the overlay must survive: at 06.5 the ghost must not read as a blown white hole in a warm frame, and at
22:00 (`cs2_8`, where the brightest things in frame are lamp heads and a green traffic lamp) it must be the calmest
bright object on screen, not the brightest.

Anchors for this module specifically:
- **10** — a critic cannot tell `closeup_12.png`'s overlay from the `cs2_1.jpg` crop: same ribbon opacity and width,
  same dash rhythm and dash-to-gap ratio, same node-disc and halo radii, same chip pill corner radius, text weight
  and leading glyphs, same blue-wash falloff at the edge of the affected area.
- **9** — an expert has to hunt for the one difference and it is the chip typography (glyph set, letter-spacing or
  pill padding); ribbon, dashes, discs, wash and layout are indistinguishable.
- **8.5 (pass)** — a critic shown `closeup_12.png` next to `cs2_1.jpg` cropped to the overlay says "same language,
  slightly plainer chips".
- **7** — the ghost, discs and chips are all present and correct but flat: one line width, no snap feedback, chips
  that overlap each other.
- **5** — a coloured box floating over the ground with a `THREE.LineSegments` box helper and no text.
- **3** — the preview z-fights, sits at y=0 while the ground is at y=12, or vanishes at night.

## 4. Acceptance criteria

Ordered by how far each moves the score. `shots/tools/rN/<camera>_<time>.png` is the gauntlet naming
(`.` → `p`, so 06.5 → `6p5`). "Probe" = a `page.evaluate` against `window.__sim` on
`?showcase=tools&headless=1&time=<h>`. "Crop" = a named rect in `<shot>.crops.json`, written by
`node tools/screenshot.mjs … --crops` from this module's `api.cropRects` (§2); every pixel statistic below is taken
inside a crop, on the full-resolution PNG.

1. **The showcase district is built by the tools, not around them.** `showcase.setup` constructs every road, zone,
   terrain edit and demolition by calling `api.select/pointer/click/commit` only — a probe finds
   `world.roads.edges.size ≥ 18`, `world.roads.nodes.size ≥ 16`, `world.zones.cells.size ≥ 240` covering all four
   `types` in both `densities`, and ≥ 3 entries in `api.history().entries` whose `label` starts `terrain:`.
   (Not `world.terrain.version`: `roads` bumps it on every conform pass — `src/modules/roads/build.js:661` calls
   `T.modify` after writing heights — so a version count passes without a single tool sculpt.) Zero direct calls to
   `world.roads.addEdge` / `world.zones.paint` / `world.terrain.modify` outside the tool implementations
   (`grep -n "world\.\(roads\.addEdge\|zones\.paint\|terrain\.modify\)" src/modules/tools/showcase.js` returns nothing).
2. **Ghost ribbon conforms to terrain, never z-fights, never floats.** Centreline resampled at ≤ 2 m; every ribbon
   vertex sits `0.10–0.20 m` above `world.terrain.getHeight` at its own x,z — probe: `api.stats().ghostLiftMin ≥ 0.10`
   and `.ghostLiftMax ≤ 0.20` with the `roadtool` pose live (both fields are in the §2 contract). Where the ghost
   crosses an existing road in `shots/tools/r1/closeup_12.png`, the ghost is continuous and the asphalt does not
   punch through it — graded on the material, which the critic reads in the source and which is
   `transparent, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-6, polygonOffsetUnits:-6`
   — a larger negative offset than `roads` uses on its own surfaces and markings (`-1/-2` and `-3/-6`,
   `src/modules/roads/materials.js:233/281`), which is what keeps the ghost in front of them.
3. **All six posed tool states render simultaneously** in `aerial_12.png`: road-drag, zone brush, terrain brush,
   bulldoze marquee, service footprint + coverage circle, and the invalid (red) road ghost — a probe on that run
   reports `api.stats().poses === 6` and all six are visible in the frame.
4. **Chips are legible and correctly placed.** Graded off `api.stats().chipRects` (device pixels, §2) with the
   `closeup` and `roadtool` cameras live, cross-checked against `closeup_12.png` / `roadtool_12.png` at full
   resolution: `chipRects.length ≥ 5` and `=== stats().chips`; every rect's `h` is 24–28 px at 1920×1080 **and** at
   1280×720 (`--w 1280 --h 720`); no two rects' intersection exceeds 10 % of the smaller rect's area; no rect's
   bottom edge falls in the bottom 150 px at 1080p (HUD reserve); text cap-height ≥ 9 px read off the
   full-resolution PNG inside a chip rect, never off a downscaled copy. Every chip's anchor is on-screen (a probe on
   the `skyline` camera confirms `chips` counts only anchors with clip `w > 0` — nothing pinned to a screen corner
   or mirrored from behind the camera).
5. **Chip content is right.** For pose `roadtool` a probe reads `state().metrics` and the same numbers appear in the
   image: one `↔ <int> m` per pending segment (±1 m of the true 3D length), one `∠ <int> °` per interior corner,
   a `◺ <±0.1> %` grade chip on any segment whose |grade| ≥ 0.5 %, and exactly one `¢<int>` cost chip attached to
   the cursor node. `costOf` is a finite integer ≥ 0 with `simulation` present **and** absent.
6. **Night reads without glowing.** At 22:00 (`roadtool_22.png`, `closeup_22.png`, `street_22.png`, each shot taken
   with `--crops`): the ghost ribbon's p50 luminance is 190–225/255 and its p99 ≤ 248 — it must not clip; the ground
   is ≥ 2.5× darker than the ribbon; the ribbon→ground transition across the ribbon edge is ≤ 3 px wide.
   **Ribbon pixels are isolated by a declared crop, never by hand:** the samples are the `tools.ribbon` and
   `tools.ground` rects of the matching `<shot>.crops.json`, written by `screenshot.mjs --crops` from `api.cropRects`
   (§2, ARCHITECTURE §8) — builder and critic read the same file. **All statistics are taken on the full-resolution
   PNG, never on a downscaled copy.**
   All overlay materials are `toneMapped:false` — the pixel is then the sRGB encoding of the material colour, no
   exposure applied — with **linear output ≤ 0.70**, which is what keeps them under the bloom threshold
   `thr = lerp(2.6, 2.2, night)/exposure` (`src/modules/effects/index.js:141`). The arithmetic, because the margin is
   thin: at 22:00 `environment` sets `exposure = 2.8` (`src/modules/environment/index.js:186`, `lerp(2.8, dayExp,
   day)` with `day = 0`) → `thr = 2.2/2.8 = 0.79`; the day's *lowest* threshold is just after sunrise, `night ≈ 0`
   with exposure near 3.4 (`dayExp = 2.0 + lowSun·1.7`, `lowSun ≈ 1`) → `thr ≈ 2.6/3.4 = 0.76`. 0.70 clears every
   hour; linear 2.0, safe at noon (`thr = 2.6/1.15 = 2.26`, `docs/critic/effects_r1.md:49`), is 2.5× **over** the
   night line and is exactly how the glowing ghost happens. The same cap sets the p50 band: linear 0.55–0.70 encodes
   to 196–218/255 through the sRGB output transform, inside the 190–225 above.
   Prove it with a bloom on/off pixel diff over the same `tools.ribbon` crop in `shots/tools/r1/all_night_22.png`
   (`--showcase all --camera night_street --time 22 --crops`), ≤ 1/255 mean: no bloom skirt. The p50/p99/ratio
   figures are measured in `?showcase=tools`, where `effects` is not loaded and there is no tone-map or grade pass;
   the bloom diff is measured in `--showcase all`. They are not the same pixels — do not compare them.
7. **Snapping works and says so.** With the road tool active and the cursor within 12 m of an existing node, a probe
   sees `state().snap = {kind:'node', id, x, z}`, the committed edge reuses that node id (no duplicate node), and the
   image shows a cyan ring at 1.5× the node-disc radius plus a chip reading the snap kind. Same for `kind:'edge'`
   (T-junction, the existing edge is split, `world.roads.edges.size` grows by exactly 2 for 1 removal) and
   `kind:'angle'` (15° increments, engaging within 3.5°) and `kind:'grid'` (8 m, only when `options.snap` includes
   `'snap'`).
8. **Invalid states are unmistakable.** Pose `invalid` in `invalid_12.png`: the whole ghost is red `#E5484D` at
   ≥ 0.5 alpha (not just an outline), the cost chip is replaced by a reason chip whose text is exactly
   `state().reason` (e.g. `Grade 18 % > 12 %`), and `api.commit()` returns `{ok:false, reason}` leaving
   `world.roads.edges.size` unchanged. Rules enforced: max grade 12 % (highway 8 %), min segment 8 m, no segment
   outside ±1024 m, no water crossing unless `elevation ≥ 4`, no shared-node angle < 25°.
9. **Undo/redo is exact.** Probe: record `{roadEdges, roadNodes, zoneCells, buildingCount, terrainSample[16]}`,
   run 8 mixed committed actions (2 roads, 2 zone strokes, 2 sculpts, 1 demolish, 1 service), call `undo()` 8 times
   → every counter returns to baseline and every terrain sample is within `1e-3 m` (a road's cut/fill is reverted
   with the road); `redo()` 8 times → the post-action state returns exactly. `history()` reports ≥ 64 capacity;
   consecutive brush strokes of the same tool within 400 ms coalesce into one entry.
   `world.terrain.modify` cannot restore recorded heights to 1e-3 m — it is a radial brush with a
   `1 - r²(3-2r)` falloff — so for **undo only**, write the snapshotted rectangle straight back into
   `world.terrain.heights` and then call
   `world.terrain.modify({x:cx, z:cz, radius:r, strength:0, mode:'raise'})` over the same rectangle to bump
   `version` and emit `terrain:changed`. This is the precedent `roads` already sets
   (`src/modules/roads/build.js:645-661`), it is the reason §7 says "read to snapshot", and it is not an ownership
   violation for this one path. It goes away when the `setHeights` core request in §7 lands.
10. **Zone-brush preview matches the zoning overlay exactly.** The brush footprint fills the cells it would paint in
    the *same* colours as `src/modules/zoning/palette.js` (`residential low 0x5fd634 / high 0x0d8f3c`,
    `commercial 0x2fb6f5 / 0x1140c9`, `industrial 0xf7b515 / 0xd05310`, `office 0xc65ff5 / 0x6a1cb8`), on the same
    8 m grid, at 0.40–0.50 alpha, with a white 0.3 m brush outline. Graded by probe, not by pixel comparison: the
    preview material's colour uniform equals the palette value for the selected type/density **exactly**, its alpha
    is 0.40–0.50, and every preview cell centre returns non-null from `world.zones.zonableAt(x,z)` (nothing outside
    the zonable band). Do not compare preview pixels with painted pixels: `zoning` composites painted cells at
    `uFill 0.63` plus an animated edge pulse and a fading `uOpacity`
    (`src/modules/zoning/overlay.js:88/146`, `zoning/index.js:76-80`), so the two alphas differ by design and no
    ΔE band between them would be honest. `zonetool_12.png` is the visual check that the footprint is on the 8 m
    grid and reads as the same colour family as the painted cells behind it.
11. **Bulldoze marks its victims, not the neighbourhood.** In `bulldoze_12.png` the marquee is a red-outlined ground
    rectangle and every object inside it carries a red translucent volume (`#E5484D` @0.35) sized to its footprint;
    objects one metre outside carry none. The chip reads `−N items` and `+¢<refund>`; `api.commit()` removes exactly
    those N and `world.buildings.items.size` drops by the building count.
12. **Selection is a real contract.** `api.setSelection('building', id)` writes `world.selection` in place, emits one
    `selection:changed` with `{kind,id}`, and draws a white 0.9-alpha outline hugging the selected object's footprint
    (not a bounding box on the ground). `pickAt(x,z)` on a staged building returns that building's id;
    `clearSelection()` emits `{kind:null,id:null}` and removes the outline within one frame.
13. **Draw calls and per-frame cost.** A probe toggles `ctx.group.visible` and diffs `renderer.info.render.calls`
    across two rendered frames: with all six poses live the tools group is **≤ 12 draw calls** and
    **≤ 20 000 triangles** (declared `budget` = 20 calls / 40 000 triangles — the declared figures are the ceiling,
    the measured figures above are the target; both appear identically in §5). `__sim.stats().moduleMs.tools ≤ 1.2`
    while a pose is live and `≤ 0.6` when idle, averaged over 60 frames. No allocation in `update`: preview geometry
    rebuilds only when a `previewVersion` counter changes, and the probe reads `renderer.info.memory.geometries`
    before and after 200 `pointer()` calls dragged across the ground — **the delta must be exactly 0** (buffers are
    allocated once at max size and updated in place with `needsUpdate` + `setDrawRange`).
14. **Nothing leaks into water reflections or shadows.** Every object tools adds is on `LAYERS.HELPERS` (8) — the
    terrain planar-reflection camera disables exactly that layer (`src/modules/terrain/water.js:192`) — and has
    `castShadow = false`, `receiveShadow = false`. Probe walks `ctx.group` and asserts it for every `Object3D` with
    geometry. In any shot containing water, no ghost, disc, chip or brush ring appears in the reflection.
15. **The preview never survives its tool.** The probe first calls `api._showcasePoses(false)` (§2) to tear down the
    six pinned poses — without that the showcase's own previews are live and `ghostVerts` is never 0, so the item
    would fail a correct build. Then, for each of `api.select(null)`, `api.cancel()`, `Escape` and a successful
    `commit()`: `ctx.group.children` has zero visible preview objects on the next frame, with
    `api.state().phase === 'idle'` and `stats().ghostVerts === 0`.
16. **Event hygiene.** In `?showcase=tools` a probe counts emissions: two identical `api.select('road',{type:'street'})`
    calls emit exactly **one** `tool:changed`; `setOption('elevation', 5)` emits one; 200 `pointer()` calls emit
    ≤ 20 `tool:preview` per second of game time; re-entrancy is banned — the probe installs a listener that calls
    `api.select('road',{type:'street'})` from inside a `tool:changed` handler, and the total emission count must not
    grow. `dispose()` removes every listener (`events.listenerCount('time:tick')` returns to its pre-init value).
    The **HUD feedback-loop half is graded in the `--showcase all` run only**, because `ui` is deliberately not a
    dependency and so is never initialised in `?showcase=tools` (`src/core/showcase.js:22-30`): with the HUD live,
    one tool-card click and one option step must each produce exactly one `tool:changed` and no ping-pong with
    `ui/hud.js:456 _toolsSelect`. If the `.api` indirection bug of §2 is still unfixed the HUD cannot reach `tools`
    at all — record that as the observed result and cite the core request; do not claim the item passed.
17. **Terrain sculpt reads as a brush, not a stamp.** In `sculpt_12.png` the brush shows two concentric ground rings
    (outer = `options.size`, inner = 0.5×, white 0.25–0.35 m wide, 0.35–0.5 alpha) plus a vertical arrow chip giving
    the signed height delta to 0.1 m. The terrain it has already modified is a smooth dome, not a stamp (the failure
    `roads_r1` issue 6 booked): a probe walks 16 rays out from the sculpt centre at 2 m steps to `options.size`,
    sampling `world.terrain.getHeight`, and no adjacent pair on a ray differs by more than 1.5 m — skipping samples
    within 20 m of a road (`world.roads.nearestEdge(x,z,20) !== null`), because a road's own cut/fill is not this
    module's step to answer for. (A 14 m knoll over a 60 m brush radius has a max slope near `1.5·14/60 ≈ 0.35 m/m`, i.e.
    ~0.7 m per 2 m step, so 1.5 m is a wall, not a dome.) Repeated `click()` at the same point produces a
    monotonically rising centre height and no NaN in `world.terrain.heights`.
18. **Service placement validates against roads.** Pose `service`: the ghost footprint is a filled rectangle at the
    kind's true footprint size with a dashed coverage circle at its coverage radius (0.20–0.30 alpha, ≥ 64 segments,
    conforming to terrain so it does not cut through hills). Moving the cursor > 24 m from the nearest road
    (`world.roads.nearestEdge(x,z,24) === null`) flips `valid` to false with reason `No road access` and the ghost to
    red, verified by a probe at two coordinates.
19. **Degrades cleanly where a neighbour offers no placement path.** Neither dependency can place an object today,
    for two *different* reasons (§7): `props` is a **fully built** module whose api simply has no `place`, and
    `services` is a **stub** whose `world.services.place` is a no-op returning `null`. Graded as:
    - `select('prop',{kind:'tree_oak'})` renders the prop ghost, its spacing preview and its chips; `commit()`
      returns `{ok:false, reason:'props placement unavailable'}` **whenever
      `typeof ctx.modules.props?.place !== 'function'`** — and returns a normal `{ok:true, ids:[…]}` the day that
      function lands, with no other change. The test is on the function, never on a version flag or a module name.
    - `select('service',{kind:'clinic'})` renders footprint, coverage circle and chips; `commit()` calls
      `world.services.place(kind, x, z, heading)` and, when the return is `null`, yields
      `{ok:false, reason:'service placement unavailable'}`.
    - Both reason strings are **exact** and are the text the reason chip displays.
    - In both cases the ghost stays visible, there are **zero console errors**, `registry.status().tools.status`
      is `ready`, and nothing is charged through `simulation.spend`.
    - With `simulation` absent: `costOf` still returns a finite integer ≥ 0 and `affordable` is `true`.
20. **Determinism.** Two runs at `seed=1337` give byte-identical probe output for `history().entries`,
    `world.roads.edges.size`, `world.zones.cells.size` and every `state().metrics` value. At `seed=99` the structure
    is unchanged (same counts) — the district's geometry is authored, not random.
21. **1280×720 holds.** `--w 1280 --h 720` at `roadtool` and `closeup`, times 12 and 22, with `--crops`. Chips are
    **screen-space sized**: every `stats().chipRects` height stays 24–28 px, no rect is clipped by a viewport edge
    and none falls in the bottom 150 px — the same numbers as at 1080p. The ghost ribbon, guide dashes, node discs
    and ground decals are **world-space** and are expected to shrink with viewport height: `720/1080 = 0.667`, so
    record the `tools.ribbon` rect width at both resolutions and expect a ratio of **0.60–0.72×**. Do not hold
    world-space geometry to a screen-space band; the §3 rule that the ribbon is the exact width of the selected road
    type is what makes it world-space in the first place.
22. **Golden hour is not white-out.** `roadtool_6p5.png` and `street_6p5.png` (taken with `--crops`): inside the
    `tools.ribbon` rect the ghost's saturation stays ≤ 0.10 (it is neutral white, not tinted amber by the sun) and
    the ribbon does not clip: ≤ 250/255 over ≥ 99 % of the sampled pixels. Inside the `tools.wash` rect the blue
    affected-area wash keeps hue within 195–215° at every time of day — it must not turn green at 06.5 or purple at
    22. Both rects come from `api.cropRects` via `<shot>.crops.json`, exactly as in criterion 6, and both statistics
    are taken on the full-resolution PNG; no hand-cropping and no downscaled copy on either side.

## 5. Budget

| Metric | Budget | Where measured |
|---|---|---|
| Declared `budget.drawCalls` | **20** (matches `constants.BUDGET.perModuleDrawCalls.tools`) | `index.js` |
| Measured tools-group draw calls, six poses live | **≤ 12** | group-visibility diff probe (criterion 13) |
| Measured tools-group draw calls, idle | ≤ 2 | same |
| Declared `budget.triangles` (ceiling) | 40 000 | `index.js` |
| Measured tools-group triangles, six poses live (target, = criterion 13) | **≤ 20 000** | group-visibility diff probe |
| `moduleMs.tools`, pose live / idle | ≤ 1.2 ms / ≤ 0.6 ms (hard ceiling 2 ms, §9) | `__sim.stats().moduleMs` |
| Texture memory owned | ≤ 4 MB (one 512² RGBA chip atlas ≈ 1 MB, ≤ 2 × 256² masks) | count textures created |
| `init` time | ≤ 400 ms | `registry.status().tools.initMs` |
| Whole showcase frame | **recorded, not graded** — see below | `summary.json` |

The declared figures are the ceiling the critic checks `index.js` against; the measured figures are what the group
must actually hit. Where a row says both, criterion 13 and this table state the same number by construction.

**The whole-frame figure is an observation, not a pass/fail for this module.** `tools` is graded on its own
group diff only (≤ 12 draw calls, ≤ 20 000 triangles). In `?showcase=tools` the declared dependencies stage
themselves before `tools` draws a single ghost, and they are already above that line on their own: the `props`
showcase measures **1 473 859 triangles / 114 calls** at aerial (`shots/props/dev_aerial_12.json`) and the
`buildings` showcase **1.40–2.03 M triangles / 127–217 calls** (`shots/buildings/rdev1/summary.json`:
`maxTriangles 2 034 862`, `maxDrawCalls 217`). With 30+ buildings, a road grid and a forest in the tools district the
frame will exceed 700 calls / 1.6 M triangles for reasons that are not this module's to fix. So: record the frame's
`drawCalls`/`triangles` from `summary.json` in the build report, and if it is over, name **which module owns the
excess** (group-visibility diff per module) — never trim the district to make the number, because a thin district
fails criteria 1 and 11.

Expected allocation of the 12: ghost ribbon 1 (+1 for elevation pillars), ground decal batch (footprint / zone brush
/ marquee / coverage ring) 1, guide dashes 1, node+snap discs (one `InstancedMesh`) 1, doomed-object volumes
(one `InstancedMesh`) 1, selection outline 1, chip quads (one `InstancedMesh`, one `CanvasTexture` atlas) 1, showcase
multi-pose spare 3–4. Everything repeated is instanced or merged; per-pose objects share one material per class.

## 6. Known failure modes

Booked against neighbours in `docs/critic/` and waiting for this module:

- **Glowing ghost at night — the threshold is narrow, so aim at it deliberately.** `effects_r1` issue 2 measured
  exactly where the line sits: lit windows at "winLevel 0.11 → ≈ 0.3 after exposure" sit *under* the bloom threshold
  and never glow, while lamp heads at ~9 cross it (`docs/critic/effects_r1.md:86`, and the api-contract row
  "bloom on/off diff **0.00** (nothing crosses threshold 2.26)" at line 49). That 2.26 is the **noon** threshold
  (`2.6/1.15`); the night one is `2.2/2.8 = 0.79` and the day's lowest is ≈ 0.76 just after sunrise. Hence the
  linear ≤ 0.70 ceiling in criterion 6 — linear 2.0, which is safe at noon, is 2.5× over the night line — and
  **prove it** with a bloom on/off pixel diff over the `tools.ribbon` crop in `--showcase all` (criterion 6).
  Symptom if you overshoot: the ghost becomes the brightest object in a 22:00 frame with a soft skirt around it.
- **Preview at y = 0.** The ribbon or brush ring drawn on a flat plane while the terrain is at 12 m: the ghost slices
  through hills or hangs in the air (`roads_r1` blockers 1 and 3). Every overlay vertex queries
  `world.terrain.getHeight` at its own x,z; rings and circles are tessellated ≥ 64 segments for the same reason.
- **Z-fighting with the road surface.** Shimmering stripes where ghost meets asphalt at aerial distance; the
  `roads` module already uses `polygonOffset` at `RENDER_ORDER.ROADS/MARKINGS`, so an overlay drawn at the same
  offset flickers. Use a larger negative offset, `depthWrite:false` and `renderOrder = RENDER_ORDER.TRANSPARENT`
  for ground decals, `RENDER_ORDER.UI3D` + `depthTest:false` for discs and chips.
- **Chips projected from behind the camera.** A world point with clip `w ≤ 0` projects to a mirrored NDC and the pill
  lands in the opposite corner attached to nothing — most visible at the `street` and `skyline` presets. Cull, do not
  clamp.
- **Chip pile-up.** Six poses × 5 chips at the `aerial` camera collapse into an unreadable stack. Cull chips beyond
  400 m from the camera target, cap at 12 visible, and resolve overlaps by nudging along the anchor's screen normal.
- **Blurry chip text.** A canvas atlas drawn at 1× and stretched. Render glyphs at 2× and size the quad so one texel
  ≈ 0.5 px at 1080p; regenerate the atlas on resize, not per frame.
- **HUD feedback loop.** `ui/hud.js:456 _toolsSelect` is written to call `select`, and `tool:changed` calls back into
  the HUD. Emitting on every `select` — including no-op selects — can ping-pong. De-duplicate. (Today the loop cannot
  actually close, because those call sites go through a non-existent `.api` indirection — §2. Build for the fixed
  world, not the broken one.)
- **Stale preview.** A pose left visible after `select(null)` shows up as a ghost road in every later gauntlet frame
  and reads as a rendering bug.
- **Undo that forgets the terrain.** Roads cut and fill the ground; undoing the edge without restoring the height
  strip leaves a trench (visible as a bare flat scar in `aerial_12.png`). Snapshot the affected height rectangle in
  the undo entry.
- **Tiling / lattice on the brush decal.** A repeating noise or grid texture at aerial distance reads as a regular
  lattice (`environment_r1` blocker 3, `simulation_r1` issue 1). Keep decals procedural in the fragment shader,
  driven by world x,z, with no repeated bitmap.
- **`NaN` cost.** `simulation` absent, or a zero-length segment, produces `¢NaN` in the chip. Clamp and round.
- **Overlay in reflections.** `terrain_r1` blocker 1 was exactly this class of bug (grass in the planar reflection).
  `LAYERS.HELPERS` is already excluded by the reflection camera — use it for everything.
- **UI overflow at 720p** (`ui_r1` issues 1–2) — the equivalent here is chips clipped by the viewport edge.

## 7. Dependencies and their real APIs

`dependencies: ['terrain', 'roads', 'zoning', 'buildings', 'props', 'services', 'simulation']`.
Do **not** declare `ui` (its HUD is graded separately and would import its open issues into these frames) or
`effects` (verify the bloom property in `--showcase all` instead). `terrain` pulls `environment` transitively.

**`ctx.modules.<name>` is the module's api object itself (`registry.js:15` `this.apis[def.name] = def.api`,
`registry.js:36` `modules: this.apis`) — there is no `.api` indirection.** Call `ctx.modules.roads?.rebuild?.()`,
never `ctx.modules.roads?.api?.rebuild?.()`: the second form optional-chains to `undefined` and does nothing, with no
error and no log line — which is the bug the `ui` HUD is sitting on (§2). This applies to every call in this spec.

Verified signatures, copied from the code:

- **`world.terrain`** (`src/modules/terrain/index.js:40-57`): `getHeight(x,z)`, `getNormal(x,z,out)`,
  `getSlope(x,z)`, `isWater(x,z)`, `raycast(ray) -> {point,normal}|null`, `modify(brush) -> bool` — brush is
  `{x, z, radius=20, strength=1, mode:'raise'|'lower'|'flatten'|'smooth', target?}`, smooth falloff
  `1 - r²(3-2r)`, emits `terrain:changed {x,z,radius}` itself. Also `minHeight`, `maxHeight`, `version`, and
  `features.river/coast/island`. `world.terrain.heights` is the raw `Float32Array` — read it to snapshot an undo
  rectangle. Writing it is banned **except on the undo path of criterion 9**, where `modify()`'s radial falloff
  cannot restore recorded heights and `roads` already sets the precedent (`src/modules/roads/build.js:645-661`:
  write `h[i]`, then `modify(..., strength:0)` to bump `version` and emit `terrain:changed`). There is no
  `writeHeights`/`flattenStrip`/`setHeights` anywhere in `src/` today (verified); `ARCHITECTURE.md:102` lists it as
  something terrain owes and `docs/core-requests/roads.md:16` already asks for it. Add
  `setHeights(ix0, iz0, ix1, iz1, Float32Array) -> bool` to your own `docs/core-requests/tools.md` and drop the
  direct write the day it lands.
- **`world.roads`** (`src/modules/roads/network.js:288-296`): `addNode(x,z)` (merges into an existing node within
  1 m and returns its id), `addEdge(a,b,type,opts)` (`opts.lanes/oneWay/ctrl/elevation`; returns `-1` and warns on
  bad nodes), `removeEdge(id)` (orphan nodes are deleted with their last edge), `removeNode(id)`,
  `nearestEdge(x,z,maxDist=30) -> {edge,t,point:{x,y,z},dist}|null`, `sample(id,t) -> {x,y,z,tangent:{x,z},
  normal:{x,z}}`, `laneCenter(id,lane,t)`, `frontage(id) -> [{side,from,to,x,z,heading,width,length}]`.
  Module api: `ctx.modules.roads.rebuild()`, `.intersections()`, `.lampPositions(edgeId)`, `.stats()`, `.types()`.
  Road widths for the ghost come from `world.roads.types[type].width` (street 16, avenue 24, highway 32, alley 8,
  gravel 8) — never hard-code them.
- **`world.zones`** — the *only* functions installed on the world section (`ZoneGrid.install()`,
  `src/modules/zoning/grid.js:458-468`): `paint(x,z,radius,type,density)`, `erase(x,z,radius)`, `lotsFor(edgeId)`,
  `freeLots()`, `cellAt(x,z)`, `lotAt(x,z)`, `zonableAt(x,z)` (null ⇒ outside the buildable band ⇒ the brush preview
  must not fill that cell), `maxDepth`. **`world.zones.bulk` does not exist — calling it is a `TypeError`.**
- **`ctx.modules.zoning` only** (`src/modules/zoning/index.js:92-118`): `bulk(fn)` with `fn({circle, rect, erase})`,
  `refresh()`, `stats()`, `setOverlayVisible(v)`, `overlayVisible()`, `debugEdge(id)` — plus flat duplicates of the
  `world.zones` calls. **Route every multi-cell stroke through `ctx.modules.zoning?.bulk`** so one lot regeneration
  and one `zones:changed` fire per commit; if the `zoning` module is absent, fall back to repeated
  `world.zones.paint` calls (correct, just noisier). `zoning` already turns its overlay on when it sees a
  `tool:changed` whose tool matches `/zone|zoning|district/i` (`zoning/index.js:54`) — emit the event, do not call
  `setOverlayVisible` yourself.
- **`ctx.modules.buildings`** (`src/modules/buildings/index.js:233-251`): `at(x,z)`, `get(id)`, `demolish(id)`,
  `requestSpawn(lot)`, `spawnFreeLots(limit)`, `flush()`, `count()`. Use `at`/`spawnFreeLots`/`demolish`;
  call `flush()` after a batch so the shot is not one frame stale.
- **`ctx.modules.simulation`** (`src/modules/simulation/index.js:196-206`): `canAfford(a) -> bool`,
  `spend(a, force=false) -> bool`, `earn(a)`, `economy()`, `isUnlocked(what)`, `milestone()`. Costs go through
  `spend()` on commit and refunds through `earn()`. When absent: `affordable = true`, nothing is charged.
- **`ctx.modules.props`** — **not a stub: `props` is a finished module**, and its api is exactly
  `{rebuild, stats, lamps, signalState, count, serialize, deserialize}` (`src/modules/props/index.js:234-249`).
  **There is no `place()` anywhere** — not on the api, and not on `world.props` either, whose section is only
  `{items, kinds, version}` (`src/core/world.js:73-77`). So the prop tool has **no legal placement path today**: you
  may not write `world.props.items` and you may not edit `src/modules/props/`. Do both of these:
  1. Call `ctx.modules.props?.place?.(kind, x, z, heading, opts) -> id` — the flat form, guarded by
     `typeof ctx.modules.props?.place === 'function'`. Until that function exists the prop tool is ghost-only and
     `commit()` returns `{ok:false, reason:'props placement unavailable'}` (criterion 19).
  2. File `docs/core-requests/tools.md` requesting `place(kind, x, z, heading, opts) -> id` (and a matching
     `remove(id) -> bool` for undo) on the `props` api, with the exact signature above and this workaround stated.
  Enumerate the prop palette from `world.props.kinds` (12 entries).
- **`world.services` / `ctx.modules.services`** — `services` **is** a stub whose entire api is
  `{serialize, deserialize}` (`src/modules/services/index.js:9`); there is no `footprintOf`/`coverageOf`/`costOf` to
  prefer. The world defaults (`src/core/world.js:94-103`) give you `kinds` (17 entries) plus `place/remove/coverage`
  no-ops — `place()` returns `null` and `coverage()` returns `0`. So call `world.services.place(kind,x,z,heading)` on
  commit and treat a `null` return as the failure path, reason string exactly `'service placement unavailable'`
  (criterion 19). Enumerate the palette from `world.services.kinds` and own a local footprint + coverage-radius +
  cost table keyed by those kinds; when a real `services` module lands, prefer
  `ctx.modules.services?.footprintOf?.()/coverageOf?.()/costOf?.()` (flat, guarded) over your table.
- **Core** — `ctx.camera.screenToGround(ndcX,ndcY) -> {x,y,z,normal}|null`, `ctx.camera.camera`,
  `ctx.camera.distance`, `ctx.camera.registerPreset(name,preset)`; `ctx.rng.fork(label)`;
  `ctx.assets.procedural.gradient/noiseTexture/solid`; `constants.LAYERS.HELPERS = 8`,
  `constants.RENDER_ORDER.TRANSPARENT = 100`, `.UI3D = 200`, `constants.TILE_SIZE = 128`.
- **DOM**: `tools` creates **no** DOM elements. Every readout is 3D geometry in `ctx.group`, so it survives with the
  `ui` module absent and is countable in `renderer.info`. A probe asserting `document.body.children.length` is
  unchanged after init must pass.

## 8. Showcase

`showcase.description` (one sentence naming the district and the six poses) and `showcase.cameras` are required.
The staged district spans x,z ∈ [−260, 260] and is **built by driving the tools** (criterion 1), in this order:

1. `terrain` flatten a 120 m pad at (0, 0), strength 80.
2. `road` straight, `avenue`: the spine (−240, 0) → (240, 0).
3. `road` straight, `street`: four N–S streets at x = −160, −80, 80, 160 from z = −180 to 180; two E–W streets at
   z = ±120. Every crossing must snap to an existing edge (T-junction) — this is the snap system dogfooding itself.
4. `road` curve, `street`: (160, 120) → ctrl (230, 60) → (240, −40). `road` `alley` one service lane behind the
   centre block.
5. `zone` paint: residential low + high west, commercial high centre, industrial low east, office high north —
   ≥ 240 cells, all four types, both densities.
6. `ctx.modules.buildings?.spawnFreeLots?.(40)` then `ctx.modules.buildings?.flush?.()` — flat, no `.api` (§7).
   `spawnFreeLots` returns the count: assert it is ≥ 30 and `log.error` if not, so a failed spawn is visible in the
   run instead of showing up as an empty district in the shots. ≥ 30 buildings, so bulldoze has real victims and the
   frame is a district, not a test bed.
7. `terrain` raise a knoll at (150, −120) to ≥ 14 m peak, then `smooth` its skirt.
8. Pin the six poses through `api._showcasePoses(true)` — the **showcase-only** multi-preview mode of §2, which
   `select()` must never reach (one preview at a time in the real game) and which `_showcasePoses(false)` tears down
   for criterion 15's probe:

| Preset | Pose | Anchor | Camera |
|---|---|---|---|
| `roadtool` | `road`, avenue, curve, nodes (0,0) and (60,0), cursor (96,34); node snap on the spine node | (60,0) | `{position:[74,44,96], target:[52,2,22]}` |
| `zonetool` | `zone`, residential/high, brush 24 | (−90,60) | `{position:[-52,40,104], target:[-90,1,60]}` |
| `sculpt` | `terrain`, raise, size 60, strength 70 | (150,−120) | `{position:[210,58,-48], target:[150,10,-120]}` |
| `bulldoze` | `bulldoze`, marquee (−176,−116)→(−104,−52), ≥ 4 buildings doomed | centre | `{position:[-72,52,-12], target:[-140,4,-84]}` |
| `service` | `service`, `clinic`, coverage circle | (120,110) | `{position:[176,66,190], target:[120,4,110]}` |
| `invalid` | `road`, street, (150,−60) → (150,−120) up the knoll, grade > 12 % | (150,−90) | `{position:[214,40,-96], target:[152,10,-96]}` |

The core presets must land on content without any override: `closeup` (target [20,6,20], d 110) and `street`
(target [40,0,40], d 60) both frame the `roadtool` pose — this is the hardest read and the shot the score turns on;
`aerial` (target origin, d 520) must show all six poses at once; `skyline` (target [0,40,0], d 900, pitch 0.16) must
show the district in silhouette with chips culled to ≤ 12 and still anchored.

How it must read across the matrix (critics shoot noon and night by default, plus golden hour):

- **06.5** — warm low sun, long shadows across the district. The ghost stays neutral white against the amber ground;
  the blue wash stays blue; no clipping (criterion 22).
- **12** — the reference condition. `closeup_12.png` is the frame compared directly to `$REF/cs2_1.jpg`.
- **17.5** — the low-contrast trap that produced `environment_r2`'s "milky and blown" finding. The overlay must not
  disappear into a hazy background: ribbon-to-ground luminance ratio ≥ 2.0, over the same `tools.ribbon` /
  `tools.ground` crops as criterion 6.
- **22** — the district is dark; the overlay is the only bright thing and must stay calm (criterion 6). Node discs
  and chips must still read at the `street` and `night_street` cameras — the chips carry their own dark pill, so the
  text contrast target is ≥ 7:1 at every hour.

The runs required before the round is closed, exactly — `gauntlet.mjs` shoots only `aerial,street,skyline,closeup`
unless told otherwise (`tools/gauntlet.mjs:11`), so the graded module presets have to be named, and it does **not**
forward `--crops` (`gauntlet.mjs:20-23`), so every pinned measurement is a direct `screenshot.mjs` run:

```
node tools/gauntlet.mjs --module tools --round <r>
node tools/gauntlet.mjs --module tools --round <r> --cameras roadtool,zonetool,sculpt,bulldoze,service,invalid --times 12,22
node tools/gauntlet.mjs --module tools --round <r> --cameras roadtool --times 6.5
node tools/gauntlet.mjs --module tools --round <r> --cameras roadtool,closeup --times 12,22 --w 1280 --h 720
# pinned crops (criteria 4, 6, 21, 22) — one per graded shot, e.g.
node tools/screenshot.mjs --showcase tools --camera roadtool --time 22 --crops --out shots/tools/r<r>/roadtool_22.png
node tools/screenshot.mjs --showcase all --camera night_street --time 22 --crops --out shots/tools/r<r>/all_night_22.png
node tools/screenshot.mjs --showcase all --camera aerial --time 12 --out shots/tools/r<r>/all_aerial_12.png
```

The 720p pass overwrites the 1080p PNGs of the same name, so give it a separate `--round` or rename before the
1080p set is graded.

Assumptions made here, stated rather than asked: costs are ¢ per 100 m for roads (street 240, one-way 220, avenue 520, highway 1180, alley 120,
gravel 80, matching the `ui` cards), ¢8/¢20 per 8 m zone cell (low/high), ¢1.5 per m³ of terrain moved, flat card
cost for services, 10 % refund on demolished roads and 25 % on props; grade limits 12 % (8 % highway); these live in
one exported table in `src/modules/tools/` so the critic can read them.
