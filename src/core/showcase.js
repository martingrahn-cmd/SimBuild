// URL parameter parsing + showcase router.
export function parseParams(search = window.location.search) {
  const p = new URLSearchParams(search);
  const num = (k, d) => (p.has(k) && p.get(k) !== '' && !Number.isNaN(+p.get(k)) ? +p.get(k) : d);
  return {
    showcase: p.get('showcase') || null,
    time: num('time', null),
    camera: p.get('camera') || null,
    seed: num('seed', 1337),
    quality: p.get('quality') || 'high',
    headless: p.get('headless') === '1' || p.get('headless') === 'true',
    speed: num('speed', null),
    modules: p.get('modules') ? p.get('modules').split(',') : null, // explicit list override (debug)
    verbose: p.get('verbose') === '1',
    weather: p.get('weather') || null, // 'clear' | 'cloudy' | 'rain' | 'fog'
    mode: p.get('mode') || 'demo', // 'demo' stages the demo city; 'play' starts an empty map
  };
}

/** Which modules to initialise for a given showcase. */
export function selectModules(showcase, allDefs) {
  const byName = new Map(allDefs.map((d) => [d.name, d]));
  if (!showcase || showcase === 'democity' || showcase === 'all') return allDefs.map((d) => d.name);
  const set = new Set(['environment']);
  const add = (n) => {
    if (set.has(n) || !byName.has(n)) return;
    set.add(n);
    for (const d of byName.get(n).dependencies || []) add(d);
  };
  add(showcase);
  return [...set];
}
