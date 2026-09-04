# Critic report — environment, round 1

**Score: 6.0 / 10 — FAIL**

Verdict in one line: a physically plausible sky and correct shadow plumbing bolted onto a showcase whose exposure, haze and ground make every daytime frame either washed-out (noon) or sepia-dark (golden hour), with one real contract bug (`world.weather.skyLight` is garbage) and a glaring tiling lattice on the ground. Competent-but-obviously-synthetic is a 6 on the CS2-LOOK scale; it is not "AAA with nits".

Pass criteria: score >= 8.5 (no), zero console errors (yes), status `ready` in every shot (yes), draw calls <= budget 15 (yes, 10; 11 with rain), API contract OK (no). Hard-fail triggers hit: **obvious tiling repetition** (showcase ground, every aerial/skyline frame), **washed-out frames** (all noon frames), **over-dark / monochrome frames** (sunset_17p9, sunrise_6p2, aerial_6p5, aerial_17p5).

I took every screenshot myself (`tools/gauntlet.mjs --module environment --round 1`, plus the module's four presets, weather variants and a 720p frame), read all 28 frames, measured them with a canvas stats script (`shots/environment/r1/imgstats.mjs`), and ran a Playwright probe (`shots/environment/r1/apicheck.mjs`, output in `apicheck.out.json`). The 8 CS2 references were read first; note they show a full city, so the comparison here is on light, sky, haze, shadow and exposure only — the towers/spheres are a test rig, not scored as buildings.

## Numbers

| | |
|---|---|
| Shots | 16 gauntlet + 8 presets + 3 weather + 1 720p = 28, all `ok`, environment `ready` in all |
| Console errors | 0 (all shots + probe) |
| Warnings | only core's `RGBELoader has been deprecated` (not this module) |
| Draw calls | 10 (11 with rain); budget 15 |
| Triangles | 111,554 (129,554 with rain); budget 60,000 declared — **over its own declared triangle budget** (see issue 12) |
| fps | SwiftShader ~13 (relative only) |
| Module init | 142–172 ms; update 0.3–0.4 ms |
| `git status --porcelain` | clean; the WIP commit touched only `src/modules/*`, `public/assets`, `docs/core-requests`, `docs/builds`, `shots` — scope OK |
| `Math.random` in module | none |

Frame statistics (480px downscale, 0–255 luminance; p1/p50/p99 percentiles, sat = mean HSV saturation):

| frame | mean | std | p1 | p50 | p99 | sat | read |
|---|---|---|---|---|---|---|---|
| aerial_6p5 | 51 | 14 | 25 | 51 | 105 | 0.61 | dark, muddy, nothing above 41% |
| aerial_12 | 128 | 17.5 | 49 | 131 | 156 | 0.34 | washed: no blacks, tiny contrast |
| aerial_17p5 | 55 | 19 | 23 | 56 | 96 | 0.56 | dark muddy olive |
| aerial_22 | 27 | 13 | 13 | 25 | 97 | 0.48 | ok night level |
| street_12 | 123 | 36 | 44 | 127 | 203 | 0.28 | flat, lifted blacks |
| skyline_12 | 150 | 28 | 51 | 150 | 196 | 0.19 | veil, desaturated |
| sunset_17p9 | 57 | 57 | 6 | 26 | 207 | 0.63 | sepia monochrome, half the frame < 10% |
| sunrise_6p2 | 80 | 68 | 12 | 43 | 224 | 0.55 | sepia monochrome |
| skyline_12_fog | 159 | 14 | 128 | 160 | 195 | 0.05 | total white-out, zero colour |
| moonrise_22 | 51 | 47 | 4 | 33 | 207 | 0.25 | 11.5% pure black pixels |

## Per-shot notes

- `shots/environment/r1/aerial_6p5.png` → long soft shadows correct; whole frame a muddy olive-brown, no warmth on the ground; the 13 m grass tile repeats as a visible lattice across the plane.
- `aerial_12.png` → milky veil, shadows pale grey, ground a uniform khaki with a visible tile checker; nothing in frame darker than 49/255.
- `aerial_17p5.png` → very long shadows OK; scene reads as swamp brown, tower tops grey; lattice visible.
- `aerial_22.png` → per-window warm/cool lights are the best thing in the module; moon shadows present; ground reads olive-green instead of CS2's blue-black night.
- `street_6p5.png` → sky is decent (cumulus with shaded undersides, cirrus); sphere ladder (chrome/copper/dielectrics) and contact shadows correct; ground dark and dull for golden hour; hard flat horizon line.
- `street_12.png` → crisp contact shadows, but lit vs shadowed facades are nearly the same tone; stratus band at the horizon smeared; frame flat and desaturated.
- `street_17p5.png` → warm low sun and long shadows, but the grass turns into a glossy sheet with corduroy streaks at grazing light; sky a pale grey-yellow.
- `street_22.png` → stars, thin clouds, deep blue-grey sky, moonlit ground, lit windows: coherent night. Windows saturate to flat white squares (no bloom is effects' job, but emissive level clips at exposure 3.0).
- `skyline_6p5.png` → best sky of the set (blue between clouds, haze at the horizon) sitting on a ground that is obviously a repeated tile lattice; cloud sheet stretches to the horizon as a 2D layer.
- `skyline_12.png` → veil, low contrast, pale khaki ground with checker.
- `skyline_17p5.png` → the module's best frame: warm haze, sun aureole, long shadows, moon visible; ruined by the dot lattice on the ground and a wet-looking sheen.
- `skyline_22.png` → night skyline coherent; stars are uniform 5–6 px soft blobs; far ground becomes a bright grey band (night fog colour too light).
- `closeup_6p5.png` → warm tone on facades, soft shadow edges, mud-like ground mottling; dark.
- `closeup_12.png` → ambient dominates, shadows pale, window glass a flat grey; washed.
- `closeup_17p5.png` → corduroy specular streaking on the grass; otherwise fine shadows.
- `closeup_22.png` → strongest gauntlet frame: window lights, moon highlights on spheres, contact shadows.
- `sunset_12.png` (preset at noon) → same flat noon; near tower shows window reveals cleanly; cloud sheet smears toward the horizon.
- `sky_12.png` → the "sky" preset frames mostly ground; radial moiré streaks fan out from the horizon on the ground (tile lattice at grazing angle).
- `sunrise_12.png`, `moonrise_12.png` → same flat noon; reveals and window grid read fine close up.
- `sky_22.png`, `moonrise_22.png` → night presets: OK sky, big soft stars, moon shadows; far facades shimmer (window grid aliasing, no AA — effects), 11.5% of moonrise_22 is pure black.
- `sunset_17p9.png` → sun on the horizon, sepia monochrome: sky, clouds, towers, ground all one orange-brown hue; ground a shiny dark mass; lattice visible in the distance.
- `sunrise_6p2.png` → same sepia wash; small pale sun disc; lattice glaring.
- `street_12_rain.png` → overcast look and sparse thin streaks are visible (weather changes the look: yes); streaks are barely readable at 1080p; ground shows no wet response yet.
- `skyline_12_fog.png` → white-out is dense as expected, but a hard mid-grey horizon band with crisp clouds above it does not match the fogged ground: a seam across the entire frame.
- `aerial_12_fog.png` → uniform grey veil; the tile lattice still shows through.
- `aerial_12_720p.png` → identical look at 720p (stats match 1080p to the decimal); no resolution-dependent bugs.

## API contract check

Probe: `shots/environment/r1/apicheck.mjs` → `apicheck.out.json` (headless, `?showcase=environment&headless=1&time=12`, then `setTime()` steps, `?weather=rain|fog` boots, two identical boots for determinism).

| check | result |
|---|---|
| `world.weather.sunDir` changes with time | **OK** — 06:30 (0.98, 0.15, 0.13) east, 12:00 (0, 0.90, 0.43) south-overhead, 17:30 (−0.98, 0.15, 0.13) west; sunIntensity 5.14 at noon, 3.39 at 06:30/17:30, 0 at night; `lightDir` switches to the moon at night (intensity ~0.15) |
| lights only from this module | **OK** — the only lights in the scene are three `DirectionalLight` "sun-cascade" under `module:environment`; no other module adds any |
| CSM shadows visible | **OK** — 3 cascades × 2048 with shadow maps allocated, `castShadow` true, all 3 lit materials carry `USE_CSM`; shadows are visible in every daytime frame |
| `?weather=rain` / `?weather=fog` change the look | **OK** — boot with `weather=rain`: preset rain, rain 0.85, cloud 0.96, fog 0.0011, rain mesh visible, 11 draws; `weather=fog`: fogDensity 0.008 → scene.fog 0.008, sun cut to 0.26; `setWeather` emits `weather:changed`; unknown preset falls back to partly; partial objects clamp |
| noon crisp, not washed out | **FAIL** — aerial_12 p1 = 49, std = 17.5; skyline_12 sat 0.19; lit/shadow facade tones near-identical (issue 2) |
| no NaNs in exposure | **OK** — exposure 1.25 (day) → 1.39 (golden) → 2.64 (twilight) → 3.0 (night); all published values finite at 0, 3, 5.9, 6.5, 12, 17.5, 18.1, 19, 22 |
| `world.weather.skyLight` published each frame | **FAIL** — value is (1e-5, 1e-5, 2e-5) at noon and (0.0034, 0.0044, 0.0086) at midnight: night is brighter than day, and `scene.fog.color` at noon is `#0d0b0c`. Root cause is in `src/modules/environment/atmosphere.js` (issue 1) |
| determinism | **OK** — two boots at 06:30 publish byte-identical sunDir / sunIntensity / exposure |
| Math.random | none |

apiContractOk = **false** (two of the listed items fail).

## Ranked issues

1. **[blocker] CPU sky-sample port is broken by scratch-buffer aliasing → `world.weather.skyLight`, `fog.color`, cloud ambient are garbage.**
   `atmosphere.js` `skyRadiance()` (line 135) calls `opticalDepth(_q, L, 5, _odL)` with its own scratch vector `_q` as the point; `opticalDepth` (line 103) does `_q.copy(p).addScaledVector(...)` with `p === _q`, so the sample point walks off along the light ray each iteration, and line 104 overwrites the shared `_d` density; lines 137–140 then integrate with the clobbered `_d`. Result: zenith/horizon/mid samples ≈ 1e-5 by day, only the hard-coded night floor survives. Consumers: `skyLight` (published contract field; rain colour = skyLight×2.2+0.02 → near-black streaks), `fogCol` (masked only because the fog chunk overrides it with the LUT at weight 1.0), `uCloudAmb` (cloud undersides get ~no ambient by day). Fix: give `opticalDepth` its own `_q2`/`_d2` scratch, or pass copies; add a unit check that noon zenith radiance > night floor. Evidence: `shots/environment/r1/apicheck.out.json` (`hours.12.skyLight` vs `hours.0.skyLight`, `rendererState.fog.color`).

2. **[blocker] Noon is washed out and flat.** Every 12:00 frame has p1 ≥ 43/255 and std 17–36; shadowed ground is only ~30% darker than lit ground; saturation 0.19–0.34 vs the CS2 references' deep cool shadows and saturated grass. Causes: partly-preset `fogDensity 0.00034` gives ~16% haze at 520 m and ~26% at 900 m (a clear day should be ≤ 0.0001 at those ranges); `environmentIntensity 0.8` from a PMREM of the whole LUT plus sun 5.14 at exposure 1.25 puts ambient too close to direct; the showcase ground albedo (`envTint * 1.35`, tint up to 0.78) is far above real grass. Fix: clear/partly fog 0.00008–0.00012 (keep 0.0006+ for cloudy/rain/fog), environmentIntensity ~0.45 at noon (ramp up at dusk), ground albedo ≤ 0.35, target lit:shadow ≈ 3:1 on the ground at noon. Evidence: `aerial_12.png`, `street_12.png`, `skyline_12.png`, `closeup_12.png`.

3. **[blocker] Showcase ground tiles visibly (regular lattice) in every aerial/skyline frame.** `aerial_grass_rock` repeats every 13 m over an 8 km plane; the anti-tiling in `showcase.js` (`mix(envT1, envT2, 0.3)` at 0.23 scale, macro tint at a 2.2 km period) does not break a 13 m lattice. At grazing angles it becomes radial moiré streaks (`sky_12.png`). CS2-LOOK explicitly lists 1 m and 20 m colour variation, dirt patches and worn paths. Fix: per-cell random rotation/offset texture bombing (hex or 2-tap stochastic), 30–200 m macro noise, drop the 1.35 multiplier, and add a second detail texture (dirt) blended by noise. Evidence: `skyline_6p5.png`, `skyline_17p5.png`, `aerial_12.png`, `sunrise_6p2.png`.

4. **[major] Golden hour and sunset are sepia monochrome and under-exposed.** `sunset_17p9`: p50 26, half the frame < 10% luminance, single hue; `aerial_6p5`/`aerial_17p5`: p99 ≈ 100 with the sun 8° up. CS2 golden hour (cs2_4) keeps blue in the shadows and bright warm lit surfaces. The exposure curve only adds +0.25 at low sun, while transmittance at 8° is Mie-orange and the PMREM ambient is the same orange, so shadows go brown, not blue. Fix: exposure ≈ 1.9–2.2 when sun elevation < 12°; keep the skylight/ambient blue (fixing issue 1 feeds real zenith light to `skyLight`); consider a separate hemisphere term or PMREM sampled from a sun-masked LUT so shadows stay cool. Evidence: `sunset_17p9.png`, `sunrise_6p2.png`, `aerial_6p5.png`, `aerial_17p5.png`.

5. **[major] Cloud layer reads as a flat 2D noise sheet.** One shell at 1500 m with a single lit/occluded factor; no vertical extent, no per-cloud lighting gradient, a stratus band that smears toward the horizon, and clouds stay crisp above a total fog white-out (`skyline_12_fog`). The quality bar asks for "volumetric-looking, at least layered noise". Fix: 4–8 step raymarch through a 300–600 m thick slab (or two offset shells with height-based darkening), Beer-Powder lighting, and fade clouds by the same height-fog transmittance used for terrain. Evidence: `skyline_6p5.png`, `street_12.png`, `skyline_12_fog.png`.

6. **[major] Fog preset shows a hard horizon seam between the dome and the fogged ground.** The ground's fog colour is the LUT sampled in the view direction, but the dome draws clouds/haze on top of the LUT and gets no in-scatter fog, so a mid-grey band with crisp clouds sits above a light-grey ground plane. Fix: apply the same `envFog` in-scatter/extinction to the dome below ~5° elevation (density-scaled), or blend the dome toward the fog colour with `1-exp(-fogDensity*k)`. Evidence: `skyline_12_fog.png`.

7. **[major] Grass turns glossy at grazing sun (wet/corduroy sheen).** `street_17p5`, `closeup_17p5`, `sunset_17p9`: bright specular streaks on dry grass with wetness 0. `normalScale 1.5` plus the ARM roughness at grazing GGX angles produces a sheen no grass has. Fix: floor roughness at ~0.85 for the grass layer when dry, normalScale ≤ 0.8, or a Fresnel horizon fade on the ground. Evidence: `street_17p5.png`, `sunset_17p9.png`.

8. **[minor] Night ground tint is olive-green; CS2 night is desaturated blue-grey.** Moon tint is blue but exposure 3.0 on the green albedo dominates. Fix: desaturate diffuse by `night` (~0.5), lower night exposure to ~2.2, cooler `MOON_TINT`. Evidence: `aerial_22.png`, `skyline_22.png`.

9. **[minor] Stars are uniform 5–6 px soft blobs; the milky way is invisible.** Reads like snow. Fix: radius ≤ 1.5 px at 1080p, size and brightness from magnitude, more magnitude variance; boost the band to be faintly visible. Evidence: `skyline_22.png`, `sky_22.png`.

10. **[minor] Window emissive clips to flat white at night; far facades shimmer.** `uWinNight = night*0.55` at exposure 3.0 saturates AgX; the 3 m window grid aliases on distant towers (no AA in this showcase). Fix: emissive ~0.25 with warm/cool tints preserved, and fade the window grid by mip level / distance. Evidence: `moonrise_22.png`, `closeup_22.png`.

11. **[minor] Rain is barely visible and its colour depends on the broken `skyLight`.** 9000 thin streaks over a 140 m box at 1080p read as a few grey scratches; `uColor = skyLight*2.2 + 0.02` (rain.js) is ~0.02 grey while issue 1 stands. Fix: wider/longer streaks with distance-based width, 2–3× count near camera, colour from the LUT zenith. Evidence: `street_12_rain.png`.

12. **[minor] Triangle count exceeds the module's own declared budget.** `budget.triangles: 60000`, measured 111,554 (129,554 with rain): `SphereGeometry(3.2, 48, 32)` × 9 instances and the 48×32 dome. Fix: 32×16 spheres, 32×16 dome, or raise the declared budget honestly.

13. **[minor] `Lighting.sweep()` traverses the whole scene every frame** (lighting.js 52–57). Fine for 40 objects; in democity with thousands of instanced chunks it will eat the 2 ms per-module budget. Fix: hook materials on `*:changed` events / `module:ready`, keep the per-frame path free of traversal.

14. **[minor] Every night is a full moon.** `moonDir = sun + 12.35 h` so the moon is always opposite the sun and visible by day (`skyline_17p5`). Fix: offset the moon by a day-of-month phase; not a visual bug per se.

## Strengths to preserve

- Physically based single-scattering sky LUT (Rayleigh/Mie/ozone) with the PMREM environment built from it: sky colour, sun aureole and the horizon haze at 17:30 are right, and IBL reflections on the sphere ladder match the sky.
- Correct sun path (east 06:00 → south 12:00 → west 18:00) computed locally and published; the core `sunAzimuth` bug is documented in `docs/core-requests/environment.md` instead of being worked around silently.
- CSM (3 × 2048, PCF, fade, camera-distance-adaptive `maxFar`) with soft, correctly placed contact shadows under spheres and towers at all times; the sun→moon switch at night keeps shadows.
- Per-window random warm/cool night lighting on the showcase towers, with reveals — the night frames are the most CS2-like thing here.
- Weather system: five presets, `?weather=` honoured at boot, `setWeather` with clamping and `weather:changed` events, wetness dynamics, cloud shadows projected along the sun, GPU-only rain (one draw).
- Engineering hygiene: only this module adds lights or touches renderer state; 10 draws vs a 15 budget; 0.3 ms update; zero errors and zero NaNs across the full clock; deterministic; all randomness through `ctx.rng`; CC0 assets recorded in the manifest.
