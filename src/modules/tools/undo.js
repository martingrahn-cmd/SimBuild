// Undo/redo stack for the tools module. Entries are {label, undo(), redo()} closures pushed by the
// tool that made the change; the stack is capped so a long session cannot grow without bound.
export class UndoStack {
  constructor(log, limit = 64) {
    this.log = log;
    this.limit = limit;
    this.done = [];
    this.undone = [];
  }
  push(entry) {
    if (!entry || typeof entry.undo !== 'function') return;
    this.done.push(entry);
    if (this.done.length > this.limit) this.done.shift();
    this.undone.length = 0;
  }
  /** Run fn, and if it returns an entry, record it. */
  run(entry) {
    entry.redo?.();
    this.push(entry);
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
  clear() { this.done.length = 0; this.undone.length = 0; }
  labels() { return { undo: this.done[this.done.length - 1]?.label || null, redo: this.undone[this.undone.length - 1]?.label || null }; }
}
