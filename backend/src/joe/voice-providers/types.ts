export type VoiceProviderId = 'fish' | 'elevenlabs';
export type VoiceCapability = 'asr' | 'tts';
export type VoiceConfig = {
  id: VoiceProviderId;
  label: string;
  token: string;
  voiceId: string;
  voices: Record<'en' | 'zh', string>;
  asrModel: string;
  ttsModel: string;
  asrRate: number | null;
  ttsRate: number | null;
};
export type VoiceProvider = import('./base').JoeVoice;
