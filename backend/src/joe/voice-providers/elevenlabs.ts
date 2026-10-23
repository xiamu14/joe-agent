import { z } from 'zod';
import type { VoiceConfig } from './types';
import { JoeVoice, audioInput, audioStream, textInput, type VoiceOptions } from './base';
import { checked, mp3 } from './http';
export const elevenLabsProvider = (config: VoiceConfig) => new ElevenLabsVoice(config);
export class ElevenLabsVoice extends JoeVoice {
  async createRealtimeSession(signal: AbortSignal) {
    const { config } = this;
    const response = await checked(
      await fetch('https://api.elevenlabs.io/v1/single-use-token/realtime_scribe', {
        method: 'POST',
        headers: { 'xi-api-key': config.token },
        signal,
      }),
      config.label,
    );
    const { token } = z.object({ token: z.string().min(1).max(4096) }).parse(await response.json());
    return { mode: 'elevenlabs-realtime' as const, token };
  }
  async listen(input: unknown, options: VoiceOptions = {}) {
    const { config } = this;
    const { signal } = options;
    const audio = await audioInput(input);
    const body = new FormData();
    body.set('file', audio);
    body.set('model_id', config.asrModel);
    body.set('tag_audio_events', 'false');
    body.set('timestamps_granularity', 'none');
    const response = await checked(
      await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
        method: 'POST',
        headers: { 'xi-api-key': config.token },
        body,
        signal,
      }),
      config.label,
    );
    // Word timestamps omit trailing silence and are not a reliable billing duration.
    return z.object({ text: z.string().max(12000) }).parse(await response.json()).text;
  }
  async speak(input: string | NodeJS.ReadableStream, options: VoiceOptions & { speaker?: string } = {}) {
    const config = {
      ...this.config,
      voiceId: options.speaker ?? this.config.voiceId,
    };
    const { signal } = options;
    const text = await textInput(input);
    const response = await checked(
      await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(config.voiceId)}?output_format=mp3_44100_128`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': config.token,
            'Content-Type': 'application/json',
            Accept: 'audio/mpeg',
          },
          body: JSON.stringify({ text, model_id: config.ttsModel }),
          signal,
        },
      ),
      config.label,
    );
    const rawCredits = response.headers.get('character-cost');
    const credits = rawCredits?.trim() ? Number(rawCredits) : NaN;
    options.onUsage?.({
      requestId: response.headers.get('request-id') || undefined,
      credits: Number.isFinite(credits) && credits >= 0 ? credits : undefined,
    });
    return audioStream((await mp3(response)).audio);
  }
}
