// UI stylesheet. Injected once as a <style> element by the ui module. Fonts: Aileron (CC0 1.0, bundled
// in ./fonts) with Inter / Segoe UI / system-ui fallbacks.
const f400 = new URL('./fonts/aileron-latin-400-normal.woff2', import.meta.url).href;
const f600 = new URL('./fonts/aileron-latin-600-normal.woff2', import.meta.url).href;
const f700 = new URL('./fonts/aileron-latin-700-normal.woff2', import.meta.url).href;

export const CSS = /* css */`
@font-face { font-family: 'Aileron'; font-style: normal; font-weight: 400; font-display: block; src: url(${f400}) format('woff2'); }
@font-face { font-family: 'Aileron'; font-style: normal; font-weight: 600; font-display: block; src: url(${f600}) format('woff2'); }
@font-face { font-family: 'Aileron'; font-style: normal; font-weight: 700; font-display: block; src: url(${f700}) format('woff2'); }

#ui > .sb-root { pointer-events: none; }
.sb-root {
  --bg: rgba(15, 20, 29, 0.80);
  --bg-2: rgba(22, 29, 41, 0.86);
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

/* ---------------------------------------------------------------- bottom dock */
.sb-dock { position: absolute; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; }
.sb-toolbar {
  height: 62px; display: flex; align-items: center; padding: 0 12px; gap: 14px;
  background: linear-gradient(180deg, rgba(20, 27, 38, 0.93), rgba(13, 18, 26, 0.96));
  border-top: 1px solid rgba(255, 255, 255, 0.09);
  box-shadow: 0 -8px 28px rgba(0, 0, 0, 0.35);
}
.sb-toolbar-left, .sb-toolbar-right { display: flex; align-items: center; gap: 10px; flex: 1 1 0; min-width: 0; }
.sb-toolbar-right { justify-content: flex-end; }
.sb-tools { display: flex; align-items: center; gap: 4px; flex: 0 0 auto; }
.sb-tool {
  width: 46px; height: 46px; border-radius: 8px; display: flex; align-items: center; justify-content: center;
  transition: background 110ms ease, transform 110ms ease, box-shadow 110ms ease; position: relative;
}
.sb-tool svg { width: 30px; height: 30px; filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.5)); }
.sb-tool:hover { background: rgba(255, 255, 255, 0.09); transform: translateY(-1px); }
.sb-tool:active { transform: translateY(0); background: rgba(255, 255, 255, 0.13); }
.sb-tool.is-active {
  background: linear-gradient(180deg, #47a0ff, #2b86ea);
  box-shadow: 0 0 0 1px rgba(120, 190, 255, 0.55), 0 6px 16px rgba(47, 143, 245, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.35);
}
.sb-tool.is-active::before {
  content: ''; position: absolute; left: 8px; right: 8px; top: -9px; height: 3px; border-radius: 2px; background: #8ccbff; opacity: .9;
}
.sb-tool.is-dim svg { opacity: 0.45; filter: saturate(0.3); }
.sb-sep { width: 1px; height: 34px; background: var(--line-2); margin: 0 6px; }

.sb-milestone { display: flex; align-items: center; gap: 10px; height: 46px; padding: 0 14px 0 6px; border-radius: 24px;
  background: rgba(255, 255, 255, 0.05); border: 1px solid var(--line); }
.sb-milestone:hover { background: rgba(255, 255, 255, 0.09); }
.sb-badge { position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; }
.sb-badge svg { position: absolute; inset: 0; width: 36px; height: 36px; }
.sb-badge .sb-badge-num { position: relative; font-weight: 700; font-size: 13px; color: #fff; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6); }
.sb-milestone-text { display: flex; flex-direction: column; gap: 2px; }
.sb-milestone-text .sb-t1 { font-weight: 700; font-size: 13px; letter-spacing: 0.06em; text-transform: uppercase; color: #ffd76a; }
.sb-milestone-text .sb-t2 { font-size: 11px; color: var(--text-2); }
.sb-xp { width: 120px; height: 4px; border-radius: 2px; background: rgba(255, 255, 255, 0.1); overflow: hidden; margin-top: 1px; }
.sb-xp > i { display: block; height: 100%; width: 40%; background: linear-gradient(90deg, #ffd76a, #f5a623); border-radius: 2px; }

.sb-rci { display: grid; grid-template-columns: auto 1fr; column-gap: 8px; row-gap: 3px; align-items: center;
  height: 46px; padding: 5px 12px; border-radius: 8px; background: rgba(255, 255, 255, 0.05); border: 1px solid var(--line); min-width: 150px; }
.sb-rci .sb-rci-l { font-size: 10px; font-weight: 700; letter-spacing: 0.06em; color: var(--text-2); width: 10px; text-align: center; }
.sb-rci .sb-rci-b { height: 6px; border-radius: 3px; background: rgba(255, 255, 255, 0.09); overflow: hidden; width: 96px; }
.sb-rci .sb-rci-b > i { display: block; height: 100%; width: 0; border-radius: 3px; transition: width 500ms ease; }
.sb-rci .r > i { background: linear-gradient(90deg, #3fb84f, #7ee089); }
.sb-rci .c > i { background: linear-gradient(90deg, #2f8ff5, #7cc3ff); }
.sb-rci .i > i { background: linear-gradient(90deg, #f28c28, #ffc06a); }
.sb-rci .o > i { background: linear-gradient(90deg, #8f5cf0, #c8a6ff); }

.sb-round { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, 0.06); border: 1px solid var(--line); transition: background 110ms ease, transform 110ms ease; }
.sb-round svg { width: 22px; height: 22px; }
.sb-round:hover { background: rgba(255, 255, 255, 0.12); transform: translateY(-1px); }
.sb-round.is-active { background: var(--accent); border-color: var(--accent-2); }

/* ---------------------------------------------------------------- status strip */
.sb-status {
  height: 40px; display: flex; align-items: center; gap: 8px; padding: 0 10px;
  background: rgba(8, 11, 17, 0.92); border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.sb-chip { display: flex; align-items: center; gap: 8px; height: 30px; padding: 0 10px; border-radius: 6px;
  background: rgba(255, 255, 255, 0.045); border: 1px solid var(--line); white-space: nowrap; }
.sb-chip svg { width: 18px; height: 18px; flex: 0 0 auto; }
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
.sb-ctl.is-active svg path, .sb-ctl.is-active svg polygon, .sb-ctl.is-active svg rect { fill: #fff; }
.sb-speed { display: flex; gap: 1px; margin-left: 2px; padding: 2px; border-radius: 6px; background: rgba(0, 0, 0, 0.35); }
.sb-speed .sb-ctl { width: 24px; height: 22px; }
.sb-speed .sb-ctl svg { width: 16px; height: 12px; }
.sb-speed .sb-ctl svg polygon { fill: #6c7a8c; }
.sb-speed .sb-ctl:hover svg polygon { fill: #a9b7c8; }
.sb-speed .sb-ctl.is-active { background: var(--accent); }
.sb-speed .sb-ctl.is-active svg polygon { fill: #fff; }
.sb-status .sb-spacer { flex: 1 1 auto; }
.sb-cityname { font-weight: 700; letter-spacing: 0.02em; font-size: 13px; padding: 0 18px; }
.sb-trend { font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 2px; }
.sb-trend svg { width: 10px; height: 10px; }
.sb-trend.up { color: #5fd76c; } .sb-trend.down { color: #ff6a6a; }
.sb-faces { display: flex; gap: 3px; }
.sb-faces svg { width: 18px; height: 18px; opacity: .35; }
.sb-faces svg.on { opacity: 1; }
.sb-money .sb-v { color: #b9f0c0; }

/* ---------------------------------------------------------------- sub panel (asset picker) */
.sb-subpanel {
  position: absolute; left: 50%; bottom: 112px; transform: translateX(-50%);
  width: 780px; max-width: calc(100% - 24px); border-radius: var(--radius); overflow: hidden;
  animation: sb-rise 160ms ease-out;
}
@keyframes sb-rise { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
.sb-subpanel-head { display: flex; align-items: center; height: 42px; padding: 0 8px 0 12px; background: rgba(0, 0, 0, 0.28); border-bottom: 1px solid var(--line); gap: 6px; }
.sb-subpanel-head .sb-title { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 13px; letter-spacing: 0.03em; text-transform: uppercase; color: var(--text-2); padding-right: 14px; margin-right: 8px; border-right: 1px solid var(--line-2); height: 26px; }
.sb-subpanel-head .sb-title svg { width: 22px; height: 22px; }
.sb-tab { height: 30px; padding: 0 14px; border-radius: 5px; font-size: 12px; font-weight: 600; color: var(--text-2); display: flex; align-items: center; gap: 6px; transition: background 100ms; }
.sb-tab svg { width: 18px; height: 18px; }
.sb-tab:hover { background: rgba(255, 255, 255, 0.08); color: var(--text); }
.sb-tab.is-active { background: var(--accent); color: #fff; }
.sb-subpanel-head .sb-close { margin-left: auto; }
.sb-close { width: 28px; height: 28px; border-radius: 5px; display: flex; align-items: center; justify-content: center; color: var(--text-2); }
.sb-close svg { width: 14px; height: 14px; }
.sb-close:hover { background: rgba(255, 80, 80, 0.25); color: #fff; }
.sb-subpanel-body { display: flex; }
.sb-toolmodes { width: 232px; flex: 0 0 auto; padding: 10px 12px; border-right: 1px solid var(--line); display: flex; flex-direction: column; gap: 8px; background: rgba(0,0,0,.14); }
.sb-tm-row { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.sb-tm-row .sb-k { font-size: 12px; color: var(--text-2); font-weight: 600; white-space: nowrap; }
.sb-tm-group { display: flex; gap: 2px; padding: 2px; background: rgba(0,0,0,.35); border-radius: 6px; }
.sb-tm { width: 28px; height: 26px; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
.sb-tm svg { width: 18px; height: 18px; }
.sb-tm:hover { background: rgba(255,255,255,.1); }
.sb-tm.is-active { background: var(--accent); }
.sb-stepper { display: flex; align-items: center; gap: 2px; padding: 2px; background: rgba(0,0,0,.35); border-radius: 6px; }
.sb-stepper .sb-val { min-width: 52px; text-align: center; font-weight: 700; font-size: 12px; }
.sb-cards { flex: 1 1 auto; display: grid; grid-template-columns: repeat(auto-fill, 92px); gap: 8px; padding: 12px; align-content: start; }
.sb-card { width: 92px; height: 86px; border-radius: 6px; background: rgba(255, 255, 255, 0.05); border: 1px solid var(--line);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; padding: 6px 4px; transition: background 100ms, border-color 100ms, transform 100ms; position: relative; }
.sb-card svg { width: 44px; height: 34px; }
.sb-card .sb-cn { font-size: 11px; font-weight: 600; color: var(--text-2); text-align: center; line-height: 1.15; max-width: 84px; }
.sb-card .sb-cc { font-size: 10px; color: #9ed8a8; font-weight: 600; }
.sb-card:hover { background: rgba(255, 255, 255, 0.1); border-color: var(--line-2); transform: translateY(-1px); }
.sb-card.is-active { background: linear-gradient(180deg, rgba(47,143,245,.55), rgba(47,143,245,.35)); border-color: #7fc0ff; box-shadow: 0 0 0 1px rgba(127,192,255,.5), 0 4px 14px rgba(47,143,245,.35); }
.sb-card.is-active .sb-cn { color: #fff; }
.sb-card.is-locked { opacity: .45; }
.sb-card.is-locked::after { content: ''; position: absolute; right: 5px; top: 5px; width: 10px; height: 10px; border-radius: 2px; background: #9aa; }

/* ---------------------------------------------------------------- tool hint */
.sb-hint { position: absolute; left: 50%; transform: translateX(-50%); bottom: 118px; display: flex; gap: 14px; align-items: center;
  height: 28px; padding: 0 12px; border-radius: 14px; font-size: 12px; color: var(--text-2); background: rgba(8, 11, 17, 0.72); border: 1px solid var(--line); }
.sb-hint b { color: var(--text); font-weight: 700; }
.sb-hint .sb-key { display: inline-block; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 4px; background: rgba(255,255,255,.12); border: 1px solid var(--line-2);
  font-size: 10.5px; font-weight: 700; line-height: 16px; text-align: center; color: #fff; margin-right: 4px; }
.sb-hint.is-raised { bottom: 348px; }

/* ---------------------------------------------------------------- info panel */
.sb-info { position: absolute; left: 12px; bottom: 114px; width: 372px; border-radius: var(--radius); overflow: hidden; animation: sb-in 180ms ease-out; }
@keyframes sb-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.sb-info-head { display: flex; align-items: center; gap: 10px; padding: 10px 10px 10px 12px; background: rgba(0, 0, 0, 0.28); border-bottom: 1px solid var(--line); }
.sb-info-head .sb-ic { width: 38px; height: 38px; border-radius: 8px; background: rgba(255,255,255,.07); display: flex; align-items: center; justify-content: center; flex: 0 0 auto; }
.sb-info-head .sb-ic svg { width: 26px; height: 26px; }
.sb-info-head .sb-ht { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1 1 auto; }
.sb-info-head .sb-h1 { font-weight: 700; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sb-info-head .sb-h2 { font-size: 11.5px; color: var(--text-2); display: flex; align-items: center; gap: 6px; }
.sb-pill { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 10px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: #fff; }
.sb-info-body { padding: 8px 12px 10px; display: flex; flex-direction: column; gap: 6px; }
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
.sb-actions { display: flex; gap: 6px; padding: 8px 12px 12px; border-top: 1px solid var(--line); background: rgba(0,0,0,.14); }
.sb-action { flex: 1 1 0; height: 32px; border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px; font-weight: 700;
  background: rgba(255,255,255,.07); border: 1px solid var(--line); color: var(--text); transition: background 100ms; }
.sb-action svg { width: 16px; height: 16px; }
.sb-action:hover { background: rgba(255,255,255,.13); }
.sb-action.primary { background: var(--accent); border-color: var(--accent-2); }
.sb-action.primary:hover { background: #4499f7; }
.sb-action.danger:hover { background: rgba(229,72,77,.35); border-color: rgba(229,72,77,.6); }

/* ---------------------------------------------------------------- notifications */
.sb-topright { position: absolute; right: 14px; top: 12px; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
.sb-topbtns { display: flex; gap: 8px; }
.sb-notes { display: flex; flex-direction: column; gap: 8px; width: 340px; }
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

/* ---------------------------------------------------------------- dev corner */
.sb-dev { position: absolute; left: 12px; top: 12px; display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
.sb-stats { font-family: 'DejaVu Sans Mono', ui-monospace, Menlo, Consolas, 'SF Mono', monospace; font-size: 10.5px; color: rgba(210, 222, 238, 0.78);
  background: rgba(8, 11, 17, 0.55); border: 1px solid rgba(255,255,255,.06); border-radius: 4px; padding: 3px 7px; letter-spacing: 0; line-height: 1.3; white-space: pre; }
.sb-stats b { color: #9fd1ff; font-weight: 600; }
.sb-devrow { display: flex; align-items: center; gap: 6px; font-size: 10.5px; color: rgba(210, 222, 238, 0.7); }
.sb-select { font: inherit; font-size: 10.5px; color: var(--text-2); background: rgba(8, 11, 17, 0.55); border: 1px solid rgba(255,255,255,.08); border-radius: 4px; padding: 2px 4px; }
.sb-select:hover { color: var(--text); background: rgba(8, 11, 17, 0.75); }
`;
