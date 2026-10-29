export type ContentRange = [number, number];
export type BehaviorContext = { sessionId: string; canvasId: string; instanceId: string };
export type WatchData = {
  provider: 'youtube'; videoId: string; startedAt: string; endedAt: string | null;
  playedDurationMs: number; videoDurationMs: number | null; coveredRangesMs: ContentRange[];
  measurementVersion: 1; completeness: 'partial' | 'final';
};
export type BehaviorEvent = {
  behaviorProtocolVersion: 1; eventId: string; recordId: string; revision: number;
  widgetType: string; widgetVersion: 1; definitionVersion: 1; policyVersion: 1;
  eventName: string; occurredAt: string; trigger: 'directInteraction' | 'userInstruction';
  canvasId: string; instanceId: string; payload: unknown;
};
export type BehaviorSubmission = { sessionId: string; event: BehaviorEvent };
export const videoBehaviorDefinition = {
  widgetType: 'youtube.video', widgetVersion: 1, definitionVersion: 1, policyVersion: 1,
  eventName: 'video.watch.checkpoint', retentionPolicy: 'indefinite',
} as const;

export function mergeRanges(ranges: ContentRange[]): ContentRange[] {
  const merged: ContentRange[] = [];
  for (const [start, end] of [...ranges].sort((a, b) => a[0] - b[0])) {
    if (end <= start) continue;
    const previous = merged.at(-1);
    if (previous && start <= previous[1]) previous[1] = Math.max(previous[1], end);
    else merged.push([start, end]);
  }
  return merged;
}
export function coverage(ranges: ContentRange[], duration: number | null) {
  if (!duration || duration <= 0) return null;
  return Math.min(1, mergeRanges(ranges).reduce((sum, [a, b]) => sum + Math.max(0, Math.min(b, duration) - a), 0) / duration);
}
