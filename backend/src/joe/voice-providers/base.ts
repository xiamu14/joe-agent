import { MastraVoice } from '@mastra/core/voice';
import { Readable } from 'node:stream';
import type { VoiceConfig } from './types';
export type VoiceOptions = {
  signal?: AbortSignal;
  onUsage?: (usage: { requestId?: string; credits?: number }) => void;
  onDuration?: (seconds: number) => void;
};
export abstract class JoeVoice extends MastraVoice<unknown, VoiceOptions, VoiceOptions> {
  constructor(readonly config: VoiceConfig) {
    super({
      name: config.id,
      speechModel: { name: config.ttsModel },
      listeningModel: { name: config.asrModel },
      speaker: config.voiceId,
    });
  }
  createRealtimeSession?(signal: AbortSignal): Promise<{ mode: 'elevenlabs-realtime'; token: string }>;
  async getSpeakers() {
    return this.config.voiceId ? [{ voiceId: this.config.voiceId }] : [];
  }
  async getListener() {
    return { enabled: Boolean(this.config.token) };
  }
}
export async function textInput(input: string | NodeJS.ReadableStream) {
  if (typeof input === 'string') return input;
  const chunks: Buffer[] = [];
  for await (const chunk of input as Readable) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}
export async function audioInput(input: unknown): Promise<File> {
  if (input instanceof File) return input;
  const chunks: Buffer[] = [];
  for await (const chunk of input as Readable) chunks.push(Buffer.from(chunk));
  return new File([Buffer.concat(chunks)], 'audio.wav', { type: 'audio/wav' });
}
export const audioStream = (audio: ArrayBuffer) => Readable.from([Buffer.from(audio)]);
