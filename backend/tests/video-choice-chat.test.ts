import test from 'node:test';
import assert from 'node:assert/strict';
import { nanoid } from 'nanoid';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const directory = mkdtempSync(join(tmpdir(), 'video-choice-test-'));
process.env.JOE_DATA_DIR = directory;
process.env.OPENROUTER_API_TOKEN = 'test-placeholder';
const { JOE_MODELS_JSON } = await import('../src/config/models');
JOE_MODELS_JSON.splice(0, JOE_MODELS_JSON.length, { type: 'Think', id: 'openai/test', label: 'Test' });
const { mastra } = await import('../src/mastra/index');
const { chat } = await import('../src/joe/chat');
const { store } = await import('../src/joe/store');
const { joeMemory, mastraStorage } = await import('../src/joe/memory');
const { readEvents } = await import('../../web/src/joe/stream');

test('ambiguous playback exposes numbered choices and a later selection plays the same video', async t => {
  const videos = [
    { id: 'SFoUryIjsIs', title: 'OpenDots: Run 100% Free', channel: 'AI Vibe Coder' },
    { id: 'jNQXAC9IVRw', title: 'OpenDots comparison', channel: 'Other Channel' },
  ];
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(String(url), 'https://openrouter.ai/api/v1/chat/completions', 'selection must not search');
    const request = JSON.parse(String(init?.body));
    calls++;
    if (calls === 2 || calls === 3) {
      const messages = JSON.stringify(request.messages);
      assert.match(messages, /option/);
      assert.match(messages, /AI Vibe Coder/);
      assert.match(messages, /Other Channel/);
      assert.match(messages, /https:\/\/www.youtube.com\/watch\?v=jNQXAC9IVRw/);
    }
    const frame = (delta: unknown, reason: string | null) => `data: ${JSON.stringify({ id: `choice-${calls}`, object: 'chat.completion.chunk', created: 1, model: 'openai/test', choices: [{ index: 0, delta, finish_reason: reason }] })}\n\n`;
    const args = calls === 1 ? { query: 'OpenDots', scope: 'recent' } : { query: 'https://www.youtube.com/watch?v=jNQXAC9IVRw' };
    const body = calls % 2
      ? frame({ role: 'assistant', tool_calls: [{ index: 0, id: `call-${calls}`, type: 'function', function: { name: 'playYouTube', arguments: JSON.stringify(args) } }] }, null) + frame({}, 'tool_calls')
      : frame({ role: 'assistant', content: JSON.stringify({ expression: { emotion: 'calm', intensity: 0.3 }, text: calls === 2 ? '1. OpenDots: Run 100% Free — AI Vibe Coder\n2. OpenDots comparison — Other Channel\n想播放哪个？回复序号即可。' : '已请求播放。' }) }, null) + frame({}, 'stop');
    return new Response(body + 'data: [DONE]\n\n', { headers: { 'Content-Type': 'text/event-stream' } });
  });
  const sessionId = store.session();
  const first: any[] = [], second: any[] = [];
  await readEvents(await chat({ sessionId, turnId: nanoid(), text: '播放 OpenDots', model: 'openai/test', recentVideos: videos }, new AbortController().signal), event => first.push(event));
  assert.equal(first.some(event => event.type === 'video.play'), false);
  assert.match(first.at(-1).message.text, /回复序号/);
  await readEvents(await chat({ sessionId, turnId: nanoid(), text: '第二个', model: 'openai/test', recentVideos: [] }, new AbortController().signal), event => second.push(event));
  assert.equal(second.find(event => event.type === 'video.play')?.playback.video.id, videos[1].id);
  assert.equal(calls, 4);
});

test.after(async () => {
  await joeMemory.settled();
  await mastra.observability.shutdown();
  await mastraStorage.close();
  store.db.close();
  rmSync(directory, { recursive: true, force: true });
});
