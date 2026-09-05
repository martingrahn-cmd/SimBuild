# simulation — critic round 1

**Score: 6.5 / 10 — FAIL** (pass needs ≥ 8.5). Console errors 0 · module `ready` in 21/21 shots · max draw calls 32 (declared 36) · max triangles 276,658 (declared 400k) · API contract OK (with two correctness nits below).

Verdict in one line: the *economy* is the real thing — byte-deterministic, save/load-exact, fixed 4 Hz, tolerant of every stubbed module, with a CS2-grade statistics panel — but its balance is flat (0.0 % unemployment for 90 days, treasury a straight line, C/I/O bars near-empty, happiness pinned at 83 %), the panel clips at 720p, `reset()` keeps the old treasury, and the 3D "data plaza" that fills every frame is programmer-art-plus: a 6 km flat lawn with an obvious repeating lattice, dusk-bright nights, static-noise hedges and lollipop trees. Against CS2 at the same zoom and hour an expert sees the gap instantly.

## How I checked

- Read the 8 CS2 references first (`scratchpad/ref/cs2_1..8.jpg`), then ARCHITECTURE §3/4/9/12/13/14 and CS2-LOOK.md.
- `node tools/gauntlet.mjs --module simulation --round 1` (16 frames) + presets `stats`/`pillars` at 12 and 22 + `stats` at 1280×720 = 21 frames, every one opened with the image reader.
- Other builders were saving files in `src/modules/ui`, `roads`, `terrain` during my run; Vite full-reloads spoiled 9 captures (4 "Execution context destroyed", 4 with `ui/hud.js` import errors, 2 boot-overlay frames). I re-shot all of them (`reshoot.log`) until every frame was a real render with **zero errors**, and rebuilt `shots/simulation/r1/summary.json` from the per-shot JSONs. None of those errors came from the simulation module.
- Image statistics (mean luminance etc., panel excluded): `shots/simulation/r1/imgstats.mjs` → `imgstats.json`.
- API probe: `shots/simulation/r1/apicheck.mjs` → `apicheck.out.json` (4 headless page loads: seed 1337 ×3, seed 42 ×1). Node selftest: `node src/modules/simulation/selftest.mjs` (90 days).
- Code read in full: `index.js`, `economy.js`, `grids.js`, `virtualcity.js`, `activity.js`, `ring.js`, `panel.js`, `showcase.js`, `selftest.mjs`.
- `grep -rn Math.random src/modules/simulation` → none. `performance.now()` only in the pre-roll log line and the selftest (profiling, allowed).
- `git status --porcelain`: `src/modules/simulation/` is clean (committed in 984e434). The modified/untracked files in the tree belong to the roads, terrain and ui builders working in parallel, not to this module.

## Per-shot notes (`shots/simulation/r1/`)

