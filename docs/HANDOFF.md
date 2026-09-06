# HANDOFF

Everything needed to pick SimBuild up cold. Written 2026-09-06, at the end of the session that built it.

---

## 1. Start here (60 seconds)

```bash
cd /home/user/SimBuild          # or wherever the repo is cloned
npm install                     # node 22, ~1 min
./tools/devserver.sh            # idempotent: starts Vite on 127.0.0.1:5173, no-op if already up
node tools/screenshot.mjs --showcase all --time 17.5 --camera skyline --out shots/smoke.png
```

If that last command prints `OK … errors=0`, the project is healthy. Open `shots/smoke.png` and look at it.
In a browser, `http://127.0.0.1:5173/` is the game; `?showcase=<module>` stages one module alone.

**The single most useful thing to read next is `docs/STATUS.json`** — it is the resumable state of the whole
project. `modules[].next` tells you, per module, whether a build or a critic round comes next and which round
number. `node tools/status.mjs` recomputes it from `docs/builds/` and `docs/critic/`.

## 2. What this is

A Cities: Skylines II–class city builder in Three.js r185 + Vite, plain ES modules, built by orchestrated agents.
The brief that started it is preserved verbatim at `docs/BRIEF.md`; the contract every module obeys is
`ARCHITECTURE.md`. Read both before changing anything structural.

Map of the documentation, in the order a newcomer should read it:

| File | What it is |
|---|---|
| `docs/BRIEF.md` | the originating instruction, verbatim |
| `ARCHITECTURE.md` | **the contract**: world data model (§3), module contract (§4), events (§5), core APIs (§6), showcase/URL params (§7), the verification loop (§8), budgets (§9), asset policy (§10), quality bar per module (§12), scoring (§13), verdict files (§14), completeness additions (§15) |
| `docs/prompts/README.md` | the prompt library and how the orchestration uses it |
| `docs/prompts/PROMPT-STANDARD.md` | how prompts here are written and scored — including the finder/scorer split, which matters more than it sounds |
| `docs/STATUS.json` | live state: scores, open issues, per-module next phase |
| `docs/BUILDER-GUIDE.md` | the short practical version for someone writing module code by hand |

## 3. Where it actually stands

**Honest summary: the engine, the verification loop and the agent apparatus are done and work. The game is
roughly half built. No module has passed the 8.5 gate yet.**

Wave 1 (foundation) and wave 2 (the city) have both had rounds; wave 2b and 3 have not started.

| Module | Score | Round | Next | Note |
|---|---|---|---|---|
| environment | 7.0 | r2 | build r3 | sky/sun/moon/stars/clouds/CSM/PMREM; blows out toward the sun at golden hour |
| ui | 7.0 | r1 | critic r2 | full CS2-style HUD, menus, save/load, minimap; r2 build already done |
| zoning | 6.5 | r1 | build r2 | only module to pass its API contract; overlay is opaque and floats above ground |
| simulation | 6.5 | r1 | build r2 | economy, demand, activity curves, grids |
| terrain | 6.0 | r1 | critic r2 | r2 build done: land cover, erosion, water reflections |
| roads | 6.0 | r1 | critic r2 | r2 build done: sunken carriageway and bridge abutments fixed |
| effects | 6.0 | r1 | build r2 | AO/bloom/grade/DOF composer |
| buildings | 6.0 | r1 | build r3 | r2 build done; **this is the best-looking thing in the project** — see §6 |
| tools | 5.5 | r1 | build r2 | road drawing, zoning brush, bulldoze, sculpt |
| props | 5.0 | r1 | build r2 | r2 in progress when the session ended; first module to implement `api.cropRects` |
| traffic | 5.0 | r1 | build r2 | vehicles, routing, signals |
| audio | — | r1 built | critic r1 | never critiqued |
| services, infoviews, transit, democity | — | stub | build r1 | not started |

`democity` is still a stub, so `?showcase=all` shows terrain + roads + HUD, not a city. The city you can see today
is `?showcase=buildings`.

**The dominant theme in the last round:** four of five wave-2 modules failed their API contract, not their visuals.
The module specs were written from the earlier critic reports and demand APIs the round-1 builders never had
(props was missing 10 of 15 members, tools 12 of 24, traffic 9 plus 5 with wrong shapes). Round 2 is therefore
mostly API work. **If round 2 also fails on APIs, suspect the specs over-reached rather than assuming five
builders in a row under-delivered.**

## 4. How to continue the loop

The orchestration is a Workflow-tool script, versioned at `tools/workflows/wave.js`. To run the next wave:

