// Inline SVG icon set (flat, two-tone, CS2-flavoured). Every icon is a 32×32 viewBox string.
const wrap = (inner, vb = '0 0 32 32') => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;

const P = {
  yellow: '#f7c948', yellowD: '#d9a520', orange: '#f4892b', orangeD: '#c96a12', red: '#e8474c', redD: '#b8262b',
  green: '#4fc65d', greenD: '#2f9a3c', greenL: '#8be996', blue: '#3b9cf5', blueD: '#1f6fcb', blueL: '#8cc8ff',
  purple: '#a56ff0', purpleD: '#7b46c9', teal: '#37c5c9', grey: '#8f99a8', greyD: '#5b6472', greyL: '#c9d1dc',
  dark: '#2c3440', darkD: '#1b2029', white: '#f5f8fc', brown: '#8a5a34', brownD: '#5f3b1f', asphalt: '#4a525d', asphaltL: '#5c6572',
};

// -------------------------------------------------------------------------------- toolbar categories
const roads = () => wrap(`
  <path d="M3 29 L11 3 H21 L29 29 Z" fill="${P.asphalt}"/>
  <path d="M6 28 L12.5 5 H19.5 L26 28 Z" fill="${P.asphaltL}"/>
  <path d="M3 29 L11 3 H12.6 L5.2 29 Z" fill="${P.greyL}" opacity=".9"/>
  <path d="M29 29 L21 3 H19.4 L26.8 29 Z" fill="${P.greyL}" opacity=".9"/>
  <path d="M15.6 6 h0.8 l0.35 3.2 h-1.5 z M15.15 12.2 h1.7 l0.45 4.2 h-2.6 z M14.5 19.6 h3 l0.6 6 h-4.2 z" fill="${P.yellow}"/>`);

const zoning = () => wrap(`
  <rect x="3" y="10" width="13" height="13" rx="2.5" fill="${P.green}"/>
  <rect x="3" y="10" width="13" height="4" rx="2" fill="${P.greenL}" opacity=".5"/>
  <rect x="11" y="4" width="13" height="13" rx="2.5" fill="${P.blue}" stroke="${P.darkD}" stroke-opacity=".35"/>
  <rect x="11" y="4" width="13" height="4" rx="2" fill="${P.blueL}" opacity=".5"/>
  <rect x="16" y="15" width="13" height="13" rx="2.5" fill="${P.orange}" stroke="${P.darkD}" stroke-opacity=".35"/>
  <rect x="16" y="15" width="13" height="4" rx="2" fill="#ffc98a" opacity=".5"/>`);

const terrain = () => wrap(`
  <path d="M2 25 Q9 7 16 19 Q21 4 30 25 Z" fill="${P.green}"/>
  <path d="M2 25 Q9 7 16 19 Q13 12 8.5 15 Q5 18 2 25 Z" fill="${P.greenL}" opacity=".55"/>
  <path d="M21 8 Q25 12 27.5 20 Q24 13 21 12 Z" fill="${P.greenL}" opacity=".5"/>
  <rect x="2" y="24" width="28" height="5.5" rx="1.5" fill="${P.brown}"/>
  <rect x="2" y="27" width="28" height="2.5" rx="1" fill="${P.brownD}"/>`);

const props = () => wrap(`
  <rect x="9.5" y="21" width="4" height="9" rx="1" fill="${P.brown}"/>
  <circle cx="11.5" cy="12" r="7.5" fill="${P.green}"/>
  <circle cx="9" cy="10" r="3.5" fill="${P.greenL}" opacity=".6"/>
  <circle cx="15.5" cy="15" r="4" fill="${P.greenD}" opacity=".6"/>
  <rect x="24" y="9" width="2.4" height="21" rx="1" fill="${P.greyD}"/>
  <path d="M19 9 h9 l-1.5 -4 h-6 z" fill="${P.grey}"/>
  <rect x="21" y="9.5" width="5" height="3" rx="1.5" fill="${P.yellow}"/>
  <rect x="22" y="28" width="6.4" height="2" rx="1" fill="${P.greyD}"/>`);

