# Wave 3 final integration checkpoint — 2026-09-08

Current round3 integration is complete. **Paused by the user: no round4 or next wave.** This is a correctness checkpoint, not a whole-game quality pass. Independent frozen r3 verdicts remain **democity6.0/10 (API false)** and **transit6.8/10 (API true)**, both below8.5. No overall score or blind result has been invented.

## Changes and validation

- Applied32guarded replacements across8production files: src/modules/tools/index.js, tools/tools.js, ui/index.js, ui/hud.js, simulation/index.js, simulation/economy.js, src/core/save.js and src/main.js.
- Native transit draft adapter forwards stop picks/hover, Enter commit and Escape/stationary-right cancellation to owner APIs; private markers use the actual road route. Right drag remains camera orbit. Removed invented2500construction charge.
- Original pointer ID/button and movement threshold guard world input; modal, foreign-pointer, cancellation, capture loss, blur and leave cannot create phantom commits.
- Fixed synchronous line-panel open/toggle race,6000unlock guards, native New line/Edit route dispatch and final navigation-only tab cards fallback. The cards fallback is one additional correctness edit after the32guard transaction.
- Simulation derives daily fares/upkeep from the public30-day transit forecast and books them once per real tick; inactive allocated vehicles keep upkeep. Pause dominates public speed override. Statistics shows both rates; line label says30-day forecast.
- Old saves clear outgoing democity-owned landmarks after real owners restore; legacy exact transit{} migrates to empty lines/stops. Rejected owners yield explicit partial-load failure and do not generate false Save imported success.
- Integrated public transient-notification cleanup, keeping journal/rewards/permanent warnings. Registered industrial→industry and riverfront→waterfront camera aliases.
- Workflow lastRound reports the actual final critic round3; status aggregator persists full issue objects, failed acceptance clauses and critic paths alongside compact summaries.

`npm run build` passes163modules after the final HUD correction. Fourteen isolated finance and14input checks passed before application. Production native attempt3 passed its first37assertions with zero browser/debug errors; it then stopped on an over-broad full-record restore assertion. Focused recovery subsequently passed10assertions on the same production source. The native ledger covers41real simulation ticks, exact once-per-tick fares/upkeep and cash/net reconciliation; pause and override behavior pass.

Native UI evidence includes locked404transport,6000controlled unlock,3stop Enter commit,4stop same-ID edit, stationary-right cancellation versus orbit drag, modal/capture/foreign-pointer guards, fleet0→3→1, color change, Slot3 save→delete→load, and720p panels. The6000population is a test fixture retaining the original treasury; it is not earned progression. The separate organic404save remains the ordinary-play checkpoint.

Attempt1 exposed a real HUD `cardsOf` TypeError in navigation-only transportation tabs. The fallback now keeps category asset cards and returns an array. Attempts2/3 exposed a test-contract distinction: load recomputes transit demand/forecast (12→10riders;−26280→−26400forecast), while exact cash27510.38668149143, population5945, roads18, buildings288, services7, authored routes, stops and fleet survive. The corrected focused comparison excludes only these two derived fields and checks their finite/internal forecast consistency. It does not prove demand continuity. Invalid envelope causes no tested stock changes; a refusing transit owner reports explicit partial restore and a subsequent known-good native upload succeeds. Whole-world rollback remains non-atomic.

All failed results and images are retained under `integration/native-transit-production/attempt1-navigation-card-error`, `attempt2-recovery-assertion` and `attempt3-recovery-detail` within the external evidence root. Attempt1 images were viewed individually; all11images in each of attempts2/3 were inspected in labeled contact sheets. The three final recovery images were viewed at full screenshot resolution. Immediate1080p panel/menu captures sometimes caught animation before the panel painted; settled720p frames show the controls. These are not visual-legibility passes.

## Integrated captures

All9final integration images and JSON records were read; all have errors=0. The all/democity frames have all16modules ready. These use game capture mode (`headless=1`), actual Chrome152/M4 Metal, shared Vite5174, and production source with only the development HMR client intercepted. Some overlap with native gate/browser work makes capture FPS conservative; the separate ordinary-game performance run below isolates that limitation.