| file | what I saw |
|---|---|
| `aerial_6p5.png` | Long soft tree shadows (good, environment), but the whole lawn is a khaki plane with a visible diagonal lattice; plaza reads as a grey slab with a bar wall; the four RCI stubs are 1–3 m tall dots. |
| `aerial_12.png` | Same lattice, stronger — a regular cross-hatch across the entire frame; lawn is olive-khaki, low contrast; panel reads "12:50" while the sun is at noon. |
| `aerial_17p5.png` | Warm light and long shadows work; lawn still lattice-patterned; hedges are thin dark lines; panel clock "18:21". |
| `aerial_22.png` | Not night: lawn is a mid green (mean 55 vs environment's own 43), trees fully lit; bars glow softly; no light pools on the plaza. |
| `street_6p5.png` | Hedge in the foreground is a jittered box with a coarse green-noise cut-out ("static"); RCI pillars OK with faint floor rings; lawn is a blurry photo with mud blotches; treasury bars form an opaque tan wall. |
| `street_12.png` | Same; paving slabs with joints look decent; bars flat-lit; labels "ZONE DEMAND R25% …" and "BOOM TOWN" readable on the plinth. |
| `street_17p5.png` | Best street lighting (warm rim on the plinths); hedge still static-noise; bar wall hides the population/jobs rows entirely. |
| `street_22.png` | Stars, pastel glowing bars and pillars — the nicest night element; but the lawn and hedge are still lit (mean 88), no darkness, no pools. |
| `skyline_6p5.png` | Flat khaki plane to a razor-sharp horizon, no haze gradient; checker pattern visible in the foreground lawn; the plaza is a speck. |
| `skyline_12.png` | Haze band on the far lawn goes pale grey-green, then a hard horizon; lattice in the foreground. |
| `skyline_17p5.png` | Blown toward the sun (7.4 % of pixels > 240, mean 172): a sand-coloured wash with long tree shadows; the most washed-out frame. |
| `skyline_22.png` | Grey-blue night sky with stars; lawn still green-grey; plaza glows; readable but not night. |
| `closeup_6p5.png` | Bars close up: clean glass with floor lines, cap highlight; older-day bars greyed; plinth label strip readable; hedge on the left is noise. |
| `closeup_12.png` | Same, flat noon; running-bond paving reads well; trees are icosahedron blobs and cone stacks. |
| `closeup_17p5.png` | Warm side light on the bar wall; nice; hedge and lawn remain the weak points. |
| `closeup_22.png` | Bars/pillars glow pastel; plaza and lawn still dusk-bright; no contact light from the emissives. |
| `stats_12.png` | The full plaza composition: 3 rows × 30 bars, pillars, hedges, paths, trees — legible as a data sculpture; the lawn lattice is visible in the upper half. |
| `stats_22.png` | Same at night; glow works; plaza too bright for 22:00. |
| `pillars_12.png` | Pillars front and centre, "TREASURY ¢606,856" label on the plinth, static-noise hedge strip on the left. |
| `pillars_22.png` | Night version; sky with stars; pillars glow; lawn still lit. |
| `stats_12_720p.png` | **Panel clipped**: the "Activity · 24 h" chart and the footer fall below the 720 px viewport; no scroll/compact mode. |

## Numbers

| metric | value |
|---|---|
| frames | 21, all `ok`, module status `ready` in every one |
| console errors / warnings (final frames) | 0 / 0 |
| draw calls | 29–32 (declared budget 36; `constants.BUDGET` says 0 for the in-game module, the showcase plaza is what costs 32) |
| triangles | 269,646–276,658 (declared 400k) |
| fps (SwiftShader, relative only) | 11.2–13.1 |
| module update ms | 0.2–0.5 |
| night luminance (mean, panel excluded) | aerial_22 55.6 · street_22 88.2 · closeup_22 80.9 · skyline_22 78.6 — environment's own aerial_22 measured 43 |
| blown highlights | skyline_17p5: 7.4 % of pixels > 240 |

## API contract check

| check | result |
|---|---|
| `sim:tick` emitted (4 Hz game time) | OK — 250 events for `api.step(250)`, payload `{tick, economy}` (object reused, no allocation) |
| `sim:demand` emitted | OK — every 25 ticks (10 per 250), all four values in [0, 1] |
| `api.activity(hour)` ∈ [0, 1] | OK for h = −3 … 27 in 0.5 steps; `activity()` defaults to the current hour; `profile()` returns 9 curves all in range |
| same seed ⇒ identical numbers | OK — two independent page loads with seed 1337 produce a byte-identical 60-day history and milestone state; seed 42 differs (pop 6,532 vs 8,736 on day 60). Node selftest: 90 days ×2 identical, save/load resume identical, 11.3 µs/tick |
| `serialize()/deserialize()` round-trip | OK with a nit — replay after load is byte-identical and `deserialize(serialize())` is idempotent (158 kB save); **but immediately after `deserialize()` the derived fields are zero until the next tick**: `jobs 1681→0, employed→0, income→0, expenses→0, net→0, households→0, housingVacancy→0, landValue→0.3, attractiveness→0.5` (probe in node). A HUD reading right after load shows 0 jobs / ¢0 income for one tick. |
| `api.reset()` | BUG — `reset()` does `e.money = e.money ?? 150000`, so a reset keeps the current treasury (probe: ¢213,866 after reset, not ¢150,000). |
| `Math.random` / wall clock | none; `performance.now` only for the pre-roll timing log |
| world ownership | `world.economy` mutated in place; `services`/`grids` object identities stable across deserialize; extensions documented in `docs/core-requests/simulation.md` |
| fault isolation | env hooks (`coverage`, `isWater`, `edges`, `freeLots`, `requestSpawn`) all try/catch'd; MAX_TICKS_PER_FRAME cap with a single warning |
| cross-module touching | panel is appended to `#ui` (the ui module's DOM root) and imports `../ui/fonts/*.woff2` — not a THREE group, but coupling the contract discourages |

Files the builder may touch: OK — `src/modules/simulation/` (committed), `docs/core-requests/simulation.md`, `docs/builds/simulation_r1.json`, `shots/simulation/`. Nothing outside.

## Ranked issues

1. **major — Lawn tiling is obvious at every wide zoom.** A 6000 m plane with a 13 m photo repeat; the two-sample rotated blend does not hide it — `aerial_12.png`, `aerial_6p5.png`, `skyline_6p5.png`, `stats_12.png` all show a regular diagonal lattice/checker across the whole frame, and skyline frames end in a razor horizon with no aerial perspective. Fix: per-cell random rotation/offset (hex or Wang tiling) instead of a single rotated second sample; add a second, larger macro octave (200–400 m) that modulates *scale* not just tint; blend to a low-frequency colour beyond ~600 m and fade into the environment's fog colour (raise `dfade` to 1.0 and take the colour from `world.weather.skyLight`); or simply stage the plaza on the terrain module's ground when it is available. Evidence: `shots/simulation/r1/aerial_12.png`.
2. **major — Nights are dusk.** `aerial_22` mean luminance 55.6, `street_22` 88, `closeup_22` 81, where environment's own night frame measures 43; the lawn, trees and hedges are fully lit at 22:00 and the emissive bars light nothing around them. The `tint * 1.45` boost in the ground shader and the foliage `indirectDiffuse += 0.08` term are the culprits. Fix: remove the ×1.45 (compensate in tint colours), scale foliage/ground albedo by (1 − 0.5·night), put 4–6 real point lights (or fake pools: emissive decals) at the pillar and bar plinths so the plaza reads as lit-from-the-sculpture. Evidence: `shots/simulation/r1/aerial_22.png`, `street_22.png`.
3. **major — Economy balance is flat; the story the showcase tells is "nothing ever goes wrong".** Selftest 90 days: unemployment 0.0 % every day (`outsideJobs 220` + capacity always ≥ labour), happiness 74→83 % monotone, net income −¢1.7k → +¢24k/day with no dip, treasury a straight climb (milestone rewards ¢20k–¢220k dwarf daily net), demand bars R 25–29 % but C 10–15 %, I 13–15 %, O 4 % — contradicting the builder's "25–45 %" claim. Fix: make `outsideJobs` shrink with population (e.g. `220·max(0, 1 − pop/3000)`), target 3–6 % frictional unemployment (raise `frictional` to 0.985 and let labour exceed jobs sometimes), make `servicePerCapita` grow with milestones (bigger cities cost more), size milestone rewards to ~3 days of net, and give C/I/O a balanced-market floor of ~0.3 (`bizFloor` 0.06 → 0.3 scaled by `desire`). Evidence: selftest table, panel in every frame.
4. **major — 720p clips the panel.** The panel is ≈780 px tall with `position:absolute; top:18px`; at 1280×720 the activity chart and the footer are cut off. Fix: `max-height: calc(100vh − 36px); overflow-y: auto`, or a compact mode below 800 px (drop the 3-day treasury sparkline into a tab). Evidence: `shots/simulation/r1/stats_12_720p.png`.
5. **major — Persistence/reset correctness.** (a) `deserialize()` leaves `jobs, employed, income, expenses, net, households, housingVacancy` at 0 and `landValue 0.3 / attractiveness 0.5` until the next tick; (b) `reset()` keeps the current treasury. Fix: factor the derived-field computation out of `step()` into `_derive()` and call it at the end of `deserialize()`; `reset()` must set `money` to a `START_MONEY` constant (parameter for play mode). Evidence: `shots/simulation/r1/apicheck.out.json` (`roundTripRestores:false`), node probe in this report.
6. **minor — Panel clock and scene time disagree; screenshots are not repeatable.** The economy hour runs at ×20 while `?time=` freezes the sun: panels read 12:50 at noon, 18:21 at 17:30, 22:38 at 22:00, and the tick counter differs per run (145,250 / 145,285 / 145,295). Fix: in headless/frozen-clock mode advance the pre-roll to exactly the clock hour and then hold (or set `showcaseSpeed` 0 once `app:ready` fires); keep the panel's clock on `world.time.hour`. Evidence: `aerial_17p5.png` header.
7. **minor — Hedges read as green static.** Jittered boxes with an 8 % alpha-test cut-out of the 256² foliage texture; hard-cut ends, no base AO. Present in every street/pillars/closeup frame on the left. Fix: layered leaf cards or a 1k tileable hedge texture, rounded end caps, darker base band. Evidence: `shots/simulation/r1/street_12.png`.
8. **minor — Trees are lollipops.** Icosahedron canopies and stacked cones, one cut-out texture, no LOD/impostor, no wind, 300 instances. Fine at 400 m, crude at closeup radius. Fix: leaf-card canopies (3 species), autumn tints already there — keep, add impostors for the far ring and 2× density. Evidence: `closeup_12.png` top edge, `pillars_12.png` background.
9. **minor — Skyline frames are washed out / hard-horizoned.** `skyline_17p5` mean 172 with 7.4 % blown pixels; all four skyline frames end in a sharp line with no haze. Shared with environment (its r2 verdict flags the 17:30 milkiness), but the 6 km plane and 45 % distance fade are this module's. Fix: full fade to fog colour beyond 2 km, and ask environment for exposure at low sun.
10. **minor — Data plaza legibility.** From street/pillars cameras the 30-bar treasury row is an opaque wall hiding the population and jobs rows; plinth labels are only legible from `pillars`. Fix: step the rows in height/z (or fan them 15°), thin the bars to 1.6 m with 2.4 m gaps, put labels on the top face of the plinths as well.
11. **minor — Cross-module coupling.** `panel.js` appends into `#ui` and imports `../ui/fonts/*`. Fix: mount under a module-owned root (`#sim-ui` appended to body) and load the font from `public/assets/fonts/` via the asset manifest so the panel survives a ui refactor.

## Strengths to preserve

- Deterministic core: same seed ⇒ byte-identical 90-day state; save/load resume identical; 11 µs/tick; `selftest.mjs` runs in node with no browser — keep it in the loop.
- Clean event contract: `sim:tick` at fixed 4 Hz game time accumulated from `time:tick × speed`, `sim:demand` every 25 ticks, payload objects reused, no per-frame allocations; tick-drop guard with a single warning.
- Every hook into other modules tolerates stubs (`freeLots`, `requestSpawn`, `coverage`, `isWater`, road edges); virtual city fallback makes the showcase self-sufficient.
- Scope beyond spec already in place: milestones with unlocks and rewards, loans, 256² pollution/noise/land-value grids exposed at `world.economy.grids`, per-building service levels, activity curves for traffic/lights.
- The panel is the closest thing in the project to CS2's HUD: dark glass, Aileron, tabular numbers, KPI grid with trend arrows, milestone badge + progress, RCI bars, sparklines with day ticks, budget bars, 24 h activity curve with night shading.
- Bars/pillars glass shader (base-to-top gradient, cap, 2 m floor lines, night emissive) and the running-bond paving with per-slab tone and grime are good material work.
- Draw-call discipline: 10 meshes, all instanced or merged, 32 draws including CSM passes.
