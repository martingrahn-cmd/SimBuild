# Human playtest fixes R10 — 2026-09-11

R10 is a bounded player-feedback checkpoint built from the accepted R9u source. It repairs the reproduced opening-play defects without changing the recorded critic scores. The whole-game score remains **6.0/10 FAIL**, blind A/B remains **0–4 versus CS2**, and no module is promoted by this work.

## Accepted changes

- **Traffic causality and dead ends:** isolated roads without frontage or explicit map portals no longer generate traffic. Ordinary two-way dead ends extend routes over the reverse edge for a deterministic U-turn; only explicit border portals remain invisible lifecycle boundaries.
- **Distant traffic:** full vehicle geometry remains visible farther away, while headlight ground cones end sooner and far lamp glow grows less aggressively. The inspected night capture no longer shows the previous chains of merged light streaks.
- **Player controls:** the toolbar now has an explicit Select / Inspect tool. Escape returns to it. Road guidance distinguishes Finish & build, Undo point and Undo built road; first-use zoning guidance explains painting cells beside roads and automatic growth.
- **Starting utilities:** power, water and garbage construction are available at Hamlet. A new city buys visible outside imports for all three utilities at **105/day** plus per-capita cost. Each import ends only when its own complete local replacement exists; water requires both pump and sewage outlet. The statistics UI shows active imports and their cost.
- **Construction and early growth:** newly spawned ordinary buildings pass through a deterministic visible foundation/frame/scaffold phase lasting about 1.2–4 game hours. The state survives save/load and contributes no housing or jobs before completion. Early move-in and growth rates were raised from 0.55 to 0.82 and 5 to 7.5 per hour.
- **Trees and ambience:** foliage wind advances in render time at the same rate across simulation speeds and freezes while paused. Night crickets start later, play quieter and use a darker filter; birds remain active by day.
- **Loading feedback:** the application renders a loading shell immediately and advances a real progress bar from module, asset and world-ready events. This test measured the shell at 55.8 ms and the main menu at about 3.16 s; the underlying load remains a later optimization target.

## Verification

- `npm run build`: PASS, Vite 8.2.2, 163 modules.
- Normal entry and save/load: PASS, 16 modules ready, zero runtime errors, gameplay toolbar visible, save/load/delete and camera restore pass. The previously disclosed Props semantic round-trip mismatch remains; all other tested module payloads and time are equal.
- Traffic contract: PASS — empty isolated road has 0 vehicles; ten test vehicles remain in the network through repeated two-way dead-end turns; explicit border portals retain spawn/despawn behavior.
- Utility/UX contract: PASS — initial import state/cost, partial replacement, complete replacement, pointer state and revised hints pass.
- Construction contract: PASS — mid-build state restores exactly and completed capacity enters the economy only after completion.
- Ambient contract: PASS — wind phase delta is 0.647535 at both 1× and 4×, paused delta is 0; noon crickets are 0, night crickets 0.0823 with 3036 Hz cutoff.
- Loading contract: PASS — sampled real stages 2%, 22%, 33%, 37%, 69%, 82% and 100%; no synthetic looping progress.

## Evidence

- `shots/playtest-fixes-r10/traffic-causality.json`
- `shots/playtest-fixes-r10/distant-traffic-night.png`
- `shots/playtest-fixes-r10/ux-utilities.json`
- `shots/playtest-fixes-r10/construction.json`
- `shots/playtest-fixes-r10/construction-phase.png`
- `shots/playtest-fixes-r10/ambient.json`
- `shots/playtest-fixes-r10/loading.json`
- `shots/playtest-fixes-r10/loading-shell.png`
- `shots/playtest-checkpoint-2026-09-10/verification.json`

## Remaining work

Human retesting must judge the feel of the new opening pace, construction duration, U-turn presentation, cricket mix and distant vehicle readability. The portal/GitHub bug-report function is still a documented proposal. Performance, memory, city scale, Props exact serialization, transit art/collision ownership and the existing visual critic failures remain open.
