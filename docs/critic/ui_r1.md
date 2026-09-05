# ui — critic round 1

**Score: 7.0 / 10 — FAIL** (pass needs ≥ 8.5, zero errors, status ready everywhere, draws ≤ budget, API contract OK).

Errors 0, ui status `ready` in every real frame, max draw calls 11 (budget 16). The API contract is **not** met: the HUD
overflows its own containers at 1280×720 (toolbar-left content overlaps the tool buttons, sub-panel overlaps the info panel)
and the RCI demand box overflows into the status strip at every resolution. Visually the HUD is a credible CS2 layout with
AA-level polish in places (notifications, info panel, status strip) but it is dragged down by placeholder asset cards, muddy
locked icons, a per-frame layout bug in the most looked-at corner, and a programmer-art backdrop that sits under every shot.

## How this was verified

- `node tools/gauntlet.mjs --module ui --round 1` (16 shots) plus `ui` preset at 12 and 22, an aerial at 1280×720, and
  `shots/ui/r1/apicheck.mjs` (Playwright: DOM presence, `ui:action` emission, clock buttons, overflow at both resolutions).
- Every PNG was viewed; HUD regions were inspected at 2–3× (`shots/ui/r1/crops/`).
- Two gauntlet frames (skyline_17p5, skyline_22) came back as the SimBuild loading splash. Cause: the effects builder saved
  `src/modules/effects/passes.js` (19:52:01) and `index.js` (19:52:32) during those shots, triggering Vite full reloads.
  skyline_22 was even reported `OK draws=11` because the reloaded page's early `window.__sim` satisfied the post-screenshot
  evaluates — summary.json "ok" does not prove a real frame. Both were re-shot and are real frames now (sizes 1.0–1.4 MB
  vs 342 KB for the splash). Not a ui defect; noted for the tooling owners.
- `git status`: the ui builder's work is inside the shared WIP commit 35e1a3b; ui-attributable paths are
  `src/modules/ui/`, `public/assets/*` (+manifest), `docs/core-requests/ui.md`, `docs/builds/ui_r1.json`, `shots/ui/`. The
  uncommitted modifications in the tree belong to the effects/roads/terrain builders. No `Math.random` in the module; one
  `performance.now()` in the dev-corner fps counter (profiling only, allowed).

## Numbers

| metric | value |
|---|---|
| shots | 16 gauntlet + 5 extra (2 re-shoots, ui_12, ui_22, aerial_12_720p) |
| console errors | 0 in every shot and in the apicheck (1080p and 720p) |
| module status | ui `ready` in every real frame (initMs 6–7) |
| draw calls | 11 in every shot (budget 16; environment 7 + backdrop 4) |
| triangles | 219,044 |
| fps (SwiftShader, relative only) | 10–14.5 |
| font | Aileron loaded (`document.fonts.check` true) |

## API contract

| check | result |
|---|---|
| toolbar / HUD / info panel / notifications exist as DOM | OK — `.sb-toolbar`, `.sb-status`, `.sb-info` (visible), 3 `.sb-note`, 14 tool buttons, 5 cards, RCI, dev corner |
| buttons emit `ui:action {action, args}` | OK — category, selectAsset, overlays, help, focus, dismissNotification, toolOption all observed |
| clock buttons change speed | OK — 4×/2×/1× set `clock.speed` 4→2→1; play/pause toggles `paused`; emits setSpeed/pause/resume |
| no layout overflow at 1920×1080 | OK for viewport bounds; **RCI box content overflows its 46 px container into the status strip** (`shots/ui/r1/crops/aerial_12_rci.png`) |
| no layout overflow at 1280×720 | **FAIL** — `.sb-toolbar-left` content ends at x=338 while `.sb-tools` starts at x=275 (63 px overlap, RCI bars drawn under the Roads button); `.sb-info` (x 12–384) is covered by `.sb-subpanel` (x 250–1030): bars and the Demolish button are hidden (`shots/ui/r1/aerial_12_720p.png`, `crops/aerial_12_720p_panels.png`) |

Verdict: **apiContractOk = false**.

## Per-shot notes

| file | what I saw |
|---|---|
| aerial_6p5.png | Full HUD over the block grid; long shadows; RCI "O" row spills below the toolbar; locked service icons grey mush |
| aerial_12.png | HUD identical (static DOM); backdrop goes flat at noon — no shadows, uniform olive ground |
| aerial_17p5.png | Warm, slightly muddy frame; weather chip still sun (correct); notifications restamped 16:06/16:53/17:17 |
| aerial_22.png | Night: per-window emissives on, moon icon in chip; no street lamps or road light pools; grass too bright for 22:00 |
| street_6p5.png | Icosahedron-blob trees and box facades fill the frame — programmer art; HUD reads well over it |
| street_12.png | Same; flat repeating lawn; trees look like green rock candy |
| street_17p5.png | Same, dimmer |
| street_22.png | Windows lit but trees glow full daytime green at night; dev-stats box loses contrast over lit windows |
| skyline_6p5.png | Small city on an infinite plane, hazy; HUD fine |
| skyline_12.png | Same, cooler light |
| skyline_17p5.png | (re-shot) heavy warm haze, washed horizon — environment, not ui; HUD unchanged |
| skyline_22.png | (re-shot) stars, lit cluster; HUD unchanged |
| closeup_6p5.png | Box facades with a coarse window-grid shader; kerb/sidewalk strips present; blob trees |
| closeup_12.png | Same; sidewalks read as pale strips, no kerb height readable |
| closeup_17p5.png | Same, warm |
| closeup_22.png | Lit windows look decent at this range; trees still day-green |
| ui_12.png | Module preset: towers dominate; HUD panels all open and legible; cards look like placeholders at this size too |
| ui_22.png | Night preset: best-looking backdrop frame; HUD contrast excellent on dark |
| aerial_12_720p.png | **Toolbar-left overlaps tool buttons; sub-panel covers the info panel** |