```js
Workflow({ scriptPath: 'tools/workflows/wave.js', args: {
  wave: 2, integrate: true, roundsPerRun: 2,
  modules: [                                   // take these from docs/STATUS.json → modules[].next
    { name: 'props',     phase: 'build',  round: 2 },
    { name: 'traffic',   phase: 'build',  round: 2 },
    { name: 'tools',     phase: 'build',  round: 2 },
    { name: 'zoning',    phase: 'build',  round: 2 },
    { name: 'buildings', phase: 'build',  round: 3 },
  ],
  notes: 'cross-cutting observations you want every builder in this wave to act on',
}})
```

The generated prompts are deliberately thin: they name the role file (`docs/prompts/BUILDER.md` or `CRITIC.md`)
and the module spec (`docs/prompts/modules/<name>.md`), and nothing else. **If you want to change how all builders
behave, edit the role file, not the workflow.**

Remaining sequence: finish wave 2 → wave 2b (`services`, `infoviews`) → wave 3 (`democity`, `transit`) →
whole-game critic (`docs/prompts/WHOLE-GAME-CRITIC.md`) → blind A/B judging (below).

Blind judging is built but never run:

```bash
node tools/blindpairs.mjs --pairs pairs.json --out /tmp/blind/run1 --key /tmp/blind/key1.json --seed 7
```

`pairs.json` is `[{label, ours: "shots/....png", ref: "<cs2 jpg>"}]`. Both images are re-encoded to identical
format, size, quality **and byte length**, named only `A.jpg`/`B.jpg`, with a balanced seeded assignment; the key
lands outside the judge's directory. Give a judge `docs/prompts/BLIND-JUDGE.md` and the directory, nothing else.

## 5. Things that will bite you

- **No GPU here.** WebGL is SwiftShader. A 1080p frame takes 3–10 s, a capture 30–170 s under load. `fps` in the
  logs is *relative only* — the ≥50 fps budget has **never been verified** and `fpsGpu` is null in STATUS.json.
  On real hardware: `SIM_GL=metal` (Apple Silicon) or `SIM_GL=gl`, and check `gpuRenderer` in the JSON actually
  says Metal and not SwiftShader. `SIM_HEADED=1` forces a real window if headless falls back to software.
- **Only 2 agents run concurrently** (4 CPUs, cap is `cpus-2`). That, not cleverness, is the throughput limit.
- **Session usage limits killed three runs.** Everything is resumable by design — relaunch from
  `modules[].next` and at most one round is lost. `roundsPerRun` caps how much one module can eat of a window.
- **The container restarts.** It happened once and took a whole wave with it. Work on disk survives; run
  `./tools/devserver.sh` first thing after any restart, because a dead server fails every round in flight.
- **Two failure modes look identical to a broken module** and both are fixed, but know the shape: a heavy
  showcase timing out before `ready` (readiness now accepts 3 frames in headless), and `page.screenshot` timing
  out because the render loop hogs the main thread (the tool now calls `window.__sim.freeze()` before capturing).
  Symptom in both cases: failed shot, empty log, zero console errors.
- **CS2 reference images are not in the repo** (asset policy) and lived in a session scratchpad that is now gone.
  Re-fetch them from the Steam store API for app 949230 — the URLs are recorded next to
  `docs/reference/CS2-LOOK.md`. Critics need them to calibrate every round.
- **125 residual spec defects** are tracked in `docs/prompts/_review/residual.json` — unmeasurable acceptance
  items and arithmetic nits in specs that passed anyway. A critic **must not** fail a builder on anything listed
  there as unmeasurable.

## 6. What to look at first

```bash
node tools/screenshot.mjs --showcase buildings --time 12 --camera aerial --out shots/look.png
```

That is the best frame the project produces: downtown towers, mid-rise ring, suburbs, industry, a river with two
bridges, a coastal highway, crosswalked intersections. 170 draw calls, 1.5 M triangles, zero errors. It is also the
honest measure of the gap to CS2 — the critic scored the module that renders it a 6.0.

## 7. One methodological finding worth keeping

An adversarial reviewer is excellent at finding defects and unfit to award a score. Measured here: the same 16
specs scored **8.0 with "buildable: false" 16 times out of 16** from an adversarial reviewer, and **9.0–9.5 with
"buildable: true"** from a blind calibrated one, while a deliberately weak control scored 3.5–4.0. Conflating the
two roles builds a gate nothing can pass.

So the two roles are split (`PROMPT-STANDARD.md` → "How to review a prompt"), and every scoring batch carries
`docs/prompts/_calibration/weak-props.md` unlabelled: **if the control scores above 5, discard that batch's
scores.** The same caution applies to the module critics — where a critic's score and its ranked issue list
disagree, trust the issue list.
