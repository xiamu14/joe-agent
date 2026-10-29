import { test, expect } from 'bun:test';
import { WatchMeasurement } from '../src/joe/video/watch-measurement';
import { createWatchRecorder } from '../src/joe/video/watch-recorder';
import { coverage, type WatchData } from '../../shared/widget-behavior';

const sample = (now: number, positionMs: number, rate = 1, playing = true) => ({ now, positionMs, rate, playing, durationMs: 10000 });
test('replaying content adds time but does not duplicate coverage; speed uses content progress', () => {
  const m = new WatchMeasurement();
  m.sample(sample(0, 0)); m.sample(sample(1000, 1000));
  m.sample(sample(1100, 0)); m.sample(sample(2100, 1000));
  expect(m.playedDurationMs).toBe(2000);
  expect(coverage(m.coveredRangesMs, m.videoDurationMs)).toBe(0.1);
  m.interrupt(); m.sample(sample(3000, 1000, 2)); m.sample(sample(4000, 3000, 2));
  expect(m.playedDurationMs).toBe(3000);
  expect(coverage(m.coveredRangesMs, m.videoDurationMs)).toBe(0.3);
});
test('seek, stall, pause and background timer gaps never fill unobserved content', () => {
  const m = new WatchMeasurement();
  m.sample(sample(0, 0)); m.sample(sample(250, 7000));
  expect(m.playedDurationMs).toBe(0);
  m.sample(sample(500, 7250)); m.sample(sample(750, 7250));
  expect(m.playedDurationMs).toBe(250);
  m.sample(sample(900, 7250, 1, false)); m.sample(sample(5000, 9000));
  m.sample(sample(10000, 9500));
  expect(m.coveredRangesMs).toEqual([[7000, 7250]]);
});
test('failed starts do not persist; short real playback persists and resumes same watch', () => {
  const writes: { id: string; revision: number; value: WatchData }[] = [];
  const recorder = createWatchRecorder('BagZ55ac4xs', (id, revision, value) => writes.push({ id, revision, value }));
  recorder.checkpoint(); recorder.interrupt();
  expect(writes).toHaveLength(0);
  recorder.sample(sample(0, 0)); recorder.sample(sample(250, 250)); recorder.interrupt();
  expect(writes[0].value.playedDurationMs).toBe(250);
  recorder.sample(sample(5000, 250)); recorder.sample(sample(5250, 500)); recorder.finish();
  expect(writes).toHaveLength(2);
  expect(writes[1].id).toBe(writes[0].id);
  expect(writes[1].revision).toBe(2);
  expect(writes[1].value.completeness).toBe('final');
  expect(writes[1].value.playedDurationMs).toBe(500);
  recorder.finish(); expect(writes).toHaveLength(2);
  recorder.sample(sample(6000, 500)); recorder.sample(sample(6250, 750)); recorder.checkpoint();
  expect(writes[2].id).not.toBe(writes[0].id);
});
test('unknown video duration remains unknown while confirmed play can be retained', () => {
  const m = new WatchMeasurement();
  m.sample({ ...sample(0, 0), durationMs: 0 }); m.sample({ ...sample(250, 250), durationMs: 0 });
  expect(m.playedDurationMs).toBe(250);
  expect(coverage(m.coveredRangesMs, m.videoDurationMs)).toBeNull();
});
