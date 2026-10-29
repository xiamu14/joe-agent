import test from 'node:test';
import assert from 'node:assert/strict';
import { searchVideoData } from '../src/joe/data-mcp';

const items = [{ title: 'Jazz', author: 'Music', url: null, published_at: null,
  raw: { id: 'BagZ55ac4xs', view_count: 42, duration: 60 } }];
const tool = { name: 'youtube_search', inputSchema: { type: 'object',
  properties: { query: { type: 'string' }, limit: { type: 'integer' } }, required: ['query'] } };

test('MCP discovers only the requested search, preserves auth and accepts both result formats', async t => {
  const endpoint = process.env.DATA_MCP_URL, token = process.env.DATA_MCP_TOKEN;
  process.env.DATA_MCP_URL = 'http://127.0.0.1:4120/mcp';
  process.env.DATA_MCP_TOKEN = 'fixture-token';
  t.after(() => {
    if (endpoint === undefined) delete process.env.DATA_MCP_URL; else process.env.DATA_MCP_URL = endpoint;
    if (token === undefined) delete process.env.DATA_MCP_TOKEN; else process.env.DATA_MCP_TOKEN = token;
  });
  let mode = 'text';
  const methods: string[] = [];
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => {
    assert.equal(new Headers(init.headers).get('authorization'), 'Bearer fixture-token');
    if (init.method === 'DELETE') return new Response(null, { status: 204 });
    if (init.method === 'GET') return new Response(null, { status: 405 });
    const request = JSON.parse(String(init.body));
    methods.push(request.method);
    if (request.id === undefined) return new Response(null, { status: 202 });
    let result: unknown;
    if (request.method === 'initialize') result = { protocolVersion: '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'fixture', version: '1' } };
    else if (request.method === 'tools/list') result = { tools: mode === 'missing' ? [] : [tool, { ...tool, name: 'youtube_get_subtitles' }] };
    else {
      assert.equal(request.method, 'tools/call');
      assert.deepEqual(request.params.arguments, { query: 'jazz', limit: 10 });
      assert.equal(request.params.name, 'youtube_search');
      result = mode === 'error' ? { isError: true, content: [{ type: 'text', text: 'private-provider-error' }] }
        : mode === 'malformed' ? { content: [{ type: 'text', text: '{}' }] }
        : { content: [{ type: 'text', text: JSON.stringify({ ok: true, items }) }],
          ...(mode === 'structured' ? { structuredContent: { ok: true, items } } : {}) };
    }
    return Response.json({ jsonrpc: '2.0', id: request.id, result });
  });
  const videos = await searchVideoData('jazz');
  assert.equal(videos[0].title, 'Jazz');
  assert.equal(videos[0].views, 42);
  mode = 'structured';
  assert.deepEqual(await searchVideoData('jazz'), videos);
  assert.ok(methods.includes('tools/list'));
  mode = 'error';
  await assert.rejects(searchVideoData('jazz'), /^Error: 视频搜索暂不可用$/);
  mode = 'missing';
  await assert.rejects(searchVideoData('jazz'), /视频搜索工具暂不可用/);
  mode = 'malformed';
  await assert.rejects(searchVideoData('jazz'));
});

test('MCP cancellation interrupts discovery and calls, and pre-aborted work never connects', async t => {
  const endpoint = process.env.DATA_MCP_URL;
  process.env.DATA_MCP_URL = 'http://127.0.0.1:4120/mcp';
  t.after(() => { if (endpoint === undefined) delete process.env.DATA_MCP_URL; else process.env.DATA_MCP_URL = endpoint; });
  for (const phase of ['initialize', 'tools/call']) {
    const controller = new AbortController();
    let reached!: () => void;
    const started = new Promise<void>(resolve => { reached = resolve; });
    const mock = t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => {
      const request = JSON.parse(String(init.body));
      if (request.id === undefined) return new Response(null, { status: 202 });
      if (request.method === phase) {
        reached();
        return new Promise<Response>((_resolve, reject) => {
          init.signal!.addEventListener('abort', () => reject(init.signal!.reason), { once: true });
        });
      }
      const result = request.method === 'initialize'
        ? { protocolVersion: '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'fixture', version: '1' } }
        : { tools: [tool] };
      return Response.json({ jsonrpc: '2.0', id: request.id, result });
    });
    const pending = searchVideoData('jazz', controller.signal);
    await started;
    const rejected = assert.rejects(pending);
    controller.abort();
    await rejected;
    mock.mock.restore();
  }
  t.mock.method(globalThis, 'fetch', () => assert.fail('must not connect'));
  await assert.rejects(searchVideoData('jazz', AbortSignal.abort()), { name: 'AbortError' });
});
