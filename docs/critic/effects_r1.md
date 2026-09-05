# effects — critic round 1

**Score: 6.0 / 10 — FAIL** (pass needs ≥ 8.5). Zero console errors, module `ready` in all 21 shots, 41 draw calls (budget 60), API contract OK — the failure is the picture, not the plumbing: golden-hour frames are washed out, night is a milky blue dusk with flat pastel windows, noon shadows are crushed to black, and the AO is too weak to see.

Reference bar: `scratchpad/ref/cs2_1..8.jpg` (all eight viewed). Verdict JSON: `docs/critic/effects_r1.json`.

## How the shots were taken

`node tools/gauntlet.mjs --module effects --round 1` was run first (`shots/effects/r1/gauntlet.log`, `summary_gauntlet_original.json`): only 4 of 16 shots survived — the other 12 died on the tool's fixed 90 s timeout (roads/terrain builders were shooting on the same 4-core box, load 8–12, one frame ≈ 6–15 s in SwiftShader) and on Vite full reloads mid-capture ("Execution context was destroyed"). Those 12 were re-shot with `tools/screenshot.mjs --timeout 300` against a second, no-HMR Vite instance (`shots/effects/r1/vite.nohmr.config.js`, port 5174; same code, same URL params), then the module presets `lamps`/`plaza` at 12 and 22 and one 1280×720. `summary.json` was rebuilt from the 21 per-shot JSONs (`reshoot.sh`, `reshoot.log`). The builder's core requests 1/5/6 about these tool limits are legitimate.

## Numbers

| metric | value | budget / note |
|---|---|---|
| draw calls (every shot) | **41** | module budget 60 ✓; ARCHITECTURE §9 allots effects 30 — the chain itself is **22** (41 with chain vs 19 direct), the staged scene is 19 |
| triangles | 814 984 | budget 900 000 ✓ (forest belt) |
| console / page / sim errors | **0** in 21 shots + apicheck | ✓ |
| warnings | 0 | |
| module status | `ready` ×21 (environment `ready` ×21) | ✓ |
| JS heap | 38–40 MB | |
| frame time (SwiftShader) | 6–15 s/frame under load | relative only |
| `Math.random` / `Date.now` / `performance.now` in module | none | ✓ |
| determinism | two consecutive frames byte-identical (diff 0) | ✓ |
| files touched by builder | `src/modules/effects/`, `docs/builds/effects_r1.json`, `docs/core-requests/effects.md`, `shots/effects/` | ✓ (working-tree changes belong to terrain/roads builders) |

Luma percentiles of the final 1080p frames (`shots/effects/r1/lumastats.txt`, 0–255):

| shot | mean | p1 | p5 | p50 | p95 | p99 | reading |
|---|---|---|---|---|---|---|---|
| aerial_6p5 | 81 | 37 | 46 | 72 | 151 | 223 | OK, best frame |
| aerial_12 | 71 | 8 | 14 | 73 | 122 | 149 | flat, low-key |
| aerial_17p5 | 85 | 38 | 47 | 80 | 139 | 167 | left third washed cream |
| aerial_22 | 45 | 11 | 15 | 42 | 89 | 118 | milky night |
| street_12 | 80 | **0** | **5** | 88 | 139 | 169 | crushed blacks |
| street_17p5 | 99 | 43 | 49 | 80 | 202 | 223 | road cyan-blue |
| skyline_17p5 | **156** | 47 | 59 | **163** | 240 | **251** | washed out |
| skyline_22 | 50 | 8 | 13 | 49 | 94 | 105 | no city glow |
| closeup_12 | 67 | **0** | **5** | 79 | 119 | 137 | crushed blacks |
| lamps_12 | 73 | **0** | **1** | 84 | 136 | 168 | crushed blacks, DOF mush |
| plaza_12 | **40** | **0** | **1** | 33 | 103 | 158 | over-dark canyon |
| plaza_22 | 49 | 6 | 13 | 43 | 110 | 130 | best night frame, still pastel |

## API contract check (`shots/effects/r1/apicheck.mjs` → `apicheck.json`, 1280×720, no-HMR server)

