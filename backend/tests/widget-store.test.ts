import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { nanoid } from 'nanoid';
import { WidgetStore } from '../src/joe/widget-store';

test('widget commands are durable, idempotent and reject stale revisions', () => {
  const db = new DatabaseSync(':memory:');
  const widgets = new WidgetStore(db);
  const canvasId = widgets.createCanvas(), instanceId = nanoid();
  const command = { protocolVersion: 1, commandId: nanoid(), canvasId, instanceId, expectedRevision: 0, type: 'widget.present', widgetType: 'builtin.costs', bindings: {}, view: { kind: 'registered', name: 'costs', version: 1 } };
  const first = widgets.command(command);
  assert.deepEqual(widgets.command(command), first);
  assert.throws(() => widgets.command({ ...command, widgetType: 'builtin.settings' }), /命令 ID/);
  assert.throws(() => widgets.command({ ...command, commandId: nanoid() }), /版本冲突/);
  widgets.command({ protocolVersion: 1, commandId: nanoid(), canvasId, instanceId, expectedRevision: 1, type: 'widget.visibility', visible: false });
  assert.equal(widgets.snapshot(canvasId).instances[0].visible, false);
  assert.equal(widgets.events(canvasId, Number(first.cursor)).length, 1);
  assert.throws(() => widgets.command({ ...command, commandId: nanoid(), instanceId: nanoid(), view: { kind: 'registered', name: 'unknown', version: 1 } }), /模板无效/);
  db.close();
});

test('session canvas and presented card retain identity across store instances', () => {
  const db = new DatabaseSync(':memory:');
  const widgets = new WidgetStore(db);
  const canvasId = widgets.canvasForSession('session');
  const first = widgets.presentBuiltin(canvasId, 'costs');
  const reloaded = new WidgetStore(db);
  assert.equal(reloaded.canvasForSession('session'), canvasId);
  assert.equal(reloaded.presentBuiltin(canvasId, 'costs').instanceId, first.instanceId);
  assert.equal(reloaded.snapshot(canvasId).instances.length, 1);
  db.close();
});

test('resource updates publish ordered snapshots without changing instance revisions', () => {
  const db = new DatabaseSync(':memory:');
  const widgets = new WidgetStore(db), canvasId = widgets.createCanvas(), resourceId = nanoid();
  const data = { configured: true, place: 'Tokyo', temperature: 22, condition: 'Cloudy', conditionCode: 1003, isDay: true, timezone: 'Asia/Tokyo', updatedAt: 1000 };
  const first = widgets.putResource(canvasId, resourceId, 'weather@1', data);
  const instanceId = nanoid();
  widgets.command({ protocolVersion: 1, commandId: nanoid(), canvasId, instanceId, expectedRevision: 0, type: 'widget.present', widgetType: 'builtin.weather', bindings: { weather: { resourceId, pointer: '' } }, view: { kind: 'registered', name: 'weather', version: 1 } });
  widgets.putResource(canvasId, resourceId, 'weather@1', { ...data, temperature: 23 });
  const snapshot = widgets.snapshot(canvasId);
  assert.equal(snapshot.instances[0].revision, 1);
  assert.equal(snapshot.resources[0].revision, 2);
  assert.equal(snapshot.resources[0].data.temperature, 23);
  assert.equal(widgets.events(canvasId, Number(first.cursor)).length, 2);
  assert.throws(() => widgets.putResource(canvasId, resourceId, 'weather@1', { ...data, temperature: 'bad' }));
  assert.equal(widgets.snapshot(canvasId).resources[0].revision, 2);
  db.close();
});

test('event stream resumes after the supplied cursor', async () => {
  const { widgetEventStream } = await import('../src/joe/widget-events');
  const db = new DatabaseSync(':memory:');
  const widgets = new WidgetStore(db), canvasId = widgets.createCanvas();
  const one = widgets.presentBuiltin(canvasId, 'costs');
  const cursor = widgets.snapshot(canvasId).cursor;
  widgets.presentBuiltin(canvasId, 'settings');
  const abort = new AbortController();
  const response = widgetEventStream(widgets, canvasId, cursor, abort.signal);
  const reader = response.body!.getReader();
  const chunk = new TextDecoder().decode((await reader.read()).value);
  assert.match(chunk, /event: widget/);
  assert.match(chunk, /builtin.settings/);
  assert.doesNotMatch(chunk, new RegExp(one.instanceId));
  abort.abort();
  await reader.cancel();
  db.close();
});

