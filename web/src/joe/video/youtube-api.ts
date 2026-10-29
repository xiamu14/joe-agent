export interface YouTubePlayer {
  getCurrentTime(): number;
  getDuration(): number;
  getPlaybackRate(): number;
  getPlayerState(): number;
  playVideo(): void;
  pauseVideo(): void;
  destroy(): void;
  getIframe(): HTMLIFrameElement;
}
type PlayerEvent = { target: YouTubePlayer };
export interface YouTubeApi {
  Player: new (element: HTMLElement, options: {
    videoId: string;
    width: string;
    height: string;
    playerVars: { origin: string; playsinline: number; controls: number; rel: number };
    events: {
      onReady(event: PlayerEvent): void;
      onStateChange(event: PlayerEvent & { data: number }): void;
      onError(event: PlayerEvent & { data: number }): void;
      onAutoplayBlocked(): void;
    };
  }) => YouTubePlayer;
}
type YouTubeWindow = Window & { YT?: YouTubeApi; onYouTubeIframeAPIReady?: () => void };
let pending: Promise<YouTubeApi> | undefined;

export function loadYouTubeApi(): Promise<YouTubeApi> {
  const host = window as YouTubeWindow;
  if (host.YT?.Player) return Promise.resolve(host.YT);
  if (pending) return pending;
  pending = new Promise<YouTubeApi>((resolve, reject) => {
    const previous = host.onYouTubeIframeAPIReady;
    const script = document.createElement('script');
    const cleanup = () => {
      clearTimeout(timer);
      script.onerror = null;
      if (host.onYouTubeIframeAPIReady === ready) host.onYouTubeIframeAPIReady = previous;
    };
    const fail = (message: string) => { cleanup(); script.remove(); reject(new Error(message)); };
    const ready = () => {
      cleanup();
      if (host.YT?.Player) resolve(host.YT);
      else reject(new Error('播放器未就绪'));
      previous?.();
    };
    const timer = setTimeout(() => fail('YouTube 控制脚本加载超时'), 15000);
    host.onYouTubeIframeAPIReady = ready;
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => fail('YouTube 控制脚本加载失败');
    document.head.append(script);
  }).catch(error => { pending = undefined; throw error; });
  return pending;
}

export function youtubeError(code: number) {
  if (code === 101 || code === 150) return `作者禁止嵌入播放（${code}）`;
  if (code === 100) return '视频暂不可用';
  return `视频加载失败（${code}）`;
}
