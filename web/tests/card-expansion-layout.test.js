import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/joe/tilt-card.tsx', import.meta.url), 'utf8')
  .replace(/^import .*$/gm, '').replace(/\bexport /g, '');

function fixture() {
  let requested = false, layoutExpanded = false;
  const value = { get: () => 0, set() {} };
  const scene = { layout: { video: { x: 0, y: 0, rotation: 0 } }, placement: {}, finishClose() {} };
  const context = vm.createContext({
    React: { createElement: (type, props, ...children) => ({ type, props, children }) },
    motion: new Proxy({ create: () => 'button' }, { get: (obj, key) => obj[key] ?? key }),
    Button: 'button', Minus: 'minus', Icon: 'icon',
    useCallback: fn => fn, useEffect() {}, useRef: () => ({ current: null }),
    useIsPresent: () => true, useMotionValue: () => value, useSpring: () => value,
    useTransform: () => value, useCardDrag: () => ({ dx: value, dy: value }),
    useCanvasScene: () => ({ ...scene, selection: requested ? { id: 'video', expanded: true } : null }),
    useCardFlip: () => ({ controls: {}, reduced: false, layoutExpanded, flipping: requested !== layoutExpanded }),
    cardWidths: { video: 360 }, cardLayer: () => 1,
  });
  vm.runInContext(ts.transpile(source, { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 }), context);
  return (request, layout) => {
    requested = request; layoutExpanded = layout;
    let contentExpanded;
    const tree = context.TiltCard({ id: 'video', animateExpandedSize: true,
      expandedWidth: '914px', expandedHeight: '700px', surfaceClassName: '', label: '视频',
      children: expanded => { contentExpanded = expanded; return null; },
    });
    return { props: tree.props, contentExpanded };
  };
}

test('video content and outer dimensions share the visual phase across collapse and reopen', () => {
  const render = fixture();
  // User intent can change before the flip midpoint changes the visual layout.
  for (const [requested, layout] of [[true, true], [false, true], [false, false], [true, false], [true, true]]) {
    const { props, contentExpanded } = render(requested, layout);
    assert.equal(contentExpanded, layout);
    assert.equal(props.style.height, layout ? '700px' : 'auto');
    assert.equal(props.animate.height, props.style.height);
    assert.equal(props.style.width, layout ? '914px' : 360);
    assert.equal(props.animate.width, props.style.width);
  }
});
