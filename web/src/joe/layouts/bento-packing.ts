import type { CanvasCardId, CanvasLayout } from '../canvas-layout';
export type CardSize = { width: number; height: number };

// Shelf packing preserves each card's measured dimensions and stable order.
export function packBento(ids: readonly CanvasCardId[], sizes: Partial<Record<CanvasCardId, CardSize>>, width: number, height: number, fallback: CanvasLayout) {
  const gap = 16, padding = 24;
  const available = Math.max(width - padding * 2, ...ids.map(id => sizes[id]?.width ?? 0));
  let x = 0, y = 0, rowHeight = 0, usedWidth = 0;
  const points: Partial<Record<CanvasCardId, { x: number; y: number; rotation: number }>> = {};
  for (const id of ids) {
    const size = sizes[id];
    if (!size) continue;
    if (x > 0 && x + size.width > available) { x = 0; y += rowHeight + gap; rowHeight = 0; }
    points[id] = { x: x + size.width / 2, y: y + size.height / 2, rotation: 0 };
    usedWidth = Math.max(usedWidth, x + size.width);
    x += size.width + gap;
    rowHeight = Math.max(rowHeight, size.height);
  }
  const contentHeight = y + rowHeight;
  const left = Math.max(padding, (width - usedWidth) / 2);
  const top = Math.max(padding, (height - contentHeight) / 2);
  const layout = { ...fallback };
  for (const id of ids) {
    const point = points[id];
    if (point) layout[id] = { ...point, x: point.x + left - width / 2, y: point.y + top - height / 2 };
  }
  return { layout, width: usedWidth + padding * 2, height: contentHeight + padding * 2 };
}
