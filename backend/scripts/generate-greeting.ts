import { buffer } from 'node:stream/consumers';
import { writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { voiceConfig } from '../src/joe/voice-providers/config';
import { elevenLabsProvider } from '../src/joe/voice-providers/elevenlabs';
import { greetingAudio, greetingText } from '../src/joe/greeting';

const target = resolve(import.meta.dirname, '../../web/public', `.${greetingAudio}`);
try {
  await access(target);
  console.log('Greeting audio already exists; keeping the fixed recording.');
} catch {
  const config = voiceConfig('tts', { ...process.env, JOE_TTS_PROVIDER: 'elevenlabs' });
  if (!config.token || !config.voices.zh) throw new Error('请配置 ElevenLabs API key 和中文音色');
  const audio = await elevenLabsProvider(config).speak(greetingText, {
    speaker: config.voices.zh, signal: AbortSignal.timeout(60000),
  });
  if (!audio) throw new Error('问候语音生成失败');
  await writeFile(target, await buffer(audio), { flag: 'wx' });
  console.log('Saved fixed ElevenLabs Chinese greeting audio.');
}
