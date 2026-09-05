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
