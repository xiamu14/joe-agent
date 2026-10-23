import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dayKey } from '../src/joe/schema';
import { readEvents, extractSentence } from '../../web/src/joe/stream';

test('AI SDK SSE handles UTF-8 split at every byte and rejects premature termination', async () => {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(
    'data: {"type":"data-joe","data":{"type":"text.delta","text":"你好"}}\n\ndata: {"type":"data-joe","data":{"type":"message.completed"}}\n\ndata: [DONE]\n\n',
  );
  const received: unknown[] = [];
  const body = new ReadableStream({
    start(c) {
      for (const byte of bytes) c.enqueue(Uint8Array.of(byte));
      c.close();
    },
  });
  await readEvents(new Response(body), (event) => received.push(event));
  assert.deepEqual(received, [{ type: 'text.delta', text: '你好' }, { type: 'message.completed' }]);
  await assert.rejects(
    readEvents(new Response('data: [DONE]\n\n'), () => {}),
    /连接中断/,
  );
});
test('speech segments are bounded and preserve the remaining text', () => {
  assert.deepEqual(extractSentence('你好。下一句'), ['你好。', '下一句']);
  assert.deepEqual(extractSentence('没有标点'), ['', '没有标点']);
  assert.equal(extractSentence('a'.repeat(500))[0].length, 240);
  assert.equal(extractSentence('a'.repeat(500) + '。')[0].length, 240);
  assert.deepEqual(extractSentence('最后一句', true), ['最后一句', '']);
});
test('persistent sessions, attachment ownership, accounting and restart recovery', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'joe-test-'));
  process.env.JOE_DATA_DIR = directory;
  const { Store, store } = await import('../src/joe/store');
  const file = join(directory, 'test.sqlite');
  let db = new Store(file);
  try {
    const session = db.session(),
      other = db.session();
    const attachment = db.attach(session, 'note.md', 'private content');
    assert.throws(() => db.attachment(other, attachment.id), /不属于/);
    assert.equal(db.attachment(session, attachment.id).text, 'private content');
    const message = {
      id: 'message',
      sessionId: session,
      turnId: 'turn',
      role: 'assistant' as const,
      text: 'partial',
      status: 'streaming',
      model: 'test',
      expression: { emotion: 'calm' as const, intensity: 0.3 },
      attachments: [],
      sources: [{ title: 'Doc', url: 'https://example.org/doc' }],
      createdAt: Date.now(),
    };
    db.saveMessage(message);
    db.saveMessage({ ...message, text: 'updated' });
    db.usage('turn', 'llm', 'test', null, null, null, 'pending');
    assert.equal(db.summary('UTC').total.pending, 1);
    db.usage('turn', 'llm', 'test', 10, 20, 0.03);
    db.usage('voice', 'tts', 'test', null, null, null);
    const usage = db.summary('UTC');
    assert.equal(usage.input, 10);
    assert.equal(usage.output, 20);
    assert.equal(usage.total.known, 0.03);
    assert.equal(usage.total.pending, 1);
    db.usage('older-model', 'llm', 'test', 1, 1, 0.02);
    db.db.prepare('UPDATE usage SET time=? WHERE id=?').run(Date.now() - 7 * 86400000, 'older-model');
    assert.equal(db.summary('UTC').model.known, 0.03);
    assert.equal(db.summary('UTC').modelLifetime.known, 0.05);
    assert.equal(db.summary('UTC').modelLifetime.pending, 0);
    db.tick(60000);
    db.db.close();
    db = new Store(file);
    assert.equal(db.session(session), session);
    assert.equal(db.messages(session)[0].status, 'interrupted');
    assert.equal(db.messages(session)[0].sources?.[0].title, 'Doc');
    assert.equal(db.messages(session).length, 1);
    assert.equal(db.summary('UTC').uptimeMs, 60000);
    assert.equal(db.settings().voice, true);
    assert.throws(() => db.saveSettings({ timezone: 'invalid-zone' }));
    assert.equal(dayKey(Date.parse('2026-10-22T20:00:00Z'), 'Asia/Shanghai'), '2026-10-23');
  } finally {
    db.db.close();
    store.db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
