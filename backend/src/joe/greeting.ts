import { nanoid } from 'nanoid';
import type { Message } from './store';

export const greetingText = '我是 Joe，今天过的怎么样？';
export const greetingAudio = '/audio/greeting-joe.mp3';

export function greetingMessage(sessionId: string): Message {
  return {
    id: nanoid(), sessionId, turnId: nanoid(), role: 'assistant',
    text: greetingText, kind: 'greeting', audioUrl: greetingAudio,
    status: 'complete', model: 'greeting', expression: { emotion: 'empathy', intensity: 0.4 },
    attachments: [], createdAt: Date.now(),
  };
}