| check | result |
|---|---|
| `engine.composer` installed after init | ✓ `true`; passes = RenderPass, AmbientPass, UnrealBloomPass, OutputPass, SMAAPass, GradePass |
| draw calls: chain vs direct | 41 vs 19 → **+22** (< 30 ✓). AO = 3 draws, bloom = 13, composite/output/SMAA/grade = 6 |
| bloom only on emissives | noon street: bloom on/off diff **0.00** (nothing crosses threshold 2.26). 17:30 aerial: diff **0.00** — so the golden wash is *not* bloom. 22:00 lamps: diff concentrated on lamp heads (4.8 % px > 8, 1.2 % > 24), windows untouched → ✓ restrained, but see issue 2 (nothing but lamp heads ever glows) |
| AO visible in corners | on/off diff meanAbs **0.8** luma, 8.4 % px darker by > 3, 2.4 % by > 8, **0 %** by > 24 (`apicheck_diff_ao.png`): technically present at kerbs/pole bases, visually imperceptible, and it halos the tree cards → marginal, see issue 5 |
| resize | viewport 1280×720 → 960×540 → 1280×720: `state().size` follows, frame correct (`apicheck_resized_960.png`), no errors ✓; 1280×720 gauntlet shot identical composition to 1080p ✓ |
| `setEnabled(false)` restores direct rendering | returns `false`, `engine.composer === null`, draws 19, `state()` shows installed=false; `setEnabled(true)` reinstalls (draws 41) ✓ |
| errors/warnings during the whole sequence | 0 / 0 ✓ |
| fault isolation | code path verified: init failure → `S.failed`, `setComposer(null)`; render failure → one logged error, direct render fallback ✓ |

**apiContractOk = true.**

## Per-shot notes (file → what I saw)

- `aerial_6p5.png` → warm low sun, long shadows, readable cool shadow side; roads uniformly steel-blue; the nicest frame of the set, still a box diorama.
- `aerial_12.png` → flat mid-grey; shadows present but no AO at block level; no sky in frame; reads as a grey Lego map next to cs2_2.
- `aerial_17p5.png` → left third of the frame smothered in a cream haze gradient (sun-side in-scatter), sunlit facades OK, everything else cyan-blue.
- `aerial_22.png` → uniform blue-grey; lit windows are pale white/tan rectangles with no glow; lamp pools are faint smudges; not night.
- `street_6p5.png` → warm facades, but the whole road, kerbs and sidewalk are cyan-blue; sky washed; trees are cut-out cards.
- `street_12.png` → crisp (CAS), decent contrast, but tree shadow side and kerb undersides are pure black (p1 = 0); far end of the street whites out.
- `street_17p5.png` → same blue-road problem as 06:30 plus a bright haze band at the horizon.
- `street_22.png` → milky blue dusk; lamp heads have a small halo, windows flat; sky readable with stars; no pools worth the name.
- `skyline_6p5.png` → pleasant: long tree shadows, aerial haze on far hills, warm/cool split works here.
- `skyline_12.png` → clean and contrasty; sky bland; far hills have haze; acceptable at this zoom.
- `skyline_17p5.png` → **washed out**: sun-side half of the frame is a flat cream field (p50 163, p99 251), distant terrain disappears, city loses contrast; against cs2_2 this is the worst frame.
- `skyline_22.png` → no city glow at all; forest and hills lit like a bright moonlit dusk; windows read as white confetti.
- `closeup_6p5.png` → all shadow surfaces slate-blue; no contact AO where facades meet the slab; window rectangles flat.
- `closeup_12.png` → near-field DOF softens the park a little (fine); building bases meet the ground with a hard edge, no AO; shadow side of towers crushed.
- `closeup_17p5.png` → warm facades vs cyan roads again; plausible sun direction; no glare.
- `closeup_22.png` → the lamp halos + ground pools work here and are the right idea; facades are mid-grey-blue instead of dark; windows pastel, no glow.
- `lamps_12.png` → foreground tree card blurred into a green blob by the near-field DOF (42 m camera); road and markings crisp.
- `lamps_22.png` → same blob; lamp heads bloom modestly; pools barely visible; everything blue-lifted.
- `plaza_12.png` → shadow canyon: dark facades at p5 = 1, over-dark; sunlit street strip OK; no AO at tower bases.
- `plaza_22.png` → best night: warm/cool window mix, pools on the street; still no glow, facades too bright for night.
- `street_12_720p.png` → identical look to 1080p, chain scales correctly.
- `apicheck_*` → `day_flat`/`day_direct` vs `day_on`: the default grade darkens the whole frame by ≈19 luma (p5 25 → 5), i.e. the "punch" comes from crushing, not from shaping.

## Ranked issues

