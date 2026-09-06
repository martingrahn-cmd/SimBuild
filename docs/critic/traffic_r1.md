# traffic — critic round 1

**Score 5.0 / 10 — FAIL.**
The build on disk is the pre-spec exploratory module, not a build against `docs/prompts/modules/traffic.md`: nothing
casts a shadow at any hour, nine of seventeen `api` functions do not exist, and the showcase is `roads`' network
imported from `../roads/showcase.js` rather than §8's.

Zero console errors, `traffic: ready` in every shot, whole-frame draw calls 64–87 (ceiling 200). The driving
*behaviour* is genuinely good. Almost everything the acceptance checklist actually asks for is absent.

---

## What I shot

Gauntlet (`--module traffic --round 1 --times 12,22`), plus the module's four declared presets and a 1280×720 frame.
Every image below was opened and looked at.

| file | what I saw |
|---|---|
| `shots/traffic/r1/aerial_12.png` | 520 m. Vehicles individually legible, in lane, both carriageways opposed, no carpeting. **Not one shadow anywhere in the frame at noon.** Roads read as a bare grid; the roundabout at top-left is empty. |
| `shots/traffic/r1/aerial_22.png` | Night. Sparse white/red points along the avenue and highway; headlight wedges visible as short pale dashes. Capture JSON `ok:false` — the measure step lost `window.__sim` under machine starvation; the PNG itself is a valid frame. |
| `shots/traffic/r1/street_12.png` | Eye level at the crossroads. A well-formed queue of 7 on the left arm, evenly spaced, correct side. Bodies are smooth rounded lozenges; **zero ground shadow under any of the ~20 vehicles in frame**. One pedestrian visible, ~200 m away. |
| `shots/traffic/r1/street_22.png` | Headlights project two hard-edged white stripes ~16 m ahead; taillights are small red points; **no red pool behind any car**. No signal head at the junction, so the stopped queue is unexplained. Bodies still read in colour. |
| `shots/traffic/r1/skyline_12.png` | 900 m. Vehicles read as coloured dashes distributed over the network. No flicker, no sparkle, no origin pile. The best frame in the set. |
| `shots/traffic/r1/skyline_22.png` | Night skyline. Avenue and highway read as strings of white/red points; a visible jam on the highway. No sparkle. |
| `shots/traffic/r1/closeup_12.png` | The model-quality shot. Cars are fastback lozenges with faired-in fenders — 1950s, not modern. No plate, no grille, no mirrors, no shut-lines, no lamp housing; wheels are pale blobs half-buried in the arch. No shadow. |
| `shots/traffic/r1/closeup_22.png` | Bodies keep chroma at 22 (red/blue clearly red/blue). Headlight cone is a solid pale trapezoid with a crisp edge, not a pool that falls to 0. Frame `p1 26.4 / p99 132.1`, 0.013 % white-clipped — no crush, no blow-out. |
| `shots/traffic/r1/junction_12_720.png` | Declared preset. Queue on one arm, flow on the other — item 6's last bullet is satisfied. No signal head. No shadow. |
| `shots/traffic/r1/junction_22_720.png` | Same at night; headlight wedges, red tail points, no mast, no pool. |
| `shots/traffic/r1/highway_night_22_720.png` | Best night frame: bus and cars with white lamp pairs and beams down the carriageway, taillights receding. Beams are two disjoint stripes rather than one merged pool. |
| `shots/traffic/r1/boulevard_12_720.png` | Eye level. Red rear lamp clusters *are* modelled and read at this range. Box-truck front wheel pokes through the bodywork. No shadow. |
| `shots/traffic/r1/circle_12_720.png` | The roundabout: **one vehicle on the entire ring.** No circulation to judge, no yielding to observe. |
| `shots/traffic/r1/street_12_720.png` | Valid 1280×720 frame, no overflow, no debug overlay. |
| `shots/traffic/r1/street720_12.png` | First 720p attempt returned the boot overlay ("INITIALISING…"). Tooling starvation, not the module — the re-shoot above is clean. Not scored. |

Zoomed crops I measured on: `crop.mjs` output of `closeup_12` at the queue, the isolated van, and the bus/box-truck
group; `closeup_22` at the red/blue queue.

## Numbers

