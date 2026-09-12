# simulation — core requests (round 1)

No core API change is needed; the module runs against the documented `world` contract with every other module stubbed.

## Nits for the integrator (tools / core), none blocking

1. **`tools/screenshot.mjs`: retry once on `Execution context was destroyed, most likely because of a navigation`.**
   When several builders work concurrently, any save under `src/modules/<other>/` makes Vite full-reload every open page
   (modules are pulled in through the `import.meta.glob` in `src/main.js`, which is not hot-updatable), which kills whatever
   screenshot is mid-`page.evaluate`. It produced one spurious `FAIL` row in `shots/simulation/rdev1/summary.json`
   (`closeup_6p5`) that passed on the immediate re-shoot. A single retry (or `--retries 1`) would keep gauntlet summaries honest.
   Workaround meanwhile: re-run the whole gauntlet after editing stops.

2. **`constants.BUDGET.perModuleDrawCalls.simulation = 0`** is right for the game (the simulation renders nothing), but the
   showcase's data plaza draws ~32 (10 meshes + CSM shadow passes). The module declares `budget.drawCalls: 36` for the
   showcase; if the critic compares against `constants.BUDGET` instead of `module.budget`, please use the module value for
   showcase shots.

3. **`world.economy` extensions** (informational, no change requested): the simulation adds `milestone`, `loans`,
   `loanCapacity`, `grids` (256² Float32Array `ground`/`air`/`noise`/`landValue` + `sample(name,x,z)`), `services`
   (city-average coverage), `pollutionExposure`, `incomeBreakdown.trade`, `expenseBreakdown.loans`, `tick/day/hour`,
   `populationF`, `households`, `labour`, `employed`, `unemployment`, `jobOpenings`, `housingVacancy`, `income`, `expenses`,
   `net`, `attractiveness`, `landValue`, `growthRequests`, `levelUps`. Events added: `sim:milestone`, `sim:growth`,
   `sim:levelup`, `sim:loan`. `ui` may read `economy.milestone.{level,name,next,nextPop,progress}` for its milestone chip.

## Integrator decision (wave 1 → 2)

Applied to core (commit "Integrator: apply wave-1 core requests"):
- `tools/screenshot.mjs`: capture timeout raised to `max(--timeout, 180 s)`; before capture the tool re-checks
  `window.__sim.ready` **and** that the boot overlay is hidden, and re-waits once if a Vite full reload happened
  mid-capture (fixes boot-overlay PNGs reported with `ok:true`).
- `tools/gauntlet.mjs`: forwards `--timeout` (default 240 s) to every shot.
- `src/main.js`: in showcase mode only the wanted module + its transitive dependencies (+ environment) are imported,
  so another builder's broken module can no longer put errors in your screenshot JSON.
- `src/core/clock.js`: `sunAzimuth` fixed — 06:00 east, 12:00 south, 18:00 west. Modules should still prefer
  `world.weather.sunDir`.
- `src/core/engine.js`: `PCFShadowMap` (r185 deprecation), and in headless a 1×1 `readPixels` after each frame so the
  GPU queue cannot run several multi-second frames ahead of the capture.
- `src/core/assets.js`: `HDRLoader` replaces the deprecated `RGBELoader`.
- ARCHITECTURE §6 now documents that `composer.setSize` receives **physical** pixels, and §3 the extra
  `world.weather` fields (`moonDir`, `lightDir`, `lightIntensity`, `sunColor`, `exposure`, `night`, `wetness`,
  `preset`, `moonPhase`) and the extra `world.roads` fields.

Not applied:
- `?pitch=` to let the camera look up: `CityCamera.minPitch` stays 0.08 for gameplay; critics can use a probe script
  or a module-declared preset. Cheap to add later if a critic needs it routinely.
- `server.hmr = false` for `?headless=1`: the screenshot tool's re-check above solves the same problem without
  changing dev-server behaviour for humans.
- `world.terrain.writeHeights` / `flattenStrip`: this is a **terrain-module** API, not core. Terrain should expose it
  (documented as a request in ARCHITECTURE §3 note); roads may keep writing `heights` + a zero-strength `modify()`
  until then, since that contract now holds by documentation.


## Integrator decision (wave 2 final, 2026-09-06)

Retained honest Metal/wall-clock performance reporting and exact save/load integration. Render budget0 applies to gameplay, not the standalone synthetic plaza; no budget inflation. New-game initial money is supplied before simulation initializes. Wave2b will preserve service management after the last facility is deleted while retaining first-city bootstrap, with a simulation-owned saved latch and actual coverage checks; this is deferred until services exists, not declared implemented here.


## Integrator decision (wave 2b final, 2026-09-08)

Applied persistent managed-services state, including reconciliation after all successfully restored owners; new untouched cities retain bootstrap supply, while managed cities with zero facilities retain shortages. Daily upkeep follows catalog once and service loads use current component data. Paused zoning no longer instantiates occupied buildings immediately: ordinary growth belongs to simulation. Validate simulation save data before clearing live economy, preserving supported legacy negative cash, RNG and virtual-building records. No growth-rate, cash reward or population injection was used for the ordinary UI progression test. Ambient traffic and external-job assumptions remain simulation limitations.

## Integrator decision (wave 3 final, 2026-09-08)

Applied daily transit revenue/upkeep reader from public owner forecast, version/Map/size invalidation and once-per-tick booking; paused clock overrides speed override. Native41tick ledger and isolated14finance checks pass. Deferred ordinary-game balance, long-run stability and save-derived-demand continuity. No synthetic money, demo-equity adjustment or capacity-as-occupants substitution. See `docs/critic/integration_w3.md` for final checks and open issues. The user requested a checkpoint and pause; no new round is authorized.

## Integrator decision — R9s2 owner reconciliation (2026-09-10)

Added `simulation.reconcileWorld() -> bool`: synchronize current Roads and Buildings, redistribute occupancy, mirror it to the world, and emit `sim:reconciled` without rewinding tick, treasury, demand or RNG. Zoning invokes this after a changed road-derived lot journal; Tools invokes it after inverse restoration and compensation. Transit listens at this boundary so ordinary settlement and history restoration converge on the same deterministic demand projection.
