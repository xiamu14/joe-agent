import { z } from 'zod';
export const emotionSchema = z.enum([
  'calm',
  'curious',
  'joy',
  'empathy',
  'encouraging',
  'serious',
  'concerned',
]);
export const expressionSchema = z.object({
  emotion: emotionSchema,
  intensity: z.number().min(0).max(1),
});
export const answerSchema = z.object({
  expression: expressionSchema,
  text: z.string().min(1),
  card: z.enum(['time', 'costs', 'background', 'settings']).optional(),
});
export type Expression = z.infer<typeof expressionSchema>;
export const fallbackExpression: Expression = {
  emotion: 'calm',
  intensity: 0.35,
};
export const idSchema = z.string().uuid();
export const voiceLanguageSchema = z.enum(['auto', 'en', 'zh']);
export const settingsSchema = z.object({
  voice: z.boolean().default(true),
  defaultMuted: z.boolean().default(false),
  voiceLanguage: voiceLanguageSchema.default('auto'),
  model: z.string().max(150).default(''),
  city: z.string().max(100).default(''),
  timezone: z
    .string()
    .refine((v) => {
      try {
        new Intl.DateTimeFormat('en', { timeZone: v });
        return true;
      } catch {
        return false;
      }
    })
    .default('Asia/Shanghai'),
});
export const chatSchema = z
  .object({
    sessionId: idSchema,
    turnId: idSchema,
    text: z.string().trim().max(12000),
    model: z.string().max(150),
    attachmentIds: z.array(idSchema).max(5).default([]),
  })
  .refine((v) => v.text.length > 0 || v.attachmentIds.length > 0, '请输入消息或添加文件');
export function dayKey(time: number, timezone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(time);
}
