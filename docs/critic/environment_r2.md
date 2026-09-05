# Critic report — environment, round 2

**Score: 7.0 / 10 — FAIL** (pass needs ≥ 8.5)

Verdict in one line: every round-1 blocker is genuinely fixed (skyLight contract, ground lattice, noon veil, sepia sunset, fog seam, grass sheen) and the module now produces a coherent, physically plausible day/night cycle with a working weather system — but it stops at "good indie": 17:30 frames are milky and blown toward the sun, noon is dull rather than punchy, clouds are still a soft 2D sheet, the night sky is grey instead of navy, and a new per-pixel "TV static" artefact sits inside every mid-distance window at night. Against CS2 at the same zoom/time an expert sees the difference in the first second, so 7.0, not 8.5.

Pass criteria: score ≥ 8.5 (**no**), zero console errors (yes: 0 across 31 frames + probe), status `ready` in every shot (yes), max draw calls ≤ declared 15 (yes: 10, 11 with rain), API contract OK (**yes**). No hard-fail trigger is hit in the final frame set (no black/empty frames after re-shoots, no z-fighting, nothing floating/sunk, no lattice, no fully washed or crushed frame — skyline_17p5 comes closest, see issue 1).

I took every screenshot myself: `node tools/gauntlet.mjs --module environment --round 2` (16 frames), the module's four presets at 12:00 and the two night presets at 22:00, sunset 17.9 / sunrise 6.2, rain / fog / cloudy variants, and a 720p frame. Four captures (street_17p5, street_22, skyline_17p5, sunrise_12) came back as the SIMBUILD boot overlay or a destroyed page context because other builders' file saves triggered Vite full reloads mid-capture (terrain files were modified in the working tree during my run); I re-shot them and regenerated `shots/environment/r2/summary.json` from the per-shot JSONs. Frame statistics: `shots/environment/r2/imgstats.mjs` → `imgstats.txt`. API probe: `shots/environment/r2/apicheck.mjs` → `apicheck.out.json`. Crops: `crop_*.png`. The 8 CS2 references were read first; they show a full city, so the comparison is on light, sky, haze, shadow, exposure and weather — the boxes/spheres are a test rig and are not scored as buildings.

## Numbers

| | |
|---|---|
| Shots | 16 gauntlet + 6 presets + 2 sun-on-horizon + 3 weather + 1 720p = 28 valid frames (31 captures, 3 re-shot, 1 preset re-shot) |
| Console errors | 0 (all frames + probe); warnings 0 |
| Module status | `ready` in every frame; init 142–172 ms; update 0.1 ms |
| Draw calls | 10 (11 with rain); budget 15 |
| Triangles | 41,826 (59,826 with rain); declared budget 60,000 — inside, but rain leaves 174 triangles of headroom |
| fps | SwiftShader 12.7–13.5 (relative only; several frames report 0 because the measure window got no frame) |
| `git status --porcelain` | environment builder's files were all committed in `984e434` touching only `src/modules/environment/*`, `docs/builds/environment_r2.json`, `docs/core-requests/environment.md`, `shots/` — scope OK. Uncommitted `src/modules/terrain/{material,mesh}.js` belong to the terrain builder |
| `Math.random` in module | none |

Frame statistics (480 px downscale, 0–255 luminance, p1/p50/p99 percentiles, sat = mean HSV saturation):

