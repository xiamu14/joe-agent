import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import type { Message } from '../src/joe/store';
const directory = mkdtempSync(join(tmpdir(), 'joe-memory-test-'));
process.env.JOE_DATA_DIR = directory;
const { joeMemory, mastraStorage, resourceId } = await import('../src/joe/memory');
const { store } = await import('../src/joe/store');
const { conversationMessages, threadId: memoryThread } = await import('../src/joe/conversations');

test('legacy imports are idempotent and memory survives reopening the database', async () => {
  const session = store.session();
  const threadId = memoryThread(session);
  const common = {
    sessionId: session,
    turnId: 'turn',
    model: 'test',
    expression: { emotion: 'calm' as const, intensity: 0.3 },
    attachments: [],
    status: 'complete',
    createdAt: Date.now(),
  };
  const legacy: Message[] = [
    { ...common, id: 'user-old', role: 'user', text: '请记住我喜欢简洁回答' },
    { ...common, id: 'assistant-old', role: 'assistant', text: '好的。' },
    {
      ...common,
      id: 'failed',
      turnId: 'failed-turn',
      role: 'assistant',
      status: 'error',
      text: 'partial',
    },
  ];
  legacy.forEach((m) => store.saveMessage(m));
  assert.equal((await conversationMessages(session)).length, 3);
  assert.equal((await conversationMessages(session)).length, 3);
  const messages = await joeMemory.recall({
    threadId,
    resourceId,
    perPage: 100,
  });
  assert.equal(messages.messages.length, 3);
  assert.deepEqual(
    messages.messages.map((m) => m.role),
    ['user', 'assistant', 'assistant'],
  );
  await joeMemory.updateWorkingMemory({
    threadId,
    resourceId,
    workingMemory: '用户偏好：简洁回答',
  });
  await joeMemory.createThread({ threadId: 'another-session', resourceId });
  assert.match(
    (await joeMemory.getWorkingMemory({
      threadId: 'another-session',
      resourceId,
    })) || '',
    /简洁回答/,
  );
  await joeMemory.settled();
  await mastraStorage.close();
  const reopened = new LibSQLStore({
    id: 'reopened',
    url: `file:${join(directory, 'mastra.db')}`,
  });
  const memory = new Memory({
    storage: reopened,
    options: {
      semanticRecall: false,
      workingMemory: { enabled: true, scope: 'resource' },
    },
  });
  try {
    assert.equal((await memory.recall({ threadId, resourceId, perPage: 100 })).messages.length, 3);
    assert.match(
      (await memory.getWorkingMemory({
        threadId: 'another-session',
        resourceId,
      })) || '',
      /简洁回答/,
    );
    assert.equal(
      (
        await memory.recall({
          threadId: 'another-session',
          resourceId,
          perPage: 100,
        })
      ).messages.length,
      0,
    );
  } finally {
    await reopened.close();
  }
});
test.after(async () => {
  await mastraStorage.close();
  store.db.close();
  rmSync(directory, { recursive: true, force: true });
});