## Ranked issues

1. **[major] RCI demand box overflows into the status strip in every frame.** `.sb-rci` is 46 px tall (34 px content) but
   holds 4 rows × 12.5 px + 3 × 3 px gap = 59 px; the "O" row renders ~25 px below the toolbar, over the status strip.
   Fix: 4 px bars with 8 px labels and 1 px row gap (≈ 4×8+3 = 35 px), or make the bars 2×2 columns like CS2, or clip with
   `overflow:hidden` as a stopgap. Evidence: `shots/ui/r1/crops/aerial_12_rci.png`, every gauntlet PNG bottom-left.
2. **[major] Layout breaks at 1280×720.** Toolbar-left (milestone chip + RCI, ~326 px) cannot shrink (`min-width:150px`
   on RCI, fixed 120 px XP bar) and overlaps the centred 730 px tools group by 63 px; the 780 px sub-panel overlaps the
   372 px info panel. Fix: collapse the milestone chip to badge-only and hide the XP bar below ~1500 px; let the tools group
   shrink (40 px buttons, 2 px gap) or scroll; move the info panel above the sub-panel or cap the sub-panel width to
   `min(780px, 100vw - infoPanelWidth - 36px)` when the info panel is open. Evidence: `shots/ui/r1/aerial_12_720p.png`.
3. **[major] Asset cards are flat schematic rectangles, not thumbnails.** "Alley" is a grey box, "Gravel Road" a tan box.
   CS2 cards are small perspective renders on a dark card with a hover glow. Fix: render a 92×56 thumbnail per card from
   the actual road/prop/zone geometry into a canvas once (offscreen renderer, cached), or at minimum draw isometric SVG
   tiles with kerb, sidewalk, lane paint and a shadow. Evidence: `shots/ui/r1/crops/aerial_6p5_subpanel.png`.
4. **[major] Locked service icons are desaturated mud.** `.is-dim svg {opacity:.45; filter:saturate(.3)}` turns the
   8 service icons into grey blobs; CS2 keeps every toolbar icon vivid and communicates locked state with a small lock badge
   and tooltip. Fix: full-colour icons, opacity ~0.75, 10 px lock badge bottom-right, tooltip "Unlocks at Small Village".
   Evidence: `shots/ui/r1/crops/aerial_6p5_dock_mid.png`.
5. **[major] Showcase backdrop is programmer art and sits under every ui shot.** Icosahedron-blob trees (flat-shaded,
   vertex-coloured, glowing green at night), box facades with a coarse window shader, no street lamps at night, flat noon
   lighting. It is only a backdrop, but the critic sees it in 21/21 frames. Fix: reuse `props`/`buildings` meshes when
   those modules land; until then use a proper low-poly tree (billboard cross or canopy card with alpha), darken the tree
   colour with the night uniform, add lamp sprites along the kerbs at night. Evidence: `shots/ui/r1/street_12.png`,
   `shots/ui/r1/street_22.png`.
6. **[major] §15 UI scope missing.** No main menu, pause menu (Esc only closes panels), save/load panels, milestone toast,
   minimap or photo mode (the camera button just emits `photomode`). Round 1 was toolbar/HUD, so this is not counted as
   a hard failure, but it must be planned for round 2.
7. **[minor] Sub-panel tabs read as plain text.** "Intersections" and "Road services" have no tab affordance next to the
   blue "Roads" pill; CS2 uses icon tabs in a tab row. Give inactive tabs a subtle background and an icon.
8. **[minor] Dev corner always on.** `dev: true` unconditionally; "0 fps" under SwiftShader looks broken and CS2 has no
   such corner. Gate behind `?dev=1` or the backtick key, and show "—" when no frames were counted.
9. **[minor] Status-strip happiness shows three faces with one lit.** CS2 shows a single face that changes expression;
   three faces waste 60 px and read as a control. Use one face.
10. **[minor] Info-panel secondary buttons lack affordance.** "Policies" and "Demolish" have no visible border/background
    at 1× (only on hover), so they read as labels. Give them the same 1 px border as the Focus button.
11. **[minor] Toolbar-right cluster is thin.** Three round buttons in 569 px; CS2 fills that side (map, statistics, camera,
    citizens, journal). Add the citizens/journal/settings entries so the bar reads balanced.
12. **[minor] Money/pop chip icons are undersized (18 px) against 13 px text and the trend arrows are 10 px.** CS2 chips
    use ~22 px icons; bump icon size and give the trend value its own muted chip.

## Strengths to preserve

- Layout skeleton is genuinely CS2: bottom toolbar + status strip, milestone chip left, colourful category icons centred,
  round buttons right, clock/date/season/city/pop/happiness/money chips, top-right notifications, left info panel, blue accent.
- Notifications: typed accent bar, icon disc, right-aligned timestamps that move with game time, escape-safe HTML,
  auto-dismiss driven by `dt` — the best panel in the HUD.
- Info panel: header with type pill, level stars, right-aligned tabular numbers, status bars, action row.
- Tool option box (Tool Mode / Elevation / Snapping) and the key-hint pill match CS2's road-tool UX.
- Engineering: pure DOM (0 in-game draw calls), every interaction emits `ui:action`, safe optional calls into `tools`,
  Esc/Space shortcuts, bundled CC0 font, zero errors, 6 ms init, no `Math.random`.

## Verdict

7.0, FAIL. Fix issues 1–4 (all cheap CSS/SVG work) and the HUD alone would sit around 8; passing 8.5 additionally needs a
backdrop that does not look like 2012 and the §15 screens.
