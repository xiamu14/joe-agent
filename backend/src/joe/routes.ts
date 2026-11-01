import { canvasStore } from './widget-runtime';
import { behaviorStore } from './behavior-runtime';
import { summarizeWatches } from './video-behavior';
import { resourceId as memoryResourceId } from './memory';
import type { WatchData } from '../../../shared/widget-behavior';
import { finishDesktopAction } from './desktop';
import { registerApiRoute, type ContextWithMastra as Context } from '@mastra/core/server';
import { z } from 'zod';
import { configured, models, modelById } from './config';
import { store } from './store';
import { widgetStore } from './widget-runtime';
import { widgetEventStream } from './widget-events';
import { idSchema, settingsSchema } from './schema';
import { chat, cancelTurn } from './chat';
import { synthesize, transcribe, startVoiceInput } from './voice';
import { prepareSpeech } from './speech-text';
import { voiceAccounts } from './voice-account';
import { providerBilling } from './provider-billing';
import { currentWeather } from './weather';
import { conversationMessages } from './conversations';
import { mastraStorage } from './memory';
import { supportedTranscript } from './input-language';
import { attachFile, imageLimit } from './attachments';

const allowedOrigins = new Set(
  (process.env.JOE_WEB_ORIGINS || 'http://127.0.0.1:5173,http://localhost:5173').split(','),
);
async function limitedBody(request: Request, limit: number) {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        throw new Error('请求内容过大');
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return bytes;
}
async function json(c: Context) {
  return JSON.parse(new TextDecoder().decode(await limitedBody(c.req.raw, 64 * 1024)));
}
async function form(c: Context, limit: number) {
  const bytes = await limitedBody(c.req.raw, limit);
  return new Response(bytes as BodyInit, {
    headers: { 'Content-Type': c.req.header('content-type') || '' },
  }).formData();
}
function route(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  handler: (c: Context) => Promise<Response> | Response,
) {
  return registerApiRoute(`/joe-api${path}`, {
    method,
    handler: async (c) => {
      // This single-user service is loopback-only; reject browser cross-origin calls.
      const origin = c.req.header('origin');
      const host = c.req.header('host')?.split(':')[0];
      if (!['127.0.0.1', 'localhost'].includes(host || '') || (origin && !allowedOrigins.has(origin)))
        return c.json({ error: '不允许的请求来源' }, 403);
      if (c.req.header('sec-fetch-site') === 'cross-site') return c.json({ error: '不允许跨站请求' }, 403);
      try {
        return await handler(c);
      } catch (error) {
        const message =
          error instanceof z.ZodError ? '请求参数无效' : error instanceof Error ? error.message : '请求失败';
        return c.json({ error: message.slice(0, 180) }, 400);
      }
    },
  });
}
export const routes = [
  route('/behaviors', 'POST', async c => c.json(behaviorStore.accept(await json(c), memoryResourceId))),
  route('/video-watches', 'GET', c => {
    const canvasId = c.req.query('canvasId');
    if (canvasId) widgetStore.requireCanvas(canvasId);
    c.header('Cache-Control', 'no-store');
    const records = behaviorStore.records(memoryResourceId, canvasId, 'youtube.video');
    return c.json({ records, summary: summarizeWatches(records.map(record => record.payload as WatchData)) });
  }),
  route('/health', 'GET', async (c) => {
    await mastraStorage.init();
    return c.json({ service: 'joe-backend', ready: true });
  }),
  route('/bootstrap', 'GET', (c) =>
    c.json({
      models,
      configured: configured(),
      settings: store.settings(),
      usage: store.summary(store.settings().timezone),
    }),
  ),
  route('/settings', 'PUT', async (c) => {
    const value = settingsSchema.parse(await json(c));
    if (value.model) modelById(value.model);
    return c.json(store.saveSettings(value));
  }),
  route('/session', 'POST', async (c) => {
    const body = z.object({ id: idSchema.optional(), workspaceId: idSchema.optional(), slot: z.number().int().min(0).max(1).optional(), canvasId: idSchema.optional(), initialCards: z.array(z.enum(['costs', 'settings', 'weather', 'video', 'finance'])).max(5).default([]) }).parse(await json(c));
    const id = store.session(body.id, true);
    let canvasId = widgetStore.canvasForSession(id);
    if (body.canvasId) {
      widgetStore.requireCanvas(body.canvasId);
      canvasId = body.canvasId;
    }
    if (body.workspaceId && body.slot !== undefined) canvasId = canvasStore.bind(body.workspaceId, body.slot, canvasId);
    store.db.prepare('UPDATE widget_session_canvases SET canvas_id=? WHERE session_id=?').run(canvasId, id);
    widgetStore.initializeCanvas(canvasId, body.initialCards);
    const widgets = widgetStore.snapshot(canvasId);
    return c.json({ id, canvasId, canvas: canvasStore.metadata(canvasId), widgets: widgets.instances, widgetResources: widgets.resources, widgetCursor: widgets.cursor, created: id !== body.id, messages: await conversationMessages(id) });
  }),
  route('/widget-visibility', 'POST', async (c) => {
    const input = z.object({ sessionId: idSchema, card: z.enum(['costs', 'settings', 'weather', 'video', 'finance']), visible: z.boolean() }).parse(await json(c));
    store.requireSession(input.sessionId);
    return c.json({ instance: widgetStore.presentBuiltin(widgetStore.canvasForSession(input.sessionId), input.card, input.visible) });
  }),
  route('/widget-events', 'GET', (c) => {
    const sessionId = idSchema.parse(c.req.query('sessionId'));
    store.requireSession(sessionId);
    const canvasId = widgetStore.canvasForSession(sessionId);
    const value = c.req.header('last-event-id') || c.req.query('cursor') || '0';
    const cursor = z.coerce.number().int().nonnegative().safe().parse(value);
    return widgetEventStream(widgetStore, canvasId, cursor, c.req.raw.signal);
  }),
  route('/voice-account', 'GET', async (c) => {
    c.header('Cache-Control', 'no-store');
    return c.json(await voiceAccounts());
  }),
  route('/usage', 'GET', async (c) => {
    c.header('Cache-Control', 'no-store');
    return c.json({ ...store.summary(store.settings().timezone), billing: await providerBilling() });
  }),
  route('/weather', 'POST', async (c) => {
    const { clientIp } = z.object({ clientIp: z.string().max(45).optional() }).parse(await json(c));
    return c.json(await currentWeather(clientIp, c.req.raw.signal));
  }),
  route('/desktop-result', 'POST', async (c) => {
    finishDesktopAction(await json(c));
    return c.json({ ok: true });
  }),
  route('/chat', 'POST', async (c) => chat(await json(c), c.req.raw.signal)),
  route('/cancel', 'POST', async (c) => {
    const value = z.object({ sessionId: idSchema, turnId: idSchema }).parse(await json(c));
    await cancelTurn(value.sessionId, value.turnId);
    return c.json({ ok: true });
  }),
  route('/speech-text', 'POST', async (c) => c.json(await prepareSpeech(await json(c), c.req.raw.signal))),
  route('/speech', 'POST', async (c) => synthesize(await json(c), c.req.raw.signal)),
  route('/voice-input', 'POST', async (c) => {
    c.header('Cache-Control', 'no-store');
    return c.json(await startVoiceInput(await json(c), c.req.raw.signal));
  }),
  route('/transcribe', 'POST', async (c) =>
    c.json(await transcribe(await form(c, 13 * 1024 * 1024), c.req.raw.signal)),
  ),
  route('/validate-transcript', 'POST', async (c) => {
    const input = z.object({ sessionId: idSchema, text: z.string().max(12000) }).parse(await json(c));
    store.requireSession(input.sessionId);
    return c.json({ text: await supportedTranscript(input.text, c.req.raw.signal) });
  }),
  route('/attachments', 'POST', async (c) => {
    const data = await form(c, imageLimit + 8192);
    const session = idSchema.parse(data.get('sessionId'));
    const file = data.get('file');
    if (!(file instanceof File)) throw new Error('请选择附件');
    return c.json(await attachFile(store, session, file));
  }),
  route('/attachments/content', 'GET', c => {
    const session = idSchema.parse(c.req.query('sessionId'));
    const id = idSchema.parse(c.req.query('id'));
    const image = store.image(session, id);
    if (!image) throw new Error('图片不存在或不属于当前会话');
    return new Response(new Uint8Array(image.bytes), { headers: {
      'Content-Type': image.mime, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'", 'Content-Disposition': 'inline',
    } });
  }),
  route('/attachments', 'DELETE', async (c) => {
    const value = z.object({ sessionId: idSchema, id: idSchema }).parse(await json(c));
    if (
      (await conversationMessages(value.sessionId)).some((m) => m.attachments.some((a) => a.id === value.id))
    )
      throw new Error('已发送的附件不能删除');
    store.deleteAttachment(value.sessionId, value.id);
    return c.json({ ok: true });
  }),
];
