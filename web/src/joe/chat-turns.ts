import type { Message } from './types';

export function chatTurns(messages: Message[]) {
  const turns = new Map<string, { id: string; question: string; answer?: Message }>();
  for (const message of messages) {
    if (message.kind === 'greeting') continue;
    const current = turns.get(message.turnId) ?? { id: message.turnId, question: '' };
    if (message.role === 'user') current.question = message.text;
    else current.answer = message;
    turns.set(message.turnId, current);
  }
  return [...turns.values()];
}
