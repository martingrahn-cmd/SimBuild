# Local critical review — Human playtest R15

Date: 2026-09-12

## Verdict

Accept the bounded local recovery and exactness fixes. The deliberate corruption test proves the previous committed payload remains usable after a current-payload parse failure and after the normal cloud-to-local replacement path. It also proves a post-recovery save does not promote malformed JSON into the recovery slot.

The cross-version test is stronger than a constructed compatibility fixture: it runs the actual published R13 source in an isolated worktree, serializes its populated native city, and restores that payload under current source. All14 owner payloads are exact after the Props revision and Traffic float/state repairs. The late-owner rejection probe separately proves rollback of the currently open city.

Do not claim full cloud revision history or closure of the player's exact hosted error. That source payload was unavailable, and recovery data remains local. Keep **Props 6.4 FAIL**, **Traffic 7.2 FAIL**, **UI 7.0 FAIL**, **Simulation 6.5 FAIL**, and **whole-game 6.0 FAIL**. The changes improve durability and correctness without meeting any 8.5 module gate.
