# R23 mixed marquee demolition transaction

## Scope

The player-facing marquee bulldozer previously collected buildings, services and props but never roads. It also treated a partially rejected group as a successful partial action, and rebuilding a demolished building during undo could leave the restored building without the zoning lot's authoritative backlink.

R23 adds sampled path/rectangle intersection for Roads edges, restores buildings through the existing targeted Buildings transaction API, and gives the existing grouped undo stack an abort operation that compensates every already-completed leaf in reverse order. A rejected victim now rejects the whole marquee action and leaves no history entry when compensation succeeds. Services serialization is sorted by stable ID so equivalent restored state has canonical save order.

## Verification

- Production mixed-marquee verifier: PASS. The selected rectangle contains exactly Building 236, Service 7 and Road 432. Commit removes the three dependent objects, one undo restores 646 roads / 648 lots / 648 buildings / 31 services / 6,021 props and the exact treasury, redo returns exactly to the candidate, and a fresh repeat matches.
- Building↔lot ownership passes in every baseline, candidate, undo, redo, repeat and failure row: no reverse mismatch, duplicate lot ownership or broken forward link.
- Forced initial Roads rebuild failure rejects the complete action, restores exact persistent-owner content and money, and leaves undo/redo history empty.
- Forced Services restore failure during undo compensates back to the exact candidate, retains the history entry, and a later normal undo restores the exact baseline.
- The verifier freezes Traffic after completed staging because Traffic is deliberately real-time independent of simulation speed. It validates every serialized agent field and route shape but excludes ephemeral agents from persistent-owner hashes. Props comparisons require exact live items, render data, manual/suppressed state and density while excluding the documented monotonic dirty version and retired-ID allocator metadata.
- The accepted before/after images were inspected. The intended service, building and intersecting road are removed; surrounding roads and buildings remain intact.
- `tools/r9u-road-demolition-history.mjs`: PASS on seed 1337 street and seed 7 avenue, including exact undo/redo, later construction preservation and both rebuild-failure paths. The optional duplicate screenshots were disabled because the system disk had only about 49 MB free; all contract checks remained enabled.
- `node src/modules/simulation/selftest.mjs 90 1337`: deterministic repeat and exact mid-run save/load PASS.
- Production build: PASS, Vite 8.2.2, 164 modules. Output was directed to `/tmp` to bypass the macOS Documents file-provider stall; generated output was removed after verification because the system disk was full.

## Decision

Accept R23 as a bounded Tools/history correctness repair. Tools remains **8.0/10 FAIL**, Roads remains **6.0/10 FAIL**, and whole-game remains **6.0/10 FAIL**. The change closes the recorded mixed-marquee atomicity defect but does not raise visual quality or the whole-game bar.
