import test from 'node:test';
import assert from 'node:assert/strict';
import { cardIds, createCanvasLayout, cardLayer } from '../src/joe/canvas-layout.ts';

test('randomized layout is stable for a seed and varies between page visits', () => {
  assert.deepEqual(createCanvasLayout(42), createCanvasLayout(42));
  assert.notDeepEqual(createCanvasLayout(42), createCanvasLayout(43));
});

test('cards form a moderately spaced group centered on the canvas', () => {
  for (let seed = 0; seed < 100; seed++) {
    const layout = createCanvasLayout(seed);
    const center = cardIds.reduce((sum, id) => ({ x: sum.x + layout[id].x / cardIds.length, y: sum.y + layout[id].y / cardIds.length }), { x: 0, y: 0 });
    assert.ok(Math.abs(center.x) < 0.001 && Math.abs(center.y) < 0.001);
    assert.ok(cardIds.every(id => Math.abs(layout[id].x) < 320 && Math.abs(layout[id].y) < 230));
    for (let i = 0; i < cardIds.length; i++) {
      for (let j = i + 1; j < cardIds.length; j++) {
        const a = layout[cardIds[i]], b = layout[cardIds[j]];
        assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > 340);
      }
    }
  }
});

test('selected and closing cards always outrank a hovered video or any ordinary card', () => {
  for (const selected of cardIds) {
    for (const hovered of cardIds) {
      assert.equal(cardLayer(selected, selected, hovered), 100);
      for (const other of cardIds.filter(id => id !== selected)) {
        assert.ok(cardLayer(other, selected, hovered) < cardLayer(selected, selected, hovered));
      }
    }
  }
  assert.equal(cardLayer('video', null, 'video'), 30);
  assert.equal(cardLayer('video', null, null), 3);
});

test('each card has a stable independent rotation between minus five and ten degrees', () => {
  for (let seed = 0; seed < 100; seed++) {
    const layout = createCanvasLayout(seed);
    const angles = cardIds.map(id => layout[id].rotation);
    assert.ok(angles.every(angle => angle >= -5 && angle <= 10));
    assert.equal(new Set(angles).size, cardIds.length);
    assert.deepEqual(layout, createCanvasLayout(seed));
  }
});
