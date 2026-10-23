import { voiceConfig } from './config';
import { fishProvider } from './fish';
import { elevenLabsProvider } from './elevenlabs';
import type { VoiceCapability, VoiceProvider } from './types';
export function getVoiceProvider(capability: VoiceCapability): VoiceProvider {
  const config = voiceConfig(capability);
  if (!config.token || (capability === 'tts' && !Object.values(config.voices).some(Boolean)))
    throw new Error(`请先配置 ${config.label} ${capability === 'tts' ? 'API 凭据和音色 ID' : 'API 凭据'}`);
  return config.id === 'fish' ? fishProvider(config) : elevenLabsProvider(config);
}