| Capture | Draws | Triangles | Recorded FPS |
|---|---:|---:|---:|
| w3_all_aerial_12 | 556 | 3,331,161 | 16.5 |
| w3_all_skyline_22 | 693 | 4,506,921 | 16.9 |
| w3_all_street_17p5 | 492 | 3,680,951 | 17.4 |
| w3_all_closeup_6p5 | 428 | 3,418,277 | 18.4 |
| w3_democity_aerial_12 | 556 | 3,331,161 | 28.2 |
| w3_transit_bus_12 | 133 | 1,433,423 | 59.5 |
| w3_all_aerial_12_720 | 556 | 3,331,161 | 37.1 |
| w3_all_industrial_12 | 251 | 1,444,121 | 39.6 |
| w3_all_riverfront_12 | 260 | 1,959,332 | 36.5 |

Visual notes: noon is a coherent but sparse repeated high-rise district; skyline night has a bright sky and repeated lamp pools; street17.5 is dominated by forecourt grass/trees and a washed sun patch; closeup6.5 shows traffic but broad setbacks. The bus is fully above the HUD, with glass/interior visible and a pole crossing its rear.720p HUD is contained. Industrial alias shows coal facilities/warehouses; riverfront alias shows shore/water/buildings. See `shots/integration/w3-final/view-notes.json` for each image.

## Isolated ordinary-game performance

One browser,1920×1080 High, game `headless=0`, paused simulation,2s camera warmup and≈5s actual engine-frame/wall-clock sample per case. No other SimBuild test browser overlapped. Render-pass peaks are retained rather than selecting a cheaper frame. This is a short sample, not a long-run benchmark.

| Camera/time | Actual FPS | Peak draws | Peak triangles |
|---|---:|---:|---:|
| aerial / 12 | 29.75 | 700 | 4,406,254 |
| skyline / 22 | 23.40 | 921 | 6,920,922 |
| street / 17.5 | 30.20 | 642 | 4,492,513 |
| closeup / 6.5 | 30.58 | 543 | 4,179,850 |

All four cases have zero errors. Draws remain under1500; **≥50FPS and≤3Mtriangle targets fail**. Independent pre-integration democity broader39image evidence reaches7,297,762triangles and1,057.8MB heap; it is a different camera/time matrix and not replaced by these lower peaks. Scene-light count in the raw performance helper inspects only top-level children and is not a total-light budget measurement.

## Ownership and seams

Transit owns one bus fleet and uses read-only public road lanes/owner services; no duplicate traffic bus wrapper, trees, zoning grid or alternate HUD economy was installed. Integration retains existing environment exposure/fog/lights and composer order; no global rendering restyle was made. The previous service/lot/road masks remain. Final images still show ground seating/occlusion and lighting problems, so retained ownership is not an all-mask or all-shadows quality pass. Transit mutates its existing Maps and the UI consumes them; native save/load and line edit/delete exercises passed. Camera aliases,720p resize and full-game boot passed.

## Open issues and deferred next steps

