import test from 'node:test';
import assert from 'node:assert/strict';
import { canvasSessionId } from '../src/joe/session-storage.ts';
import { chatTurns } from '../src/joe/chat-turns.ts';

test('each canvas keeps its own session across reloads and replaces invalid IDs', () => {
  const data = new Map();
  const storage = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) };
  const first = '12345678-1234-4234-8234-123456789abc';
  const second = '87654321-1234-4234-8234-123456789abc';
  assert.equal(canvasSessionId(storage, 'example', () => first), first);
  assert.equal(canvasSessionId(storage, 'empty', () => second), second);
  assert.equal(canvasSessionId(storage, 'example', () => { throw new Error('must reuse session'); }), first);
  storage.setItem('example', 'invalid');
  assert.equal(canvasSessionId(storage, 'example', () => first), first);
});

test('streaming messages pair by turn without leaking replies into other turns', () => {
  const user = { id: 'u1', turnId: 't1', role: 'user', text: '你好' };
  const answer = { id: 'a1', turnId: 't1', role: 'assistant', text: '你好！', status: 'complete' };
  const next = { id: 'u2', turnId: 't2', role: 'user', text: '继续' };
  assert.deepEqual(chatTurns([user, answer, next]), [
    { id: 't1', question: '你好', answer }, { id: 't2', question: '继续' },
  ]);
  assert.deepEqual(chatTurns([]), []);
});

test('standalone greetings stay outside the collapsible chat turns', () => {
  const greeting = { id: 'g1', turnId: 'greeting', role: 'assistant', text: '我在呢，今天过得怎么样？', kind: 'greeting' };
  const user = { id: 'u1', turnId: 't1', role: 'user', text: '你好' };
  assert.deepEqual(chatTurns([greeting, user]), [{ id: 't1', question: '你好' }]);
});
