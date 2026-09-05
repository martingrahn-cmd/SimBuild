# Module spec — `environment`

Round 3+ contract. Read with `docs/prompts/BUILDER.md` (builders) or `docs/prompts/CRITIC.md` (critics); everything
invariant lives there and is not repeated here. Previous verdicts: r1 = 6.0, r2 = 7.0 (`docs/critic/environment_r*.md`).
Target: **≥ 8.5**.

---

## 1. Purpose

Without `environment` the game has no sun, no sky, no shadows, no time of day and no weather — every other module
renders flat, unlit geometry against a black void, and nothing in the city can look like a photograph.

## 2. World data owned

Owner of `world.weather`. Copy from ARCHITECTURE §3 verbatim:

```js
  weather: {                         // owner: environment
    cloudiness: 0.3, rain: 0.0, wind: {x:1, z:0, speed: 2}, fogDensity: 0.0006, temperature: 18,
    sunDir: Vector3, sunIntensity, skyLight: Color,   // published each frame for other modules
  },
```

**The `fogDensity: 0.0006` literal above is the pre-init default (`src/core/world.js:85`); `environment` overwrites it
from the weather preset on the first `update()`.** It is *not* a target value — 6e-4 is the rain figure, and §6's
"milky noon above ~1.2e-4" applies to `clear`/`partly` daylight, where the module must be far below it. The five
presets are fixed here so that both readers of acceptance 4, 12, 13 and 15 start from the same numbers
(`src/modules/environment/index.js:15-21`):

| Preset | `cloudiness` | `rain` | `fogDensity` | `wind.speed` |
|---|---|---|---|---|
| `clear` | 0.10 | 0.0 | 8.0e-5 | 2.0 |
| `partly` **(default)** | 0.40 | 0.0 | 1.1e-4 | 3.2 |
| `cloudy` | 0.74 | 0.0 | 3.0e-4 | 4.5 |
| `rain` | 0.96 | 0.85 | 6.5e-4 | 7.0 |
| `fog` | 0.70 | 0.0 | 6.0e-3 | 1.0 |

