// Critic probe 2 — traffic r1: integrated showcase (item 6/17), graph reaction (item 20), determinism (item 21).
import { chromium } from 'playwright';

const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
});

async function open(url) {
  const p = await b.newPage({ viewport: { width: 640, height: 360 } });
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__sim && window.__sim.ready, null, { timeout: 600000 });
  await p.waitForTimeout(2000);
  return p;
}

const out = {};

// ---- integrated showcase: props <-> traffic handover
try {
  const p = await open('http://127.0.0.1:5173/?showcase=all&headless=1&time=12&seed=1337&w=640&h=360');
  out.all = await p.evaluate(() => {
    const S = window.__sim, api = S.registry.apis.traffic, props = S.registry.apis.props;
    const r = { status: S.registry.status().traffic, errors: S.errors.slice(0, 6), hasProps: !!props };
    r.trafficSignalState = typeof api?.signalState;
    r.propsSignalFor = typeof props?.signalFor;
    const ints = S.registry.apis.roads?.intersections?.() || [];
    const node = ints.find((n) => n.arms.length >= 3 && !n.roundabout);
    if (node && props?.signalFor) {
      const arm = node.arms[0];
      r.signalForSample = props.signalFor(arm.edgeId, arm.atA);
    }
    r.trafficStats = api?.stats ? api.stats() : null;
    r.vehicles = S.world.traffic.vehicles.size;
    return r;
  });
  await p.close();
} catch (e) { out.all = 'FAILED: ' + e.message; }

// ---- graph reaction + determinism, in the traffic showcase
try {
  const p = await open('http://127.0.0.1:5173/?showcase=traffic&headless=1&time=12&seed=1337&w=640&h=360');
  out.graph = await p.evaluate(async () => {
    const S = window.__sim, W = S.world, api = S.registry.apis.traffic;
    const r = {};
    // pick an occupied edge
    const counts = new Map();
    for (const v of W.traffic.vehicles.values()) counts.set(v.edgeId, (counts.get(v.edgeId) || 0) + 1);
    const [edgeId, n] = [...counts.entries()].sort((a, c) => c[1] - a[1])[0];
    r.removedEdge = edgeId; r.hadVehicles = n;
    W.roads.removeEdge(edgeId);
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    r.afterOneFrame_refs = [...W.traffic.vehicles.values()].filter((v) => v.edgeId === edgeId).length;
    await new Promise((res) => setTimeout(res, 1500));
    r.after1500ms_refs = [...W.traffic.vehicles.values()].filter((v) => v.edgeId === edgeId).length;
    r.errorsAfter = S.errors.slice(0, 5);
    return r;
  });
  await p.close();
} catch (e) { out.graph = 'FAILED: ' + e.message; }

console.log(JSON.stringify(out, null, 1));
await b.close();