test('built-in visibility reuses the instance and preserves its hidden state', () => {
  const db = new DatabaseSync(':memory:');
  const widgets = new WidgetStore(db), canvas = widgets.createCanvas();
  for (const card of ['costs', 'settings', 'weather', 'video'] as const) {
    const hidden = widgets.presentBuiltin(canvas, card, false);
    assert.equal(hidden.visible, false);
    const shown = widgets.presentBuiltin(canvas, card, true);
    assert.equal(shown.instanceId, hidden.instanceId);
    assert.equal(shown.revision, hidden.revision + 1);
    assert.equal(widgets.presentBuiltin(canvas, card, true).revision, shown.revision);
    const again = widgets.presentBuiltin(canvas, card, false);
    assert.equal(again.instanceId, hidden.instanceId);
    assert.equal(again.visible, false);
  }
  assert.equal(new WidgetStore(db).snapshot(canvas).instances.filter(instance => !instance.visible).length, 4);
  db.close();
});

test('weather query binds a resource and rejects a result after visibility changed', () => {
  const db = new DatabaseSync(':memory:');
  const widgets = new WidgetStore(db), canvas = widgets.createCanvas();
  const data = { configured: true, place: 'Tokyo', temperature: 22, condition: 'Cloudy', conditionCode: 1003, isDay: true, timezone: 'Asia/Tokyo', updatedAt: 1000 };
  const first = widgets.presentData(canvas, 'weather', data, 0);
  assert.equal(widgets.snapshot(canvas).resources[0].resourceId, first.bindings.data.resourceId);
  widgets.presentBuiltin(canvas, 'weather', false);
  assert.throws(() => widgets.presentData(canvas, 'weather', { ...data, place: 'Osaka' }, first.revision), /已更改/);
  assert.equal(widgets.snapshot(canvas).resources[0].data.place, 'Tokyo');
  assert.equal(widgets.snapshot(canvas).instances[0].visible, false);
  db.close();
});

test('video search updates preserve instance and resource identities', () => {
  const db = new DatabaseSync(':memory:');
  const widgets = new WidgetStore(db), canvas = widgets.createCanvas();
  const data = { query: 'jazz', videos: [{ id: 'BagZ55ac4xs', title: 'Jazz', channel: 'Music', thumbnail: 'https://i.ytimg.com/vi/BagZ55ac4xs/hqdefault.jpg' }] };
  const first = widgets.presentData(canvas, 'video', data, 0);
  const second = widgets.presentData(canvas, 'video', { ...data, query: 'piano' }, first.revision);
  assert.equal(second.instanceId, first.instanceId);
  assert.equal(second.bindings.data.resourceId, first.bindings.data.resourceId);
  assert.equal(widgets.snapshot(canvas).resources[0].revision, 2);
  assert.equal(widgets.snapshot(canvas).resources[0].data.query, 'piano');
  db.close();
});

test('initial canvas state is persisted once and never reopens hidden cards', () => {
  const db = new DatabaseSync(':memory:');
  const widgets = new WidgetStore(db), canvas = widgets.createCanvas();
  widgets.initializeCanvas(canvas, ['weather', 'costs']);
  const weather = widgets.presentBuiltin(canvas, 'weather', false);
  widgets.initializeCanvas(canvas, ['weather', 'costs', 'settings']);
  const items = widgets.snapshot(canvas).instances;
  assert.equal(items.length, 2);
  assert.equal(items.find(item => item.widgetType === 'builtin.weather').visible, false);
  assert.equal(items.find(item => item.widgetType === 'builtin.weather').instanceId, weather.instanceId);
  const other = widgets.createCanvas();
  widgets.initializeCanvas(other, []);
  assert.equal(widgets.snapshot(other).instances.length, 0);
  db.close();
});
