# SimBuild

Cities: Skylines II–class city builder in Three.js + Vite, built by orchestrated agents.

**Picking this up cold? Read [`docs/HANDOFF.md`](docs/HANDOFF.md) first** — current state, how to resume the
build loop, and the traps. Then `ARCHITECTURE.md` (the contract) and `docs/STATUS.json` (live scores).

```
npm install
npm run dev                       # http://127.0.0.1:5173
npm run shot -- --showcase terrain --time 14 --camera aerial   # headless screenshot + JSON log
npm run gauntlet -- --module roads --round 1                   # standard matrix
node tools/fetch-assets.mjs       # download CC0 textures listed in public/assets/manifest.json
```

```bash
./tools/devserver.sh              # idempotent dev-server start (safe when already running)
node tools/status.mjs             # recompute docs/STATUS.json from docs/builds/ and docs/critic/
```

URL params: `?showcase=<module>&time=<hour>&camera=<preset>&seed=<n>&quality=<low|medium|high|ultra>&mode=play`.
Status and critic scores: `docs/STATUS.json`, `docs/critic/`. Agent prompts: `docs/prompts/`.
