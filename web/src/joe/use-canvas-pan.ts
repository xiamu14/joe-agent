import { useRef, useState, type FocusEvent, type KeyboardEvent, type PointerEvent, type MouseEvent } from 'react';
import { animate, useReducedMotion } from 'motion/react';
import type { CanvasScene } from './canvas-scene';
import type { CanvasCardId } from './canvas-layout';
import { cardControls } from './card-expansion';

export function useCanvasPan(scene: CanvasScene) {
  const reduced = useReducedMotion();
  const pointer = useRef<{ id: number; x: number; y: number; panX: number; panY: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [dragging, setDragging] = useState(false);

  function moveTo(x: number, y: number) {
    scene.panX.stop(); scene.panY.stop();
    if (reduced) { scene.panX.set(x); scene.panY.set(y); }
    else {
      animate(scene.panX, x, { type: 'spring', stiffness: 240, damping: 28 });
      animate(scene.panY, y, { type: 'spring', stiffness: 240, damping: 28 });
    }
  }
  function down(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !event.isPrimary) return;
    suppressClick.current = false;
    if ((event.target as Element).closest(`[data-card], ${cardControls}`)) return;
    scene.panX.stop(); scene.panY.stop();
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, panX: scene.panX.get(), panY: scene.panY.get(), moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const start = pointer.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (!start.moved && Math.hypot(dx, dy) < 5) return;
    if (!start.moved) { start.moved = true; if (!scene.selection) setDragging(true); }
    suppressClick.current = true;
    if (!scene.selection) {
      scene.panX.set(start.panX + dx);
      scene.panY.set(start.panY + dy);
    }
    event.preventDefault();
  }
  function finish(event: PointerEvent<HTMLDivElement>) {
    if (pointer.current?.id !== event.pointerId) return;
    pointer.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function click(event: MouseEvent<HTMLDivElement>) {
    if (event.detail === 0) suppressClick.current = false;
    if (suppressClick.current) {
      suppressClick.current = false;
      event.preventDefault(); event.stopPropagation();
    }
  }
  function key(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || scene.selection) return;
    const direction: Record<string, [number, number]> = { ArrowLeft: [80, 0], ArrowRight: [-80, 0], ArrowUp: [0, 80], ArrowDown: [0, -80] };
    if (direction[event.key]) {
      event.preventDefault();
      const [x, y] = direction[event.key];
      moveTo(scene.panX.get() + x, scene.panY.get() + y);
    }
  }
  function focus(event: FocusEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (scene.selection || !target.matches(':focus-visible')) return;
    const id = target.closest<HTMLElement>('[data-card]')?.dataset.card as CanvasCardId | undefined;
    if (!id) return;
    const r = target.getBoundingClientRect(), viewport = event.currentTarget.getBoundingClientRect();
    if (r.left < viewport.left || r.right > viewport.right || r.top < viewport.top || r.bottom > viewport.bottom) {
      scene.panX.stop(); scene.panY.stop();
      scene.panX.set(-scene.layout[id].x); scene.panY.set(-scene.layout[id].y);
    }
  }
  return { dragging, down, move, finish, click, key, focus };
}
