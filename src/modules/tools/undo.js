// Candidate only. A failed leaf must leave its own state unchanged or repair it before returning.
// This stack compensates confirmed successful children, not unknown effects inside a failed leaf.
export const UNDO_CAPACITY = 64;

export class UndoStack {
  constructor(log, limit = UNDO_CAPACITY, canAfford = null) {
    this.log = log;
    this.limit = limit;
    this.done = [];
    this.undone = [];
    this.group = null;
    this.canAfford = canAfford;
    this.recovery = null;
    this.failure = null;
    this._busy = false;
  }

  beginGroup(label) {
    if (this._busy || this.recovery || this.group) return false;
    this.group = { label, cost: 0, items: [] };
  }

  _compound(meta, items) {
    const entry = { ...meta, _undoItems: items };
    entry.undo = () => this._compoundRun(entry, 'undo');
    entry.redo = () => this._compoundRun(entry, 'redo');
    return entry;
  }

  endGroup() {
    if (this._busy || this.recovery) return null;
    const g = this.group;
    this.group = null;
    if (!g || !g.items.length) return null;
    const entry = this._compound({ label: g.label, cost: g.cost, key: g.label, fromDrag: false, t: 0 }, g.items);
    this.done.push(entry);
    if (this.done.length > this.limit) this.done.shift();
    this.undone.length = 0;
    return entry;
  }

  /** Cancel the group being authored and compensate every successful leaf in reverse order. */
  abortGroup() {
    if (this._busy || this.recovery) return false;
    const g = this.group;
    this.group = null;
    if (!g || !g.items.length) return true;
    const entry = this._compound({ label: g.label, cost: g.cost, key: g.label, fromDrag: false, t: 0 }, g.items);
    this._busy = true;
    try {
      if (this._call(entry, 'undo')) return true;
      // Preserve a failed compensation as history so the recovery contract remains actionable.
      this.done.push(entry);
      if (this.done.length > this.limit) this.done.shift();
      this.undone.length = 0;
      return false;
    } finally { this._busy = false; }
  }

  push(entry, now = 0) {
    if (this._busy || this.recovery || !entry || typeof entry.undo !== 'function') return null;
    entry.t = now;
    entry.cost = Math.round(entry.cost || 0);
    if (this.group) { this.group.items.push(entry); this.group.cost += entry.cost; return entry; }
    const last = this.done[this.done.length - 1];
    if (entry.fromDrag && last && last.fromDrag && last.key === entry.key && now - last.t < 0.4) {
      const merged = this._compound({ label: last.label, cost: last.cost + entry.cost,
        key: last.key, fromDrag: true, t: now }, [last, entry]);
      this.done[this.done.length - 1] = merged;
      this.undone.length = 0;
      return merged;
    }
    this.done.push(entry);
    if (this.done.length > this.limit) this.done.shift();
    this.undone.length = 0;
    return entry;
  }

  _leaves(entry, direction, out = []) {
    if (!entry._undoItems) out.push(entry);
    else if (direction === 'undo') {
      for (let i = entry._undoItems.length - 1; i >= 0; i--) this._leaves(entry._undoItems[i], direction, out);
    } else for (const child of entry._undoItems) this._leaves(child, direction, out);
    return out;
  }

  _call(entry, direction) {
    const priorFailure = this.failure;
    try {
      // Legacy closures return undefined; only explicit false is failure.
      if (entry[direction]?.() !== false) return true;
      if (this.failure === priorFailure) this.failure = { reason: 'action-returned-false', label: entry.label, direction };
    } catch (err) {
      this.failure = { reason: 'action-threw', label: entry.label, direction, message: String(err?.message || err) };
      this.log?.error(`${direction} "${entry.label}" failed: ${err?.message || err}`, err);
    }
    return false;
  }

  _compoundRun(entry, direction) {
    const leaves = this._leaves(entry, direction);
    if (typeof this.canAfford === 'function') {
      let prefix = 0, required = 0;
      for (const child of leaves) {
        prefix += (direction === 'undo' ? -1 : 1) * child.cost;
        required = Math.max(required, prefix);
      }
      // A hook exception is caught by _call before any child runs.
      if (this.canAfford(required) === false) {
        this.failure = { reason: 'insufficient-funds', label: entry.label, direction, required };
        return false;
      }
    }
    const completed = [];
    for (const child of leaves) {
      if (this._call(child, direction)) { completed.push(child); continue; }
      const cause = this.failure;
      if (completed.length) {
        this.recovery = { entry, direction, inverse: direction === 'undo' ? 'redo' : 'undo',
          pending: completed.reverse(), cause };
        this._recover();
      }
      if (!this.recovery) this.failure = cause;
      return false;
    }
    return true;
  }

  _recover() {
    const journal = this.recovery;
    if (!journal) return true;
    while (journal.pending.length) {
      const child = journal.pending[0];
      if (!this._call(child, journal.inverse)) {
        this.failure = { reason: 'recovery-required', label: journal.entry.label, direction: journal.direction,
          failedCompensation: this.failure, cause: journal.cause };
        return false;
      }
      journal.pending.shift();
    }
    this.recovery = null;
    return true;
  }

  canUndo() { return this.done.length > 0; }
  canRedo() { return this.undone.length > 0; }
  _move(direction) {
    if (this._busy || this.group) return null;
    this._busy = true;
    try {
      if (this.recovery) {
        // Retrying either history command first finishes recovery only. A subsequent call
        // attempts the original action; never repeat already compensated children.
        if (this._recover()) this.failure = { reason: 'recovered' };
        return null;
      }
      this.failure = null;
      const from = direction === 'undo' ? this.done : this.undone;
      const to = direction === 'undo' ? this.undone : this.done;
      const entry = from[from.length - 1];
      if (!entry || !this._call(entry, direction)) return null;
      from.pop();
      to.push(entry);
      return entry;
    } finally { this._busy = false; }
  }
  undo() { return this._move('undo'); }
  redo() { return this._move('redo'); }
  clear() {
    if (this._busy || this.recovery) return false;
    this.done.length = 0; this.undone.length = 0; this.group = null; this.failure = null;
  }
  report() {
    const result = { undo: this.done.length, redo: this.undone.length, capacity: this.limit,
      entries: this.done.map((e) => ({ label: e.label, cost: e.cost })) };
    if (this.failure) result.failure = { ...this.failure };
    if (this.recovery) result.recovery = { label: this.recovery.entry.label, direction: this.recovery.direction,
      inverse: this.recovery.inverse, pending: this.recovery.pending.map((e) => e.label) };
    return result;
  }
}