1. **blocker — Golden-hour frames are washed out** (`shots/effects/r1/skyline_17p5.png`, `aerial_17p5.png`). At 17:30 the sun-side half of the frame is a flat cream haze (p50 163, p99 251), far terrain vanishes. Verified it is *not* bloom (bloom on/off diff = 0) and the `flat` preset shows the same wash: it is the environment fog in-scatter at exposure ≈ 3 — but effects owns tone mapping/grading and shipped this frame. Fix: (a) file a core request for environment to cap in-scatter; (b) in the grade add depth-aware dehaze (you already bind the depth texture: subtract an estimate of the fog colour scaled by `1 - exp(-d·k)` before the S-curve) and an auto black point from a 1×1 downsample of the HDR buffer so p1 of the frame lands at 8–15 regardless of haze.
2. **blocker — Night is a milky blue dusk, and only lamp heads ever glow** (`skyline_22.png`, `aerial_22.png`, `street_22.png`, `apicheck_diff_bloom_night.png`). Facades sit at mid-grey-blue (mean 45–56, p5 10–18), lit windows are flat pastel rectangles (winLevel 0.11 → ≈ 0.3 after exposure, well under bloom threshold 0.79), the skyline has no city glow. cs2_8 is deep darks with warm sodium glow. Fix: remove the night lift (0.006/0.010/0.022) and negative gamma; let facades go dark; raise lit-window emissive to 2–4× the bloom threshold (or bloom an emissive-only mask / second render target so windows glow without lifting the scene); warm the lamp/window tint (sodium 2700 K), keep the sky blue.
3. **major — Noon shadows are crushed to black** (`street_12.png`, `closeup_12.png`, `lamps_12.png`, `plaza_12.png`: p1 = 0, p5 ≤ 5; plaza mean 40). Fixed black point 0.045 + S-contrast 1.16 + AO power on top of already-dark shadows; CS2 keeps cool, readable shadows (cs2_4, cs2_5). Fix: black point from the frame's own p1 (histogram of a 64×36 mip) capped at 0.02, softer toe (`c = c - bp·(1-c)` instead of a hard subtract), and lower `contrast` to ≈1.08 while keeping the pivot.
4. **major — Split toning paints every non-sunlit surface cyan-blue at golden hour** (`street_6p5.png`, `street_17p5.png`, `closeup_6p5.png`, `closeup_17p5.png`): roads, kerbs, sidewalks and roofs are uniformly steel-blue. `uShadowTint.b` (+0.022 + 0.05·golden) stacks on the sky's own blue ambient. Fix: halve the golden-hour tint, weight it by `1 - smoothstep(0, 0.25, luma)` only, and pull the shadow chroma toward neutral (desaturate shadows by 10–15 %) so asphalt reads warm-grey like cs2_4.
5. **major — AO is imperceptible and halos the tree cards** (`apicheck_diff_ao.png`; `closeup_12.png`, `plaza_12.png` show hard facade/ground junctions). On/off meanAbs 0.8 luma, zero pixels change by > 24; instead of contact darkening it draws leaf-shaped outlines around the alpha-cut foliage. Fix: intensity 1.7 → ~3, a second small radius (0.6–1.5 m) for contact, a thickness/depth-discontinuity rejection so foliage cards do not occlude, and a `_debug('ao')` view so it can be tuned by eye.
6. **major — Near-field DOF turns foreground trees into blobs** (`lamps_12.png`, `lamps_22.png`). At a 42 m camera the 8-tap gather with maxCoC 3.5 px mushes the left tree into a green smear. Fix: start the near blur only below 0.35× focus distance, cap CoC ≤ 2 px above 30 m, and do the gather at half res with 16 taps + pre-multiplied CoC.
7. **minor — The staged showcase is programmer art** (every shot): flat boxes, cut-out card trees with hard silhouettes, no parapets/HVAC, a road cut through the hills with vertical walls (`skyline_12.png`). It is the only stage the chain is ever judged on. Fix: 3–4 clustered impostor cards per tree with normal-blended lighting, roof clutter, soften the terrain cut; or stage on the buildings/props showcases once they exist.
8. **minor — No rain streaks / wet-lens / wet reflection pass** (spec §12); rain only bumps bloom and desaturates. Fix: screen-space streak sprite pass gated by `weather.rain`, plus a wet-road specular boost hint published for roads.
9. **minor — The sun never blooms and there is no glare**: 17:30 aerial bloom diff = 0 even with the sun near the frame edge. Fix: drive a small anamorphic/ghost glare from the environment sun-disc screen position rather than relying on the threshold.
10. **minor — Gauntlet reliability**: 12/16 gauntlet shots failed on the 90 s tool timeout and on Vite reloads. Not the module's fault, but the build record's screenshots were taken through a private script; keep pushing core requests 1/5/6 so the official run can complete.

## Strengths to preserve

- Clean, well-isolated chain: HDR half-float target, depth texture shared by AO/DOF, every pass wrapped, init/render failure drops to direct render without taking the frame down; `setEnabled` toggles cleanly and restores exactly 19 direct draws.
- Cheap: the whole post chain is 22 draw calls, 0.0–0.1 ms of JS per frame, no per-frame allocations; deterministic frame-to-frame.
- Bloom is genuinely restrained and exposure-aware — nothing but lamp heads crosses the threshold, verified by pixel diff, no daytime halo pollution.
- CAS sharpen + SMAA give crisp markings and facades without ringing (`street_12.png`).
- The 06:30 frames (`aerial_6p5.png`, `skyline_6p5.png`) show the grade can work: warm sun, cool readable shadows, aerial haze on the far hills.
- Lamp-head halos with additive ground pools (`closeup_22.png`, `plaza_22.png`) are the right idea for CS2-style street lighting; keep them and scale the rest of the night to match.
- Honest self-assessment in `docs/builds/effects_r1.json` (self-score 6.5, weaknesses listed) matches what the frames show.
