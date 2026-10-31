import { test, expect } from 'bun:test';
import { publishCanvasChange, subscribeCanvasChanges } from '../src/joe/canvas-updates';
import { applyWidgetSnapshot, type WidgetVisibility } from '../src/joe/widget-visibility';

test('chat changes reach the target space immediately and SSE replay preserves newer cards', () => {
  let name = '空间1';
  let cards: WidgetVisibility = {};
  const dispose = subscribeCanvasChanges(event => {
    if (event.canvasId !== 'first') return;
    name = event.canvas.name;
    cards = event.instances.reduce<WidgetVisibility>(applyWidgetSnapshot, cards);
  });
  const change = { type: 'canvas.changed', canvasId: 'first', canvas: { id: 'first', name: '娱乐间', revision: 5 },
    instances: [{ widgetType: 'builtin.weather', visible: false, revision: 2 }] };
  try {
    // A chat in space two can change space one before the SSE poll arrives.
    publishCanvasChange(change);
    expect(name).toBe('娱乐间');
    expect(cards.weather?.visible).toBe(false);
    cards = applyWidgetSnapshot(cards, { widgetType: 'builtin.weather', visible: true, revision: 3 });
    publishCanvasChange(change);
    expect(cards.weather?.visible).toBe(true);
    publishCanvasChange({ ...change, canvas: { ...change.canvas, id: 'wrong' } });
    expect(name).toBe('娱乐间');
  } finally { dispose(); }
  name = '已卸载';
  publishCanvasChange(change);
  expect(name).toBe('已卸载');
});