const bulldoze = () => wrap(`
  <rect x="4" y="21" width="17" height="7" rx="3.5" fill="${P.dark}"/>
  <circle cx="8" cy="24.5" r="2" fill="${P.grey}"/><circle cx="12.5" cy="24.5" r="2" fill="${P.grey}"/><circle cx="17" cy="24.5" r="2" fill="${P.grey}"/>
  <path d="M6 20 V13 a2 2 0 0 1 2 -2 h5 l3 -5 h4 v14 z" fill="${P.yellow}"/>
  <path d="M14 11 l2.2 -3.6 h2.8 v3.6 z" fill="${P.blueL}"/>
  <rect x="9" y="6" width="1.6" height="5" fill="${P.greyD}"/>
  <path d="M20 14 h5 v7 h-5 z" fill="${P.yellowD}"/>
  <path d="M24 13 h5 v13 l-5 2 z" fill="${P.grey}"/>
  <path d="M24 13 h5 v3 h-5 z" fill="${P.greyL}"/>`);

const info = () => wrap(`
  <circle cx="16" cy="16" r="13" fill="${P.blue}"/>
  <circle cx="16" cy="16" r="13" fill="url(#g)" opacity="0"/>
  <path d="M16 4 a12 12 0 0 1 12 12" stroke="${P.blueL}" stroke-width="2" fill="none" opacity=".5"/>
  <circle cx="16" cy="9.5" r="2" fill="${P.white}"/>
  <rect x="14.2" y="13.5" width="3.6" height="11" rx="1.5" fill="${P.white}"/>`);

const electricity = () => wrap(`
  <path d="M18 2 L7 18 h7 l-2 12 L25 13 h-7 z" fill="${P.yellow}"/>
  <path d="M18 2 L7 18 h5 L18 5 z" fill="#fff2b3" opacity=".5"/>`);

const water = () => wrap(`
  <path d="M16 2.5 C10 11 6 15 6 20.5 a10 10 0 0 0 20 0 C26 15 22 11 16 2.5 z" fill="${P.blue}"/>
  <path d="M11 20 a5 5 0 0 0 4 5.5" stroke="${P.blueL}" stroke-width="2.4" stroke-linecap="round" fill="none"/>`);

const health = () => wrap(`
  <circle cx="16" cy="16" r="13.5" fill="${P.white}"/>
  <rect x="13" y="6" width="6" height="20" rx="1.5" fill="${P.red}"/>
  <rect x="6" y="13" width="20" height="6" rx="1.5" fill="${P.red}"/>`);

const fire = () => wrap(`
  <path d="M16 2 C17 8 23 9 23 17 a7 7 0 0 1 -14 0 c0 -3 1.5 -5 3 -6 c0 3 1 4 2.5 4.5 C13 9 15 6 16 2 z" fill="${P.orange}"/>
  <path d="M16 15 c2 2 4 3.5 4 6 a4 4 0 0 1 -8 0 c0 -2 1.5 -3 2 -4 c0.3 1.5 1 2 2 2.3 c-0.5 -1.5 -0.2 -3 0 -4.3 z" fill="${P.yellow}"/>`);

const police = () => wrap(`
  <path d="M16 2.5 L27 6.5 V15 c0 7 -5 12 -11 14.5 C10 27 5 22 5 15 V6.5 z" fill="${P.blueD}"/>
  <path d="M16 2.5 L27 6.5 V15 c0 7 -5 12 -11 14.5 z" fill="${P.blue}"/>
  <path d="M16 8.5 l1.9 4 4.4 .5 -3.3 3 .9 4.4 -3.9 -2.2 -3.9 2.2 .9 -4.4 -3.3 -3 4.4 -.5 z" fill="${P.yellow}"/>`);

