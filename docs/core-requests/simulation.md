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
