# terrain — critic round 1

**Score: 6.0 / 10 — FAIL**

Pass needs ≥ 8.5 + zero errors + ready + within budget + API OK. Errors/ready/budget/API are all clean; the look is not. Against the CS2 references at the same zoom and time this is "competent but obviously synthetic": a flat, hazy green carpet from the air, sprite tufts on a smeared ground at street level, and a bright confetti bug on every river surface. Hard-fail triggers hit: **washed-out frames** (aerial_12 luminance std 8.8, 90 % of pixels within 28 grey levels) and a **blocker rendering artifact** (grass tufts reflected in the water as yellow/orange speckle).

All numbers and observations below are from my own captures in `shots/terrain/r1/` (gauntlet + individual reruns, see Capture notes). The builder's rdev2 claims were not used.

## Numbers

| metric | value | budget / rule |
|---|---|---|
| valid shots | 21 (16 matrix + valley/coast ×12/22 + 720p) | — |
| console errors | **0** in every shot (incl. apicheck) | 0 |
| module status | `ready` in every shot (env also ready) | ready |
| max draw calls | **16** (skyline_17p5, valley_12, coast_12); 11–12 typical | ≤ 20 declared |
| max triangles | **255,248** (skyline_17p5) | ≤ 900,000 declared |
| unique warnings | 1: `RGBELoader has been deprecated` (environment, not terrain) | — |
| fps | SwiftShader, 3–10 s/frame under 3-critic contention — relative only, not scored | — |
| Math.random in module | none (only a comment in gen/noise.js) | forbidden |
| git status --porcelain | clean; builder scope not violated | — |

Luminance stats (0–255, `imgstats.mjs`): aerial_12 mean 133 **std 8.8** p5–p95 118–146 (washed-out); skyline_12 std 22.8 **sat 16 %** (bleached); skyline_17p5 std 55.9 (healthy); aerial_22 p95 = 34, closeup_22 p50 = 23 (very dark but readable, not black). No frame has black pixels.

## API contract — OK

`shots/terrain/r1/apicheck.mjs` → `apicheck.out` (headless, `?showcase=terrain&headless=1&time=12`):
- `getHeight(0,0)` = 14.17 (number); 7 samples all differ; clamped outside bounds (finite at ±99999).
- `getNormal` unit length; `getSlope` 0.012 rad in [0, π/2]; `isWater` boolean — river centre true, origin false.
- `raycast` down from (0,500,0) hits y = 14.17 = `getHeight` (Δ < 0.05); oblique ray hit lies on the surface; upward ray → `null`.
- `heights` is `Float32Array`, length **263169 = 513²**, same buffer as `TerrainData.heights`; resolution 513, cellSize 4.
- `modify({raise, strength 12})` → Δh = +12.0 m, `version` 0→1, `terrain:changed` emitted `{x,z,radius}`; lower/smooth/flatten run without throwing; six big raises change 621,651 screenshot bytes (mesh visibly updates). Zero errors during the check.

## Per-shot notes

