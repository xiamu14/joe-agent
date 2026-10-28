import { useEffect, useLayoutEffect, useRef, type PointerEvent } from 'react';
import { useMotionValue } from 'motion/react';
import { cardControls } from './card-expansion';
import { draggedPosition, edgePanDelta } from './card-drag-geometry';
import type { CanvasScene } from './canvas-scene';
import type { CanvasCardId } from './canvas-layout';

type Point = { x: number; y: number };
type Gesture = { pointerId: number; node: HTMLElement; start: Point; latest: Point; position: Point; pan: Point; moved: boolean };

export function useCardDrag(id: CanvasCardId, scene: CanvasScene, disabled: boolean, onStart: () => void) {
  const dx = useMotionValue(0), dy = useMotionValue(0);
  const gesture = useRef<Gesture | null>(null);
  const frame = useRef(0), previousFrame = useRef(0);
  const latest = useRef({ scene, onStart });
  latest.current = { scene, onStart };
  useLayoutEffect(() => { dx.set(0); dy.set(0); }, [scene.layout[id].x, scene.layout[id].y, dx, dy]);

  function update() {
    const current = gesture.current;
    if (!current) return;
    const { scene } = latest.current;
    const position = draggedPosition(current.position, current.start, current.latest, current.pan, { x: scene.panX.get(), y: scene.panY.get() });
    dx.set(position.x - current.position.x); dy.set(position.y - current.position.y);
  }
  function tick(now: number) {
    const current = gesture.current, { scene } = latest.current;
    if (!current?.moved || !scene.canvas.current) return;
    const bounds = scene.canvas.current.getBoundingClientRect();
    const delta = edgePanDelta(current.latest, bounds, (now - previousFrame.current) / 1000);
    previousFrame.current = now;
    scene.panX.set(scene.panX.get() + delta.x); scene.panY.set(scene.panY.get() + delta.y);
    update();
    frame.current = requestAnimationFrame(tick);
  }
  function finish() {
    const current = gesture.current;
    if (!current) return;
    cancelAnimationFrame(frame.current);
    gesture.current = null;
    if (current.moved) {
      const { scene } = latest.current;
      scene.moveCard(id, { x: current.position.x + dx.get(), y: current.position.y + dy.get() });
      scene.setDragging(null);
    }
    if (current.node.hasPointerCapture(current.pointerId)) current.node.releasePointerCapture(current.pointerId);
  }
  const finishRef = useRef(finish);
  finishRef.current = finish;
  useEffect(() => {
    const blur = () => finishRef.current();
    const hidden = () => { if (document.hidden) blur(); };
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', hidden);
    return () => { cancelAnimationFrame(frame.current); window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', hidden); };
  }, []);

  function down(event: PointerEvent<HTMLElement>) {
    if (disabled || event.button !== 0 || !event.isPrimary || gesture.current || latest.current.scene.dragging) return;
    if ((event.target as Element).closest(cardControls)) return;
    scene.panX.stop(); scene.panY.stop();
    const point = { x: event.clientX, y: event.clientY };
    gesture.current = { pointerId: event.pointerId, node: event.currentTarget, start: point, latest: point, position: { ...scene.layout[id] }, pan: { x: scene.panX.get(), y: scene.panY.get() }, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent<HTMLElement>) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    current.latest = { x: event.clientX, y: event.clientY };
    if (!current.moved && Math.hypot(event.clientX - current.start.x, event.clientY - current.start.y) < 5) return;
    if (!current.moved) {
      current.moved = true;
      latest.current.scene.setDragging(id); latest.current.onStart();
      previousFrame.current = performance.now(); frame.current = requestAnimationFrame(tick);
    }
    scene.suppressClick.current = true;
    update(); event.preventDefault();
  }
  function end(event: PointerEvent<HTMLElement>) { if (gesture.current?.pointerId === event.pointerId) finish(); }
  return { dx, dy, down, move, end };
}
