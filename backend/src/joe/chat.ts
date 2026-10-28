import { desktopExecutor } from './desktop';
import { randomUUID } from 'node:crypto';
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { RequestContext } from '@mastra/core/request-context';
import type { MastraDBMessage } from '@mastra/core/memory';
import { chatSchema, fallbackExpression, answerSchema, expressionSchema } from './schema';
import { store, type Message } from './store';
import { modelById, configured } from './config';
import { joeAgent, sourceSchema } from './agent';
import { resourceId, joeMemory } from './memory';
import { ensureConversation, threadId, memoryMessage, persistTurn, inFlight } from './conversations';
import { z } from 'zod';
import { trackGeneration } from './usage-sync';

const active = new Map<string, { turnId: string; controller: AbortController; done: Promise<void> }>();
export function cancelTurn(sessionId: string, turnId: string) {
  const turn = active.get(sessionId);
  if (turn?.turnId === turnId) {
    turn.controller.abort();
    return turn.done;
  }
}
export async function chat(body: unknown, requestSignal: AbortSignal) {
  const input = chatSchema.parse(body);
  store.requireSession(input.sessionId);
  if (!configured().llm) throw new Error('请先配置 OpenRouter API_TOKEN 和模型列表');
  const model = modelById(input.model);
  if (active.has(input.sessionId)) throw new Error('当前会话仍在回答，请先停止');
  if (store.hasTurn(input.turnId)) throw new Error('此轮次已提交，请勿重复发送');
  const attachments = input.attachmentIds.map((id) => store.attachment(input.sessionId, id));
  const controller = new AbortController();
  const signal = AbortSignal.any([controller.signal, requestSignal, AbortSignal.timeout(180000)]);
  const common = {
    sessionId: input.sessionId,
    turnId: input.turnId,
    model: model.id,
    expression: fallbackExpression,
    createdAt: Date.now(),
  };
  const user: Message = {
    ...common,
    id: randomUUID(),
    role: 'user',
    text: input.text,
    status: 'complete',
    attachments: attachments.map(({ id, name }) => ({ id, name })),
  };
  const answer: Message = {
    ...common,
    id: randomUUID(),
    role: 'assistant',
    text: '',
    status: 'streaming',
    attachments: [],
  };
  let settled!: () => void;
  const done = new Promise<void>((resolve) => {
    settled = resolve;
  });
  active.set(input.sessionId, { turnId: input.turnId, controller, done });
  try {
    await ensureConversation(input.sessionId);
  } catch (error) {
    active.delete(input.sessionId);
    settled();
    throw error;
  }
  inFlight.set(input.turnId, answer);
  store.usage(input.turnId, 'llm', model.id, null, null, null, 'pending');
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const emit = (type: string, data: Record<string, unknown> = {}) => {
        if (type === 'text.delta')
          writer.write({
            type: 'text-delta',
            id: answer.id,
            delta: String(data.text),
          });
        else
          writer.write({
            type: 'data-joe',
            data: {
              type,
              sessionId: input.sessionId,
              turnId: input.turnId,
              ...data,
            },
            transient: true,
          });
      };
      writer.write({ type: 'start', messageId: answer.id });
      writer.write({ type: 'text-start', id: answer.id });
      const update = (value: Partial<z.infer<typeof answerSchema>>) => {
        const expression = expressionSchema.safeParse(value.expression);
        if (expression.success) {
          answer.expression = expression.data;
          emit('expression', { expression: expression.data });
        }
        if (typeof value.text === 'string' && value.text.startsWith(answer.text)) {
          const delta = value.text.slice(answer.text.length);
          if (delta) {
            answer.text = value.text;
            emit('state', { state: 'responding' });
            emit('text.delta', { text: delta });
          }
        }
      };
      let native: MastraDBMessage[] = [];
      let traceId: string | undefined;
      let collectNative: (() => MastraDBMessage[]) | undefined;
      const slow = setTimeout(() => emit('state', { state: 'blocked', detail: '正在等待模型响应' }), 12000);

      try {
        emit('messages', { user, assistant: answer });
        emit('state', { state: 'thinking' });
        const requestContext = new RequestContext();
        requestContext.set('model', model.id);
        if (input.desktop) {
          requestContext.set('desktop.state', JSON.stringify(input.desktop));
          requestContext.set('desktop.execute', desktopExecutor(input.sessionId, input.turnId, signal, emit));
        }
        const result = await joeAgent.stream([memoryMessage(user)], {
          requestContext,
          abortSignal: signal,
          maxSteps: input.desktop ? 10 : 4,
          onStepFinish: (step) => {
            trackGeneration(input.turnId, step);
          },
          structuredOutput: { schema: answerSchema, jsonPromptInjection: true },
          memory: { thread: threadId(input.sessionId), resource: resourceId },
        });
        traceId = result.traceId;
        collectNative = () => [...result.messageList.get.input.db(), ...result.messageList.get.response.db()];
        const objects = (async () => {
          for await (const value of result.objectStream) {
            clearTimeout(slow);
            if (!signal.aborted) update(value);
          }
        })();
        // Observe tools alongside Mastra's schema-aware object stream.
        const events = (async () => {
          for await (const chunk of result.fullStream) {
            if (signal.aborted) break;
            if (chunk.type === 'tool-call') {
              clearTimeout(slow);
              emit('state', { state: 'tool-running' });
            }
            if (chunk.type === 'tool-result') {
              emit('state', { state: 'thinking' });
              const found = z.object({ sources: z.array(sourceSchema) }).safeParse(chunk.payload.result);
              if (found.success) {
                answer.sources = found.data.sources.map(({ title, url }) => ({
                  title,
                  url,
                }));
                emit('sources', { sources: answer.sources });
              }
            }
            if (chunk.type === 'error') throw chunk.payload.error;
          }
        })();
        const settled = await Promise.allSettled([objects, events]);
        const full = await result.getFullOutput();
        const previous = new Set(full.rememberedMessages.map((m) => m.id));
        native = full.messages.filter((m) => !previous.has(m.id));
        const failed = settled.find((r) => r.status === 'rejected');
        if (failed?.status === 'rejected') throw failed.reason;
        if (signal.aborted) throw new Error('cancelled');
        const final = await result.object;
        if (!final.text.startsWith(answer.text))
          throw new Error('Structured output changed its streamed prefix');
        update(final);
        if (final.card) emit('card.open', { card: final.card });

        if (!answer.text.trim()) throw new Error('模型未返回正文');
        const usage = await result.totalUsage;
        await joeMemory.settled({
          threadId: threadId(input.sessionId),
          resourceId,
        });
        const count = (value: unknown): number | null =>
          typeof value === 'number'
            ? value
            : value && typeof value === 'object' && 'total' in value && typeof value.total === 'number'
              ? value.total
              : null;
        const inputTokens = count(usage.inputTokens),
          outputTokens = count(usage.outputTokens);
        const cost =
          inputTokens !== null &&
          outputTokens !== null &&
          model.inputPerMillion !== undefined &&
          model.outputPerMillion !== undefined
            ? (inputTokens * model.inputPerMillion + outputTokens * model.outputPerMillion) / 1e6
            : null;
        store.usage(input.turnId, 'llm', model.id, inputTokens, outputTokens, cost);
        answer.status = 'complete';
      } catch (error) {
        native = collectNative?.() ?? native;
        const diagnostic = error && typeof error === 'object' && 'id' in error && error.id === 'STRUCTURED_OUTPUT_SCHEMA_VALIDATION_FAILED' && 'details' in error && error.details && typeof error.details === 'object' && 'value' in error.details ? error.details.value : undefined;
        const plainText = typeof diagnostic === 'string' && diagnostic.trim() && !/^(?:undefined|null)$/.test(diagnostic.trim()) && !/^[\s]*[\[{`]/.test(diagnostic) && diagnostic.startsWith(answer.text) ? diagnostic : '';
        if (!signal.aborted && plainText) {
          update({ text: plainText });
          answer.status = 'complete';
          store.usage(input.turnId, 'llm', model.id, null, null, null);
        } else {
          if (!signal.aborted)
            console.error('Joe turn failed', {
              turnId: input.turnId,
              traceId,
              name: error instanceof Error ? error.name : 'ProviderError',
              status:
                error && typeof error === 'object' && 'statusCode' in error ? error.statusCode : undefined,
            });
          answer.status = signal.aborted ? 'interrupted' : 'error';
          emit('state', { state: signal.aborted ? 'interrupted' : 'error' });
          if (!signal.aborted) emit('error', { message: '回答暂时不可用，请重试。' });
          store.usage(input.turnId, 'llm', model.id, null, null, null, answer.status);
        }
      } finally {
        clearTimeout(slow);
        try {
          await joeMemory.settled({
            threadId: threadId(input.sessionId),
            resourceId,
          });
          await persistTurn(user, answer, native);
        } catch {
          answer.status = 'error';
          emit('error', { message: '会话保存失败，请检查本地数据库。' });
        } finally {
          active.delete(input.sessionId);
          inFlight.delete(input.turnId);
          settled();
        }
        emit('message.completed', { message: answer });
        writer.write({ type: 'text-end', id: answer.id });
        writer.write({ type: 'finish' });
      }
    },
    onError: () => '回答连接中断',
  });
  const response = createUIMessageStreamResponse({
    stream,
    headers: { 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' },
  });
  const reader = response.body!.getReader();
  return new Response(
    new ReadableStream({
      async pull(out) {
        const { done, value } = await reader.read();
        if (done) out.close();
        else out.enqueue(value);
      },
      async cancel(reason) {
        controller.abort();
        await reader.cancel(reason);
      },
    }),
    { headers: response.headers },
  );
}
