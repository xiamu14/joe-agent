import { createTool } from '@mastra/core/tools';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { idSchema } from './id';
import type { CanvasStore } from './canvas-store';
import type { WidgetStore } from './widget-store';

const target = z.object({ id: idSchema.optional(), name: z.string().trim().min(1).max(80).optional() });
const changes = z.array(z.discriminatedUnion('type', [
    z.object({ type: z.literal('canvas.rename'), name: z.string().trim().min(1).max(80) }),
    z.object({ type: z.literal('widget.retain'), selector: z.object({ widgetType: z.enum(['builtin.costs', 'builtin.settings', 'builtin.weather', 'youtube.video', 'builtin.finance']) }) }),
    z.object({ type: z.literal('widget.visibility'), widgetType: z.enum(['builtin.costs', 'builtin.settings', 'builtin.weather', 'youtube.video', 'builtin.finance']), visible: z.boolean() }),
  ])).min(1).max(20);
export const canvasEditSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('inspect') }),
  z.object({ mode: z.literal('apply'), target: target.optional(), changes }),
]);
// Function parameters require an object root; keep mode-specific validation locally.
const canvasToolInputSchema = z.object({
  mode: z.enum(['inspect', 'apply']),
  target: target.optional(),
  changes: changes.optional().describe('apply 时必填，inspect 时省略'),
}).superRefine((input, context) => {
  const result = canvasEditSchema.safeParse(input);
  if (!result.success) for (const issue of result.error.issues) context.addIssue({ code: 'custom', path: issue.path, message: issue.message });
});
export function editCanvas(currentId: string, input: z.infer<typeof canvasEditSchema>, canvasStore: CanvasStore, widgetStore: WidgetStore) {
  const directory = canvasStore.directory(currentId);
  if (input.mode === 'inspect') return { status: 'inspected', canvases: directory.map(canvas => ({ ...canvas, cards: widgetStore.snapshot(canvas.id).instances.map((card: { instanceId: string; widgetType: string; visible: boolean }) => ({ instanceId: card.instanceId, widgetType: card.widgetType, visible: card.visible })) })) };
  const matches = directory.filter(canvas => (!input.target?.id || canvas.id === input.target.id) && (!input.target?.name || canvas.name === input.target.name) && (input.target?.id || input.target?.name || canvas.id === currentId));
  if (matches.length !== 1) return { status: 'needs_clarification', detail: '请指定要修改的空间', candidates: matches.length ? matches : directory };
  const canvas = matches[0];
  const cards = widgetStore.snapshot(canvas.id).instances as { instanceId: string; revision: number; widgetType: string; visible: boolean }[];
  let name = canvas.name;
  const visibility = new Map(cards.map(card => [card.instanceId, card.visible]));
  for (const change of input.changes) {
    if (change.type === 'canvas.rename') { name = change.name; continue; }
    const found = cards.filter(card => card.widgetType === (change.type === 'widget.retain' ? change.selector.widgetType : change.widgetType));
    if (!found.length) return { status: 'rejected', detail: '空间中没有这类卡片，请先添加' };
    for (const card of change.type === 'widget.retain' ? cards : found)
      visibility.set(card.instanceId, change.type === 'widget.retain' ? found.includes(card) : change.visible);
  }
  try {
    return canvasStore.change(currentId, { protocolVersion: 1, type: 'canvas.change', commandId: nanoid(), canvasId: canvas.id, expectedCanvasRevision: canvas.revision,
      operations: [{ type: 'canvas.rename', name }, ...cards.map(card => ({ type: 'widget.visibility', instanceId: card.instanceId, expectedRevision: card.revision, visible: visibility.get(card.instanceId) }))] });
  } catch (error) { return { status: 'conflict', detail: error instanceof Error ? error.message : '空间修改失败' }; }
}
export const editCanvasTool = createTool({
  id: 'edit-canvas', description: '查看或修改空间名称、卡片显示。只保留表示显示匹配类型并隐藏其余卡片，保留内容。目标省略表示当前空间。空间名称不确定先 inspect。',
  inputSchema: canvasToolInputSchema,
  outputSchema: z.object({ status: z.string() }).passthrough(),
  requestContextSchema: z.object({ 'canvas.edit': z.custom<(input: z.infer<typeof canvasEditSchema>) => ReturnType<typeof editCanvas>>(value => typeof value === 'function', '空间修改能力无效') }),
  toModelOutput: result => ({ type: 'json', value: result.type === 'canvas.changed'
    ? { status: result.status, canvas: result.canvas, detail: '已保存空间名称与卡片显示状态' } : result }),
  execute: async (input, context) => {
    context?.abortSignal?.throwIfAborted();
    return context!.requestContext!.get('canvas.edit')(canvasEditSchema.parse(input));
  },
});