| | value | required |
|---|---|---|
| console errors | **0** across 14 shots | 0 |
| `modules.traffic.status` | `ready` in every shot | ready |
| whole-frame draw calls | 64 – **87** | ≤ 200 |
| whole-frame triangles | 557 845 – 1 191 421 | ≤ 3 M (roads' own geometry dominates) |
| traffic's own draw calls | 18 (noon) / 26 (night), probe | ≤ 45 ✔ |
| traffic's authored triangles | 10 156 total source; 1 120–1 464 per vehicle class | LOD0 700–1 800 ✔ |
| `moduleMs.traffic` | 0.9 / 1.1 / 1.2 / 1.4 / 1.5 / 2.0 / 2.8 / **4.7** / **5.3** ms | ≤ 1.6 ms — **over in 3 of 12** |
| `initMs` | 47 – 169 ms | ≤ 1200 ✔ |
| declared `budget` (`index.js:73`) | `{drawCalls: 170, triangles: 1_600_000}` | `{drawCalls: 60, triangles: 300_000}` |
| `dependencies` (`index.js:72`) | `['roads']` | `['terrain','roads','simulation']` |
| `Math.random` in the module | none ✔ | forbidden |
| files touched outside the module | none ✔ | blast radius clean |

Probe (`shots/traffic/r1/apicheck.mjs`, `apicheck2.mjs`), `?showcase=traffic&seed=1337`:

- **item 1** — `|v.y − (laneCenter(v.edgeId,v.lane,v.t).y + 0.08)| ≤ 0.03` holds for **0 / 153** vehicles.
  Median `v.y − laneCenter.y` is **−0.003 m**, i.e. the published height is the raw profile height with the
  0.08 m `ROAD_LIFT` omitted; worst error **11.82 m**. The *rendered* matrix does add `+0.085`
  (`sim.js:618`), so it looks right and reads wrong — every consumer of `world.traffic` gets a sunk car.
- **item 4** — lateral distance to the lane centre ≤ 0.35 m for **53.6 %**, ≤ 0.8 m for **53.6 %** (needs 98 % / 100 %);
  heading within 0.20 rad for **89.5 %** (needs 98 %). Cause: `v.t = v.s / rec.len` where `v.s` is measured
  **along the direction of travel** (`graph.js:177`, `const p = dir > 0 ? st : rec.len - st`), so for every b→a
  vehicle the published `t` is the mirror of the a→b parameter §2 requires. That is almost exactly the missing half.
- **item 5** — 91 same-edge/same-lane pairs, **0 negative gaps**, minimum bumper gap **1.00 m** (needs ≥ 1.2 m at rest).
- **item 8** — vehicles at hour 6.5 / 12 / 17.5 / 22: **163 / 162 / 163 / 163**. Required 60–110 / 130–190 / ≥ 200 /
  30–65 with `v(22) ≤ 0.35 × v(17.5)`; actual ratio **1.00**. `byKind` is identical at all four hours.
- **item 9** — 108 pedestrians, **0** carry an `edgeId`; the record is `{rec, side, dir, s, v, phase, …}` with no
  `kind`, `edgeId`, `t` or `state`. `phase` ranges **68.1 – 102.6** (contract: `[0,1)`).
- **item 6** — `roads.intersections()` returns 32 nodes, 28 signalisable (`arms ≥ 3`, not a roundabout);
  `signals()` returns **7**. `signalState` does not exist. The phase integrates `dt` (`graph.js:158 s.t += dt`),
  so it is not a function of `world.time` and no two captures land on the same phase.
- **item 10** — `castShadow === false` on **all 26** InstancedMeshes (bodies, lights, contact decals, pedestrians;
  `sim.js:79`, `SHADOW_CASTING = false`). Contact darkening at an isolated van in `closeup_12`:
  lit asphalt mean luma **72.8**, asphalt at the tyre-contact line **64.0** → **12 % below** (item 10 requires
  **15–35 % below**), and the same frame's pedestrian blob measures 55.1 → 24 % below, so the pedestrian decal works
  and the vehicle one does not. There is no shadow core to measure at all.
- **item 11** — body paint `roughness 0.30` ✔ but `metalness 0.62` (≤ 0.15 required); glass albedo 0.030/0.036/0.044 ✔,
  `roughness 0.06` ✔, but `metalness 0.80` (0 required); tyre 0.88 ✔; rim `metalness 0.92`, `roughness 0.26` ✔.
  `environment.setupMaterial` is **never called** — `grep -n "setupMaterial\|hookScene" src/modules/traffic/` is empty,
  so the custom light-rig and contact materials get neither CSM nor fog.
- **item 7** — emissive radiance read from the shader: head `2.3` (band 3.0–5.0), tail `0.70` (band 1.2–2.0),
  brake `2.7` (band 3.5–5.0) — all three **below** their bands. `stats().emissive` does not exist. Ground cone is
  16 m for cars / 20 m for bus+truck (`geometry.js`), width ~0.84 → 4.6 m per lamp; **there is no tail or brake pool
  at all** (only `LAMP.CONE` quads, forward-facing). `lightsOn` is correct: 0/163 at hours 6.5, 12 and 17.5,
  163/163 at 22 — but it is a `number`, not the `boolean` §2 specifies.
- **item 12** — no LOD and no distance culling exist anywhere in the module
  (`grep -n "lod\|LOD\|cull" src/modules/traffic/` returns nothing but a comment). `forceLod`, `freeze` and `step`
  are missing, so LOD parity and the step-pinned pop test cannot be run. **No instance within 5 m of the origin** ✔.
- **item 15** — `outsideConnections()` returns 3 entries at `(-330, 40)`, `(-640, 360)`, `(620, -150)`; the gate
  requires `|x| ≥ 964` or `|z| ≥ 964`, so **0 of 3** qualify. Shape is `{nodeId,x,z,highway}`, not
  `{nodeId,edgeId,x,z,type,heading}`. `spawnVehicle('bus',[edgeId])` returned **`null`** (contract: an id or `-1`).
- **item 18** — `flowGrid()` returns `{size, cellSize, data, sample(x,z)}`; the contract is
  `{size, cellSize, congestion:Float32Array, version, index(x,z), sample(name,x,z)}`.
- **item 19** — `stats().congestion` is **0.60 at every hour including 22:00** (needs ≤ 0.10 at 22). `world.traffic.stats`
  has only `{count, avgSpeed, congestion}`; `pedestrians`, `byKind`, `queued`, `spawned`, `despawned` are absent.
- **item 20** — **passes.** `world.roads.removeEdge(id)` on an edge carrying 26 vehicles left **0** references after
  one frame and after 1.5 s, with no console error.
- **item 13** — at `speed = 0`, 17 of 25 sampled vehicles moved in 1.5 s, so the fleet is alive in a graded frame.
  But `index.js:98–99` still reads
  `const speed = w.time.paused ? … : Math.max(0.5, Math.min(3, w.time.speed)); const sdt = Math.min(0.1, dt) * speed;`
  — the exact line the spec preamble says not to re-ship. Agent motion is a function of `?speed=`.
- **`?showcase=all`** — traffic is `ready` with 0 errors and 0 vehicles, which is **correct**: the integrated road
  graph is empty there (`roads.edges.size === 0`, `intersections() === []`), and §7's degradation row asks for
  exactly this. Item 6's integrated clause is consequently unmeasurable, on both sides — `props.signalFor` is also
  `undefined` in this build.

## API contract, item by item

| §2 signature | result |
|---|---|
| `spawnVehicle(kind, route) -> id\|-1` | present; returns **`null`**, route shape is `[{edgeId,dir}]` not `[edgeId,…]` |
| `despawn(id) -> bool` | ✔ |
| `flowGrid()` | wrong shape (`data`, no `congestion`/`version`/`index`) |
| `outsideConnections()` | wrong shape, and no entry is within 60 m of the border |
| `signalState(nodeId)` | **missing** (`lightState(nodeId)` in its place, different shape) |
| `signals()` | present, wrong shape (`{id,x,y,z,arms:int}`; no `nodeId`, `phase`, `greenArms`) |
| `vehicle(id)` | **missing** |
| `setDensity(v)` / `density()` | **missing** (`setTargets(v,p)` in their place) |
| `stats()` | present; returns `{count, avgSpeed, congestion, pedestrians, signals}` — no `byKind`, `byKindTris`, `byLod`, `draws`, `tris`, `queued`, `targetVehicles`, `targetPeds`, `stepMs`, `cullDistance`, `emissive` |
| `forceLod(n)` | **missing** |
| `step(n)` | **missing** |
| `freeze(v)` | **missing** |
| `debug.setVisible / lodHistogram` | **missing** — the three masks in §4's preamble cannot be built at all |
| `cropRects({…})` | **missing** — `window.__sim.cropRects()` returns `{}`, so every pinned measurement in items 7 and 11 is ungradable (builder defect, CRITIC.md "Pinned landmarks") |
| `serialize()` / `deserialize()` | present, non-conforming payload (`{vehicles:[{kind,edgeId,dir,lane,s,v,paint,external}], peds, targets}`) |
| `world.traffic.kinds` | **absent** (`kinds()` is a function on the api instead) |

Extra, undeclared: `lightState`, `kinds`, `setShadowCasting`, `setTargets`, `preroll`, `_debug`.

**`apiContractOk: false`.**

## Acceptance checklist

Failed: **1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19, 21, 22.**
Passed: **17** (`ready`, 0 errors, clean 1280×720 frame), **20** (road-graph reaction).

Item 21 is recorded as failed because it cannot be run: pinning a state needs `freeze`, `setDensity` and `step`,
none of which exist.

---

## Ranked issues

### 1. blocker — Nothing casts a shadow, at any hour, and the contact decal is hidden under the car
`SHADOW_CASTING` is initialised `false` (`sim.js:16`) and every one of the 26 InstancedMeshes is built with
`castShadow = SHADOW_CASTING` (`sim.js:79`), so at noon, at golden hour and at night not one vehicle or pedestrian
darkens the road. This is the single largest gap against CS2: in `$REF/cs2_5.jpg` every car throws a hard
directional shadow *and* darkens the ground under the sill; in `$REF/cs2_4.jpg` every pedestrian throws a long
golden-hour shadow. Item 10 requires `castShadow = true` and `receiveShadow = true` on every mesh.

The substitute contact decal is real (`createContactMaterial`, alpha up to ~0.75 of near-black) but it is placed at
the vehicle's own transform and slid only `uSun = (0.6, 0, 0.6)` m, so it sits almost entirely *underneath* the body
that occludes it. Measured at the isolated van in `closeup_12`: lit asphalt **72.8**, tyre-contact line **64.0**
(12 % below; item 10 wants 15–35 %), while the pedestrian decal in the same frame reaches 24 % below because nothing
covers it. Fix both: turn real casting on (the core CSM complaint in `docs/core-requests/traffic.md` is a reason to
escalate, not to ship shadowless), and throw the decal along the sun vector by a distance derived from the sun
elevation so a wedge of it is visible beside the car.
Evidence: `shots/traffic/r1/closeup_12.png`, `shots/traffic/r1/boulevard_12_720.png`, `shots/traffic/r1/circle_12_720.png`.

### 2. blocker — Nine `api` functions do not exist and five more return the wrong shape
`signalState`, `vehicle`, `setDensity`, `density`, `forceLod`, `step`, `freeze`, `debug` and `cropRects` are all
`undefined`; `world.traffic.kinds` is absent. This is not only an item-18 failure — it removes the instruments the
rest of the checklist is written against. Without `debug.setVisible` there is no fleet/shadow/pool mask, so items 7,
10, 11 and 12 have no defined measurement; without `cropRects` `window.__sim.cropRects()` returns `{}` and no
`.crops.json` is ever written, so items 7 and 11 cannot be pinned; without `freeze` + `step` items 12 and 21 have no
repeatable state. Implement §2's block verbatim, including `stats()`'s full shape with `byKindTris`, `byLod`,
`draws`, `tris`, `queued` and `emissive`.
Evidence: `shots/traffic/r1/apicheck.mjs` output — `apiPresent` and `cropRects: {}`.

### 3. blocker — The showcase is `roads`' network, imported from `../roads/showcase.js`
`src/modules/traffic/showcase.js:4` does `import { stage as stageRoads } from '../roads/showcase.js'` — which §8
forbids outright — and stages roads' demo grid. None of §8's network exists: no avenue×street crossroads at (40,40)
with nodes at x = −200…200, no 8-segment one-way ring at (−200,−40) with four named radials, no dual-carriageway
highway from (−1000,340) to (1000,140) with a tangential ramp, no alley at x = 160, no fleet line-up at (−260,40).
The declared presets are `junction / highway_night / boulevard / circle`; §8 requires
`junction / queue / merge / roundabout / crossing / headlights / fleet`, so `queue_12`, `queue_17p5`, `merge_12`,
`crossing_6p5`, `crossing_12`, `fleet_12`, `headlights_22` and `roundabout_12` — the frames items 1, 2, 3, 5, 6, 7
and 9 are graded in — cannot be taken at all. Stage §8's network through the public `addNode/addEdge` API, call
`ctx.modules.roads.rebuild()` before reading the graph back, then seed the fleet.
Evidence: `src/modules/traffic/showcase.js`, `shots/traffic/r1/circle_12_720.png`.

### 4. blocker — The published `world.traffic` records break the §2 field contract
Four separate breaks, each of which silently corrupts a consumer:
`v.y` is the raw `laneCenter().y` with the 0.08 m road lift omitted (median error −0.003 m against a required
+0.08 m ⇒ **0 / 153** pass item 1, worst case 11.82 m); `v.t = v.s / rec.len` is measured along the direction of
travel rather than a→b, so for every b→a vehicle `world.roads.sample(edgeId, t)` returns the mirrored point
(**46 %** of the fleet lands > 0.8 m from its lane centre in item 4's probe); there is no `v.speed` at all
(the field is `v.v`), which `ui`'s selection panel (`src/modules/ui/hud.js:796`) reads; `lightsOn` is a
`0..1` number, not a boolean. Pedestrians are worse — `{rec, side, dir, s, v, phase, jitter, …}` with no `kind`,
`edgeId`, `t` or `state`, and `phase` running 68.1–102.6 instead of `[0,1)`. Publish §2's records exactly.
Evidence: `shots/traffic/r1/apicheck.mjs` output — `item1`, `item4`, `item9`, `sampleVeh`, `samplePed`.

### 5. blocker — The cars are smooth 1950s toys, not CS2 vehicles
The lofted superellipse bodies have real curvature, and that part is good. What they lack is everything item 2 lists:
no number plate, no grille, no mirrors, no door shut-lines, no separate bumper, no headlamp housing; the glasshouse
is a single smoked band with two painted pillar strips rather than windscreen/side/rear panes with body pillars
between them; the wheels are pale grey blobs half-swallowed by faired-in arches, with no dark tyre / lighter hub
split and no tyre meeting the ground. The silhouettes are fastbacks with covered rear wheels — a 1948 saloon, not a
2023 hatchback. Van, pickup and box truck all share the same fastback nose with a box grafted on, so item 3's "an art
director can name all nine from silhouette alone" fails before you even count them. Compare `$REF/cs2_5.jpg` at the
same zoom: clearcoat shoulder highlight, near-black glasshouse with visible pillars, dark tyre with a lighter hub,
red lamp cluster, pale plate.
Evidence: the 6× crop of `shots/traffic/r1/closeup_12.png` around the isolated van; `shots/traffic/r1/closeup_22.png`.

### 6. major — Only 7 of 28 eligible junctions are signalised, the phase integrates `dt`, and no head is ever drawn
`signals()` reports 7 signals where `roads.intersections()` offers 28 nodes with `arms ≥ 3` and `roundabout === false`.
The phase advances by `s.t += dt` (`graph.js:158`), so it is not the pure function of `world.time.day/hour` on a
4 320 game-second cycle §2 requires — every re-shoot lands on a different phase and no pixel diff at a junction is
repeatable. And item 22's fallback masts do not exist, so in `?showcase=traffic` — where `props` is not loaded —
every junction shot shows a queue stopped at nothing. Add the mast (5.2–6.0 m pole, three-lens head, emissive
6.5–9.0), gate it on `typeof ctx.modules.props?.signalFor !== 'function'`, and derive the phase from `world.time`.
Evidence: `shots/traffic/r1/junction_12_720.png`, `shots/traffic/r1/junction_22_720.png`; probe `signalised: 28`, `signals(): 7`.

### 7. major — Density does not follow the hour
`stats().vehicles` is 163 / 162 / 163 / 163 at hours 6.5 / 12 / 17.5 / 22, and `byKind` is identical at all four.
Item 8 wants 60–110 / 130–190 / ≥ 200 / 30–65 with `v(22) ≤ 0.35 × v(17.5)`; the measured ratio is 1.00. `targets()`
does scale with an activity curve, but nothing shrinks the live fleet toward the target — vehicles only leave at the
end of a route — so after `setTime()` the count never moves. Despawn the surplus (off-screen or at an outside
connection) and seed to target synchronously in `showcase.setup`.
Evidence: `shots/traffic/r1/apicheck.mjs` `density` block; `aerial_12.png` vs `aerial_22.png` show the same fleet size.

### 8. major — No LOD, no distance culling
There is no LOD system and no cull distance in the module; `frustumCulled = false` is set on every mesh and every
live instance is submitted at full detail at any range. Item 12 requires three vehicle LODs (≤ 90 / 90–260 /
260–1200 m, cull > 1200) and two pedestrian LODs (≤ 60 / 60–160, cull > 220), with LOD1 ≤ 0.35 × LOD0 and
LOD2 ≤ 45 triangles. It is also the cause of issue 10: 163 vehicles × ~1 200 triangles are transformed and drawn
whether they are 20 m or 900 m away.
Evidence: `grep -n "lod\|LOD\|cull" src/modules/traffic/*.js`; `skyline_12.png` submits full-detail bodies at 900 m.

### 9. major — Night lamp radiances are all under their bands; there is no tail or brake pool
Read from the fragment shader: head `1.0 × lightsOn × 2.3` → **2.3** (band 3.0–5.0), tail
`1.0 × (lightsOn×0.70 + brake×2.0)` → **0.70** steady (band 1.2–2.0) and **2.7** braking (band 3.5–5.0). All three
sit under the bloom threshold headroom the spec sizes them against, which is why the lamps read as flat dots rather
than haloed lenses. The ground rig contains only forward `LAMP.CONE` quads, so the 6–8 m red pool behind a car in
`$REF/cs2_8.jpg` — the thing that makes that reference frame read as night — does not exist here at all. The head
cone is a 16 m hard-edged trapezoid rather than a pool that peaks at ≤ 0.55 of the lens and falls to 0 at its far
edge. Publish `stats().emissive` so the numbers are readable instead of inferred.
Evidence: `src/modules/traffic/materials.js` `VEH_COLOR`/`LIGHT_FRAG`; `shots/traffic/r1/street_22.png`, `closeup_22.png`.

### 10. major — Over the frame budget, and the declared budget is the wrong one
`moduleMs.traffic` measures 4.7 ms at `junction_12_720` and 5.3 ms at `aerial_12` against item 16's ≤ 1.6 ms — and
against ARCHITECTURE §9's ≤ 2 ms for *any* module. `index.js:72–73` still declares
`dependencies: ['roads']` and `budget: {drawCalls: 170, triangles: 1_600_000}`; §5 requires `['terrain','roads','simulation']`
and exactly `{drawCalls: 60, triangles: 300_000}`. There is no `stats().stepMs` to attribute the cost to the fixed
step. Traffic's own draw calls (18 day / 26 night) are comfortably inside 45, so the cost is CPU, not submission.
Evidence: `shots/traffic/r1/aerial_12.json`, `shots/traffic/r1/junction_12_720.json`; `src/modules/traffic/index.js:72`.

### 11. major — Materials: metallic paint, metallic glass, and no `setupMaterial`
Body paint is `metalness 0.62` where item 11 allows ≤ 0.15 with a clearcoat-like specular tint; glass is
`metalness 0.80` where it must be 0. That is why the bodies read as painted resin under a broad specular rather than
as clearcoated paint with an elongated shoulder highlight. Separately, `ctx.modules.environment.setupMaterial` is
never called for any of the three custom materials, so the light rig and the contact decal receive neither CSM nor
fog — the unfogged-vehicle-at-600 m failure item 11 closes with.
Evidence: `src/modules/traffic/materials.js:44–47, 54–56`; `grep -n setupMaterial src/modules/traffic/` is empty.

### 12. major — Agent motion is still scaled by the clock speed
`index.js:98–99` is the line the spec preamble names and forbids:
`const speed = w.time.paused ? (ctx.headless ? 1 : 0) : Math.max(0.5, Math.min(3, w.time.speed)); const sdt = Math.min(0.1, dt) * speed;`.
The 0.5 floor keeps the fleet alive in a `speed = 0` capture (17 of 25 sampled vehicles moved in 1.5 s, which is why
the queues in the shots look right), but item 13 requires the fixed agent step to accumulate from the **raw `dt`**
handed to `update()` so motion is identical at any clock speed. As written, half-speed at `speed = 0` and 3× at
`speed = 3` are both wrong, and `stepMs` is unreported.
Evidence: `src/modules/traffic/index.js:98–99`; probe `motion` block.

### 13. minor — The roundabout carries one vehicle
`circle_12_720.png` shows a single car on the entire ring. Item 6's yield probe needs ≥ 3 yield events on two fed
radials over 20 s and `$REF/cs2_1.jpg` shows a ring with singles circulating plus a truck holding a lane; there is
nothing here to grade. Weight the ring and its radials in the spawn distribution (§8 stages the south and east
radials specifically to feed it).
Evidence: `shots/traffic/r1/circle_12_720.png`.

### 14. minor — Outside connections are not at the border, and `spawnVehicle` returns `null`
The three entries sit at `(-330, 40)`, `(-640, 360)` and `(620, -150)`; item 15 requires nodes within 60 m of the
map border (`|x| ≥ 964` or `|z| ≥ 964`). The returned shape omits `edgeId`, `type` and `heading`.
`spawnVehicle('bus', [edgeId])` returned `null` rather than an id or `-1`, and rejects §2's `[edgeId,…]` route form.
This mostly resolves itself once §8's network is staged (its highway ends and the north avenue reach the border).
Evidence: probe `outside`, `spawnReturn`.

### 15. minor — Lamp glow quads inflate up to 2.4× with camera distance
`materials.js:160–162` scales the glow cross-quads by `clamp(dist/115, 1, 2.4)` so headlights stay visible from the
aerial camera. Item 7 requires that no lamp lens be larger on screen than the signal head next to it; an artificial
minimum apparent size makes that impossible to hold. Solve it with radiance and bloom instead of geometry.
Evidence: `src/modules/traffic/materials.js:160`; `shots/traffic/r1/aerial_22.png`.

### 16. minor — The street preset barely has pedestrians in it
`street_12.png`, `street_12_720.png` and `street_22.png` each show at most one pedestrian, all of them far from the
camera. Item 14 requires at least one vehicle and **two** pedestrians in frame at the core `street` preset;
`$REF/cs2_4.jpg` makes the sidewalk the alive part of the frame. This is downstream of issue 3 — §8 pins the preset
target at `[40, 0, 40]` on a crossroads with crosswalks.
Evidence: `shots/traffic/r1/street_12.png`, `shots/traffic/r1/street_12_720.png`.

---

## Strengths to preserve

- **The driving behaviour is the best thing here and should survive the rewrite.** IDM car-following with a
  per-vehicle desired speed, first-come junction reservation, a keep-clear rule that refuses to enter a node it
  cannot clear, and spill-back queueing produce queues that genuinely look like `$REF/cs2_1.jpg`: **0 negative gaps
  in 91 same-lane pairs**, evenly spaced, on the correct side, with the crossing arm moving while the stopped arm
  waits.
- **Zero console errors in 14 shots, `ready` everywhere, whole-frame draw calls 64–87** against a 200 ceiling, and
  traffic's own 18–26 against 45. No `Math.random`. Blast radius clean — only `src/modules/traffic/` is touched.
- **`roads:changed` is handled correctly**: removing an edge carrying 26 vehicles left zero dangling references
  after one frame with no error. Item 20 passes outright; do not regress it.
- **No pile at the world origin** — `count` is set to the live number, so `aerial_12` and `skyline_12` are clean.
- **`lightsOn` reads the sun, not the clock**: 0 % at 6.5, 12 and 17.5, 100 % at 22.
- **Bodies keep their chroma at night** — the red and blue cars in `closeup_22` measure a mean chroma of 35.2
  against a whole-frame 19.0, so they are lit rather than silhouetted. That is the hardest half of item 7 and it
  already works.
- **One shared `InstancedMesh` per class with a per-vertex material id** (paint / glass / tyre / rim / lens / trim)
  and wheels spun in the vertex shader is the right architecture for the budget — keep it and add LOD on top.

## Notes and assumptions

- The gauntlet ran on a machine at load average 22–30 with three other agents' captures in flight; a single 1080p
  SwiftShader frame took 8–10 minutes. Two captures (`aerial_22`, the first `street720_12`) lost `window.__sim` at
  the measure step and wrote `ok:false` with an empty stats block; the first `street720_12` PNG is the boot overlay.
  Both are the tooling starvation already booked against core in `terrain_r1`, not traffic defects, and the 720p
  frame re-shot clean. `fps = 11.6` throughout is software rendering and is not scored.
- `?showcase=all` currently has an empty road graph, so traffic drawing nothing there is the specified degradation,
  not a defect. Item 6's integrated clause is unmeasurable in both directions this round — `props.signalFor` is also
  absent from this build.
- Item 7's chroma-ratio clause and item 11's speckle clause are recorded as failed **because `api.cropRects` is
  missing**, not because the pixels were measured and lost. Once cropRects lands, both may well pass.
