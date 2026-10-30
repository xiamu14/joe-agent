import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/joe/video/video-backdrop.tsx', import.meta.url), 'utf8')
  .replace(/^import .*$/gm, '').replace(/\bexport /g, '');

test('backdrop measures once after resizing settles and releases all work on cleanup', () => {
  let effect, resize, clipPath, reads = 0, disconnected = false;
  const timers = new Map(), listeners = new Map();
  const card = { getBoundingClientRect() { reads++; return { left: 10, top: 10, right: 610, bottom: 410, width: 600, height: 400 }; } };
  const scene = { canvas: { current: { querySelector: () => card, getBoundingClientRect: () => ({ left: 0, top: 0, right: 800, bottom: 300 }) } } };
  const context = vm.createContext({
    React: { createElement: () => null }, motion: {}, AnimatePresence: {}, createPortal: () => null,
    useState: () => [undefined, value => { clipPath = value; }], useEffect: fn => { effect = fn; }, useCanvasScene: () => scene,
    document: { body: {} },
    window: { innerWidth: 1200, innerHeight: 800,
      addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) },
    ResizeObserver: class { constructor(fn) { resize = fn; } observe() {} disconnect() { disconnected = true; } },
    setTimeout: fn => { timers.set(fn, fn); return fn; }, clearTimeout: id => timers.delete(id),
    // Any accidental return to a continuous measurement loop fails this test.
    requestAnimationFrame() { throw new Error('Backdrop must not poll every frame'); },
  });
  vm.runInContext(ts.transpile(source, { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 }), context);
  context.VideoBackdrop({ active: true });
  const cleanup = effect();
  for (let i = 0; i < 30; i++) resize();
  assert.equal(reads, 0);
  assert.equal(timers.size, 1);
  for (const [id, fn] of timers) { timers.delete(id); fn(); }
  assert.equal(reads, 1);
  // Card extends to y=410, but the canvas clips it at y=300 above the composer.
  assert.match(clipPath, /V276 Q610 300 586 300/);
  assert.doesNotMatch(clipPath, /410/);
  assert.equal(timers.size, 0);
  resize();
  cleanup();
  assert.equal(timers.size, 0);
  assert.equal(listeners.size, 0);
  assert.equal(disconnected, true);
});
