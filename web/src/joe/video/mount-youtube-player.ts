import { loadYouTubeApi, youtubeError, type YouTubePlayer } from './youtube-api';

export const videoId = 'BagZ55ac4xs';
export const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

type Callbacks = {
  isExpanded(): boolean;
  onReady(player: YouTubePlayer): void;
  onPlaying(playing: boolean): void;
  onError(message: string): void;
  onPlaybackStarted(): void;
  onAutoplayBlocked(): void;
};

export function mountYouTubePlayer(container: HTMLElement, callbacks: Callbacks, selectedId = videoId) {
  let cancelled = false;
  let instance: YouTubePlayer | undefined;
  const target = document.createElement('div');
  container.append(target);
  const timer = setTimeout(() => callbacks.onError('播放器连接超时'), 20000);
  void loadYouTubeApi().then(api => {
    if (cancelled) return;
    instance = new api.Player(target, {
      videoId: selectedId, width: '100%', height: '100%',
      playerVars: { origin: window.location.origin, playsinline: 1, controls: 1, rel: 0 },
      events: {
        onReady(event) {
          if (cancelled) return;
          clearTimeout(timer);
          callbacks.onError('');
          callbacks.onReady(event.target);
        },
        onStateChange(event) {
          if (cancelled) return;
          if (event.data === 1 && !callbacks.isExpanded()) { event.target.pauseVideo(); return; }
          callbacks.onPlaying(event.data === 1);
          if (event.data === 1) callbacks.onPlaybackStarted();
        },
        onError(event) { if (!cancelled) { clearTimeout(timer); callbacks.onError(youtubeError(event.data)); callbacks.onPlaying(false); } },
        onAutoplayBlocked() { if (!cancelled) { callbacks.onAutoplayBlocked(); callbacks.onPlaying(false); } },
      },
    });
    const iframe = instance.getIframe();
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.title = 'YouTube 视频播放器';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  }).catch(() => { if (!cancelled) { clearTimeout(timer); callbacks.onError('无法连接 YouTube'); } });
  return () => {
    cancelled = true;
    clearTimeout(timer);
    instance?.destroy();
    container.replaceChildren();
  };
}
