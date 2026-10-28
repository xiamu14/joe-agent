import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const directory = mkdtempSync(join(tmpdir(), 'joe-greeting-test-'));
process.env.JOE_DATA_DIR = directory;
const { greetingMessage } = await import('../src/joe/greeting');
const { Store, store } = await import('../src/joe/store');
const { conversationMessages } = await import('../src/joe/conversations');
const { mastraStorage } = await import('../src/joe/memory');

test('new and existing sessions receive exactly one greeting', () => {
  const db = new Store(':memory:');
  try {
    const id = db.session(undefined, true);
    const [greeting] = db.messages(id);
    assert.equal(greeting.role, 'assistant');
    assert.equal(greeting.kind, 'greeting');
    assert.equal(greeting.text, '我在呢，今天过得怎么样？');
    assert.equal(greeting.audioUrl, '/audio/greeting-zh.mp3');
    assert.equal(db.session(id, true), id);
    assert.equal(db.messages(id).length, 1);
    const legacy = db.session();
    db.session(legacy, true);
    assert.equal(db.messages(legacy).length, 1);
    db.session(legacy, true);
    assert.equal(db.messages(legacy).length, 1);
    const second = db.session(undefined, true);
    assert.notEqual(db.messages(second)[0].id, greeting.id);
    assert.equal(db.messages(second)[0].audioUrl, greeting.audioUrl);
  } finally { db.db.close(); }
});

test('greeting survives canonical history migration and is never duplicated', async () => {
  const id = store.session(undefined, true);
  const first = await conversationMessages(id);
  assert.equal(first.length, 1);
  assert.equal(first[0].kind, 'greeting');
  assert.equal(first[0].audioUrl, '/audio/greeting-zh.mp3');
  assert.deepEqual(await conversationMessages(id), first);
});

test('backfill reaches an already canonical conversation without replacing history', async () => {
  const id = store.session();
  store.saveMessage({ ...greetingMessage(id), kind: undefined, audioUrl: undefined, role: 'user', text: '已有消息' });
  assert.equal((await conversationMessages(id))[0].text, '已有消息');
  store.session(id, true);
  const first = await conversationMessages(id);
  assert.equal(first.length, 2);
  assert.equal(first[0].kind, 'greeting');
  assert.equal(first[1].text, '已有消息');
  await Promise.all([conversationMessages(id), conversationMessages(id)]);
  assert.deepEqual(await conversationMessages(id), first);
});

test.after(async () => {
  store.db.close();
  await mastraStorage.close();
  rmSync(directory, { recursive: true, force: true });
});
