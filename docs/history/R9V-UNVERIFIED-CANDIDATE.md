# R9v unverified candidate — rejected from the human-playtest checkpoint

R9v attempted to make a mixed Building/Service/Road marquee demolition atomic. The bounded candidate correctly rejected and rolled back a forced service-removal failure, but complete-owner verification exposed a pre-existing or newly exercised Props regeneration mismatch. With restored road topology, the serialized Props owner changed from 5,972 items before the action to 6,021 after undo. Services serialization order and live Traffic state also prevented byte-exact comparison.

The candidate was therefore not accepted and is excluded from the player-facing checkpoint. Its diagnostic evidence remains in:

- `shots/democity/r9v-marquee-group/diagnosis.json`
- `shots/democity/r9v-marquee-group/verification.json`
- `tools/r9v-marquee-diagnosis.mjs`
- `tools/r9v-marquee-group-verification.mjs`
- `tools/r9v-marquee-scan.mjs`

The exact unverified source delta is preserved in `docs/history/r9v-unverified-candidate.patch`.
