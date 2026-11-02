import { createTool } from '@mastra/core/tools';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { searchVideoData } from './data-mcp';
import { beginWidgetSchema, widgetInstanceSchema, widgetSnapshotSchema } from './tool-contracts';
import { resourceSchemas } from './widget-resources';
import { idSchema } from './id';
import { uniqueTitleMatch, videoFromLink } from './video-target';
import { recentVideoMatches, recentVideosSchema } from './recent-videos';

const presentSchema = z.custom<(card: 'video', visible: boolean) => z.infer<typeof widgetInstanceSchema>>(value => typeof value === 'function');
export const videoPlayOutputSchema = z.object({
  instance: widgetInstanceSchema, summary: z.string(), widget: widgetSnapshotSchema.optional(),
  candidates: recentVideosSchema.element.array().max(20).optional(),
  playback: z.object({ requestId: idSchema, video: resourceSchemas['youtube.search@1'].shape.videos.element }).optional(),
});
export const playYouTube = createTool({
  id: 'play-youtube',
  description: '播放用户指定的 YouTube 视频。链接直接定位；标题片段或频道先匹配最近播放。query 只传定位词，去掉播放、视频等指令词；channel 可进一步限定频道。用户明确说最近播放时 scope=recent，不进行全网搜索。多条匹配需追问，不自行选择。普通搜索或推荐使用 searchYouTube。',
  inputSchema: z.object({ query: z.string().trim().min(1).max(4000), channel: z.string().trim().min(1).max(300).optional(), scope: z.enum(['auto', 'recent']).optional() }),
  outputSchema: videoPlayOutputSchema,
  requestContextSchema: z.object({ 'video.begin': beginWidgetSchema, 'widget.present': presentSchema, 'video.recent': recentVideosSchema.optional() }),
  toModelOutput: ({ summary, playback, candidates }) => ({ type: 'json', value: { summary,
    ...(candidates ? { candidates: candidates.map(({ id, title, channel }, index) => ({ option: index + 1, title, channel, url: `https://www.youtube.com/watch?v=${id}` })) } : {}),
    ...(playback ? { title: playback.video.title, url: `https://www.youtube.com/watch?v=${playback.video.id}` } : {}),
  } }),
  execute: async ({ query, channel, scope }, context) => {
    const begin = context!.requestContext!.get('video.begin');
    const present = context!.requestContext!.get('widget.present');
    const direct = videoFromLink(query);
    if (direct) {
      context?.abortSignal?.throwIfAborted();
      return { instance: present('video', true), playback: { requestId: nanoid(), video: direct },
        summary: '已打开目标视频并请求播放。尚未确认实际播放，不要声称正在播放，也不要声称无法启动播放。' };
    }
    // Do not search arbitrary links or select one of several supplied links.
    if (/https?:\/\//i.test(query)) throw new Error('请提供一个有效的 YouTube 视频链接');
    const recent = recentVideoMatches(query, channel, context!.requestContext!.get('video.recent') ?? []);
    context?.abortSignal?.throwIfAborted();
    if (recent.length === 1) return { instance: present('video', true), playback: { requestId: nanoid(), video: recent[0] },
      summary: '已从最近播放定位唯一视频并请求播放。尚未确认实际播放，不要声称正在播放。' };
    if (recent.length > 1 || scope === 'recent') return { instance: present('video', true),
      candidates: recent.map(({ id, title, channel }) => ({ id, title, channel })),
      summary: recent.length ? '找到多个匹配。按候选序号列出标题和频道，问“想播放哪个？回复序号即可”。不要要求精确标题或链接，不要搜索或自行播放。' : '最近播放里没找到，请用户补充标题或频道，不要转为全网搜索。' };
    const commit = begin();
    const videos = await searchVideoData(channel ? `${query} ${channel}` : query, context?.abortSignal, context);
    context?.abortSignal?.throwIfAborted();
    const video = uniqueTitleMatch(query, channel ? recentVideoMatches(query, channel, videos) : videos);
    if (video) return { instance: present('video', true), playback: { requestId: nanoid(), video },
      summary: '已打开匹配视频并请求播放。尚未确认实际播放，不要声称正在播放。' };
    const widget = commit({ query: query.slice(0, 200), videos });
    return { instance: widget.instance, widget, candidates: videos.map(({ id, title, channel }) => ({ id, title, channel })),
      summary: videos.length ? '找到这些候选，已显示在视频卡片。按候选序号列出标题和频道，问“想播放哪个？回复序号或点选视频即可”。不要要求精确标题或链接，不要自行播放。' : '没有找到匹配视频，请用户补充线索。' };
  },
});
