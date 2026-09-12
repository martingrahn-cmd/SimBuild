# R12 MVP repair — traffic purpose, early settlement, daylight and reports

Date: 2026-09-12

## Decision

Accept four bounded player-facing repairs. Critic scores stay unchanged: Traffic 7.2 FAIL, Simulation 6.5 FAIL, UI 7.0 FAIL and whole game 6.0 FAIL. These changes address reported playability defects but do not establish visual parity, sustained performance or final human approval.

## Accepted

- Removed the normal-play leak of the hard-coded traffic showcase fleet. The eleven catalogue specimens now render only in `showcase=traffic`; the player view at the exact catalogue road/camera coordinates contains no phantom row.
- Replaced the small-city six-vehicle floor and forced one-of-every-class seeding. A 22-resident residential-only fixture now has 7 vehicles, no box trucks or semis, while an empty isolated road remains exactly zero.
- Added deterministic land-use purposes. Occupied frontage is tracked separately for residential, commercial, office and industrial buildings; routes seek appropriate active frontage and heavy vehicles are confined to freight/delivery purposes. A mixed fixture produces commute, return-home, customer and freight traffic, repeats byte-for-byte, and restores exactly through Traffic serialization.
- Added a settlement-only move-in rate for population below 150. A fixed new-hamlet fixture reaches 28 residents after 0.25 day and 97 after one day, repeats exactly, and retains the established rate from 150 onward. A tested global 1.35 rate was rejected; it needlessly changed established-city balance.
- Added **Always daylight** to Settings. At clock 23:00 the display hour is 12 and night factor 0 while 100 direct simulation ticks advance. The preference persists locally and also drives transit lighting and ambient audio presentation.
- Added **Report a bug** to main and pause menus plus `.github/ISSUE_TEMPLATE/bug_report.yml`. The button opens the SimBuild GitHub issue form with the visible New Dollarton version in the title.

## Verification

- `npm run build`: PASS, Vite 8.2.2, 164 modules.
- `tools/playtest-traffic-causality.mjs`: PASS, errors 0; empty 0; residential 22 → 7 vehicles/no heavy freight; mixed-use purposes present; exact repeat and restore; dead-end U-turn and portal turnover retained.
- `tools/early-growth-probe.mjs`: PASS, errors 0; 28/56/97/128 residents at 0.25/0.5/1/2 days; deterministic.
- `tools/daylight-lock-probe.mjs`: PASS, errors 0; actual hour 23, display hour 12, night 0, simulation +100 ticks.
- Simulation 90-day self-test: PASS exact determinism and save/load.
- Catalogue visual inspected: `shots/playtest-checkpoint-2026-09-12/pt23-catalogue-fixed.png` contains no parked model row.
- Daylight visual inspected: `shots/playtest-fixes-r12/daylight-at-23.png` is readable at the displayed 23:00 clock.

## Remaining MVP gates

1. Human replay of the same small city is still required to confirm traffic density and population feel; the deterministic fixtures cannot grade feel.
2. Close-range car, van and truck art remains visibly provisional.
3. Prefab roundabout placement, manual service-building rotation and a visible buildable-frontage limit remain missing usability features.
4. Base night readability and river surface quality remain below the visual bar; Always daylight is a player option, not a repair of those scenes.
5. Cold startup is still several seconds despite the honest early loading view.
6. Sustained 50 fps, memory, city density, transit/traffic interaction and exact Props restoration retain their recorded failed gates.

## Follow-up: manual service rotation

Accepted after the same R12 gate. While placing any service building, **R** rotates the footprint 45 degrees and keeps that manual heading as the cursor moves. Automatic road-facing placement remains the default after selecting a new service. The service owner still validates and stores the final heading, so capacity, coverage and restore behavior are unchanged. `tools/service-rotation-probe.mjs` verifies 0→45 degrees, persistence after cursor movement and errors 0.
