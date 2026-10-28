import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { useMotionValue } from 'motion/react';
import type { CanvasCardId, CanvasLayout } from './canvas-layout';

type Selection = { id: CanvasCardId; expanded: boolean } | null;

export function useCanvasSceneState(layout: CanvasLayout) {
  const canvas = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [hovered, setHovered] = useState<CanvasCardId | null>(null);
  const panX = useMotionValue(0);
  const panY = useMotionValue(0);
  const open = useCallback((id: CanvasCardId) => {
    panX.stop(); panY.stop();
    setHovered(null);
    setSelection(current => current ?? { id, expanded: true });
  }, [panX, panY]);
  const close = useCallback(() => setSelection(current => current ? { ...current, expanded: false } : current), []);
  const finishClose = useCallback((id: CanvasCardId) => {
    setSelection(current => current?.id === id && !current.expanded ? null : current);
  }, []);
  return { canvas, layout, selection, hovered, setHovered, panX, panY, open, close, finishClose };
}

export type CanvasScene = ReturnType<typeof useCanvasSceneState>;
export const CanvasSceneContext = createContext<CanvasScene | null>(null);
export function useCanvasScene() {
  const scene = useContext(CanvasSceneContext);
  if (!scene) throw new Error('Card requires a canvas scene');
  return scene;
}
