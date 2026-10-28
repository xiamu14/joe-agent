export class TextStream {
  private values = new Map<string, string>();
  private listeners = new Map<string, Set<() => void>>();
  private frame = 0;
  private changed = new Set<string>();

  get(id: string) { return this.values.get(id); }
  snapshot() { return new Map(this.values); }
  append(id: string, text: string) {
    this.values.set(id, (this.values.get(id) || '') + text);
    this.changed.add(id);
    if (!this.frame) this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      for (const key of this.changed) this.listeners.get(key)?.forEach(listener => listener());
      this.changed.clear();
    });
  }
  subscribe(id: string, listener: () => void) {
    const listeners = this.listeners.get(id) || new Set();
    listeners.add(listener);
    this.listeners.set(id, listeners);
    return () => { listeners.delete(listener); if (!listeners.size) this.listeners.delete(id); };
  }
  delete(id: string) { this.values.delete(id); this.changed.delete(id); }
  clear() { cancelAnimationFrame(this.frame); this.frame = 0; this.values.clear(); this.changed.clear(); }
}
