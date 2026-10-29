import test from 'node:test';
import assert from 'node:assert/strict';
import { chatTimes } from '../src/joe/chat-time.ts';

test('adds local time after gaps over an hour and dates after a day', () => {
  const start = new Date(2026, 0, 1, 3, 0).getTime();
  const messages = [
    { id: 'greeting', createdAt: start },
    { id: 'one-hour', createdAt: start + 60 * 60 * 1000 },
    { id: 'later', createdAt: new Date(2026, 0, 1, 5, 7).getTime() },
    { id: 'next-day', createdAt: new Date(2026, 0, 2, 5, 7).getTime() },
  ];
  assert.deepEqual([...chatTimes(messages, new Date(2026, 0, 2, 6))], [['later', '1/1 5:07'], ['next-day', '2/1 5:07']]);
  assert.deepEqual([...chatTimes([{ id: 'bad', createdAt: NaN }, messages[0]])], []);
});

 test('shows dates for yesterday even when the gap is less than a day', () => {
  const messages = [
    { id: 'first', createdAt: new Date(2026, 9, 28, 10).getTime() },
    { id: 'yesterday', createdAt: new Date(2026, 9, 28, 13, 26).getTime() },
    { id: 'today', createdAt: new Date(2026, 9, 29, 8, 5).getTime() },
  ];
  assert.deepEqual([...chatTimes(messages, new Date(2026, 9, 29, 9))], [['yesterday', '28/10 13:26'], ['today', '8:05']]);
});
