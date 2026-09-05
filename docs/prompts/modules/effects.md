# Module spec — `effects`

Round 1 scored **6.0 / FAIL** (`docs/critic/effects_r1.md`). The plumbing was already right — 0 errors, 22-draw
chain, deterministic, API contract met. **The picture failed.** **Rounds 2–4** — `docs/STATUS.json` carries
`maxRounds: 4` and `effects.next = {phase: build, round: 2}`, so three rounds remain, not four — are about the image
only: night, golden hour, shadow rendition, AO, rain, glare, and the stage they are judged on. Do not re-architect
the composer; it works.

Everything invariant lives in `docs/prompts/BUILDER.md` and `ARCHITECTURE.md`: **blast-radius discipline, fail-soft,
determinism, honest self-scoring and "fix the ranked issue, do not restyle around it" are BUILDER.md's rules and are
not restated here** — this file carries only the effects-specific twist on each. Blast radius (the effects-specific
file list): `src/modules/effects/**`, `public/assets/manifest.json` (append CC0 only),
`docs/core-requests/effects.md`, `docs/builds/effects_r<round>.json`, `shots/effects/**`. Nothing else.

---

## 1. Purpose

Without `effects` the game renders a technically lit scene that never looks photographed: no contact occlusion under
anything, no glow on a lit window at night, no aerial dehaze, no filmic shaping — the difference between CS2 and a
Three.js demo.

## 2. World data owned

`effects` **owns no `world` section**. It owns the render path. It reads, and never writes, these exact fields.
The first three lines are copied verbatim from `ARCHITECTURE.md` §3. The nine fields on the fourth line are real
(`src/modules/environment/index.js:104-107` writes them in `init`, `:272-281` republishes them every frame) but
`ARCHITECTURE.md` §3 does not yet carry them, which makes this file the de-facto authority for another module's
published data. **Round 2 must add one line to `docs/core-requests/effects.md` asking the integrator to fold those
nine fields into §3's `weather` block**; once that lands, replace the annotated list below with a verbatim copy of
§3 and delete the annotation.

```js
world.weather = {
  cloudiness: 0.3, rain: 0.0, wind: {x:1, z:0, speed:2}, fogDensity: 0.0006, temperature: 18,
  sunDir: Vector3, sunIntensity, skyLight: Color,   // published each frame by environment
  // added by environment.init / published every frame in environment.update:
  moonDir: Vector3, lightDir: Vector3, sunColor: Color, lightIntensity, exposure, night, wetness, preset, moonPhase,
}
world.time = { hour: 12.0, day: 1, speed: 1, paused: false }   // owner core/clock, read-only
world.flags = { showcase: null, headless: false }
```

Also read-only: `ctx.scene.fog` (`THREE.FogExp2`, `.color`, `.density`) — the dehaze needs both;
`ctx.camera.camera` / `.distance` / `.target`; `ctx.engine.stats`.

**Events emitted: none.** `effects` is a consumer. It subscribes to `weather:changed` and `time:hour` only if it
needs them; per-frame values come from `world.weather`, not from events.

**Renderer-state rule (this has been misread before).** `ARCHITECTURE.md` §4 lets `effects` change renderer state
*only* through `engine.setComposer`. `BUILDER.md` is the tie-breaker: **`environment` alone sets
`renderer.toneMapping`, `renderer.toneMappingExposure` and `scene.fog`.** `effects` must never write any of them.
Every exposure, dehaze and contrast decision happens inside your own passes, reading `world.weather.exposure`.

**Public API (`ctx.modules.effects`) — the contract other modules and the critic call.** All of these must exist and
behave as described; the critic probes them by name.

```js
api = {
  setEnabled(v) -> bool,          // false => engine.setComposer(null), direct render restored
  isEnabled() -> bool,
  setPreset(name) -> string,      // 'default' | 'cinematic' | 'clean' | 'flat' | 'photo'
  getPreset() -> string,
  presets: string[],
  setDof(on, opts?) -> bool,      // opts {focus, range, maxCoc}; DOF is OFF unless explicitly enabled
  setDebugView(name) -> string,   // 'off' | 'ao' | 'bloom' | 'mask' | 'coc' | 'dehaze' | 'histogram'
  bloomThreshold() -> number,     // CURRENT threshold in SCENE-LINEAR units; the documented contract for
                                  // buildings/props: an emissive at >= 2.5x this value glows at night
  _override(opts|null) -> void,   // THE A/B TOGGLES. Keys: {bloom, ao, dof, glare, rain, grade, dehaze, glow},
                                  // each 0 (force that pass off) or 1 (force it on); null clears every override.
                                  // REQUIRED, not a dev nicety: the critic's probes for acceptance items 3, 4, 9,
                                  // 10, 11, 12, 13 and 18 produce their diffs with it. It exists today as an
                                  // undocumented hook (`_override(o) { S.override = o || null; }`,
                                  // src/modules/effects/index.js:223); round 2 makes it contract and gives it
                                  // exactly these keys. Unknown keys are ignored, never thrown on.
  state() -> {                    // every key required; the critic reads it
    enabled, installed, failed, preset, quality, night, golden, exposure,
    grade: { blackPoint, whitePoint, contrast, saturation, temperature, vignette },
    dehaze: { strength, fogColor:[r,g,b], fogDensity },
    bloom:  { threshold, strength, radius, maskPixels },
    ao:     { radius, intensity, contactRadius, scale },
    dof:    { enabled, focus, range, maxCoc },
    rain:   { wetness, streaks, enabled },
    glare:  { enabled, sunScreen:[x,y], inFrame },
    debugView, size:[w,h], chainDrawCalls, passes:[{name, enabled}],
  },
  cropRects({project, width, height, camera}) -> { <name>: [x,y,w,h] },
                                  // THE MEASUREMENT LANDMARKS of §4, in pixels of the current
                                  // full-resolution framebuffer. `window.__sim.cropRects()` collects it and
                                  // `node tools/screenshot.mjs … --crops` writes `<out>.crops.json` beside the PNG
                                  // (ARCHITECTURE §8; `src/core/debug.js:41-50` skips any module
                                  // without this function, so without it every pinned item below fails).
                                  // `project(x,y,z)` maps a world point to pixels. Return a name only when that
                                  // landmark is genuinely in frame at that camera and meets its minimum size.
}
```

