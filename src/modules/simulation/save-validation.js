// Validate the JSON-shaped fields consumed by Economy.deserialize before reset mutates live state.
// Optional legacy fields keep their existing defaults; unknown fields are ignored.
export function validEconomySave(s, { zoneTypes, roadTypes, fineLen, fineWidth }) {
  const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const finite = Number.isFinite;
  const integer = v => Number.isSafeInteger(v);
  const nonnegative = v => finite(v) && v >= 0;
  const optional = (o, k, check) => o[k] === undefined || check(o[k]);
  const nullable = check => v => v == null || check(v);
  const vector = (v, keys, check) => object(v) && keys.every(k => check(v[k]));
  const count = v => integer(v) && v >= 0 && v <= 0x7fffffff;
  const id = v => (integer(v) && v > 0) || (typeof v === 'string' && v.length > 0);
  try {
    if (!object(s) || (s.version !== 1 && s.version !== 2) || !count(s.tick)) return false;
    if (!Array.isArray(s.rng) || s.rng.length !== 4 || !s.rng.every(v => integer(v) && v >= -0x80000000 && v <= 0xffffffff)) return false;
    const e = s.econ;
    if (!object(e) || !finite(e.money) || !nonnegative(e.populationF) || !finite(e.happiness) || !finite(e.taxRate)) return false;
    if (!vector(e.demand, zoneTypes, finite) || !vector(s.target, zoneTypes, finite) || !vector(s.growthAcc, zoneTypes, nonnegative)) return false;
    if (!optional(e, 'growthRequests', count) || !optional(e, 'levelUps', count) || !optional(e, 'servicesManaged', v => typeof v === 'boolean')) return false;
    if (!optional(e, 'pollutionExposure', nullable(finite)) || !optional(e, 'refreshHappiness', nullable(finite))) return false;
    if (!optional(e, 'nextLoanId', v => count(v) && v > 0)) return false;
    if (e.milestone != null) {
      if (!object(e.milestone) || !integer(e.milestone.level)) return false;
      if (e.milestone.unlocked != null && (!Array.isArray(e.milestone.unlocked) || !e.milestone.unlocked.every(v => typeof v === 'string'))) return false;
    }
    if (e.loans != null) {
      if (!Array.isArray(e.loans)) return false;
      const loanIds = new Set();
      for (const l of e.loans) {
        if (!object(l) || !id(l.id) || loanIds.has(l.id) || !nonnegative(l.principal) || !nonnegative(l.remaining) || !nonnegative(l.dailyPayment) || !finite(l.daysLeft) || !optional(l, 'day', nonnegative)) return false;
        loanIds.add(l.id);
      }
    }
    if (!object(s.roadKm) || !roadTypes.every(k => optional(s.roadKm, k, nullable(nonnegative)))) return false;
    if (!Array.isArray(s.buildings)) return false;
    const buildingIds = new Set();
    for (const b of s.buildings) {
      if (!object(b) || !id(b.id) || buildingIds.has(b.id) || !zoneTypes.includes(b.type) || !nonnegative(b.capacity)) return false;
      if (!optional(b, 'density', v => v === 'low' || v === 'high') || !optional(b, 'level', v => integer(v) && v >= 1 && v <= 5) || !optional(b, 'virtual', v => typeof v === 'boolean')) return false;
      if (!optional(b, 'x', nullable(finite)) || !optional(b, 'z', nullable(finite))) return false;
      buildingIds.add(b.id);
    }
    if (!Array.isArray(s.history) || !s.history.every(h => object(h) && Object.values(h).every(finite))) return false;
    // Missing or differently sized legacy rings deliberately clear, just as Ring.deserialize does.
    if (s.fine != null) {
      if (!object(s.fine)) return false;
      if (s.fine.len === fineLen && s.fine.n === fineWidth) {
        if (!count(s.fine.head) || s.fine.head >= fineLen || !count(s.fine.count) || s.fine.count > fineLen || !Array.isArray(s.fine.data)) return false;
        if (!s.fine.data.every(v => finite(v) && Math.abs(v) <= 3.4028234663852886e38)) return false;
      }
    }
    return true;
  } catch { return false; }
}