const education = () => wrap(`
  <path d="M16 6 L30 13 L16 20 L2 13 z" fill="${P.dark}"/>
  <path d="M16 6 L30 13 L16 20 z" fill="#3d4756"/>
  <path d="M8 16 v6 c0 2.5 4 4.5 8 4.5 s8 -2 8 -4.5 v-6 l-8 4 z" fill="${P.greyD}"/>
  <path d="M27 13.5 v8" stroke="${P.yellow}" stroke-width="2" stroke-linecap="round"/>
  <circle cx="27" cy="22.5" r="2" fill="${P.yellow}"/>`);

const transit = () => wrap(`
  <rect x="4" y="5" width="24" height="21" rx="4" fill="${P.green}"/>
  <rect x="4" y="5" width="24" height="7" rx="4" fill="${P.greenL}" opacity=".45"/>
  <rect x="6.5" y="9" width="8" height="7" rx="1.5" fill="${P.blueL}"/>
  <rect x="17.5" y="9" width="8" height="7" rx="1.5" fill="${P.blueL}"/>
  <rect x="6.5" y="19" width="19" height="3" rx="1.5" fill="${P.greenD}"/>
  <circle cx="10" cy="27" r="3" fill="${P.dark}"/><circle cx="22" cy="27" r="3" fill="${P.dark}"/>
  <rect x="7" y="23" width="3" height="2" fill="${P.yellow}"/><rect x="22" y="23" width="3" height="2" fill="${P.yellow}"/>`);

const parks = () => wrap(`
  <rect x="13.8" y="18" width="4.4" height="12" rx="1.2" fill="${P.brown}"/>
  <path d="M16 2 L25 15 h-5 l6 8 H6 l6 -8 H7 z" fill="${P.green}"/>
  <path d="M16 2 L25 15 h-5 l6 8 h-10 z" fill="${P.greenD}" opacity=".55"/>
  <path d="M16 2 L7 15 h4 l-2 3 h5 z" fill="${P.greenL}" opacity=".35"/>`);

// -------------------------------------------------------------------------------- toolbar right / top
const layers = () => wrap(`
  <path d="M16 4 L29 11 L16 18 L3 11 z" fill="${P.blue}"/>
  <path d="M3 16 L16 23 L29 16 v3 L16 26 L3 19 z" fill="${P.green}"/>
  <path d="M3 22 L16 29 L29 22 v2 L16 31 L3 24 z" fill="${P.orange}"/>`);
const stats = () => wrap(`
  <rect x="4" y="16" width="6" height="13" rx="1.5" fill="${P.blue}"/>
  <rect x="13" y="8" width="6" height="21" rx="1.5" fill="${P.green}"/>
  <rect x="22" y="12" width="6" height="17" rx="1.5" fill="${P.orange}"/>
  <path d="M5 12 L14 5 L22 9 L28 4" stroke="${P.white}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>`);
const camera = () => wrap(`
  <rect x="3" y="9" width="26" height="18" rx="3" fill="${P.greyL}"/>
  <rect x="3" y="9" width="26" height="5" rx="2" fill="${P.white}" opacity=".5"/>
  <path d="M11 9 l2 -4 h6 l2 4 z" fill="${P.grey}"/>
  <circle cx="16" cy="18.5" r="6" fill="${P.dark}"/><circle cx="16" cy="18.5" r="3.5" fill="${P.blue}"/><circle cx="14.5" cy="17" r="1.2" fill="${P.white}"/>
  <rect x="23" y="12" width="3" height="2" rx="1" fill="${P.red}"/>`);
const gear = () => wrap(`
  <path d="M13.5 3h5l.8 3.6 2.6 1.1 3.1-2 3.5 3.5-2 3.1 1.1 2.6 3.6.8v5l-3.6.8-1.1 2.6 2 3.1-3.5 3.5-3.1-2-2.6 1.1-.8 3.6h-5l-.8-3.6-2.6-1.1-3.1 2-3.5-3.5 2-3.1-1.1-2.6L3 18.5v-5l3.6-.8 1.1-2.6-2-3.1 3.5-3.5 3.1 2 2.6-1.1z" fill="${P.greyL}"/>
  <circle cx="16" cy="16" r="5" fill="${P.dark}"/>`);