| file | what I saw |
|---|---|
| aerial_6p5.png (rerun) | Olive plains, valley shadows finally give relief — but the shadow edges are blotchy/stair-stepped, plains are one swirled texture, uniform pink sand ribbon, flat dark water. |
| aerial_12.png | **Milky, contrast-free green carpet**; no readable relief, no shadow, hard-edged river with a pinkish band; std 8.8. Nothing here reads as CS2 terrain at 500 m. |
| aerial_17p5.png (rerun) | As 6.5; chunky sawtooth shadow steps at the river bend (`crops/aerial_17p5_shadow_steps.png`). |
| aerial_22.png | Uniform dark-green/navy; p95 = 34; no moon modelling of form; readable, not black. |
| aerial_12_720p.png | Identical look to 1080p (same issues), 15 draws. |
| street_6p5.png (rerun) | Warm palette is nice; sprite tufts on a smeared ground, bald mid-ground beyond ~140 m, smooth "Mount Doom" cone in the distance. |
| street_12.png | Flat noon; identical-scale tuft sprites without shadows or AO on a blurry blotchy ground; milky haze. Programmer art at eye level. |
| street_17p5.png (rerun) | Tufts turn into pale whitish blobs in a horizontal band at the fade radius; hard dark shadow strip along the far river bank. |
| street_22_720p.png (720p fallback) | Tufts glow bright green against an L≈23 ground — self-lit sprites; night otherwise readable. |
| skyline_6p5.png | Best composition of the set: ridge, long shadows, meander, island. Spire peak, abrupt rock→grass skirt, swirl tiling on the plain. |
| skyline_12.png | Bleached (sat 16 %), flat; no ridge reflection in the water; aliased dark speckle on distant rock (`crops/skyline_12_spike_peak.png`). |
| skyline_17p5.png | Best frame: warm light, long valley shadows, straw-dry grass tint, sea glint. Same peak/sand nits. |
| skyline_22.png | Moonlit, stars, silhouettes read; plains shadeless; no moon glint on water. |
| closeup_6p5.png (rerun) | Orange confetti across the river (sunlit tufts in the reflection); tuft field; valley-wall shadow OK. |
| closeup_12.png (rerun) | Confetti on the river; hazy; pink blotches; cone mountain. |
| closeup_17p5.png (rerun) | Confetti; hard dark band on the far bank; tufts. |
| closeup_22.png | Glow-in-the-dark tufts; featureless dark cone; water reflects sky with a foam outline. |
| valley_12.png | Confetti across the full river width (`crops/valley_12_water_speckle.png`); from this angle tufts are pale flat asterisks (`crops/valley_12_tuft_asterisks.png`); the "valley" is a channel cut into a flat plain. |
| valley_22.png | Night version; readable; tufts mildly glowing. |
| coast_12.png | Flat pale sea; island is a smooth cone with a green apron; its reflection is present (good); swirl on land; confetti in the estuary. |
| coast_22.png (re-shot) | Night coast, island reflection, fine; smooth cone. First capture showed the SIMBUILD boot overlay (see Capture notes). |

## Ranked issues

