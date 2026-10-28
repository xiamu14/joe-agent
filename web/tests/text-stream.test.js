import test from 'node:test';
import assert from 'node:assert/strict';
import { TextStream } from '../src/joe/text-stream.ts';

test('coalesces updates per frame and isolates message subscribers', () => {
  let frame;
  globalThis.requestAnimationFrame = callback => { frame = callback; return 1; };
  globalThis.cancelAnimationFrame = () => {};
  const stream = new TextStream();
  let first = 0, second = 0;
  const unsubscribe = stream.subscribe('a', () => first++);
  stream.subscribe('b', () => second++);
  stream.append('a', '你');
  stream.append('a', '好');
  assert.equal(stream.get('a'), '你好');
  assert.equal(first, 0);
  frame();
  assert.equal(first, 1);
  assert.equal(second, 0);
  const snapshot = stream.snapshot();
  unsubscribe();
  stream.clear();
  assert.equal(snapshot.get('a'), '你好');
  assert.equal(stream.get('a'), undefined);
});
