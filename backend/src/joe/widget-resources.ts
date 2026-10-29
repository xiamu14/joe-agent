import { z } from 'zod';

const weather = z.object({
  configured: z.literal(true), place: z.string(), temperature: z.number(),
  condition: z.string(), conditionCode: z.number(), isDay: z.boolean(),
  timezone: z.string(), updatedAt: z.number(),
}).passthrough();
const video = z.object({ publishedAt: z.string().optional(), views: z.number().nonnegative().optional(), id: z.string().regex(/^[\w-]{11}$/), title: z.string().min(1).max(300), channel: z.string().max(300), thumbnail: z.string().url().refine(value => new URL(value).hostname === 'i.ytimg.com') });
export const resourceSchemas = {
  'weather@1': weather,
  'youtube.search@1': z.object({ query: z.string().min(1).max(200), videos: z.array(video).max(20) }),
} as const;
export type ResourceSchema = keyof typeof resourceSchemas;
export function validateResource(schema: ResourceSchema, data: unknown) {
  return resourceSchemas[schema].parse(data);
}
