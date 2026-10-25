import { VOICE_ACTIVITY_RMS } from './config';
export class TranscriptTurn {
  accept(type: string, text: unknown): { text: string; final: boolean } | null {
    if (typeof text !== 'string') return null;
    if (!['partial_transcript', 'committed_transcript'].includes(type)) return null;
    const clean = text.trim();
    if (!clean) return null;
    if (clean.length > 12000) throw new Error('语音内容过长，请分段表达');
    const final = type === 'committed_transcript';
    return { text: clean, final };
  }
}
export class SilenceDetector {
  private voicedMs = 0;
  private lastVoice = 0;
  private lastTime: number | undefined;
  get started() { return this.voicedMs >= 250; }
  update(rms: number, now: number) {
    const elapsed = this.lastTime === undefined ? 0 : Math.max(0, Math.min(100, now - this.lastTime));
    this.lastTime = now;
    if (rms >= VOICE_ACTIVITY_RMS) {
      this.voicedMs += elapsed;
      this.lastVoice = now;
    }
    return this.voicedMs >= 250 && now - this.lastVoice >= 1000;
  }
}
export type InputCallbacks = {
  speech?(): void;
  ready?(): void;
  partial(text: string): void;
  final(text: string): void;
  error(message: string): void;
  transcribing(): void;
};