- **W3-PERFORMANCE (blocker)** — Integrated 1080p High Metal city remains below50fps: isolated5-second samples23.40–30.58fps, peak921draws and6,920,922triangles. Draw budget1500 passes, triangle3M and50fps goals fail. Independent wider pre-integration democity matrix peaks7,297,762triangles and1,057.8MB heap. Prior all-mode stub numbers are historical, not current city performance. Next: Profile real render passes and shared asset/LOD costs before increasing city density.
- **W3-CITY-SCALE (blocker)** — 611buildings/lots and10,017zoned cells miss1200/1400/11000 targets; civic expansion consumes lots. Health+education302/511=59.10% misses60%, utilities507/511=99.22%. Bridge clearance, seating, district grain, street activity and steep mountain road remain deficient. Next: Design compact valid frontage and paid civic placement; retain actual service validation and finances.
- **W3-LIGHTING (major)** — Night sky/body panels too bright relative to streets, repetitive lamp pools, golden-hour washout, repeated façades and vegetation occlusion remain. Democity texture autocorrelation.566727 exceeds.55. No shared exposure restyle during integration. Next: Use composed day/night reference comparisons and ownership-aware lighting changes.
- **W3-SEED-RESET (major)** — Same-seed saved city restores, but cross-seed restage is not equivalent to a fresh seed7 page (fresh654buildings versus restage622 in independent probe). Democity API verdict remains false. Next: Design coordinated public seed/reset lifecycle and cache invalidation, with whole-world regressions; no private owner writes.
- **W3-TRANSIT-TRAFFIC (major)** — Transit owns one deterministic bus fleet; traffic.spawnVehicle alone cannot accept managed timetable/pose/door/livery/reservation. Buses can overlap independently simulated cars. Junction paths are transit-owned continuous connectors. Tram remains absent. Next: Agree a complete managed traffic interface with collision reservations before migrating fleet ownership.
- **W3-TRANSIT-ART (major)** — Independent transit6.8 retains synthetic body/interior/lamp shapes, bright night body, incomplete shelter boarding scene, foliage/pole obstruction and incomplete shadow flags. Stable attributable measured20draw maximum is not a universal every-frame guarantee; some triangle samples exceed140k. Next: Use transit_r3 full ranked issues; no r4 authorized at this checkpoint.
- **W3-SAVE-ATOMICITY (major)** — Owner refusal reports an explicit partial-restore error and known-good recovery succeeds, but whole-world restore is not atomic. Transit load recomputes derived demand/forecast: observed12→10riders and−26280→−26400forecast, with exact money27510.38668149143/pop5945/authored route/stops/stocks. No claim of bitwise equality for derived forecasts or of postload demand continuity. Next: Specify derived-value reconciliation and explore staged all-owner validation/rollback; preserve original failure evidence.
- **W3-PLAY-BALANCE (major)** — Organic native UI checkpoint reached404residents, treasury27384.214 and daily net≈−3837.45. Tax20 exploratory branch was not saved and remained negative. Demo8047 is real deterministic preroll, while native transit6000 unlock is a labeled test fixture. Neither proves sustainable ordinary progression. Daily transit fare/upkeep booking passes41real ticks. Next: Run longer ordinary play from earned404save after renewed authorization; tune affordability, shortages and progression from measured play.
- **W3-UNJUDGED-WHOLE (major)** — No whole-game score or blind A/B result exists. Audio is unscored; earlier module issues remain in STATUS full openIssueDetails. All module latest independent scores remain below8.5. Next: After authorized fixes/stabilization, run independent whole-game critic and blind A/B, then the prioritized level-raising report.

Full module-ranked issues and literal failed acceptance clauses are persisted in `docs/STATUS.json.modules.<name>.openIssueDetails` / `acceptanceFailed`, and original critic reports remain unchanged. Earlier-wave scores remain historical module verdicts, not current whole-game rescoring.

## Recovery and evidence

External evidence root: `/Volumes/ExtDrive/SimBuild-verification-2026-09-06`. Exact32guard/eight-file transaction: `integration/w3-candidate/transactions/2026-09-08T09-44-33.644Z-b553758c-ec1e-4da4-a811-6eaf07517210`, manifestSHA256`b7f09ee4b1331e0ee69569239761869e89ad3600573c6b12d1878cbabc6365ea`. The subsequent HUD cards fix has its own `navigation-card-fix.json` and original file; a transaction rollback must account for that later edit and its conflict guard. Never blindly reapply or overwrite the working tree.

Final source/documentation snapshot, hash manifest, archive seal and completed workflow copy: `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/checkpoints/w3-r3-integration-2026-09-08-final`. It preserves uncommitted work; no commit/reset/push occurred. See `docs/RECOVERY.md` for the earned404save and mounted evidence dependencies. All current owners/critics are finished; only the dev server is left available. Whole-game critic, blind A/B, r4 and any new development remain deferred.
