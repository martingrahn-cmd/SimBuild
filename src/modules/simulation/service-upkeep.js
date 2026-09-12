// Daily facility expense from the owning catalog, cached between owner version changes.
// Version also changes on live load/coverage updates, so those events can rescan this small stock.
export function createServiceUpkeepReader(world, modules) {
  let lastItems = null, lastCatalog = null, lastVersion = -1, lastSize = -1, daily = 0;
  return () => {
    const items = world.services?.items;
    const catalog = modules.services?.catalog?.();
    const version = world.services?.version;
    const size = items?.size || 0;
    if (items === lastItems && catalog === lastCatalog && version === lastVersion && size === lastSize) return daily;
    lastItems = items; lastCatalog = catalog; lastVersion = version; lastSize = size;
    daily = 0;
    if (items instanceof Map && catalog) for (const item of items.values()) {
      const cost = catalog[item.kind]?.upkeep;
      if (Number.isFinite(cost) && cost >= 0) daily += cost;
    }
    return daily;
  };
}
