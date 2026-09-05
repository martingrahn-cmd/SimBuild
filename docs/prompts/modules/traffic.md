# Module spec: `traffic`

Role files: `docs/prompts/BUILDER.md` (builders) / `docs/prompts/CRITIC.md` (critics). Everything invariant —
determinism, instancing, no per-frame allocation, blast radius, the screenshot loop, the scoring anchors — lives
there and is **not** repeated here. Read with `ARCHITECTURE.md` §3, §4, §5, §6, §9, §10, §12, §15.

`$REF` = the CS2 reference frames `cs2_1.jpg` … `cs2_8.jpg`, resolved in this order: `$SIMBUILD_REF` if set, else
`~/.simbuild/ref/`, else `/tmp/claude-0/-home-user-SimBuild/<session-uuid>/scratchpad/ref/` (the legacy
session-scoped path — it does **not** survive into a new session). The frames are never committed
(ARCHITECTURE §10: CS2 screenshots are not stored in this repo) and are re-fetchable from the Steam store URLs
recorded alongside `docs/reference/CS2-LOOK.md`. **If they cannot be resolved, §3's prose descriptions are the
normative statement of each anchor and the round is graded against those** — a missing `$REF` is never a reason to
stop, to ask, or to skip an item.

Round 1 spec: there are no critic reports for this module yet. The failure modes in §6 are the ones the critics
have already booked against `terrain`, `roads`, `environment`, `effects`, `simulation` and `ui`; they are waiting
for this module too.

**`src/modules/traffic/` is not empty and it is not the stub.** It holds six files — `geometry.js` 628 lines,
`sim.js` 678, `graph.js` 303, `materials.js` 308, `index.js` 244, `showcase.js` 37 (≈ 2 200 lines) — pre-spec
exploratory work that predates this document. `docs/STATUS.json` still records
`traffic: {round: 0, status: "stub"}`; **the disk is authoritative and STATUS is stale.** Disposition: that build
is a **starting point, not prior art to preserve**. §2, §4, §5 and §8 are normative — bring the module to them and
treat anything already there that contradicts them as work to fix. The breaking changes are named so no builder
has to guess which way to jump:

| On disk today | §2 requires |
|---|---|
| `lightState(nodeId)` | `signalState(nodeId)` in §2's shape, plus `signals()` in §2's shape (today's `signals()` returns `{id,x,y,z,arms:int}`) |
| `flowGrid() -> {size, cellSize, data, sample(x,z)}` | `{size:256, cellSize:8, congestion:Float32Array, version, index(x,z), sample(name,x,z)}` |
| `spawnVehicle(kind, route)` returns `null`; route `[{edgeId,dir}]` | returns `-1`; route `[edgeId,…]` or `{edges:[…], loop}` |
| `kinds()` (a function on the api) | `world.traffic.kinds` (a frozen array on the world section) |
| `outsideConnections() -> [{nodeId,x,z,highway}]` | `[{nodeId, edgeId, x, z, type, heading}]` |
| `setTargets(v,p)`, `preroll(s,step)` | `setDensity(v)` / `density()`, plus the entirely missing `vehicle`, `step`, `freeze`, `forceLod`, `debug`, `cropRects` and §2's `stats()` shape |
| `dependencies: ['roads']`, `budget: {drawCalls: 90, triangles: 520_000}` (`index.js:72–73`) | `['terrain','roads','simulation']`, `{drawCalls: 60, triangles: 300_000}` |

`index.js:98–99` — `const speed = w.time.paused ? … : Math.max(0.5, Math.min(3, w.time.speed)); const sdt = Math.min(0.1, dt) * speed;`
— scales the agent step by the **clock** speed. The `Math.max(0.5, …)` floor stops it from being §6's fully dead
fleet, but it still makes agent motion a function of `?speed=` and of pause, which item 13 forbids and §6 mode (a)
describes. Step from the raw `dt` handed to `update()`; do not re-ship this line.

**Standing assumptions, stated so nobody has to ask:**

- The traffic showcase runs with **core + environment + terrain + roads + simulation + traffic**. `props`,
  `buildings` and `zoning` are *not* initialised (`selectModules` in `src/core/showcase.js` imports only
  `environment` + the showcase module + its transitive `dependencies`). There are no lamps, trees, buildings or
  street furniture in frame **except the fallback signal masts traffic draws itself** (item 22). Every CS2
  comparison below is made against the **vehicles, pedestrians, their lights, their shadows and their
  behaviour**, never against the city around them in the reference frames.
- **Traffic may not add a light of any kind** (ARCHITECTURE §4: only `environment` may). Headlights, taillights,
  brake lights and their pools on the road are emissive geometry and projected decals, never `PointLight` /
  `SpotLight`. It also never touches `toneMapping`, `toneMappingExposure`, `scene.fog`, the shadow map, or
  `renderer.render`.
- **Traffic owns the signal phase clock; `props` renders the heads and mirrors it.** The sibling spec
  `docs/prompts/modules/props.md` states the same handover from the other side: its "Signal phase clock" bullet
  (props.md:47–58) says *"`traffic` owns the signal state machine (traffic.md §2); this spec does not contest
  that"*, and its api block (props.md:104–109) defines `signalFor(edgeId, atA)` as a **pure read-through of
  `ctx.modules.traffic.signalState(nodeId)` whenever traffic is present**, publishing `source:'traffic'` when it
  is mirroring. Traffic therefore runs **one** phase state machine, in every showcase, and **never calls
  `props.signalFor` for a lens state or a stop/go decision** — that would close the loop
  `traffic.signalState → props.signalFor → traffic.signalState`, which is either infinite recursion or no clock
  at all. `api.signalState()` / `api.signals()` (§2) are the single authoritative address for `infoviews`,
  `transit`, `props` and the critic. Props' own clock runs only while `ctx.modules.traffic?.signalState` is
  absent, which never happens in a showcase that loaded traffic.
  `props` is deliberately **not** added to `dependencies`: declaring it would pull the whole props scatter (trees,
  lamps, benches, signs) into every traffic frame and invalidate the framing in the bullet above. No cycle exists
  in either direction — props declares `dependencies: ['terrain','roads']` (props.md:27, :658) and never
  `traffic`. Under `?showcase=traffic`, `loadModuleDefs` imports only `environment` + `traffic` + traffic's
  declared dependencies (`src/main.js:33, 41`), so `ctx.modules.props` is `undefined` there.
- Traffic's fallback signal **masts** (item 22) are built **only** when props is not live **and** no item in
  `world.props.items` has `kind === 'trafficlight'`, re-evaluated on `props:changed` and on `app:ready`. The
  split with props is about **geometry only**: in `?showcase=all` props draws the masts and traffic draws none,
  and the phase is traffic's in both cases. **The phase props renders for an arm must equal the phase traffic
  reports for it** — item 6 probes that props *follows* traffic (`signalFor(…).source === 'traffic'`), which is a
  direction, not two mirrors agreeing.
- Vehicle height comes from the **road**, never from the terrain. `world.roads.laneCenter(...).y` returns the
  *profile* height; the asphalt surface is `ROAD_LIFT = 0.08 m` above it and the sidewalk top is
  `ROAD_LIFT + SW_H − 0.03 = 0.21 m` above it (`src/modules/roads/build.js:12,18`). Using
  `world.terrain.getHeight` for a vehicle sinks it 8 cm into the asphalt and is an automatic fail on item 1.
- **Two clocks, and every graded shot is taken with the game clock stopped.** `src/main.js:82` calls
  `clock.setSpeed(0)` whenever `--time` is passed without `--speed`, and `tools/gauntlet.mjs` never passes
  `--speed`, so every frame in §8's capture list is taken at `speed = 0` with `world.time.hour`
  pinned by `?time=`. The module therefore runs two clocks and they are not interchangeable:
  - **Phase clock — signals, and anything a screenshot must reproduce.** A pure function of `world.time.day` /
    `world.time.hour`; never accumulated `dt`, never wall-clock. This is the resolution props adopted for this
    wave too (props.md:59–62) against `simulation_r1` issue 6, "screenshots are not repeatable", so the two
    modules cannot disagree. One full cycle spans **1.2 game hours = 4 320 game seconds**, which is 30 real
    seconds at `speed = 1` (`src/core/clock.js:5`, `dayLengthSeconds = 600`: 600 real s per 24 game h ⇒ 1 real s
    = 144 game s, and 4 320 / 144 = 30). At `speed = 0` the phase is
    consequently *fixed by `?time=`* and does not advance during a capture: the shot shows one phase, one arm
    flowing and the conflicting arm queued, and that is the intent, not a frozen machine.
  - **Agent motion.** Vehicle and pedestrian positions accumulate from the **raw `dt` handed to `update(dt)`**
    (already clamped to 0.1 s, and `main.js:127` passes that real `dt` to `registry.update` irrespective of clock
    speed; the clamp is `main.js:122`), so **the fleet is alive in a `speed = 0` screenshot**: cars roll, queues build behind the red arm,
    pedestrians walk, spawns and despawns happen. `Date.now()` / `performance.now()` drive nothing. Per-agent
    animation phase (stride, wheel spin) is a function of **that agent's accumulated path distance**, not of time,
    so it scales with speed by construction and neighbours are out of phase without a random offset.
  - **What this costs, and how grading pays for it.** Two separate page loads are *not* pixel-identical: capture
    happens ~2–3 s after `__sim.ready` (`tools/screenshot.mjs:61–68` waits, then the `--measure` window, 1.5 s
    from `tools/gauntlet.mjs:24`) and the step count in that window
    depends on machine load. **No acceptance item may require a pixel-identical frame from two loads.** Determinism
    is graded through `api.step(n)` from a pinned state (item 21); every pixel-diff test is taken **within one page
    load** with `api.freeze(true)` holding the fleet still (items 11, 12); and probes that need the phase to
    advance — item 6's cycle test, item 5's queue discharge, item 19's congestion at 22 — run with
    `window.__sim.setSpeed(1)` (`src/core/debug.js`) and say so at the item.
- Traffic drives on the **right**. `$REF/cs2_1.jpg` roundabout arrows circulate anticlockwise; the queue at the
  signal in `$REF/cs2_8.jpg` is on the right-hand carriageway.

---

## 1. Purpose

Without `traffic` the city is a diorama: roads carry no one, nothing moves between the buildings, the night has no
headlights and no red pools on the asphalt, and no sidewalk has a person on it — this module is the only thing in
SimBuild that makes the city look inhabited rather than modelled.

---

## 2. World data owned

Owner of `world.traffic`. Copy these signatures exactly (ARCHITECTURE §3); mutate the section in place, never
replace it, and keep every published field current every frame.

```js
traffic: {                         // owner: traffic
  vehicles: Map<id, {id, kind, edgeId, lane, t, speed, x, y, z, heading, lightsOn}>,
  pedestrians: Map<id, {...}>,
  stats: {count, avgSpeed, congestion:0-1},
}
```

Field contract, enforced by probe:

- `id` integer ≥ 1, unique for the life of the session; never reused after despawn.
- `kind` ∈ `world.traffic.kinds` (see below), a non-empty string.
- `edgeId` an id present in `world.roads.edges`, or `null` while the agent is inside an intersection.
  **`edgeId === null` means "inside the junction box", and it is an exclusion, not an escape hatch:** items 1, 4, 5
  and 6 evaluate only agents with a non-null `edgeId` (`network.js:228–230` returns `null` from `laneCenter` for an
  unknown edge, so a lane comparison for a mid-junction vehicle is undefined and must not be scored), **and** the
  fraction of the fleet with `edgeId === null` must be **≤ 12 %** at every sample, probed at all four graded
  hours (6.5, 12, 17.5, 22). Pedestrians with `state === 'cross'` are the pedestrian equivalent and are excluded from item 9's band
  test the same way, under the same 12 % ceiling.
- `lane` integer, a valid index into that edge's lane set (`0 … edge.lanes-1`).
- `t` ∈ [0,1], the same parameter `world.roads.sample(edgeId, t)` takes, measured along `a → b`.
- `speed` metres per second, ≥ 0, never negative (reverse is not modelled).
- `x, y, z` metres, world space; `y` = the wheel-contact plane (asphalt surface), so the body sits above it.
- `heading` radians, **0 = north = −Z, increasing clockwise seen from above** (ARCHITECTURE §2), equal to
  `Math.atan2(tangent.x, -tangent.z)` for the direction of travel.
- `lightsOn` boolean, live: `true` whenever the head/taillights are emitting (night factor > 0.15 or rain > 0.4).

`world.traffic.pedestrians` is left as `{...}` in ARCHITECTURE §3. This spec fixes it — a pedestrian record is:

```js
{id, kind, x, y, z, heading, speed, edgeId, side:'left'|'right', t, state:'walk'|'wait'|'cross', phase}
```

`y` = the sidewalk top the feet stand on; `edgeId`/`side`/`t` locate them on a road frontage; `state` is `'cross'`
only while on a carriageway. `kind` is a non-empty appearance key (e.g. `'adult_a'`, `'child'`). `phase` ∈ [0,1) is
the walk-cycle stride phase, published so item 9 can be probed rather than eyeballed; it is a function of that
pedestrian's accumulated path distance (§ standing assumptions), never of the clock.

Two additions this module publishes on the section (permitted extensions; nothing above may be missing):

- `world.traffic.kinds` — frozen array of vehicle class keys, **≥ 9 entries** (the enumerated minimum set in §4
  item 3 has nine members).
- `world.traffic.stats` also carries `pedestrians` (int), `byKind` (`{kind: count}`), `queued` (int, vehicles
  stopped at a red or behind one), `spawned`/`despawned` (session totals). `count`, `avgSpeed` (m/s over moving and
  stopped vehicles alike) and `congestion` (0–1 = `1 − meanSpeed / meanFreeFlowLimit`, clamped) are the contract.

Events emitted (ARCHITECTURE §5) — traffic has no section event of its own in §5, so it emits nothing on the bus
per frame. It **may** emit `audio:play {sound, x, z, volume}` for a horn/pass-by at most 2 Hz, and must not emit
anything else. Events consumed: `roads:changed` (rebuild the drivable graph and re-seat or despawn every vehicle
on a removed edge — *within one frame, with no vehicle left on a dead edge*), `time:tick` (read `hour`; never
integrate time yourself), `props:changed` (signal-mast gate), `selection:changed`, `app:ready`.

`api` (`ctx.modules.traffic`) must expose exactly these, ARCHITECTURE §15 included:

```js
spawnVehicle(kind, route) -> id|-1   // route: [edgeId,…] or {edges:[…], loop:bool}; omit for a wandering agent
despawn(id) -> bool
flowGrid() -> {size:256, cellSize:8, congestion:Float32Array, version, index(x,z), sample(name,x,z)}
outsideConnections() -> [{nodeId, edgeId, x, z, type, heading}]
signalState(nodeId) -> {phase:int, greenArms:[edgeId], since:number, cycle:number} | null   // authoritative
signals() -> [{nodeId, x, z, arms:int, phase:int, greenArms:[edgeId]}]                      // authoritative
vehicle(id) -> record|null
setDensity(v)            // 0..1 multiplier on the target fleet size; null restores the activity curve
density() -> number
stats() -> {vehicles, pedestrians, byKind, byKindTris, byLod:{0,1,2}, draws, tris, queued, targetVehicles,
            targetPeds, stepMs, cullDistance, signals, emissive:{head, tail, brake, mast}}
forceLod(n|null)         // pin every agent to LOD n; used to prove LOD parity
step(n = 1) -> int       // advance exactly n fixed agent steps synchronously, return the new step count.
                         // Deterministic, no wall clock; mirrors simulation's step(n) (simulation/index.js:187).
                         // Advances agents even while freeze(true) is held: freeze only stops update() from
                         // stepping them. Items 12 and 21 pin a state with freeze and then move it with step.
freeze(v)                // true: update() stops stepping agents (probe plates, pixel diffs); false: resume
debug: { setVisible(layer, bool), lodHistogram() }
   // layer: 'vehicles' | 'pedestrians' | 'pools' | 'lamps' | 'masts' | 'shadows'
   // 'shadows' toggles castShadow on every mesh this module owns; the rest toggle visibility of that layer.
   // These exist so the critic can build the masks in §4 and must work with zero console errors.
cropRects({project, width, height, camera}) -> {name: [x, y, w, h]}
   // The two pinned landmarks in §4's preamble, in pixels of the full-resolution capture, each returned only
   // when it is in frame. Collected by window.__sim.cropRects() and written to <shot>.crops.json by
   // `tools/screenshot.mjs --crops` (ARCHITECTURE §8). Items 7 and 11 measure inside these rects.
serialize() -> {module:'traffic', version, density, vehicles:[{kind, edgeId, lane, t, speed}], peds:[…]}
deserialize(data) -> bool
```

`signalState(nodeId)` and `signals()` are **the phase state machine itself, not a wrapper over anyone else's.**
The phase is a pure function of `world.time.day` / `world.time.hour` (§ standing assumptions) on a fixed cycle of
**1.2 game hours = 4 320 game seconds**; `cycle` is reported in game seconds (4 320) and `since` is game seconds
since the current phase began, derived from `world.time` the same way. `signalState()` returns `null` for a node
that is not a signalised intersection. Where props is live it **reads these every frame** and drives every lens
from them (props.md:47–58, :104–109); traffic publishes identical values in `?showcase=traffic` and
`?showcase=all` and never asks props what the phase is.

`stats().byKindTris` is `{kind: LOD0 triangles of one instance of that kind}` — item 2 grades the per-class
thresholds against it, because a fleet-wide mean (`tris / byLod[0]`) mixes cars, buses, pedestrians, masts, pools
and beams and cannot check a per-class number. `stats().emissive` reports the linear emissive radiance actually set
on each lamp class (`max channel of material.emissive × material.emissiveIntensity`), so item 7's ranges are
readable from a probe instead of guessed from pixels; `stats().emissive.mast` is `null` whenever this module draws
no mast (item 22). `stats().tris` and `stats().draws` are what this module **actually submitted this frame, after
LOD and culling** — not authored source geometry; `byKindTris` is the only authored figure on the object.

`flowGrid()`'s shape mirrors `world.economy.grids` exactly (`src/modules/simulation/grids.js:20–28`): **named
`Float32Array` fields plus `index(x, z)` and `sample(name, x, z)`**, which is what lets `infoviews` read either with
one code path. `congestion[iz*256+ix]` is the mean congestion of the road cells in that 8 m cell, 0 where there is
no road, decayed with a half-life of 30 game minutes; `congestion` is the only named field required.

---

## 3. Visual/behavioural target

ARCHITECTURE §12: *vehicles on lanes with car-following, lane changing at intersections, traffic light compliance,
headlights/taillights at night, pedestrians on sidewalks; instanced vehicle meshes (5+ vehicle classes).* What that
means against the actual references:

**`$REF/cs2_5.jpg` — the near-top-down car-park shot. This is the model-quality bar.** Every car is a body with a
**clearcoat sheen along the shoulder line and roof edge** — a soft, elongated highlight, not a sparkle — and a
**glasshouse that is near-black and unmistakably separate from the body** (windscreen, side glass, rear screen,
each with a visible pillar between them). Under the arches there are **wheels**: dark tyre, lighter hub, seated so
the tyre almost touches the ground. At the rear, a **red lamp cluster** and a **pale number plate**; at the front,
headlamp lenses and a darker grille. Door shut-lines read as fine dark creases. Bodies are red, white, yellow,
cyan, black, olive, silver — saturated colours exist but greys and whites dominate. Vans are visibly taller and
squarer than hatchbacks; the motorcycle is a different animal again. Each vehicle throws a **hard directional
shadow** on the asphalt *and* darkens the ground immediately under the sill.

**`$REF/cs2_1.jpg` — aerial over a roundabout and its approach. This is the behaviour bar.** Cars are spaced, not
convoyed: a queue of four at the signal on the left arm, singles circulating the ring, a box truck and an
articulated semi with a white trailer holding a lane. Everything is *in* its lane, parallel to the lane, and the
ring is circulated anticlockwise. At this zoom a car is a few dozen pixels long: colour, the roof/glass split and
the shadow are all that survive, and they are enough.

**`$REF/cs2_8.jpg` — night downtown in rain. This is the night bar, and the hardest shot.** Vehicles are still
*read as their body colour* — a red van, a white-and-black police car, a blue kei car — because street lighting
falls on them; they are not black cut-outs and they are not self-illuminated. The light comes from the lamps:
**a taillight throws a red pool onto the wet road roughly 6–8 m long behind the car**, and the pool is softer and
dimmer than the lens itself. Tail lenses are small, saturated red, and only faintly haloed. Distant taillights up
the avenue are single red dots. Nothing about the vehicles is brighter than the traffic signal's green lens.
Pedestrians on the sidewalk are dark-clothed figures with readable heads, arms and legs, mid-stride, spaced
irregularly, some in pairs.

**`$REF/cs2_4.jpg` — suburb at low sun. This is the density and pedestrian bar.** The avenue is *empty of cars* —
CS2 does not carpet residential streets. What is alive is the sidewalk: a yellow-jacketed figure walking, another
crossing the zebra, two more mid-block, each ~10 px tall and each throwing a **long golden-hour shadow** across
the pavement. Density is a property of road class and time of day, not a constant.

**`$REF/cs2_2.jpg` — overview.** At 900 m+ individual vehicles have dissolved into the road. Nothing is expected to
be legible; nothing may flicker, sparkle or form a pile at the world origin.

---

## 4. Acceptance criteria

Ordered by how much each moves the score. Every item is checked in a named shot from **§8's capture list**
(`shots/traffic/r<n>/<camera>_<time>.png`, times written `6p5, 12, 17p5, 22`) — every shot named below is on that
list — in the shot's `.json` or `.crops.json`, or in a page-evaluate probe against
`window.__sim.registry.apis.traffic` and `window.__sim.world.traffic` at `?showcase=traffic&headless=1`.

**Four conventions used throughout, so that no item below carries a number without a way to obtain it:**

- **The plates and the three masks.** Anything phrased "on vehicle surfaces" or "the shadow" is measured against a
  mask built inside **one page load**, at one camera and time, with `api.freeze(true)` held for all four renders:
  **A** = the frame as graded; **B** = the same frame with `api.debug.setVisible('vehicles', false)`;
  **C** = the same frame with `api.debug.setVisible('shadows', false)`; **D** = the same frame with
  `api.debug.setVisible('pools', false)`. Then
  **fleet mask** = pixels where A and B differ by > 12/255 in any channel (bodies + their ground shadows + their
  light pools); **shadow mask** = A vs C the same way; **pool mask** = A vs D; and
  **vehicle mask** = fleet mask minus shadow mask minus pool mask. Restore all layers afterwards. "% of the frame"
  always means over all pixels; a percentage "on vehicle surfaces" means over the vehicle mask.
- **Where a material number is read.** Every albedo / roughness / metalness / emissive figure below is a material
  property, not a pixel: the probe traverses `window.__sim.registry.get('traffic').group` and reports the value per
  material class (body paint, glass, tyre, trim, head lamp, tail lamp, brake lamp, mast lens). Emissive radiance is
  `max channel of material.emissive × material.emissiveIntensity`, which `stats().emissive` publishes directly for
  the lamp classes.
- **Where a pinned pixel statistic is taken.** Any measurement inside a named region is taken from that
  region's rect in `<shot>.crops.json`, which
  `node tools/screenshot.mjs … --crops` writes beside the PNG from `window.__sim.cropRects()`, which in turn
  collects `api.cropRects({project, width, height, camera})` from every ready module
  (`window.__sim.project(x, y, z)` maps world to pixels; ARCHITECTURE §8 — **this is the only producer of
  `crops.json`**). **This module must implement `api.cropRects`** (§2) and return exactly these two names, each
  only when that landmark is in frame at that camera:
  - `traffic.lead_vehicle` — the screen-space bounding box of the in-frustum vehicle whose centre is nearest the
    camera, inflated by 20 % on every side (item 7).
  - `traffic.far_asphalt` — a 128 × 128 px box centred on a carriageway point 200–400 m from the camera and
    inside the frame (item 11).

  An empty or missing `crops.json` is a builder defect (CRITIC.md, "Pinned landmarks"), never a licence to grade
  the item by eye. **Every pinned statistic is computed on the full-resolution PNG, never on a downscaled copy** —
  at 480 px wide a 1 m patch is about two pixels.
- **Which clock a probe runs on.** Unless an item says otherwise, probes run at the captures' `speed = 0`, where
  the signal phase is pinned by `?time=` and the fleet still moves (§ standing assumptions). Items that need the
  phase to advance say so and run with `window.__sim.setSpeed(1)` or step the clock with `window.__sim.setTime(h)`;
  items that need repeatability use `api.freeze(true)` + `api.step(n)`. Nothing below is timed off the wall clock,
  and nothing below compares **pixels** between two page loads — item 7's chroma ratio is the one cross-load
  comparison, and it compares an aggregate (mean chroma over a mask inside a landmark rect), not a pixel diff.

1. **Wheels on the road, nothing floating, nothing sunk.** Probe over every live vehicle **with a non-null
   `edgeId`** (§2: mid-junction vehicles are excluded and capped at 12 % of the fleet):
   `|v.y − (world.roads.laneCenter(v.edgeId, v.lane, v.t).y + 0.08)| ≤ 0.03 m` for **100 %** of them, and the
   rendered wheel-contact point is within 0.02 m of `v.y`. Over every pedestrian:
   `|p.y − (world.roads.sample(p.edgeId, p.t).y + 0.21)| ≤ 0.03 m` when `state !== 'cross'`, and
   `… + 0.08` while crossing. Visually confirmed at `closeup_12`, `junction_12`, `queue_12`, `crossing_6p5`:
   no gap of daylight under any tyre, no tyre buried. On the highway grade and any bridge deck the body **pitches
   with the road** — the front and rear contact points differ by the road's slope, verified at `merge_12`.
2. **Vehicles read as vehicles at close range.** At `closeup_12`, `fleet_12` and `queue_12`, every vehicle within
   60 m shows, identifiably: (a) glazing distinct from the body — glass albedo ≤ 0.06 linear, at least three
   separate panes (windscreen / side / rear) with a pillar between them; (b) four wheels (two for `motorbike`)
   with a dark tyre and a lighter hub, tyre bottom within 0.02 m of the ground; (c) a red rear lamp cluster and a
   pale rear plate; (d) a front lamp pair and a darker grille; (e) a roof plane distinct in shading from the sides.
   Probe: `stats().byKindTris[kind]` with `forceLod(0)` at the `fleet` preset — ≥ 700 for `hatchback`, `sedan`,
   `suv`, `van`, `pickup` and `motorbike`; ≥ 1100 for `bus`, `box_truck` and `semi` (§2 says why the per-class
   figure and not `tris / byLod[0]`). Flat-shaded coloured boxes are a 5.
3. **Fleet variety.** `world.traffic.kinds` has ≥ 9 entries, at minimum
   `['hatchback','sedan','suv','van','pickup','box_truck','semi','bus','motorbike']`, each with a distinct
   silhouette and these dimensions ±10 %: hatchback 4.0×1.75×1.48 m, sedan 4.75×1.82×1.45, suv 4.7×1.90×1.72,
   van 5.2×2.00×2.20, pickup 5.3×2.00×1.90, box_truck 8.0×2.40×3.30, semi 6.2 m tractor + 13.6 m trailer
   articulated at the fifth wheel ×2.55×4.00, bus 12.0×2.55×3.20, motorbike 2.1×0.80×1.30. At `fleet_12` an art
   director can name all nine from silhouette alone. ≥ 14 body colours from `ctx.rng`, distributed like the
   references: 55–70 % achromatic (white / silver / grey / black), the remainder saturated (`$REF/cs2_5.jpg`);
   read by probe from the per-instance colour buffer of the body-paint `InstancedMesh` under
   `window.__sim.registry.get('traffic').group`, achromatic = max−min of the sRGB channels ≤ 24/255.
   In any 12 consecutive vehicles in a queue at `queue_12`, no two adjacent share both kind and colour. At least
   two liveries exist on the shared body meshes (taxi, police or delivery) and appear in `stats().byKind`.
4. **Lane discipline, correct side, correct direction.** Probe over every vehicle **with a non-null `edgeId`**
   (§2, same 12 % ceiling): the lateral distance from
   `world.roads.laneCenter(v.edgeId, v.lane, v.t)` to `(v.x, v.z)` is ≤ 0.35 m for ≥ 98 % of vehicles and ≤ 0.8 m
   for 100 % (a lane change in progress is the only excuse), and the angle between `v.heading` and the lane
   tangent is ≤ 0.20 rad for ≥ 98 %. **Direction rule, copied from `src/modules/roads/network.js:laneOffsets`:**
   for a two-way edge with `lanes` lanes, `per = max(1, floor(lanes/2))`; lanes `0 … per−1` have a **positive**
   (right-hand) offset and travel **a → b**, lanes `per … lanes−1` have a negative offset and travel **b → a**;
   for `oneWay` edges every lane travels a → b. A vehicle travelling a → b in a negative-offset lane is a fail.
   Where an edge yields no b → a lane (`alley`: `lanes = 1`, `per = 1`), the edge is **directed a → b only** and
   routing must never require the reverse. At `aerial_12` both carriageways of the avenue and the highway carry
   traffic and the two directions are visibly opposed.
5. **Car-following: no interpenetration, real queues.** Probe over vehicles **with a non-null `edgeId`**: for
   every pair on the same edge and lane, the bumper-to-bumper gap ≥ 1.2 m at rest and ≥ `0.55 × speed` metres in
   motion — a **0.55 s clear-road time gap**, which at the 50 km/h street limit (13.9 m/s) is 7.6 m of clear
   asphalt, or ~0.9 s front-to-front behind a 4.5 m car; **zero** pairs with a negative gap at any of the four
   graded times. Speeds obey the
   type limit: `v.speed ≤ world.roads.types[edge.type].speed / 3.6 × 1.10` for 100 %, and the free-flow mean is
   0.75–1.0 × the limit. At `queue_17p5` there is a visible queue of ≥ 4 stopped vehicles behind a stop line with
   even spacing, and `stats().queued ≥ 6` — this forms at `speed = 0` because the phase is pinned by `?time=` and
   the fleet still rolls (§ standing assumptions). The queue must also **discharge**: with
   `window.__sim.setSpeed(1)` the same probe over one full cycle shows `stats().queued` falling below 2 and rising
   again. Standing still with `speed === 0` must not leave the wheels spinning.
6. **Traffic-light compliance and intersection behaviour.** **Traffic owns the phase in every showcase**
   (§ standing assumptions, §7); props renders the heads where it is live.
   - *The machine (both showcases).* Every node from `ctx.modules.roads.intersections()` — read **after** the
     explicit rebuild in §8 — with `arms.length ≥ 3` and `roundabout === false` is signalised;
     `api.signalState(nodeId)` returns a phase on the fixed **1.2 game-hour (4 320 game-second)** cycle
     (§ standing assumptions), opposing arms green together, with an all-red/amber gap of ≥ 8 % of the cycle
     between phases. Every stop/go decision a vehicle takes comes from that machine, never from
     `props.signalFor`.
   - *Integrated (`?showcase=all`, times 12 and 22) — the probe grades a direction, not an agreement.* For every
     signalised node and every arm, `ctx.modules.props.signalFor(edgeId, atA)` returns `state === 'green'`
     exactly for the arms in `api.signalState(nodeId).greenArms`, **and** returns `source === 'traffic'`
     (props.md:104–109) — that is props mirroring traffic. Traffic taking its own decision from
     `props.signalFor` fails this item even if the two then agree, because that is the read-through loop the
     standing assumptions forbid. Additionally: no vehicle crosses its arm's `stopT` while `api.signalState`
     reports that arm red, no vehicle is stopped at an arm `signalState` reports green for more than 2 s, and
     traffic draws zero masts (item 22).
   - *Phase advance (a clock that never turns is a fail).* Because the phase is a pure function of `world.time`,
     the probe advances the clock rather than waiting: `window.__sim.setTime(h)` then `setTime(h + 0.6)` — half a
     cycle — gives a **different** `greenArms` set at every signalised node, and twelve samples across two cycles
     show every arm green at least once. Same `?time=` and `?seed=` ⇒ same phase, every load.
   - *Compliance is judged at entry, not at position.* Over 3 sampled cycles with `window.__sim.setSpeed(1)`,
     scanning the 100 ms position log of item 13: **zero** vehicles whose `t` crosses their arm's `stopT` while
     that arm is red. A vehicle already past `stopT` when the phase changes is **compliant** and must clear the
     node within the all-red gap — grading it as a violation is the error this clause exists to prevent. At the
     17.5 peak ≥ 1 vehicle waits at each red arm.
   - *Roundabouts* (`roundabout === true`) are unsignalised: entering vehicles yield to ring traffic. With
     `window.__sim.setSpeed(1)`, the probe watches the four radial entry edges named in §8 (the south radial from
     the avenue and the east radial from the `z = -40` street are the two that carry fed traffic) and records ≥ 3
     **yield events** — a vehicle whose `speed` drops below 1 m/s within 12 m of the ring and then enters — over
     20 s, with zero ring/entry pairs closer than the item 5 gap. Seen at `roundabout_12`.
   - At `junction_12` and `junction_22` the crossing arm is moving while the stopped arm queues.
7. **Night is headlights, taillights and pools — not glowing toys.** At `headlights_22`, `street_22`,
   `night_street_22` and `junction_22` (`$REF/cs2_8.jpg`). **Reference frame for every radiance below: linear scene
   value before tone mapping** — the buffer the bloom pass reads, since `effects` runs `UnrealBloomPass` ahead of
   `OutputPass` (`src/modules/effects/index.js:50–54`) — reported by `stats().emissive`, not inferred from pixels.
   At hour 22 `environment` sets `exposure ≈ 2.8` (`environment/index.js:186`), so the bloom threshold is
   `lerp(2.6, 2.2, night) / exposure ≈ 2.2 / 2.8 ≈ 0.79` (`effects/index.js:141`, the same 0.79 `effects_r1`
   issue 2 measured). Everything above 0.79 haloes, in proportion; everything below cannot halo at all.
   - Every vehicle has `lightsOn === true` (probe: 100 % at hour 22, **0 %** at hour 12).
   - Head lamps: a pair of small emissive lenses, radiance **3.0–5.0** — 3.8–6.3× the 0.79 threshold
     (3.0/0.79 = 3.8, 5.0/0.79 = 6.3), so they halo clearly and still sit below the signal lens — plus a forward
     **light pool projected on the road** 10–18 m long, 3–4.5 m wide, warm-white, additively blended, peaking at
     ≤ 0.55 of the lens luminance and falling to 0 at its far edge.
   - Tail lamps: radiance **1.2–2.0** — 1.5–2.5× the threshold, so the halo exists but is faint, which is exactly
     the reference's "small, saturated, only faintly haloed" — and saturated red (r ≥ 2.5 × g and ≥ 2.5 × b).
     Brake lamps **3.5–5.0** (4.4–6.3×) whenever `speed` is dropping by > 1.5 m/s², with a rear pool 6–8 m long.
   - **Ceiling, so the prose follows from the numbers:** no vehicle emissive radiance may exceed **6.5**, the
     lowest signal-lens radiance (item 22). Probe: `max(stats().emissive.head, .tail, .brake) < 6.5` always, and
     `6.5 ≤ stats().emissive.mast` **only where this module draws a mast**. Where it draws none —
     `stats().emissive.mast === null`, i.e. `?showcase=all`, where the mast is props' (item 22) — the ceiling is
     the literal 6.5 and the mast comparison is skipped; comparing against `null` would fail a module that is
     behaving correctly. "Nothing about the vehicles is brighter than the signal's green lens" is then a
     consequence of the ranges, not a claim in tension with them.
   - The vehicle **body is still readable in colour** at 22:00 under lamps: over the **vehicle mask** (§4
     preamble) inside the `traffic.lead_vehicle` rect of `junction_22.crops.json`, mean chroma
     (max − min of the RGB channels, 0–255) is ≥ 60 % of the same measurement inside the same landmark's rect and
     mask at `junction_12` — both taken on the full-resolution PNG, both shot with `--crops`. The landmark tracks
     the nearest vehicle in each frame, so the two rects cover a comparable body even though their pixel
     coordinates differ. Silhouetted black cut-outs fail.
   - Pixels at 255 in all three channels are < 0.05 % of the frame and all of them fall inside the vehicle mask or
     a mast head; the frame's p1 luminance > 0 and p99 < 250. No lamp lens is larger on screen than the signal
     head next to it.
8. **Density follows the hour, not a constant.** The fleet target is
   `round(maxVehicles × simulation.profile(hour).traffic)` with `maxVehicles = 240`, and pedestrians
   `round(260 × simulation.profile(hour).pedestrians)`. Probe `stats()` at the four graded hours (6.5, 12, 17.5, 22, set with `window.__sim.setTime(h)`) must satisfy:
   `vehicles(17.5) ≥ 200`, `vehicles(12)` in 130–190, `vehicles(6.5)` in 60–110, `vehicles(22)` in 30–65, and
   `vehicles(22) ≤ 0.35 × vehicles(17.5)`. The difference is visible: `aerial_17p5` shows visibly more traffic
   than `aerial_22` on the same roads. Class mix varies with the hour — `box_truck`+`semi` are ≥ 18 % of the
   fleet at 6.5 and ≤ 10 % at 17.5. `alley` and `gravel` edges carry ≤ 1 vehicle per 100 m; `highway` carries the
   highest density. When `ctx.modules.simulation.profile` is absent the module uses its own copy of the same
   curve (peaks 8.1 and 17.4) and the numbers above still hold. Because the clock is stopped in a graded shot, the
   target for the pinned hour must be **reached, not grown into**: `showcase.setup` seeds the fleet to target
   synchronously, and after any change of hour or density the fleet is within 10 % of target inside 3 s of agent
   time — a capture happens ~2–3 s after `__sim.ready`.
9. **Pedestrians on the sidewalk.** Only on edges with `world.roads.types[type].sidewalk > 0.05`
   (`alley` 2, `street` 3, `avenue` 4 — never `highway`, `ramp` or `gravel`). Lateral offset
   `±(asphaltHalf + sidewalk × 0.5)` ± 0.6 m jitter, so `|offset|` = 6.5 ± 0.6 m on a street and 10.0 ± 0.6 m on
   an avenue; probe: 100 % of `state !== 'cross'` pedestrians within that band, **0 %** on the carriageway.
   Figures are 1.60–1.85 m tall (children 1.20–1.40, ≤ 15 % of the population), have a head, torso, two arms and
   two legs, and animate a walk cycle at 1.1–1.5 m/s with a stride whose frequency scales with speed; adjacent
   pedestrians are out of phase (probe: variance of `p.phase` > 0.05 across the 20 nearest to the camera).
   ≥ 6 clothing colours.
   Crossing happens only within 3 m of a crosswalk at an intersection returned by `ctx.modules.roads.intersections()`,
   with a `'wait'` state at the kerb during the conflicting green. Verified at `crossing_12`, `crossing_6p5`,
   `street_12`, `night_street_22` (`$REF/cs2_4.jpg`, `$REF/cs2_8.jpg`).
10. **Shadows and contact.** Every vehicle and pedestrian mesh has `castShadow = true` and `receiveShadow = true`
    and is on `LAYERS.VEHICLES = 5` with `renderOrder = RENDER_ORDER.VEHICLES = 50`. At `closeup_17p5` and
    `junction_6p5` each vehicle within 60 m throws a shadow whose long axis is ≥ 1.8 × the vehicle length.
    Additionally each vehicle carries a **contact-darkening patch** baked into its own geometry at
    wheel-contact + 0.012 m with `polygonOffset: true,
    polygonOffsetFactor: -4, polygonOffsetUnits: -8` (more negative than the road markings' `-3 / -6`,
    `src/modules/roads/materials.js:281`) and `depthWrite: false`.
    **Both darkening numbers are measured in pixels and scale themselves, at `closeup_17p5`:** let `L` be a
    vehicle's on-screen length in pixels from its **vehicle-mask** bounding box (§4 preamble), and let *lit
    asphalt* be the pixels in neither the vehicle nor the shadow mask lying `0.60–0.80 × L` from that vehicle's
    tyre-contact pixels. The mean luma of asphalt within `0.12 × L` of the contact pixels is **15–35 % below** the
    lit-asphalt mean; and the shadow **core** — the darkest 20 % of that vehicle's **shadow-mask** pixels — has a
    mean luma ≤ 0.45 × the lit-asphalt mean. No z-fighting or flicker against asphalt, markings or crosswalks at
    any camera or time.
11. **Materials: paint, not plastic; no sparkle; no clipping.** Body paint `roughness` 0.25–0.42 with
    `metalness ≤ 0.15` plus a clearcoat-like specular tint; glass `roughness ≤ 0.12`, `metalness 0`,
    albedo ≤ 0.06 linear; tyres `roughness ≥ 0.85`; chrome/trim `metalness ≥ 0.8`, `roughness 0.25–0.4` and
    ≤ 4 % of a vehicle's surface area. At `skyline_12`, `aerial_12`, `aerial_17p5`, with `api.freeze(true)` held
    across both renders: pixels with luma > 245 **inside the vehicle mask** (§4 preamble) are < 0.05 % of the
    frame; no per-pixel speckle (inside the `traffic.far_asphalt` rect of that shot's `.crops.json`, on the
    full-resolution PNG, < 0.2 % of pixels differ from both horizontal neighbours by > 40/255). Any custom `ShaderMaterial` is registered with
    `ctx.modules.environment?.setupMaterial?.(mat)` so CSM and fog apply — an unfogged vehicle at 600 m against
    fogged road is a fail.
12. **LOD, culling, and no pile at the origin.** Three LODs with the switch distances
    LOD0 ≤ 90 m, LOD1 90–260 m, LOD2 260–1200 m, cull > 1200 m; pedestrians LOD0 ≤ 60 m, LOD1 60–160 m,
    cull > 220 m. LOD1 ≤ 0.35 × LOD0 triangles, LOD2 ≤ 45 triangles. **LOD parity, taken inside one page load
    with `api.freeze(true)` so the two renders differ only by the LOD:** `forceLod(0)` vs `forceLod(1)` at the
    `junction` preset gives meanAbs < 4/255 over the frame, and for each of the five nearest vehicles the
    **vehicle-mask** bounding box (§4 preamble) moves by ≤ 2 px on every side; the LOD switch must not change body
    colour, size or heading. Probe: every `InstancedMesh.count` equals the number of agents actually assigned to
    it, and **no instance sits within 5 m of (0, 0)** unless a road is there — a cluster of parked instances at
    the world origin at `overview_12` / `aerial_12` is an automatic fail. **No popping**, measured step-pinned instead
    of by wall clock (two loads are not comparable, § standing assumptions): at `aerial_12`, render, then
    `api.freeze(true); api.step(4)` — 0.2 s of agent time at the 20 Hz fixed step — and render again; the two
    frames differ by meanAbs < 3/255 outside the fleet mask.
13. **Motion is continuous.** Probe sampling `vehicle(id)` at 100 ms intervals for 3 s: no vehicle's position
    jumps more than `speed × dt + 0.5 m` in a step, including at edge ends and through intersections
    (a teleport across a node is a fail); heading changes ≤ 2.5 rad/s; agents cross a node on a curved path, not
    a corner. The fixed agent step is ≥ 20 Hz accumulated from the **raw `dt`** handed to `update()`
    (§ standing assumptions) with render-time interpolation, so motion is smooth and identical at any frame rate
    and at any clock speed, `speed = 0` included. Speeds are not uniform: the standard deviation of
    free-flow speed across the fleet is 8–20 % of the mean.
14. **Reads correctly at every zoom.** `aerial_12`: vehicles are individually distinguishable, in their lanes,
    with visible shadows; the road is not carpeted (occupancy ≤ 35 % of lane length on any single edge).
    `skyline_12` and `skyline_17p5`: ≥ 40 vehicles lie inside the camera frustum (probe: count the entries of
    `world.traffic.vehicles` whose `(x, y, z)` projects inside the NDC cube of `ctx.camera.camera`),
    reading as coloured dashes on the carriageway, no flicker, no sparkle. `street_12` / `street_22`: at least
    one vehicle and two pedestrians are in frame at the core `street` preset (target `[40, 0, 40]`) and at the
    core `night_street` preset (target `[-40, 0, 60]`) — the showcase network (§8) must guarantee this.
15. **Outside connections (ARCHITECTURE §15).** `api.outsideConnections()` returns ≥ 3 entries — §8 stages four,
    so one may be lost without failing this gate — every one a node
    within 60 m of the map border (`|x| ≥ 964` or `|z| ≥ 964`) on a `highway` or `avenue` edge. External traffic
    spawns and despawns **only** at those nodes and only when the spawn point is > 350 m from the camera or
    outside the frustum — no vehicle appears or vanishes on screen (probe: log every spawn/despawn over 20 s,
    zero within 350 m of the camera and in-frustum). At the 17.5 peak ≥ 15 % of the fleet originates from an
    outside connection, and `box_truck`/`semi` are over-represented there. `spawnVehicle('bus', route)` with an
    explicit edge list follows exactly that route in order, loops if `loop: true`, and returns a valid id;
    `despawn(id)` removes it from `world.traffic.vehicles` and from the instance buffers in the same frame.
16. **Budget — traffic is graded on what traffic owns.** Binding numbers, all attributable to this module: probe
    `stats().draws ≤ 45` and `stats().tris ≤ 300_000`; `moduleMs.traffic ≤ 1.6` at every shot and ≤ 0.6 with the
    fleet at the 22:00 size; `stats().stepMs ≤ 1.2`; `modules.traffic.initMs ≤ 1200`; `textures ≤ 6` added by this
    module, at most four of them 1024² and none above it (§5); declared `budget` in `index.js` exactly `{ drawCalls: 60, triangles: 300_000 }`.
    From every shot `.json` in §8's capture list, whole-frame `drawCalls ≤ 200` at every camera/time (roads alone peaks at 44 —
    `shots/roads/rdev2/summary.json` — so this ceiling is traffic's to keep). **Whole-frame triangles are recorded
    in every shot and graded as a delta, never as an absolute this module cannot control:** the whole-frame ceiling
    is ARCHITECTURE §9's `3_000_000` for the entire demo city, and the traffic-attributable figure is the
    difference between a shot and the same camera/time with `setDensity(0)` after the fleet has emptied, which must
    be **≤ 320 000 triangles**. A whole-frame total inherited from another module's geometry — roads' own showcase
    already renders 1 208 995 triangles at its `highway` preset and 984 616 at `merge`, before a single vehicle
    exists, and `BUILDER.md` forbids traffic from editing that folder — is **not** a traffic failure and must not
    be graded as one. No allocation in `update()` (probe: `__sim.stats().heapMB` drift < 4 MB over 30 s at 17.5
    with `__sim.setSpeed(4)`; skip this check when `heapMB` is `null`, which is whenever `performance.memory` is
    unavailable — `src/core/debug.js:24`).
17. **`ready` in the integrated shots.** `errors: []` and `modules.traffic.status === 'ready'` in the three
    named shots — `--showcase all --time 12`, `--showcase all --time 22`, and one
    `--showcase traffic --w 1280 --h 720` — as well as in every shot of §8's capture list. No warning about a missing road API.
18. **API contract.** Probe, item by item: every function in §2 exists and returns the documented shape;
    `signalState(nodeId)` returns `null` for a non-intersection node and an object for every signalised one;
    `flowGrid().congestion` is a 256² `Float32Array` whose values are 0 off-road and > 0 on the busiest avenue at
    17.5, with `sample('congestion', x, z)` agreeing with `congestion[index(x, z)]`; `step(n)` advances exactly
    `n` fixed steps and nothing else, `freeze(true)` leaves every position unchanged across 30 frames, and each
    `debug.setVisible(layer, false)` removes exactly that layer and nothing else;
    `setDensity(0)` empties the fleet within 3 s and
    `setDensity(null)` refills it; `serialize()` → `deserialize()` round-trips to the same `stats().byKind` and
    the same vehicle count; `vehicle(id)` matches `world.traffic.vehicles.get(id)` by reference.
19. **`stats` is live and honest.** Probe at 17.5 and at 22: `world.traffic.stats.count === vehicles.size`;
    `avgSpeed` within 0.5 m/s of the mean of `v.speed`; `congestion` ∈ [0,1], ≥ 0.25 at the 17.5 peak on the
    signalised junction network and ≤ 0.10 at 22:00 — both measured with `window.__sim.setSpeed(1)` over 30 s so
    the phase advances and queues discharge; at `speed = 0` a permanently red arm inflates congestion and the
    22:00 number is not graded. `ui`'s selection path (`src/modules/ui/hud.js:796`) reads
    `world.traffic.vehicles.get(id)` — every field in §2 must be present and human-readable there.
20. **Reacts to the road graph.** Probe: `world.roads.removeEdge(id)` on an occupied edge leaves **zero**
    vehicles or pedestrians referencing it after one frame, with no error and no vehicle stranded off-road;
    `world.roads.addEdge(...)` makes the new edge drivable within **1 s of agent time** — that is one second of
    real `dt`, not of game time, so the check holds at the captures' `speed = 0`. With an **empty** road graph
    (probe deletes every edge) the module logs one warning, holds `stats().vehicles === 0` and throws nothing.
21. **Determinism, graded from a pinned state.** Boot is not a pinned state — the number of steps taken before
    `__sim.ready` depends on machine load (§ standing assumptions) — so the probe pins it first:
    `api.freeze(true)`; `api.setDensity(0)`; `api.step(60)` to flush; `api.setDensity(null)`; `api.step(1)` to
    re-seed; `api.step(600)` (30 s of agent time at the 20 Hz fixed step).
    **Ids are not comparable across runs** — §2 makes them unique for the session and never reused, and the
    number of spawns and despawns before the pin depends on machine load, so the id counter stands at a different
    value in run A and run B. The comparison is therefore over **the first 20 entries of
    `world.traffic.vehicles` in insertion order**, never over "ids 1–20". Two runs at `--seed 1337 --time 12`
    give identical `stats().byKind` and identical `x, z, heading` (to 1e-4) for those 20 entries; `--seed 7`
    differs in ≥ 30 % of `byKind` counts.
    Re-seeding re-forks the module rng. The real contract:
    ``ctx.rng.fork(label)`` is ``new RNG(this.seed, `${this.label}/${label}`)`` (`src/core/rng.js:64`) — keyed on
    `world.seed` and the label chain **only**, with no notion of sequence position — so
    `ctx.rng.fork('traffic:fleet')` restarts the identical stream every time it is called, which is exactly the
    property this item needs. Nothing in that chain carries `world.time.hour`: if the re-seeded fleet is also to
    differ by hour, fold the hour into the label (`fork('traffic:fleet:' + hour.toFixed(2))`).
    `Date.now()` / `performance.now()` appear only in profiling counters; agent stepping accumulates from the `dt`
    handed to `update()` and the signal phase from `world.time`, never the reverse and never the wall clock.
22. **Fallback signal masts, only where `props` is not live.** `props` owns signal geometry (props.md item 10);
    traffic draws masts **only** when `typeof ctx.modules.props?.signalFor !== 'function'` **and** no item in
    `world.props.items` has `kind === 'trafficlight'` — i.e. under `?showcase=traffic`, where props is not loaded
    and the junction and night shots would otherwise have no signal head to grade item 7 against. In that case
    each signalised intersection carries one mast per arm: a 5.2–6.0 m pole with a three-lens head facing the
    incoming arm, matching props' geometry so the two are interchangeable, lenses showing the live phase
    (red / amber / green, emissive radiance **6.5–9.0** — the brightest thing on the street at night, above the
    6.5 vehicle ceiling in item 7, as in `$REF/cs2_8.jpg`), plus a pedestrian head where a crosswalk exists.
    Probe: adding an item with `kind: 'trafficlight'` to `world.props.items` and emitting `props:changed` removes
    every traffic mast this module drew within one frame and `stats().draws` drops; under `?showcase=all` traffic
    draws zero masts and `stats().emissive.mast` is `null`. Masts count against the same budget.

---

## 5. Budget

Consistent with ARCHITECTURE §9 (traffic's allotment is 150 of the 1500 draw calls); this module targets 60 so the
demo city keeps headroom, and instances per class rather than per chunk because the agents move every frame.

| Metric | Budget | Where measured |
|---|---|---|
| Declared `budget` in `index.js` | `{ drawCalls: 60, triangles: 300_000 }` | source |
| Traffic's own draw calls | ≤ 45 — the enumeration totals 33 (9 classes × 3 LOD = 27, + peds 2 + beams 1 + pools 1 + masts 2), leaving 12 for extra kinds and liveries | probe `stats().draws` |
| Whole-frame draw calls, `?showcase=traffic` | ≤ 200 at every camera/time | shot `.json` `drawCalls` |
| Traffic's own triangles | ≤ 300 000 **submitted this frame**, after LOD and culling — not authored source geometry (§2) | probe `stats().tris` |
| Whole-frame triangles | ≤ 3 000 000 (ARCHITECTURE §9, the whole demo city). Recorded in every shot, **not** attributed to traffic: roads' own showcase already renders 1 208 995 at `highway` | shot `.json` `triangles` |
| Traffic's attributable triangle delta | ≤ 320 000 — full density minus the same camera/time at `setDensity(0)` | two shots |
| Triangles per vehicle | LOD0 700–1 800 (bus/semi ≤ 2 600), LOD1 ≤ 0.35 × LOD0, LOD2 ≤ 45 | probe with `forceLod` |
| Triangles per pedestrian | LOD0 ≤ 320, LOD1 ≤ 70 | probe with `forceLod` |
| Agents | ≤ 240 vehicles, ≤ 260 pedestrians live at once | probe `stats()` |
| `update()` per frame | ≤ 1.6 ms at the 17.5 peak; ≤ 0.6 ms at the 22:00 fleet | `.json` `moduleMs.traffic` |
| Fixed agent step | ≥ 20 Hz, ≤ 1.2 ms per step, ≤ 4 steps caught up per frame | probe `stats().stepMs` |
| `init()` | ≤ 1200 ms (procedural meshes + one atlas) | `.json` `modules.traffic.initMs` |
| `showcase.setup()` | ≤ 6 s under SwiftShader | `.json` `elapsedMs` vs baseline |
| GPU texture memory | ≤ 24 MB: ≤ 6 textures, **at most four at 1024²** and none above it — 1024² RGBA with mipmaps ≈ 5.6 MB, so 4 × 5.6 = 22.4 MB fits and 6 × 5.6 = 33.5 MB would not; the other two ≤ 256². The four are one vehicle albedo/livery atlas, one ORM, one emissive mask, one light-pool gradient | probe `stats()` / renderer info |
| JS heap drift | < 4 MB over 30 s at speed 4; skipped when `heapMB` is `null` (no `performance.memory`) | `__sim.stats().heapMB` (`src/core/debug.js:24`) |

---

## 6. Known failure modes

Booked against neighbouring modules in `docs/critic/` and waiting for this one. Each is written as the symptom on
screen so a round is not spent rediscovering it.

- **Vehicles floating or sunk.** `roads_r1` blocker: "Terrain protrudes through the carriageway (road sunk up to
  0.44 m)". Using `world.terrain.getHeight` instead of `laneCenter().y + 0.08` buries every wheel 8 cm; using the
  node height without the lift does the same. Symptom: a dark seam where the tyre meets the road, or daylight
  under the car at `closeup_12`.
- **Z-fighting stripes under the car.** A contact shadow or light pool drawn as a separate ground quad at the
  asphalt height flickers against the road and the lane markings as the camera moves. Symptom: shimmering
  rectangles under vehicles at `aerial_12`. Fix is the polygonOffset/`depthWrite:false` recipe in item 10.
- **Night that is really dusk, and lamps that out-glow their surface.** `effects_r1` blocker: "Night is a milky
  blue dusk, and only lamp heads ever glow" (the same report measured the night bloom threshold at 0.79, which is
  where item 7's numbers come from). Symptom here: headlight quads as floating white lozenges with no pool on the
  road, **taillights as pink blobs larger than the car**, and vehicles still fully lit at 22:00 because the module
  never read the night factor. Use `world.weather.night` / `ctx.modules.environment?.getNight?.()` — never
  re-derive night from `hour`.
- **Headlights on at noon.** `lightsOn` latched `true` at init. Symptom: white lozenges on the front of every car
  at `closeup_12`; probe item 7 catches it.
- **Specular sparkle.** `roads_r1` major: "White speckle/sparkle across asphalt at mid distance". Car paint with a
  normal map and no roughness floor produces the same crawling white pixels on roofs at `skyline_12`.
- **The pile at the origin.** Unused `InstancedMesh` slots left with an identity matrix stack every spare vehicle
  at (0, 0, 0). Symptom: a metallic blob in the middle of the map at `overview` / `aerial_12`. Set `count` to the
  live number, or park spares at `y = -10000`.
- **Convoy locking.** Every vehicle spawned with the same speed and the same follow parameters travels
  bumper-to-bumper in a perfect train. Symptom: `aerial_17p5` shows dashed lines of identical cars.
- **One model, one colour.** Symptom: a monochrome fleet of identical hatchbacks — reads as programmer art
  regardless of shading. Compare `$REF/cs2_5.jpg`.
- **Skating and corner-cutting.** Heading interpolated separately from position, so cars slide sideways; or the
  path through an intersection is a straight chord that crosses the kerb. Symptom at `junction_12`: a car with
  its nose 30° off its direction of travel, or a wheel on the sidewalk.
- **Teleport at the node.** The agent finishes an edge and reappears at `t = 0` of the next one 8 m away.
  Symptom: a vehicle blinking across the junction; item 13's 100 ms probe catches it.
- **Pedestrians in the road or in the air.** Offset taken from `edge.width / 2` (the frontage line, `8 m` on a
  street) instead of `asphaltHalf + sidewalk × 0.5` puts them on the kerb edge; forgetting the 0.21 m sidewalk
  height floats them. Symptom at `crossing_12`: figures walking on the kerb face or hovering.
- **Capsule people.** Pedestrians as a capsule or a billboard read as programmer art at `street_12`;
  `simulation_r1` booked the same thing against its trees ("Trees are lollipops"). Heads, arms, legs, walk cycle.
- **UI/probe overflow at 720p.** `ui_r1` major: layout breaks at 1280×720. Any debug overlay this module draws
  must be off by default and must not be part of the graded frame.
- **A dead fleet, or a phase that cannot be probed.** Two opposite versions of the same mistake, both booked by
  `simulation_r1` issue 6 and props.md:59–62. (a) Stepping agents from `dt × world.time.speed`: the gauntlet runs
  at `speed = 0` (`main.js:82`), so the product is zero and **every graded frame is a still life** — no queues, no
  yields, no spawns, and a third of this list becomes unobservable. Step from the raw `dt` handed to `update()`.
  (b) Driving the signal phase from accumulated `dt`: every capture then lands on a different phase and every
  pixel diff is meaningless. Derive the phase from `world.time` only. Symptom of (a): identical `stats().queued`
  and identical positions in two shots taken minutes apart; symptom of (b): `junction_12` shows a different arm
  green on every re-shoot. The version already on disk (`index.js:98–99`, see the preamble) is (a) with a 0.5
  floor: not a still life, but agent motion that changes with `?speed=`, which item 13 forbids.
- **Reading the road graph before it exists.** `showcase.setup` stages nodes and edges and then immediately reads
  `intersections()` or `edge.ring`. Both are produced by `RoadBuilder.rebuild()` (`build.js:1231–1233` for the
  intersection list, `detectRings()` at `build.js:166–185` for the `ring` flag), and roads coalesces rebuilds over
  0.05 s (`roads/index.js:41–44`), so at the end of `setup()` the list is empty and no edge is a ring. Symptom: no
  signals anywhere, `roundabout === true` for nothing, and item 6 ungradable. Call
  `ctx.modules.roads.rebuild()` first (§8) — roads' own showcase does exactly this.
- **Fleet that ignores `roads:changed`.** Roads rebuilds coalesce over 0.05 s; a vehicle holding a stale `edgeId`
  drives through empty air after an edit. Symptom: vehicles off the road after any tools interaction.
- **Fog and CSM skipped.** A custom `ShaderMaterial` not passed to `environment.setupMaterial` renders crisp and
  unshadowed at 600 m against fogged road. Symptom: a band of over-contrasted vehicles at `skyline_17p5`.

---

## 7. Dependencies and their real APIs

`dependencies: ['terrain', 'roads', 'simulation']`. **`props` is a soft, undeclared dependency, feature-detected
for one purpose only — the mast gate in item 22.** It is left undeclared not to avoid a cycle — there is none;
props declares `dependencies: ['terrain','roads']` (props.md:27, :658) and never traffic — but because declaring
it would make `selectModules` initialise the whole props scatter inside `?showcase=traffic`
(`src/core/showcase.js:20–31`) and change every graded traffic frame. The split it creates is about **geometry**,
not the clock: under `?showcase=all` and `democity` props draws the masts and heads and traffic draws none; under
`?showcase=traffic` traffic draws its own. **The phase is traffic's in both.** Feature-detect with
`typeof ctx.modules.props?.signalFor === 'function'`, never by module name. Remember
`ctx.modules[name]` **is the api object itself** (`registry.makeCtx` passes `modules: this.apis`, and
`this.apis[name] = def.api`) — call `ctx.modules.roads.intersections()`, not `ctx.modules.roads.api.…`.

**`world.roads` (`src/modules/roads/network.js`) — the single source of road geometry:**

```js
nodes: Map<id, {id, x, y, z, designY, edges:Set<id>}>
edges: Map<id, {id, a, b, type, lanes, width, oneWay, ctrl, length, elevation, trimA, trimB, bridge, ring?}>
types[type] = {width, lanes, speed, sidewalk, asphaltHalf, cornerR, laneW, shoulder, median, oneWay}
  // alley {8,1,30,2,2.0,4,3.6,0,0}  gravel {8,2,30,0,4.0,4,3.5,0,0}  street {16,2,50,3,5.0,6,3.8,0,0}
  // avenue {24,4,60,4,8.0,8,3.6,0,0}  highway {32,6,100,0,16.0,10,3.8,1.9,2.4}  ramp {10,1,60,0,5.0,8,3.8,1.0,0,oneWay}
sample(edgeId, t) -> {x, y, z, tangent:{x,z}, normal:{x,z}}          // t ∈ [0,1] by arc length
laneCenter(edgeId, laneIndex, t) -> {x, y, z, tangent:{x,z}}          // lane 0 = rightmost in the a→b direction
frontage(edgeId) -> [{side:'left'|'right', from, to, x, z, heading, width, length}]
nearestEdge(x, z, maxDist) -> {edge, t, point:{x,y,z}, dist} | null
addNode(x,z) -> id ; addEdge(a,b,type,opts) -> id ; removeEdge(id) ; removeNode(id) ; version
```

`types[type].speed` is km/h — divide by 3.6. `laneCenter` returns the **profile** height; add `0.08` for the
asphalt, `0.21` for the sidewalk top. Lane direction split is `per = max(1, floor(lanes/2))` as in item 4.

**`ctx.modules.roads` (`src/modules/roads/index.js`):**

```js
rebuild()
lampPositions(edgeId) -> [{x, y, z, heading, side:'left'|'right'|'median', edgeId, t}]
intersections() -> [{id, x, y, z, roundabout,
                     arms:[{edgeId, dir:{x,z}, trim, width, sidewalk, type, ring, lanesIn, stopT, atA}]}]
nodeInfo(id) -> record|null ; stats() -> {edges,nodes,meshes,tris,bridges,terrainVerts,ms}
types() ; edges() -> [{id,a,b,type,len,bridge,ring}] ; edgeDebug(edgeId, step) ; _builder()
serialize() ; deserialize(data)
```

`intersections()` is the signal source: `stopT` is the t of the stop line on that arm, `atA` says which end of the
edge the arm meets, `lanesIn` is the incoming lane count, `ring`/`roundabout` flag circulatory nodes. **It returns
`[]` until the first rebuild** — the list is built from `this.nodeInfo` inside `RoadBuilder.rebuild()`
(`build.js:1231–1243`) and the `ring` flag is set by `detectRings()` (`build.js:166–185`), while `update()`
coalesces rebuilds over 0.05 s (`roads/index.js:41–44`). Anything that stages road geometry must call
`ctx.modules.roads.rebuild()` before reading `intersections()`, `edge.ring` or `laneCenter` (§8).

**`ctx.modules.props` (`src/modules/props/index.js`) — present only when props is initialised (`?showcase=all`,
`democity`); guard every call:**

```js
signalFor(edgeId, atA) -> {state:'red'|'amber'|'green', timeToChange, source:'traffic'|'props'} | null
     // props.md:108-109: a pure read-through of ctx.modules.traffic.signalState(nodeId) whenever traffic is there
signals() -> [{nodeId, x, y, z, arms:int, phase:int, greenArms:[edgeId], cycle, source,
               armStates:[{edgeId, atA, state, timeToChange}]}]   // props.md:104-106; a superset of traffic's
place(kind, x, z, opts?) ; remove(id) ; at(x, z, radius) ; count(kind?) ; lampsFor(edgeId) ; stops()
```

`signalFor(edgeId, atA)` takes the arm's edge and the `atA` flag straight from `roads.intersections()`, so no
translation layer is needed in either direction — but the direction is **props reading traffic**. Traffic
**never calls `signalFor` or props' `signals()` to decide a lens state or a stop**: that would route its own
machine's answer back through props and into itself. Traffic's only use of `ctx.modules.props` is item 22's gate —
is props live, and has it published a `trafficlight` item — and it draws no signal geometry whenever it has.

**`ctx.modules.simulation` (`src/modules/simulation/index.js`, curves in `activity.js`):**

```js
profile(hour, out) -> {hour, commute, traffic, pedestrians, awake, residential, commercial, office, industrial, streetLights}
activity(hour) -> commute 0..1 ; curves ; constants ; economy() ; grids() ; noiseAt(x,z) ; step(n)
```

Pass a reusable `out` object — `profile(hour, this._prof)` allocates nothing.

**`ctx.modules.environment` (`src/modules/environment/index.js`):**

```js
setupMaterial(material)   // CSM + fog uniforms for any custom ShaderMaterial — call it for every material you make
hookScene()               // re-scan after adding meshes
getNight() -> 0..1 ; getSunDirection() ; getExposure() ; getWeather()
```

Also read `world.weather.night` / `.rain` / `.wetness` directly; they are published every frame.

**`world.terrain`:** `getHeight(x,z)`, `getNormal(x,z,out)`, `isWater(x,z)`, `getSlope(x,z)` — used **only** to
reject spawn points and to place nothing; vehicle and pedestrian heights come from `world.roads`.

**Core:** `ctx.rng.float/int/range/pick/weighted/gauss/shuffle/fork` (the only randomness source);
`ctx.camera.camera` for LOD distance and `ctx.camera.registerPreset(name, preset)` in the showcase;
`constants.LAYERS.VEHICLES = 5`, `constants.RENDER_ORDER.VEHICLES = 50`, `constants.TILE_SIZE = 128`.

**Degradation when a dependency is missing or empty** — every row must be probed, none may throw:

| Missing | Behaviour |
|---|---|
| `roads` failed, or `world.roads.edges.size === 0` | one `log.warn`, `stats().vehicles === 0`, empty groups, no error, module stays `ready`; picks traffic up within 1 s of the first `roads:changed` |
| `simulation` absent | internal copy of `traffic(hour)` / `pedestrians(hour)` with the same 8.1 / 17.4 peaks; item 8's numbers still hold |
| `props` not loaded (`?showcase=traffic`) | phase unchanged — it is traffic's in every showcase (1.2 game-hour cycle, pure function of `world.time`) — **and** traffic draws its own masts (item 22) |
| `props` live (`?showcase=all`, `democity`) | phase still traffic's; props reads `api.signalState(nodeId)` and drives every lens from it, so `signalFor(…).source === 'traffic'` (item 6). Masts: traffic draws none once any `world.props.items` entry has `kind === 'trafficlight'`; in the window before props has published one, traffic's masts stand and are removed within one frame of `props:changed` |
| `environment` absent (cannot happen in practice) | materials still render; every `setupMaterial` call is optional-chained |
| `terrain` flat fallback | unaffected — heights come from roads |

---

## 8. Showcase

`showcase.setup(ctx)` stages its own road network through the public `world.roads.addNode/addEdge` API (it must
**not** import from `src/modules/roads/`), then — **before reading anything back from the graph** — calls
`ctx.modules.roads.rebuild()`. That call is not optional: `intersections()` is built inside
`RoadBuilder.rebuild()` and the `ring` flag that makes `roundabout === true` true at all is set by `detectRings()`
during the same rebuild, while roads' `update()` otherwise coalesces rebuilds over 0.05 s and has not run when
`setup()` returns (§7; roads' own showcase calls `rebuildNow()` immediately after staging for this reason). Only
then does setup seed the fleet — to the full target for the pinned hour, synchronously (item 8) — and call
`ctx.modules.environment?.hookScene?.()`. The network is deterministic from `world.seed` and must contain, with
every extent given so nothing is guessed:

1. **A signalised avenue × street crossroads centred at (40, 40).** The `avenue` runs east–west along `z = 40`
   from `x = -300` to `x = 300`, **split at nodes `x = -200, -120, -40, 40, 120, 200`** so every crossing and the
   roundabout's south radial have a node to meet. `street`s run north–south at `x = -120, -40, 40, 120, 200` from
   `z = -140` to `z = 200`. Two east–west `street`s: **`z = -40` from `x = -120` to `x = 200`** (its west end at
   `(-120, -40)` is where the roundabout's east radial lands) and **`z = 120` from `x = -120` to `x = 200`**.
   Four-arm signalised nodes with crosswalks. The core `street` preset (target `[40, 0, 40]`), `closeup`
   (target `[20, 6, 20]`) and `night_street` (target `[-40, 0, 60]`) all land on live traffic — this is a
   requirement, not a coincidence (item 14).
2. **A roundabout at (-200, -40)**: an 8-segment one-way `street` ring of radius 28 m, so unsignalised yielding
   and anticlockwise circulation are visible (`$REF/cs2_1.jpg`). Its four radial entries, endpoints stated, all
   two-way `street` unless noted, each one connecting to something that actually feeds it:
   - **south** `(-200, -12) → (-200, 40)`, meeting the avenue at its `x = -200` node — the main feed;
   - **east** `(-172, -40) → (-120, -40)`, meeting the west end of the `z = -40` street;
   - **north** `(-200, -68) → (-200, -140) → (-120, -140)`, closing a circuit onto the south end of the
     `x = -120` street, so traffic loops rather than dead-ends;
   - **west** `(-228, -40) → (-980, -40)` as an `avenue` — the fourth outside connection (item 15).
   Item 6's yield probe watches the **south** and **east** radials, which are the two carrying fed traffic.
3. **A dual-carriageway highway** sweeping south of the grid from `(-1000, 340)` to `(1000, 140)` via two bezier
   segments, with a **one-way `ramp` merging tangentially** into it from the avenue's east end at `(300, 40)` —
   the merge is the `merge` preset. Both highway ends are **outside connections** at the map border.
4. **A further outside connection**: the street at `x = 40` continued north from `(40, -140)` to `(40, -1000)` as
   an `avenue`. With the highway's two ends and the roundabout's west radial this makes **four**, one more than
   item 15's minimum, so a staging slip costs a spare rather than the gate.
5. **An alley** through one block (`x = 160`, `z = 100 → 160`) to exercise the single-lane directed rule.
6. **A fleet line-up** for the `fleet` preset: one instance of every kind and livery, stationary, 3 m apart in one
   row on the avenue shoulder near `(-260, 40)`, each at a different body colour, each with `speed = 0` —
   the catalogue shot for items 2 and 3.

Declared `showcase.cameras` (registered by core from `showcase.cameras`; `position`/`target` arrays):

| Preset | position → target | Purpose |
|---|---|---|
| `junction` | `[96, 34, 100] → [40, 1, 40]` | signalised crossroads, queue on one arm, flow on the other |
| `queue` | `[40, 2.2, 86] → [40, 1.2, 30]` | eye-level down a stopped queue: bumpers, plates, tail lamps |
| `merge` | `[470, 30, 130] → [345, 12, 222]` | ramp merging into the highway, gap acceptance, trucks |
| `roundabout` | `[-200, 62, 46] → [-200, 1, -40]` | circulation direction and yielding |
| `crossing` | `[62, 6, 66] → [40, 1.2, 40]` | crosswalk, pedestrians waiting and crossing |
| `headlights` | `[150, 3.0, 44] → [-40, 1.4, 40]` | **night preset**: oncoming headlights down the avenue, pools on the road |
| `fleet` | `[-260, 16, 66] → [-260, 1, 40]` | every kind and livery in one frame |

**Captures this module needs.** The standard matrix belongs to `CRITIC.md` and is not restated here; what follows
is only the *extra* frames the acceptance items name, because the standard run either does not produce them or
does not pin the hour a preset is shot at. The standard
run gives `aerial/street/skyline/closeup` × `12, 22` from
`node tools/gauntlet.mjs --module traffic --round <n> --times 12,22`, plus the hand shots `skyline_17p5` and
`street_6p5`, plus one at `--w 1280 --h 720`. Shoot these as well, one command each:
`node tools/screenshot.mjs --showcase traffic --camera <cam> --time <t> --out shots/traffic/r<n>/<cam>_<t>.png --timeout 240`
(the file name writes the time as `6p5, 12, 17p5, 22`).

| camera | times | needed by |
|---|---|---|
| `aerial` | 17.5 | items 8, 11 |
| `closeup` | 17.5 | item 10 |
| `overview` | 12 | item 12 |
| `junction` | 6.5, 12, 22 | items 1, 6, 7, 10 |
| `queue` | 12, 17.5 | items 1, 2, 3, 5 |
| `crossing` | 6.5, 12 | items 1, 9 |
| `merge` | 12 | item 1 |
| `fleet` | 12 | items 2, 3 |
| `roundabout` | 12 | item 6 |
| `headlights` | 22 | item 7 |
| `night_street` | 22 | items 7, 9 |

Add `--crops` to `junction_12` and `junction_22`, and re-shoot `skyline_12` with `--crops` (the gauntlet does not
pass that flag): items 7 and 11 measure inside the rects it writes (§4 preamble). Sixteen extra frames at 3–10 s
each under SwiftShader. What each camera must show:

- **aerial (520 m, pitch 0.85)** — 12: mid density, both carriageways opposed, no carpeting. 17.5: the peak,
  queues visible at the signalised nodes, long shadows. 22: sparse traffic, headlight pools and red taillight
  strings legible on the avenue and the highway, the roads otherwise dark.
- **street (60 m, pitch 0.18, target `[40,0,40]`)** — vehicles passing at eye level with readable glazing,
  wheels, plates and shut-lines; pedestrians on both sidewalks. At 22 the frame is lit by the signal head, the
  vehicles' own lamps and their pools; bodies are still coloured, not silhouettes.
- **skyline (900 m, pitch 0.16)** — vehicles are coloured dashes distributed over the network with no flicker and
  no sparkle; at 22 the avenue reads as a moving line of white and red points.
- **closeup (110 m, pitch 0.35, target `[20,6,20]`)** — the model-quality shot: item 2's checklist must be
  satisfiable here at 12 and 17.5, and item 7's at 22.
- **06.5 and 17.5 (golden hour)** — `junction_6p5` and `crossing_6p5`, `closeup_17p5`, `aerial_17p5` and
  `queue_17p5`: where the shadow test (item 10) and the density test (item 8) are graded. Frames must not go
  milky (`environment_r2` major: "17:30 frames milky and blown toward the sun"); vehicle bodies must keep chroma
  against the low sun rather than blowing to white.

`showcase.description`: one sentence naming the crossroads, roundabout, highway merge, outside connections,
pedestrians and the fleet line-up.