const help = () => wrap(`
  <circle cx="16" cy="16" r="13" fill="${P.blue}"/>
  <path d="M11.5 12.5 a4.5 4.5 0 1 1 6.5 4 c-1.5 .8 -2 1.6 -2 3.2" stroke="${P.white}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <circle cx="16" cy="24" r="1.8" fill="${P.white}"/>`);
const bell = () => wrap(`
  <path d="M16 3 a2 2 0 0 1 2 2 v1 a8 8 0 0 1 6 8 v6 l3 4 H5 l3 -4 v-6 a8 8 0 0 1 6 -8 V5 a2 2 0 0 1 2 -2 z" fill="${P.yellow}"/>
  <path d="M12.5 26 a3.5 3.5 0 0 0 7 0 z" fill="${P.yellowD}"/>`);

// -------------------------------------------------------------------------------- status strip
const play = () => wrap(`<path d="M9 5 L26 16 L9 27 z" fill="${P.white}"/>`);
const pause = () => wrap(`<rect x="7" y="5" width="7" height="22" rx="1.5" fill="${P.white}"/><rect x="18" y="5" width="7" height="22" rx="1.5" fill="${P.white}"/>`);
const chevrons = (n) => {
  let s = '';
  for (let i = 0; i < n; i++) { const x = 2 + i * 10 - (n - 1) * 5 + 6; s += `<polygon points="${x},4 ${x + 10},16 ${x},28 ${x - 4},28 ${x + 6},16 ${x - 4},4" fill="${P.white}"/>`; }
  return wrap(s);
};
const sun = () => wrap(`
  <circle cx="16" cy="16" r="6.5" fill="${P.yellow}"/>
  <g stroke="${P.yellow}" stroke-width="2.4" stroke-linecap="round"><path d="M16 3v4M16 25v4M3 16h4M25 16h4M6.8 6.8l2.8 2.8M22.4 22.4l2.8 2.8M6.8 25.2l2.8-2.8M22.4 9.6l2.8-2.8"/></g>`);
const cloud = () => wrap(`<path d="M9 26 a5.5 5.5 0 0 1 -1 -10.9 A8 8 0 0 1 23.5 12 a6 6 0 0 1 1 11.9 z" fill="${P.greyL}"/><path d="M9 26 a5.5 5.5 0 0 1 -1 -10.9 A8 8 0 0 1 23.5 12 l-2 3 c-4 -3 -9 -1 -10 5 z" fill="${P.white}" opacity=".5"/>`);
const rainIcon = () => wrap(`<path d="M9 21 a5 5 0 0 1 -1 -9.9 A8 8 0 0 1 23.5 9 a5.5 5.5 0 0 1 1 10.9 z" fill="${P.greyL}"/><g stroke="${P.blue}" stroke-width="2.2" stroke-linecap="round"><path d="M10 24l-1.5 4M16 24l-1.5 4M22 24l-1.5 4"/></g>`);
const moon = () => wrap(`<path d="M20 3 a12 12 0 1 0 9 17 a9.5 9.5 0 0 1 -9 -17 z" fill="${P.yellow}"/>`);
const people = () => wrap(`
  <circle cx="11" cy="9" r="4.5" fill="${P.blueL}"/><path d="M3 24 a8 8 0 0 1 16 0 v3 H3 z" fill="${P.blueL}"/>
  <circle cx="22" cy="10.5" r="4" fill="${P.blue}"/><path d="M16 26 a7 7 0 0 1 13.5 -3 V28 H16 z" fill="${P.blue}"/>`);
const money = () => wrap(`
  <rect x="2" y="8" width="28" height="17" rx="2.5" fill="${P.green}"/>
  <rect x="4.5" y="10.5" width="23" height="12" rx="1.5" fill="none" stroke="${P.greenL}" stroke-width="1.2" opacity=".8"/>
  <circle cx="16" cy="16.5" r="4.5" fill="${P.greenD}"/><text x="16" y="19.3" text-anchor="middle" font-size="8.5" font-weight="700" fill="${P.white}" font-family="sans-serif">¢</text>`);
