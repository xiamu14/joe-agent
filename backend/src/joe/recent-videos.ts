import { z } from 'zod';
import type { PlayableVideo } from '../../../shared/video-playback';

export const recentVideosSchema = z.array(z.object({
  id: z.string().regex(/^[\w-]{11}$/),
  title: z.string().min(1).max(300),
  channel: z.string().max(300),
})).max(10);

const normalize = (text: string) => text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}%+#]+/gu, ' ').trim();
export function recentVideoMatches(query: string, channel: string | undefined, videos: z.infer<typeof recentVideosSchema>): PlayableVideo[] {
  const text = normalize(query), author = normalize(channel ?? '');
  if (!text) return [];
  const matches = videos.filter(video => (!author || normalize(video.channel).includes(author)) &&
    (normalize(video.title).includes(text) || normalize(video.channel).includes(text)));
  return [...new Map(matches.map(video => [video.id, {
    ...video, thumbnail: `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
  }])).values()];
}