| frame | mean | std | p1 | p50 | p99 | sat | read |
|---|---|---|---|---|---|---|---|
| aerial_6p5 | 71 | 18 | 39 | 71 | 148 | 0.38 | balanced, long shadows, warmth only on tower tops |
| aerial_12 | 79 | 17 | 27 | 75 | 118 | 0.42 | crisp but dull: nothing brighter than 118 |
| aerial_17p5 | 73 | 21 | 37 | 76 | 119 | 0.37 | lowish contrast, olive |
| aerial_22 | 43 | 15 | 28 | 39 | 117 | 0.32 | good night level |
| closeup_12 | 84 | 27 | 27 | 81 | 176 | 0.35 | crisp |
| closeup_17p5 | 88 | 36 | 39 | 83 | 208 | 0.29 | milky, sky top grey-white |
| skyline_12 | 113 | 43 | 28 | 105 | 182 | 0.24 | good |
| skyline_17p5 | 151 | 60 | 47 | 152 | 247 | 0.20 | half the frame cream; aureole + haze wash |
| skyline_22 | 71 | 30 | 28 | 55 | 117 | 0.29 | sky grey-blue, too bright for 22:00 |
| sunset_17p9 | 91 | 66 | 20 | 57 | 225 | 0.36 | bright warm sky, readable cool shadows — big r1 fix |
| sunrise_6p2 | 112 | 67 | 37 | 81 | 239 | 0.31 | same, slightly more veiled |
| skyline_12_fog | 151 | 19 | 109 | 158 | 177 | 0.08 | dense fog, no seam |
| skyline_12_cloudy | 115 | 38 | 45 | 99 | 172 | 0.18 | flat grey sky, structureless |
| aerial_12_720p | 79 | 17 | 30 | 75 | 118 | 0.42 | identical look at 720p |

## Per-shot notes

- `shots/environment/r2/aerial_6p5.png` → long soft shadows, hex-tiled ground with lush/dry patches and dirt smudges, no lattice anywhere; lit ground stays neutral green (golden warmth only on the concrete tops); no sky in frame.
- `aerial_12.png` → crisp short shadows, cloud shadows as large soft blotches on the ground; frame is dull — lit concrete tops are mid-grey (118), nothing bright.
- `aerial_17p5.png` → very long shadows, warm-beige facades, but a grey veil flattens the lit ground; still clearly better than r1's swamp brown.
- `aerial_22.png` → blue-grey desaturated night ground (fixed from olive), per-window warm/cool lights, faint moon shadows; ground is a featureless dark field.
- `street_6p5.png` → decent sky (cumulus sheet with blue gaps, cirrus, warm horizon haze), correct sphere ladder and contact shadows; ground is green felt with brown smudges; razor-flat horizon.
- `street_12.png` → best day frame: blue sky, soft cloud sheet, crisp shadows, saturated grass; clouds still read as a flat layer.
- `street_17p5.png` (re-shot) → warm sun from the right, readable shadows; sky top grey-white instead of blue; foreground ground shows a pale grey veil toward the sun.
- `street_22.png` (re-shot) → coherent night: stars, thin cloud, lit windows, moon highlights on the spheres; mid-distance towers show per-pixel static inside the windows.
- `skyline_6p5.png` → good sky, but the cloud sheet smears to the horizon as one 2D layer; ground plane meets the sky in a hard line; no far haze band.
- `skyline_12.png` → clean blue sky with cirrus + cumulus; ground cloud shadows readable; sterile but correct.
- `skyline_17p5.png` (re-shot) → the weakest frame: huge sun aureole plus fog in-scatter turn the right half of the frame cream (p50 152, p99 247); ground toward the sun is beige; moon visible as a dot; the left third with blue sky is fine.
- `skyline_22.png` → night sky is a mid grey-blue rather than navy; stars are sparse 2–3 px squares; far ground brightens to a grey band; windows read well.
- `closeup_6p5.png` → warm light on facades, long readable shadows, soft sky; ground reads as felt.
- `closeup_12.png` → crisp; deep but readable shadows; contact shadows under the spheres; ground felt with 1–2 m brown smudges (`crop_closeup12_ground.png`).
- `closeup_17p5.png` → milky: the whole frame sits under a grey-cream veil, sky top nearly white; lit surfaces beige.
- `closeup_22.png` → strongest night frame: window lights, moon specular, contact shadows; but the two right-hand towers show the window static (`crop_closeup22_windows.png`).
- `sunset_12.png` → preset at noon: blue sky, cumulus sheet, hard near-black shadow under the front block (p1 17).
- `sky_12.png`, `sky_22.png` → preset still frames mostly ground (core `minPitch` blocks looking up); the sky band shows the same cloud sheet; night version has the greyish sky and the window static on every mid tower.
- `sunrise_12.png` (re-shot), `moonrise_12.png` → same noon look at tower-level; window reveals and glass read fine close up.
- `moonrise_22.png` → no moon anywhere in the frame (moon is high at 22:00 on day 1); window static on every mid-distance tower; ground very dark.
- `sunset_17p9.png` → the r1 sepia is gone: bright pink-cream sky with sun disc, orange-lit facades, green-blue shadows; sky is mauve to the top instead of fading to blue; sunlit grass turns into an ochre "sand" texture.
- `sunrise_6p2.png` → same, a little more veiled; large horizon glare.
- `street_12_rain.png` → overcast look, rain now clearly reads — too clearly: 40–60 px white dashes, uniform; no visible wet response on the ground yet (wetness 0.065 at capture).
- `skyline_12_fog.png` → the r1 horizon seam is gone; fog is continuous from ground to dome; sky above stays a little too crisp for 6e-3 fog.
- `skyline_12_cloudy.png` → flat grey sky gradient with faint wisps, no cloud structure; shadows still fairly crisp under 0.74 cloudiness.
- `aerial_12_720p.png` → identical statistics to 1080p (79/17/30/75/118); no resolution-dependent bugs.

