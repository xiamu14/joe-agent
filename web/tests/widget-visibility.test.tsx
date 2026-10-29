import { test, expect } from 'bun:test';
import { applyWidgetSnapshot } from '../src/joe/widget-visibility';

test('visibility applies only newer snapshots for each registered card', () => {
  const show = { widgetType: 'youtube.video', visible: true, revision: 1 };
  const hide = { ...show, visible: false, revision: 2 };
  const hidden = applyWidgetSnapshot(applyWidgetSnapshot({}, show), hide);
  expect(hidden.video?.visible).toBe(false);
  expect(applyWidgetSnapshot(hidden, show)).toBe(hidden);
  expect(applyWidgetSnapshot(hidden, { widgetType: 'builtin.unknown', visible: true, revision: 3 })).toBe(hidden);
});

test('visible card count follows state regardless of canvas identity', async () => {
  const { visibleWidgetCards } = await import('../src/joe/widget-visibility');
  let state = applyWidgetSnapshot({}, { widgetType: 'builtin.weather', visible: true, revision: 1 });
  expect(visibleWidgetCards(state)).toEqual(['weather']);
  state = applyWidgetSnapshot(state, { widgetType: 'builtin.weather', visible: false, revision: 2 });
  expect(visibleWidgetCards(state)).toEqual([]);
  state = applyWidgetSnapshot(state, { widgetType: 'youtube.video', visible: true, revision: 1 });
  expect(visibleWidgetCards(state)).toEqual(['video']);
});
