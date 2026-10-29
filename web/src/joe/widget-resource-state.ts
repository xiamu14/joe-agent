export type ResourceSnapshot = { resourceId: string; schema: string; revision: number; data: unknown };
export type WidgetResources = Record<string, ResourceSnapshot>;
export function applyResourceSnapshot(current: WidgetResources, value: unknown): WidgetResources {
  if (!value || typeof value !== 'object') return current;
  const candidate = value as ResourceSnapshot;
  if (typeof candidate.resourceId !== 'string' || typeof candidate.schema !== 'string' || !Number.isSafeInteger(candidate.revision) || candidate.revision < 1 || !('data' in candidate)) return current;
  if ((current[candidate.resourceId]?.revision ?? 0) >= candidate.revision) return current;
  return { ...current, [candidate.resourceId]: candidate };
}
