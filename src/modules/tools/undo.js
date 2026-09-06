// Undo/redo stack for the tools module. Entries are {label, cost, undo(), redo()} closures pushed by
// the tool that made the change; the stack is capped at 64 (module spec §4 item 9).
//
// Coalescing: consecutive *drag* strokes of the same tool with the same key inside 0.4 s of game
// time fold into one entry, so painting a zone by dragging is one undo, not forty. A discrete
// click()/commit() sets fromDrag:false and is always its own entry — that is what keeps the eight
// mixed committed actions of criterion 9 individually undoable.
export const UNDO_CAPACITY = 64;

export class UndoStack {
  constructor(log, limit = UNDO_CAPACITY) {
    this.log = log;
    this.limit = limit;
    this.done = [];
    this.undone = [];
    this.group = null;
  }

  /** Open a compound entry: everything pushed until endGroup() undoes and redoes as one. */
  beginGroup(label) { this.group = { label, cost: 0, items: [] }; }
  endGroup() {
    const g = this.group;
    this.group = null;
    if (!g || !g.items.length) return null;
    const items = g.items;
    const entry = {
      label: g.label, cost: g.cost, key: g.label, fromDrag: false, t: 0,
      undo() { for (let i = items.length - 1; i >= 0; i--) items[i].undo(); },
      redo() { for (const it of items) it.redo?.(); },
    };
    this.done.push(entry);
    if (this.done.length > this.limit) this.done.shift();
    this.undone.length = 0;
    return entry;
  }

  push(entry, now = 0) {
    if (!entry || typeof entry.undo !== 'function') return null;
    entry.t = now;
    entry.cost = Math.round(entry.cost || 0);
    if (this.group) { this.group.items.push(entry); this.group.cost += entry.cost; return entry; }
    const last = this.done[this.done.length - 1];
    if (entry.fromDrag && last && last.fromDrag && last.key === entry.key && now - last.t < 0.4) {
      // fold into the running stroke: keep the first undo, adopt the latest redo
      const first = last;
      const merged = {
        label: last.label, cost: last.cost + entry.cost, key: last.key, fromDrag: true, t: now,
        undo() { entry.undo(); first.undo(); },
        redo() { first.redo?.(); entry.redo?.(); },
      };
      this.done[this.done.length - 1] = merged;
      this.undone.length = 0;
      return merged;
    }
    this.done.push(entry);
    if (this.done.length > this.limit) this.done.shift();
    this.undone.length = 0;
    return entry;
  }

  canUndo() { return this.done.length > 0; }
  canRedo() { return this.undone.length > 0; }
  undo() {
    const e = this.done.pop();
    if (!e) return null;
    try { e.undo(); } catch (err) { this.log?.error(`undo "${e.label}" failed: ${err?.message || err}`, err); return null; }
    this.undone.push(e);
    return e;
  }
  redo() {
    const e = this.undone.pop();
    if (!e) return null;
    try { e.redo?.(); } catch (err) { this.log?.error(`redo "${e.label}" failed: ${err?.message || err}`, err); return null; }
    this.done.push(e);
    return e;
  }
  clear() { this.done.length = 0; this.undone.length = 0; this.group = null; }
  report() {
    return {
      undo: this.done.length,
      redo: this.undone.length,
      capacity: this.limit,
      entries: this.done.map((e) => ({ label: e.label, cost: e.cost })),
    };
  }
}