**Override isolation rule (what makes the A/B diffs mean anything).** A frame rendered under `_override({x: 0})`
must be identical to the unoverridden frame **except for the contribution of pass `x`**: no re-exposure, no
re-adaptation of the auto black/white point (item 17), no re-grade, no resize, no reseed, no LOD change. Snap the
histogram state before rendering an override frame so a diff isolates exactly one pass. The same rule binds
`setEnabled(false)` and `setDebugView`, and `_override(null)` must restore a **byte-identical** frame.

## 3. Visual/behavioural target

The target is the *grade and the light response* of CS2, judged at the same zoom and hour. All eight references were
read for this spec; these four carry the requirements.

- **`$REF/cs2_8.jpg` — night, rain, street.** This is the frame round 1 failed hardest against. The sky is **deep
  navy**, not milky. Unlit facade panels sit near black with the material still readable; lit windows are small
  near-white rectangles with visible warm/cool interior colour, and each carries a **tight** halo, 20–70 px, that does
  not lift the wall around it. Lamp heads are blown white cones with a soft warm pool on the wet road. A green traffic
  lens and a magenta neon sign each glow locally and saturated. Rain: fine, near-vertical bright streaks, densest read
  against the dark facades; the wet asphalt smears the red taillight and the yellow centre line into **long vertical
  reflections**. Global bloom does not exist here — every glow is attached to an emitter. Your night must be built the
  same way: **let the scene go dark and make the emitters bright**, never lift the frame to prove it is populated.
- **`$REF/cs2_4.jpg` — golden hour, low aerial.** Long tree shadows across a road. Shaded asphalt is **neutral warm
  grey**, not steel blue; the yellow centre line stays yellow inside the shadow. The distant industrial belt at the
  top of frame loses ~half its contrast to warm haze but every building is still separable. Sunlit white siding is
  bright with detail intact — nothing is a cream field. This is the frame that kills round 1's issues 1 and 4.
- **`$REF/cs2_5.jpg` — noon closeup, parked cars.** Cast shadow on asphalt is deep but the asphalt grain is still
  visible inside it; the dark car body in shadow still reads as a car. Contact occlusion under each tyre and each sill
  is clearly darker than the cast shadow — a distinct dark seam, not a wash. No bloom, no vignette, no DOF at this
  zoom. This is the "readable shadows + real AO" bar (round 1 issues 3 and 5).
- **`$REF/cs2_2.jpg` — high skyline over water.** Haze is a gradient over kilometres: the far mountains are pale and
  low-contrast but their ridge lines are still resolvable, while the near forest stays deep and dark. Contrast falls
  with distance; it never collapses to one flat value. (`$REF/cs2_6.jpg` proves the same in the worst weather CS2
  ships: heavy snow, and the far ridges are still separable while the foreground pines stay near black.)

Cross-cutting: **no reference frame in the set shows depth of field.** DOF is a photo-mode tool here, not a look.
Bloom in the references is always local to an emitter. Vignette is barely present.

## 4. Acceptance criteria

Conventions the critic and the builder both use, so a number means the same thing to both:

- `luma = 0.2126R + 0.7152G + 0.0722B` computed on the delivered 8-bit sRGB PNG, range 0–255. `pN` = Nth percentile
  over all pixels of the frame.
- Standard shots are `shots/effects/r<n>/<camera>_<time>.png` for `camera ∈ {aerial, street, skyline, closeup}` and
  `time ∈ {6p5, 12, 17p5, 22}` (16), plus the declared presets `plaza`, `lamps`, `glare`, `photo` at 12 and 22 (8)
  **and `glare` at 17.5** (1, the frame item 13 is graded on) = **25 shots**. "All preset shots" means those nine.
- "sun-side half" = the left or right half of the frame containing the screen-projection of `world.weather.sunDir`
  (or, when the sun is off-screen, the half its azimuth points into).
- A/B diffs are produced with `api._override` / `setEnabled` / `setDebugView` from a probe at
  `shots/effects/r<n>/apicheck.mjs`; "changed by > X" means per-pixel |Δluma| > X.
- **A/B capture size.** An override pair is two rendered frames and there are more than a dozen pairs, so capture a
  pair at **1280×720** whenever every threshold in its item is a percentage of pixels or a mean/ratio of luma —
  those are resolution-independent, and item 19 already requires 720p to track 1080p within `|Δp50| ≤ 4`. Only a
  **pixel-distance** threshold forces 1920×1080: item 3's halo radius, item 12's streaks, item 13's glare radii.
- **How a probe reaches the api:** `window.__sim.registry.apis.effects` (there is no `__sim.modules`). The module
  record — including `initMs` and `status` — is `window.__sim.registry.get('effects')`. `src/core/debug.js` puts
  `registry` on `__sim`; `src/core/registry.js` keeps `apis[name] = def.api`.
- **Measurement rects are declared, not eyeballed — and they come from `--crops`, from nothing else.** Every item
  below that measures "a patch", "a band" or "a crop" names a landmark instead. `node tools/screenshot.mjs …
  --crops` writes `<out>.crops.json` beside the PNG (ARCHITECTURE §8, `tools/screenshot.mjs:94-98`):
  `{png, width, height, camera, time, rects: {"<module>.<name>": [x,y,w,h]}}`, in pixels of the full-resolution
  capture, collected by `window.__sim.cropRects()` from every ready module's `api.cropRects` (`src/core/debug.js:41`).
  **`effects` must implement `api.cropRects`** (§2) and return exactly these names, each only when that landmark is
  in frame at that camera and time and meets its minimum size:

  | rect | must enclose | min size |
  |---|---|---|
  | `unlitFacade` | one **unlit** facade wall — no window, no lamp, no sky, no roof edge | 64 × 64 |
  | `shadedAsphalt` | asphalt in cast shadow — no kerb, no grass, no marking, no shadow boundary | 64 × 64 |
  | `sunlitAsphalt` | **the same asphalt material** in sun — same exclusions | 64 × 64 |
  | `distantTerrain` | the most distant terrain in frame, no sky | 256 × 256 |
  | `skyCrop` | clear sky — no roofline, no sun disc, no cloud edge | 200 × 200 |
  | `groundRect` | wet road below the emitters whose reflections item 12 measures | 200 × 200 |
  | `flatSurfaceCorner`, `flatSurfaceCentre` | **the same material**, one near a frame corner, one near the centre | 100 × 100 each |
  | `towerBand` | sky band 0–150 px above the tower roofline | 300 × 150 |
  | `emptyTerrainBand` | same size and same screen height as `towerBand`, ≥ 600 px horizontally away, over empty terrain | 300 × 150 |
  | `lampHead` | one **isolated** lamp head at the rect centre, no second emitter within 150 px | 200 × 200 |
  | `aoJunction` | one building-base or kerb junction line | ≥ 32 px across it, ≥ 128 along |
  | `aoOpenGround` | flat ground ≥ 200 px from any junction in that frame | 128 × 128 |
  | `foliage` | alpha-cut foliage cards only — no trunk, no sky, no building behind the leaf edge | 128 × 128 |
  | `focusSubject` | the in-focus subject of the `photo` preset | 128 × 128 |
  | `sharpenEdge` | one lane-marking edge, the rect's **long axis perpendicular** to it | 128 × 32 |

  Minimum sizes are in pixels of a 1920×1080 capture and **scale with the capture** — 1280/1920 = 0.667, so a
  64×64 minimum is 43×43 in a 720p A/B frame; a landmark is never withheld merely because the frame is smaller.
  They appear in `crops.json` as `effects.unlitFacade`, `effects.towerBand`, … **Where an item names a rect the
  critic measures that rect and no other** (whole-frame percentiles, e.g. items 1, 5, 7, are unaffected), and it may
  reject a rect that visibly does not contain what its name claims (a `shadedAsphalt` with kerb or grass in it, a
  `skyCrop` with a roofline in it).
  A rejected **or missing** rect fails its item — this stage is entirely yours to build (§7), so there is no shot in
  which a landmark is unplaceable.
