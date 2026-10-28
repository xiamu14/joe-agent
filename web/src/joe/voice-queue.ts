import { jsonBody } from './api';
import { playStreamedSpeech } from './streamed-speech-player';
export class VoiceQueue {
  private epoch = 0;
  private queue: {
    text: string;
    sessionId: string;
    turnId: string;
    offset: number;
    language: 'en' | 'zh';
  }[] = [];
  private running = false;
  private request?: AbortController;
  private audio?: HTMLAudioElement;
  private context?: AudioContext;
  private finish?: () => void;
  private frame = 0;
  constructor(
    private onPlaying: (value: boolean) => void,
    private onLevel: (value: number) => void,
    private onError: (message: string) => void,
    private onPending: (value: boolean) => void,
    private onCaption: (turnId: string, end: number) => void = () => {},
  ) {}
  unlock() {
    this.context ??= new AudioContext();
    void this.context.resume().catch(() => {});
  }
  enqueue(text: string, sessionId: string, turnId: string, offset = 0, language: 'en' | 'zh' = 'en') {
    if (!text) return;
    this.queue.push({ text, sessionId, turnId, offset, language });
    this.onPending(true);
    void this.drain();
  }
  get pending() {
    return this.running || this.queue.length > 0;
  }
  stop() {
    this.epoch++;
    this.queue = [];
    this.request?.abort();
    this.audio?.pause();
    this.finish?.();
    cancelAnimationFrame(this.frame);
    this.onLevel(0);
    this.onPlaying(false);
    this.onPending(false);
  }
  dispose() {
    this.stop();
    void this.context?.close();
  }
  private async drain() {
    if (this.running) return;
    this.running = true;
    const epoch = this.epoch;
    try {
      while (this.queue.length && epoch === this.epoch) {
        const item = this.queue.shift()!;
        this.request = new AbortController();
        const response = await fetch('/joe-api/speech', {
          ...jsonBody({
            text: item.text,
            sessionId: item.sessionId,
            turnId: item.turnId,
            language: item.language,
            stream: true,
          }),
          signal: this.request.signal,
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || '语音合成失败');
        }
        if (epoch !== this.epoch) { await response.body?.cancel(); break; }
        if (response.headers.get('Content-Type')?.includes('application/x-ndjson')) {
          this.unlock();
          await playStreamedSpeech(response, this.context!, this.request.signal,
            end => { if (epoch === this.epoch) this.onCaption(item.turnId, item.offset + end); },
            value => this.onPlaying(value), value => this.onLevel(value));
          if (epoch === this.epoch) this.onCaption(item.turnId, item.offset + item.text.length);
          continue;
        }
        const blob = await response.blob();
        if (epoch !== this.epoch) break;
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        this.audio = audio;
        let source: MediaElementAudioSourceNode | undefined;
        let analyser: AnalyserNode | undefined;
        try {
          this.unlock();
          if (this.context) {
            source = this.context.createMediaElementSource(audio);
            analyser = this.context.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyser.connect(this.context.destination);
          }
          const samples = new Uint8Array(256);
          let revealed = -1;
          // shortcut: interpolate characters by audio duration; use word timestamps when the provider exposes them.
          const caption = (progress: number) => {
            const count = Math.floor(item.text.length * Math.max(0, Math.min(1, progress)));
            if (count !== revealed && epoch === this.epoch) {
              revealed = count;
              this.onCaption(item.turnId, item.offset + count);
            }
          };
          const meter = () => {
            if (epoch !== this.epoch) return;
            if (Number.isFinite(audio.duration) && audio.duration > 0)
              caption(audio.currentTime / audio.duration);
            if (analyser) {
              analyser.getByteTimeDomainData(samples);
              const rms = Math.sqrt(
                samples.reduce((sum, v) => sum + ((v - 128) / 128) ** 2, 0) / samples.length,
              );
              this.onLevel(Math.min(1, rms * 5));
            }
            this.frame = requestAnimationFrame(meter);
          };
          await new Promise<void>((resolve, reject) => {
            this.finish = resolve;
            audio.onended = () => {
              caption(1);
              resolve();
            };
            audio.onerror = () => reject(new Error('音频播放失败'));
            void audio
              .play()
              .then(() => {
                if (epoch !== this.epoch) {
                  audio.pause();
                  resolve();
                  return;
                }
                this.onPlaying(true);
                meter();
              })
              .catch(() => reject(new Error('浏览器阻止了音频，请点击输入区域后重试')));
          });
        } finally {
          cancelAnimationFrame(this.frame);
          source?.disconnect();
          analyser?.disconnect();
          audio.pause();
          audio.removeAttribute('src');
          URL.revokeObjectURL(url);
          this.finish = undefined;
          this.onLevel(0);
          this.onPlaying(false);
        }
      }
    } catch (error) {
      if (epoch === this.epoch) {
        this.queue = [];
        this.onError(error instanceof Error ? error.message : '语音不可用');
      }
    } finally {
      this.running = false;
      if (this.queue.length) void this.drain();
      else this.onPending(false);
    }
  }
}
