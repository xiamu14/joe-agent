import { parseJsonEventStream } from '@ai-sdk/provider-utils';
import { uiMessageChunkSchema } from 'ai';
import type { AgentEvent } from './types';

export async function readEvents(response: Response, onEvent: (event: AgentEvent) => void) {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || '无法开始回答');
  }
  if (!response.body) throw new Error('服务端没有返回流');
  let completed = false;
  let sessionId = '',
    turnId = '';
  const reader = parseJsonEventStream({
    stream: response.body,
    schema: uiMessageChunkSchema,
  }).getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value.success) throw value.error;
      const chunk = value.value;
      if (chunk.type === 'data-joe') {
        const event = chunk.data as AgentEvent;
        sessionId = event.sessionId;
        turnId = event.turnId;
        if (event.type === 'message.completed') completed = true;
        onEvent(event);
      } else if (chunk.type === 'text-delta') {
        onEvent({
          type: 'text.delta',
          text: chunk.delta,
          sessionId,
          turnId,
        } as AgentEvent);
      } else if (chunk.type === 'error') throw new Error(chunk.errorText);
    }
    if (!completed) throw new Error('连接中断，回答尚未完成');
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
export function extractSentence(buffer: string, flush = false): [string, string] {
  const boundary = buffer.search(/[。！？!?\n]|\.(?:\s|$)/);
  const length =
    boundary >= 0 ? Math.min(boundary + 1, 240) : buffer.length >= 240 ? 240 : flush ? buffer.length : 0;
  return [buffer.slice(0, length).trim(), buffer.slice(length)];
}

export function extractSpeech(buffer: string): [string, string] {
  let length = Math.min(buffer.length, 1200);
  if (length < buffer.length) {
    const boundary = [...buffer.slice(0, length).matchAll(/[。！？!?\n]|\.(?:\s|$)/g)].at(-1);
    if (boundary) length = boundary.index + 1;
    // Keep a surrogate pair together when a long sentence has no punctuation.
    else if (/[\uD800-\uDBFF]/.test(buffer[length - 1])) length--;
  }
  return [buffer.slice(0, length).trim(), buffer.slice(length)];
}
