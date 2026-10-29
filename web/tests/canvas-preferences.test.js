import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCanvasPreferences, saveCanvasPreferences } from '../src/joe/layouts/canvas-preferences.ts';

test('restores the last space and its layout while preserving legacy preferences', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const values = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  } });
  try {
    assert.deepEqual(loadCanvasPreferences(), { view: 0, modes: ['free', 'free'] });
    values.set('canvas.layout-modes.v1', '["bento","free"]');
    assert.deepEqual(loadCanvasPreferences(), { view: 0, modes: ['bento', 'free'] });
    for (const view of [0, 1]) {
      for (const mode of ['free', 'bento']) {
        const preferences = { view, modes: ['bento', mode] };
        saveCanvasPreferences(preferences);
        assert.deepEqual(loadCanvasPreferences(), preferences);
      }
    }
    values.set('canvas.active-view.v1', '99');
    values.set('canvas.layout-modes.v1', '["unknown"]');
    assert.deepEqual(loadCanvasPreferences(), { view: 0, modes: ['free', 'free'] });
    values.set('canvas.layout-modes.v1', '{');
    assert.deepEqual(loadCanvasPreferences(), { view: 0, modes: ['free', 'free'] });
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Storage blocked'); } });
    assert.deepEqual(loadCanvasPreferences(), { view: 0, modes: ['free', 'free'] });
    assert.doesNotThrow(() => saveCanvasPreferences({ view: 1, modes: ['free', 'bento'] }));
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
});
