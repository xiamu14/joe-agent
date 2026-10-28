import type { CanvasCardId } from './canvas-layout';

type Point = { x: number; y: number };

export function createCardHoverIntent(lift: (id: CanvasCardId | null) => void, promote: (id: CanvasCardId) => void) {
  let candidate: CanvasCardId | null = null;
  let pointer: Point | null = null;
  let intent: ReturnType<typeof setTimeout> | undefined;
  let foreground: ReturnType<typeof setTimeout> | undefined;
  function clear() { clearTimeout(intent); clearTimeout(foreground); }
  function cancel() { clear(); candidate = null; lift(null); }
  return {
    move(id: CanvasCardId, point: Point) {
      // Reordering can change the hit target without the mouse moving.
      if (pointer?.x === point.x && pointer.y === point.y) return;
      pointer = point;
      if (candidate === id) return;
      clear(); candidate = id; lift(null);
      intent = setTimeout(() => {
        lift(id);
        foreground = setTimeout(() => promote(id), 80);
      }, 100);
    },
    leave(id: CanvasCardId) { if (candidate === id) cancel(); },
    cancel,
    dispose: clear,
  };
}
