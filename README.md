# SimBuild

Cities: Skylines II–class city builder in Three.js + Vite. See `ARCHITECTURE.md`.

```
npm install
npm run dev                       # http://127.0.0.1:5173
npm run shot -- --showcase terrain --time 14 --camera aerial   # headless screenshot + JSON log
npm run gauntlet -- --module roads --round 1                   # standard matrix
node tools/fetch-assets.mjs       # download CC0 textures listed in public/assets/manifest.json
```

URL params: `?showcase=<module>&time=<hour>&camera=<preset>&seed=<n>&quality=<low|medium|high|ultra>`.
Status and critic scores: `docs/STATUS.json`, `docs/critic/`.
