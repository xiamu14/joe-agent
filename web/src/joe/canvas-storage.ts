import type { CanvasLayout } from './canvas-layout';

export type CanvasSnapshot = { version: 1; cards: CanvasLayout; pan: { x: number; y: number } };
export const canvasStorageKey = 'joe.canvas.example.layout.v1';
const coordinate = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 10_000_000;

export function restoreCanvas(raw: string | null, fallback: CanvasLayout): CanvasSnapshot {
  const initial: CanvasSnapshot = { version: 1, cards: fallback, pan: { x: 0, y: 0 } };
  try {
    const saved = JSON.parse(raw ?? 'null');
    if (saved?.version !== 1 || !saved.cards || typeof saved.cards !== 'object') return initial;
    const cards = { ...fallback };
    for (const id of Object.keys(fallback) as (keyof CanvasLayout)[]) {
      const point = saved.cards[id];
      if (coordinate(point?.x) && coordinate(point?.y) && coordinate(point?.rotation) && Math.abs(point.rotation) <= 360) cards[id] = { x: point.x, y: point.y, rotation: point.rotation };
    }
    return { version: 1, cards, pan: coordinate(saved.pan?.x) && coordinate(saved.pan?.y) ? { x: saved.pan.x, y: saved.pan.y } : initial.pan };
  } catch { return initial; }
}

export function loadCanvas(fallback: CanvasLayout) {
  try { return restoreCanvas(localStorage.getItem(canvasStorageKey), fallback); }
  catch { return restoreCanvas(null, fallback); }
}
export function saveCanvas(snapshot: CanvasSnapshot) {
  try { localStorage.setItem(canvasStorageKey, JSON.stringify(snapshot)); }
  catch { /* Dragging remains usable when browser storage is unavailable. */ }
}