1. **blocker — Grass tufts render into the planar reflection → yellow/orange confetti on every river/estuary.** The tuft `InstancedMesh` is on the TERRAIN layer, which `reflCam` includes, and its distance fade uses `cameraPosition` (the mirrored camera sits below the water, so nothing fades). Fix: hide `S.grass.mesh` inside the `onReflection(true)` callback (the hook already exists for the LOD meshes) or move tufts to a layer the reflection camera disables. Evidence: `crops/valley_12_water_speckle.png`, closeup_12.png, coast_12.png.
2. **blocker — Aerial frames are washed-out and relief-free.** aerial_12: std 8.8, p5–p95 118–146; CS2 at this zoom has crisp foreground contrast and haze only in the distance. Causes stack: height fog already at 30 % at 500–700 m; albedo pulled toward luminance (`mix(vec3(lum), c, 0.45)`, `min(c, 0.62)`); 4.7 %-slope plains never self-shadow; cavity AO too weak to read. Fix: request a haze curve from environment that keeps < 800 m near-clear (core-request); restore albedo contrast/saturation; add real macro variation (dirt patches, worn paths, meadow vs pasture at 20 m and 200 m scales, as in the CS2 refs); add curvature/slope darkening at aerial scale. Evidence: aerial_12.png, aerial_12_720p.png, skyline_12.png.
3. **major — Street-level ground is programmer art.** Three identical 3-quad tuft variants on a 3 m jittered grid, same scale, no shadows/AO, hard 140 m radius with pale blobs at the fade edge; beneath them a blurry smear. Fix: dense blade geometry near the camera with size/hue variation and dithered fade, a proper high-frequency ground layer (the leafy_grass fine layer is barely visible), tuft shadows or at least ground-contact darkening. Evidence: street_12.png, street_17p5.png, `crops/valley_12_tuft_asterisks.png`.
4. **major — Night: tufts are self-lit.** `instanceColor` (~0.5–0.8 green) × bright blade atlas with an upward normal versus a ground at L≈23 makes sprites glow. Fix: derive tuft albedo from the ground albedo/tint at that point, use the ground normal, and let the environment's night exposure drive them. Evidence: closeup_22.png, street_22_720p.png.
5. **major — Mountain silhouettes and rock.** One aliased spire ("witch hat") on the main ridge, smooth featureless cones for the island and outlying hills, abrupt rock→grass skirt, dark speckle aliasing on distant rock. Fix: clamp/soften `pow(rid,1.4)` peaks and add secondary ridges and talus fans; blend rock→scree→grass over 30–60 m with slope noise; mip/anisotropy or distance-fade the rock detail normal. Evidence: `crops/skyline_12_spike_peak.png`, coast_12.png, street_6p5.png.
6. **major — Uniform pinkish sand ribbon around every water body.** Constant width, hard edge, pink tint (aerial_beach_01 + wet band), and at night the foam/wet line reads as a white outline. Fix: vary beach width by slope and noise, tint toward grey-tan, mix shingle/mud/reed edges, soften the wet line. Evidence: aerial_12.png, skyline_6p5.png, closeup_22.png.
7. **major — Blocky, stair-stepped terrain shadows.** Shadows are cast by the 8 m/16 m LOD proxies (with `uLodDrop`), not the 4 m heightfield, so valley-wall shadows step and blob. Fix: cast from LOD0 in cascade 0 (or a 4 m proxy near the camera) and soften with PCF. Evidence: `crops/aerial_17p5_shadow_steps.png`, aerial_6p5.png.
8. **minor — "Brush-stroke" swirl repetition of the coarse grass layer at aerial scale.** The warped-UV coarse layer produces a recognisable curved-stroke motif across the whole plain. Fix: lower the warp amplitude, add a third rotated sample or stochastic tiling, and break it with the macro variation from issue 2. Evidence: aerial_6p5.png, coast_12.png.
9. **minor — Water reflections too weak/incomplete.** No visible ridge reflection at noon, no moon glint at 22; reflection lacks clouds/sun disc because the environment's sky dome follows only the main camera (already filed in docs/core-requests/terrain.md). Fix: raise `uReflStrength`/Fresnel floor at grazing angles; environment to position the dome per rendering camera. Evidence: skyline_12.png, skyline_22.png.
10. **minor — The "valley" preset has no valley.** River profile: −7.5 m channel, 22 m shore lerp, then a near-flat floodplain; nothing frames it. Acceptable for buildability, but the showcase preset oversells it. Evidence: valley_12.png.
11. **tooling / core (not scored)** — `#boot` overlay (0.6 s opacity fade) leaked into the first coast_22 capture under SwiftShader starvation even though `__sim.ready` was true and the tool reported OK; the tool's hard-coded 30 s `page.screenshot` timeout killed 10/16 gauntlet shots while two other critics were rendering on the same 4 cores. Suggest: hide the overlay with `display:none` (no transition) in headless mode, and expose `--shotTimeout`.

## Strengths to preserve

- Zero console errors, `ready` in every shot; 11–16 draw calls against a budget of 20; ≤ 255 k triangles against 900 k. The instanced R32F-height chunk/LOD/skirt/proxy architecture is right and cheap.
- API contract is complete and correct; `modify` is a texture upload + partial normal/AO rebuild, bumps `version`, emits `terrain:changed`; fully deterministic (`ctx.rng`, `hash2` placement, no `Math.random`).
- The heightfield generator: eroded ridges, meandering river carved by true polyline distance, estuary, island, coast; `T.features` (river z(x), coast x(z), island) is exactly what roads/democity will need.
- Golden-hour skylines (skyline_6p5, skyline_17p5) are genuinely good: long soft shadows, straw-dry grass tint, sea glint. Keep the palette and shadow length.
- Water fundamentals work: planar reflection (the island reflects in coast_12), shore transparency and depth tint, foam band, wet-shoreline darkening and underwater tint on the terrain side.

## Capture notes

- Gauntlet (`node tools/gauntlet.mjs --module terrain --round 1`) ran concurrently with the environment and roads critics on a 4-core SwiftShader box; 10 of 16 shots hit the tool's 30 s screenshot timeout. All were re-shot individually (same tool, same params) and the JSONs replaced; `summary.json` still reflects the original run. street_22 failed twice at 1080p and is captured at 1280×720 (`street_22_720p.png`). coast_22 was re-shot after the first capture showed the boot overlay.
- Crops for evidence are in `shots/terrain/r1/crops/` (2× nearest-neighbour), made with a throwaway PNG tool; no module files were touched.
