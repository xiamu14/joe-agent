import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useMotionValue } from 'motion/react';
import { createCardHoverIntent } from './card-hover-intent';
import type { CanvasSnapshot } from './canvas-storage';
import type { CanvasCardId, CanvasLayout } from './canvas-layout';

type Selection = { id: CanvasCardId; expanded: boolean } | null;

export function useCanvasSceneState(layout: CanvasLayout, initialPan: CanvasSnapshot['pan'], onSave: (snapshot: CanvasSnapshot) => void) {
  const canvas = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [foreground, setForeground] = useState<CanvasCardId | null>(null);
  const [hovered, setHovered] = useState<CanvasCardId | null>(null);
  const [dragging, setDragging] = useState<CanvasCardId | null>(null);
  const hoverIntent = useMemo(() => createCardHoverIntent(setHovered, setForeground), []);
  useEffect(() => { if (selection || dragging) hoverIntent.cancel(); }, [selection, dragging, hoverIntent]);
  useEffect(() => hoverIntent.dispose, [hoverIntent]);
  const suppressClick = useRef(false);
  const panX = useMotionValue(initialPan.x);
  const panY = useMotionValue(initialPan.y);
  const save = useCallback(() => onSave({ version: 1, cards: layout, pan: { x: panX.get(), y: panY.get() } }), [layout, onSave, panX, panY]);
  const moveCard = useCallback((id: CanvasCardId, position: { x: number; y: number }) => {
    onSave({ version: 1, cards: { ...layout, [id]: { ...layout[id], ...position } }, pan: { x: panX.get(), y: panY.get() } });
  }, [layout, onSave, panX, panY]);
  const open = useCallback((id: CanvasCardId) => {
    if (dragging) return;
    panX.stop(); panY.stop();
    setHovered(null);
    setForeground(id);
    setSelection(current => current ?? { id, expanded: true });
  }, [panX, panY, dragging]);
  const close = useCallback(() => setSelection(current => current ? { ...current, expanded: false } : current), []);
  const finishClose = useCallback((id: CanvasCardId) => {
    setSelection(current => current?.id === id && !current.expanded ? null : current);
  }, []);
  return { canvas, layout, selection, hovered, hoverIntent, foreground, setForeground, dragging, setDragging, suppressClick, save, moveCard, setHovered, panX, panY, open, close, finishClose };
}

export type CanvasScene = ReturnType<typeof useCanvasSceneState>;
export const CanvasSceneContext = createContext<CanvasScene | null>(null);
export function useCanvasScene() {
  const scene = useContext(CanvasSceneContext);
  if (!scene) throw new Error('Card requires a canvas scene');
  return scene;
}