Additionally published each frame (already shipped in r1/r2; recorded in `docs/core-requests/environment.md` #5/#6
and accepted by the integrator, not yet echoed into §3 — **assume they are part of the contract and keep them**):
`moonDir: Vector3`, `moonPhase: 0..1` (0 = full), `lightDir: Vector3` (sun or moon, whichever lights the scene),
`lightIntensity: number`, `sunColor: Color`, `exposure: number`, `night: 0..1`, `wetness: 0..1`, `preset: string`.
Mutate these in place — never reassign `world.weather` or replace the `Vector3`/`Color` objects (other modules hold
references to them). The integrator's decision log claims ARCHITECTURE §3 now documents these fields; it does not
(checked 2026-09-05 — §3's `weather` block ends at `skyLight`). The log is wrong, not this spec. **Re-file as core
request #10 in round 3**; until §3 carries them, this section is the contract for those nine fields.

Event emitted (ARCHITECTURE §5), after the mutation completes:

| Event | Emitter | Payload |
|---|---|---|
| `weather:changed` | environment | `{cloudiness, rain, fogDensity}` (may also carry `preset`) |

Module contract (`src/modules/environment/index.js`):

```js
export default {
  name: 'environment',
  dependencies: [],                                   // must init and look correct with NO other module present
  budget: { drawCalls: 15, triangles: 90_000 },       // §5 below
  api: {
    setWeather(preset|{cloudiness,rain,fogDensity,wind:{x,z,speed}}),  // clamps, emits weather:changed
    getWeather() -> presetName, getSunDirection() -> Vector3, getMoonDirection() -> Vector3,
    getLightDirection() -> Vector3, getExposure() -> number, getNight() -> 0..1,
    setupMaterial(material),      // give a foreign material CSM + height fog + cloud shadows; idempotent
    hookScene(), refreshEnvironment(), presets: string[],
    cropRects({project, width, height, camera}) -> {name: [x, y, w, h]},  // §4 pinned crops (2, 10, 11, 12, 20)
    // _debug() is the critic's probe surface; every field below is required by an acceptance item
    _debug() -> { S, U,
      skySample([x,y,z]) -> {r,g,b},                           // linear radiance from the sky LUT (item 11)
      cloudHeight, cloudShadowOffset: [x,z],                   // item 9(b)
      hooked, standardMaterials, shaderMaterials,              // item 16
      lutRebuilds, lastLutMs, lastFrameMs },                   // item 18
  },
}
```

Exclusive ownership, enforced by ARCHITECTURE §4: this is the **only** module that may add lights, set
`renderer.toneMapping` / `toneMappingExposure` / `shadowMap.*`, or set `scene.fog`, `scene.environment`,
`scene.environmentIntensity`. Keep `AgXToneMapping`, `SRGBColorSpace` output, `PCFShadowMap`, CSM 3 × 2048 at
`quality=high` (`QUALITY[ctx.quality].cascades/shadowMap` from `src/core/constants.js`).

## 3. Visual / behavioural target

Reference frames read with the image reader; `$REF` = the reference folder named at the top of
`docs/reference/CS2-LOOK.md` (that file is the single place the path is written down; do not copy the literal here).

- **Noon — `cs2_1.jpg`** (aerial, roundabout). Hard sun. The frame carries the *full* range at once: white lane
  markings ≈ 250, lit asphalt ≈ 100–115, lit grass saturated mid-green ≈ 110–130, tree and building shadows deep,
  cool and *readable* ≈ 38–50 — a lit:shadow ratio of roughly 2.7:1, never flat and never crushed. Every object has a
  contact shadow. Nothing is milky; there is no veil between the camera and the ground at 500 m.
- **Golden hour — `cs2_4.jpg`** (late-afternoon suburb). The reason it reads as golden hour is *split colour*, not an
  orange wash: lit facades are near-white cream (p99 ≈ 245), the long shadows they throw across the road stay
  blue-grey, the white house stays white, the green hedges stay green. Warmth is in the light, not in every pixel.
  The frame is punchy — high std, dark shadows, bright lit faces. r2 delivered the opposite (a cream half-frame).
- **Aerial perspective — `cs2_2.jpg` / `cs2_7.jpg`.** Three or more depth planes, each losing *contrast* as well as
  colour toward the sky hue; the far shore/mountains are pale blue-grey; there is never a razor-straight line where
  ground meets sky — there is a haze band and a broken silhouette.
- **Overcast — `cs2_6.jpg`.** The overcast sky is a pale blue-white *gradient with soft structure*, not a flat grey
  wall; shadows almost vanish but AO and contact darkening remain; the mountains stack in visibly separate haze
  layers; falling precipitation varies in size and blur with distance.
- **Night — `cs2_8.jpg`** (rainy downtown street). The sky is **deep navy**, ≈ RGB(22, 32, 58) at the top of frame
  (B − R ≈ +36), not grey. Window lights are individually distinguishable, warm and varied, and do *not* clip to flat
  white. Lamps throw elongated soft pools. Rain is many thin (1–2 px) low-contrast slanted streaks, not dashes; wet
  asphalt shows vertical smeared reflections of the red/white lights.

The environment showcase is a test rig (ground plane, sphere ladder, concrete blocks): it is graded on **light, sky,
haze, shadow, exposure and weather only** — never on architecture.

## 4. Acceptance criteria

**Measurement convention** (identical to the critic's `shots/environment/r<n>/imgstats.mjs` in r1/r2): all luminance
figures are 0–255 sRGB Rec.709 luma measured on the PNG downscaled to 480 px wide unless a pixel size is stated;
`p1/p50/p99` are percentiles; `sat` is mean HSV saturation; channel figures (`B − R`) are 0–255 sRGB means over the
named crop.

**Horizon, sky region, cloud pixels, feature scale.** One definition, used by items 4, 5, 6, 7, 9, 11 and 22, so that
two competent readers get the same number from the same PNG:

- *Camera pitch*, from the `cameraState` block the screenshot tool writes into every shot's `<name>.json`
  (`tools/screenshot.mjs:101`, `= __sim.stats().camera`):
  `pitch = asin((cameraState.position[1] − cameraState.target[1]) / cameraState.distance)`. Vertical `fov` is 45° and
  fixed (`src/core/camera.js:9`, ARCHITECTURE §6).
- *Horizon row*, in pixels from the top: `y_h = H/2 × (1 − tan(pitch) / tan(fov/2))`. **Sky region** = rows `0…y_h`,
  **ground region** = rows `y_h…H`, **sky fraction** = `y_h / H`; `y_h ≤ 0` means the frame contains no sky at all.
  Worked, for the presets this spec grades: `sky` (pitch 0.12) → 35.4 %, `sunset`/`sunrise` (0.10) → 37.9 %,
  `skyline` (0.16) → 30.5 %, `street` (0.18) → 28.0 %, `closeup` (0.35) → 5.9 %, **`aerial` (0.85) → 0.0 %** — the
  horizon sits 26.2° above the top of an `aerial` frame, so no `aerial_*.png` may be asked for a sky measurement.
- *Elevation of a row*: `elev(y) = atan(tan(fov/2) × (1 − 2y/H)) − pitch`. The highest elevation any camera in this
  project can frame is `+17.9°` (at `minPitch = 0.08`); see item 22.
- *Cloud pixel*: a sky-region pixel whose luma differs from the **median luma of its own row** by `> 12`.
  **Cloud fraction** = cloud pixels ÷ sky-region pixels. `sky_mean` = mean luma of the sky region.
- *Feature scale*: subtract each row's median from every sky-region pixel, autocorrelate each row, average the
  row autocorrelations, and take the full width at half maximum of the central peak, in pixels at 1080p.
- *Component* (items 4 and 9a, so "discrete" is not a matter of opinion): a 4-connected region of qualifying
  pixels of area `≥ 900 px` at 1080p after a 3 px morphological open. Anything smaller is speckle and is not
  counted as a cloud or as a shadow patch.
- *Aerial ground scale* (item 9a): at the `aerial` preset (pitch 0.85, distance 520, fov 45) the ground at frame
  centre is **0.40 m per pixel across** the view (520 × 2 tan 22.5° / 1080 = 0.399) and **0.53 m along** it
  (0.399 / sin 48.7°) at 1080p, so 25 m on the ground is 47–63 px and is graded as `≤ 60 px`.

**Pinned crops — no crop in this spec is chosen by the reader.** Items 2, 10, 11, 12 and 20 name a **landmark**
staged at fixed world coordinates (§8). The module implements **`api.cropRects({project, width, height, camera})`** —
a top-level `api` method, not a `_debug` field — returning `{ <landmark>: [x, y, w, h] }` in **pixels of the
full-resolution capture**: the axis-aligned bound of the eight corners of the landmark's world AABB put through the
supplied `project(x, y, z)`, clamped to the frame. `window.__sim.cropRects()` collects it from every ready module and
prefixes the keys with the module name (`src/core/debug.js:41-52`), so the critic reads `environment.cal_grey` from
`<shot>.crops.json`, which **`node tools/screenshot.mjs … --crops` alone produces** (`tools/screenshot.mjs:94-98`;
ARCHITECTURE §8 is authoritative — `apicheck.mjs` does not write it, whatever an earlier round's script says).
A shot captured without `--crops` is a capture omission, never a builder failure: re-take that one shot with the flag
— the camera is deterministic for a given `--camera/--time/--seed` — and grade it then. These five items fail
**against the builder** only when the flag was used and the rects are still absent or wrong: no `environment.*` key,
a `[debug] environment.cropRects failed` warning, or a rect that does not enclose its landmark. `tools/gauntlet.mjs`
forwards only `--w/--h/--seed/--weather/--quality/--timeout` (`:20-22`); that it should forward `--crops` too is
core request #13 in `docs/core-requests/environment.md`.

**Pinned crops are cut from the full-resolution 1920 × 1080 PNG, never the 480 px reduction**: `cal_grey` is 0.7 m at
98.7 m = `1080 / (2 tan 22.5°) × 0.7 / 98.7` = **9 px** across at 1080p and **2 px** at 480 px wide, where no
per-patch statistic means anything. The 480 px convention applies only to whole-frame and half-frame statistics
(items 1, 3, 5, 8, 21). The two remaining reader-chosen crops (items 3 and 8, where the subject is a whole half-frame
or a depth plane rather than an object) must still be named in the report as fractional rects so they can be re-cut
and disputed on the numbers.

**Shots.** The standard matrix is `node tools/gauntlet.mjs --module environment --round <n>` →
`shots/environment/r<n>/<camera>_<time>.png` (4 cameras × 4 times). The gauntlet writes
`` `${cam}_${time}.png` `` with **no weather suffix** and forwards `--weather` unchanged
(`tools/gauntlet.mjs:18,21`), so `gauntlet --weather cloudy` silently overwrites the default-`partly` frames that
items 1–3 are graded on. **Never run the gauntlet with `--weather`.** The gauntlet also does not shoot module presets
(cameras × times only). Take those and the weather variants by hand, with these exact lines:

```
# module presets
node tools/screenshot.mjs --showcase environment --camera sunset   --time 17.9 --crops --out shots/environment/r<n>/sunset_17p9.png --timeout 240
node tools/screenshot.mjs --showcase environment --camera sunrise  --time 6.2  --crops --out shots/environment/r<n>/sunrise_6p2.png --timeout 240
node tools/screenshot.mjs --showcase environment --camera moonrise --time 22   --out shots/environment/r<n>/moonrise_22.png   --timeout 240
node tools/screenshot.mjs --showcase environment --camera sky      --time 12   --out shots/environment/r<n>/sky_12.png        --timeout 240
node tools/screenshot.mjs --showcase environment --camera sky      --time 22   --out shots/environment/r<n>/sky_22.png        --timeout 240
node tools/screenshot.mjs --showcase environment --camera skyline  --time 6.5  --out shots/environment/r<n>/skyline_6p5.png   --timeout 240
# weather variants (never via the gauntlet)
node tools/screenshot.mjs --showcase environment --camera skyline --time 12 --weather clear  --out shots/environment/r<n>/skyline_12_clear.png  --timeout 240
node tools/screenshot.mjs --showcase environment --camera skyline --time 12 --weather cloudy --out shots/environment/r<n>/skyline_12_cloudy.png --timeout 240
node tools/screenshot.mjs --showcase environment --camera skyline --time 12 --weather fog    --out shots/environment/r<n>/skyline_12_fog.png    --timeout 240
node tools/screenshot.mjs --showcase environment --camera aerial  --time 12 --weather clear  --out shots/environment/r<n>/aerial_12_clear.png   --timeout 240
node tools/screenshot.mjs --showcase environment --camera street  --time 12 --weather rain --crops --out shots/environment/r<n>/street_12_rain.png --timeout 240
node tools/screenshot.mjs --showcase environment --camera aerial  --time 12 --w 1280 --h 720 --out shots/environment/r<n>/aerial_12_720.png     --timeout 240
# pinned-crop re-shots over the gauntlet's own files (same camera/time/seed = same framing), because the gauntlet
# does not forward --crops: these are what give items 2, 10, 12 and 20 their rects
node tools/screenshot.mjs --showcase environment --camera closeup --time 6.5  --crops --out shots/environment/r<n>/closeup_6p5.png  --timeout 240
node tools/screenshot.mjs --showcase environment --camera closeup --time 12   --crops --out shots/environment/r<n>/closeup_12.png   --timeout 240
node tools/screenshot.mjs --showcase environment --camera closeup --time 17.5 --crops --out shots/environment/r<n>/closeup_17p5.png --timeout 240
node tools/screenshot.mjs --showcase environment --camera closeup --time 22   --crops --out shots/environment/r<n>/closeup_22.png   --timeout 240
node tools/screenshot.mjs --showcase environment --camera street  --time 12   --crops --out shots/environment/r<n>/street_12.png    --timeout 240
```

`skyline_12.png` from the gauntlet is the `partly` member of the clear/partly/cloudy ladder in item 4.

Ordered by how much each moves the score.

1. **Noon is punchy, not dull.** In `aerial_12.png`, `closeup_12.png` and `skyline_12.png` (default `partly`):
   `p99 ≥ 185` and `≤ 252`, with < 0.5 % of pixels at 255; `p1` in `[6, 30]`; `std ≥ 34`; `sat ≥ 0.30` in
   `aerial_12`. r2 measured p99 = 118, std = 17 — mid-grey everything — and that alone cost ~1 point.
2. **Noon shadow contrast is CS2's.** In `closeup_12.png`, cut the two **pinned** crops from `crops.json` (§4):
   `lit_patch` (2 × 2 m of open ground at world `(36, 0, 58)`) and `shadow_patch` (2 × 2 m at world `(36, 0, 47.2)`,
   under the staged shadow canopy, §8.6). Their lit:shadow luma ratio is in `[2.6, 4.0]` (cs2_1 ≈ 2.7:1) and the
   shadowed crop is cooler: `(B − R)_shadow − (B − R)_lit ≥ +12`. Grade this at 12:00 only; §8.6 says why the
   caster has to be horizontal.
3. **17:30 is not milky and not blown.** In `skyline_17p5.png`, `street_17p5.png`, `closeup_17p5.png`:
   `p50 ≤ 118`, `mean ≤ 122`, fraction of pixels > 240 `≤ 1.5 %`, `std ≥ 40`. In `skyline_17p5.png`, the mean luma of
   the sun-facing half of the ground and of the away-from-sun half differ by `≤ 45`, and the upper sky more than 60°
   from the sun keeps `B − R ≥ +10`. (r2: mean 151, p50 152, p99 247, half the frame cream — rank-1 issue.)
4. **Clouds have volume.** At `cloudiness = 0.4`, `sky_12.png` and `skyline_6p5.png` show **≥ 4 cloud components**
   (§4: 4-connected, `≥ 900 px` at 1080p after a 3 px open — so two readers count the same number); in each, the mean
   luma of the top 10 % of its bounding-box rows exceeds that of the bottom 10 % by `≥ 40`; the cloud→clear-sky edge
   transition is `≤ 40 px` at 1080p (40 × 45° / 1080 = 1.7° of view angle), not a 200 px smear. **Cloud fraction**
   (§4 definition: sky region above `y_h`, a pixel counts as cloud when its luma differs from its own row's median by
   `> 12`) on the `skyline` camera at
   12:00 is `≤ 0.15` in `skyline_12_clear.png`, `0.25–0.55` in `skyline_12.png` (default `partly`) and `≥ 0.75` in
   `skyline_12_cloudy.png` — one camera, one time, three weather shots. Overcast (`skyline_12_cloudy.png`) is **not** a
   structureless gradient: sky-region luminance `std ≥ 8` after subtracting a 64 px box blur, with **feature scale**
   (§4 autocorrelation FWHM) in 100–400 px.
5. **Night sky is navy.** In `skyline_22.png` and `sky_22.png`, the top 12 % band of the frame has mean luma in
   `[14, 42]`, `B − R ≥ +20` and `sat ≥ 0.30`. Whole-frame `p1 ≥ 2`, and pure-black (luma 0) pixels `≤ 1 %`.
   (r2: grey-blue at ≈ 90; r1: 11.5 % pure black.)
6. **No per-pixel static in windows.** Measured over the **whole ground region** (rows below `y_h`, §4) of every
   22:00 frame at 1080p — no crop, so there is nothing to choose: `< 0.2 %` of pixels differ from their 4-neighbour
   mean by `> 40`, and no 128 × 128 px window anywhere in that region exceeds `2 %`. (r2's static ran at 10–30 % of
   the lit window pixels, so the margin over legitimate texture detail is an order of magnitude.) The instance id
   must not reach a hash through
   an interpolated varying: `grep -n "vInst" src/modules/environment/showcase.js` must show a `flat` qualifier or
   `floor(vInst + 0.5)`, and the sin-fract `envHash` in that shader replaced by an integer hash. (r2 rank 2 — still
   present in the working tree.)
7. **Stars and moon.** `sky_22.png` at 1080p: `≥ 300` local maxima above `sky_mean + 8`, the brightest of them
   `≥ sky_mean + 60`; star FWHM `≤ 2.5 px` with a round, `fwidth`-antialiased falloff (no square blobs — r2); a
   milky-way band — one 128 px-tall strip, named by the critic as a fractional rect (§4) — whose mean luma is `≥ 4`
   above the mean of the sky region outside it, spanning `≥ 40 %` of the frame width.
   `moonrise_22.png` **contains the moon**: disc diameter **12–19 px** at 1080p (0.5–0.8° at 1080 px / 45° = 24 px
   per degree), interior `std ≥ 6` (maria/limb, not a flat white dot), and its centroid between rows `0.06 H` and
   `0.22 H` inside the middle third of the frame width. *Derivation, since the old band excluded itself:* at
   `moonrise`'s pitch 0.09 (§8) the top of frame is only `+17.3°` and frame centre is `−5.2°`, so "elevation 10–25°
   and within 20° of centre" had no solution above 14.8°; rows 0.06 H–0.22 H are elevation 15.0°–8.0° by the §4
   `elev(y)` formula and are reachable at 22:00. (r2: no moon in frame at all.)
8. **Aerial perspective and a broken horizon.** In `skyline_12.png` and `skyline_6p5.png` the ground never meets the
   sky in a straight line. *Horizon boundary*, per column, at 1080p: the topmost row within `[y_h − 60, y_h + 20]`
   whose luma differs by `> 20` from that column's mean over rows `[y_h − 120, y_h − 80]` (clear sky well above the
   ridge). That boundary row varies by `≥ 6 px` across the frame width, and
   `|mean luma of the 20 px below the boundary − mean luma of the 20 px above it| ≤ 30` (haze). The metres live in
   §8.4, which stages the ring (2.5–3.5 km, 20–80 m, `≥ 15 m` variation): at 3 km those heights are 9–35 px and the
   variation is 6.5 px at 1080p (`1080 / (2 tan 22.5°) × h / 3000`), which is why the item is graded in pixels —
   nothing in the toolchain converts a PNG row to metres at that distance. In `aerial_12.png`, a crop of blocks at
   600–900 m has local `std ≤ 0.6 ×` that of a crop of blocks within 200 m, and its mean is shifted `≥ 12` toward the
   fog colour; both crops are reader-chosen and both are reported as fractional rects. (r2 rank 9.)
9. **Cloud shadows read as clouds.** Graded in two places, because `aerial_12.png` contains **0 % sky** (§4) and can
   never show a cloud and its shadow together.
   *(a) On the ground — `aerial_12.png` at `partly`, at 1080p:* `≥ 3` cloud-shadow **components** (§4), each with an
   edge transition `≤ 60 px` (25 m at the §4 aerial ground scale; the cloud-shadow map is ≥ 512² over its 6 km square
   = 11.7 m/texel, so the map cannot resolve better than that), each darkening the ground in the **annulus 20–60 px
   outside its own component** (10–30 m) by 12–25 %.
   *(b) Cloud-to-shadow registration — probe, in `apicheck.mjs`:* `api._debug()` exposes
   `{cloudHeight, cloudShadowOffset: [x, z]}`, and `cloudShadowOffset` equals
   `cloudHeight × tan(zenith)` along the horizontal projection of `world.weather.sunDir` to within **15 %** in
   magnitude and **5°** in direction, at 09:00, 12:00 and 15:00. Grade the visual half of (b) on
   `skyline_12.png` (30.5 % sky) if a single cloud and its patch are both in frame; never on `aerial_*`. (r2: vague
   20 m blobs.)
10. **Ground reads as ground, not felt.** In `closeup_12.png`, the pinned `ground_near` crop from `crops.json`
    (8 × 8 m of open ground at world `(52, 0, 52)`, ≈ 74 m from the `closeup` camera) has high-frequency `std ≥ 10`
    after subtracting a 16 px box blur, and shows `≥ 2` distinguishable cover types (grass, dirt/worn track) whose
    mean albedo differs by `≥ 1.4 ×`. The old "ground within 30 m" was unobservable: at pitch 0.35 and fov 45 the
    bottom of a `closeup` frame is 42.6° below horizontal, so the nearest ground pixel is ≈ 64 m away. No feature
    repeats at a constant spacing anywhere in `aerial_*` or `skyline_*` (r1's 13 m lattice must stay dead). (r2 rank 8.)
11. **Sunset lights the scene without dyeing it.** In `sunset_17p9.png` and `sunrise_6p2.png` (both taken with
    `--crops`): the pinned `ground_near` crop, cut at full resolution (48 px across at `sunset`, 33 px at `sunrise`,
    §8.7), still has green as its maximum channel (`G ≥ R`); the **top 5 % band of the frame** keeps `B ≥ R + 8`
    (no mauve creeping down from the top — the band spans elevation 14.7–16.8° and is pure sky because both presets
    are pinned at pitch 0.10 in §8, which puts the horizon 37.9 % down the frame, §4); and shadowed ground keeps
    `B − R ≥ +6`. Whole-frame
    `p50 ≥ 45` and `≤ 110`. The **true zenith** is never in any frame (item 22), so grade it through the probe
    instead: `api._debug().skySample([0, 1, 0])` returns the zenith radiance as linear RGB and must satisfy
    `b ≥ r × 1.15` at both times. (r2 rank 10 + builder's own remaining weakness.)
12. **Rain and wetness.** In `street_12_rain.png` (§4 command list): streak width `≤ 3 px` at 1080p, `≥ 400` streaks
    in frame, streak-to-background contrast `≤ 60`, with near streaks denser/longer than far ones. A probe after boot
    with `?weather=rain` reads `world.weather.wetness ≥ 0.6` **by the 5th rendered frame after `__sim.ready`**
    (frames, not wall clock: one SwiftShader frame is 2–12 s, so item 14 counts frames and so does this) even with
    the clock paused (r2: 0.065, so no wet ground was ever visible), and the pinned `ground_near` crop (43.6 m from
    the `street` camera, 2.6° off-axis horizontally and 4.0° below it) in `street_12_rain.png` is `≤ 0.80 ×` the luma
    of the **same pinned crop** in `street_12.png` (both shots taken with `--crops`: same landmark, same rect, so
    there is nothing to argue about), with a visible specular sheen along the light direction.
13. **Weather presets change the frame, and fog has no seam.** `clear|partly|cloudy|rain|fog` all reachable via
    `?weather=` at boot and `api.setWeather(name)`; each emits `weather:changed`; unknown names fall back to `partly`
    with a `log.warn`; partial objects clamp to range. In `skyline_12_fog.png` the vertical luminance profile through
    the horizon is monotone with `|Δ| ≤ 6` across any 10 px band (r1's hard grey band must not return), and the sky
    above is no crisper than the ground: cloud edge contrast in the fog frame `≤ 25`.
14. **Sun path, sun disc, exposure curve — probe.** `shots/environment/r<n>/apicheck.mjs` with
    `?showcase=environment&headless=1`, stepping `__sim.setTime(h)` over `h ∈ {0, 3, 5.9, 6.5, 9, 12, 15, 17.5, 18.1,
    19, 22, 24}` and waiting ≥ 14 frames per step (SwiftShader frames are 2–12 s; the LUT is throttled at 0.5 s):
    every published `world.weather` field is finite at every step; `sunDir` is east at 06:30 (`x > 0.9`), overhead at
    12:00 (`y > 0.85`), west at 17:30 (`x < −0.9`); `sunIntensity = 0` and `lightDir` switches to `moonDir` when
    `sunDir.y < −0.02`; `skyLight` luminance at noon `≥ 6 ×` its value at 22:00; `exposure ∈ [1.0, 3.2]` and varies
    monotonically as the sun sets; `renderer.toneMapping === AgXToneMapping`.
15. **`skyLight` and `fog.color` are physically real (r1 blocker — regression guard).** At noon
    `skyLight.b > skyLight.r × 1.4` and luminance `≥ 0.05`; at 22:00 luminance `≤ 0.05`; `scene.fog` is `FogExp2`
    with `density === world.weather.fogDensity` and `color` within ±25 % luma of the horizon sky pixel in the same
    frame at both 12:00 and 22:00.
16. **The lighting contract holds for foreign materials.** The names below **are** the contract; a builder who
    renames them has failed the item, not found a bad probe. With `?showcase=all`, a probe traversing `scene` finds:
    (a) exactly the environment's own directional lights (`QUALITY[ctx.quality].cascades` of them) and no other
    `Light` under `ctx.group` or created by `src/modules/environment/`. A `Light` belonging to **another** module is
    a finding against *that* module: name its file and line in the report, record 16(a) as passed-with-note, and let
    the integrator route it. As of 2026-09-05 `src/modules/props/render.js:266` constructs a pool of four
    `THREE.PointLight`s at intensity 0, so `?showcase=all` will hit exactly this case — it is not an environment bug
    and must not cost a round to rediscover;
    (b) `≥ 95 %` of `MeshStandardMaterial`s in the scene carry `material.defines.USE_CSM === 1`,
    `material.defines.CSM_CASCADES === QUALITY[ctx.quality].cascades`, and `material.userData.envHooked === true`
    (set by `setupMaterial`); every hooked `ShaderMaterial` additionally carries the nine shared fog/cloud uniforms
    `uEnvNoise, uEnvCloudA, uEnvCloudB, uEnvCloudC, uEnvCloudMap, uEnvFogA, uEnvFogSun, uEnvFogSunCol, uEnvSky`
    (`src/modules/environment/shaders.js:145-155`), each `=== ` the module's own singleton uniform object;
    (c) a material added after init (create a mesh, emit `props:changed`) hooked within one frame;
    (d) `api.setupMaterial(m)` called twice on the same material leaves `userData.envHooked === true`, one copy of
    each uniform, and `_debug().hooked` unchanged — a one-line probe.
    `api._debug()` returns `{hooked, standardMaterials, shaderMaterials}` (integer counts over the last sweep) so
    (a)–(d) are readable without a scene traversal of the critic's own devising.
17. **Determinism.** Two boots at `?showcase=environment&time=17.5&seed=1337` publish byte-identical `sunDir`,
    `sunIntensity`, `exposure`, `skyLight`, `moonPhase`, and the two PNGs differ in `≤ 0.5 %` of pixels by `> 2/255`
    (cloud drift must stay seeded from game time, never wall clock).
18. **Budget, measured.** Max `drawCalls ≤ 14` across every shot including `--weather rain` and `--weather fog`;
    max `triangles ≤ 75,000` against a declared 90,000 (r2 sat 174 triangles under its own declared limit).
    `__sim.stats().moduleMs.environment` **median of ≥ 20 consecutive samples** taken by `apicheck.mjs` (one per
    rendered frame, at `?showcase=environment&time=12`) is `≤ 1.5 ms`, and the **worst single sample of those 20 is
    `≤ 2.0 ms`** — ARCHITECTURE §9's "any single module ≤ 2 ms" has no exception and this spec does not invent one.
    A sky-LUT rebuild that does not fit in 2 ms must be **amortised across ≥ 4 frames** (rebuild one quarter of the
    LUT per frame), not granted a larger frame. `api._debug()` returns `{lutRebuilds, lastLutMs, lastFrameMs}` so a
    LUT-rebuild frame is identifiable in the sample series rather than asserted; `apicheck.mjs` records all 20
    samples with their `lutRebuilds` counter beside the median.
19. **Shadow geometry — direction by probe, softness in pixels.** The r2 wording graded "the shadow of a known 70 m
    tower": no such tower is staged, none is registered in `cropRects()`, and nothing converts PNG pixels to metres
    on an arbitrary caster — that clause is **withdrawn** and replaced by three checks the toolchain can settle.
    *(a) Direction — `apicheck.mjs`, at 06:30, 12:00 and 17:30:* every shadow-casting `DirectionalLight` the module
    owns points along `−world.weather.lightDir` to within **5°**
    (`(light.target.position − light.position).normalize()` against `lightDir`, which points *toward* the light).
    Shadow length follows from that direction: a caster of height `h` throws `h / tan(elev)`, i.e. `0.47 h` at 12:00
    (elevation 64.8°) and `6.7 h` at 06:30 and 17:30 (8.46°, both from `clock.sunElevation`), and the noon figure is
    what item 2 measures in pixels on `shadow_patch` / `lit_patch`.
    *(b) Softness:* across the canopy shadow's own edge in `closeup_12.png` at **full resolution**, the 90 % → 10 %
    transition of the lit-to-shadow luma difference takes `≥ 3 px`.
    *(c) Contact:* a contact shadow is present directly under every sphere and every block at all four standard
    times.
20. **Exposure is verifiable against a target, not an opinion.** The staged calibration board (§8.5) is cut from
    `crops.json` as three pinned sub-rects `cal_white` / `cal_grey` / `cal_black` (albedo 0.90 / 0.18 / 0.04).
    *Stated assumption, which fixes the transfer function:* the 18 % patch is the **anchor** — it reads
    `118 ± 15` in `closeup_12.png`, which pins the product of noon sun irradiance and `exposure` under AgX +
    `SRGBColorSpace` output. The other two patches are graded as **ratios against that anchor**, not as absolute
    bands, so a small change to the AgX toe moves them together instead of failing the item:
    `cal_white / cal_grey ≥ 1.7` and `cal_grey / cal_black` in **[1.9, 2.6]**, and no patch clips at any of the four
    standard times: patch mean not within 2 of 0 or 255, and **no pixel** in the patch at 0 or 255 — the patch is
    0.7 m at 98.7 m, i.e. ≈ 9 × 9 px at 1080p, so the r2 phrasing "< 0.5 % of patch pixels" was less than one pixel
    and is restated here as zero. In `closeup_22.png` the grey patch reads 22–55.
    *The ratio band, derived rather than asserted:* a straight sRGB encode gives 0.90 → 243, 0.18 → 118, 0.04 → 56,
    so white/grey = 2.07 and grey/black = 2.09; AgX's toe can darken the black patch by ~15 % (ratio 2.4) while its
    shoulder pulls the white patch down, which is why the black ratio is a band 1.9–2.6 and the white ratio is only a
    floor of 1.7. A value outside the band means the tone curve is wrong, not the exposure. The earlier
    `cal_grey / cal_black ≥ 2.5` was unreachable from this item's own 118 anchor and is withdrawn, and so is the r2
    absolute triple (215–245 / 105–135 / 18–40): its 18–40 black demands a ratio of 3.0–6.5.
21. **720p and integrated.** `--w 1280 --h 720` at `aerial 12` matches the 1080p statistics within ±4 luma on
    mean/p50 and shows no resolution-dependent artefacts; `--showcase all --camera aerial --time 12` renders a lit,
    shadowed, fogged scene with the same sky.
22. **The `sky` preset actually frames sky.** In `sky_12.png` and `sky_22.png`, sky fraction `y_h / H ≥ 0.35` by the
    §4 horizon formula. *Stated assumption:* `CityCamera.minPitch = 0.08` (`src/core/camera.js:16`) is a hard clamp
    and the integrator declined `?pitch=` (`docs/core-requests/environment.md`, "Not applied"; confirmed — no `pitch`
    parsing exists in `src/main.js`, `src/core/showcase.js` or `tools/`), so a preset can never look upward.
    At `minPitch = 0.08` and fov 45 the ceiling is **40.3 % sky and +17.9° of elevation at the top of frame** — which
    is why item 11 grades a top-of-frame band and a probe rather than the zenith, and why item 9(a) cannot be asked of
    an `aerial` frame. The currently registered `sky` preset (pitch 0.12) yields 35.4 %, i.e. it passes with 0.4
    percentage points of margin: any increase in pitch fails this item. Do not exceed the contract to beat this — restate the
    request in `docs/core-requests/environment.md` if you need more.

## 5. Budget

| Metric | Limit | Notes |
|---|---|---|
| Draw calls (declared) | 15 | ARCHITECTURE §9 line for `environment` |
| Draw calls (measured, worst shot) | ≤ 14 | includes rain + fog + all shadow-cascade passes |
| Triangles (declared) | 90,000 | honest declaration: 90,000 = 1.2 × the 75,000 measured ceiling — 20 % above the measured figure, 16.7 % of the declared one; stated both ways so the arithmetic is not re-derived two different ways (r2 issue 11) |
| Triangles (measured, worst shot) | ≤ 75,000 | dome ≤ 2.5 k, ridge ring ≤ 6 k, rain ≤ 12 k, rig ≤ 45 k |
| `moduleMs.environment` | ≤ 1.5 ms median of ≥ 20 consecutive samples; **≤ 2.0 ms worst single sample**, LUT frames included | ARCHITECTURE §9: "any single module ≤ 2 ms", no exception. `terrain.md` holds itself to the same 2.0 ms. Amortise the LUT over ≥ 4 frames rather than asking for a bigger frame; `_debug().lutRebuilds/lastLutMs/lastFrameMs` make the LUT frames nameable (acceptance 18) |
| Sky LUT rebuild | ≤ 1 per 0.5 s real time, only when the sun moved > 0.6° or weather changed; each rebuild split over ≥ 4 frames | |
| PMREM rebuild | ≤ 1 per 2.5 s real time | ARCHITECTURE §12: "every few minutes of game time" |
| GPU texture memory | ≤ 120 MB, **declared** | **Not measurable here**: `<shot>.json`'s `textures` is a *count*, not bytes (`src/core/debug.js:23`). Stand-in: the module's allocations are exactly this list and the critic re-derives the bytes from the code — 3 × 2048² CSM depth ≈ 36 MB; sky LUT 512×256 RGBA16F; ambient LUT 128×64; cloud-shadow ≥ 512² R8; PMREM 256 cube; showcase PBR sets 1k only, **no 2k**. A texture outside the list is the finding, not the megabyte total |
| Init | ≤ 3.5 s warm cache | **Not separately measurable here**: `elapsedMs` in `<shot>.json` covers the whole capture, and one SwiftShader frame is 2–12 s. Stand-in: every capture in the round completes inside `--timeout 240` with `ok: true`, `errors: []` and `modules.environment.status === "ready"` |
| Per-frame allocation | none in `update()` | Stand-in: `grep -n "new THREE\." src/modules/environment/*.js` shows no constructor on a path reachable from `update()`; reuse the module-level scratch vectors/colours |

## 6. Known failure modes

Symptoms as they appear on screen, so a round is not spent rediscovering them.

- **Cream half-frame at 17:30.** Exposure boost at low sun, the golden-hour intensity punch, the dome aureole and the
  fog in-scatter all scale with the same boosted `sunIntensity` and multiply. Divide the in-scatter and aureole terms
  by the exposure boost so the sun's glow is not counted three times. (r2 rank 1.)
- **Per-pixel TV static inside windows** on towers 100–400 m away at night: `gl_InstanceID` passed as a *smooth*
  varying, whose 1e-5 interpolation round-off is multiplied by 43758 inside a `sin`-`fract` hash, flipping on/off per
  pixel. Any hash fed by an interpolated value has this bug. (r2 rank 2.)
- **Night brighter than day** in `world.weather.skyLight`, black `fog.color`, near-black rain: scratch-buffer aliasing
  in the CPU port of the sky integral (`opticalDepth` reusing the caller's point/density scratch). Assert
  `noon zenith radiance > night floor` at init. (r1 rank 1 — fixed; do not regress.)
- **Milky noon.** `fogDensity` above ~1.2e-4 **in `clear` or `partly` daylight** puts a 16 % veil at 500 m;
  `environmentIntensity` near the direct sun term flattens shadows. The preset table in §2 is the authority:
  clear 8e-5, partly 1.1e-4 — both below the threshold; `cloudy` 3e-4, `rain` 6.5e-4 and `fog` 6e-3 are legitimately
  above it because the frame is meant to be hazy. The `0.0006` in the §3 block is the pre-init default, not a target.
  (r1 rank 2 — fixed; do not regress.)
- **Regular lattice on the ground** at aerial/skyline distance, degenerating to radial moiré at grazing angles: a
  photo tiled every 13 m over 8 km. Hex-tiled texture bombing plus 20–250 m macro variation is the fix that worked.
  (r1 rank 3 — fixed; do not regress.)
- **Hard horizon seam in fog**: the dome drew clouds/haze on top of the LUT without the ground's in-scatter, so a
  mid-grey band with crisp clouds sat above a light-grey plane. (r1 rank 6 — fixed; do not regress.)
- **Corduroy specular sheen on dry grass** at grazing sun: `normalScale` above ~0.8 with an unclamped ARM roughness.
  Floor dry-grass roughness at ~0.86. (r1 rank 7 — fixed; do not regress.)
- **Olive-green night ground** and **window emissives clipping to flat white**: night exposure applied to a saturated
  green albedo, and emissive above ~0.3 saturating AgX so the warm/cool tints vanish. (r1 ranks 8, 10 — fixed.)
- **Everything turns orange at sunset** because the sun colour is normalised by its own max channel and stays fully
  saturated at 1–2° elevation; sunlit grass becomes ochre "sand". Mix ~20 % toward white below 5°. (r2 rank 10.)
- **Scene-wide traversal every frame** in the material sweep: invisible at 40 objects, eats the 2 ms budget in
  democity. Sweep on `module:ready` / `app:ready` / `*:changed` only. (r1 rank 13 — fixed; do not regress.)
- **PMREM built from the sun-masked ambient LUT** leaves chrome reflections with no sun aureole (builder's own r2
  remaining weakness): the sphere ladder's mirror ball should still show a sun.
- **Cloud drift tied to wall clock** makes two shots at the same `?time=` differ, which reads as flicker to a critic
  diffing frames. Seed drift from game hour/day and freeze it while paused.
- **A full-screen dome raymarch costs 5–12 s per frame on this box.** Scale march steps by `ctx.quality` — 5 at
  `low`, 8–12 for rays below 20° elevation at `high` — so captures stay inside the 240 s timeout. This is the only
  environment-specific half of the SwiftShader problem; the invariant halves (fps is relative only, and a capture that
  lands on the "SIMBUILD / LOADING" overlay must be re-shot, never tuned against) belong in `BUILDER.md` and
  `CRITIC.md` per the prompt standard's role-prompt rule, and were removed from here. BUILDER.md and CRITIC.md already
  carry the fps rule. The boot-overlay *re-check* is already applied in the tool — `tools/screenshot.mjs:64-66,89-92`
  re-waits unless `__sim.ready === true` **and** `#boot` is hidden, before and after the fps measurement — so
  role-prompt request #11 now covers only moving the *interpretation* rule (a frame that still shows the overlay is
  re-shot, never tuned against) into `CRITIC.md`, where `roads.md`, `terrain.md` and `props.md` duplicate it today.

## 7. Dependencies and their real APIs

`dependencies: []`. The module must init, run and look correct with **no other module loaded** — that is exactly what
`?showcase=environment` does. `world.terrain` in that case is core's flat stub (`getHeight() -> 0`,
`getNormal() -> (0,1,0)`, `raycast()` against y = 0); do not assume real terrain exists.

Callable core APIs — **signatures read from `src/core/*.js` on 2026-09-05, not from ARCHITECTURE §6. Where §6
disagrees it is stale** (§6 is missing `registerPreset`, `armMap`, `sunAzimuth`, `isNight`, `moduleMs`, and the
`rng.weighted/gauss/fork` set); BUILDER.md calls ARCHITECTURE "the contract", so **this divergence is core request
#12, to be filed in round 3**. Until §6 is updated, build against the code and this list:

- `ctx.clock`: `hour`, `day`, `speed`, `paused`, `set(hour)`, `setSpeed(n)`, `pause()`, `resume()`,
  `sunElevation(hour) -> rad`, `sunAzimuth(hour) -> rad` (fixed by the integrator: 06:00 east, 12:00 south, 18:00
  west), `isNight(hour)`. Keep publishing your own `sunDir`; other modules read `world.weather.sunDir`.
- `ctx.camera`: `camera` (PerspectiveCamera, fov 45, near/far adapted per frame), `target`, `distance`, `yaw`,
  `pitch`, `presets`, `apply(name|{yaw,pitch,distance,target}|{position,target})`, `registerPreset(name, preset)`,
  `flyTo(preset, seconds)`, `enableControls(bool)`, `screenToGround(ndcX, ndcY)`. `minPitch = 0.08` is clamped.
- `ctx.assets`: `pbr(name, {repeat:[x,y], anisotropy, wrap}) -> {map, normalMap, roughnessMap, aoMap, metalnessMap,
  armMap, displacementMap, entry}` (missing maps `null`; missing manifest entry → procedural fallback + `log.warn`);
  `applyPbr(material, set, {normalScale = 1, aoIntensity = 1, displacementScale = 0})`;
  `texture(url, {srgb, repeat, wrap, anisotropy, flipY})`; `hdri(name)`; `gltf(url)`;
  `procedural.noiseTexture(opts)`, `procedural.gradient({size, stops, horizontal, srgb})`, `procedural.solid(hex)`.
  **Every loader resolves even on failure** — a missing texture must degrade to a procedural surface, never a throw.
- `ctx.rng`: `float()`, `int(a,b)`, `range(a,b)`, `pick(arr)`, `weighted()`, `gauss()`, `shuffle()`, `fork(label)`.
- `ctx.engine` / `ctx.renderer` / `ctx.scene` / `ctx.group` / `ctx.events` (`emit`, `on`, `off`, `once`) /
  `ctx.log` / `ctx.quality` / `ctx.headless`; `QUALITY[ctx.quality]` and `RENDER_ORDER` / `LAYERS` from
  `src/core/constants.js` (sky dome uses `RENDER_ORDER.SKY = -1000`, showcase ground `RENDER_ORDER.TERRAIN = 0`).
- `window.__sim` (`src/core/debug.js`) is the probe surface critics use: `ready`, `errors`, `warnings`,
  `stats()` (`drawCalls`, `triangles`, `moduleMs`, `camera`, `modules`), `setTime(h)`, `setCamera(p)`, `setSpeed(n)`,
  `world`, `events`, `camera`, `engine`.

Consumers you must not break: `terrain`, `roads`, `buildings`, `props`, `traffic` read `world.weather.sunDir`,
`lightDir`, `night`, `wetness`, `skyLight`, `exposure`, and call `api.setupMaterial(m)` for custom `ShaderMaterial`s.
`effects` may install a composer over your frame — the module must look correct **with no post-processing at all**;
never rely on someone else's bloom to sell a night light.

Assets: CC0 only (ARCHITECTURE §10), appended to `public/assets/manifest.json` and fetched with
`node tools/fetch-assets.mjs`. 1k JPG; no 2k in this module.

## 8. Showcase

`showcase.description` must name what the scene proves, not what it contains. `showcase.setup(ctx)` stages, on the
flat stub terrain:

1. An 8 km ground plane, hex-tiled grass + dirt/worn-track layer, 20–250 m macro variation, wetness response.
2. The 9-sphere roughness/metalness ladder (dielectric 0.04→1.0, chrome, copper, two coloured) — the IBL and sun
   read on it at every hour; the mirror sphere must show a sun aureole.
3. ~30 concrete blocks and towers (12 near, 14 in a 260–900 m ring, 4 low plinths for contact shadows) with the
   window grid: dark glass by day, per-window random warm/cool lights at night, reveals.
4. **New — a distant silhouette ring** at 2.5–3.5 km, 20–80 m tall with ≥ 15 m height variation, so the horizon is
   never a straight line and aerial perspective has something to act on (acceptance 8). ≤ 6 k triangles, 1 draw.
5. **New — a calibration board** at world **`(4, 1.4, 56)`**, 2.4 m wide × 1.2 m tall, heading 1.15 rad (its normal
   splits the `closeup` and `street` view directions, ≈ 9.6° off-normal from each), matte (roughness 0.6,
   metalness 0), three 0.7 × 0.7 m patches of albedo 0.90 / 0.18 / 0.04 at board-local x = −0.8 / 0 / +0.8.
   It is unoccluded from both `closeup` and `street` (the sphere rows end at z = 42.2 and the low wall at z = 62 is
   1.2 m tall, well under both sight lines) and is ≈ 6 px wide at 1080p from `aerial`/`skyline` (2.4 m at ≥ 500 m,
   `1080 / (2 tan 22.5°) × 2.4 / 500`), so it cannot move a whole-frame statistic. Each patch is 0.7 m, which is
   9 px across from `closeup` at 98.7 m — hence the full-resolution rule in §4.
   Registered as landmarks `cal_white` / `cal_grey` / `cal_black` (acceptance 20).
6. **New — a shadow canopy**: an 8 × 8 m horizontal slab, 0.4 m thick, top at y = 6.0, centred at **`(36, 6, 50)`**,
   on four 0.25 m corner posts. A *horizontal* caster is required because a vertical one cannot work here: at noon
   the sun is at 64.8° elevation and every camera is below 21°, so a wall hides `h/tan(pitch)` metres of ground while
   its shadow reaches only `0.47 h`. The canopy's 12:00 shadow is an 8 × 8 m patch offset 2.8 m toward −Z, fully
   visible because only the thin posts are between it and the camera; it spans `z = 43.2…51.2`. Registered landmarks:
   `shadow_patch` = 2 × 2 m of ground at `(36, 0, 47.2)` (inside the shadow), `lit_patch` = 2 × 2 m at `(36, 0, 58)`
   (6.8 m from the shadow's near edge, centre to edge, and 3 m from the wall at z = 62; the wall's own noon shadow
   reaches 0.56 m). From the `closeup` camera at `(78.3, 43.7, 105.3)`: `shadow_patch` is 84 m away, **1.7°
   horizontal and −11.3° vertical** off the optical axis (74 % of the way down the frame); `lit_patch` is 77 m away,
   **7.5° / −14.5°** (81 % down). Both sit well inside the frame (half-fov 36.4° horizontal, 22.5° vertical) but
   neither is near the optical centre — the off-axis figures quoted here are the ones to expect in the crop rects
   (acceptance 2).
7. **New — a pinned ground patch** `ground_near`: 8 × 8 m of open ground at **`(52, 0, 52)`**, clear of the sphere
   rows, the canopy and the (70, 44) plinth. Distances and off-axis angles, computed from the camera basis in
   `src/core/camera.js:80-88` (horizontal / vertical, and how far down the frame it lands):
   `closeup` 73.8 m, −8.1° / −16.3°, 85 % down (141 px across at 1080p); `street` 43.6 m, 2.6° / −4.0°, 58 % down
   (240 px); `sunset` 217.6 m, 14.1° / −5.9°, 63 % down (48 px); `sunrise` 318.1 m, −9.5° / −2.2°, 55 % down (33 px).
   All four are in frame and all four are measurable at 1080p and at no smaller size (acceptance 10, 11, 12).

All landmarks in 5–7 sit at the world coordinates given, on the flat stub ground, and every one of them must be
returned by **`api.cropRects({project, width, height, camera})`** (§4) under exactly these names: `cal_white`,
`cal_grey`, `cal_black`, `shadow_patch`, `lit_patch`, `ground_near` — the critic reads them from
`<shot>.crops.json` as `environment.cal_grey` and so on, and a landmark that is off-screen for the current camera is
returned clamped, not omitted. Moving a landmark to make a number easier is the same
offence as exceeding the camera contract in item 22: restate the request in `docs/core-requests/environment.md`.

Camera presets — **keep these names, critic scripts and both previous rounds use them**:
`sunset`, `sunrise`, `moonrise`, `sky`. **The registered pitch is part of the contract too**
(`src/modules/environment/index.js:332-335`), because items 7, 11 and 22 do their envelope arithmetic from it;
changing one to make a number easier is the same offence as moving a landmark. Requirements at the times they exist
for:

| Preset | Pitch | Shot at | Must show |
|---|---|---|---|
| `sunset` | **0.10** (37.9 % sky) | 17.9 | sun disc within 15° of frame centre at 1–4° elevation, warm split-tone lighting, cool shadows |
| `sunrise` | **0.10** (37.9 % sky) | 6.2 | the same from the east; more haze is fine, sepia is not |
| `moonrise` | **0.09** (top of frame +17.3°) | 22 | the moon in frame (acceptance 7) with moon-lit shadows on the ground |
| `sky` | **≤ 0.12** | 12 and 22 | ≥ 35 % sky by the §4 formula — 0.12 → 35.4 %, `minPitch` 0.08 → the 40.3 % ceiling; cumulus structure by day, stars + milky way by night |

Standard matrix (critics shoot noon and night by default, plus golden hour):

| | 06.5 | 12 | 17.5 | 22 |
|---|---|---|---|---|
| `aerial` | long soft shadows, warm lit faces, cool shadowed ground, cloud shadows readable | max contrast: bright lit tops (p99 ≥ 185), saturated grass, deep cool shadows | very long shadows, no grey veil on the lit ground | blue-grey desaturated ground, window lights, faint moon shadows |
| `street` | warm horizon haze, blue upper sky (the zenith is never in frame — item 22), contact shadows under every sphere | blue sky with cumulus, crisp shadows, matte grass | warm split-tone, no cream wash | navy sky, stars, warm/cool windows, moon speculars, no window static |
| `skyline` | cumulus with lit tops over a hazed ridge line | clean sky gradient, haze band at the horizon, 3 depth planes | punchy, not milky (acceptance 3) | navy sky, sparse-to-dense star field, far ground not a bright grey band |
| `closeup` | ground clump detail, warm rim on the spheres | calibration board on target (acceptance 20), grass detail, dirt patches | long soft shadow edges, no grazing sheen | strongest night frame: unclipped windows, moon highlight on chrome |

Weather variants the critic will also shoot — **exact commands and filenames are in §4; never via the gauntlet** —
and what each must prove:
`aerial_12_clear.png` (crispest frame, haze only on the horizon) ·
`skyline_12_clear.png` / `skyline_12.png` / `skyline_12_cloudy.png` (the cloud-fraction ladder, acceptance 4;
the cloudy frame must also show structured overcast and soft shadows) ·
`street_12_rain.png` (fine streaks + wet ground, acceptance 12) ·
`skyline_12_fog.png` (seamless white-out, acceptance 13) ·
plus `aerial_12_720.png` at `--w 1280 --h 720` (acceptance 21).
