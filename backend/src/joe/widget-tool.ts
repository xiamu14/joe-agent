import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const inputSchema = z.object({ card: z.enum(['costs', 'settings', 'weather', 'video']), visible: z.boolean().default(true) });

export const presentWidget = createTool({
  id: 'present-widget',
  description: '根据用户要求显示或隐藏费用、设置、天气或视频卡片。显示和隐藏不会改变卡片内容。',
  inputSchema,
  execute: async (input, context) => {
    const present = context?.requestContext?.get('widget.present') as ((card: 'costs' | 'settings' | 'weather' | 'video', visible: boolean) => unknown) | undefined;
    if (!present) return { ok: false, detail: '当前客户端不支持画布卡片' };
    context?.abortSignal?.throwIfAborted();
    return { ok: true, card: input.card, instance: present(input.card, input.visible) };
  },
});
