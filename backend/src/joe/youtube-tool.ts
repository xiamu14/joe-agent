import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const responseSchema = z.object({ items: z.array(z.object({ id: z.object({ videoId: z.string().regex(/^[\w-]{11}$/) }), snippet: z.object({ title: z.string().min(1).max(300), channelTitle: z.string().max(300) }) })).max(20) });
export const searchYouTube = createTool({
  id: 'search-youtube',
  description: '搜索 YouTube 视频并把真实搜索结果显示在视频卡片。',
  inputSchema: z.object({ query: z.string().trim().min(1).max(200) }),
  execute: async ({ query }, context) => {
    const key = process.env.YOUTUBE_API_KEY?.trim();
    if (!key) throw new Error('请先配置 YOUTUBE_API_KEY');
    const begin = context?.requestContext?.get('video.begin') as (() => (data: unknown) => unknown) | undefined;
    if (!begin) throw new Error('当前客户端不支持视频卡片');
    const commit = begin();
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.search = new URLSearchParams({ key, part: 'snippet', type: 'video', maxResults: '10', q: query }).toString();
    const response = await fetch(url, { signal: AbortSignal.any([...(context?.abortSignal ? [context.abortSignal] : []), AbortSignal.timeout(15000)]) });
    if (!response.ok) throw new Error('YouTube 搜索暂不可用');
    const parsed = responseSchema.parse(await response.json());
    const videos = parsed.items.map(item => ({ id: item.id.videoId, title: item.snippet.title, channel: item.snippet.channelTitle, thumbnail: `https://i.ytimg.com/vi/${item.id.videoId}/hqdefault.jpg` }));
    context?.abortSignal?.throwIfAborted();
    const widget = commit({ query, videos });
    return { query, videos, widget };
  },
});
