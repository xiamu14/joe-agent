export function createWidgetDisplayGate(apply: (event: { type: string; instance?: unknown; resource?: unknown; card?: unknown; turnId?: string }) => void) {
  let waiting = false;
  let pending: Parameters<typeof apply>[0][] = [];
  return {
    begin() { waiting = true; pending = []; },
    receive(event: Parameters<typeof apply>[0]) {
      if (waiting) pending.push(event);
      else apply(event);
    },
    release() {
      waiting = false;
      const events = pending;
      pending = [];
      events.forEach(apply);
    },
  };
}
