import { useLayoutEffect } from 'react';
import type { LayoutLayerProps } from './canvas-layout-layer';

export function FreeCanvasLayout({ layout, onPlacement, canvas }: LayoutLayerProps) {
  useLayoutEffect(() => { if (canvas.current) { canvas.current.scrollTop = 0; canvas.current.scrollLeft = 0; } }, [canvas]);
  useLayoutEffect(() => {
    onPlacement({ layout, draggable: true, pannable: true, entry: 'scale', overflow: 'clip' });
  }, [layout, onPlacement]);
  return <div aria-hidden data-layout-layer="free" className="pointer-events-none absolute inset-0" />;
}
