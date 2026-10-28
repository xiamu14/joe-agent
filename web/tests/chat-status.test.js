import test from 'node:test';
import assert from 'node:assert/strict';
import { chatStatus } from '../src/joe/chat-status.ts';

test('backend progress uses RareUI built-in animated states', () => {
  assert.deepEqual(chatStatus('thinking', true), { state: 'thinking', label: '思考中' });
  assert.equal(chatStatus('tool-running', true).state, 'researching');
  assert.equal(chatStatus('responding', true).state, 'writing');
  assert.equal(chatStatus('idle', true).state, 'done');
  for (const state of ['error', 'offline', 'blocked']) assert.equal(chatStatus(state, true).state, 'error');
  assert.deepEqual(chatStatus('idle', false), { state: 'thinking', label: '连接中' });
  assert.equal(chatStatus('offline', false).state, 'error');
});
