export type WidgetCard = 'costs' | 'settings' | 'weather' | 'video';
type WidgetState = { visible: boolean; revision: number; bindings: Record<string, { resourceId: string }> };
export type WidgetVisibility = Partial<Record<WidgetCard, WidgetState>>;

export function applyWidgetSnapshot(current: WidgetVisibility, value: unknown): WidgetVisibility {
  if (!value || typeof value !== 'object') return current;
  const instance = value as Record<string, unknown>;
  const type = instance.widgetType;
  const card = type === 'youtube.video' ? 'video' : typeof type === 'string' && type.startsWith('builtin.') ? type.slice(8) : '';
  if (!['costs', 'settings', 'weather', 'video'].includes(card) || typeof instance.visible !== 'boolean' || !Number.isSafeInteger(instance.revision) || (instance.revision as number) < 1) return current;
  const key = card as WidgetCard;
  if ((current[key]?.revision ?? 0) >= (instance.revision as number)) return current;
  return { ...current, [key]: { visible: instance.visible, revision: instance.revision as number, bindings: (instance.bindings && typeof instance.bindings === 'object' ? instance.bindings : {}) as WidgetState['bindings'] } };
}

export const widgetCards: readonly WidgetCard[] = ['costs', 'settings', 'weather', 'video'];
export function visibleWidgetCards(visibility: WidgetVisibility): WidgetCard[] {
  return widgetCards.filter(card => visibility[card]?.visible === true);
}
