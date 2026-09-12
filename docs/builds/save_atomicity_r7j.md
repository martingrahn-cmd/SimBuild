# r7j whole-world save rollback

The previous load path restored owners in dependency order, emitted `save:loaded`, and only then reported any rejecting owners. A valid envelope with malformed late-owner data could therefore leave terrain, roads, zoning, buildings and simulation from the incoming save mixed with the old Transit state.

r7j takes a detached rollback snapshot of every target owner before emitting the restore boundary or mutating the world. Missing rollback coverage rejects the load before mutation. Owner restoration now stops at the first rejection. Core then reapplies the prior owner snapshot in dependency order, restores time and camera, emits `save:rolled-back`, and reports that the previous city was restored. `save:loaded` is emitted only after every owner accepts. A rollback failure remains explicit and directs recovery from a known-good save.

The owner rollback option preserves the Props version during rollback, and Buildings now reconstructs its complete-stock allocator from saved IDs. The latter fixes an independent idempotency defect where every load raised `nextId` by the number of restored buildings, changing future IDs despite identical visible stock.

The focused probe changes the first real terrain sample by seven metres, changes time/day, and supplies malformed Transit data late in the dependency sequence. Transit rejects it. All 15 module payloads then equal the canonical pre-attempt state exactly, as do terrain sample, time and camera. No `save:loaded` event is emitted for the failed attempt; one `save:rolled-back` and one `save:restore-finished` are emitted. A following valid restore succeeds. The expected rejected-owner error is retained in diagnostic logs.

Democity public API/double-deserialize/tour and exact 1337→7→1337→7 restage pass. A fresh 1080p Metal aerial smoke has zero errors at 428 draws / 1,986,766 triangles / 48.2 fps and was inspected without visual corruption. Production build passes 163 modules.

Evidence: `shots/integration/save-atomicity-r1.json` and `shots/integration/r7j-save-atomicity/`.
