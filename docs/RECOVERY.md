# Recovery — completed wave3/r3 integration, paused 2026-09-08

The user explicitly requested the current integration cycle be finished and persisted, with **no next development wave**. No r4 is authorized. Current results and future proposals are separated in `STATUS.json.executionControl` and `wholeGame`. The final integration report is `docs/critic/integration_w3.md`.

## Source checkpoint

Active root: `/Users/martingrahn/Documents/SimBuild`. Final checkpoint directory: `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/checkpoints/w3-r3-integration-2026-09-08-final`. It contains `source-and-docs.tar.gz`, `manifest.json`, `seal.json`, Git status/diff evidence and the completed w3 workflow queue. `seal.json` gives the archive hash; the manifest lists SHA256 of each archived file. The checkpoint excludes dependencies, generated dist, the nested old copy, secrets and the large shots tree. It includes source, public assets, tools, docs and root build/config files. Large PNG/probe evidence remains under the external evidence root and its linked shots directories.

Verify hashes before recovery. Prefer extracting the archive to a new review directory and comparing with the current root; do not overwrite newer work or use git reset. Uncommitted changes are deliberately preserved. There was no git commit or push in this cycle.

The applied W3 transaction is `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/integration/w3-candidate/transactions/2026-09-08T09-44-33.644Z-b553758c-ec1e-4da4-a811-6eaf07517210`, manifestSHA256 `b7f09ee4b1331e0ee69569239761869e89ad3600573c6b12d1878cbabc6365ea`. It backs32exact replacement guards over8production files. The later HUD navigation-card fix is recorded in adjacent `navigation-card-fix.json`, with `hud.before-navigation-card-fix.js`. Guarded rollback of the original batch will reject the later HUD content: inspect/reconcile that follow-up first. The final snapshot is the preferred coherent restore point. Do not reapply the old transaction.

The previous W2b25file/116guard transaction remains at `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/integration/w2b-candidate/apply-tool/transactions/2026-09-08T07-05-57.948Z-903b261f-b890-4cac-869c-64763cf53998`, manifestSHA256 `5c6594dd1d6a431bbef3c6821c124d6897d8a91079da5323838accae2379e44a`. It is historical and must not be blindly rolled back across W3.

## Actual playable save

`/Volumes/ExtDrive/SimBuild-verification-2026-09-06/integration/earned-city-404.json`

SHA256: `b13b7216e0c50a3381152dd5ab454973b5d8efd8b856c677cb849924e6b6016c`.

Use the game's Load Game → Upload JSON to restore it. It was earned through native roads/zones/service tools from Normal150,000, including150/400milestones and a power cut→undo recovery.404residents,18roads,7paid facilities, treasury27,384.214, net approximately−3,837.45/day: playable interactions are evidenced, sustainable finances are not. The tax20 exploratory branch was not saved. Do not confuse this with the8047deterministic demo or CONTROLLED6000 transit-unlock fixture.

`integration/gameplay-live-production/earned-production-health-garbage-storage.json` is test-profile browser storage, not the user's personal Chrome profile. `integration/native-transit-production/attempt3-recovery-detail/post-native-good.json` is the controlled-unlock native gate save after41clock ticks. It preserves authored4stop/yellow/1bus line,5945fixture residents and exact treasury27510.38668149143. It is useful for integration recovery, not earned progression. Invalid diagnostic envelope/owner JSON files are deliberately malformed and are not recovery saves.

## Verification evidence

- `shots/integration/w3-final/summary.json`, all9PNG, `view-notes.json` and isolated `performance.json`.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/integration/native-transit-production/attempt1-navigation-card-error`: failed original HUD run, retained.
- `attempt2-recovery-assertion` and `attempt3-recovery-detail`:37preceding checks pass, then over-broad derived-record equality fails; original failures remain.
- `recovery-result.json`:10focused native load/error/recovery assertions pass on the W3 source, no browser/debug errors. `recovery-view-notes.json` records3viewed images. r7j subsequently added dependency-ordered failed-load rollback; `shots/integration/save-atomicity-r1.json` verifies all15 canonical module payloads, terrain, time and camera restore exactly after a late Transit refusal. Derived ridership/forecast may still recompute on successful load.
- `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/integration/w3-candidate/finance-check.json` and `input-check.json`:14isolated checks each; production41tick ledger separately validates native booking.
- `docs/critic/democity_r3.*` and `transit_r3.*`: independent pre-integration frozen scores6.0/6.8, no score inflation. Full source/evidence manifests live in corresponding critic directories.

## Restart only if later authorized

Keep ExtDrive mounted; several evidence/dependency paths resolve there. Do not delete the dependency or reference caches as cleanup. Dev server currently uses5174, while GameVolt owns5173. If5174 is no longer listening, from the active repository use `SIM_PORT=5174 ./tools/devserver.sh`; a persistent foreground Vite session with `--host 127.0.0.1 --port 5174 --strictPort` is the fallback (space-separated CLI options). Leave other apps alone.

For capture shells export `SIM_URL=http://127.0.0.1:5174`, `SIM_GL=metal`, `SIMBUILD_REF=/Users/martingrahn/.simbuild/ref`, `SIM_CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'`, `TMPDIR=/Volumes/ExtDrive/simbuild-tmp`. Install dependencies only if absent and fetch references only if needed. Take and view a smoke PNG with errors0 before development. Current renderer is ANGLE Metal on Apple M4; historical SwiftShader/stub-city metrics are not current evidence.

No coordinator or test browser should be active at this checkpoint; the development server is left running. `shots/workflows/w3/complete.json` is the completed current queue. All builders/critics stopped at r3. Do not replay the archived cap4 invocation or auto-run module next cursors. Prior long chronological notes are retained under `docs/history/` as historical context only.
