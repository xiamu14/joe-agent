import { test, expect } from 'bun:test';
import { draftCommand, emptyDraft } from '../src/joe/composer/draft';
import { applyWidgetSnapshot, visibleWidgetCards } from '../src/joe/widget-visibility';

test('only registered atom nodes execute shortcuts; literal text is ordinary chat', () => {
  expect(draftCommand(emptyDraft())).toBeUndefined();
  expect(draftCommand({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '/tally' }] }] })).toBeUndefined();
  const command = { type: 'shortcut', attrs: { command: 'tally' } };
  expect(draftCommand({ type: 'doc', content: [{ type: 'paragraph', content: [command] }] })).toBe('tally');
  expect(() => draftCommand({ type: 'doc', content: [command, command] })).toThrow();
  expect(() => draftCommand({ type: 'shortcut', attrs: { command: 'unknown' } })).toThrow();
});
test('finance joins the widget event pipeline and ignores older visibility snapshots', () => {
  const visible = applyWidgetSnapshot({}, { widgetType: 'builtin.finance', revision: 2, visible: true, bindings: { data: { resourceId: 'balances' } } });
  expect(visibleWidgetCards(visible)).toEqual(['finance']);
  expect(visible.finance?.bindings.data.resourceId).toBe('balances');
  expect(applyWidgetSnapshot(visible, { widgetType: 'builtin.finance', revision: 1, visible: false })).toBe(visible);
});
