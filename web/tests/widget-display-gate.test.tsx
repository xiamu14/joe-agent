import { test, expect } from 'bun:test';
import { createWidgetDisplayGate } from '../src/joe/widget-display-gate';

test('holds snapshots until the response is visible, then applies them in order', () => {
  const received: string[] = [];
  const gate = createWidgetDisplayGate(event => received.push(event.type));
  gate.begin();
  gate.receive({ type: 'resource.snapshot' });
  gate.receive({ type: 'widget.snapshot' });
  gate.receive({ type: 'card.open' });
  expect(received).toEqual([]);
  gate.release();
  expect(received).toEqual(['resource.snapshot', 'widget.snapshot', 'card.open']);
  gate.release();
  gate.receive({ type: 'widget.snapshot' });
  expect(received).toHaveLength(4);
});
