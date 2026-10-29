import { nanoid } from 'nanoid';
import type { WatchData } from '../../../../shared/widget-behavior';
import { WatchMeasurement, type PlaybackSample } from './watch-measurement';

export function createWatchRecorder(videoId: string, write: (id: string, revision: number, value: WatchData) => void,
  timestamp = () => new Date().toISOString()) {
  let measurement = new WatchMeasurement();
  let id = nanoid(), revision = 0, startedAt = timestamp(), savedDuration = 0;
  function checkpoint(final = false) {
    if (measurement.playedDurationMs <= 0 || (!final && savedDuration === measurement.playedDurationMs)) return;
    savedDuration = measurement.playedDurationMs;
    write(id, ++revision, { provider: 'youtube', videoId, startedAt, endedAt: final ? timestamp() : null,
      playedDurationMs: measurement.playedDurationMs, videoDurationMs: measurement.videoDurationMs,
      coveredRangesMs: measurement.coveredRangesMs.map(([a, b]) => [a, b]), measurementVersion: 1,
      completeness: final ? 'final' : 'partial' });
  }
  return {
    sample(value: PlaybackSample) { measurement.sample(value); if (revision === 0) checkpoint(); },
    interrupt() { measurement.interrupt(); checkpoint(); },
    checkpoint,
    finish() {
      measurement.interrupt(); checkpoint(true);
      measurement = new WatchMeasurement(); id = nanoid(); revision = 0; savedDuration = 0; startedAt = timestamp();
    },
  };
}
