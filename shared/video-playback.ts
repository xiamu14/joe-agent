export type PlayableVideo = {
  id: string; title: string; channel: string; thumbnail: string;
  publishedAt?: string; views?: number; duration?: number;
};
export type VideoPlaybackRequest = { requestId: string; video: PlayableVideo };

export function isVideoPlaybackRequest(value: unknown): value is VideoPlaybackRequest {
  if (!value || typeof value !== 'object') return false;
  const { requestId, video } = value as VideoPlaybackRequest;
  return typeof requestId === 'string' && /^[\w-]{21}$/.test(requestId) && Boolean(video) &&
    typeof video.id === 'string' && /^[\w-]{11}$/.test(video.id) &&
    typeof video.title === 'string' && typeof video.channel === 'string' &&
    video.thumbnail === `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
}
