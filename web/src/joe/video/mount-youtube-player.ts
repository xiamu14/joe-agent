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
  // Embed immediately: native playback controls remain usable if the JS API fails.
  const target = document.createElement('iframe');
  target.src = `https://www.youtube.com/embed/${selectedId}?enablejsapi=1&playsinline=1&origin=${encodeURIComponent(window.location.origin)}`;
  target.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
  target.title = 'YouTube 视频播放器';
  target.referrerPolicy = 'strict-origin-when-cross-origin';
  container.append(target);
  const timer = setTimeout(() => callbacks.onError('播放器控制连接超时，可使用视频内控件'), 20000);
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
  }).catch(error => {
    if (!cancelled) {
      clearTimeout(timer);
      callbacks.onError(error instanceof Error ? error.message : String(error));
      console.error('[YouTube player]', { videoId: selectedId, error });
    }
  });
  return () => {
    cancelled = true;
    clearTimeout(timer);
    instance?.destroy();
    container.replaceChildren();
  };
}
