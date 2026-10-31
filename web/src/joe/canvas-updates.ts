export type CanvasChange = {
  type: 'canvas.changed';
  canvasId: string;
  canvas: { id: string; name: string; revision: number };
  instances: unknown[];
};

const listeners = new Set<(change: CanvasChange) => void>();

// Both chat results and durable SSE replay use the same validated delivery path.
export function publishCanvasChange(value: unknown) {
  if (!value || typeof value !== 'object') return;
  const event = value as Partial<CanvasChange>;
  if (event.type !== 'canvas.changed' || typeof event.canvasId !== 'string' ||
      event.canvas?.id !== event.canvasId || typeof event.canvas.name !== 'string' ||
      !Number.isSafeInteger(event.canvas.revision) || event.canvas.revision < 0 ||
      !Array.isArray(event.instances)) return;
  for (const listener of listeners) listener(event as CanvasChange);
}

export function subscribeCanvasChanges(listener: (change: CanvasChange) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
