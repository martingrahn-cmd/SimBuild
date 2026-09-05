// UI stylesheet. Injected once as a <style> element by the ui module. Fonts: Aileron (CC0 1.0, bundled
// in ./fonts) with Inter / Segoe UI / system-ui fallbacks. Layout is responsive down to 1280×720.
const f400 = new URL('./fonts/aileron-latin-400-normal.woff2', import.meta.url).href;
const f600 = new URL('./fonts/aileron-latin-600-normal.woff2', import.meta.url).href;
const f700 = new URL('./fonts/aileron-latin-700-normal.woff2', import.meta.url).href;
const LOCK = "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#0d1219" stroke="#46546a" stroke-width="1.5"/><rect x="9.5" y="15" width="13" height="10" rx="2" fill="#dbe3ee"/><path d="M12 15v-3a4 4 0 0 1 8 0v3" stroke="#dbe3ee" stroke-width="2.4" fill="none"/></svg>`);

export const CSS = /* css */`
@font-face { font-family: 'Aileron'; font-style: normal; font-weight: 400; font-display: block; src: url(${f400}) format('woff2'); }
@font-face { font-family: 'Aileron'; font-style: normal; font-weight: 600; font-display: block; src: url(${f600}) format('woff2'); }
@font-face { font-family: 'Aileron'; font-style: normal; font-weight: 700; font-display: block; src: url(${f700}) format('woff2'); }

#ui > .sb-root { pointer-events: none; }
.sb-root {
  --bg: rgba(15, 20, 29, 0.82);
  --bg-2: rgba(22, 29, 41, 0.88);
  --bg-3: rgba(34, 43, 58, 0.92);
  --bg-solid: #171d29;
  --line: rgba(255, 255, 255, 0.075);
  --line-2: rgba(255, 255, 255, 0.14);
  --text: #e9eef5;
  --text-2: #b5c0cf;
  --muted: #7f8c9d;
  --accent: #2f8ff5;
  --accent-2: #62b2ff;
  --accent-dim: rgba(47, 143, 245, 0.22);
  --green: #4cc25a; --red: #e5484d; --yellow: #f5c542; --orange: #f28c28; --purple: #a66cf5; --teal: #34c3c7;
  --radius: 7px;
  --dock-h: 102px;
  --shadow: 0 10px 30px rgba(0, 0, 0, 0.42), 0 1px 0 rgba(255, 255, 255, 0.04) inset;
  position: absolute; inset: 0; overflow: hidden;
  font-family: 'Aileron', 'Inter', 'Segoe UI', system-ui, -apple-system, Roboto, 'Helvetica Neue', sans-serif;
  font-size: 13px; line-height: 1.25; color: var(--text);
  -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;
  user-select: none; -webkit-user-select: none;
}
.sb-root * { box-sizing: border-box; }
.sb-root svg { display: block; }
.sb-pe { pointer-events: auto; }
.sb-glass {
  background: var(--bg);
  -webkit-backdrop-filter: blur(16px) saturate(1.25);
  backdrop-filter: blur(16px) saturate(1.25);
  border: 1px solid var(--line);
  box-shadow: var(--shadow);
}
.sb-num { font-variant-numeric: tabular-nums; letter-spacing: 0.01em; }
.sb-hidden { display: none !important; }
button.sb-btn { appearance: none; border: 0; background: none; color: inherit; font: inherit; padding: 0; margin: 0; cursor: pointer; }
button.sb-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.sb-root input, .sb-root select { font: inherit; color: var(--text); }
.sb-root ::-webkit-scrollbar { width: 8px; height: 8px; }
.sb-root ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.14); border-radius: 4px; }
.sb-root ::-webkit-scrollbar-track { background: transparent; }

/* main menu: the HUD is not shown behind it; pause menu only dims */
.sb-root.is-menu > :not(.sb-modal) { visibility: hidden; }
/* photo mode: everything hidden except the fading hint */
.sb-root.is-photo > :not(.sb-photohint) { display: none !important; }
.sb-photohint { position: absolute; left: 50%; bottom: 28px; transform: translateX(-50%); padding: 8px 16px; border-radius: 16px; font-size: 12px; font-weight: 600; color: var(--text-2);
  background: rgba(8, 11, 17, 0.7); border: 1px solid var(--line); animation: sb-fadeout 4s ease-in forwards; }
@keyframes sb-fadeout { 0%, 60% { opacity: 1; } 100% { opacity: 0; } }
.sb-photohint .sb-key { margin: 0 2px 0 4px; }

