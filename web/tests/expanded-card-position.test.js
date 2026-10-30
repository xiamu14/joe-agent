import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/joe/tilt-card.tsx', import.meta.url), 'utf8')
  .replace(/^import .*$/gm, '').replace(/\bexport /g, '');

test('expanded cards stay centered after a scrolled canvas switches to clipping', () => {
  for (const pannable of [false, true]) {
    const scene = {
      selection: { id: 'video', expanded: true }, placement: { pannable, draggable: pannable },
      layout: { video: { x: -140, y: 308, rotation: 5 } },
      panX: { get: () => 80 }, panY: { get: () => 134 },
      // Stale offsets from before overflow: clip must never position an expanded card.
      scrollX: { get: () => 80 }, scrollY: { get: () => 134 },
      hoverIntent: { leave() {} }, finishClose() {},
    };
    const motion = new Proxy({ create: value => value }, { get: (target, key) => target[key] ?? key });
    const context = vm.createContext({
      React: { createElement: (type, props, ...children) => ({ type, props, children }) },
      motion, Button: 'Button', X: 'X', Minus: 'Minus',
      useCanvasScene: () => scene, useIsPresent: () => true,
      useRef: current => ({ current }), useCallback: fn => fn, useEffect() {},
      useMotionValue: value => ({ get: () => value }), useSpring: value => value,
      useTransform: fn => fn(),
      useCardFlip: () => ({ controls: {}, reduced: true, layoutExpanded: true, flipping: false }),
      useCardDrag: () => ({ dx: { get: () => 30 }, dy: { get: () => 20 } }),
      cardWidths: { video: 360 }, cardLayer: () => 100,
    });
    vm.runInContext(ts.transpile(source, { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 }), context);
    const card = context.TiltCard({ id: 'video', surfaceClassName: '', label: '视频卡片' });
    assert.equal(card.props.style.left, '50%');
    assert.equal(card.props.style.top, '50%');
    assert.equal(card.props.style.x, 0);
    assert.equal(card.props.style.y, 0);
  }
});
