// Critic follow-up probe (throwaway): bezier sanity with a real control point, sunk-sample locations, crater scan.
import { chromium } from 'playwright';
const exe = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'];
const browser = await chromium.launch({ executablePath: exe, headless: true, args });
const page = await (await browser.newContext({ viewport: { width: 640, height: 360 } })).newPage();
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + String(e).slice(0, 300)));
await page.goto('http://127.0.0.1:5173/?showcase=roads&headless=1&time=12', { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForFunction(() => window.__sim && window.__sim.ready === true, null, { timeout: 180000, polling: 100 });
const res = await page.evaluate(async () => {
  const s = window.__sim; const R = s.world.roads, T = s.world.terrain;
  const out = {};
  // bezier with a real control point
  const a = R.addNode(-700, -700), b = R.addNode(-560, -560);
  const e = R.addEdge(a, b, 'street', { ctrl: { x: -700, z: -560 } });
  const m = R.sample(e, 0.5);
  const chord = { x: -630, z: -630 };
  out.bezier = { mid: { x: +m.x.toFixed(1), z: +m.z.toFixed(1) }, chordMid: chord, offChord: +Math.hypot(m.x - chord.x, m.z - chord.z).toFixed(1), length: +R.edges.get(e).length.toFixed(1), chordLen: +Math.hypot(140, 140).toFixed(1) };
  out.bezierOk = out.offChord > 5 && out.length > out.chordLen;
  R.removeEdge(e);
  // sunk samples: where
  const sunk = [];
  for (const ed of R.edges.values()) {
    if (ed.bridge) continue;
    for (let i = 1; i < 20; i++) { const p = R.sample(ed.id, i / 20); const dy = p.y - T.getHeight(p.x, p.z); if (dy < -0.05) sunk.push({ edge: ed.id, type: ed.type, t: i / 20, x: +p.x.toFixed(0), z: +p.z.toFixed(0), dy: +dy.toFixed(2) }); }
  }
  sunk.sort((p, q) => p.dy - q.dy);
  out.sunkCount = sunk.length; out.sunkWorst = sunk.slice(0, 12);
  // crater scan: cells within 40 m of a road whose 4 m slope exceeds 1.2 rad (steep wall) and are below the road
  const walls = [];
  for (let x = -700; x <= 700; x += 4) for (let z = -450; z <= 400; z += 4) {
    const sl = T.getSlope(x, z); if (sl < 1.1) continue;
    const ne = R.nearestEdge(x, z, 40); if (!ne) continue;
    const h = T.getHeight(x, z);
    walls.push({ x, z, slope: +sl.toFixed(2), h: +h.toFixed(1), roadY: +ne.point.y.toFixed(1), dist: +ne.dist.toFixed(0), edge: ne.edge.id, type: ne.edge.type, bridge: ne.edge.bridge });
  }
  out.steepCellsNearRoads = walls.length;
  // cluster summary by edge
  const byEdge = {}; for (const w of walls) { const k = `${w.edge}:${w.type}${w.bridge ? ':bridge' : ''}`; byEdge[k] = (byEdge[k] || 0) + 1; }
  out.steepByEdge = byEdge;
  out.steepSamples = walls.filter((w) => !w.bridge).slice(0, 15);
  // loop north arm region specifically (edge from (-200,-70) to (-200,-200))
  const loopN = walls.filter((w) => w.x > -260 && w.x < -140 && w.z < -100 && w.z > -230);
  out.loopNorthArmSteep = loopN.length; out.loopNorthArmSample = loopN.slice(0, 6);
  out.status = s.registry.status().roads; out.errors = s.errors.slice();
  return out;
});
res.consoleErrors = consoleErrors;
console.log(JSON.stringify(res, null, 1));
await browser.close();
