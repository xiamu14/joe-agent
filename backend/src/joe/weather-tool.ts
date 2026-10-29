import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { currentWeather, weather } from './weather';

export const getWeather = createTool({
  id: 'get-weather',
  description:
    '查询实时天气。指定城市可查询世界各地；用户问这里或当地天气时省略 city，以公网 IP 定位。仅返回当前天气，不提供未来预报。',
  inputSchema: z.object({
    city: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .optional()
      .describe('城市名称，可附带国家，例如 Tokyo, Japan；查询当前位置时省略'),
  }),
  execute: async ({ city }, context) => {
    const begin = context?.requestContext?.get('weather.begin') as (() => ((data: unknown) => unknown)) | undefined;
    const commit = begin?.();
    if (!commit && context?.requestContext?.get('canvas.enabled')) throw new Error('当前客户端不支持天气卡片');
    const result = await (city ? weather(city, context?.abortSignal) : currentWeather(context?.requestContext?.get('client.ip') as string | undefined, context?.abortSignal));
    if (!result.configured) throw new Error('请先配置 WEATHER_API_KEY');
    context?.abortSignal?.throwIfAborted();
    const widget = commit?.(result);
    return { ...result, ...(widget ? { widget } : {}) };
  },
});
