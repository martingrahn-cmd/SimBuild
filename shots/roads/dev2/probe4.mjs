import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 640, height: 360 } })).newPage();
await page.goto('http://127.0.0.1:5173/?showcase=roads&headless=1&time=12', { waitUntil: 'domcontentloaded', timeout: 240000 });
await page.waitForFunction(() => window.__sim && window.__sim.ready === true, null, { timeout: 240000, polling: 100 });
const res = await page.evaluate(() => {
  const s = window.__sim, R = s.world.roads, api = s.registry.apis.roads;
  const group = s.registry.get('roads').group;
  const verts = [];
  group.traverse((o) => { if (o.isMesh && o.name.startsWith('roads/asphalt')) { const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i++) verts.push([p.getX(i), p.getY(i), p.getZ(i), o.name]); } });
  const near = (x, z, r = 0.4) => verts.filter((v) => Math.hypot(v[0] - x, v[2] - z) < r).map((v) => [+v[0].toFixed(3), +v[1].toFixed(3), +v[2].toFixed(3)]);
  const out = [];
  for (const it of api.intersections()) {
    if (!it.roundabout) continue;
    const info = api.nodeInfo(it.id);
    for (const a of info.arms) {
      const px = a.ox + a.d.x * a.trim, pz = a.oz + a.d.z * a.trim;
      const plus = [px + a.s.x * a.wa, pz + a.s.z * a.wa], minus = [px - a.s.x * a.wa, pz - a.s.z * a.wa];
      out.push({ node: it.id, edge: a.e.id, ring: !!a.e.ring, atA: a.atA, trim: +a.trim.toFixed(3), eTrim: a.atA ? a.e.trimA : a.e.trimB, nodeY: +info.node.y.toFixed(3), plus: plus.map((v) => +v.toFixed(3)), vPlus: near(plus[0], plus[1]), vMinus: near(minus[0], minus[1]) });
    }
    break;
  }
  // a ring joint node
  const jointNode = [...R.nodes.values()].find((n) => n.edges.size === 2 && [...n.edges].every((id) => R.edges.get(id).ring));
  const ji = api.nodeInfo(jointNode.id);
  out.push({ joint: jointNode.id, kind: ji.kind, y: +jointNode.y.toFixed(3), mitre: ji.mitre, vertsNear: near(jointNode.x + ji.mitre.nx * 5, jointNode.z + ji.mitre.nz * 5, 0.6) });
  return out;
});
console.log(JSON.stringify(res, null, 1));
await browser.close();