## API contract check

Probe: `shots/environment/r2/apicheck.mjs` → `apicheck.out.json` (headless `?showcase=environment&time=12`, then `setTime()` steps with 14 settle frames, `?weather=rain|fog` boots, two identical boots for determinism).

| check | result |
|---|---|
| `world.weather.sunDir` changes with time | **OK** — 06:30 (0.98, 0.15, 0.13) east, 12:00 (0, 0.90, 0.43) south-overhead, 17:30 (−0.98, 0.15, 0.13) west, 22:00 below horizon; `lightDir` switches to the moon at night (intensity 0.46–0.51); `moonPhase` published (0 = full on day 1) |
| lights only from this module | **OK** — the only lights in the scene are 3 `DirectionalLight` "sun-cascade" under `module:environment` |
| CSM shadows visible | **OK** — 3 cascades × 2048 with maps allocated; all 3 lit materials carry `USE_CSM` + the `env2` cache key; shadows visible in every day and night frame |
| `?weather=rain` / `?weather=fog` change the look | **OK** — boot rain: preset rain, rain 0.85, cloud 0.96, fog 6.5e-4, rain mesh visible, 11 draws, overcast frame; boot fog: 6e-3 → `scene.fog.density` 6e-3, sun cut to 0.51, white-out frame; `setWeather` emits `weather:changed`, unknown preset → partly, partial objects clamp (cloud 1, rain 0, fog 0) |
| noon crisp, not washed out | **OK** — aerial_12 p1 27 / sat 0.42 (r1: 49 / 0.34); lit:shadow ≈ 2:1 on the ground; caveat: dull rather than washed (issue 5) |
| no NaNs in exposure | **OK** — exposure 1.15 (noon) → 2.97 (06:30/17:30) → 3.02 (twilight) → 2.8 (night); every published value finite at 0, 3, 5.9, 6.5, 12, 17.5, 18.1, 19, 22, 24 |
| `world.weather.skyLight` (r1 blocker) | **OK** — (0.095, 0.161, 0.288) at noon, (0.011, 0.019, 0.044) at night; `fog.color` `8fa8b1` at noon, `c1b390` at golden hour, `373e4b` at night |
| determinism | **OK** — two boots at 06:30 publish byte-identical sunDir / sunIntensity / exposure / skyLight |
| Math.random | none |

apiContractOk = **true**.

## Ranked issues

