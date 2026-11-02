import { useState } from 'react';
import type { VideoItem } from '../../components/rare-ui/video-list';
const key = 'youtube-widget:recent:v1';
export function readRecentVideos(): VideoItem[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    const recent = Array.isArray(data) ? data.filter((item): item is VideoItem => item && /^[\w-]{11}$/.test(item.id) && typeof item.title === 'string' && typeof item.channel === 'string' && typeof item.thumbnail === 'string' && item.thumbnail === `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`).slice(0, 10) : [];
    if (Array.isArray(data) && data.length > recent.length) {
      try { localStorage.setItem(key, JSON.stringify(recent)); } catch { /* Keep the trimmed list in memory. */ }
    }
    return recent;
  } catch { return []; }
}
export function useVideoHistory() {
  const [recent, setRecent] = useState<VideoItem[]>(readRecentVideos);
  function record(item: VideoItem) {
    setRecent(previous => {
      const next = [item, ...previous.filter(video => video.id !== item.id)].slice(0, 10);
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* Playback works without storage. */ }
      return next;
    });
  }
  return { recent, record };
}
