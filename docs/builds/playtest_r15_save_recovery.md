# Human playtest R15 — update-safe save recovery

Date: 2026-09-12

## Problem

The player reported a hosted Slot 1 load error and asked that public testers keep their cities through updates. The existing loader already rolled the open world back when an owner rejected a payload, but each IndexedDB slot retained only its newest committed payload. A malformed newest copy therefore had no player-facing recovery path.

## Bounded changes

- Every local slot write now keeps the prior valid committed payload as `backupRaw` in the same IndexedDB transaction as the new payload and metadata.
- Cloud-to-local replacement retains that local recovery payload. A malformed primary is never promoted over a known-good backup.
- `load(slot)` first uses the authoritative primary. If parsing or owner restore fails, it attempts the prior local payload and emits `save:recovered`; UI tells the player that the previous safe version opened and asks them to inspect and save again.
- Props restores its saved owner revision after synchronous change observers run. Traffic preserves the saved pedestrian direction/side and exact normalized pedestrian/vehicle position after rebuilding world-space pose. These close repeated-load byte drift without changing simulation movement.
- The rollback verifier now freezes the whole update loop because Traffic intentionally advances in real time at simulation speed zero.

No current save schema, gameplay tuning, city content, cloud merge winner, tombstone rule or module dependency changed.

## Verification

- Production build: PASS, 164 modules.
- `tools/save-recovery-probe.mjs`: two committed versions; backup survives cloud-to-local replacement; deliberately truncated current JSON falls back to the first version; treasury restores 151,111→150,000; recovery notice is visible; saving again leaves valid primary and backup; errors=0.
- `tools/save-version-compat-probe.mjs`: actual `08b1a2d` R13 Democity save restores into R15. All14 module payloads are exact after restore, including Props and Traffic; 604 roads,9,964 zone cells,612 buildings,31 services and population8,025 are present; errors=0.
- `tools/save-atomicity-probe.mjs`: forced late Transit refusal restores all14 module payloads plus terrain sample, time and camera exactly, then a valid restore passes.
- `tools/cloud-save-contract-probe.mjs`: deterministic merge, tombstones and compressed encode/decode PASS.
- Simulation 90-day determinism and exact save/load selftest PASS.
- Inspected `shots/playtest-fixes-r15/save-recovered.png`; the warning is readable and states what happened.

## Limits

The exact player-owned hosted Slot 1 payload was not available to the automated browser, so its original error has not been reproduced. The recovery revision is local to a browser profile. Cloud sync still carries the newest city payload and tombstones; it does not yet duplicate each multi-megabyte recovery revision to a new computer. The verified R13→R15 compatibility and owner rollback materially reduce update risk, but cross-device cloud revision history remains open.
