import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { widgetInstanceSchema } from './tool-contracts';

const inputSchema = z.object({ card: z.enum(['costs', 'settings', 'weather', 'video', 'finance']), visible: z.boolean().default(true) });

export const presentWidget = createTool({
  id: 'present-widget',
  description: '根据用户要求显示或隐藏费用、设置、天气、视频或账户卡片。显示和隐藏不会改变卡片内容。',
  inputSchema,
  outputSchema: z.discriminatedUnion('ok', [
    z.object({ ok: z.literal(true), card: inputSchema.shape.card, instance: widgetInstanceSchema }),
    z.object({ ok: z.literal(false), detail: z.string() }),
  ]),
  requestContextSchema: z.object({
    'widget.present': z.custom<(card: z.infer<typeof inputSchema>['card'], visible: boolean) => z.infer<typeof widgetInstanceSchema>>(
      value => typeof value === 'function', '卡片显示能力无效',
    ).optional(),
  }),
  toModelOutput: result => ({ type: 'json', value: result.ok
    ? { ok: true, card: result.card, visible: result.instance.visible } : result }),
  execute: async (input, context) => {
    const present = context?.requestContext?.get('widget.present');
    if (!present) return { ok: false as const, detail: '当前客户端不支持画布卡片' };
    context?.abortSignal?.throwIfAborted();
    return { ok: true as const, card: input.card, instance: present(input.card, input.visible) };
  },
});
