import { randomUUID } from 'node:crypto';
import type { Message } from './store';

export const greetingText = '我在呢，今天过得怎么样？';
export const greetingAudio = '/audio/greeting-zh.mp3';

export function greetingMessage(sessionId: string): Message {
  return {
    id: randomUUID(), sessionId, turnId: randomUUID(), role: 'assistant',
    text: greetingText, kind: 'greeting', audioUrl: greetingAudio,
    status: 'complete', model: 'greeting', expression: { emotion: 'empathy', intensity: 0.4 },
    attachments: [], createdAt: Date.now(),
  };
}
