import test from 'node:test';
import assert from 'node:assert/strict';
import { chatError, chatStatus } from '../src/joe/chat-status.ts';

test('backend progress uses RareUI built-in animated states', () => {
  assert.deepEqual(chatStatus('thinking', true), { state: 'thinking', label: '思考中' });
  assert.equal(chatStatus('tool-running', true).state, 'researching');
  assert.equal(chatStatus('responding', true).state, 'writing');
  assert.equal(chatStatus('idle', true).state, 'done');
  for (const state of ['error', 'offline', 'blocked']) assert.equal(chatStatus(state, true).state, 'error');
  assert.deepEqual(chatStatus('idle', false), { state: 'thinking', label: '连接中' });
  assert.equal(chatStatus('offline', false).state, 'error');
});

test('voice and other errors do not turn a completed answer into a failed reply', () => {
  assert.equal(chatError('idle', '语音翻译失败，请重试', 'complete'), 'notice');
  assert.equal(chatError('idle', '', 'complete'), null);
  assert.equal(chatError('error', '回答失败', 'streaming'), 'answer');
  assert.equal(chatError('idle', '回答失败', 'error'), 'answer');
});
