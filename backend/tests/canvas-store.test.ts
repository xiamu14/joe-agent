import { editCanvas } from '../src/joe/canvas-tool';
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { nanoid } from 'nanoid';
import { WidgetStore } from '../src/joe/widget-store';
import { CanvasStore } from '../src/joe/canvas-store';

function setup() {
  const db = new DatabaseSync(':memory:');
  const widgets = new WidgetStore(db), canvases = new CanvasStore(db);
  const id = widgets.createCanvas();
  canvases.bind(nanoid(), 0, id);
  const video = widgets.presentBuiltin(id, 'video');
  const weather = widgets.presentBuiltin(id, 'weather');
  const command = { protocolVersion: 1, type: 'canvas.change', commandId: nanoid(), canvasId: id,
    expectedCanvasRevision: canvases.metadata(id).revision, operations: [
      { type: 'canvas.rename', name: '娱乐间' },
      { type: 'widget.visibility', instanceId: weather.instanceId, expectedRevision: weather.revision, visible: false },
    ] };
  return { db, widgets, canvases, id, video, weather, command };
}

test('canvas batch persists rename and visibility in one event and retries exactly once', () => {
  const { db, widgets, canvases, id, command } = setup();
  const cursor = widgets.snapshot(id).cursor;
  const result = canvases.change(id, command);
  assert.equal(canvases.metadata(id).name, '娱乐间');
  assert.equal(widgets.snapshot(id).instances.find(item => item.widgetType === 'builtin.weather').visible, false);
  assert.equal(widgets.events(id, cursor).length, 1);
  assert.deepEqual(canvases.change(id, command), result);
  assert.equal(widgets.events(id, cursor).length, 1);
  assert.throws(() => canvases.change(id, { ...command, operations: [{ type: 'canvas.rename', name: '其他' }] }), /命令 ID/);
  assert.equal(new CanvasStore(db).metadata(id).name, '娱乐间');
  db.close();
});

test('failed batch rolls back rename, revisions and events', () => {
  const { db, widgets, canvases, id, command } = setup();
  const before = canvases.metadata(id), cursor = widgets.snapshot(id).cursor;
  const bad = { ...command, operations: [...command.operations, { type: 'widget.visibility', instanceId: nanoid(), expectedRevision: 1, visible: false }] };
  assert.throws(() => canvases.change(id, bad), /不存在/);
  assert.deepEqual(canvases.metadata(id), before);
  assert.equal(widgets.snapshot(id).instances.every(item => item.visible), true);
  assert.equal(widgets.events(id, cursor).length, 0);
  db.close();
});

test('legacy visibility and membership writes invalidate stale canvas commands', () => {
  const { db, widgets, canvases, id, command } = setup();
  widgets.presentBuiltin(id, 'settings');
  assert.throws(() => canvases.change(id, command), /版本冲突/);
  const fresh = { ...command, expectedCanvasRevision: canvases.metadata(id).revision };
  widgets.presentBuiltin(id, 'video', false);
  assert.throws(() => canvases.change(id, fresh), /版本冲突/);
  db.close();
});

test('directory preserves migrated IDs and excludes other workspaces', () => {
  const { db, widgets, canvases, id, command } = setup();
  const other = widgets.createCanvas();
  canvases.bind(nanoid(), 0, other);
  assert.deepEqual(canvases.directory(id).map(item => item.id), [id]);
  assert.throws(() => canvases.change(id, { ...command, canvasId: other }), /当前工作区/);
  const workspace = nanoid();
  assert.throws(() => canvases.bind(workspace, 1, other), /UNIQUE/);
  db.close();
});


test('retain restores video, preserves content and rejects missing cards atomically', () => {
  const { db, widgets, canvases, id } = setup();
  widgets.presentBuiltin(id, 'video', false);
  const apply = (changes: Extract<Parameters<typeof editCanvas>[1], { mode: 'apply' }>['changes']) =>
    editCanvas(id, { mode: 'apply', changes }, canvases, widgets);
  const result = apply([{ type: 'canvas.rename', name: '娱乐间' }, { type: 'widget.retain', selector: { widgetType: 'youtube.video' } }]);
  assert.equal(result.status, 'applied');
  assert.equal(widgets.snapshot(id).instances.find(item => item.widgetType === 'youtube.video').visible, true);
  assert.equal(widgets.snapshot(id).instances.find(item => item.widgetType === 'builtin.weather').visible, false);
  const before = canvases.metadata(id);
  assert.equal(apply([{ type: 'canvas.rename', name: '失败' }, { type: 'widget.retain', selector: { widgetType: 'builtin.costs' } }]).status, 'rejected');
  assert.deepEqual(canvases.metadata(id), before);
  assert.equal(apply([{ type: 'canvas.rename', name: '娱乐间' }]).status, 'unchanged');
  assert.equal(editCanvas(id, { mode: 'apply', target: { name: '不存在' }, changes: [{ type: 'canvas.rename', name: '新名字' }] }, canvases, widgets).status, 'needs_clarification');
  db.close();
});
