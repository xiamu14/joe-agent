import { conversationMessages, inFlight } from './conversations';
import { buffer } from 'node:stream/consumers';
import { z } from 'zod';
import { store } from './store';
import { idSchema } from './schema';
import { voiceError } from './voice-errors';
import { getVoiceProvider } from './voice-providers';
import { supportedTranscript } from './input-language';

// Application layer owns validation, sessions, cancellation and accounting.
export async function transcribe(form: FormData, signal: AbortSignal) {
  const sessionId = idSchema.parse(form.get('sessionId'));
  store.requireSession(sessionId);
  const audio = form.get('audio');
  if (!(audio instanceof File) || audio.size === 0 || audio.size > 12 * 1024 * 1024)
    throw new Error('录音必须小于 12MB');
  if (!/^audio\/(webm|ogg|mp4|wav|mpeg)(;|$)/.test(audio.type)) throw new Error('不支持的录音格式');
  const provider = getVoiceProvider('asr'),
    { config } = provider;
  try {
    const text = await provider.listen(audio, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(90000)]),
    });
    return { text: form.get('supportedLanguages') === 'zh,en' ? await supportedTranscript(typeof text === 'string' ? text : '', signal) : text };
  } catch (error) {
    throw voiceError(error, '语音识别', config.label);
  }
}
const speechSchema = z.object({
  sessionId: idSchema,
  turnId: idSchema,
  text: z.string().trim().min(1).max(1200),
  language: z.enum(['en', 'zh']),
});
export async function synthesize(body: unknown, signal: AbortSignal) {
  const input = speechSchema.parse(body);
  store.requireSession(input.sessionId);
  const message =
    inFlight.get(input.turnId) ??
    (await conversationMessages(input.sessionId)).find(
      (m) => m.turnId === input.turnId && m.role === 'assistant',
    );
  if (!message || message.sessionId !== input.sessionId || ['error', 'interrupted'].includes(message.status))
    throw new Error('回答已停止或不存在');
  const provider = getVoiceProvider('tts'),
    { config } = provider;
  const speaker = config.voices[input.language];
  if (!speaker) throw new Error(`尚未配置 ${input.language === 'en' ? 'English' : 'Chinese'} 音色`);
  try {
    const result = await provider.speak(input.text, {
      speaker,
      signal: AbortSignal.any([signal, AbortSignal.timeout(60000)]),
    });
    if (!result) throw new Error('语音服务没有返回音频');
    return new Response(new Uint8Array(await buffer(result)), {
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    throw voiceError(error, '语音合成', config.label);
  }
}

export async function startVoiceInput(body: unknown, signal: AbortSignal) {
  const { sessionId } = z.object({ sessionId: idSchema }).parse(body);
  store.requireSession(sessionId);
  const provider = getVoiceProvider('asr');
  if (!provider.createRealtimeSession) return { mode: 'batch' as const };
  try {
    const session = await provider.createRealtimeSession(
      AbortSignal.any([signal, AbortSignal.timeout(15000)]),
    );
    return session;
  } catch (error) {
    throw voiceError(error, '实时语音连接', provider.config.label);
  }
}
