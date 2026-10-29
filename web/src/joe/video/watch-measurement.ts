import { mergeRanges, type ContentRange } from '../../../../shared/widget-behavior';
export type PlaybackSample = { now: number; positionMs: number; durationMs: number; rate: number; playing: boolean };

export class WatchMeasurement {
  playedDurationMs = 0;
  videoDurationMs: number | null = null;
  coveredRangesMs: ContentRange[] = [];
  private previous: PlaybackSample | null = null;
  sample(value: PlaybackSample) {
    if (![value.now, value.positionMs, value.rate].every(Number.isFinite) || value.positionMs < 0 || value.rate <= 0) {
      this.previous = null; return;
    }
    if (this.videoDurationMs === null && Number.isFinite(value.durationMs) && value.durationMs > 0 &&
      this.coveredRangesMs.every(([, end]) => end <= value.durationMs)) this.videoDurationMs = value.durationMs;
    const old = this.previous;
    this.previous = value.playing ? value : null;
    if (!old || !value.playing) return;
    const elapsed = value.now - old.now, advance = value.positionMs - old.positionMs;
    // Never bridge timer throttling, buffering, seeking or a playback-rate transition.
    if (elapsed <= 0 || elapsed > 1500 || advance <= 0 || value.rate !== old.rate ||
      Math.abs(advance - elapsed * old.rate) > Math.max(100, elapsed * old.rate * 0.2)) return;
    const end = this.videoDurationMs === null ? value.positionMs : Math.min(value.positionMs, this.videoDurationMs);
    if (end <= old.positionMs) return;
    this.playedDurationMs += Math.min(elapsed, advance / old.rate);
    this.coveredRangesMs = mergeRanges([...this.coveredRangesMs, [old.positionMs, end]]);
  }
  interrupt() { this.previous = null; }
}