- **Pinned statistics are taken on the full-resolution PNG, never on a downscaled copy** (ARCHITECTURE §8): at
  480 px wide a 1 m patch is about two pixels. Only the "look at it" judgements (items 10, 20, 23's contour check)
  are made on a downscaled read.
- **`tools/gauntlet.mjs` does not pass `--crops`** (`tools/gauntlet.mjs:20-24`), so its PNGs arrive without rects.
  Take every shot an item pins a statistic on with a direct `node tools/screenshot.mjs … --crops --timeout 240` call
  writing to the same `shots/effects/r<n>/<camera>_<time>.png` path; the URL is the gauntlet's, so it is the same
  frame (item 16), and the official gauntlet run still supplies `summary.json` and the error/draw-call record.
- **An A/B pair has no `crops.json` of its own** — the probe renders those frames itself, and
  `screenshot.mjs --crops` is the only producer of `crops.json` (ARCHITECTURE §8). The probe reads
  `window.__sim.cropRects()` in-session and records the rects in `apicheck.json`; they must equal that camera/time's
  `crops.json` rects **at the same capture size**, which is what makes a 720p pair gradable against a 720p landmark.
- **The emitter mask** used by item 3 is a `setDebugView('mask')` capture of the same frame at the same
  camera/time/size, dilated by 24 px; "within 24 px of an emitter" means "inside that dilated mask". The critic does
  not hand-pick emitter locations.

**Cut line for round 2 — read this before starting. Every item is classified; nothing is left to guess.**
**Must-pass: 1–11, 14–19, 24 — 18 items.** (10 and 11 ride free on the AO and DOF passes 9 and 18 already require;
24 is two cheap shots.) **Deferrable to round 3: 12, 13, 20, 21, 22, 23 — 6 items**, and a deferred item must be
listed as `deferred` with a one-line reason in `docs/builds/effects_r2.json` rather than shipped half-built.
18 + 6 = 24. **A round that passes items 1–9 and defers the stage scores higher than a round that touches all 24 and
lands none.** Budget the captures the same way: on this box a 1080p capture cost **107–591 s** end to end in
round 1 (`elapsedMs` across all 21 shots) — about 6–27 s of that is one rendered frame (`frameMs`) — so shoot
the must-pass matrix first and the deferred items' shots last. Within the must-pass set, ordered by how much each
moves the score.

1. **Night is night, and it glows.** At `--time 22`, every one of `aerial/street/skyline/closeup/lamps/plaza`:
   `p50 ∈ [10, 34]`, `mean ≤ 48`, and `≥ 0.20 %` of pixels `≥ 200` luma. `effects.unlitFacade` in each of those six
   shots' `crops.json` has `mean ≤ 30`. Round 1 measured
   `mean 45–56, p50 42–49` with no pixels above 200 — that frame fails this item.
2. **Emissives are warm; the sky stays blue.** Among pixels `≥ 200` luma at 22:00 **that lie inside the dilated
   emitter mask** (§4 convention), `mean(R) − mean(B) ≥ 25` (sodium/tungsten, ≈2700 K). The mask scope is not
   optional: unmasked, the `≥ 200` population also contains `environment`'s stars (~1.3 px, tinted anywhere from
   blue-white to warm, `src/modules/environment/sky.js:114-136`) and its moon disc, which `effects` could only move
   with a global grade that breaks items 1, 5 and 8 — an item that fails on another module's pixels is not
   gradable. Among sky pixels (top 12 % of `skyline_22`), `mean(B) − mean(R) ≥ 12` and `mean luma ≤ 55`. Verified in `skyline_22.png`,
   `street_22.png`.
3. **Bloom is attached to emitters, at night and only at night.** Bloom on/off diff (`_override({bloom:0})` vs
   `_override(null)`) at `closeup_22` and `lamps_22`: `1 %–6 %` of pixels change by `> 8`, and `≥ 60 %` of that
   changed area lies **inside the dilated emitter mask** (§4 convention: `setDebugView('mask')` on the same frame,
   dilated 24 px). The radial mean of that diff about the centre of `effects.lampHead` falls to half its value at
   `r = 0` between **20 and 70 px**, which pins the night pair at 1920×1080 (§4). At noon (`street_12`, `aerial_12`)
   the same diff changes `≤ 0.15 %` of pixels by `> 4` — that pair may be 720p. Round 1 passed the noon half of this
   and failed the night half (windows never crossed the threshold) — keep the restraint, fix the windows.
4. **City glow at the skyline, and it must be `effects` producing it.** In `skyline_22`, sky luma averaged over
   `effects.towerBand` (§4: a 300×150 band whose bottom edge is the tower roofline) is `≥ 4` luma brighter than the
   **same rect translated 400 px upward** — i.e. the band 400–550 px above the roofline, which needs no second
   landmark — **and** the same two bands measured under `_override({glow: 0})` differ by
   `≤ 1` luma, so the ≥ 4 luma difference is attributable to this module and not to `environment`'s sky dome, whose
   horizon gradient satisfies the first clause on its own. **Localisation:** `effects.towerBand` is `≥ 3` luma
   brighter than `effects.emptyTerrainBand` — same size, same screen height, ≥ 600 px away over empty terrain —
   which is what distinguishes a city glow from a horizon gradient. Round 1: "no city glow at all", and the first
   clause alone would not have caught a "fix" that only steepened the sky gradient.
