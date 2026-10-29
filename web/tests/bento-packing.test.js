import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source = readFileSync(new URL('../src/joe/layouts/bento-packing.ts', import.meta.url), 'utf8').replace(/^import .*$/gm, '').replace(/\bexport /g, '');
const context = vm.createContext({});
vm.runInContext(ts.transpile(source, { target: ts.ScriptTarget.ES2022 }), context);
const ids = ['video', 'weather', 'costs', 'settings'];
const sizes = { video: { width: 360, height: 416 }, weather: { width: 380, height: 300 }, costs: { width: 320, height: 190 }, settings: { width: 310, height: 190 } };
const fallback = Object.fromEntries(ids.map(id => [id, { x: 25, y: -30, rotation: 5 }]));
function pack(width, height, cards = ids) { return context.packBento(cards, sizes, width, height, fallback); }
function rectangle(result, id) {
  const point = result.layout[id], size = sizes[id];
  return { left: point.x - size.width / 2, right: point.x + size.width / 2, top: point.y - size.height / 2, bottom: point.y + size.height / 2 };
}
test('Bento preserves dimensions, packs deterministically and never overlaps cards', () => {
  const result = pack(900, 700);
  assert.equal(JSON.stringify(result), JSON.stringify(pack(900, 700)));
  for (const [index, id] of ids.entries()) {
    assert.equal(result.layout[id].rotation, 0);
    const a = rectangle(result, id);
    for (const other of ids.slice(index + 1)) {
      const b = rectangle(result, other);
      assert.ok(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
    }
  }
  assert.equal(fallback.video.rotation, 5);
});
test('narrow canvases scroll without shrinking cards, and removal compacts rows', () => {
  const narrow = pack(280, 400);
  assert.ok(narrow.width >= 380 + 48);
  assert.ok(narrow.height > 400);
  const compact = pack(900, 700, ['weather', 'costs', 'settings']);
  assert.ok(compact.height < pack(900, 700).height);
});
