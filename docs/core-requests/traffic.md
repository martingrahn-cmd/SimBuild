# Core requests — traffic

## 1. (r1, high) CSM shadow "dead zone": nothing under ~3 m tall casts a ground shadow

**Symptom.** Vehicles (1.4–3.3 m tall) never cast a shadow onto the road or terrain, at any time of day.
They *are* rendered into the cascade shadow maps — `castShadow` is honoured (turning it off removes
exactly 3 draw calls per mesh, one per cascade) and the vehicles visibly **self-shadow** each other — but
the ground never samples them.

**Measurement.** Showcase `traffic`, camera `closeup`, time 9 (sun elevation ≈ 46°). I translated the whole
`traffic:instances` group up by y = 0, 1, 2, 4, 8 m and screenshotted each:

| lift | ground shadow |
|---|---|
| 0 m | none |
| 1 m | none |
| 2 m | none |
| 4 m | **yes**, clearly visible |
| 8 m | yes, strong |

So there is an occluder→receiver dead zone of roughly 3 m. Props (street lamps ≈ 8 m, trees ≈ 12 m) clear
it, which is why the props showcase looks correct and why this has not been noticed. Buildings will clear it
too. Everything at car/person/bench/bin height will not.

**Suspect.** `src/modules/environment/lighting.js`:

```js
shadowBias: -0.00012, lightNear: 1, lightFar: 4000, lightMargin: 400
...
l.shadow.normalBias = 0.35;
```

`normalBias = 0.35` m plus a `bias` of `-0.00012` over a **4000 m** ortho depth range (≈ 0.48 m of world
depth) is ~0.8 m of slack before any geometric effect; empirically the dead zone measures ~3 m, so
`lightFar`/`lightNear` are probably the dominant term. Lowering `normalBias` to 0.02 and `bias` to
`-0.00002` from the console did **not** bring the shadows back, which points at the depth range rather than
the biases.

**Request.** Tighten the cascade shadow cameras' depth range (`lightNear`/`lightFar` around the actual
scene bounds, e.g. near = lightMargin − 200, far = lightMargin + 400) and re-tune `normalBias` down
accordingly, then re-check that terrain self-shadowing is still acne-free. A quick regression test: a 1.5 m
box on flat ground at 09:00 must cast a visible shadow.

**Workaround in traffic r1.** Every vehicle and pedestrian draws an explicit soft contact-shadow decal
(`materials.js:createContactMaterial`, one extra instanced mesh per class, 9 draw calls total) offset away
from the sun by its elevation. `castShadow` is still set to `true` on the vehicle meshes, so the decals can be
weakened or removed once the CSM dead zone is fixed. If both are active the ground will be slightly
double-darkened under vehicles — ping me and I will drop the decal strength.

## 2. (r1, low) `world.roads.laneCenter(...).y` ignores cross-slope

`laneCenter` offsets laterally from the centreline but returns the **centreline** `y`. On a cambered or
super-elevated carriageway that is not the lane's surface height. Traffic currently parks vehicles at
`laneCenter().y + 0.085` (road `ROAD_LIFT` is 0.08) and it looks right on the current road build, so this is
informational — but if roads ever adds camber, vehicles will sink on one side of the crown.

## 3. (r1, low) no per-module hook to know "the sun is down"

`clock.sunElevation()` works and is what traffic uses for headlights, but `environment.api.getNight()`
returns an internal 0/1 that is not documented in ARCHITECTURE §6. Worth adding
`world.weather.night` (0..1) alongside `sunDir`/`sunIntensity` so every module fades its night content on
the same curve.

## Round 2 verification update

Traffic now enables real shadow casting on every vehicle and pedestrian LOD, registers its materials through environment.setupMaterial, and renders a separate instanced contact patch. The earlier statement that r1 casting was enabled was incorrect: the r1 critic identified the disabled flag. Round 2 corrects it. The CSM contact-height/long-shadow art gate remains visibly weak with the current environment rig; no environment settings were changed by this builder.

The current contract publishes road surface y = laneCenter.y + 0.08 and pedestrian y = sample.y + 0.21. A 0.25 m baked lane sampling interval produces worst observed height error below 0.002 m across the four graded hours (shots/traffic/dev2/probe.json). Traffic now reads world.weather.night, so request 3 is resolved.

The prescribed traffic showcase highway ends at (-1000,340) and (1000,140), via (345,222). On the current terrain, roads' profile climbs abruptly into the mountainous eastern border and creates an extremely steep bridge/embankment in the junction and merge backgrounds (shots/traffic/dev2_junction.png). Proposed integrator/roads follow-up: accept an explicit graded design elevation/profile through the public addNode/addEdge options and constrain its grade independently of raw terrain sampling, then cut/fill or bridge to that profile. Traffic must continue consuming the resulting road height; it cannot safely flatten terrain or rewrite road-owned geometry.

