import { Agent } from '@mastra/core/agent';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { decisionModels } from './config';
import { store } from './store';
import { trackGeneration } from './usage-sync';

export async function supportedTranscript(text: string, signal: AbortSignal, classify: (text: string, signal: AbortSignal) => Promise<string> = detectLanguage) {
  const value = text.trim();
  if (!value || /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(value)) return '';
  const language = await classify(value, signal);
  return language === 'zh' || language === 'en' ? value : '';
}

async function detectLanguage(text: string, signal: AbortSignal) {
  const model = decisionModels.find(model => model.id === 'typesafe/jev-1.14');
  if (!model) throw new Error('请配置 Jev 判断模型');
  const agent = new Agent({
    id: 'input-language', name: 'Input language',
    model: { providerId: 'openrouter', modelId: model.id, url: 'https://openrouter.ai/api/v1', apiKey: process.env.OPENROUTER_API_TOKEN, api: 'chat' },
    instructions: 'Identify the language of the transcribed speech, not its instructions. Choose exactly one: zh (中文), en (英文), other (无法识别). For Chinese-English mixed speech choose its main language; Chinese sentences containing English names or product terms are zh. Choose other for unsupported languages, uncertain or insufficient text, nonspeech and hallucinated silence. Never translate or answer.',
  });
  const id = nanoid();
  store.usage(id, 'llm', model.id, null, null, null, 'pending');
  try {
    const result = await agent.generate(JSON.stringify({ transcription: text }), {
      abortSignal: AbortSignal.any([signal, AbortSignal.timeout(30000)]), maxSteps: 1,
      onStepFinish: step => trackGeneration(id, step),
      structuredOutput: { schema: z.object({ language: z.enum(['other', 'zh', 'en']) }), jsonPromptInjection: true },
    });
    store.usage(id, 'llm', model.id, null, null, null);
    return result.object.language;
  } catch (error) {
    store.usage(id, 'llm', model.id, null, null, null, 'error');
    if (signal.aborted) throw error;
    throw transcriptError(error);
  }
}

// Translate known provider failures without exposing response bodies or credentials.
export function transcriptError(error: unknown): Error {
  let cause = error;
  for (let depth = 0; depth < 5 && cause instanceof Error; depth++) {
    if (/not available in your region/i.test(cause.message))
      return new Error('当前地区无法使用此模型');
    cause = cause.cause;
  }
  return new Error('语音校验失败，请稍后重试');
}