const face = (mood) => {
  const col = mood > 0.66 ? P.green : mood > 0.33 ? P.yellow : P.red;
  const mouth = mood > 0.66 ? 'M10.5 19 q5.5 5 11 0' : mood > 0.33 ? 'M11 20 h10' : 'M10.5 22 q5.5 -5 11 0';
  return wrap(`<circle cx="16" cy="16" r="13" fill="${col}"/><circle cx="11.5" cy="12.5" r="2" fill="${P.darkD}"/><circle cx="20.5" cy="12.5" r="2" fill="${P.darkD}"/><path d="${mouth}" stroke="${P.darkD}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`);
};
const trendUp = () => wrap(`<path d="M16 6 L28 20 H4 z" fill="currentColor"/>`);
const trendDown = () => wrap(`<path d="M16 26 L4 12 H28 z" fill="currentColor"/>`);
const close = () => wrap(`<path d="M7 7 L25 25 M25 7 L7 25" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>`);
const chevronDown = () => wrap(`<path d="M7 12 L16 21 L25 12" stroke="currentColor" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
const chevronUp = () => wrap(`<path d="M7 20 L16 11 L25 20" stroke="currentColor" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
const plus = () => wrap(`<path d="M16 6v20M6 16h20" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>`);
const minus = () => wrap(`<path d="M6 16h20" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>`);
const star = () => wrap(`<path d="M16 3 l3.8 8.2 9 1 -6.7 6.2 1.8 8.9 -7.9 -4.5 -7.9 4.5 1.8 -8.9 -6.7 -6.2 9 -1 z" fill="${P.yellow}"/>`);

// -------------------------------------------------------------------------------- notifications
const noteInfo = () => wrap(`<circle cx="16" cy="16" r="13" fill="${P.blue}"/><circle cx="16" cy="9.5" r="2" fill="${P.white}"/><rect x="14.2" y="13.5" width="3.6" height="11" rx="1.5" fill="${P.white}"/>`);
const noteWarn = () => wrap(`<path d="M16 3 L30 28 H2 z" fill="${P.yellow}"/><rect x="14.3" y="11" width="3.4" height="9" rx="1.5" fill="${P.darkD}"/><circle cx="16" cy="24" r="2" fill="${P.darkD}"/>`);
const noteOk = () => wrap(`<circle cx="16" cy="16" r="13" fill="${P.green}"/><path d="M9 16.5 L14 21.5 L23.5 11.5" stroke="${P.white}" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
const noteErr = () => wrap(`<circle cx="16" cy="16" r="13" fill="${P.red}"/><path d="M10.5 10.5 L21.5 21.5 M21.5 10.5 L10.5 21.5" stroke="${P.white}" stroke-width="3.4" stroke-linecap="round"/>`);
const noteMoney = () => money();
const noteBuilding = () => wrap(`<rect x="5" y="4" width="22" height="25" rx="2" fill="${P.blueL}"/><rect x="5" y="4" width="22" height="5" rx="2" fill="${P.white}" opacity=".5"/>
  <g fill="${P.blueD}"><rect x="9" y="10" width="4" height="3.5"/><rect x="14" y="10" width="4" height="3.5"/><rect x="19" y="10" width="4" height="3.5"/><rect x="9" y="15.5" width="4" height="3.5"/><rect x="14" y="15.5" width="4" height="3.5"/><rect x="19" y="15.5" width="4" height="3.5"/><rect x="9" y="21" width="4" height="3.5"/><rect x="19" y="21" width="4" height="3.5"/></g><rect x="14" y="22" width="4" height="7" fill="${P.dark}"/>`);

// -------------------------------------------------------------------------------- info panel / selection kinds
const house = () => wrap(`
  <path d="M16 4 L30 15 H26 V28 H6 V15 H2 z" fill="${P.green}"/>
  <path d="M16 4 L30 15 H26 V17 L16 9 L6 17 V15 H2 z" fill="${P.redD}"/>
  <path d="M16 5.5 L28.5 15 H26 V17 L16 9 z" fill="${P.red}"/>
  <rect x="13" y="19" width="6" height="9" fill="${P.brownD}"/><rect x="8" y="18" width="4" height="4" fill="${P.blueL}"/><rect x="20" y="18" width="4" height="4" fill="${P.blueL}"/>`);
const office = () => wrap(`
  <rect x="7" y="3" width="18" height="26" rx="1.5" fill="${P.blueD}"/>
  <rect x="7" y="3" width="9" height="26" fill="${P.blue}"/>
  <g fill="${P.blueL}"><rect x="9.5" y="6" width="3" height="3"/><rect x="14.5" y="6" width="3" height="3"/><rect x="19.5" y="6" width="3" height="3"/>
  <rect x="9.5" y="11" width="3" height="3"/><rect x="14.5" y="11" width="3" height="3"/><rect x="19.5" y="11" width="3" height="3"/>
  <rect x="9.5" y="16" width="3" height="3"/><rect x="14.5" y="16" width="3" height="3"/><rect x="19.5" y="16" width="3" height="3"/>
  <rect x="9.5" y="21" width="3" height="3"/><rect x="19.5" y="21" width="3" height="3"/></g>
  <rect x="14" y="23" width="4" height="6" fill="${P.darkD}"/><rect x="4" y="29" width="24" height="1.5" fill="${P.grey}"/>`);
const factory = () => wrap(`
  <path d="M3 29 V13 l7 4 v-4 l7 4 v-4 l7 4 V8 h4 v21 z" fill="${P.orange}"/>
  <path d="M24 8 h4 v9 h-4 z" fill="${P.orangeD}"/>
  <g fill="${P.dark}"><rect x="6" y="20" width="4" height="4"/><rect x="13" y="20" width="4" height="4"/><rect x="20" y="20" width="4" height="4"/></g>
  <rect x="3" y="27" width="28" height="2" fill="${P.orangeD}"/>`);
const shop = () => wrap(`
  <rect x="4" y="12" width="24" height="17" rx="1" fill="${P.blue}"/>
  <path d="M3 7 h26 l2 6 H1 z" fill="${P.blueD}"/>
  <path d="M1 13 h30 c0 3 -2.5 3 -5 3 s-5 0 -5 -3 c0 3 -2.5 3 -5 3 s-5 0 -5 -3 c0 3 -2.5 3 -5 3 s-5 0 -5 -3 z" fill="${P.white}"/>
  <rect x="7" y="18" width="7" height="6" fill="${P.blueL}"/><rect x="18" y="18" width="6" height="11" fill="${P.darkD}"/>`);
const vehicle = () => wrap(`
  <path d="M3 20 v-4 l4 -1 l3 -6 h11 l4 7 h4 v5 h-2 a3 3 0 0 0 -6 0 h-9 a3 3 0 0 0 -6 0 H3 z" fill="${P.red}"/>
  <path d="M9 15 l2.5 -5 h4 v5 z M17 10 h3.5 l3 5 H17 z" fill="${P.blueL}"/>
  <circle cx="9" cy="22" r="3" fill="${P.dark}"/><circle cx="24" cy="22" r="3" fill="${P.dark}"/>`);
const focus = () => wrap(`<circle cx="16" cy="16" r="7" stroke="currentColor" stroke-width="2.6" fill="none"/><circle cx="16" cy="16" r="2" fill="currentColor"/><path d="M16 3v5M16 24v5M3 16h5M24 16h5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>`);
const document = () => wrap(`<path d="M8 3 h11 l7 7 v19 H8 z" fill="${P.greyL}"/><path d="M19 3 v7 h7 z" fill="${P.grey}"/><g stroke="${P.greyD}" stroke-width="2" stroke-linecap="round"><path d="M12 15h10M12 19h10M12 23h7"/></g>`);
const lock = () => wrap(`<rect x="7" y="14" width="18" height="14" rx="2.5" fill="${P.grey}"/><path d="M11 14 v-4 a5 5 0 0 1 10 0 v4" stroke="${P.grey}" stroke-width="3" fill="none"/>`);

// -------------------------------------------------------------------------------- sub-panel cards
/** top-down road tile: lanes, optional median / sidewalks / barriers */
const roadCard = ({ lanes = 2, median = false, sidewalk = true, gravel = false, barrier = false } = {}) => {
  const asphalt = gravel ? '#9b8c73' : P.asphalt;
  let s = `<rect x="0" y="6" width="44" height="22" fill="${asphalt}"/>`;
  if (sidewalk) s += `<rect x="0" y="3" width="44" height="3.5" fill="${P.greyL}"/><rect x="0" y="27.5" width="44" height="3.5" fill="${P.greyL}"/>`;
  if (barrier) s += `<rect x="0" y="4" width="44" height="2.5" fill="${P.grey}"/><rect x="0" y="27.5" width="44" height="2.5" fill="${P.grey}"/>`;
  const laneH = 22 / lanes;
  for (let i = 1; i < lanes; i++) {
    const y = 6 + laneH * i;
    if (median && i === lanes / 2) s += `<rect x="0" y="${y - 1.4}" width="44" height="2.8" fill="${P.yellow}"/>`;
    else if (!gravel) s += `<line x1="0" y1="${y}" x2="44" y2="${y}" stroke="${lanes === 2 && i === 1 ? P.yellow : P.white}" stroke-width="1.3" stroke-dasharray="5 3.5" opacity=".9"/>`;
  }
  return wrap(s, '0 0 44 34');
};
/** zone tile: coloured cells with density blocks */
const zoneCard = (col, density = 'low', colD = P.darkD) => {
  let s = `<rect x="2" y="2" width="40" height="30" rx="3" fill="${col}"/>`;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
    const h = density === 'high' ? 4 + ((i * 7 + j * 5) % 5) : 2.5;
    s += `<rect x="${5 + i * 9.5}" y="${5 + j * 9.5 + (7 - h)}" width="7.5" height="${h}" rx="1" fill="${colD}" opacity=".55"/>`;
  }
  return wrap(s, '0 0 44 34');
};
/** terrain brush tile with a mode arrow */
const terrainCard = (mode) => {
  let s = `<path d="M0 30 Q10 12 20 24 Q30 8 44 30 Z" fill="${P.green}"/><rect x="0" y="28" width="44" height="6" fill="${P.brown}"/>`;
  const a = { raise: 'M22 3 v13 M17 8 l5 -5 5 5', lower: 'M22 3 v13 M17 11 l5 5 5 -5', flatten: 'M12 9 h20', smooth: 'M12 9 q5 -5 10 0 t10 0' }[mode];
  s += `<path d="${a}" stroke="${P.white}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  return wrap(s, '0 0 44 34');
};
const propCard = (kind) => {
  const map = {
    tree_oak: `<rect x="20" y="22" width="4" height="12" fill="${P.brown}"/><circle cx="22" cy="14" r="11" fill="${P.green}"/><circle cx="18" cy="11" r="5" fill="${P.greenL}" opacity=".5"/>`,
    tree_pine: `<rect x="20" y="26" width="4" height="8" fill="${P.brown}"/><path d="M22 2 L34 17 h-6 l7 10 H9 l7 -10 h-6 z" fill="${P.greenD}"/><path d="M22 2 L34 17 h-6 l7 10 H22 z" fill="#25803a"/>`,
    streetlamp: `<rect x="21" y="8" width="2.4" height="24" fill="${P.greyD}"/><path d="M16 8 h13 l-2 -5 h-9 z" fill="${P.grey}"/><rect x="18" y="8.5" width="8" height="3" rx="1.5" fill="${P.yellow}"/><rect x="18" y="31" width="8" height="3" rx="1" fill="${P.greyD}"/>`,
    bench: `<rect x="6" y="14" width="32" height="5" rx="1.5" fill="${P.brown}"/><rect x="6" y="22" width="32" height="4" rx="1.5" fill="${P.brown}"/><rect x="9" y="19" width="3" height="13" fill="${P.greyD}"/><rect x="32" y="19" width="3" height="13" fill="${P.greyD}"/>`,
    bin: `<rect x="14" y="10" width="16" height="22" rx="2" fill="${P.greenD}"/><rect x="12" y="7" width="20" height="4" rx="1.5" fill="${P.green}"/><rect x="18" y="14" width="2" height="14" fill="${P.green}" opacity=".6"/><rect x="24" y="14" width="2" height="14" fill="${P.green}" opacity=".6"/>`,
    sign: `<rect x="21" y="16" width="2.4" height="17" fill="${P.greyD}"/><rect x="11" y="3" width="22" height="14" rx="2" fill="${P.blue}"/><path d="M15 10 h10 m-4 -4 l4 4 -4 4" stroke="${P.white}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    bus_stop: `<rect x="8" y="8" width="28" height="4" rx="1" fill="${P.greyL}"/><rect x="10" y="12" width="2.5" height="21" fill="${P.greyD}"/><rect x="31.5" y="12" width="2.5" height="21" fill="${P.greyD}"/><rect x="13" y="13" width="18" height="12" fill="${P.blueL}" opacity=".5"/><rect x="14" y="6" width="9" height="5" rx="1" fill="${P.green}"/>`,
    hydrant: `<rect x="17" y="12" width="10" height="20" rx="3" fill="${P.red}"/><rect x="19" y="7" width="6" height="6" rx="2" fill="${P.red}"/><rect x="12" y="17" width="20" height="4" rx="2" fill="${P.redD}"/><rect x="14" y="31" width="16" height="3" rx="1" fill="${P.redD}"/>`,
    fence: `<g fill="${P.brown}"><rect x="6" y="10" width="4" height="24" rx="1"/><rect x="15" y="10" width="4" height="24" rx="1"/><rect x="24" y="10" width="4" height="24" rx="1"/><rect x="33" y="10" width="4" height="24" rx="1"/><rect x="4" y="15" width="36" height="3"/><rect x="4" y="25" width="36" height="3"/></g>`,
  };
  return wrap(map[kind] || map.tree_oak, '0 0 44 34');
};
const bulldozeCard = () => wrap(`<g transform="translate(6 1)">${bulldoze().replace(/<\/?svg[^>]*>/g, '')}</g>`, '0 0 44 34');
const modeIcon = (mode) => {
  const d = { straight: 'M5 26 L27 6', curve: 'M5 26 Q8 6 27 6', free: 'M5 24 C10 6 16 30 27 8', grid: 'M6 6h20v20H6zM16 6v20M6 16h20',
    snap: 'M8 8h16v16H8z M16 4v8 M16 20v8 M4 16h8 M20 16h8', parallel: 'M8 26 L20 6 M14 26 L26 6', magnet: 'M8 6 v12 a8 8 0 0 0 16 0 V6 h-5 v12 a3 3 0 0 1 -6 0 V6 z' }[mode];
  return wrap(`<path d="${d}" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
};

export const ICONS = {
  roads, zoning, terrain, props, bulldoze, info, electricity, water, health, fire, police, education, transit, parks,
  layers, stats, camera, gear, help, bell,
  play, pause, chevrons, sun, cloud, rain: rainIcon, moon, people, money, face, trendUp, trendDown, close, chevronDown, chevronUp, plus, minus, star,
  noteInfo, noteWarn, noteOk, noteErr, noteMoney, noteBuilding,
  house, office, factory, shop, vehicle, focus, document, lock,
  roadCard, zoneCard, terrainCard, propCard, bulldozeCard, modeIcon,
};
export const PALETTE = P;
