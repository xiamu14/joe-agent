import type { VoiceCapability, VoiceConfig, VoiceProviderId } from './types';
type Env = Record<string, string | undefined>;
function rate(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error('语音费率必须是非负数字');
  return number;
}
export function voiceConfig(capability: VoiceCapability, env: Env = process.env): VoiceConfig {
  const selected =
    env[`JOE_${capability.toUpperCase()}_PROVIDER`]?.trim() || env.JOE_VOICE_PROVIDER?.trim() || 'fish';
  if (selected !== 'fish' && selected !== 'elevenlabs') throw new Error(`不支持的语音 provider：${selected}`);
  const id: VoiceProviderId = selected;
  const prefix = id === 'fish' ? 'FISH' : 'ELEVENLABS';
  const voiceKey = id === 'fish' ? 'FISH_REFERENCE_ID' : 'ELEVENLABS_VOICE_ID';
  const legacy = (env[voiceKey] || '').trim();
  return {
    id,
    label: id === 'fish' ? 'Fish' : 'ElevenLabs',
    token: (env[id === 'fish' ? 'FISH_API_TOKEN' : 'ELEVENLABS_API_KEY'] || '').trim(),
    voiceId: legacy,
    voices: { en: env[`${voiceKey}_EN`]?.trim() || legacy, zh: env[`${voiceKey}_ZH`]?.trim() || '' },
    asrModel: env[`${prefix}_ASR_MODEL`]?.trim() || (id === 'fish' ? 'transcribe-1' : 'scribe_v2'),
    ttsModel: env[`${prefix}_TTS_MODEL`]?.trim() || (id === 'fish' ? 's2.1-pro' : 'eleven_flash_v2_5'),
    asrRate: rate(env[`${prefix}_ASR_USD_PER_MINUTE`]),
    ttsRate: rate(env[`${prefix}_TTS_USD_PER_MILLION_CHARS`]),
  };
}
export function voiceStatus() {
  const asr = voiceConfig('asr'),
    tts = voiceConfig('tts');
  return {
    asr: Boolean(asr.token),
    tts: Boolean(tts.token && Object.values(tts.voices).some(Boolean)),
    profiles: { en: Boolean(tts.token && tts.voices.en), zh: Boolean(tts.token && tts.voices.zh) },
    providers: { asr: asr.label, tts: tts.label },
  };
}