1. **[major] 17:30 frames are milky and blown toward the sun.** `skyline_17p5`: mean 151, p50 152, p99 247 — the entire half of the frame facing the sun is cream; `closeup_17p5` / `street_17p5` sit under a grey-cream veil with a white sky top. Causes: exposure 2.97 at 8.5° sun (`dayExp = lerp(2.0,1.15,highSun) + lowSun*1.7`) stacked with the golden-hour punch ×1.45, the dome aureole (`pow(mu,300)*0.14 + pow(mu,80)*0.035`) and the fog in-scatter (`fogSunCol = 0.32*sunIntensity`, `pow(mu,8)*0.3 + mu²*0.08`), all of which scale with the same boosted intensity. CS2 late afternoon (cs2_4) is punchy: warm lit faces, blue sky, dark readable shadows. Fix: cap exposure ≈ 2.2 at 8°, divide the in-scatter and aureole terms by the exposure boost so they don't double-count, keep the zenith blue (the twilight floor should be strongest at the zenith, and the Mie term should fall off for view elevations > 30°). Evidence: `shots/environment/r2/skyline_17p5.png`, `closeup_17p5.png`, `street_17p5.png`.

2. **[major] Per-pixel "TV static" inside every mid-distance window at night.** Lit and unlit cells on towers 100–400 m away are peppered with random bright/dark pixels in every night frame (`crop_closeup22_windows.png`). Root cause (showcase.js block shader): `vInst = float(gl_InstanceID)` is passed as an *interpolated* varying, then fed into `envHash(cell + vInst*7.31)` / `envHash(cell*1.7 + vInst*3.17 + 11.0)`; the sin-fract hash multiplies the 1e-5 interpolation round-off by 43758, so `on`/`tint` flip per pixel. Fix: `flat` varying (GLSL ES 3), or `floor(vInst + 0.5)` before hashing, and replace the sin hash with an integer hash (pcg / wang). Evidence: `closeup_22.png`, `street_22.png`, `moonrise_22.png`, `sky_22.png`, `crop_closeup22_windows.png`.

3. **[major] Clouds still read as a soft 2D noise sheet.** The 5-step slab march is there, but at the game's pitches the cumulus are low-contrast blotches that smear to the horizon (`skyline_6p5`, `street_12`), overcast is a structureless grey gradient (`skyline_12_cloudy`), and nothing has a 3D silhouette or a bright top / dark base. Fix: remap density with a narrow band (`smoothstep(th, th+0.08, …)`) so edges are crisp, raise the erosion contrast, add a second denser layer with its own threshold, use 8–12 steps for rays under 20° elevation, and shade by height-in-slab (top lit, base ambient) rather than only by the column shadow; overcast needs visible stratus structure (low-frequency luminance variation ±15 %). Evidence: `skyline_6p5.png`, `street_12.png`, `skyline_12_cloudy.png`.

4. **[major] Night sky is grey-blue and too bright; stars are square; the "moonrise" preset never shows a moon.** `skyline_22` sky ≈ 90/255 mid grey-blue with a lighter horizon band (CS2 cs2_8: deep navy); the airglow + light-pollution floor at exposure 2.8 is the cause. Stars are 2–3 px squares (`crop_skyline22_sky.png`). `moonrise_22.png` has no moon (moon offset puts it near zenith at 22:00 on day 1). Fix: night floor ×0.5 with a deeper blue tint, exposure ≈ 2.2 (windows carry the scene), gaussian star falloff anti-aliased by `fwidth`, and either a time-aware moonrise preset or a moon offset that puts it 10–25° up at 21–23 h on day 1. Evidence: `skyline_22.png`, `sky_22.png`, `moonrise_22.png`.

5. **[major] Noon is dull instead of punchy; shadows under near blocks go near-black.** `aerial_12` p99 118 — sun-lit concrete tops are mid-grey, the frame has no bright values at all; `sunset_12` p1 17 under the front block. CS2 noon (cs2_1, cs2_2) has bright lit roofs and saturated grass with cool, readable shadows. Fix: exposure 1.35–1.5 at high sun (AgX has headroom), environmentIntensity 0.6 so shadows stay blue-grey, and confirm the concrete albedo × ARM lands at ~0.6 linear. Evidence: `aerial_12.png`, `sunset_12.png`, `skyline_12.png`.

