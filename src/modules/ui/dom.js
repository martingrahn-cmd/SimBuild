// Tiny DOM helpers shared by the HUD files.
export const fmtInt = new Intl.NumberFormat('en-US');
export function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}
export function btn(cls, html, tip) {
  const b = el('button', 'sb-btn ' + cls, html);
  b.type = 'button';
  if (tip) b.setAttribute('data-tip', tip);
  return b;
}
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const pad2 = (n) => (n < 10 ? '0' : '') + n;
export const clamp01 = (v) => Math.max(0, Math.min(1, v || 0));
