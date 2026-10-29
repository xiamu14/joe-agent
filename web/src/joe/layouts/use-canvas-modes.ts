import { useEffect, useState } from 'react';
import type { LayoutMode } from './canvas-layout-layer';
const storageKey = 'canvas.layout-modes.v1';
export function useCanvasModes() {
  const [modes, setModes] = useState<LayoutMode[]>(['free', 'free']);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
      if (Array.isArray(saved)) setModes([0, 1].map(index => saved[index] === 'bento' ? 'bento' : 'free'));
    } catch { /* Keep the default when storage is unavailable. */ }
  }, []);
  function toggle(index: number) {
    setModes(previous => {
      const next = previous.map((mode, i) => i === index ? mode === 'free' ? 'bento' : 'free' : mode);
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Switching works without storage. */ }
      return next;
    });
  }
  return { modes, toggle };
}
