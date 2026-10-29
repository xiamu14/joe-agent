import { nanoid } from 'nanoid';
import type { BehaviorContext, BehaviorSubmission } from '../../../../shared/widget-behavior';
import { enqueueBehavior } from './delivery';

type Definition = { widgetType: string; widgetVersion: 1; definitionVersion: 1; policyVersion: 1; eventName: string };
// The instance runtime owns context; card adapters supply only registered domain data.
export function bindBehavior(context: BehaviorContext, definition: Definition,
  deliver: (value: BehaviorSubmission) => void = enqueueBehavior) {
  return (recordId: string, revision: number, payload: unknown) => deliver({
    sessionId: context.sessionId,
    event: { behaviorProtocolVersion: 1, eventId: nanoid(), recordId, revision,
      widgetType: definition.widgetType, widgetVersion: definition.widgetVersion,
      definitionVersion: definition.definitionVersion, policyVersion: definition.policyVersion,
      eventName: definition.eventName, occurredAt: new Date().toISOString(), trigger: 'directInteraction',
      canvasId: context.canvasId, instanceId: context.instanceId, payload },
  });
}
