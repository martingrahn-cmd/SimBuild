import { chromium } from 'playwright';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox','--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; page.on('console', m => { if (m.type()==='error') errs.push(m.text().slice(0,200)); });
page.on('pageerror', e => errs.push('PAGEERROR '+String(e).slice(0,200)));
await page.goto('http://127.0.0.1:5173/?showcase=tools&headless=1&time=12&seed=1337&speed=0&camera=tools', { waitUntil:'domcontentloaded', timeout: 600000 });
await page.waitForFunction('window.__sim && window.__sim.ready', null, { timeout: 600000 });
const r = await page.evaluate(async () => {
  const S = window.__sim, out = {};
  const api = S.registry.apis.tools;
  const scene = S.engine.scene, renderer = S.engine.renderer;
  const grp = scene.getObjectByName('module:tools');
  out.groupFound = !!grp;
  // layers / shadows walk
  const bad = [];
  let meshes = 0, tris = 0;
  grp && grp.traverse(o => {
    if (!o.geometry) return; meshes++;
    if (!o.layers.isEnabled(8)) bad.push(['layer', o.name || o.type]);
    if (o.castShadow || o.receiveShadow) bad.push(['shadow', o.name || o.type]);
    const g = o.geometry; const idx = g.index ? g.index.count : (g.attributes.position ? g.attributes.position.count : 0);
    if (o.visible) tris += idx/3;
  });
  out.meshes = meshes; out.layerShadowViolations = bad; out.visibleTrisApprox = Math.round(tris);
  // draw call diff
  const cam = S.camera.camera;
  renderer.info.autoReset = false;
  renderer.info.reset(); renderer.render(scene, cam); const withG = renderer.info.render.calls, withT = renderer.info.render.triangles;
  const vis = grp.visible; grp.visible = false;
  renderer.info.reset(); renderer.render(scene, cam); const woG = renderer.info.render.calls, woT = renderer.info.render.triangles;
  grp.visible = vis; renderer.info.autoReset = true;
  out.drawCallsWith = withG; out.drawCallsWithout = woG; out.toolsDrawCalls = withG - woG;
  out.trisWith = withT; out.trisWithout = woT; out.toolsTriangles = withT - woT;
  // DOM
  out.hasSbtHud = !!document.getElementById('sbt-hud');
  out.chipCount = document.querySelectorAll('#sbt-hud .sbt-chip').length;
  out.chipRects = [...document.querySelectorAll('#sbt-hud .sbt-chip')].filter(e=>e.style.display!=='none'&&e.offsetParent!==null).map(e=>{const b=e.getBoundingClientRect();return [Math.round(b.x),Math.round(b.y),Math.round(b.width),Math.round(b.height),e.textContent.trim()];});
  // geometry allocation across pointer drags
  const g0 = renderer.info.memory.geometries;
  for (let i=0;i<200;i++) api.setHover(20 + i*0.7, 30 + Math.sin(i*0.1)*40);
  const g1 = renderer.info.memory.geometries;
  out.geoDelta = g1 - g0;
  // event throttle
  let prev = 0; const seen = {changed:0, preview:0, sel:0};
  S.events.on('tool:changed', ()=>seen.changed++, 'p2');
  S.events.on('tool:preview', ()=>seen.preview++, 'p2');
  S.events.on('selection:changed', ()=>seen.sel++, 'p2');
  for (let i=0;i<200;i++) api.setHover(20 + i*0.7, 30);
  out.previewEmitsFor200Pointer = seen.preview;
  api.setOption('elevation', 10);
  out.changedAfterSetOption = seen.changed;
  // selection contract
  api.selectObject('road', 3); api.selectObject('road', 3);
  out.selEmits = seen.sel;
  out.selection = { ...S.world.selection };
  // costs finite
  out.roadTypes = Object.fromEntries(Object.entries(S.world.roads.types).map(([k,v])=>[k,v.width]));
  // terrain dome check around the showcase (no sculpt pose exists, so sample near knoll spec point)
  const T = S.world.terrain;
  out.heightAt = { p0: T.getHeight(0,0), knoll: T.getHeight(150,-120) };
  // history
  out.history = api.history();
  // undo/redo return types
  out.undoReturn = api.undo(); out.redoReturn = api.redo();
  return out;
});
console.log(JSON.stringify({ probe2: r, consoleErrors: errs }, null, 2));
await browser.close();
