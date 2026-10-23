import { z } from 'zod';
import type { VoiceConfig } from './types';
import { JoeVoice, audioInput, audioStream, textInput, type VoiceOptions } from './base';
import { checked, mp3 } from './http';
export const fishProvider = (config: VoiceConfig) => new FishVoice(config);
export class FishVoice extends JoeVoice {
  async listen(input: unknown, options: VoiceOptions = {}) {
    const { config } = this;
    const { signal } = options;
    const audio = await audioInput(input);
    const body = new FormData();
    body.set('audio', audio);
    body.set('ignore_timestamps', 'true');
    const response = await checked(
      await fetch('https://api.fish.audio/v1/asr', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.token}`,
          model: config.asrModel,
        },
        body,
        signal,
      }),
      config.label,
    );
    const result = z
      .object({
        text: z.string().max(12000),
        duration: z.number().nonnegative().optional(),
      })
      .parse(await response.json());
    if (result.duration !== undefined) options.onDuration?.(result.duration);
    return result.text;
  }
  async speak(input: string | NodeJS.ReadableStream, options: VoiceOptions & { speaker?: string } = {}) {
    const config = {
      ...this.config,
      voiceId: options.speaker ?? this.config.voiceId,
    };
    const { signal } = options;
    const text = await textInput(input);
    const response = await checked(
      await fetch('https://api.fish.audio/v1/tts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.token}`,
          'Content-Type': 'application/json',
          model: config.ttsModel,
        },
        body: JSON.stringify({
          text,
          reference_id: config.voiceId,
          format: 'mp3',
          latency: 'normal',
        }),
        signal,
      }),
      config.label,
    );
    return audioStream((await mp3(response)).audio);
  }
}
