import { z } from 'zod';
import { idSchema } from './id';
import { resourceSchemas } from './widget-resources';

export const widgetInstanceSchema = z.object({
  instanceId: idSchema,
  widgetType: z.enum(['builtin.costs', 'builtin.settings', 'builtin.weather', 'youtube.video']),
  visible: z.boolean(),
  revision: z.number().int().nonnegative(),
}).passthrough();

const resourceBase = { resourceId: idSchema, revision: z.number().int().positive() };
export const widgetSnapshotSchema = z.object({
  instance: widgetInstanceSchema,
  resource: z.discriminatedUnion('schema', [
    z.object({ ...resourceBase, schema: z.literal('weather@1'), data: resourceSchemas['weather@1'] }).passthrough(),
    z.object({ ...resourceBase, schema: z.literal('youtube.search@1'), data: resourceSchemas['youtube.search@1'] }).passthrough(),
  ]),
});

export type WidgetSnapshot = z.infer<typeof widgetSnapshotSchema>;
export const beginWidgetSchema = z.custom<() => (data: unknown) => WidgetSnapshot>(
  value => typeof value === 'function', '卡片更新能力无效',
);