/* ---------------------------------------------------------------- tooltip */
[data-tip] { position: relative; }
[data-tip]::after {
  content: attr(data-tip); position: absolute; left: 50%; bottom: calc(100% + 10px); transform: translate(-50%, 4px);
  background: rgba(10, 14, 20, 0.96); color: var(--text); font-size: 12px; font-weight: 600; letter-spacing: 0.01em;
  padding: 6px 9px; border-radius: 5px; border: 1px solid var(--line-2); white-space: nowrap; pointer-events: none;
  opacity: 0; transition: opacity 120ms ease, transform 120ms ease; z-index: 50; box-shadow: 0 6px 18px rgba(0,0,0,.45);
}
[data-tip]:hover::after { opacity: 1; transform: translate(-50%, 0); transition-delay: 250ms; }
[data-tip].sb-tip-below::after { bottom: auto; top: calc(100% + 10px); }
[data-tip].sb-tip-right::after { bottom: auto; left: calc(100% + 10px); top: 50%; transform: translate(0, -50%); }
[data-tip].sb-tip-right:hover::after { transform: translate(0, -50%); }
.sb-key { display: inline-block; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 4px; background: rgba(255,255,255,.12); border: 1px solid var(--line-2);
  font-size: 10.5px; font-weight: 700; line-height: 16px; text-align: center; color: #fff; margin-right: 4px; }

/* ---------------------------------------------------------------- bottom dock */
.sb-dock { position: absolute; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; }
.sb-toolbar {
  height: 62px; display: flex; align-items: center; padding: 0 12px; gap: 12px;
  background: linear-gradient(180deg, rgba(20, 27, 38, 0.93), rgba(13, 18, 26, 0.96));
  border-top: 1px solid rgba(255, 255, 255, 0.09);
  box-shadow: 0 -8px 28px rgba(0, 0, 0, 0.35);
}
.sb-toolbar-left, .sb-toolbar-right { display: flex; align-items: center; gap: 8px; flex: 1 1 0; min-width: 0; overflow: hidden; }
.sb-toolbar-right { justify-content: flex-end; }
.sb-tools { display: flex; align-items: center; gap: 3px; flex: 0 0 auto; }
.sb-tool {
  width: 44px; height: 44px; border-radius: 8px; display: flex; align-items: center; justify-content: center;
  transition: background 110ms ease, transform 110ms ease, box-shadow 110ms ease; position: relative;
}
.sb-tool svg { width: 29px; height: 29px; filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.5)); }
.sb-tool:hover { background: rgba(255, 255, 255, 0.09); transform: translateY(-1px); }
.sb-tool:active { transform: translateY(0); background: rgba(255, 255, 255, 0.13); }
.sb-tool.is-active {
  background: linear-gradient(180deg, #47a0ff, #2b86ea);
  box-shadow: 0 0 0 1px rgba(120, 190, 255, 0.55), 0 6px 16px rgba(47, 143, 245, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.35);
}
.sb-tool.is-active::before { content: ''; position: absolute; left: 8px; right: 8px; top: -9px; height: 3px; border-radius: 2px; background: #8ccbff; opacity: .9; }
.sb-tool.is-locked svg { opacity: 0.72; }
.sb-tool.is-locked .sb-lockbadge { position: absolute; right: 3px; bottom: 3px; width: 14px; height: 14px; }
.sb-tool.is-locked .sb-lockbadge svg { width: 14px; height: 14px; opacity: 1; filter: none; }
.sb-sep { width: 1px; height: 32px; background: var(--line-2); margin: 0 5px; flex: 0 0 auto; }

.sb-milestone { display: flex; align-items: center; gap: 10px; height: 46px; padding: 0 14px 0 5px; border-radius: 24px; flex: 0 0 auto;
  background: rgba(255, 255, 255, 0.05); border: 1px solid var(--line); }
.sb-milestone:hover { background: rgba(255, 255, 255, 0.09); }
.sb-badge { position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; flex: 0 0 auto; }
.sb-badge svg { position: absolute; inset: 0; width: 36px; height: 36px; }
.sb-badge .sb-badge-num { position: relative; font-weight: 700; font-size: 13px; color: #fff; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6); }
.sb-milestone-text { display: flex; flex-direction: column; gap: 2px; white-space: nowrap; }
.sb-milestone-text .sb-t1 { font-weight: 700; font-size: 12.5px; letter-spacing: 0.06em; text-transform: uppercase; color: #ffd76a; }
.sb-milestone-text .sb-t2 { font-size: 11px; color: var(--text-2); }
.sb-xp { width: 110px; height: 4px; border-radius: 2px; background: rgba(255, 255, 255, 0.1); overflow: hidden; margin-top: 1px; }
.sb-xp > i { display: block; height: 100%; width: 40%; background: linear-gradient(90deg, #ffd76a, #f5a623); border-radius: 2px; }
@media (max-width: 1560px) { .sb-milestone { padding-right: 5px; } .sb-milestone-text { display: none; } }

.sb-rci { display: grid; grid-template-columns: auto 1fr auto 1fr; column-gap: 6px; row-gap: 6px; align-items: center; flex: 0 0 auto;
  height: 46px; padding: 0 11px; border-radius: 8px; background: rgba(255, 255, 255, 0.05); border: 1px solid var(--line); width: 158px; }
.sb-rci .sb-rci-l { font-size: 9.5px; font-weight: 700; letter-spacing: 0.04em; color: var(--text-2); width: 9px; text-align: center; line-height: 1; }
.sb-rci .sb-rci-b { height: 6px; border-radius: 3px; background: rgba(255, 255, 255, 0.09); overflow: hidden; width: 50px; }
.sb-rci .sb-rci-b > i { display: block; height: 100%; width: 0; border-radius: 3px; transition: width 500ms ease; }
.sb-rci .r > i { background: linear-gradient(90deg, #3fb84f, #7ee089); }
.sb-rci .c > i { background: linear-gradient(90deg, #2f8ff5, #7cc3ff); }
.sb-rci .i > i { background: linear-gradient(90deg, #f28c28, #ffc06a); }
.sb-rci .o > i { background: linear-gradient(90deg, #8f5cf0, #c8a6ff); }

.sb-round { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex: 0 0 auto;
  background: rgba(255, 255, 255, 0.06); border: 1px solid var(--line); transition: background 110ms ease, transform 110ms ease; }
.sb-round svg { width: 22px; height: 22px; }
.sb-round:hover { background: rgba(255, 255, 255, 0.12); transform: translateY(-1px); }
.sb-round.is-active { background: var(--accent); border-color: var(--accent-2); }

/* ---------------------------------------------------------------- status strip */
.sb-status { height: 40px; display: flex; align-items: center; gap: 8px; padding: 0 10px; background: rgba(8, 11, 17, 0.92); border-top: 1px solid rgba(255, 255, 255, 0.06); }
.sb-chip { display: flex; align-items: center; gap: 8px; height: 30px; padding: 0 10px; border-radius: 6px;
  background: rgba(255, 255, 255, 0.045); border: 1px solid var(--line); white-space: nowrap; flex: 0 0 auto; }
.sb-chip > span > svg, .sb-chip > svg { width: 22px; height: 22px; flex: 0 0 auto; }
.sb-chip .sb-v { font-weight: 600; font-size: 13px; }
.sb-chip .sb-k { font-size: 12px; color: var(--muted); }
.sb-chip.sb-chip-btn:hover { background: rgba(255, 255, 255, 0.09); }
.sb-clock { padding: 0 6px 0 4px; gap: 4px; }
.sb-clock .sb-time { font-weight: 700; font-size: 14px; min-width: 44px; text-align: center; }
.sb-clock .sb-date { font-size: 12px; color: var(--text-2); padding: 0 6px 0 2px; }
.sb-ctl { width: 26px; height: 26px; border-radius: 5px; display: flex; align-items: center; justify-content: center; transition: background 100ms; }
.sb-ctl svg { width: 14px; height: 14px; }
.sb-ctl:hover { background: rgba(255, 255, 255, 0.12); }
.sb-ctl.is-active { background: var(--accent); box-shadow: inset 0 1px 0 rgba(255,255,255,.3); }
.sb-speed { display: flex; gap: 1px; margin-left: 2px; padding: 2px; border-radius: 6px; background: rgba(0, 0, 0, 0.35); }
.sb-speed .sb-ctl { width: 24px; height: 22px; }
.sb-speed .sb-ctl svg { width: 16px; height: 12px; }
.sb-speed .sb-ctl svg polygon { fill: #6c7a8c; }
.sb-speed .sb-ctl:hover svg polygon { fill: #a9b7c8; }
.sb-speed .sb-ctl.is-active { background: var(--accent); }
.sb-speed .sb-ctl.is-active svg polygon { fill: #fff; }
.sb-status .sb-spacer { flex: 1 1 auto; min-width: 0; }
.sb-cityname { font-weight: 700; letter-spacing: 0.02em; font-size: 13px; padding: 0 18px; }
.sb-trend { font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 3px; height: 20px; padding: 0 6px 0 4px; border-radius: 4px; background: rgba(0,0,0,.3); }
.sb-trend svg { width: 10px; height: 10px; }
.sb-trend.up { color: #6fe07c; } .sb-trend.down { color: #ff7a7a; }
.sb-face { width: 22px; height: 22px; }
.sb-money .sb-v { color: #b9f0c0; }
@media (max-width: 1400px) { .sb-cityname { padding: 0 8px; } .sb-clock .sb-date { display: none; } }

/* ---------------------------------------------------------------- sub panel (asset picker) */
.sb-subpanel {
  position: absolute; left: max(calc(50% - 390px), 12px); bottom: calc(var(--dock-h) + 10px);
  width: min(780px, calc(100% - 24px)); border-radius: var(--radius); overflow: hidden; animation: sb-rise 160ms ease-out;
}
.sb-root.has-left .sb-subpanel { left: max(calc(50% - 390px), 400px); width: min(780px, calc(100% - 412px)); }
.sb-root.has-side .sb-subpanel { width: min(780px, calc(100% - 24px - 366px)); }
.sb-root.has-left.has-side .sb-subpanel { width: min(780px, calc(100% - 412px - 366px)); }
@keyframes sb-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.sb-subpanel-head { display: flex; align-items: center; height: 42px; padding: 0 8px 0 12px; background: rgba(0, 0, 0, 0.28); border-bottom: 1px solid var(--line); gap: 4px; }
.sb-subpanel-head .sb-title { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 13px; letter-spacing: 0.03em; text-transform: uppercase; color: var(--text-2); padding-right: 12px; margin-right: 6px; border-right: 1px solid var(--line-2); height: 26px; white-space: nowrap; }
.sb-subpanel-head .sb-title svg { width: 22px; height: 22px; }
.sb-tab { height: 30px; padding: 0 12px 0 8px; border-radius: 5px; font-size: 12px; font-weight: 600; color: var(--text-2); display: flex; align-items: center; gap: 6px; transition: background 100ms;
  background: rgba(255, 255, 255, 0.05); border: 1px solid var(--line); white-space: nowrap; }
.sb-tab svg { width: 18px; height: 18px; }
.sb-tab:hover { background: rgba(255, 255, 255, 0.1); color: var(--text); }
.sb-tab.is-active { background: var(--accent); color: #fff; border-color: var(--accent-2); }
.sb-subpanel-head .sb-close { margin-left: auto; }
.sb-close { width: 28px; height: 28px; border-radius: 5px; display: flex; align-items: center; justify-content: center; color: var(--text-2); flex: 0 0 auto; }
.sb-close svg { width: 14px; height: 14px; }
.sb-close:hover { background: rgba(255, 80, 80, 0.25); color: #fff; }
.sb-subpanel-body { display: flex; min-height: 130px; }
.sb-toolmodes { width: 226px; flex: 0 0 auto; padding: 10px 12px; border-right: 1px solid var(--line); display: flex; flex-direction: column; gap: 8px; background: rgba(0,0,0,.14); }
.sb-tm-row { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.sb-tm-row .sb-k { font-size: 12px; color: var(--text-2); font-weight: 600; white-space: nowrap; }
.sb-tm-group { display: flex; gap: 2px; padding: 2px; background: rgba(0,0,0,.35); border-radius: 6px; }
.sb-tm { width: 28px; height: 26px; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
.sb-tm svg { width: 18px; height: 18px; }
.sb-tm:hover { background: rgba(255,255,255,.1); }
.sb-tm.is-active { background: var(--accent); }
.sb-stepper { display: flex; align-items: center; gap: 2px; padding: 2px; background: rgba(0,0,0,.35); border-radius: 6px; }
.sb-stepper .sb-val { min-width: 52px; text-align: center; font-weight: 700; font-size: 12px; }
.sb-cards { flex: 1 1 auto; display: grid; grid-template-columns: repeat(auto-fill, 96px); gap: 8px; padding: 10px 12px; align-content: start; max-height: 246px; overflow-y: auto; }
.sb-card { width: 96px; height: 98px; border-radius: 6px; background: linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.035)); border: 1px solid var(--line);
  display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 4px 4px 5px; transition: background 100ms, border-color 100ms, transform 100ms, box-shadow 100ms; position: relative; }
.sb-card .sb-thumb { width: 86px; height: 54px; border-radius: 4px; overflow: hidden; background: radial-gradient(ellipse at 50% 35%, #2f3b50 0%, #1a2130 70%, #141a26 100%); box-shadow: inset 0 0 0 1px rgba(255,255,255,.05); flex: 0 0 auto; }
.sb-card .sb-thumb svg { width: 86px; height: 54px; }
.sb-card .sb-cn { font-size: 10.5px; font-weight: 600; color: var(--text-2); text-align: center; line-height: 1.1; max-width: 88px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sb-card .sb-cc { font-size: 10px; color: #9ed8a8; font-weight: 600; line-height: 1; }
.sb-card:hover { background: linear-gradient(180deg, rgba(255,255,255,.13), rgba(255,255,255,.07)); border-color: var(--line-2); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,.35); }
.sb-card.is-active { background: linear-gradient(180deg, rgba(47,143,245,.55), rgba(47,143,245,.3)); border-color: #7fc0ff; box-shadow: 0 0 0 1px rgba(127,192,255,.5), 0 4px 14px rgba(47,143,245,.35); }
.sb-card.is-active .sb-cn { color: #fff; }
.sb-card.is-locked .sb-thumb { filter: saturate(.6) brightness(.8); }
.sb-card.is-locked .sb-cn { color: var(--muted); }
.sb-card.is-locked::after { content: ''; position: absolute; right: 7px; top: 7px; width: 16px; height: 16px; background: url("${LOCK}") center / contain no-repeat; }

/* ---------------------------------------------------------------- tool hint */
.sb-hint { position: absolute; left: 50%; transform: translateX(-50%); bottom: calc(var(--dock-h) + 16px); display: flex; gap: 14px; align-items: center;
  height: 28px; padding: 0 12px; border-radius: 14px; font-size: 12px; color: var(--text-2); background: rgba(8, 11, 17, 0.72); border: 1px solid var(--line); white-space: nowrap; }
.sb-hint b { color: var(--text); font-weight: 700; }

/* ---------------------------------------------------------------- left column: info panel / transit panel */
.sb-info, .sb-lines { position: absolute; left: 12px; bottom: calc(var(--dock-h) + 12px); width: 376px; border-radius: var(--radius); overflow: hidden; animation: sb-in 180ms ease-out;
  max-height: calc(100% - var(--dock-h) - 24px); display: flex; flex-direction: column; }
@keyframes sb-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.sb-info-head { display: flex; align-items: center; gap: 10px; padding: 10px 10px 10px 12px; background: rgba(0, 0, 0, 0.28); border-bottom: 1px solid var(--line); flex: 0 0 auto; }
.sb-info-head .sb-ic { width: 38px; height: 38px; border-radius: 8px; background: rgba(255,255,255,.07); display: flex; align-items: center; justify-content: center; flex: 0 0 auto; }
.sb-info-head .sb-ic svg { width: 26px; height: 26px; }
.sb-info-head .sb-ht { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1 1 auto; }
.sb-info-head .sb-h1 { font-weight: 700; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sb-info-head .sb-h2 { font-size: 11.5px; color: var(--text-2); display: flex; align-items: center; gap: 6px; }
.sb-pill { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 10px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: #fff; }
.sb-info-body { padding: 8px 12px 10px; display: flex; flex-direction: column; gap: 6px; overflow-y: auto; min-height: 0; }
.sb-section { font-size: 10.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); margin: 6px 0 2px; }
.sb-rows { display: grid; grid-template-columns: 1fr auto; row-gap: 5px; column-gap: 12px; }
.sb-rows .sb-k { color: var(--text-2); font-size: 12.5px; }
.sb-rows .sb-v { text-align: right; font-weight: 600; font-size: 12.5px; }
.sb-rows .sb-v.good { color: #7ee089; } .sb-rows .sb-v.bad { color: #ff8a8a; } .sb-rows .sb-v.warn { color: #ffd76a; }
.sb-bar { height: 7px; border-radius: 4px; background: rgba(255,255,255,.09); overflow: hidden; }
.sb-bar > i { display: block; height: 100%; border-radius: 4px; background: linear-gradient(90deg, #2f8ff5, #7cc3ff); }
.sb-bar.green > i { background: linear-gradient(90deg, #3fb84f, #7ee089); }
.sb-bar.yellow > i { background: linear-gradient(90deg, #f5a623, #ffd76a); }
.sb-barrow { display: grid; grid-template-columns: 92px 1fr auto; align-items: center; gap: 10px; font-size: 12px; }
.sb-barrow .sb-k { color: var(--text-2); }
.sb-barrow .sb-v { font-weight: 600; min-width: 34px; text-align: right; }
.sb-level { display: flex; align-items: center; gap: 4px; }
.sb-level svg { width: 14px; height: 14px; }
.sb-level svg.off path { fill: rgba(255,255,255,.14); }
.sb-actions { display: flex; gap: 6px; padding: 8px 12px 12px; border-top: 1px solid var(--line); background: rgba(0,0,0,.14); flex: 0 0 auto; }
.sb-action { flex: 1 1 0; height: 32px; border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px; font-weight: 700;
  background: rgba(255,255,255,.07); border: 1px solid var(--line-2); color: var(--text); transition: background 100ms; white-space: nowrap; }
.sb-action svg { width: 16px; height: 16px; }
.sb-action:hover { background: rgba(255,255,255,.14); }
.sb-action.primary { background: var(--accent); border-color: var(--accent-2); }
.sb-action.primary:hover { background: #4499f7; }
.sb-action.danger { border-color: rgba(229,72,77,.45); }
.sb-action.danger:hover { background: rgba(229,72,77,.35); border-color: rgba(229,72,77,.7); }
.sb-action.small { flex: 0 0 auto; height: 28px; padding: 0 10px; font-size: 11.5px; }

/* transit line panel */
.sb-lines .sb-linelist { display: flex; flex-direction: column; gap: 3px; padding: 8px 8px 4px; overflow-y: auto; min-height: 0; }
.sb-line { display: grid; grid-template-columns: 14px 1fr auto auto; align-items: center; gap: 10px; height: 34px; padding: 0 8px; border-radius: 6px; text-align: left; border: 1px solid transparent; }
.sb-line:hover { background: rgba(255,255,255,.07); }
.sb-line.is-active { background: var(--accent-dim); border-color: rgba(98,178,255,.4); }
.sb-line .sb-dot { width: 12px; height: 12px; border-radius: 50%; box-shadow: 0 0 0 2px rgba(255,255,255,.18); }
.sb-line .sb-ln { font-weight: 600; font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sb-line .sb-ls { font-size: 11px; color: var(--muted); }
.sb-line .sb-lr { font-size: 11.5px; font-weight: 600; color: var(--text-2); }
.sb-stops { display: flex; flex-wrap: wrap; gap: 4px; }
.sb-stop { display: inline-flex; align-items: center; gap: 5px; height: 22px; padding: 0 8px 0 6px; border-radius: 11px; background: rgba(255,255,255,.07); border: 1px solid var(--line); font-size: 11px; color: var(--text-2); }
.sb-stop i { width: 8px; height: 8px; border-radius: 50%; background: var(--lc, var(--accent)); }
.sb-swatches { display: flex; gap: 5px; }
.sb-swatch { width: 20px; height: 20px; border-radius: 50%; border: 2px solid transparent; }
.sb-swatch.is-active, .sb-swatch:hover { border-color: #fff; }
.sb-empty { padding: 18px 12px; text-align: center; color: var(--muted); font-size: 12px; line-height: 1.5; }

/* ---------------------------------------------------------------- top-left column: minimap + legend */
.sb-topleft { position: absolute; left: 12px; top: 12px; display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
.sb-minimap { border-radius: var(--radius); overflow: hidden; width: 196px; }
.sb-minimap-head { display: flex; align-items: center; height: 26px; padding: 0 4px 0 10px; font-size: 10.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); background: rgba(0,0,0,.28); border-bottom: 1px solid var(--line); gap: 4px; }
.sb-minimap-head .sb-mm-btn { margin-left: auto; width: 22px; height: 22px; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: var(--text-2); }
.sb-minimap-head .sb-mm-btn svg { width: 12px; height: 12px; }
.sb-minimap-head .sb-mm-btn:hover { background: rgba(255,255,255,.1); color: #fff; }
.sb-minimap canvas { display: block; width: 194px; height: 194px; cursor: crosshair; }
.sb-minimap.is-collapsed canvas { display: none; }
@media (max-width: 1500px) { .sb-minimap { width: 156px; } .sb-minimap canvas { width: 154px; height: 154px; } }
@media (max-height: 860px) {
  .sb-topleft { flex-direction: row; align-items: flex-start; }
  .sb-root.has-minimap .sb-info, .sb-root.has-minimap .sb-lines { max-height: calc(100% - var(--dock-h) - 24px - 200px); }
}
.sb-legend { width: 236px; border-radius: var(--radius); overflow: hidden; animation: sb-in 180ms ease-out; }
.sb-legend-head { display: flex; align-items: center; gap: 8px; height: 34px; padding: 0 4px 0 10px; background: rgba(0,0,0,.28); border-bottom: 1px solid var(--line); font-weight: 700; font-size: 12.5px; }
.sb-legend-head svg { width: 20px; height: 20px; }
.sb-legend-head .sb-close { margin-left: auto; width: 26px; height: 26px; }
.sb-legend-body { padding: 8px 10px 10px; display: flex; flex-direction: column; gap: 6px; }
.sb-legend-body .sb-d { font-size: 11.5px; color: var(--text-2); line-height: 1.35; }
.sb-grad { height: 10px; border-radius: 5px; border: 1px solid rgba(255,255,255,.12); }
.sb-grad-l { display: flex; justify-content: space-between; font-size: 10.5px; color: var(--muted); font-weight: 600; }
.sb-legend-body .sb-rows { row-gap: 3px; }
.sb-legend-body .sb-rows .sb-k, .sb-legend-body .sb-rows .sb-v { font-size: 11.5px; }

/* ---------------------------------------------------------------- top-right column: buttons, notifications, stats */
.sb-topright { position: absolute; right: 14px; top: 12px; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; max-height: calc(100% - var(--dock-h) - 24px); }
.sb-topbtns { display: flex; gap: 8px; flex: 0 0 auto; }
.sb-notes { display: flex; flex-direction: column; gap: 8px; width: 340px; flex: 0 1 auto; }
.sb-note { display: flex; gap: 10px; padding: 10px 10px 10px 12px; border-radius: var(--radius); position: relative; overflow: hidden; animation: sb-slide 220ms ease-out; cursor: pointer; }
@keyframes sb-slide { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: none; } }
.sb-note::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--nc, var(--accent)); }
.sb-note .sb-nic { width: 32px; height: 32px; border-radius: 50%; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; background: color-mix(in srgb, var(--nc, var(--accent)) 22%, transparent); }
.sb-note .sb-nic svg { width: 18px; height: 18px; }
.sb-note .sb-nt { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1 1 auto; }
.sb-note .sb-n1 { font-weight: 700; font-size: 13px; display: flex; justify-content: space-between; gap: 8px; }
.sb-note .sb-n1 .sb-when { font-weight: 600; font-size: 11px; color: var(--muted); flex: 0 0 auto; }
.sb-note .sb-n2 { font-size: 12px; color: var(--text-2); line-height: 1.35; }
.sb-note:hover { background: var(--bg-2); }
.sb-note.is-leaving { opacity: 0; transform: translateX(24px); transition: opacity 200ms, transform 200ms; }
.sb-side { width: 340px; border-radius: var(--radius); overflow: hidden; animation: sb-in 180ms ease-out; flex: 0 1 auto; min-height: 0; display: flex; flex-direction: column; }
.sb-side .sb-info-body { padding-bottom: 12px; }
.sb-side .sb-info-head .sb-h1 { font-size: 14px; }
.sb-spark { display: grid; grid-template-columns: 1fr; gap: 6px; }
.sb-spark-row { display: grid; grid-template-columns: 82px 1fr auto; align-items: center; gap: 8px; font-size: 12px; }
.sb-spark-row .sb-k { color: var(--text-2); }
.sb-spark-row canvas { width: 100%; height: 34px; display: block; border-radius: 4px; background: rgba(0,0,0,.25); }
.sb-spark-row .sb-v { font-weight: 600; min-width: 64px; text-align: right; }
.sb-journal { display: flex; flex-direction: column; gap: 2px; }
.sb-jrow { display: grid; grid-template-columns: 16px 1fr auto; gap: 8px; align-items: start; padding: 5px 4px; border-radius: 4px; font-size: 12px; }
.sb-jrow:hover { background: rgba(255,255,255,.05); }
.sb-jrow i { width: 8px; height: 8px; border-radius: 50%; margin-top: 4px; background: var(--nc, var(--accent)); }
.sb-jrow .sb-jt { font-weight: 600; }
.sb-jrow .sb-jb { color: var(--text-2); font-size: 11.5px; }
.sb-jrow .sb-when { color: var(--muted); font-size: 11px; font-weight: 600; }

/* ---------------------------------------------------------------- milestone toast */
.sb-toast { position: absolute; left: 50%; top: 64px; transform: translateX(-50%); width: 440px; border-radius: 10px; overflow: hidden;
  display: flex; align-items: center; gap: 14px; padding: 12px 18px 12px 14px; animation: sb-toast 6.5s ease forwards; pointer-events: none;
  background: linear-gradient(135deg, rgba(58, 44, 12, .92), rgba(15, 20, 29, .92)); border: 1px solid rgba(255, 215, 106, .45); box-shadow: 0 12px 40px rgba(0,0,0,.5), 0 0 0 1px rgba(255,215,106,.12) inset; }
@keyframes sb-toast-in { 0% { opacity: 0; transform: translate(-50%, -14px) scale(.96); } 100% { opacity: 1; transform: translate(-50%, 0) scale(1); } }
.sb-toast.is-sticky { animation: sb-toast-in 400ms ease-out forwards; }
@keyframes sb-toast { 0% { opacity: 0; transform: translate(-50%, -14px) scale(.96); } 6% { opacity: 1; transform: translate(-50%, 0) scale(1); } 88% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -8px); } }
.sb-toast .sb-tic { width: 54px; height: 54px; border-radius: 50%; flex: 0 0 auto; display: flex; align-items: center; justify-content: center;
  background: radial-gradient(circle at 40% 35%, #ffe28a, #d59a1f 70%); box-shadow: 0 0 0 4px rgba(255,215,106,.18), 0 4px 14px rgba(0,0,0,.4); }
.sb-toast .sb-tic svg { width: 32px; height: 32px; }
.sb-toast .sb-tt { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.sb-toast .sb-t0 { font-size: 10.5px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #ffd76a; }
.sb-toast .sb-t1 { font-size: 19px; font-weight: 700; letter-spacing: .01em; }
.sb-toast .sb-t2 { font-size: 12px; color: var(--text-2); }
.sb-toast .sb-t2 b { color: #9ed8a8; font-weight: 700; }

/* ---------------------------------------------------------------- modal: main menu, pause, save/load, settings */
.sb-modal { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 20; animation: sb-fade 200ms ease-out; }
@keyframes sb-fade { from { opacity: 0; } to { opacity: 1; } }
.sb-modal.is-pause { background: radial-gradient(ellipse at center, rgba(6, 9, 14, .55), rgba(6, 9, 14, .82)); }
.sb-modal.is-main { background: linear-gradient(90deg, rgba(6, 9, 14, .92) 0%, rgba(6, 9, 14, .78) 42%, rgba(6, 9, 14, .35) 100%); justify-content: flex-start; padding-left: 8%; }
.sb-menu { width: 400px; max-height: calc(100% - 24px); border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; }
.sb-menu-head { padding: 22px 26px 14px; border-bottom: 1px solid var(--line); background: rgba(0,0,0,.2); }
.sb-menu-head .sb-brand { font-size: 30px; font-weight: 200; letter-spacing: .32em; color: #fff; }
.sb-menu-head .sb-brand b { font-weight: 700; }
.sb-menu-head .sb-sub { font-size: 11.5px; color: var(--muted); letter-spacing: .14em; text-transform: uppercase; margin-top: 4px; }
.sb-menu-head .sb-h1 { font-size: 22px; font-weight: 700; letter-spacing: .02em; }
.sb-menu-head .sb-h2 { font-size: 12px; color: var(--text-2); margin-top: 3px; }
.sb-menu-body { padding: 14px 16px 18px; display: flex; flex-direction: column; gap: 6px; overflow-y: auto; min-height: 0; }
.sb-mbtn { display: flex; align-items: center; gap: 12px; height: 46px; padding: 0 14px; border-radius: 8px; font-size: 14px; font-weight: 600; color: var(--text); text-align: left;
  background: rgba(255,255,255,.05); border: 1px solid var(--line); transition: background 100ms, transform 100ms; }
.sb-mbtn svg { width: 24px; height: 24px; flex: 0 0 auto; }
.sb-mbtn .sb-ms { margin-left: auto; font-size: 11.5px; color: var(--muted); font-weight: 600; }
.sb-mbtn:hover { background: rgba(255,255,255,.1); transform: translateX(2px); }
.sb-mbtn.primary { background: linear-gradient(180deg, #47a0ff, #2b86ea); border-color: var(--accent-2); color: #fff; }
.sb-mbtn.primary:hover { background: linear-gradient(180deg, #55a8ff, #3590f0); }
.sb-mbtn.primary .sb-ms { color: rgba(255,255,255,.75); }
.sb-mbtn:disabled { opacity: .45; cursor: default; transform: none; }
.sb-menu-foot { padding: 10px 16px 14px; display: flex; gap: 8px; border-top: 1px solid var(--line); background: rgba(0,0,0,.14); }
.sb-menu-foot .sb-action { flex: 1 1 0; }
.sb-menu .sb-version { margin-left: auto; align-self: center; font-size: 10.5px; color: var(--muted); }
.sb-form { display: flex; flex-direction: column; gap: 10px; padding: 4px 0 2px; }
.sb-field { display: grid; grid-template-columns: 110px 1fr; align-items: center; gap: 10px; font-size: 12.5px; }
.sb-field .sb-k { color: var(--text-2); font-weight: 600; }
.sb-field .sb-h { grid-column: 2; font-size: 11px; color: var(--muted); margin-top: -6px; }
.sb-input { height: 32px; padding: 0 10px; border-radius: 6px; background: rgba(0,0,0,.35); border: 1px solid var(--line-2); color: var(--text); font-size: 13px; width: 100%; }
.sb-input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-dim); }
.sb-inrow { display: flex; gap: 6px; }
.sb-inrow .sb-input { flex: 1 1 auto; min-width: 0; }
.sb-seg { display: flex; gap: 2px; padding: 2px; background: rgba(0,0,0,.35); border-radius: 6px; }
.sb-seg .sb-btn { flex: 1 1 0; height: 26px; border-radius: 4px; font-size: 12px; font-weight: 600; color: var(--text-2); }
.sb-seg .sb-btn:hover { background: rgba(255,255,255,.08); }
.sb-seg .sb-btn.is-active { background: var(--accent); color: #fff; }
.sb-range { -webkit-appearance: none; appearance: none; width: 100%; height: 6px; border-radius: 3px; background: rgba(255,255,255,.12); outline: none; }
.sb-range::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: var(--accent-2); border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,.5); cursor: pointer; }
.sb-toggle { width: 42px; height: 24px; border-radius: 12px; background: rgba(255,255,255,.14); position: relative; transition: background 120ms; justify-self: start; }
.sb-toggle::after { content: ''; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: left 120ms; }
.sb-toggle.is-on { background: var(--accent); }
.sb-toggle.is-on::after { left: 21px; }
.sb-slots { display: flex; flex-direction: column; gap: 6px; }
.sb-slot { display: grid; grid-template-columns: 34px 1fr auto; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; background: rgba(255,255,255,.05); border: 1px solid var(--line); }
.sb-slot .sb-sic { width: 34px; height: 34px; border-radius: 8px; background: rgba(255,255,255,.07); display: flex; align-items: center; justify-content: center; }
.sb-slot .sb-sic svg { width: 22px; height: 22px; }
.sb-slot .sb-st { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.sb-slot .sb-s1 { font-weight: 700; font-size: 13px; }
.sb-slot .sb-s2 { font-size: 11.5px; color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sb-slot .sb-s2.empty { color: var(--muted); font-style: italic; }
.sb-slot .sb-sb { display: flex; gap: 4px; }
.sb-slot.is-autosave .sb-sic { background: rgba(47,143,245,.2); }
.sb-keys { display: grid; grid-template-columns: auto 1fr; gap: 5px 12px; font-size: 12px; color: var(--text-2); align-items: center; }
.sb-keys .sb-key { margin: 0; }

/* ---------------------------------------------------------------- dev corner */
.sb-dev { position: absolute; left: 50%; transform: translateX(-50%); top: 8px; display: flex; flex-direction: row; gap: 8px; align-items: center; z-index: 5; }
.sb-stats { font-family: 'DejaVu Sans Mono', ui-monospace, Menlo, Consolas, 'SF Mono', monospace; font-size: 10.5px; color: rgba(210, 222, 238, 0.85);
  background: rgba(8, 11, 17, 0.72); border: 1px solid rgba(255,255,255,.08); border-radius: 4px; padding: 3px 7px; letter-spacing: 0; line-height: 1.3; white-space: pre; }
.sb-stats b { color: #9fd1ff; font-weight: 600; }
.sb-devrow { display: flex; align-items: center; gap: 6px; font-size: 10.5px; color: rgba(210, 222, 238, 0.7); }
.sb-select { font: inherit; font-size: 10.5px; color: var(--text-2); background: rgba(8, 11, 17, 0.72); border: 1px solid rgba(255,255,255,.1); border-radius: 4px; padding: 2px 4px; }
.sb-select:hover { color: var(--text); background: rgba(8, 11, 17, 0.85); }
`;