5. **Golden hour does not wash out.** At `--time 6.5` and `--time 17.5`, all four standard cameras: `p50 ≤ 120`,
   `p99 ≤ 248`, `< 0.5 %` of pixels `≥ 250`, and `|p50(sun-side half) − p50(shadow-side half)| ≤ 40`. Round 1
   `skyline_17p5` was `p50 163 / p99 251` — the single worst frame in the set.
6. **Aerial haze keeps distant structure.** In `skyline_12` and `skyline_17p5`, `effects.distantTerrain`
   (§4, 256×256 on the most distant terrain in frame) has luma `stddev ≥ 8` and
   `p95 − p5 ≥ 28` (`$REF/cs2_2.jpg`, `$REF/cs2_6.jpg`). The dehaze must be depth-driven — subtract `fogColor · (1 − exp(−(density·d)²))` in **linear HDR before `OutputPass`**,
   not as a display-space lift after it — using `ctx.scene.fog.color/.density`.
7. **Shadows are readable, not crushed.** At 12 and 17.5, all four cameras: `p1 ≥ 6`, `p5 ≥ 14`. On
   `effects.shadedAsphalt` and `effects.sunlitAsphalt` of each of those shots (§4, **the same asphalt material** in
   both), `mean(shadedAsphalt) / mean(sunlitAsphalt) ∈ [0.28, 0.50]` and `shadedAsphalt`'s own
   `stddev ≥ 5` (grain survives, per `$REF/cs2_5.jpg`). Round 1: `p1 = 0, p5 ≤ 5` in four separate shots. The black point must come from
   the frame's own histogram (see item 17), capped at 0.02 in display units, applied as a soft toe
   (`c − bp·(1−c)`), with contrast `≤ 1.10` around the pivot.
8. **Shaded surfaces are neutral, not cyan.** On `effects.shadedAsphalt` at 6.5 and 17.5 (all four
   cameras): `mean(B) − mean(R) ≤ 8` and HSV saturation `≤ 0.14`. On `effects.sunlitAsphalt` in the same frame:
   `mean(R) − mean(B) ≥ 10`. Round 1 painted every non-sunlit surface steel blue in four shots.
9. **AO is contact occlusion you can see.** AO on/off diff (`_override({ao:0})` vs `_override(null)`) at
   `closeup_12` and `plaza_12`: `≥ 5 %` of pixels darken by `> 12`, `≥ 1.2 %` by `> 30`. Inside
   `effects.aoJunction`, `mean darkening ≥ 20` luma; inside `effects.aoOpenGround`, `mean darkening ≤ 3` (§4 fixes
   both rects: the 32 px band on a junction line, and the ground ≥ 200 px from any junction). 720p pair.
   Round 1: `meanAbs 0.8`, zero pixels beyond 24. Implement a second
   short radius (0.6–1.5 m contact term) alongside the existing view-scaled radius (2.4–14 m).
10. **AO does not halo foliage.** Inside `effects.foliage` (§4), `mean |AO diff| ≤ 4` luma in the same
    `_override({ao:0})` diff as item 9, and the `setDebugView('ao')` capture shows no closed leaf-shaped outlines.
    Reject samples across a depth discontinuity greater than the AO radius (thickness test).
11. **DOF is off in the standard matrix.** `state().dof.enabled === false` at all 16 standard and all four
    `lamps`/`plaza` camera–time pairs, read in **one** `apicheck.mjs` session that walks them with
    `__sim.setCamera(name)` + `__sim.setTime(h)` (`src/core/debug.js:53-54`) — 20 state reads, no captures. The
    pixel proof is two 720p pairs, not twenty: `_override({dof:0})` vs `_override(null)` has `meanAbs ≤ 0.15` luma
    at `street_12` and `lamps_22`. Only under `setPreset('photo')` / the `photo` camera does near blur engage, and
    there `effects.focusSubject` (§4) keeps `≥ 70 %` of its dof-off Laplacian variance — a rect, because the
    delivered PNG carries no depth and a "`≥ 0.6 × focus`" selection is not gradable (see item 12).
    Round 1 smeared a foreground tree into a green blob at 42 m.
12. **Rain reads like `$REF/cs2_8.jpg`.** `--weather rain --time 22 --camera street`, and the streak count is
    **counted, not eyeballed**: label the 4-connected components of the `_override({rain:0})` diff at 1920×1080
    thresholded at `|Δluma| > 8`, accept components of **12–150 px area**, and require `≥ 250` of them. The window is
    the streak geometry itself — 1–3 px wide × 12–40 px long is 12 to 120 px of area, and 150 allows the
    anti-aliased edge; anything larger is a wet-road reflection, not a streak. Streaks are near-vertical, tilted
    4–14° with the wind (checked by eye on the crop, not counted). **Inside `effects.groundRect`** (§4) bright
    emissives smear downward for `≥ 40` px. Both tests are stated in image terms deliberately: the deliverable is an
    8-bit sRGB PNG and `setDebugView` has no depth or normal buffer, so a depth-reconstructed normal is not
    gradable — a declared rect and a component count are. Frame
    `p50` stays within `±10` of the dry frame at the same camera/time. At `weather=clear` the rain pass costs **0 draw
    calls** and `state().rain.enabled === false`. Round 1 had no rain pass at all.
13. **Sun glare exists and is disciplined.** Measured as the `_override({glare:0})` A/B at the declared `glare`
    preset, `--time 17.5`, at 1920×1080 (§4 — its thresholds are pixel distances): a radial glare centred within
    30 px of `state().glare.sunScreen` (the module's own projected sun position, §2 — the critic does not
    hand-pick it), reaching half amplitude between 80 and 260 px, adding `≥ 25` luma at
    60 px from centre, with `≤ 2 %` of the frame `≥ 250`. When the sun is below the horizon or more than 25 % of the
    frame width outside it, glare contributes `mean ≤ 0.1` luma. Round 1: bloom diff was exactly 0 with the sun near
    frame edge.
14. **Zero console errors and `ready` everywhere.** `errors: []` and `warnings: []` in the JSON of all 16 standard
    shots, all **nine** preset shots (§4: plaza/lamps/glare/photo at 12 and 22, plus `glare` at 17.5), the
    1280×720 shot, the `--weather rain` shot, `--showcase all --time 12`, and
    `?quality=low`, `medium`, `ultra`. `modules.effects === 'ready'` in every one. At `quality=low`
    (`QUALITY.low.post === false`) the page renders with `state().installed === false` and no error.
