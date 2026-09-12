# Democity r5h rejected cache experiment — 2026-09-08

The r5g allocation profile identified complete Democity owner snapshots as the next memory candidate. A bounded one-entry snapshot cache was implemented and tested through the public sequence 1337 → 7 → 1337 → 7.

The candidate was rejected and reverted before integration. Rebuilding an evicted seed from the authoritative baseline changed building, service and transit identities, which violates the existing exact restage behavior. `shots/democity/r5h/restage-cycle.json` records the failed candidate. After reverting it, `shots/democity/r5h-rejected/restage-cycle.json` verifies exact authored-state equality for both repeated seeds with zero internal and browser errors.

This leaves the current production source at verified r5g behavior. Heap readings remain volatile across clean sessions (the reverted-cycle run reports 733.5, 1050.7, 867.5 and 1013.1 MB), so no heap improvement, score change, or new round claim is made.

The follow-up peak-frame diagnostic is `shots/democity/r5h-rejected/mainpass-profile.json`. At aerial night, temporary whole-owner masks attribute 1,168,784 triangles to roads, 894,676 to props, 861,180 to services, 562,080 to buildings and 56,864 to transit. Props-only diagnostics show 243,460 triangles each for visible foliage and furniture; forcing all trees to impostors saves only 215,876. These are prioritization measurements, not a justification to hide any owner in production.
