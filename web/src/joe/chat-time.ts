import type { Message } from './types';

export function chatTimes(messages: Message[], now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const times = new Map<string, string>();
  for (let index = 1; index < messages.length; index++) {
    const previous = messages[index - 1].createdAt;
    const message = messages[index];
    const elapsed = message.createdAt - previous;
    if (!Number.isFinite(elapsed) || elapsed <= 60 * 60 * 1000) continue;
    const date = new Date(message.createdAt);
    if (!Number.isFinite(date.getTime())) continue;
    const day = (message.createdAt < today || elapsed >= 24 * 60 * 60 * 1000) ? `${date.getDate()}/${date.getMonth() + 1} ` : '';
    times.set(message.id, `${day}${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`);
  }
  return times;
}
