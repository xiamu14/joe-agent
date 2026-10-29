import { useLayoutEffect, useState, type RefObject } from 'react';
import { cardWidths, type CanvasCardId, type CanvasLayout } from '../canvas-layout';
import type { CardSize } from './bento-packing';
export type LayoutMode = 'free' | 'bento';
export type LayoutPlacement = { layout: CanvasLayout; draggable: boolean; pannable: boolean; entry: 'scale' | 'slide'; overflow: 'clip' | 'auto'; extent?: { width: number; height: number } };
export type LayoutLayerProps = {
  canvas: RefObject<HTMLDivElement | null>; ids: CanvasCardId[]; layout: CanvasLayout;
  selected?: CanvasCardId; onPlacement(value: LayoutPlacement): void;
};

export function useCardMeasurements({ canvas, selected }: LayoutLayerProps) {
  const [measurements, setMeasurements] = useState({ width: 0, height: 0, sizes: {} as Partial<Record<CanvasCardId, CardSize>> });
  useLayoutEffect(() => {
    const root = canvas.current;
    if (!root) return;
    const read = () => setMeasurements(previous => {
      const sizes = { ...previous.sizes };
      root.querySelectorAll<HTMLElement>('[data-card]').forEach(node => {
        const id = node.dataset.card as CanvasCardId;
        if (id !== selected && node.offsetHeight > 0) sizes[id] = { width: cardWidths[id], height: node.offsetHeight };
      });
      const next = { width: root.clientWidth, height: root.clientHeight, sizes };
      return JSON.stringify(previous) === JSON.stringify(next) ? previous : next;
    });
    const observer = new ResizeObserver(read);
    observer.observe(root);
    const observe = () => { root.querySelectorAll('[data-card]').forEach(node => observer.observe(node)); read(); };
    const mutations = new MutationObserver(observe);
    mutations.observe(root, { childList: true, subtree: true });
    observe();
    return () => { observer.disconnect(); mutations.disconnect(); };
  }, [canvas, selected]);
  return measurements;
}
