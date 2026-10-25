import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const directory = mkdtempSync(join(tmpdir(), 'joe-chat-test-'));
process.env.JOE_DATA_DIR = directory;
process.env.OPENROUTER_API_TOKEN = 'test-placeholder';
process.env.WEATHER_API_KEY = 'weather-test';
process.env.ZENDOCS_SEARCH_URL = 'https://zendocs.test/search';
process.env.JOE_MODELS_JSON = JSON.stringify([
  { id: 'openai/test', label: 'Test', inputPerMillion: 1, outputPerMillion: 2 },
  { id: 'anthropic/test', label: 'Other' },
]);
const { mastra } = await import('../src/mastra/index');
const { readEvents } = await import('../../web/src/joe/stream');
const { conversationMessages } = await import('../src/joe/conversations');
const { joeAgent } = await import('../src/joe/agent');
const { chat, cancelTurn } = await import('../src/joe/chat');
const { store } = await import('../src/joe/store');
const { loadModels } = await import('../src/joe/config');

test('Mastra streams through the configured adapter and persists expression and usage', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  const requests: { messages: { role: string; content: unknown }[] }[] = [];
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), 'https://openrouter.ai/api/v1/chat/completions');
    calls++;
    const request = JSON.parse(String(init?.body));
    requests.push(request);
    assert.equal(request.model, calls === 1 ? 'openai/test' : 'anthropic/test');
    const base = {
      id: `gen-test-${calls}`,
      object: 'chat.completion.chunk',
      created: 1,
      model: 'openai/test',
    };
    const frames = [
      {
        ...base,
        choices: [
          {
            index: 0,
            delta: {
              role: 'assistant',
              content: '{"expression":{"emotion":"joy","intensity":0.7},"text":"你好。","card":"costs"}',
            },
            finish_reason: null,
          },
        ],
      },
      {
        ...base,
        choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      },
    ];
    return new Response(
      frames.map((frame) => `data: ${JSON.stringify(frame)}\n\n`).join('') + 'data: [DONE]\n\n',
      {
        headers: { 'Content-Type': 'text/event-stream' },
      },
    );
  };
  try {
    const sessionId = store.session(),
      turnId = randomUUID();
    const response = await chat(
      { sessionId, turnId, text: '你好', model: 'openai/test' },
      new AbortController().signal,
    );
    const events: any[] = [];
    await readEvents(response, (e) => events.push(e));
    assert.equal(mastra.getAgent('joe'), joeAgent);
    assert.equal(calls, 1);
    assert.equal(
      store.db.prepare('SELECT COUNT(*) AS n FROM usage_lookup WHERE usage_id=?').get(turnId)!.n,
      1,
    );
    const completed = events.find((e) => e.type === 'message.completed');
    assert.equal(completed.message.status, 'complete', JSON.stringify(events));
    assert.equal(completed.message.text, '你好。');
    assert.equal(completed.message.expression.emotion, 'joy');
    assert.deepEqual(events.find(e => e.type === 'card.open'), { type: 'card.open', sessionId, turnId, card: 'costs' });
    assert.equal(store.messages(sessionId).length, 0, 'new messages must not duplicate into Joe SQLite');
    assert.equal((await conversationMessages(sessionId)).length, 2);
    assert.equal((await conversationMessages(sessionId))[1].text, '你好。');
    assert.equal(store.summary('UTC').input, 10);
    assert.equal(store.summary('UTC').total.known, 0.00002);
    await assert.rejects(
      chat({ sessionId, turnId, text: 'duplicate', model: 'openai/test' }, new AbortController().signal),
      /已提交/,
    );
    const second = await chat(
      { sessionId, turnId: randomUUID(), text: '继续', model: 'anthropic/test' },
      new AbortController().signal,
    );
    const secondText = await second.text();
    assert.match(secondText, /message.completed/);
    assert.equal(calls, 2);
    const prior = requests[1].messages.filter(
      (m) => m.role === 'user' && JSON.stringify(m.content).includes('你好'),
    );
    assert.equal(prior.length, 1, 'Mastra should recall the previous user message exactly once');
    assert.ok(requests[1].messages.some((m) => m.role === 'assistant'));
  } finally {
    globalThis.fetch = original;
  }
});
test('configuration rejects duplicate models and negative rates', () => {
  assert.throws(() => loadModels('[{"id":"a","label":"A"},{"id":"a","label":"B"}]'), /Duplicate/);
  assert.throws(() => loadModels('[{"id":"a","label":"A","inputPerMillion":-1}]'));
  assert.deepEqual(loadModels('[]'), []);
});
function modelFrame(content: string) {
  return `data: ${JSON.stringify({ id: 'test', object: 'chat.completion.chunk', created: 1, model: 'openai/test', choices: [{ index: 0, delta: { role: 'assistant', content }, finish_reason: null }] })}\n\n`;
}
test('invalid structured output fails without leaking JSON into restored history', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      modelFrame('{"expression":{"emotion":"invalid","intensity":8},"text":""}') +
        'data: {"id":"test","object":"chat.completion.chunk","created":1,"model":"openai/test","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',
      { headers: { 'Content-Type': 'text/event-stream' } },
    );
  try {
    const sessionId = store.session();
    const response = await chat(
      { sessionId, turnId: randomUUID(), text: 'bad output', model: 'openai/test' },
      new AbortController().signal,
    );
    const events: any[] = [];
    await readEvents(response, (e) => events.push(e));
    assert.equal(events.at(-1).message.status, 'error');
    const error = events.find((e) => e.type === 'error');
    assert.match(error.message, /TraceID: [a-f0-9]+/);
    const traceId = error.message.split('TraceID: ')[1];
    await mastra.observability.flush();
    assert.ok(await mastra.observability.getRecordedTrace({ traceId }));
    const history = await conversationMessages(sessionId);
    assert.equal(history.length, 2);
    assert.equal(history[1].status, 'error');
    assert.equal(history[1].text, '');
  } finally {
    globalThis.fetch = original;
  }
});
test(
  'cancelling a partial answer persists one interrupted turn and prevents concurrent submission',
  { timeout: 10000 },
  async () => {
    const original = globalThis.fetch;
    globalThis.fetch = async (_url, init) =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(
                modelFrame('{"expression":{"emotion":"calm","intensity":0.3},"text":"你好。'),
              ),
            );
            init?.signal?.addEventListener('abort', () => controller.close(), { once: true });
          },
        }),
        { headers: { 'Content-Type': 'text/event-stream' } },
      );
    try {
      const sessionId = store.session(),
        turnId = randomUUID();
      const response = await chat(
        { sessionId, turnId, text: 'cancel me', model: 'openai/test' },
        new AbortController().signal,
      );
      await assert.rejects(
        chat(
          { sessionId, turnId: randomUUID(), text: 'concurrent', model: 'openai/test' },
          new AbortController().signal,
        ),
        /仍在回答/,
      );
      const events: any[] = [];
      let cancelled: Promise<void> | undefined;
      await readEvents(response, (e) => {
        events.push(e);
        if (e.type === 'text.delta') cancelled = cancelTurn(sessionId, turnId);
      });
      assert.ok(cancelled);
      await cancelled;
      assert.equal(events.at(-1).message.status, 'interrupted');
      const history = await conversationMessages(sessionId);
      assert.equal(history.length, 2);
      assert.equal(history[1].status, 'interrupted');
      assert.equal(history[1].text, '你好。');
    } finally {
      globalThis.fetch = original;
    }
  },
);
test('native tools coexist with structured output and preserve sources in Memory', async () => {
  const original = globalThis.fetch;
  let llmCalls = 0;
  globalThis.fetch = async (url, init) => {
    if (String(url) === 'https://zendocs.test/search') {
      assert.deepEqual(JSON.parse(String(init?.body)), { query: 'Joe', limit: 6 });
      return Response.json({
        sources: [{ title: 'Joe docs', url: 'https://docs.test/joe', content: 'Joe is a voice agent.' }],
      });
    }
    llmCalls++;
    const frame = (delta: unknown, reason: string | null) =>
      `data: ${JSON.stringify({ id: 'test', object: 'chat.completion.chunk', created: 1, model: 'openai/test', choices: [{ index: 0, delta, finish_reason: reason }] })}\n\n`;
    const body =
      llmCalls === 1
        ? frame(
            {
              role: 'assistant',
              tool_calls: [
                {
                  index: 0,
                  id: 'docs-call',
                  type: 'function',
                  function: { name: 'searchDocs', arguments: '{"query":"Joe"}' },
                },
              ],
            },
            null,
          ) + frame({}, 'tool_calls')
        : modelFrame('{"expression":{"emotion":"curious","intensity":0.5},"text":"Joe 是语音助手。"}') +
          frame({}, 'stop');
    return new Response(body + 'data: [DONE]\n\n', { headers: { 'Content-Type': 'text/event-stream' } });
  };
  try {
    const sessionId = store.session();
    const response = await chat(
      { sessionId, turnId: randomUUID(), text: '检索 Joe 文档', model: 'openai/test' },
      new AbortController().signal,
    );
    const events: any[] = [];
    await readEvents(response, (e) => events.push(e));
    assert.equal(events.at(-1).message.status, 'complete', JSON.stringify(events));
    assert.equal(llmCalls, 2);
    assert.ok(events.some((e) => e.state === 'tool-running'));
    assert.ok(events.some((e) => e.type === 'sources' && e.sources[0].title === 'Joe docs'));
    const history = await conversationMessages(sessionId);
    assert.equal(history.length, 2, 'tool messages must not create duplicate visible assistant messages');
    assert.equal(history[1].sources?.[0].url, 'https://docs.test/joe');
  } finally {
    globalThis.fetch = original;
  }
});
test('agent invokes city weather tool before producing its final answer', async () => {
  const original = fetch;
  let llmCalls = 0,
    weatherCalls = 0;
  globalThis.fetch = async (url, init) => {
    if (String(url).startsWith('https://api.weatherapi.com/')) {
      weatherCalls++;
      assert.equal(new URL(String(url)).searchParams.get('q'), 'Tokyo, Japan');
      return Response.json({
        location: { name: 'Tokyo', region: 'Tokyo', country: 'Japan', tz_id: 'Asia/Tokyo' },
        current: {
          temp_c: 22,
          feelslike_c: 23,
          humidity: 60,
          wind_kph: 10,
          condition: { text: '多云' },
          last_updated_epoch: 1792700000,
        },
      });
    }
    llmCalls++;
    const request = JSON.parse(String(init?.body));
    assert.ok(request.tools.some((tool: any) => tool.function.name === 'getWeather'));
    const frame = (delta: unknown, reason: string | null) =>
      `data: ${JSON.stringify({ id: 'weather-test', object: 'chat.completion.chunk', created: 1, model: 'openai/test', choices: [{ index: 0, delta, finish_reason: reason }] })}\n\n`;
    const body =
      llmCalls === 1
        ? frame(
            {
              role: 'assistant',
              tool_calls: [
                {
                  index: 0,
                  id: 'weather-call',
                  type: 'function',
                  function: { name: 'getWeather', arguments: '{"city":"Tokyo, Japan"}' },
                },
              ],
            },
            null,
          ) + frame({}, 'tool_calls')
        : modelFrame('{"expression":{"emotion":"calm","intensity":0.3},"text":"东京目前多云，22°C。"}') +
          frame({}, 'stop');
    return new Response(body + 'data: [DONE]\n\n', { headers: { 'Content-Type': 'text/event-stream' } });
  };
  try {
    const sessionId = store.session();
    const response = await chat(
      { sessionId, turnId: randomUUID(), text: '东京天气怎么样？', model: 'openai/test' },
      new AbortController().signal,
    );
    const events: any[] = [];
    await readEvents(response, (event) => events.push(event));
    assert.equal(weatherCalls, 1);
    assert.equal(llmCalls, 2);
    assert.ok(events.some((event) => event.state === 'tool-running'));
    assert.equal(events.at(-1).message.status, 'complete');
    assert.equal(events.at(-1).message.text, '东京目前多云，22°C。');
  } finally {
    globalThis.fetch = original;
  }
});

test.after(async () => {
  const { joeMemory, mastraStorage } = await import('../src/joe/memory');
  await joeMemory.settled();
  await mastra.observability.shutdown();
  await mastraStorage.close();
  store.db.close();
  rmSync(directory, { recursive: true, force: true });
});
