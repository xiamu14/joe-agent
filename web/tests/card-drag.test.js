import test from 'node:test';
import assert from 'node:assert/strict';
import { draggedPosition, edgePanDelta } from '../src/joe/card-drag-geometry.ts';
import { restoreCanvas } from '../src/joe/canvas-storage.ts';
import { createCanvasLayout } from '../src/joe/canvas-layout.ts';

const bounds = { left: 100, top: 100, width: 800, height: 600 };
test('card remains under the pointer while the canvas pans in both axes', () => {
  const position = draggedPosition({ x: 20, y: 30 }, { x: 300, y: 250 }, { x: 400, y: 350 }, { x: 10, y: 5 }, { x: -40, y: 25 });
  assert.deepEqual(position, { x: 170, y: 110 });
  assert.equal(position.x - 40, 20 + 10 + 100);
  assert.equal(position.y + 25, 30 + 5 + 100);
});

test('edge panning starts only near an edge, follows both axes, and stops outside the canvas', () => {
  assert.deepEqual(edgePanDelta({ x: 500, y: 400 }, bounds, 0.016), { x: 0, y: 0 });
  const corner = edgePanDelta({ x: 900, y: 700 }, bounds, 0.016);
  assert.ok(corner.x < 0 && corner.y < 0);
  const opposite = edgePanDelta({ x: 100, y: 100 }, bounds, 0.016);
  assert.deepEqual(opposite, { x: -corner.x, y: -corner.y });
  assert.deepEqual(edgePanDelta({ x: 901, y: 400 }, bounds, 0.016), { x: 0, y: 0 });
  assert.equal(edgePanDelta({ x: 900, y: 400 }, bounds, 10).x, -14.4);
});

test('persisted positions, rotations and pan restore independently of the new random seed', () => {
  const cards = createCanvasLayout(42);
  cards.weather.x += 130;
  const saved = { version: 1, cards, pan: { x: -140, y: 80 } };
  assert.deepEqual(restoreCanvas(JSON.stringify(saved), createCanvasLayout(99)), saved);
});

test('invalid browser storage falls back safely and new cards use their initial positions', () => {
  const fallback = createCanvasLayout(42);
  for (const raw of [null, '{broken', 'null', '{"version":2}', '{"version":1,"cards":null}']) {
    assert.deepEqual(restoreCanvas(raw, fallback), { version: 1, cards: fallback, pan: { x: 0, y: 0 } });
  }
  const value = restoreCanvas(JSON.stringify({ version: 1, cards: { idea: { x: '20', y: 2, rotation: 0 }, video: { x: 10, y: 20, rotation: -3 }, weather: { x: 1e99, y: 0, rotation: 0 } }, pan: { x: 'oops', y: 0 } }), fallback);
  assert.deepEqual(value.cards.idea, fallback.idea);
  assert.deepEqual(value.cards.weather, fallback.weather);
  assert.deepEqual(value.cards.video, { x: 10, y: 20, rotation: -3 });
  assert.deepEqual(value.pan, { x: 0, y: 0 });
});
