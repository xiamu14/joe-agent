import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { nanoid } from 'nanoid';
import { WidgetStore } from '../src/joe/widget-store';
import { BehaviorStore } from '../src/joe/behavior-store';
import { videoBehavior, summarizeWatches } from '../src/joe/video-behavior';
import { videoBehaviorDefinition, type WatchData, type BehaviorSubmission } from '../../shared/widget-behavior';

function fixture() {
  const db = new DatabaseSync(':memory:');
  const widgets = new WidgetStore(db), sessionId = nanoid();
  const canvasId = widgets.canvasForSession(sessionId);
  const instance = widgets.presentBuiltin(canvasId, 'video');
  const store = new BehaviorStore(db, [videoBehavior]);
  const payload: WatchData = { provider: 'youtube', videoId: 'BagZ55ac4xs',
    startedAt: '2026-10-29T00:00:00.000Z', endedAt: null, completeness: 'partial', measurementVersion: 1,
    playedDurationMs: 1000, videoDurationMs: 10000, coveredRangesMs: [[0, 1000]] };
  const input: BehaviorSubmission = { sessionId, event: {
    behaviorProtocolVersion: 1, eventId: nanoid(), recordId: nanoid(), revision: 1,
    widgetType: videoBehaviorDefinition.widgetType, widgetVersion: 1, definitionVersion: 1, policyVersion: 1,
    eventName: videoBehaviorDefinition.eventName, occurredAt: payload.startedAt,
    trigger: 'directInteraction', canvasId, instanceId: instance.instanceId, payload } };
  const next = () => ({ ...input, event: { ...input.event, eventId: nanoid(), revision: 2,
    payload: { ...payload, playedDurationMs: 2000, coveredRangesMs: [[0, 2000]] as [number, number][] } } });
  return { db, widgets, store, input, payload, next };
}
test('durable checkpoints are idempotent and summaries never add checkpoint totals', () => {
  const f = fixture();
  const ack = f.store.accept(f.input, 'user');
  assert.deepEqual(f.store.accept(f.input, 'user'), ack);
  f.store.accept(f.next(), 'user');
  const reloaded = new BehaviorStore(f.db, [videoBehavior]);
  const records = reloaded.records('user');
  assert.equal(records.length, 1);
  const summary = summarizeWatches(records.map(r => r.payload as WatchData));
  assert.equal(summary[0].playedDurationMs, 2000);
  assert.equal(summary[0].completionRatio, 0.2);
  assert.equal(reloaded.records('other').length, 0);
  assert.throws(() => f.store.accept({ ...f.input, event: { ...f.input.event, occurredAt: '2026-10-30T00:00:00.000Z' } }, 'user'), /事件 ID/);
  f.db.close();
});
test('out-of-order checkpoints cannot regress the current record', () => {
  const f = fixture();
  f.store.accept(f.next(), 'user');
  f.store.accept(f.input, 'user');
  assert.equal(f.store.records('user')[0].revision, 2);
  f.db.close();
});
test('rejects unknown definitions, forged contexts, agent claims, extra data and invalid intervals', () => {
  const f = fixture();
  const attempt = (event: object) => f.store.accept({ ...f.input, event: { ...f.input.event, ...event } }, 'user');
  assert.throws(() => attempt({ eventName: 'widget.closed' }), /未注册/);
  assert.throws(() => attempt({ canvasId: f.widgets.createCanvas() }), /不属于/);
  assert.throws(() => attempt({ instanceId: nanoid() }), /不属于/);
  assert.throws(() => attempt({ trigger: 'userInstruction' }), /未经验证/);
  assert.throws(() => attempt({ payload: { ...f.payload, query: 'private search' } }));
  assert.throws(() => attempt({ payload: { ...f.payload, playedDurationMs: 0 } }));
  assert.throws(() => attempt({ payload: { ...f.payload, coveredRangesMs: [[0, 1000], [500, 2000]] } }));
  f.db.close();
});
test('immutable watch identity and final snapshots cannot be changed', () => {
  const f = fixture();
  f.store.accept(f.input, 'user');
  const next = f.next();
  assert.throws(() => f.store.accept({ ...next, event: { ...next.event, payload: { ...next.event.payload, videoId: 'abcdefghijk' } } }, 'user'), /身份/);
  f.store.accept({ ...next, event: { ...next.event, payload: { ...next.event.payload, completeness: 'final', endedAt: '2026-10-29T00:01:00.000Z' } } }, 'user');
  assert.throws(() => f.store.accept({ ...next, event: { ...next.event, eventId: nanoid(), revision: 3 } }, 'user'), /回退/);
  f.db.close();
});
test('cross-watch coverage unions repeated fragments and rejects incompatible durations in summary', () => {
  const f = fixture();
  const repeated = { ...f.payload, playedDurationMs: 2000 };
  const summary = summarizeWatches([f.payload, repeated])[0];
  assert.equal(summary.playedDurationMs, 3000);
  assert.equal(summary.completionRatio, 0.1);
  assert.equal(summarizeWatches([f.payload, { ...repeated, videoDurationMs: 20000 }])[0].completionRatio, null);
  f.db.close();
});
