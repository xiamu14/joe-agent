import test from 'node:test';
import assert from 'node:assert/strict';
import { nanoid } from 'nanoid';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const directory = mkdtempSync(join(tmpdir(), 'joe-chat-test-'));
process.env.JOE_DATA_DIR = directory;
process.env.OPENROUTER_API_TOKEN = 'test-placeholder';
process.env.WEATHER_API_KEY = 'weather-test';
process.env.ZENDOCS_SEARCH_URL = 'https://zendocs.test/search';
const { JOE_MODELS_JSON } = await import('../src/config/models');
JOE_MODELS_JSON.splice(0, JOE_MODELS_JSON.length, ...[
  { type: 'Think', id: 'openai/test', label: 'Test', inputPerMillion: 1, outputPerMillion: 2 },
  { type: 'Think', id: 'anthropic/test', label: 'Other' },
]);
const { mastra } = await import('../src/mastra/index');
const { readEvents } = await import('../../web/src/joe/stream');
const { conversationMessages } = await import('../src/joe/conversations');
const { joeAgent } = await import('../src/joe/agent');
const { chat, cancelTurn } = await import('../src/joe/chat');
const { store } = await import('../src/joe/store');
const { widgetStore } = await import('../src/joe/widget-runtime');
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
      turnId = nanoid();
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
    assert.equal(events.some(e => e.type === 'card.open'), false, 'final answer cannot control cards');
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
      { sessionId, turnId: nanoid(), text: '继续', model: 'anthropic/test' },
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
test('plain text model output remains a usable answer', async () => {
  const original = globalThis.fetch;
  const requests: string[] = [];
  globalThis.fetch = async (_url, init) => {
    requests.push(String(init?.body));
    return new Response(
    modelFrame(requests.length === 1 ? '我暂时不能搜索视频。' : '{"expression":{"emotion":"calm","intensity":0.3},"text":"你好。"}') + 'data: {"id":"test","object":"chat.completion.chunk","created":1,"model":"openai/test","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',
    { headers: { 'Content-Type': 'text/event-stream' } },
    );
  };
  try {
    const sessionId = store.session();
    const events: any[] = [];
    await readEvents(await chat({ sessionId, turnId: nanoid(), text: '搜索视频', model: 'openai/test' }, new AbortController().signal), e => events.push(e));
    assert.equal(events.at(-1).message.status, 'complete');
    assert.equal(events.at(-1).message.text, '我暂时不能搜索视频。');
    assert.equal((await conversationMessages(sessionId))[1].text, '我暂时不能搜索视频。');
    const next: any[] = [];
    await readEvents(await chat({ sessionId, turnId: nanoid(), text: '继续', model: 'openai/test' }, new AbortController().signal), e => next.push(e));
    assert.equal(next.at(-1).message.status, 'complete');
    assert.match(requests[1], /我暂时不能搜索视频/);
  } finally { globalThis.fetch = original; }
});
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
      { sessionId, turnId: nanoid(), text: 'bad output', model: 'openai/test' },
      new AbortController().signal,
    );
    const events: any[] = [];
    await readEvents(response, (e) => events.push(e));
    assert.equal(events.at(-1).message.status, 'error');
    const error = events.find((e) => e.type === 'error');
    assert.equal(error.message, '回答暂时不可用，请重试。');
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
        turnId = nanoid();
      const response = await chat(
        { sessionId, turnId, text: 'cancel me', model: 'openai/test' },
        new AbortController().signal,
      );
      await assert.rejects(
        chat(
          { sessionId, turnId: nanoid(), text: 'concurrent', model: 'openai/test' },
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
      { sessionId, turnId: nanoid(), text: '检索 Joe 文档', model: 'openai/test' },
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
          condition: { text: '多云', code: 1003 },
          is_day: 1,
          last_updated_epoch: 1792700000,
        },
        forecast: { forecastday: [{ date: '2026-10-28', day: { mintemp_c: 18 }, astro: { sunrise: '06:00 AM', sunset: '06:00 PM' } }] },
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
        : modelFrame('东京目前多云，22°C。') +
          frame({}, 'stop');
    return new Response(body + 'data: [DONE]\n\n', { headers: { 'Content-Type': 'text/event-stream' } });
  };
  try {
    const sessionId = store.session();
    const response = await chat(
      { sessionId, turnId: nanoid(), text: '东京天气怎么样？', model: 'openai/test' },
      new AbortController().signal,
    );
    const events: any[] = [];
    await readEvents(response, (event) => events.push(event));
    assert.equal(weatherCalls, 1);
    assert.equal(llmCalls, 2);
    assert.ok(events.some((event) => event.state === 'tool-running'));
    assert.equal(events.at(-1).message.status, 'complete');
    assert.equal(events.at(-1).message.text, '东京目前多云，22°C。');
    const canvas = widgetStore.canvasForSession(sessionId);
    const snapshot = widgetStore.snapshot(canvas);
    const card = snapshot.instances.find((item: any) => item.widgetType === 'builtin.weather');
    assert.equal(card.visible, true);
    assert.equal(snapshot.resources.find((item: any) => item.resourceId === card.bindings.data.resourceId).data.temperature, 22);
    assert.ok(widgetStore.events(canvas, 0).some((event: any) => event.type === 'widget.snapshot'));
    assert.ok(widgetStore.events(canvas, 0).some((event: any) => event.type === 'resource.snapshot'));
    assert.equal(events.find((event: any) => event.type === 'widget.snapshot')?.instance.widgetType, 'builtin.weather');
    assert.equal(events.find((event: any) => event.type === 'resource.snapshot')?.resource.data.temperature, 22);
  } finally {
    globalThis.fetch = original;
  }
});

