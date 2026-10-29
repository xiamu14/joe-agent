import test from 'node:test';
import assert from 'node:assert/strict';
import { nanoid } from 'nanoid';
import { RequestContext } from '@mastra/core/request-context';
import { getWeather } from '../src/joe/weather-tool';
import { searchYouTube } from '../src/joe/youtube-tool';
import { presentWidget } from '../src/joe/widget-tool';
import { controlDesktop } from '../src/joe/desktop';
import { widgetSnapshotSchema } from '../src/joe/tool-contracts';

test('invalid execution capabilities fail before invoking services or mutating cards', async t => {
  t.mock.method(globalThis, 'fetch', () => assert.fail('invalid context must not reach services'));
  for (const [tool, key, input] of [
    [getWeather, 'weather.begin', { city: 'London' }],
    [searchYouTube, 'video.begin', { query: 'jazz' }],
    [presentWidget, 'widget.present', { card: 'weather', visible: true }],
    [controlDesktop, 'desktop.execute', { action: 'play' }],
  ] as const) {
    const requestContext = new RequestContext();
    requestContext.set(key, 'not-a-function');
    const result = await tool.execute!(input as never, { requestContext } as never);
    assert.equal(result.error, true);
  }
});

test('tool output contracts retain UI payload while model projections omit internal state', () => {
  const instance = { instanceId: nanoid(), widgetType: 'youtube.video' as const, visible: true, revision: 1, bindings: {} };
  const widget = widgetSnapshotSchema.parse({ instance, resource: {
    resourceId: nanoid(), revision: 1, schema: 'youtube.search@1', data: { query: 'jazz', videos: [
      { id: 'BagZ55ac4xs', title: 'Jazz', channel: 'Music', thumbnail: 'https://i.ytimg.com/vi/BagZ55ac4xs/hqdefault.jpg' },
    ] },
  } });
  assert.equal(widget.instance.bindings !== undefined, true);
  const video = searchYouTube.toModelOutput!({ query: 'jazz', count: 1, summary: '已显示', widget });
  assert.match(JSON.stringify(video), /Jazz/);
  assert.doesNotMatch(JSON.stringify(video), /thumbnail|bindings|revision|instanceId|resourceId/);
  const visible = presentWidget.toModelOutput!({ ok: true, card: 'video', instance });
  assert.deepEqual(visible, { type: 'json', value: { ok: true, card: 'video', visible: true } });
  const weather = { configured: true as const, place: 'London', temperature: 20, condition: '晴', conditionCode: 1000, isDay: true, timezone: 'Europe/London', updatedAt: 100 };
  assert.deepEqual(getWeather.toModelOutput!({ ...weather, widget }), { type: 'json', value: weather });
  assert.throws(() => widgetSnapshotSchema.parse({ ...widget, resource: { ...widget.resource, data: { query: 'jazz', videos: [{ id: 'bad' }] } } }));
});
