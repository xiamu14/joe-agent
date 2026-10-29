import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { searchVideoData } from './data-mcp';
import { beginWidgetSchema, widgetSnapshotSchema } from './tool-contracts';
import { resourceSchemas } from './widget-resources';
export const searchYouTube = createTool({
  id: 'search-youtube',
  description: '搜索 YouTube 视频并把真实搜索结果显示在视频卡片。',
  inputSchema: z.object({ query: z.string().trim().min(1).max(200) }),
  outputSchema: z.object({ query: z.string(), count: z.number().int().nonnegative(), summary: z.string(), widget: widgetSnapshotSchema }),
  requestContextSchema: z.object({ 'video.begin': beginWidgetSchema.optional() }),
  toModelOutput: ({ query, count, summary, widget }) => ({
    type: 'json', value: { query, count, summary,
      videos: resourceSchemas['youtube.search@1'].parse(widget.resource.data).videos.map(({ id, title, channel }) => ({
        title, channel, url: `https://www.youtube.com/watch?v=${id}`,
      })),
    },
  }),
  execute: async ({ query }, context) => {
    const begin = context?.requestContext?.get('video.begin');
    if (!begin) throw new Error('当前客户端不支持视频卡片');
    const commit = begin();
    const videos = await searchVideoData(query, context?.abortSignal, context);
    context?.abortSignal?.throwIfAborted();
    const widget = commit({ query, videos });
    return { query, count: videos.length, summary: '结果已显示在视频卡片。简短概括，不逐条列出或朗读视频标题。', widget };
  },
});