test('widget tool result opens a card before the final answer', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    const frame = (delta: unknown, reason: string | null) =>
      `data: ${JSON.stringify({ id: 'widget-test', object: 'chat.completion.chunk', created: 1, model: 'openai/test', choices: [{ index: 0, delta, finish_reason: reason }] })}\n\n`;
    const body = calls % 2 === 1
      ? frame({ role: 'assistant', tool_calls: [{ index: 0, id: `widget-call-${calls}`, type: 'function', function: { name: 'presentWidget', arguments: JSON.stringify({ card: 'costs', visible: calls === 1 }) } }] }, null) + frame({}, 'tool_calls')
      : modelFrame('{"expression":{"emotion":"calm","intensity":0.3},"text":"已显示费用。"}') + frame({}, 'stop');
    return new Response(body + 'data: [DONE]\n\n', { headers: { 'Content-Type': 'text/event-stream' } });
  };
  try {
    const sessionId = store.session(), turnId = nanoid();
    const events: any[] = [];
    await readEvents(await chat({ sessionId, turnId, text: '显示费用', model: 'openai/test' }, new AbortController().signal), e => events.push(e));
    assert.deepEqual(events.find(e => e.type === 'card.open'), { type: 'card.open', sessionId, turnId, card: 'costs' });
    assert.ok(events.findIndex(e => e.type === 'card.open') < events.findIndex(e => e.type === 'message.completed'));
    assert.equal(events.at(-1).message.status, 'complete');
    const hidden: any[] = [];
    await readEvents(await chat({ sessionId, turnId: nanoid(), text: '隐藏费用', model: 'openai/test' }, new AbortController().signal), e => hidden.push(e));
    const shownInstance = events.find(e => e.type === 'widget.snapshot').instance;
    const hiddenInstance = hidden.find(e => e.type === 'widget.snapshot').instance;
    assert.equal(hiddenInstance.visible, false);
    assert.equal(hiddenInstance.instanceId, shownInstance.instanceId);
    assert.equal(hidden.some(e => e.type === 'card.open'), false);
  } finally { globalThis.fetch = original; }
});

test('video search delivers resource and visible card in tool result', async () => {
  const original = globalThis.fetch, key = process.env.DATA_MCP_URL;
  process.env.DATA_MCP_URL = 'http://127.0.0.1:4120/mcp';
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    if (String(url).includes('127.0.0.1:4120')) {
      const request = JSON.parse(String(init?.body ?? '{}'));
      if (request.id === undefined) return new Response(null, { status: 202 });
      const result = request.method === 'initialize'
        ? { protocolVersion: '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'fixture', version: '1' } }
        : request.method === 'tools/list'
        ? { tools: [{ name: 'youtube_search', inputSchema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number' } }, required: ['query'] } }] }
        : { content: [{ type: 'text', text: JSON.stringify({ ok: true, items: [{ title: 'Jazz', author: 'Music', url: null, published_at: null, raw: { id: 'BagZ55ac4xs', view_count: 42 } }] }) }] };
      return Response.json({ jsonrpc: '2.0', id: request.id, result });
    }
    calls++;
    if (calls === 2) {
      const request = JSON.parse(String(init?.body));
      const output = request.messages.find((message: { role: string }) => message.role === 'tool').content;
      assert.match(output, /Jazz/);
      assert.doesNotMatch(output, /thumbnail|instanceId|resourceId|revision/);
    }
    const frame = (delta: unknown, reason: string | null) => `data: ${JSON.stringify({ id: 'video-test', object: 'chat.completion.chunk', created: 1, model: 'openai/test', choices: [{ index: 0, delta, finish_reason: reason }] })}\n\n`;
    const content = calls === 1 ? frame({ role: 'assistant', tool_calls: [{ index: 0, id: 'video-call', type: 'function', function: { name: 'searchYouTube', arguments: '{"query":"jazz"}' } }] }, null) + frame({}, 'tool_calls') : modelFrame('{"expression":{"emotion":"calm","intensity":0.3},"text":"找到了。"}') + frame({}, 'stop');
    return new Response(content + 'data: [DONE]\n\n', { headers: { 'Content-Type': 'text/event-stream' } });
  };
  try {
    const events: any[] = [];
    await readEvents(await chat({ sessionId: store.session(), turnId: nanoid(), text: '搜索爵士视频', model: 'openai/test' }, new AbortController().signal), event => events.push(event));
    assert.equal(events.find(event => event.type === 'widget.snapshot')?.instance.widgetType, 'youtube.video');
    assert.equal(events.find(event => event.type === 'resource.snapshot')?.resource.data.videos[0].title, 'Jazz');
    assert.equal(events.find(event => event.type === 'card.open')?.card, 'video');
    assert.ok(events.findIndex(event => event.type === 'card.open') > events.findIndex(event => event.type === 'widget.snapshot'));
    assert.equal(events.at(-1).message.status, 'complete');
  } finally { globalThis.fetch = original; if (key === undefined) delete process.env.DATA_MCP_URL; else process.env.DATA_MCP_URL = key; }
});

test.after(async () => {
  const { joeMemory, mastraStorage } = await import('../src/joe/memory');
  await joeMemory.settled();
  await mastra.observability.shutdown();
  await mastraStorage.close();
  store.db.close();
  rmSync(directory, { recursive: true, force: true });
});