15. **Budget, measured by A/B.** `chainDrawCalls = drawCalls(setEnabled(true)) − drawCalls(setEnabled(false)) ≤ 28`
    in every 1080p shot (ARCHITECTURE §9 allots `effects` 30). Whole staged frame `≤ 64` draw calls and
    `≤ 900 000` triangles — **so the stage gets 64 − 28 = 36 draw calls**, and a chain that lands under 28 does not
    hand its surplus to the stage; round 1 was 41 total (22 chain + 19 stage), so §8's rebuild has 17 calls of room
    and must instance or merge for the rest. `state().chainDrawCalls` must agree with the probe to within one call:
    `|state().chainDrawCalls − (drawCalls(on) − drawCalls(off))| ≤ 1`, measured on the same frame size and the same
    quality tier. (The two numbers come from different mechanisms — an in-module per-frame attribution vs a
    `renderer.info.render.calls` delta that also moves with CSM shadow passes — so one call of slack, and no more.)
16. **Deterministic and allocation-free.** Two consecutive captures of the same URL are byte-identical (round 1
    achieved diff 0 — do not regress it with a temporally adapting exposure). `update()` costs `≤ 0.5 ms` of JS,
    read as `moduleMs.effects` in **every** shot's JSON (`tools/screenshot.mjs` writes it from `__sim.stats()`;
    round 1 read 0.0–0.4 ms). Heap growth is measured by `apicheck.mjs` at **640×360**, sampling
    `__sim.stats().heapMB` at the first and the last of `≥ 100` rendered frames: growth `< 0.7 MB`, and report the
    frame count reached. That is the same leak rate as the 2 MB / 300 frames it replaces (2 × 100/300 = 0.67,
    rounded to `heapMB`'s 0.1 MB resolution). 300 frames at 1080p is **not** measurable on this box: round 1's own
    shots recorded `frameMs` 6 081–27 050 ms, so 300 frames is 30–135 minutes. No `Math.random`, `Date.now`,
    `performance.now` in module logic (the critic greps).
17. **Auto black point / auto white point is GPU-side and converged at capture.** The histogram or 1×1 average is
    produced by downsample passes and consumed as a sampler uniform — **no `readPixels` / `getBufferSubData` stall in
    the render path** (the existing headless 1×1 sync read stays; that one is deliberate). Adaptation is
    **instantaneous when `ctx.headless`** — `window.__sim.ready` fires after 5 frames, so anything slower makes
    screenshots non-reproducible — and reaches within 1 % of its steady value in `≤ 4` rendered frames when it is
    not. Both halves are read by `apicheck.mjs`, which samples `state().grade.blackPoint` on frames 1–8: once at
    `?showcase=effects&headless=1&time=22` (frame 1 already at the steady value) and once at the same URL with
    `headless=0`. The second URL only exists in the probe: `tools/screenshot.mjs:22` hardcodes `headless: '1'`, so no
    screenshot in this repo can capture that branch. `state().grade.blackPoint` and `.whitePoint` report the live
    values.
18. **API contract.** Every key of §2's `api` object exists with the stated type; `setEnabled(false)` yields
    `engine.composer === null` and exactly the pre-chain draw-call count, `setEnabled(true)` reinstalls;
    `setPreset('flat')` is a true bypass — grade, bloom, AO, glare, rain **and SMAA/FXAA** all off, which is what
    makes the comparison decidable: with no AA in the chain a diff against `setEnabled(false)` changes `≤ 0.5 %` of
    pixels by `> 2` with **no exclusion**. ("AA aside" was ungradable: 0.5 % of 1920×1080 is 10 368 pixels and a
    dense city frame has more geometry-edge pixels than that, so whoever argued harder won);
    `_override` accepts every key in §2, forces exactly that pass
    (an `_override({ao:0})` frame differs from the base only where AO acts) and `_override(null)` restores a
    **byte-identical** frame — the override isolation rule in §2 is itself an acceptance check;
    `setDebugView('ao'|'bloom'|'mask'|'coc'|'dehaze')` each render a visibly different, legible buffer;
    `bloomThreshold()` returns a finite scene-linear number that tracks
    `state().bloom.threshold / state().exposure`.
19. **Resize.** 1920×1080 → 1280×720 → 960×540 → 1920×1080 with no error; `state().size` follows every step; the
    1280×720 shot has the same composition and grade as 1080p (`|Δp50| ≤ 4`) and no UI/geometry crop.
20. **The stage is no longer programmer art.** In `skyline_12` and `plaza_12`: trees are `≥ 3` distinguishable
    species by silhouette built from `≥ 3` clustered cards each with normal-blended (not flat-card) shading — no
    single-quad cut-outs with hard silhouettes; `≥ 60 %` of roofs carry clutter (parapet, HVAC unit, water tank, vent
    stack) so the skyline is not flat-topped; the road cut through the hills has graded embankments, no vertical
    walls; `≥ 4` facade material families are distinguishable. At night the stage carries `≥ 3` emissive classes
    besides windows — lamp heads, shop-front signage/neon, and a red mast light on the tallest tower — so the glow has
    variety as in `$REF/cs2_8.jpg`.
21. **Lit-window emissive contract, both ends.** The staged windows emit `≥ 2.5 ×` `bloomThreshold()` in scene-linear
    units at 22:00 (round 1 emitted `0.11` against a threshold of `0.79` — a factor of 7 short), **and** the night
    threshold is low enough (`state().bloom.threshold ≤ 0.55` in exposed units at `night = 1`) that a future
    `buildings` module emitting at that documented level glows without the scene being lifted.
22. **Vignette and sharpen stay honest.** In **`street_12`** with `preset='default'`, mean luma of
    `effects.flatSurfaceCorner` is `≥ 82 %` of `effects.flatSurfaceCentre` (§4: both 100×100 on the **same**
    material, which is why they are declared rather than taken as the literal frame corner and centre).
    CAS sharpen produces no ringing: inside `effects.sharpenEdge` — 128×32 straddling one lane-marking edge, long
    axis across it — no pixel exceeds the rect's own `p95` by `> 6` luma or falls below its `p5` by `> 6`. The
    percentiles are the two plateaus: the ring occupies ~2–3 of the rect's 128 columns (≈ 2 %), so `p95` and `p5`
    sit on flat paint and flat asphalt, not in the overshoot.
23. **No banding.** In `effects.skyCrop` (§4, 200×200) of **`skyline_17p5`**, the count of distinct luma values is
    `≥ 40` and no contour band is visible at 100 % zoom (the dither is already there — keep it after the grade, not
    before). If `skyline_17p5` has no 200×200 clear-sky region, return `skyCrop` on `aerial_17p5` instead and say so
    in the build record.
24. **Degrades without `environment`.** With `environment` absent, `effects` still installs, produces a non-black
    frame (`mean ≥ 8` luma) at 12 and 22, logs no error, and falls back to
    `night = f(clock.sunElevation(clock.hour))`, `exposure = renderer.toneMappingExposure`, `fog = null → dehaze
    off`. **The probe URL, in full:** `?showcase=effects&modules=effects&headless=1&time=12`, and the same with
    `time=22`. `modules=effects` sets `wanted = ['effects']` (`src/main.js:78`) and makes `loadModuleDefs` import
    only `effects` (`src/main.js:41`), so `environment` is never registered or initialised — while `main.js` still
    stages **effects' own** showcase, because `showcaseName` resolves to `effects` from `showcase=effects` and its
    record is `ready` (`src/main.js:88-99`). Do **not** drop `showcase=effects`: without it `showcaseName` falls
    back to `democity`, whose def was never imported, and the item would be tested against an empty scene. Check
    `window.__sim.registry.apis.effects.state()`: `installed === true`, `failed === false`,
    `dehaze.strength === 0`, `glare.enabled === false`, plus `__sim.errors` empty and the two screenshots.

## 5. Budget

| Metric | Limit | How it is checked |
|---|---|---|
| Chain draw calls (chain on − chain off) | **≤ 28** | probe A/B via `setEnabled`; ARCHITECTURE §9 allots 30 |
| Whole staged frame draw calls | **≤ 64** (chain 28 + stage 36, item 15) | `drawCalls` in each shot JSON (`summary.json` carries `maxDrawCalls`); declare `budget.drawCalls = 64` |
| Triangles (staged frame) | **≤ 900 000** | `triangles` in each shot JSON (`summary.json` carries `maxTriangles`); round 1 was 814 984 — the stage upgrade must not blow this, cut forest instances if needed |
| JS per frame in `update()` | **≤ 0.5 ms** (ARCHITECTURE §9 allows 2 ms) | `stats().moduleMs.effects` |
| Textures resident (chain + staged scene) | **≤ 80** | `textures` in every shot JSON (`__sim.stats()`); round 1 read 42, and §8's stage adds ~4 facade families × 4 maps + 3 tree species — 80 is round 1 doubled |
| JS heap growth over 100 frames at 640×360 | **< 0.7 MB** | `apicheck.mjs`, `__sim.stats().heapMB` (item 16) |
| Init time | **`effects.initMs` ≤ 4000 ms**, warm asset cache | `window.__sim.registry.get('effects').initMs` (`src/core/registry.js` `initOne`), read by the apicheck probe; `window.__sim.readyAt` bounds whole-app boot. **Never `elapsedMs`** — see the note under this table |
| Passes | `RenderPass → dehaze+AO+contact (+DOF when enabled) → emissive mask → bloom → glare → OutputPass → SMAA/FXAA → grade (+rain, dither)` | `state().passes` |

**GPU texture *bytes* are not readable here** — `renderer.info.memory.textures` is a count and nothing in `tools/`
reports bytes, so the two MB budgets this table used to carry were numbers no one could check. What replaces them is
the count row above plus one policy: **1k PBR sets only, no 2k** (ARCHITECTURE §10). Report the chain's render-target
inventory in the build record.

**`elapsedMs` is not an init measurement.** It is capture wall time in `tools/screenshot.mjs` (`Date.now() - t0`
with `t0` set at line 27, *before* the browser launches), so it covers launch, `goto`, the wait for `__sim.ready`,
the fps measure window and the PNG write. Round 1's 21 shots recorded 107 081–590 943 ms under SwiftShader. Read
literally, a 4 s bar against `elapsedMs` fails in every shot this module will ever take. Report both in the build record — `initMs` against the budget, `elapsedMs` as capture cost.

**Quality scaling.** `QUALITY` (`src/core/constants.js:39-44`) gives the chain only two meaningful keys, `post` and
`pixelRatio`; its others (`shadowMap`, `cascades`, `anisotropy`, `instanceLod`) belong to `environment` and the
stage. **Do not add keys to `QUALITY`** — that file is core, outside your blast radius. Keep effects' own tier table
**inside the module** and report the resolved tier in `state().quality`, using exactly this mapping:

| tier | `QUALITY` says | effects does |
|---|---|---|
| `low` | `post: false` | no chain at all; `state().installed === false`, no error (item 14) |
| `medium` | `post: true`, `pixelRatio 1` | FXAA, AO at 0.5 scale, no DOF, no glare |
| `high` | `post: true`, `pixelRatio 1` | SMAA, AO at 0.5 scale, glare on |
| `ultra` | `post: true`, `pixelRatio 1.5` | SMAA, AO at full scale, glare on; `composer.setPixelRatio(1)` still applies (§6) |

## 6. Known failure modes

Symptoms as they appear on screen. Every one of these has already happened here.

- **Cream field at 17:30** (`shots/effects/r1/skyline_17p5.png`): the sun-side half of the frame flattens to one
  bright value and the far terrain disappears. Cause is environment's fog in-scatter at exposure ≈ 3, *not* bloom
  (bloom on/off diff was 0.00). Do not "fix" it by lowering global exposure — that re-breaks night. Fix it with the
  depth-aware dehaze in linear HDR and the auto black/white point. Environment's own round-2 report carries the same
  issue open; file/refresh `docs/core-requests/effects.md` asking for an in-scatter cap, and ship a frame that passes
  item 5 **without** that fix landing.
- **Milky blue dusk at 22:00** (`aerial_22.png`, `skyline_22.png`): facades at mid-grey-blue, lit windows as flat
  pastel rectangles, no glow anywhere. Caused by a night lift (`0.006/0.010/0.022`) plus negative gamma plus a window
  emissive far below the bloom threshold. Remove the lift; darkness is the point.
- **Crushed noon** (`street_12.png`, `plaza_12.png`): `p1 = 0`, kerb undersides and shadow sides pure black. A fixed
  black point stacked on S-contrast stacked on an AO power term. Any two of those three are already too many.
- **Cyan everything at golden hour** (`street_17p5.png`): roads, kerbs, sidewalks and roofs uniformly steel blue,
  because a split-tone shadow tint adds blue on top of the sky's already blue ambient. Weight the shadow tint by
  `1 − smoothstep(0, 0.25, luma)` only, halve it at golden hour, and desaturate shadows 10–15 % toward neutral.
- **Invisible AO that outlines leaves** (`apicheck_diff_ao.png`): the only place the diff was visible was as
  leaf-shaped halos around alpha-cut foliage cards. Contact darkening at junctions was absent.
- **DOF blob** (`lamps_12.png`): the near-field gather with `maxCoC 3.5 px` at a 42 m camera mushed a foreground tree.
- **Depth/readBuffer swap trap** (solved in round 1 — preserve it): the scene depth texture is attached to
  `composer.renderTarget2`, so the AO/DOF pass only reads valid depth while `readBuffer === renderTarget2`. The
  existing `if (composer.readBuffer !== composer.renderTarget2) composer.swapBuffers()` guard is load-bearing.
- **`composer.setSize` receives physical pixels** (ARCHITECTURE §6): `composer.setPixelRatio(1)` must stay, or the
  chain renders at pixelRatio².
- **A CPU readback in the render path** turns a 6 s SwiftShader frame into a 20 s one and makes gauntlets time out.
  Keep the auto-exposure feedback entirely on the GPU.
- **Temporal adaptation makes screenshots non-reproducible**: an exposure/black-point that eases toward its target
  over ~1 s will differ between two captures and between the critic's shot and yours. Snap it in headless.
- **Restyling around a ranked issue instead of fixing it** (BUILDER.md's rule; the effects-specific form): the
  critic re-measures the same numbers on the same shots and rects. Moving the vignette will not fix `p1 = 0`.
- **Screenshot infrastructure — the two timeouts are different.** `tools/gauntlet.mjs` passes `--timeout 240` for
  you (`tools/gauntlet.mjs:23`), but `tools/screenshot.mjs` still defaults to **90 s** (`tools/screenshot.mjs:17`).
  So on every direct `screenshot.mjs` shot — every `--crops` capture (§4), the rain shot, the 1280×720 shot, the
  `?quality=low`/`ultra` shots, the `--showcase all` shot — **pass `--timeout 240` explicitly**, or round 1's timeout failures come
  straight back (12 of 16 shots died last round). The official `tools/gauntlet.mjs --module effects --round <n>` run
  must complete this time; if shots still die, say so with the log rather than shipping a private wrapper's summary.

## 7. Dependencies and their real APIs

Declare `dependencies: ['environment']` (round 1 declared `[]`; `environment` is always initialised in showcase mode
anyway, and the declaration gets you init ordering and a warning instead of silence).

**core — `ctx.engine` (`src/core/engine.js`)**
```js
engine.setComposer({ render(dt), setSize(wPhysical, hPhysical) })  // null restores direct render
engine.onBeforeRender(fn) -> unsubscribe ; engine.onAfterRender(fn) -> unsubscribe ; engine.onResize(fn) -> unsubscribe
engine.stats  // {fps, frameMs, drawCalls, triangles, programs, textures, geometries, frames, updateMs, moduleMs}
engine.renderer, engine.scene
```
**core — `ctx.camera` (`src/core/camera.js`)**: `camera.camera` (PerspectiveCamera, fov 45), `camera.target`
(Vector3), `camera.distance`, `camera.presets`, `camera.apply(name|{position,target}|{yaw,pitch,distance,target})`,
`camera.registerPreset(name, preset)`, `camera.flyTo(preset, seconds)`, `camera.screenToGround(ndcX, ndcY)`.
Module `showcase.cameras` entries are registered automatically by `src/main.js` before `setup()` runs.

**core — `ctx.clock`**: `clock.hour`, `clock.day`, `clock.sunElevation(hour)`, `clock.sunAzimuth(hour)`,
`clock.isNight(hour)`. Use these **only** in the degradation path; prefer `world.weather`.

**core — `ctx.assets` (`src/core/assets.js`)**: `assets.texture(url, {srgb, repeat, wrap, anisotropy, flipY})`,
`assets.pbr(name, {repeat}) -> {map, normalMap, roughnessMap, aoMap, metalnessMap, displacementMap, armMap}`,
`assets.applyPbr(material, set, {normalScale, aoIntensity, displacementScale})`, `assets.hdri(name)`,
`assets.gltf(url)`, `assets.procedural.noiseTexture({size, seed, octaves, scale, lo, hi, srgb, colorA, colorB})`,
`assets.procedural.gradient({size, stops, horizontal, srgb})`, `assets.procedural.solid(hex, size)`.
Manifest names available today: `asphalt_02`, `aerial_grass_rock`, `brown_mud_leaves_01`, `rock_face`,
`aerial_beach_01`, `concrete_wall_008`, `concrete_floor_worn_001`, `gravel_floor_02`, `leafy_grass`. Every loader
resolves even on failure. Rain streaks, lens droplets and glare kernels must be **procedural**, not new downloads.
**Brick and plaster — two of item 20's four facade families — are not in that list**, so pick a route and do not
guess: either generate them from `assets.procedural.noiseTexture`/`gradient` layered over `concrete_wall_008`, or
append CC0 entries to `public/assets/manifest.json` (inside the blast radius) and run `tools/fetch-assets.mjs`.
State which route you took in the build record.

**core — `ctx.rng`**: `float()`, `range(a,b)`, `int(a,b)`, `bool(p)`, `pick(arr)`, `weighted([[v,w]…])`, `gauss()`,
`shuffle(arr)`, `fork(label)`. The only randomness source.

**`environment` — `ctx.modules.environment` (`src/modules/environment/index.js`)**

**`ctx.modules[name]` is the api object itself, not a wrapper — there is no `.api` property.**
`src/core/registry.js` `makeCtx` passes `modules: this.apis`, and `register` sets `this.apis[def.name] = def.api`.
The guarded form is therefore `ctx.modules.<name>?.<fn>?.()`, which is how every module in this repo calls it
(`ctx.modules.environment?.setupMaterial?.(S.mat)` — `src/modules/buildings/index.js:187`;
`ctx.modules.environment?.setWeather?.('rain')` — `src/modules/audio/panel.js:129`). An extra `?.api` makes every
optional-chained call return `undefined` **silently**; the worst case is `setupMaterial`, which is required below,
and the symptom is staged geometry that is unshadowed and unfogged with no error in the log.
`docs/prompts/BUILDER.md`'s "Fail soft" bullet carries the same `?.api?.` error — record that correction as a
role-file change in `docs/core-requests/effects.md`; do **not** edit `BUILDER.md` yourself.

```js
setWeather('clear'|'partly'|'cloudy'|'rain'|'fog' | {cloudiness, rain, fogDensity, wind}) // showcase staging only
getWeather() -> string ; presets: string[]
getSunDirection() -> Vector3 (clone) ; getMoonDirection() ; getLightDirection()
getExposure() -> number ; getNight() -> 0..1
setupMaterial(material)   // register a custom ShaderMaterial for CSM + fog uniforms — REQUIRED for every
                          // ShaderMaterial you stage, or it renders unshadowed and unfogged
hookScene()               // re-scan the scene for materials added after init
refreshEnvironment()      // force the sky LUT + PMREM + weather rebuild on the next frame
_debug() -> {S, U}        // read-only; S.fogCol, S.exposure, S.night if you need them beyond world.weather
```
Always call through `?.` — `environment` may be `failed`, and under the item-24 probe it is absent entirely.

**Degradation when `environment` is missing** (acceptance item 24): `world.weather` still exists with `world.js`
defaults (`src/core/world.js:84-88` — `cloudiness`, `rain`, `wind`, `fogDensity`, `temperature`, `sunDir`,
`sunIntensity`, `skyLight`, `wetness`), but `night`, `exposure`, `lightDir`, `moonDir`, `sunColor`,
`lightIntensity`, `preset` and `moonPhase` are **not** present, and `scene.fog` is `null`. Fall back to
`night = clamp(-clock.sunElevation(clock.hour) * 4, 0, 1)`, `exposure = renderer.toneMappingExposure`,
`sunDir = world.weather.sunDir`, dehaze disabled, glare disabled. Never throw, never blank the frame.

**No other module is reachable.** Under `?showcase=effects` only `environment` and `effects` are imported and
initialised (`loadModuleDefs` builds `['environment', showcase]`, `src/main.js:41`; `selectModules` picks the same
pair), so `terrain`, `roads`, `buildings`, `props` and `traffic` have no api to guard against — **the stage is
entirely yours to build.**

## 8. Showcase

`showcase.description`: one line naming the chain and the stage. `showcase.setup(ctx)` stages **only** effects'
own scene — no other module's showcase is available.

**The staged scene must contain**, all instanced or merged, everything read at 1 m units:

- A rotated downtown grid: `≥ 6` towers 40–120 m with setbacks, `≥ 10` mid-rise blocks 12–30 m, `≥ 12` low-rise, and
  a plaza. Roof clutter on `≥ 60 %` of roofs (parapet, HVAC box, water tank, vent stack, one mast light).
  `≥ 4` distinguishable facade families (glass curtain wall, concrete, brick, plaster) using the manifest PBR sets.
- Asphalt streets and avenues with lane markings, crosswalks, kerbs and concrete sidewalks — the AO, sharpen and wet
  passes are all judged on these edges.
- Street lamps at 24–32 m spacing with emissive heads and additive ground pools (round 1's are the right idea —
  keep them), plus shop-front signage and one neon panel for night emissive variety.
- Vegetation: `≥ 3` tree species by silhouette, `≥ 3` clustered cards each with normal-blended shading, plus a
  forest belt on the hills. Total triangles must stay under item 15's cap.
- Terrain: a plateau, wooded hills and a road corridor with **graded** embankments (no vertical cut walls), and a
  distant ridge 2–4 km out so the dehaze (item 6) has something to be measured on.
- Depth range in every preset: something within 15 m of the camera and something beyond 2 km, so AO, DOF, dehaze and
  glare are all exercisable in one frame.

**Cameras it must declare** (`showcase.cameras`, registered by `main.js` automatically):

| preset | purpose | shape |
|---|---|---|
| `plaza` | tower canyon; AO at junctions, night window glow | `{ yaw: 2.6, pitch: 0.28, distance: 150, target: [-30, 10, -30] }` |
| `lamps` | street-level lamps and wet road; the DOF regression frame | `{ yaw: 1.05, pitch: 0.12, distance: 42, target: [30, 2, 46] }` |
| `glare` | sun in frame at low elevation — item 13 | low pitch (`≤ 0.14`) with yaw aimed at the 17.5 sun azimuth, `distance 220–400`, a tower edge in frame to occlude part of the disc |
| `photo` | the only frame where DOF is on — item 11 | `distance 25–35`, a foreground object at 8–15 m and the skyline behind |

**How it must read across the matrix** (`aerial 520 m`, `street 60 m`, `skyline 900 m`, `closeup 110 m`):

- **06.5 (golden hour)** — warm low sun, long shadows, shaded asphalt neutral-warm grey (item 8), far ridge hazed but
  resolvable (item 6), sky graded without banding (item 23). Round 1's `aerial_6p5`/`skyline_6p5` were the best
  frames of the set; that palette is the target for the rest.
- **12 (noon)** — high contrast without crushing: `p1 ≥ 6`, visible contact AO at every building base, kerb and tree
  trunk, crisp markings from CAS+SMAA, no bloom anywhere (item 3), no DOF (item 11).
- **17.5 (golden hour, sun toward camera)** — the failure frame of round 1. `skyline_17p5` and `aerial_17p5` must
  satisfy item 5's half-frame balance and item 6's distant contrast; `glare_17p5` shows item 13.
- **22 (night)** — dark facades, bright warm windows with tight halos, lamp pools on the road, blue sky with stars,
  a soft glow above the skyline (items 1–4). `lamps_22` and `plaza_22` are the close-range proof.

Also required in the round's shot set — each of these is a direct `tools/screenshot.mjs` call, so **pass
`--timeout 240` on every one** (§6): `--camera glare --time 17.5` (item 13 — the 25th shot of §4's matrix, and the
one a builder who shot only this list used to miss), `--weather rain --time 22 --camera street` (item 12),
`--w 1280 --h 720` at `street 12` (item 19), `--showcase all --camera aerial --time 12` (item 14), `?quality=low`
and `?quality=ultra` at `street 12` (items 14, 15), and the two degradation shots at
`?showcase=effects&modules=effects&headless=1&time=12` and `&time=22` (item 24). **Add `--crops` to every shot an
item pins a statistic on** (§4) — `gauntlet.mjs` does not pass it.

**Also part of the deliverable, not optional:** `api.cropRects` (§2) with the landmarks of §4, the
`<shot>.crops.json` files that `screenshot.mjs --crops` writes from it, and `shots/effects/r<n>/apicheck.mjs` (the
A/B probe that drives `_override`, `setEnabled` and `setDebugView`, reaching the api at
`window.__sim.registry.apis.effects`). A shot without its `crops.json` cannot be graded on items 1, 3, 4, 6, 7, 8,
9, 10, 11, 12, 22 or 23, and those items fail by default. Do not write a `crops.json` by hand or from the probe:
`tools/screenshot.mjs --crops` is the only producer (ARCHITECTURE §8).