6. **[minor] Cloud shadows are vague 20 m blobs.** At noon they read as dirty patches on the ground rather than cloud shapes (`aerial_12`, `skyline_12`). Fix: 512² map, sharper mask (`smoothstep(0.35,0.6,d)`), include the erosion detail in the map. Evidence: `aerial_12.png`.

7. **[minor] Rain streaks are thick uniform dashes; wetness barely responds.** 40–60 px white dashes at 1080p vs CS2's fine streaks (cs2_8); ground darkening is invisible because wetness is 0.065 at capture. Fix: width 0.015 + dist·0.001, half the length, alpha 0.4, two layers (near dense/fine, far sparse), and force `wetness = rain` at init when the clock is paused. Evidence: `street_12_rain.png`.

8. **[minor] Ground reads as green felt.** Luminance-only moss photo × tint gives a soft, low-frequency surface with no clump/blade detail at closeup; dirt patches are faint brown smudges. Fix: add a 0.3 m detail normal, a grass-clump albedo layer, and stronger dirt contrast (albedo 0.18 vs 0.28). Evidence: `closeup_12.png`, `crop_closeup12_ground.png`.

9. **[minor] Razor-flat horizon in every skyline frame.** The 8 km plane meets the dome in a hard line; CS2 always has a haze band / distant terrain. Fix: a low far ridge ring in the showcase or a stronger integrated haze over the last 3 km of the plane. Evidence: `skyline_6p5.png`, `skyline_12.png`.

10. **[minor] Sunlit grass turns into ochre "sand" at sunrise/sunset.** `sunset_17p9`, `sunrise_6p2`: directly lit ground is fully orange-brown. The sun colour at 1–2° is normalised by `maxc(sunT)` so it stays fully saturated. Fix: mix the sun colour 20 % toward white below 5°, keep the blue skylight in the ambient. Evidence: `sunset_17p9.png`, `sunrise_6p2.png`.

11. **[minor] Triangle budget is a hair from its limit with rain.** 59,826 of 60,000 (rain quads 18,000). Fix: raise the declared budget honestly (e.g. 70,000) or halve the rain instance count with wider streaks.

12. **[minor, infrastructure] Screenshot tool reports `ok:true` for boot-overlay frames.** 4 of 31 captures were the SIMBUILD loading screen (Vite full reload from other builders saving files mid-capture, fps=0 in the JSON) — core-request #2 still open. Not the module's fault, but `summary.json` can lie; the critic had to re-shoot and regenerate it.

## Strengths to preserve

- Physically based single-scattering sky with a separate sun-masked ambient LUT feeding PMREM: sky colour, horizon haze, IBL reflections and now-blue shadows are all consistent; `skyLight` and `fog.color` are real values (r1 blocker fixed at the source).
- Sunset/sunrise are transformed: bright warm sky, sun disc, orange-lit faces, cool readable shadows (`sunset_17p9`, `sunrise_6p2`).
- Hex-tiled texture bombing + dirt layer + macro tints killed the 13 m lattice and the grazing-angle moiré in every aerial/skyline frame; the dry-grass roughness floor removed the corduroy sheen.
- Fog: the dome now uses the same height-fog transmittance and in-scatter as the ground, so the fog preset is seamless; `?weather=` at boot, `setWeather` clamping, events and presets all work.
- CSM (3 × 2048, PCF, camera-adaptive far) with soft, correctly placed contact shadows at every time; sun→moon switch keeps night shadows; cloud shadows projected along the sun.
- Night: desaturated blue-grey ground, per-window warm/cool random lighting with reveals, moon speculars — the closeup night frames are the most CS2-like output.
- Engineering hygiene: only this module adds lights or touches renderer state; 10 draws / 41.8k triangles / 0.1 ms update; event-driven material sweep (no per-frame traversal); deterministic across boots; cloud drift seeded from game time; all randomness via `ctx.rng`; zero errors and zero warnings across 31 frames.
