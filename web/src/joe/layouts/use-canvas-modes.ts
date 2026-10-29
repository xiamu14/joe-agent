import { useEffect, useState } from 'react';
import type { LayoutMode } from './canvas-layout-layer';
import { loadCanvasPreferences, saveCanvasPreferences } from './canvas-preferences';
export function useCanvasModes() {
  const [view, setView] = useState(0);
  const [modes, setModes] = useState<LayoutMode[]>(['free', 'free']);
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    const saved = loadCanvasPreferences();
    setView(saved.view);
    setModes(saved.modes);
    setRestored(true);
  }, []);
  useEffect(() => {
    if (restored) saveCanvasPreferences({ view, modes });
  }, [view, modes, restored]);
  function toggle(index: number) {
    setModes(previous => previous.map((mode, i) => i === index ? mode === 'free' ? 'bento' : 'free' : mode));
  }
  return { view, setView, modes, toggle };
}