Residual spec caveats are preserved in the r2 build record: pool metre extents, temporal flicker and silhouette naming have no prescribed image instrument; the 22:00 congestion <=0.10 gate conflicts with the allowed free-flow speed band and signal stops. None are asserted to pass from a still image.

## Integrator decision (local wave 2, shadow reproduction)

The historical complete dead-zone claim does not reproduce on the current Metal renderer in a controlled 1.5 m box test at 09:00. `shots/integration/w2_shadow_probe.mjs` disables all previous meshes and compares caster-on/off pairs on a plain receiving plane. Baseline shadows darken 3,764 pixels by >3 luminance units (maximum 91.81/255); inspected image `w2_shadow_baseline_on.png` has a visible ground shadow. Smaller biases increase the shadow/contact footprint but zero bias introduces self-shadow artifacts. No global depth/bias retune was applied from this historical evidence: it would affect every module and needs current road-receiver-specific evidence. Current traffic retains its local contact shadows.

## Round 3 measured follow-up (2026-09-06)

The complete CSM dead-zone claim is closed for this traffic build: a frozen closeup at 17.5 changes 74,329 pixels when traffic shadows are disabled (`shots/traffic/r3/plate_closeup_17p5_{A,C}.png`, threshold 12/255). No global lighting change is requested.

The prescribed `merge` camera still looks into the large bridge support faces and cannot show the ramp merge clearly (`shots/traffic/r3/merge_12.png`). Please reconcile the prescribed road elevations/camera with the current mountainous terrain; traffic source does not alter neighbor geometry or core camera presets.

The new public `roads.surfaceHeightAt` query permits a useful cross-check. Traffic follows the binding laneCenter profile +0.08 contract (worst 0.001451 m), but one post-turn population scan finds maximum 0.107126 m difference from the actual pavement triangle height (`shots/traffic/r3/features.json`, pavement). Please reconcile the road lane-height contract and triangle interpolation/camber before changing the traffic contract. This is disclosed as a surface-contract risk, not falsely reported as a failure of the explicit laneCenter test.


## Round4 follow-up (2026-09-06)

The current measured shadows remain real: final controlled closeup17.5 A/C changes43,481 pixels at threshold12. No global CSM dead-zone claim or retune request. The fixed merge camera remains blocked by road-owned bridge supports, and the previously measured laneCenter+.08 versus actual pavement discrepancy remains an integrator seam. Please reconcile road profile/deck/camera under the road contract; traffic round4 preserves normative lane coordinates and does not raise bodies to conceal it.

Flow improvements lower advancing-clock night congestion mean to.080669247, endpoint.090472056, so the old suggestion that night<=.10 is inherently incompatible is superseded. Peak first-cycle global queue minimum47 is still a traffic miss; later minimum1 over90s is disclosed, not accepted as one-cycle discharge. No criterion waiver requested.


## Integrator decision (wave 2 final, 2026-09-06)

Retained world.weather.night consumption. Rejected the historical complete CSM shadow dead-zone diagnosis: current independent1.5m box and vehicle caster toggles visibly produce shadows; a global bias change would risk all modules. Deferred graded road profiles and lane-specific pavement-height reconciliation to roads. Continue following the documented laneCenter+.08 contract; highest-surface queries are unsafe on overlapping decks. The merge camera obstruction by real bridge/terrain geometry is disclosed rather than flattened away. Final traffic4 findings are recorded separately after independent review. Final independent verdict: 7.2 FAIL, API false, zero errors. Keep update/step budgets, first-cycle queues, LOD glazing, stopped wheel rotation, advancing-clock interior-spawn fraction and empty-graph mast stats open; whole-page heap drift is not proof of a traffic-retained leak.


## Integrator decision (wave 2b final, 2026-09-08)

No ambient traffic ownership changes during this wave. Existing performance/routing/LOD failures remain; ambient car and pedestrian counts are not evidence of resident trips. For wave3, transit must own one deterministic fleet unless a complete managed traffic capability is explicitly implemented; avoid spawnVehicle auto-balance conflicts and duplicate save ownership.

## Integrator decision (wave 3 final, 2026-09-08)

Kept traffic and transit fleet ownership distinct with no duplicate spawned bus facade. A managed pose/doors/timetable/livery/reservation capability is required before fleet migration; current spawnVehicle is insufficient. Collision overlap and shared low-object shadows remain future coordinated work, not fixed in this cycle. See `docs/critic/integration_w3.md` for final checks and open issues. The user requested a checkpoint and pause; no new round is authorized.
