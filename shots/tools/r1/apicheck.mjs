import { chromium } from 'playwright';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox','--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
page.on('console', m => { if (m.type()==='error') errs.push(m.text().slice(0,300)); });
page.on('pageerror', e => errs.push('PAGEERROR '+String(e).slice(0,300)));
await page.goto('http://127.0.0.1:5173/?showcase=tools&headless=1&time=12&seed=1337&speed=0', { waitUntil:'domcontentloaded', timeout: 300000 });
await page.waitForFunction('window.__sim && window.__sim.ready', null, { timeout: 300000 });
const r = await page.evaluate(() => {
  const S = window.__sim;
  const t = S.modules ? S.modules.tools : (S.registry && S.registry.apis && S.registry.apis.tools);
  const api = t;
  const out = { keys: api ? Object.keys(api).sort() : null };
  const w = S.world;
  out.world = {
    edges: w.roads.edges.size, nodes: w.roads.nodes.size,
    zoneCells: w.zones.cells ? w.zones.cells.size : null,
    buildings: w.buildings.items.size,
    services: w.services.items.size,
    props: w.props.items.size,
    selection: { ...w.selection },
  };
  out.status = S.status ? S.status() : null;
  const has = n => typeof api?.[n] === 'function';
  out.contract = {
    select: has('select'), setOption: has('setOption'), current: has('current'), options: has('options'),
    pointer: has('pointer'), pointerNdc: has('pointerNdc'), click: has('click'), rightClick: has('rightClick'),
    commit: has('commit'), cancel: has('cancel'), state: has('state'), undo: has('undo'), redo: has('redo'),
    history: has('history'), costOf: has('costOf'), setSelection: has('setSelection'),
    clearSelection: has('clearSelection'), pickAt: has('pickAt'), setPreviewVisible: has('setPreviewVisible'),
    stats: has('stats'), cropRects: has('cropRects'), _showcasePoses: has('_showcasePoses'),
    serialize: has('serialize'), deserialize: has('deserialize'),
  };
  try { out.selectReturn = api.select('road', { type:'street' }); } catch(e) { out.selectReturn = 'THREW '+e.message; }
  try { out.currentReturn = api.current(); } catch(e) { out.currentReturn = 'THREW '+e.message; }
  try { out.setOptionReturn = api.setOption('elevation', 5); } catch(e) { out.setOptionReturn = 'THREW '+e.message; }
  try { out.stateReturn = api.state(); } catch(e) { out.stateReturn = 'THREW '+e.message; }
  try { out.historyReturn = api.history(); } catch(e) { out.historyReturn = 'THREW '+e.message; }
  try { out.serializeReturn = api.serialize(); } catch(e) { out.serializeReturn = 'THREW '+e.message; }
  try { out.cropRectsKeys = Object.keys(S.cropRects ? S.cropRects() : {}); } catch(e) { out.cropRectsKeys = 'THREW '+e.message; }
  try { out.unknownSelect = api.select('bogusname'); } catch(e) { out.unknownSelect = 'THREW '+e.message; }
  // event hygiene
  let n = 0; const off = S.events.on ? S.events.on('tool:changed', () => n++, 'probe') : null;
  api.select('road', { type:'street' }); api.select('road', { type:'street' });
  out.dupSelectEmits = n;
  out.domChildren = document.body.children.length;
  return out;
});
console.log(JSON.stringify({ probe: r, consoleErrors: errs }, null, 2));
await browser.close();
