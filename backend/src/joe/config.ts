import { z } from 'zod';
import { JOE_MODELS_JSON } from '../config/models';
import { voiceStatus } from './voice-providers/config';

export const modelSchema = z.object({
  id: z.string().min(1).max(150),
  type: z.enum(['Think', 'Decision']).default('Think'),
  label: z.string().min(1).max(100),
  inputPerMillion: z.number().nonnegative().optional(),
  outputPerMillion: z.number().nonnegative().optional(),
});
export type Model = z.infer<typeof modelSchema>;
export function loadModels(raw = JSON.stringify(JOE_MODELS_JSON)): Model[] {
  const models = z.array(modelSchema).max(30).parse(JSON.parse(raw));
  if (new Set(models.map((m) => m.id)).size !== models.length) throw new Error('Duplicate model ID');
  return models;
}
const configuredModels = loadModels();
export const models = configuredModels.filter(model => model.type === 'Think');
export const decisionModels = configuredModels.filter(model => model.type === 'Decision');
export function modelById(id: string) {
  const model = models.find((m) => m.id === id);
  if (!model) throw new Error('请选择已配置的思考模型');
  return model;
}
export function configured() {
  const voice = voiceStatus();
  return {
    llm: Boolean(process.env.OPENROUTER_API_TOKEN && models.length),
    asr: voice.asr,
    tts: voice.tts,
    voiceProviders: voice.providers,
    voiceProfiles: voice.profiles,
    zendocs: Boolean(process.env.ZENDOCS_SEARCH_URL),
  };
}
