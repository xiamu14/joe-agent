import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { RequestContext } from '@mastra/core/request-context';
import { WidgetStore } from '../src/joe/widget-store';
import { playYouTube } from '../src/joe/video-play-tool';
import { uniqueTitleMatch, videoFromLink } from '../src/joe/video-target';

const id = 'XWdrTHssIUQ';
const video = { id, title: 'Example title', channel: 'Channel', thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` };
test('links and share text resolve the same video without trusting other hosts', () => {
  for (const link of [
    `https://www.youtube.com/watch?v=${id}&list=abc`, `https://youtu.be/${id}?si=123`,
    `https://m.youtube.com/shorts/${id}`, `https://www.youtube.com/embed/${id}`,
    `https://www.youtube.com/live/${id}`, `分享视频：标题（https://youtu.be/${id}）。`,
  ]) assert.equal(videoFromLink(link)?.id, id);
  for (const link of [`https://youtube.com.evil.test/watch?v=${id}`, `https://evil.test/${id}`, 'https://youtu.be/bad',
    `https://youtu.be/${id} https://youtu.be/jNQXAC9IVRw`, 'https://www.youtube.com/playlist?list=abc']) {
    assert.equal(videoFromLink(link), undefined);
  }
});
test('titles require a unique exact match, not simply a single result', () => {
  assert.equal(uniqueTitleMatch(' EXAMPLE   TITLE ', [video])?.id, id);
  assert.equal(uniqueTitleMatch('Example', [video]), undefined);
  assert.equal(uniqueTitleMatch(video.title, [video, { ...video, id: 'jNQXAC9IVRw' }]), undefined);
  assert.equal(uniqueTitleMatch(video.title, [video, video])?.id, id);
});
test('direct playback retains persisted search results and bindings without calling search', async t => {
  t.mock.method(globalThis, 'fetch', () => assert.fail('direct links must not search'));
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  const store = new WidgetStore(db);
  const canvas = store.createCanvas();
  const initial = store.presentData(canvas, 'video', { query: 'old search', videos: [video] }, 0);
  const before = store.snapshot(canvas).resources;
  const requestContext = new RequestContext();
  requestContext.set('video.begin', () => assert.fail('direct playback must not replace search data'));
  requestContext.set('widget.present', (card: 'video', visible: boolean) => store.presentBuiltin(canvas, card, visible));
  const result = await playYouTube.execute!({ query: `https://youtu.be/${id}` }, { requestContext } as never);
  assert.equal(result.error, undefined);
  if ('error' in result) assert.fail('play failed');
  assert.equal(result.playback?.video.id, id);
  assert.match(result.playback!.requestId, /^[\w-]{21}$/);
  assert.deepEqual(result.instance.bindings, initial.bindings);
  assert.deepEqual(store.snapshot(canvas).resources, before);
  assert.equal(result.widget, undefined);
  // Hidden cards reopen with the same search resource.
  store.presentBuiltin(canvas, 'video', false);
  const reopened = await playYouTube.execute!({ query: `https://youtu.be/${id}` }, { requestContext } as never);
  assert.equal(reopened.error, undefined);
  if ('error' in reopened) assert.fail('play failed');
  assert.equal(reopened.instance.visible, true);
  assert.deepEqual(store.snapshot(canvas).resources, before);
  assert.notEqual(reopened.playback?.requestId, result.playback?.requestId);
});
test('malformed playback capabilities fail before network or mutation', async t => {
  t.mock.method(globalThis, 'fetch', () => assert.fail('must not reach services'));
  const requestContext = new RequestContext();
  requestContext.set('video.begin', 'invalid');
  requestContext.set('widget.present', () => assert.fail('must not mutate'));
  const result = await playYouTube.execute!({ query: `https://youtu.be/${id}` }, { requestContext } as never);
  assert.equal(result.error, true);
});
test('title resolution preserves search on exact match and publishes ambiguous candidates', async t => {
  const endpoint = process.env.DATA_MCP_URL;
  process.env.DATA_MCP_URL = 'http://127.0.0.1:4120/mcp';
  t.after(() => { if (endpoint === undefined) delete process.env.DATA_MCP_URL; else process.env.DATA_MCP_URL = endpoint; });
  let candidates = [video];
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => {
    const request = JSON.parse(String(init.body));
    if (request.id === undefined) return new Response(null, { status: 202 });
    const result = request.method === 'initialize'
      ? { protocolVersion: '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'fixture', version: '1' } }
      : request.method === 'tools/list'
        ? { tools: [{ name: 'youtube_search', inputSchema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'integer' } }, required: ['query'] } }] }
        : { ok: true, items: candidates.map(item => ({ title: item.title, author: item.channel, url: null, published_at: null, raw: { id: item.id } })) };
    return Response.json({ jsonrpc: '2.0', id: request.id, result });
  });
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  const store = new WidgetStore(db), canvas = store.createCanvas();
  store.presentData(canvas, 'video', { query: 'original', videos: [video] }, 0);
  const original = store.snapshot(canvas).resources;
  const requestContext = new RequestContext();
  requestContext.set('widget.present', (card: 'video', visible: boolean) => store.presentBuiltin(canvas, card, visible));
  requestContext.set('video.begin', () => {
    const revision = store.snapshot(canvas).instances[0].revision;
    return (data: unknown) => {
      const instance = store.presentData(canvas, 'video', data, revision);
      return { instance, resource: store.snapshot(canvas).resources[0] };
    };
  });
  const resolved = await playYouTube.execute!({ query: video.title }, { requestContext } as never);
  if ('error' in resolved) assert.fail(JSON.stringify(resolved));
  assert.equal(resolved.playback?.video.id, id);
  assert.equal(resolved.widget, undefined);
  assert.deepEqual(store.snapshot(canvas).resources, original);
  candidates = [video, { ...video, id: 'jNQXAC9IVRw' }];
  const ambiguous = await playYouTube.execute!({ query: video.title }, { requestContext } as never);
  if ('error' in ambiguous) assert.fail(JSON.stringify(ambiguous));
  assert.equal(ambiguous.playback, undefined);
  assert.equal(ambiguous.widget?.resource.schema, 'youtube.search@1');
  assert.equal(store.snapshot(canvas).resources[0].data.videos.length, 2);
});
