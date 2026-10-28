import test from 'node:test';
import assert from 'node:assert/strict';
import { cardTilt } from '../src/joe/card-tilt.ts';

const bounds = { left: 100, top: 200, width: 300, height: 200 };

test('card tilt follows the pointer and stays within four degrees', () => {
  const center = cardTilt(250, 300, bounds);
  assert.equal(Math.abs(center.rotateX), 0);
  assert.equal(Math.abs(center.rotateY), 0);
  assert.deepEqual(cardTilt(100, 200, bounds), { rotateX: 4, rotateY: -4 });
  assert.deepEqual(cardTilt(400, 400, bounds), { rotateX: -4, rotateY: 4 });
  assert.deepEqual(cardTilt(-100, 900, bounds), { rotateX: -4, rotateY: -4 });
});

test('tilt uses displayed bounds after scaling and safely handles hidden cards', () => {
  assert.deepEqual(cardTilt(250, 300, { ...bounds, width: 150, height: 100 }), { rotateX: -4, rotateY: 4 });
  assert.deepEqual(cardTilt(250, 300, { ...bounds, width: 0 }), { rotateX: 0, rotateY: 0 });
});
