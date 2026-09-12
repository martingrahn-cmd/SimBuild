# Transit r7x — successful-load continuity

## Scope

This round verifies the documented successful-load risk without changing route solving, demand, coverage, fares, fleet scheduling, simulation cadence, or save ordering. The probe restores a canonical Democity save, changes a real line's vehicle count and fare, advances simulation demand, moves the live city away from that target, and restores it again.

## Result

`shots/integration/r7x-transit-load-continuity.json` passes. Same-state restore and changed-state restore preserve the Transit and Simulation payloads byte-for-byte. Route edge arrays, physical lengths, headways, fleet records, ridership, line balance, and current economy are exact. Two independent runs from the restored target also produce the exact same next-day economy and Transit result.

The probe exposed one narrower restore defect: after creating and removing a temporary line, loading an older save retained the future `nextLine` allocator value. `transit.deserialize()` now derives both allocators from the saved allocator and the maximum restored live ID, without retaining discarded future state. This does not alter existing IDs or any service behavior.

## Verification

- `npm run build`: pass, 163 modules.
- `SIM_GL=metal node tools/transit-load-continuity-probe.mjs`: pass; all same-state, changed-state, next-day, and allocator checks exact; zero runtime/browser errors.
- `SIM_GL=metal OUT_FILE=shots/integration/r7x-save-atomicity-regression.json node tools/save-atomicity-probe.mjs`: pass; deliberate Transit rejection restores all 14 serialized owners, terrain, time, and camera exactly, then a valid restore succeeds.

## Decision

Accept the allocator repair. Successful-load derived Transit continuity is closed by objective evidence. Transit remains **6.8 FAIL** because this correctness repair does not improve the unresolved vehicle art, shadow, context, or tram criteria.
