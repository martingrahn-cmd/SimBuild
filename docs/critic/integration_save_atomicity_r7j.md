# r7j save atomicity local critical review

**Decision: accepted. No whole-game visual score is assigned.**

The candidate addresses the recorded functional failure directly. It snapshots every owner that the incoming payload can mutate, rejects incomplete rollback coverage before mutation, stops at the first owner rejection, and restores the prior dependency-ordered state. The focused late-Transit failure returns all 15 serialized modules, time and camera to the same canonical state and does not emit a false successful-load event. The valid recovery immediately afterward passes.

The change also makes complete Buildings deserialization idempotent for its allocator. This matters beyond the probe: a failed load can no longer silently advance future building IDs by hundreds. Props retains its invalidation version specifically when core marks the second application as rollback.

Accept r7j as closing the verified partial-world failure path. Keep two limits explicit: Transit demand/ridership and route caches may still canonicalize during an ordinary successful load under the established derived-value contract, and a second owner failure while applying the known-good rollback is reported rather than concealed. Neither limit permits a false `save:loaded` event. Democity and Transit critic scores remain unchanged.
