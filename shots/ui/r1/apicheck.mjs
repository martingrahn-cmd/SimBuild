// Critic API-contract check for the ui module (throwaway). node shots/ui/r1/apicheck.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';

const exe = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'];
const out = {};

async function run(W, H) {
  const browser = await chromium.launch({ executablePath: exe, headless: true, args });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const consoleErrors = [], pageErrors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) consoleErrors.push(m.text().slice(0, 500)); });
  page.on('pageerror', (e) => pageErrors.push(String(e?.stack || e).slice(0, 500)));
  await page.goto(`http://127.0.0.1:5173/?showcase=ui&headless=1&time=12&speed=0`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__sim && window.__sim.ready === true, null, { timeout: 180000, polling: 200 });
  await page.waitForTimeout(500);
  const r = await page.evaluate(async () => {
    const s = window.__sim;
    const q = (sel) => document.querySelector(sel);
    const qa = (sel) => [...document.querySelectorAll(sel)];
    const res = {};
    res.moduleStatus = s.modulesStatus();
    res.uiStatus = res.moduleStatus.ui?.status ?? res.moduleStatus.ui;
    // DOM presence
    res.dom = {
      root: !!q('#ui .sb-root'), toolbar: !!q('.sb-toolbar'), status: !!q('.sb-status'), hud: !!q('.sb-dock'),
      infoPanel: !!q('.sb-info') && !q('.sb-info').classList.contains('sb-hidden'),
      notifications: qa('.sb-note').length, subpanel: !!q('.sb-subpanel') && !q('.sb-subpanel').classList.contains('sb-hidden'),
      toolButtons: qa('.sb-tool').length, cards: qa('.sb-card').length, rci: !!q('.sb-rci'), devCorner: !!q('.sb-dev'),
    };
    // ui:action emission
    const actions = [];
    s.events.on('ui:action', (p) => actions.push(p));
    q('.sb-tool').click();                                                // toggles category (roads is active → closes)
    q('.sb-tool').click();                                                // re-opens
    qa('.sb-card')[1]?.click();
    q('.sb-toolbar-right .sb-round')?.click();
    q('.sb-topbtns .sb-round')?.click();
    qa('.sb-info .sb-action')[0]?.click();
    q('.sb-note')?.click();
    qa('.sb-tm')[1]?.click();
    res.actions = actions.map((a) => a.action);
    // clock buttons
    const c = s.clock;
    const speedBtns = qa('.sb-speed .sb-ctl');
    const before = { speed: c.speed, paused: c.paused };
    speedBtns[2].click(); const s4 = { speed: c.speed, paused: c.paused };
    speedBtns[1].click(); const s2 = { speed: c.speed, paused: c.paused };
    speedBtns[0].click(); const s1 = { speed: c.speed, paused: c.paused };
    const play = q('.sb-clock .sb-ctl');
    play.click(); const pz = { speed: c.speed, paused: c.paused };
    play.click(); const rs = { speed: c.speed, paused: c.paused };
    res.clock = { before, s4, s2, s1, pause: pz, resume: rs, speedActions: actions.filter((a) => /speed|pause|resume/i.test(a.action)).map((a) => [a.action, ...a.args]) };
    c.setSpeed(0); c.pause();
    // overflow
    const vw = window.innerWidth, vh = window.innerHeight;
    const over = [];
    for (const e of qa('.sb-root *')) {
      if (!(e instanceof HTMLElement)) continue;
      const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const b = e.getBoundingClientRect(); if (b.width === 0 && b.height === 0) continue;
      if (b.left < -0.5 || b.top < -0.5 || b.right > vw + 0.5 || b.bottom > vh + 0.5) over.push({ cls: e.className?.toString().slice(0, 40), l: Math.round(b.left), t: Math.round(b.top), r: Math.round(b.right), b: Math.round(b.bottom) });
      if (e.scrollWidth > e.clientWidth + 1 && /hidden|clip/.test(cs.overflowX) && !/sb-h1|sb-cn|sb-root|sb-subpanel$|sb-info$|sb-note$/.test(e.className)) over.push({ clipped: e.className?.toString().slice(0, 40), sw: e.scrollWidth, cw: e.clientWidth });
    }
    res.overflow = { viewport: [vw, vh], count: over.length, items: over.slice(0, 12) };
    res.docScroll = { sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight };
    // geometry of the main pieces
    const rect = (sel) => { const e = q(sel); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
    res.rects = { toolbar: rect('.sb-toolbar'), status: rect('.sb-status'), subpanel: rect('.sb-subpanel'), info: rect('.sb-info'), notes: rect('.sb-notes'), hint: rect('.sb-hint'), dev: rect('.sb-dev'), tools: rect('.sb-tools'), left: rect('.sb-toolbar-left'), right: rect('.sb-toolbar-right') };
    // font actually loaded?
    res.fonts = { aileron: document.fonts.check('13px Aileron'), status: document.fonts.status, family: getComputedStyle(q('.sb-root')).fontFamily.slice(0, 60) };
    // text overlap check: the toolbar-left content vs tools
    const l = q('.sb-toolbar-left').getBoundingClientRect(), t = q('.sb-tools').getBoundingClientRect(), rr = q('.sb-toolbar-right').getBoundingClientRect();
    res.toolbarFit = { leftContentRight: Math.round([...q('.sb-toolbar-left').children].reduce((m, e) => Math.max(m, e.getBoundingClientRect().right), 0)), toolsLeft: Math.round(t.left), toolsRight: Math.round(t.right), rightContentLeft: Math.round([...q('.sb-toolbar-right').children].reduce((m, e) => Math.min(m, e.getBoundingClientRect().left), 1e9)) };
    res.simErrors = s.errors.slice(0, 5);
    res.drawCalls = s.stats().drawCalls;
    return res;
  });
  r.consoleErrors = consoleErrors; r.pageErrors = pageErrors;
  await page.screenshot({ path: `shots/ui/r1/apicheck_${W}x${H}.png`, timeout: 120000 });
  await browser.close();
  return r;
}

out.r1080 = await run(1920, 1080);
out.r720 = await run(1280, 720);
fs.writeFileSync('shots/ui/r1/apicheck.out.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
