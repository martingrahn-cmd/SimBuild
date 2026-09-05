# Module spec — `simulation`

Round 1 verdict: **6.5 / 10, FAIL** (`docs/critic/simulation_r1.md`). The economy engine is real and deterministic;
the *balance*, the *persistence correctness*, the *panel at 720p* and the *staged plaza* are what lost the round.
Everything ranked in that report is either an acceptance item below or a listed failure mode. Read it before you start.

Role-invariant rules (what you may write, verification loop, determinism, instancing, no per-frame allocation,
reporting, never inflate) live in `docs/prompts/BUILDER.md` and are not repeated here.

---

## 1. Purpose

Without `simulation` the city is a diorama: nothing grows, nothing costs money, no citizen has a job, and no other
module has a reason to change over time — it is the deterministic 4 Hz clockwork that turns zoned land into
population, jobs, RCI demand, a treasury, happiness, milestones and the pollution / land-value fields every other
system reads.

## 2. World data owned

Owner of `world.economy`. **Mutate in place, never replace the section object.** From ARCHITECTURE §3, verbatim:

```js
  economy: {                         // owner: simulation
    money: 150000, population: 0, jobs: 0, happiness: 0.5, demand:{residential,commercial,industrial,office}, taxRate: 0.1,
    history: [{day, money, population}],
  },
```

ARCHITECTURE §15 extends this module with: pollution (industry/traffic → ground/air/noise grids 256²), land value
(from services, parks, water, pollution, density), crime/fire-risk/health/education levels per building from
`services.coverage`, milestones (population thresholds unlock service categories and tools; emits
`sim:milestone {level,name,unlocks}`), outside-connection trade income, loans, the grids exposed via
`world.economy.grids` for infoviews, and `serialize()/deserialize()` for everything it owns.

The r1 build already added these fields; they are now **contract**, and their shapes must not change without a note in
`docs/core-requests/simulation.md`:

```js
world.economy.milestone   = { level, name, next, nextPop, progress, unlocked:[string] }
world.economy.loans       = [{ id, amount, remaining, perDay, daysLeft, rate }]
world.economy.grids       = { size:256, cellSize:8, version, ground:Float32Array, air:Float32Array,
                              noise:Float32Array, landValue:Float32Array, index(x, z) -> int,
                              sample(name, x, z) -> 0..1 }   // exactly the shape infoviews pins; `index` and
                              // `cellSize` are contract, not incidental (grids.js:20-29 exposes both; cellSize is
                              // worldSize/size = 2048/256 = 8 m and must stay 8)
world.economy.incomeBreakdown  = { tax, trade, ... }      // ¢/day, sums to `income`
world.economy.expenseBreakdown = { services, upkeep, roads, admin, loans, ... }  // sums to `expenses`
world.economy.tick, .day, .hour, .populationF, .households, .labour, .employed, .unemployment,
world.economy.jobOpenings, .housingVacancy, .income, .expenses, .net, .attractiveness, .landValue,
world.economy.pollutionExposure, .growthRequests, .levelUps, .loanCapacity, .services
```

Events emitted (§5, payload objects reused — no per-frame allocation):

| Event | Payload | Cadence |
|---|---|---|
| `sim:tick` | `{tick, economy}` | every tick = **4 Hz game time**, 100 ticks/game-hour, 2400/game-day |
| `sim:demand` | `{residential, commercial, industrial, office}` each 0..1 | every 25 ticks (4×/game-hour) |
| `sim:growth` | `{type, density, lot, virtual}` | per accepted growth request |
| `sim:levelup` | `{id, virtual}` | per accepted level-up |
| `sim:milestone` | `{level, name, unlocks, reward, population}` | on threshold crossing |
| `sim:loan` | `{type:'loan'\|'loan_paid', id, amount, ...}` | on loan taken / cleared |

Consumed: `time:tick` (the only tick source — never `Date.now()`/`performance.now()` in logic),
`buildings:changed`, `roads:changed`, `zones:changed`, `services:changed`, `ui:action`.

`dependencies: []` stays. Assumption stated here so it is not relitigated: simulation must init and produce a full
economy with **every** neighbour missing or stubbed, and its showcase must not pull `terrain` in as a dependency —
terrain currently scores 6 and would import its draw calls and its own defects into every simulation frame.

## 3. Visual / behavioural target

This is a **non-visual module**; `CRITIC.md` ("Scoring") defines what that means and is not restated here. What is
specific to this module is the weighting: **55 % economy correctness + balance + API/persistence probes (items 1–15),
25 % the statistics panel (items 16–18 and 26), 20 % the staged plaza (items 19–24).** A perfect plaza cannot rescue a
flat economy, and a correct economy behind a programmer-art frame cannot pass either. Items 25 and 27 (cleanliness and
budget) are not weighted: they are gates — per ARCHITECTURE §13 a pass requires zero console errors and staying within
budget regardless of the score.

The panel and plaza components use ARCHITECTURE §13's CS2 scale unchanged. The 55 % economy component cannot — an
unemployment curve has no CS2 screenshot to sit beside — so it gets its own anchors, and the critic interpolates
between them:

