import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/joe/layouts/canvas-layout-layer.tsx', import.meta.url), 'utf8')
  .replace(/^import .*$/gm, '').replace(/\bexport /g, '');

test('measures after the parent ref attaches and observes cards added after bootstrap', () => {
  const layoutEffects = [], effects = [], observed = [];
  let state, onResize, onMutation, disconnected = 0;
  const context = vm.createContext({
    useLayoutEffect: effect => layoutEffects.push(effect),
    useEffect: effect => effects.push(effect),
    useState: initial => {
      state = initial;
      return [state, update => { state = update(state); }];
    },
    ResizeObserver: class {
      constructor(callback) { onResize = callback; }
      observe(node) { observed.push(node); }
      disconnect() { disconnected++; }
    },
    MutationObserver: class {
      constructor(callback) { onMutation = callback; }
      observe() {}
      disconnect() { disconnected++; }
    },
  });
  vm.runInContext(ts.transpile(source, { target: ts.ScriptTarget.ES2022 }), context);
  const canvas = { current: null };
  context.useCardMeasurements({ canvas });
  layoutEffects.forEach(effect => effect());
  const cards = [];
  canvas.current = { clientWidth: 880, clientHeight: 700, querySelectorAll: () => cards };
  const cleanup = effects.map(effect => effect());
  assert.equal(state.width, 880);
  assert.equal(state.height, 700);
  assert.ok(observed.includes(canvas.current));
  const video = { dataset: { card: 'video' }, offsetWidth: 360, offsetHeight: 124 };
  cards.push(video);
  onMutation();
  assert.ok(observed.includes(video));
  assert.equal(state.sizes.video.height, 124);
  assert.equal(state.sizes.video.width, 360);
  // A width-only resize must invalidate packing, even when height stays unchanged.
  video.offsetWidth = 420;
  onResize();
  assert.equal(state.sizes.video.width, 420);
  assert.equal(state.sizes.video.height, 124);
  video.offsetHeight = 416;
  onResize();
  assert.equal(state.sizes.video.height, 416);
  const unchanged = state;
  onResize();
  assert.equal(state, unchanged);
  cleanup.forEach(dispose => dispose());
  assert.equal(disconnected, 2);
});
