import { createTool } from '@mastra/core/tools';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { searchVideoData } from './data-mcp';
import { beginWidgetSchema, widgetInstanceSchema, widgetSnapshotSchema } from './tool-contracts';
import { resourceSchemas } from './widget-resources';
import { idSchema } from './id';
import { uniqueTitleMatch, videoFromLink } from './video-target';

const presentSchema = z.custom<(card: 'video', visible: boolean) => z.infer<typeof widgetInstanceSchema>>(value => typeof value === 'function');
export const videoPlayOutputSchema = z.object({
  instance: widgetInstanceSchema, summary: z.string(), widget: widgetSnapshotSchema.optional(),
  playback: z.object({ requestId: idSchema, video: resourceSchemas['youtube.search@1'].shape.videos.element }).optional(),
});
export const playYouTube = createTool({
  id: 'play-youtube',
  description: '用户要求播放明确的 YouTube 视频时使用。传入用户提供的链接、分享文本或完整标题；链接直接定位，标题检索后仅唯一精确匹配才播放，否则展示候选。不能用于泛泛找视频。',
  inputSchema: z.object({ query: z.string().trim().min(1).max(4000) }),
  outputSchema: videoPlayOutputSchema,
  requestContextSchema: z.object({ 'video.begin': beginWidgetSchema, 'widget.present': presentSchema }),
  toModelOutput: ({ summary, playback }) => ({ type: 'json', value: { summary,
    ...(playback ? { title: playback.video.title, url: `https://www.youtube.com/watch?v=${playback.video.id}` } : {}),
  } }),
  execute: async ({ query }, context) => {
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
    const commit = begin();
    const videos = await searchVideoData(query, context?.abortSignal, context);
    context?.abortSignal?.throwIfAborted();
    const video = uniqueTitleMatch(query, videos);
    if (video) return { instance: present('video', true), playback: { requestId: nanoid(), video },
      summary: '已打开匹配视频并请求播放。尚未确认实际播放，不要声称正在播放。' };
    const widget = commit({ query: query.slice(0, 200), videos });
    return { instance: widget.instance, widget, summary: videos.length ? '未能唯一确定视频，候选已显示，请用户选择。' : '没有找到匹配视频，请用户提供链接或频道。' };
  },
});