| Score | The economy component means |
|---|---|
| 9 | Every item 1–15 passes and the selftest table reads like a CS2 city: a recession, a recovery, an industrial boom that pulls office demand up two years later. |
| 8.5 | Items 1–15 pass, with one metric sitting at the edge of its band. |
| 7 | Correct and deterministic, but the curves are smooth — no shock is visible without reading the numbers. |
| 6.5 | Round 1: correct, deterministic, and flat. |
| 5 | A headline metric is pinned (r1's 0.0 % unemployment on 90 straight days), or replay is not byte-identical. |

**Correct behaviour, in the panel.** The panel is the closest thing in the repo to the CS2 HUD and must stay that way.
Target `$REF/cs2_5.jpg` — the citizen info panel: dark translucent glass (≈ 84 % opaque, blurred), a coloured title
strip, small uppercase letter-spaced grey labels on the left, values right-aligned in white tabular figures, hairline
section dividers, cyan (#3a95f5-class) accent, a green/amber/red status chip for a mood value. Target `$REF/cs2_1.jpg`
bottom-left for the RCI/milestone treatment: a numbered milestone badge with a name and a progress bar, and short
saturated demand bars in green / blue / orange / purple. Numbers must move while the clock runs — a frozen panel is a
fail, measured by **item 26** (not by a screenshot: `tools/screenshot.mjs` sends `speed=0` unless `--speed` is given,
so every standard shot is a still frame and liveness can only be proved by a probe).

**Correct behaviour, in a probe.** `node src/modules/simulation/selftest.mjs --days 120 --json <path>` runs the whole
economy in node with no browser and writes a per-day table. A reader of that table must see a *city with a story*:
unemployment hovering a few per cent and wobbling, all four demand bars alive, happiness rising and dipping, the
treasury climbing but with loss-making stretches, milestones arriving without turning the treasury into a straight
line. Round 1 failed exactly here: 0.0 % unemployment for 90 consecutive days, monotone happiness 74→83 %, C/I/O bars
at 4–15 %, treasury a ruler-straight climb.

**The staged plaza.** A civic data terrace, not a lawn with charts on it. Reference for materials and light:
`$REF/cs2_4.jpg` (suburban golden hour — note that the ground is never one flat tone: mown grass, worn dirt, hedge
shadow, kerb, path, all inside 10 m, and every object has a contact shadow) and `$REF/cs2_8.jpg` (night — the ground
is *dark*, and light exists only in pools under the lamps and spill from lit surfaces; the sky is deep blue, not
dusk-grey). `$REF/cs2_2.jpg` shows what a distant horizon must do: terrain loses contrast into a warm haze band and
merges with the sky — there is no razor line. Round 1's `aerial_12.png` shows a 6 km grass plane with a visible
diagonal lattice and a hard horizon; `aerial_22.png` measured mean luminance 55.6 where environment's own night frame
measures 43. Both are hard fails below.

Permitted strategy, stated so it is not treated as cheating: **you may shrink the backdrop instead of upgrading it.**
A tight, well-lit terrace with a short, fully fog-faded ground scores better than a 6 km lawn of mediocre foliage.
Whatever remains in frame must meet the bar; the frame must never be empty (item 20 sets the floor).

## 4. Acceptance criteria

Ordered by how much each moves the score (items 26–27 are appended because they were added late, not because they
matter least). **This list is the requirement set: if it is not here, it is not required — and nothing here is graded
by adjective.** Every item is observable in a screenshot, a screenshot/summary JSON, the selftest JSON, or a
`page.evaluate` probe. Probe handle for everything in-page:
`const api = window.__sim.registry.modules.get('simulation').api`.

**Two rules for every pixel statistic below.** (a) It is computed on the **full-resolution PNG** (1920×1080 unless
the item says otherwise), never a downscaled copy — at 480 px wide a 1 m patch is about two pixels. (b) "The panel
region" means the `simulation.panel` rect in `<shot>.crops.json`, written by `tools/screenshot.mjs … --crops` from
this module's `api.cropRects()` (ARCHITECTURE §8; landmarks listed in §8). Fallback if a shot has no rect: x < 420.

**Economy balance and dynamics** — graded from `shots/simulation/r<round>/selftest.json`, produced by
`node src/modules/simulation/selftest.mjs --days 120 --seed 1337 --json shots/simulation/r<round>/selftest.json`.
The file must contain `{seed, days, tickUs, rows:[{day, population, households, jobs, employed, unemployment,
happiness, money, income, expenses, net, buildings, demand:{residential,commercial,industrial,office},
milestone:{level,name}, reward}], scenarios:{...}}`. All windows below are days 20–120 inclusive.

1. **Unemployment is a real number, not zero.** mean ∈ [0.03, 0.08]; min > 0.005; max < 0.20; standard deviation
   ≥ 0.005; no run of > 5 consecutive days with an identical value to 4 decimals. (r1: 0.0000 on all 90 days.)
2. **All four demand bars live.** For each of `residential, commercial, industrial, office`: mean ≥ 0.20, max ≥ 0.35,
   std ≥ 0.03, and no value > 0.95 for more than 5 consecutive days. Visible in the panel as four bars none of which
   is an empty stub in `stats_12.png`. (r1: C 10–15 %, I 13–15 %, O 4 %.)
3. **Happiness moves both ways.** max − min ≥ 0.12 over the window, and at least one drawdown of ≥ 0.05 below a
   running maximum lasting ≥ 3 days. (r1: monotone 0.74 → 0.83.)
4. **The treasury is not a ruler.** At least two separate stretches of ≥ 3 consecutive days with `net < 0`. Every
   milestone `reward` ≤ **3 × max(0, mean daily `net` over the 10 days preceding the grant)** *and* ≤ **¢40 000** in
   absolute terms — both constants are fixed here so the critic computes the same ceiling the builder did, and the
   `max(0, …)` floor is deliberate: a milestone landing inside a deficit stretch (which clause 1 demands be common)
   caps at ¢0, it does not become a penalty. Day-120 `money` > day-20 `money` (the city is still viable).
   (r1: rewards of ¢20k–¢220k dwarfed a ¢24k/day net.)
5. **The city reaches a real size.** Day-120 population ∈ [12 000, 80 000]; `milestone.level` ≥ 7 by day 120;
   `buildings` ≥ 600. Daily population growth rate is not constant: std of `Δpopulation/population` ≥ 20 % of its mean.
   `level` is the **0-based index into `api.constants.MILESTONES`** (economy.js:147 starts at 0 = 'Hamlet'), so the
   clauses agree at both ends: 12 000 → level 7 ('Busy Town', 10 000), 80 000 → level 11 ('Metropolis', 70 000).
   Level 8 ('Big Town', 16 000) would fail a legal 13 000-population city, which is why it is 7.
6. **The model responds to shocks.** `scenarios` in the same JSON, each a 40-day continuation from a day-60 snapshot:
   - `tax`: `taxRate` 0.10 → 0.25 at day 60 ⇒ within 10 days happiness drops ≥ 0.08, daily tax income rises ≥ 30 %,
     and residential demand falls ≥ 0.10 from its day-60 value.
   - `blackout`: the harness sets the module's env hooks (economy.js:84-92, the pair index.js:119-120 installs) to
     `servicesActive: () => true` **and** `coverage: () => 0` for every kind in `world.services.kinds`. Both halves
     are required — `coverage()` already returns 0 with no services module, and §7 makes that mean "outside-connection
     baseline, keep growing" (item 15 depends on it); starvation exists only when `servicesActive()` is true
     (economy.js:229). The run records `scenarios.blackout.applied = {servicesActive:true, kindsForced:[…]}` so the
     critic re-runs the command above and diffs it instead of trusting the harness. Required: growth requests fall to
     0 within 2 days and population is lower at day 100 than at day 60.
   - `boom`: `taxRate` → 0.04 ⇒ population at day 100 at least 15 % above the baseline run's day-100 population.

**Correctness, determinism, persistence**

7. **Byte-identical replay.** Two runs of `selftest.mjs --days 120 --seed 1337` produce identical JSON (compare with
   `sha256`), and two headless page loads of `?showcase=simulation&time=12&seed=1337&headless=1` return an identical
   `JSON.stringify(api.serialize())` hash. `--seed 42` differs.
   `grep -rn "Math.random\|Date.now()" src/modules/simulation/ --exclude=selftest.mjs` returns nothing (the grep
   excludes `selftest.mjs` because it profiles; per ARCHITECTURE §11 `performance.now()` remains permitted for the
   pre-roll timing line in `index.js` — which §5's init row is checked from — and nowhere else in logic).
8. **`deserialize()` restores derived state immediately.** After `api.deserialize(api.serialize())` *and before any
   further tick*, every one of `jobs, employed, income, expenses, net, households, housingVacancy, unemployment,
   landValue, attractiveness` equals its pre-serialize value to within 1e-6, and `world.economy.grids.version` is
   unchanged. (r1: all of them were 0 / 0.3 / 0.5 for one tick — `apicheck.out.json: roundTripRestores=false`.)
9. **`reset()` resets.** `api.constants` exports `START_MONEY` (= 150000) and `PREROLL_DAYS` (= 60) — both are read by
   the probes below, so both must be on `api.constants` alongside the existing `TICK_SECONDS / TICKS_PER_HOUR /
   TICKS_PER_DAY / ZONE_TYPES / FINE_KEYS / TUNING / MILESTONES`. `api.reset()` sets `world.economy.money` to
   `START_MONEY`, `population` to 0, `tick` to 0, clears loans, milestone back to level 0, and empties `history`.
   `api.reset(50000)` sets money to 50000 (play mode). (r1: `money = money ?? 150000` kept ¢213,866.)
10. **Frozen clock ⇒ frozen, repeatable numbers.** With `?showcase=simulation&time=12`, after `__sim.ready`:
    `api.tick() === api.constants.PREROLL_DAYS * 2400 + 1200` (= 145 200 at `PREROLL_DAYS` 60)
    exactly on two consecutive runs, `world.economy.hour` is 12.00 ± 0.02,
    the panel header reads `12:00`, and the tick counter in the panel footer is identical between the two runs.
    Same at `time=6.5` (`+ 650`), `17.5` (`+ 1750`), `22` (`+ 2200`). The economy must not keep running once the sun
    is frozen. (r1: panel read 12:50 / 18:21 / 22:38 and the tick differed by 45 between runs.)
11. **Tick contract.** A probe that counts events across `api.step(250)`: exactly 250 `sim:tick` and 10 `sim:demand`,
    every demand value ∈ [0,1], `sim:tick.economy === world.economy` (same object), and no new object allocated per
    emit (payload identity stable across ticks). `api.activity(h)` ∈ [0,1] for h = −3 … 27 in 0.5 steps;
    `api.profile()` returns all nine curves in range.

**Integration with real neighbours**

**Read this before grading 12 and 13.** `?showcase=all` initialises every module, but `src/main.js:88` routes
`showcase=all` to `democity`, and `src/modules/democity/index.js` is still a stub whose `showcase.setup` is an empty
function. Nothing stages roads, so zoning's buildable band is empty, so `zoning.freeLots()` returns `[]` and no lot
exists to spawn on. democity, roads and zoning are all outside this module's blast radius, so items 12 and 13 are
graded against a world the probe stages **itself**, exactly as written below. This is a prerequisite gap, not a
simulation defect, and it must never cost the builder a round.

12. **Growth actually reaches the buildings module.** New required API: `api.stats()` →
    `{tick, spawnRequests, spawnsAccepted, spawnsRejected, levelUpRequests, levelUpsApplied, lotSource:'zoning'|'world'|'virtual'|'none', ticksPerFrameMax, droppedTicks, panelUpdateMs:{mean, max}}`
    (`panelUpdateMs` covers the last 60 panel updates; item 27 grades it, because the panel class is module-internal
    and no critic can reach it).
    Lot source order must be `ctx.modules.zoning?.freeLots?.()` → `world.zones.freeLots?.()` → the virtual city, each
    in a try/catch. Graded in `?showcase=all&time=12&headless=1`, after `__sim.ready`, by a probe that stages its own
    lots with these exact calls before stepping (`world.roads.addNode/addEdge` are installed by the roads module;
    `zoning.api.paint/refresh/freeLots` are real — see §7):

    ```js
    const W = window.__sim.world;
    const zon = window.__sim.registry.modules.get('zoning')?.api;
    const api = window.__sim.registry.modules.get('simulation').api;
    const n0 = W.roads.addNode(-200, 0), n1 = W.roads.addNode(200, 0);
    const n2 = W.roads.addNode(0, -200), n3 = W.roads.addNode(0, 200);
    W.roads.addEdge(n0, n1, 'street'); W.roads.addEdge(n2, n3, 'street');
    zon?.refresh();                                   // rebuild the buildable band after external road edits
    zon?.paint(-90, 0, 70, 'residential', 'low');  zon?.paint(90, 0, 70, 'commercial', 'low');
    zon?.paint(0, -90, 70, 'industrial', 'low');   zon?.paint(0, 90, 70, 'office', 'low');
    const lots = zon?.freeLots?.().length ?? 0;       // decides which branch below applies
    const before = W.buildings.items.size, vBefore = api.virtualCity()?.count ?? 0;
    // Item 12 is a FIVE-day probe: nothing in this spec makes a level-up reachable in a building's first game
    // day, so a 2400-tick window would make `levelUpsApplied >= 1` below unachievable without special-casing it.
    api.setSimSpeed(0); api.step(2400 * 5);
    ```

    - **If `lots > 0`** (roads + zoning staged successfully): `api.stats().lotSource === 'zoning'`,
      `spawnsAccepted ≥ 20`, `levelUpsApplied ≥ 1`, and `W.buildings.items.size − before ≥ 20`.
    - **If `lots === 0`** (staging failed, or roads/zoning are themselves not ready): the item is graded against
      `lotSource === 'virtual'`, `spawnsAccepted ≥ 20` and `api.virtualCity().count − vBefore ≥ 20`,
      and the zoning path is proved at unit level instead — a probe that replaces `world.zones.freeLots` with a stub
      returning two synthetic lots (`{id, x, z, type, density}`) and shows the next `api.step(25)` selects
      `lotSource === 'world'` and calls `buildings.requestSpawn` with one of them. The critic records item 12 as
      *blocked by the democity stub* in `strengths`/`summary`, not as a failure. The `'zoning'` assertion becomes
      unconditional in the round after democity ships a staged city.

13. **Level-ups use an API that exists.** `buildings.api` exposes `setLevel(id, n)` and **not** `requestLevelUp` —
    r1 called the latter, so no building has ever levelled up in the integrated game. Call
    `ctx.modules.buildings.requestLevelUp?.(id) ?? ctx.modules.buildings.setLevel?.(id, level)`. Graded on item 12's
    probe: `levelUpsApplied ≥ 1` and ≥ 1 entry of `W.buildings.items` with `level > 1` in the `lots > 0` branch; in the
    `lots === 0` branch, `levelUpsApplied ≥ 1` and
    `api.virtualCity().ids.some((id) => api.building(id)?.level > 1) === true`, plus
    `grep -n "requestLevelUp" src/modules/simulation/` showing every call site optional-chained with a `setLevel`
    fallback.
14. **Grids are meaningful, not noise.** Graded against the virtual city's district layout, which §8 makes contract —
    do not rewrite `virtualcity.js`'s `DISTRICT` table without reading that paragraph first.
    With the showcase staged: `api.grids()` returns the §2 shape with **every** field present and of the stated type
    (`size === 256`, `cellSize === 8`, `version`, the four `Float32Array`s, `index(x, z)`, `sample(name, x, z)`) —
    infoviews pins the same object, so a trimmed one breaks a neighbour silently;
    `landValue` std over the 256² grid ≥ 0.06; mean `landValue` within 150 m of the **office/commercial centre —
    the origin (0, 0)** — exceeds the mean within 150 m of the **industrial centroid, ≈ (500, 0)** (the area-weighted
    centre of the ±0.7 rad × 300–720 m wedge) by ≥ 0.10; **mean `air` over all cells within 150 m of
    `centroid + 200 m × normalise(world.weather.wind)` ≥ 2 × the mean over all cells within 150 m of
    `centroid − 200 m × normalise(wind)`** — same disc radius as the land-value clause, so the two regions are
    symmetric about the centroid (wind defaults to +x ⇒ discs at ≈ (700, 0) and ≈ (300, 0)) and only the plume breaks
    the tie; every sample of all four grids ∈ [0,1] and finite. `api.landValueAt/pollutionAt/noiseAt` agree with `grids.sample` to 1e-6.
15. **Stub tolerance.** With `?showcase=simulation` (no zoning / buildings / services / roads / traffic), zero console
    errors, zero warnings, module status `ready`, and the panel still shows a growing city — `api.stats().lotSource === 'virtual'`.
    Deleting `world.services.coverage` / `world.roads.edges` at runtime via a probe must not throw.

**The statistics panel**

16. **Nothing clips at 1280×720.** `--w 1280 --h 720` at `--camera stats --time 12`: the whole panel — header,
    4 KPIs, milestone, RCI, sparklines, budget, activity chart, footer — is inside the viewport, or the panel is in a
    documented compact mode with `max-height: calc(100vh - 36px); overflow-y:auto` and *no scrollbar needed at 1080p*.
    Verified in `shots/simulation/r<round>/stats_12_720p.png`. (r1: the activity chart and footer fell off the bottom.)
17. **Panel reads as CS2 HUD.** In `stats_12.png` at 1920×1080: panel width 320–380 px; every label uppercase
    ≥ 10 px with ≥ 0.08em tracking; every numeric value right-aligned tabular figures; ≥ 4 hairline section dividers;
    KPI value text contrast ratio ≥ 7:1 against the panel ground and label text ≥ 4.5:1 (measure on the crop);
    the milestone badge shows level + name + progress. The four RCI bars use the repo's existing zone palette —
    `#5fd634` residential, `#2fb6f5` commercial, `#f7b515` industrial, `#c65ff5` office (the low-density row of
    `src/modules/zoning/palette.js:10-13`; copy the values, do not import the module) — checked by a probe reading
    `getComputedStyle(bar).backgroundColor` on the four bars, not by eye. It must also read at night: the same
    measurements in `stats_22.png`.
18. **The panel is the module's own DOM.** Mounted on a module-created root (`#sim-ui` appended to `document.body`),
    removed by `dispose()`. (No stacking-order clause: `#ui`'s root sets no `z-index` — `ui/styles.js` sets 5/20/50 on
    descendants only — so there is no operand; the `dev_all12.png` non-overlap check below is what separates them.)
    `grep -rn "modules/ui\|\.\./ui/" src/modules/simulation/` returns nothing; the font comes from `public/assets/` via `manifest.json` (CC0) or is a system stack.
    In `?showcase=all` the simulation panel must not overlap the `ui` HUD's own panels — verified in `dev_all12.png`.

**The staged plaza**

19. **No tiling lattice.** Algorithm: greyscale the full-resolution PNG (Rec.709), discard the columns inside the
    `simulation.panel` rect of `<shot>.crops.json` (fallback: x < 420), detrend the per-column mean with a 101-px
    moving average, and compute the normalized autocorrelation.
    **max |r| over lags 24–400 px must be < 0.35**, for both the column signal and the row signal, in
    `aerial_12.png`, `aerial_6p5.png` and `skyline_6p5.png`. (r1: a regular diagonal cross-hatch across every wide frame.)
    *Ownership, so the number is not argued in round 2:* the **critic** writes and runs
    `shots/simulation/r<round>/tiling.mjs` — its own round directory, per `CRITIC.md`. The **builder** keeps its copy
    at `src/modules/simulation/tools/tiling.mjs` — inside its own folder, which is the write permission `BUILDER.md`
    actually grants it — and reports the max |r| it measured per frame in `docs/builds/simulation_r<round>.json`.
    The algorithm above is the definition — **if the two runs disagree, the critic's run stands.**
20. **Horizon and distance.** Measured in `skyline_12.png` and `skyline_6p5.png`, both shot with `--crops`, by the
    same kind of script as item 19 (same ownership rule: critic `shots/simulation/r<round>/horizon.mjs`, builder
    `src/modules/simulation/tools/horizon.mjs`, critic's run stands):

    1. Rec.709 greyscale on the full-resolution PNG; keep only the central 60 % of columns (x ∈ [0.2 W, 0.8 W]) —
       this also excludes the panel.
    2. Per row y, take the mean luminance `L(y)` over those columns. The **boundary row** `yh` is the vertical centre
       of the `simulation.horizon` rect in `<shot>.crops.json` — the *projected* horizon from the camera (§8), never
       detected from the image: once the ΔL fade below succeeds, the strongest gradient in the frame is a plinth edge
       or the sculpture, so an image detector would lock onto the terrace exactly when the module has done the work.
       A shot with no `simulation.horizon` rect fails on the missing landmark, not on the frame.
    3. Ground band = rows `[yh + 4, yh + 23]`; sky band = rows `[yh − 23, yh − 4]` (20 px each, 4 px of clearance so
       the transition pixels themselves are in neither band). **ΔL = |mean(ground band) − mean(sky band)| ≤ 12.**
       Ground fades into `world.weather.skyLight` / the fog colour; the ground plane's own distance fade must reach 1.0.
    4. **The frame is not empty:** over all pixels outside the `simulation.panel` rect, **≥ 25 %** have luminance
       differing from the sky-band mean by **≥ 15**. That is the content floor — plaza, bars, pillars, planting and
       backdrop all count, flat sky and a sky-coloured haze do not. A probe alternative is equally acceptable and
       must be reported if used: the projected screen-space bounding box of `ctx.group` covers ≥ 25 % of the viewport.
21. **Night is night.** Mean luminance excluding the panel region: `aerial_22.png` ≤ 48, `street_22.png` ≤ 58,
    `closeup_22.png` ≤ 58, `skyline_22.png` ≤ 60 (environment's own night aerial measures 43; r1 measured 55.6 / 88 /
    81 / 78.6). How you get there is your call — §6 records the two terms that caused r1's dusk-at-22:00, and §3
    permits shrinking the backdrop instead of fixing it. And light must come *from* the sculpture: ≥ 3 distinct pools
    of L ≥ 120 on the plaza/ground, each ≥ 400 px and adjacent to emissive geometry, in `street_22.png` and
    `closeup_22.png`. That three-pool floor is the whole measurement — the r1 mode is emissives with *no* pool under
    them; a rule capping a source below the ground it lights has no instrument and is false in every night reference
    cited here.
22. **No blown golden hour.** `skyline_17p5.png`: ≤ 1.5 % of pixels > 245 and mean luminance ≤ 150 (r1: 7.4 % and 172).
    No frame at any of 06.5/12/17.5/22 has p1 = 0 over a region larger than 2 % of the frame.
23. **The data is legible from the standard cameras.** Counted by probe, not by eye — 19 unoccluded bars versus 21 is
    not a judgement anyone can defend at 1080p. New required API: **`api.showcaseProbe()`** → `{camera,
    rows:[{label:{text:'POPULATION'|'JOBS'|'TREASURY', rect:{x,y,w,h}, visible:0..1}, bars:[{i, rect:{x,y,w,h}, visible:0..1}]}],
    pillars:[{type, rect, visible}]}`, computed for the *current* camera: `rect` is the screen-space AABB of the bar's
    world bounds, and `visible` is the fraction of a 5×5 grid of sample points inside that rect whose camera ray hits
    that bar first (`THREE.Raycaster` against the staged meshes, nearest hit wins). With the `stats` preset applied:
    **≥ 20 of the 30 bars of each of the three rows have `visible ≥ 0.60`**, and each row's label strip is
    unoccluded: `rows[i].label.visible ≥ 0.9`, computed the same way as a bar's (`label.rect` is the screen-space
    AABB of the plinth label strip). Step the rows in height or fan them rather than lining up one opaque wall. From `pillars`, all four entries of `pillars` have `visible ≥ 0.60` and
    their plinth labels are legible at 1080p in `pillars_12.png` (the legibility call is visual; the occlusion is not).
    (r1: the treasury row hid the other two from street/stats.)
24. **Planting is not programmer art, or is not in frame.** Wherever foliage appears within 60 m of the camera in
    `closeup_*` / `street_*`, the anchor is `$REF/cs2_4.jpg`'s foreground planting (the frame §3 already cites):
    canopies from leaf cards or equivalent (no visible icosahedron facets, no 8 %-alpha-cut "green static"), hedges
    with rounded ends and a dark base band with contact AO — those are the visual calls, made on the crop against
    that reference. The two countable claims are **not** visual calls: counted by the probe below over the foliage
    within 60 m of the camera, ≥ 3 distinct canopy geometries and ≥ 4 distinct crown colours (distinct
    instance-colour values or distinct materials).
    Instance variety is graded by the same probe on the `InstancedMesh` matrices: decomposing every
    instance matrix, **no two instances whose origins are within 8 m of each other share both rotation to within
    0.01 rad and uniform scale to within 1 %**. Alternatively, reduce planting so none is within 60 m of any declared
    camera — then this item is satisfied by the absence, and item 20's 25 % content floor still applies.
25. **Budget and cleanliness.** Two different checks, because two different scenes are being measured:
    - **Every `?showcase=simulation` frame** — the round's 16-shot gauntlet, the **three** presets (`stats`,
      `pillars`, `terrace`) at 12 and 22, and the 1280×720 stats frame: `errors: []`, `warnings: []`,
      `modules.simulation.status === 'ready'`, `drawCalls ≤ 36`, `triangles ≤ 400 000`. This scene is the module's own,
      so its frame totals are its own.
    - **`--showcase all`**: `errors: []`, `warnings: []`, `modules.simulation.status === 'ready'`, and the §5
      in-game budget — `ctx.group.children.length === 0` with `perModuleDrawCalls.simulation = 0`. **No frame-level
      draw-call or triangle limit applies to a scene this module does not own**: that frame's totals belong to
      democity and every other module, and today's low number is an artefact of the democity stub staging nothing.
26. **The panel is alive while the clock runs.** A probe (not a screenshot — `tools/screenshot.mjs` sends `speed=0`
    unless `--speed` is given) loads `?showcase=simulation&headless=1&speed=20` **with no `time=` parameter**, waits
    for `__sim.ready`, and reads at t = 0 and again after 10 s of wall clock: `api.economy().population`,
    `api.history().length`, and `document.querySelector('#sim-ui').textContent`. Required: population strictly
    increased, `history().length` gained ≥ 1 sample, and the two text reads differ. `__sim.errors` still empty.
27. **The performance budget is actually measured.** §5's rows are requirements only because this item names them:
    `selftest.json.tickUs ≤ 25`; over 60 frames at ×20, `__sim.stats().moduleMs.simulation` mean ≤ 0.8 and max ≤ 2.0;
    `api.stats().panelUpdateMs.mean ≤ 0.3` (item 12's field, over the last 60 panel updates); texture memory ≤ **64
    MB** by §5's formula; init including pre-roll ≤ 2.5 s from the shot JSON's `elapsedMs`. Heap growth:
    `__sim.stats().heapMB` is `null` whenever `performance.memory` is absent (`src/core/debug.js:24`) — if it reads `null`, the ≤ 2 MB/60 s row is
    reported as **not measurable in this environment**, never as passed and never as failed.

## 5. Budget

| Metric | Budget | How it is checked |
|---|---|---|
| Draw calls (showcase, incl. 3 CSM cascades) | **≤ 36** | `summary.json` `maxDrawCalls`; r1 used 32 |
| Draw calls (in the game, `showcase ≠ simulation`) | **0** — the module adds nothing to `ctx.group` | `constants.BUDGET.perModuleDrawCalls.simulation = 0`; probe `ctx.group.children.length === 0` in `?showcase=all` |
| Triangles (showcase) | **≤ 400 000** | `summary.json` `maxTriangles`; r1 used 278 418 |
| `update()` per frame | **≤ 0.8 ms mean, ≤ 2.0 ms worst** at sim speed ×20 | `__sim.stats().moduleMs.simulation` sampled over 60 frames |
| Economy tick | **≤ 25 µs** | `selftest.json.tickUs`; r1 measured 11.3 |
| Panel DOM update | **≤ 0.3 ms** mean, refreshed ≤ 12 Hz, canvases only on a new history sample | `api.stats().panelUpdateMs.mean` (item 12) |
| Texture memory (showcase) | **≤ 64 MB** — at most three 1k PBR sets of ≤ 3 maps each + one 4096×512 label atlas | the formula below, over `public/assets/manifest.json` |
| Init incl. pre-roll | **≤ 2.5 s** of the 15 s init budget | `log.info` pre-roll line, `elapsedMs` in the shot JSON |
| JS heap growth | **≤ 2 MB over 60 s** at ×20 | `__sim.stats().heapMB` sampled twice |

**Texture bytes = Σ over unique textures of `w × h × 4 × 1.333`** (RGBA8 plus the mip chain), divided by 1048576 for
MB as `debug.js:24` does; the unique textures of a `ctx.assets.pbr(name)` set are that manifest entry's `files` (ARM
is one file serving ao/rough/metal, `assets.js:81`), and procedural textures count at their declared `size`. So a 1k
3-map set = 3 × 1024² × 4 × 1.333 = 16.0 MB, three sets = 48.0 MB, the 4096 × 512 atlas = 10.7 MB, total
**58.7 MB ≤ 64** — and a fourth 1k set (74.6 MB) does not fit, which is what this row really constrains. (r1's
"≤ 40 MB *and* three 1k sets" cannot both hold under any pixel accounting — 44.0 MB even at base level with no mips —
so the allowance stands and the byte figure now follows it.)

Every row above is enforced by **item 27**; `BUILDER.md` already bans per-frame allocation, so the only allocation
rule specific to this module is the one it cannot infer: the 256² grids are rebuilt **at most once per game hour**,
and the rebuild must not push a single frame over 2.0 ms — amortise it across ticks if it does.

## 6. Known failure modes

Every one of these was observed in round 1 or in a neighbouring module. Do not rediscover them.

- **Dusk-at-22:00.** A `tint * 1.45` in the ground shader and an `indirectDiffuse += 0.08` foliage term keep the lawn
  and trees fully lit at night; the frame looks like 19:00. Symptom: `aerial_22.png` mean 55.6 vs environment's 43.
- **Tiling lattice.** One 13 m photo repeat over a 6000 m plane; a second rotated sample does not hide it. Symptom in
  r1: a regular diagonal cross-hatch at aerial and skyline, strongest at noon (`BUILDER.md` lists the generic mode;
  the number here is the one that failed).
- **Razor horizon.** A 45 % distance fade leaves ground and sky meeting in a hard line with no aerial perspective.
- **Zero unemployment forever.** `outsideJobs: 220` plus job capacity that always slightly exceeds labour pins
  unemployment at 0.0 % and makes happiness monotone. Shrink outside jobs with population and let labour exceed jobs.
- **Milestone rewards as the whole economy.** ¢20k–¢1M one-offs against a ¢24k/day net turn the treasury sparkline
  into a straight climb and hide every real deficit.
- **`reset()` that does not reset.** `e.money = e.money ?? 150000` is a no-op when money is already set.
- **`deserialize()` with derived fields zeroed.** Everything computed inside `step()` is 0 until the next tick, so a
  HUD reading straight after load shows ¢0 income / 0 jobs. Factor a `_derive()` out of `step()` and call it at the
  end of `deserialize()`.
- **Panel clock drift.** Running the economy at ×20 while `?time=` freezes the sun makes the panel read 12:50 at noon
  and the tick counter differ between identical runs — screenshots stop being reproducible and the critic notices.
- **720p clipping.** The r1 panel was ~780 px tall, absolute-positioned, and lost its activity chart and footer at
  1280×720 — 780 px is the number to design away from (item 16).
- **`requestLevelUp` does not exist** on `buildings.api` (it has `setLevel(id, n)`), and `world.zones.freeLots` is a
  core stub returning `[]` until the zoning module installs its own — a silent no-op path that looks fine in the
  showcase and does nothing in the real game.
- **Green static hedges / lollipop trees.** 8 % alpha-cut noise on a jittered box, icosahedron canopies, stacked
  cones; fine at 400 m, obvious programmer art inside 40 m.
- **The opaque bar wall.** Three rows of 30 bars at the same height in a line: the front row hides the other two from
  every camera except the one preset that was tuned for it.
- **Cross-module DOM coupling.** Mounting the panel into `#ui` and importing `../ui/fonts/*.woff2` breaks the moment
  the ui builder refactors, and is outside this module's blast radius in spirit if not in letter.
- **Tick-drop warnings in the JSON.** `MAX_TICKS_PER_FRAME` firing puts a warning in every shot; a shot with warnings
  is not a clean shot.
- **Emissive brighter than what it lights.** r1's bar caps glowed with no pool of L ≥ 120 underneath (item 21's
  three-pool floor is the measurement); `BUILDER.md` carries the generic version of this mode.

## 7. Dependencies and their real APIs

`dependencies: []`. Everything below is optional and must be reached through `?.` inside try/catch; the numbers must
keep flowing when it is absent.

Core (`src/core/`, exact signatures):
- `ctx.rng` — `float()`, `range(min,max)`, `int(min,max)` *inclusive*, `bool(p)`, `pick(arr)`,
  `weighted([[v,w],…])`, `gauss()`, `shuffle(arr)`, `fork(label)`. The only randomness source.
- `ctx.events` — `on(name, fn, owner)` → unsubscribe fn, `once`, `off`, `offOwner(owner)`, `emit(name, payload)`.
  Always pass `'simulation'` as owner so `dispose()` is clean.
- `ctx.clock` — `hour`, `day`, `speed`, `paused`, `set(hour)`, `setSpeed(n)`, `pause()`, `resume()`,
  `sunElevation(hour)`, `sunAzimuth(hour)`, `isNight(hour)`, `dayLengthSeconds` (600).
- `ctx.assets` — `await pbr(name, {repeat:[u,v]})` → `{map, normalMap, roughnessMap, aoMap, …}`; `hdri(name)`;
  `gltf(url)`; `procedural.noiseTexture(opts)`, `procedural.gradient({size,stops,horizontal,srgb})`,
  `procedural.noiseNormal({size,seed,scale,strength})`, `procedural.solid(hex,size)`. Every loader resolves even on
  failure, with a procedural fallback and a `log.warn`.
- `ctx.engine` — `stats`, `onBeforeRender(fn)`, `onAfterRender(fn)`. Never `renderer.render`, never `setComposer`.
- `ctx.camera` — `presets`, `apply(name|{position,target})`, `registerPreset(name, preset)`, `flyTo(preset, s)`.
- `ctx.registry`, `ctx.quality`, `ctx.headless`, `ctx.log.info/warn/error`, `ctx.group` (your only scene parent).

Neighbours — call exactly these, degrade as stated:
- `environment` (always present in a showcase): read `world.weather.{night, skyLight, sunDir, fogDensity, exposure,
  wind}`; call `ctx.modules.environment?.setupMaterial(material)` for every custom `ShaderMaterial` you create and
  `hookScene()` once after staging so CSM and fog uniforms are wired. **Never** set `toneMapping`,
  `toneMappingExposure` or `scene.fog` yourself. Degrade: if `world.weather.night` is undefined use
  `ctx.clock.isNight() ? 1 : 0`.
- `zoning`: `ctx.modules.zoning.freeLots()` → `[lot]`, `lotAt(x,z)`, `cellAt(x,z)`, `stats()`. Degrade: `world.zones.freeLots?.()`,
  then the internal `VirtualCity`.
- `buildings`: `requestSpawn(lot)` → id or −1, `setLevel(id, n)`, `demolish(id)`, `get(id)`, `at(x,z)`, `count()`,
  `flush()`, `spawnFreeLots(limit)`, `stats()`. Note `requestSpawn` takes **one** argument — put the density on the
  lot object. Degrade: `VirtualCity`.
- `services` (stub today): `world.services.coverage(kind, x, z)` → 0..1 with
  `kinds = ['power_coal','power_wind','power_solar','water_pump','sewage','landfill','incinerator','clinic','hospital','school','high_school','university','police','fire','park_small','park_large','plaza']`.
  **Derive the utilities from that enum, not from invented kinds:** `power = max(power_coal, power_wind, power_solar)`,
  `water = min(water_pump, sewage)`, `garbage = max(landfill, incinerator)`. `coverage('power')`, `coverage('water')`
  and `coverage('garbage')` — what economy.js:420-421 asks for today — are **not** valid kinds, so a real services
  module returns 0 for all three forever and the integration is dead on arrival. (infoviews' spec derives `power` the
  same way, so the two agree.)
  Degrade: `coverage()` returns 0 ⇒ treat utilities as satisfied by an "outside connection" baseline so the showcase
  still grows, but the `blackout` scenario (item 6) must be able to force real starvation — which is why it flips
  `servicesActive()` as well as zeroing coverage.
- `roads`: `world.roads.edges` (Map of `{id,a,b,type,lanes,width,length,…}`), `world.roads.nodes`,
  `world.roads.types[t].speed`. Used for road upkeep and traffic noise. Degrade: `VirtualCity.km`.
- `traffic` (stub today): `world.traffic.stats.congestion` 0..1. Degrade: 0.
- `ui`: never imported. Communicate only through `ui:action` (`setTaxRate`, `setSimSpeed`, `takeLoan`, `repayLoan`,
  `save`, `load`) and the events in §2. `ctx.modules.ui?.toast?.()` is allowed for the milestone toast but must be
  optional-chained.
- `core/save.js` calls `api.serialize()` / `await api.deserialize(data)` in registry dependency order; simulation
  deserialises **before** `services`, so re-derive coverage-dependent state lazily on the first `services:changed`
  rather than assuming coverage is available at load time.

## 8. Showcase

`showcase.description` must name what is staged. `showcase.setup(ctx)` stages this and nothing else:

- **Data terrace**, ≤ 200 × 140 m: paved plaza (running-bond slabs with per-slab tone and grime — keep, it worked),
  kerb, two gravel approach paths, planting beds. Ground beyond the terrace ≤ 900 m across and fully faded into the
  fog/sky colour before its edge — no 6 km plane, no visible boundary.
- **Three data rows** of 30 bars each (population / jobs / treasury, last 30 days), stepped in height or fanned so all
  three read from the `stats` camera; bars ≤ 1.8 m wide with ≥ 2.4 m gaps; basalt plinths with label strips on the
  front *and* top faces.
- **Four RCI pillars** (residential green, commercial blue, industrial orange, office purple) on their own plinth,
  heights driven live by `world.economy.demand`, with the percentage on the plinth.
- **The statistics panel**, mounted on `#sim-ui`, live at ×20 during a run and frozen to the requested hour under
  `?time=` (item 10).
- Enough planting/backdrop to satisfy items 20 and 24 and nothing more.
- A deterministic pre-roll of `PREROLL_DAYS` (= 60) days so the history is a story, landing on an exact tick (item 10).
- `api.showcaseProbe()` (item 23), returning bar/pillar screen-space rects and per-element occlusion for the camera
  currently applied. It is part of the staged scene, not a debug afterthought: without it item 23 cannot be graded.
- `api.cropRects({ project, width, height, camera })` → `{ panel: [x, y, w, h], horizon: [x, y, w, h] }` in pixels of
  the full-resolution capture, collected by `window.__sim.cropRects()` and written to `<out>.crops.json` by
  `tools/screenshot.mjs … --crops` (ARCHITECTURE §8 — the authoritative producer of that file). `panel` is `#sim-ui`'s
  `getBoundingClientRect()`; `horizon` is 48 px tall, centred on the row of `project(cam.x + 1e5·f.x, 0,
  cam.z + 1e5·f.z)` with `f` the camera forward flattened to the ground plane — the vanishing row of `y = 0`.
  Items 19–21 measure against these two rects; a shot without them is ungradeable.

**The virtual city's district geometry is contract for item 14.** `virtualcity.js`'s `DISTRICT` table places office
within 160 m of the origin, commercial within 260 m, residential in the west/south arc at 120–640 m, and industrial in
a ±0.7 rad wedge about **+x** at 300–720 m — i.e. downwind of the default `world.weather.wind = {x:1, z:0}`. Item 14's
land-value gradient and its 2× downwind pollution ratio are measured against exactly that layout. You may retune the
radii, but a rewrite that removes the spatial separation of office/commercial from industry, or that moves industry
off the downwind axis, fails item 14 — and requires a note in `docs/core-requests/simulation.md` explaining what
replaced it.

Declared `showcase.cameras` — exactly these three names; retune the numbers if a shot demands it, keep the intent:

```js
cameras: {
  stats:   { yaw: 0.45, pitch: 0.40, distance: 190, target: [0, 6, 0] },   // whole composition, panel in the left third
  pillars: { yaw: 1.05, pitch: 0.22, distance: 60,  target: [40, 5, 40] }, // RCI pillars + plinth labels legible
  terrace: { yaw: 2.35, pitch: 0.12, distance: 45,  target: [-20, 3, 10] },// street level along the rows; night pools
}
```

How it must read at each standard camera × time (critics shoot noon and night by default plus golden hour; the full
matrix is `aerial, street, skyline, closeup` × `06.5, 12, 17.5, 22`, plus the three presets at 12 and 22, plus one
`stats` frame at 1280×720):

| | 06.5 golden hour | 12 noon | 17.5 late afternoon | 22 night |
|---|---|---|---|---|
| **aerial** (520 m) | Long soft shadows from bars and planting across the terrace; ground warm and non-repeating (item 19) | Whole composition legible; three rows distinct; no lattice; horizon faded (item 20) | Warm rim light on the plinths; no blown sky | Terrace dark (mean ≤ 48) with the sculpture the only light source; ≥ 3 pools |
| **street** (60 m) | Rim-lit bar faces, contact AO at every plinth base | Paving slab tone variation readable; panel legible | Best light: keep the r1 warm side light | Glass bars glow and *light the paving under them*; ground L ≤ 58 |
| **skyline** (900 m) | Haze gradient, no razor horizon | Same, ΔL ≤ 12 across the horizon (item 20) | ≤ 1.5 % blown pixels, mean ≤ 150 (item 22) | Deep blue sky with stars; terrace a lit island |
| **closeup** (110 m) | Bar cap highlights, floor lines, plinth labels | Materials hold at 20 m: no icosahedron facets, no alpha-cut static (item 24) | Warm side light on the bar wall | Every lit bar cap sits over a pool of L ≥ 120 (item 21) |

Also required in the round's evidence: `--showcase all --camera aerial --time 12` proving the module contributes
0 draw calls to the integrated game (`ctx.group.children.length === 0`, not the frame total — item 25) and that the
panel does not collide with the `ui` HUD; the item 12/13 staging probe; and the item 26 liveness probe at
`speed=20` with no `time=`, which no screenshot can stand in for. The `aerial_*` and `skyline_*` frames are shot with
`--crops`, since items 19–21 measure against the two rects in `<shot>.crops.json`.
