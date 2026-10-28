import test from 'node:test';
import assert from 'node:assert/strict';
import { expandedCardBounds } from '../src/joe/card-expansion.ts';

const canvas = { left: 200, top: 100, width: 900, height: 600 };
const frame = { left: 290, top: 145, width: 720, height: 510 };

test('expanded card occupies two thirds of canvas width and centers within canvas', () => {
  const result = expandedCardBounds(canvas, frame, 720);
  assert.equal(result.width, 600);
  assert.equal(result.maxHeight, 600);
  assert.equal(frame.left + result.left, canvas.left + canvas.width / 6);
  assert.equal(frame.top + result.top, canvas.top + canvas.height / 2);
});

test('expanded dimensions compensate for the preview scale and track canvas resize', () => {
  const scaled = { ...frame, width: 576, height: 408 };
  const result = expandedCardBounds(canvas, scaled, 720);
  assert.equal(result.width * 0.8, 600);
  assert.equal(result.maxHeight * 0.8, canvas.height);
  assert.equal(scaled.left + result.left * 0.8, canvas.left + canvas.width / 6);
  const resized = expandedCardBounds({ ...canvas, width: 600, height: 300 }, scaled, 720);
  assert.equal(resized.width * 0.8, 400);
  assert.equal(resized.maxHeight * 0.8, 300);
});
