import { z } from 'zod';
import { coverage, mergeRanges, videoBehaviorDefinition, type WatchData } from '../../../shared/widget-behavior';
import type { BehaviorDefinition } from './behavior-store';

const range = z.tuple([z.number().finite().nonnegative(), z.number().finite().positive()]);
const schema = z.object({
  provider: z.literal('youtube'), videoId: z.string().regex(/^[\w-]{11}$/),
  startedAt: z.string().datetime(), endedAt: z.string().datetime().nullable(),
  playedDurationMs: z.number().finite().positive(), videoDurationMs: z.number().finite().positive().nullable(),
  coveredRangesMs: z.array(range).min(1).max(2000), measurementVersion: z.literal(1),
  completeness: z.enum(['partial', 'final']),
}).strict().superRefine((data, ctx) => {
  const bad = data.coveredRangesMs.some(([a, b], i, ranges) => b <= a || (i > 0 && a <= ranges[i - 1][1]) || (data.videoDurationMs !== null && b > data.videoDurationMs));
  if (bad || (data.completeness === 'final') !== Boolean(data.endedAt) || (data.endedAt && data.endedAt < data.startedAt))
    ctx.addIssue({ code: 'custom', message: '播放区间或结束时间无效' });
});
export const videoBehavior: BehaviorDefinition = {
  ...videoBehaviorDefinition,
  parse: value => schema.parse(value),
  validateTransition(previous, next) {
    const a = previous as WatchData, b = next as WatchData;
    if (a.provider !== b.provider || a.videoId !== b.videoId || a.startedAt !== b.startedAt || a.completeness === 'final' ||
      b.playedDurationMs < a.playedDurationMs || (a.videoDurationMs !== null && a.videoDurationMs !== b.videoDurationMs) ||
      a.coveredRangesMs.some(([start, end]) => !b.coveredRangesMs.some(([s, e]) => s <= start && e >= end)))
      throw new Error('观看记录不能回退或改变身份');
  },
};
export function summarizeWatches(values: WatchData[]) {
  const groups = new Map<string, WatchData[]>();
  for (const value of values) {
    const key = `${value.provider}:${value.videoId}`;
    groups.set(key, [...(groups.get(key) ?? []), value]);
  }
  return [...groups.values()].map(items => {
    const durations = new Set(items.map(item => item.videoDurationMs).filter(value => value !== null));
    const duration = durations.size === 1 ? [...durations][0] : null;
    const ranges = mergeRanges(items.flatMap(item => item.coveredRangesMs));
    return { provider: items[0].provider, videoId: items[0].videoId, watches: items.length,
      playedDurationMs: items.reduce((sum, item) => sum + item.playedDurationMs, 0),
      videoDurationMs: duration, coveredRangesMs: ranges, completionRatio: coverage(ranges, duration),
      partial: items.some(item => item.completeness === 'partial') || durations.size !== 1 };
  });
}
