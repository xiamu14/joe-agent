type Point = { x: number; y: number };
type Bounds = { left: number; top: number; width: number; height: number };

export function draggedPosition(start: Point, pointerStart: Point, pointer: Point, panStart: Point, pan: Point): Point {
  return { x: start.x + pointer.x - pointerStart.x - (pan.x - panStart.x), y: start.y + pointer.y - pointerStart.y - (pan.y - panStart.y) };
}

export function edgePanDelta(pointer: Point, bounds: Bounds, seconds: number): Point {
  if (pointer.x < bounds.left || pointer.x > bounds.left + bounds.width || pointer.y < bounds.top || pointer.y > bounds.top + bounds.height) return { x: 0, y: 0 };
  const axis = (position: number, start: number, size: number) => {
    const margin = Math.min(48, size / 4);
    if (margin <= 0) return 0;
    const nearStart = Math.max(0, (start + margin - position) / margin);
    const nearEnd = Math.max(0, (position - (start + size - margin)) / margin);
    return (nearStart ** 2 - nearEnd ** 2) * 360 * Math.min(0.04, Math.max(0, seconds));
  };
  return { x: axis(pointer.x, bounds.left, bounds.width), y: axis(pointer.y, bounds.top, bounds.height) };
}
