import { test, expect } from 'bun:test';
import { enqueueBehavior, flushBehaviors } from '../src/joe/behavior/delivery';
import type { BehaviorSubmission } from '../../shared/widget-behavior';

test('delivery preserves IDs across failures, restores disk records, and keeps newer in-flight checkpoints', async () => {
  const oldFetch = globalThis.fetch, oldStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const data = new Map<string, string>();
  const storage = { get length() { return data.size; }, key: (i: number) => [...data.keys()][i],
    getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => data.set(k, v), removeItem: (k: string) => data.delete(k) };
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
  const initial = { sessionId: 'session', event: { recordId: 'record', eventId: 'event1', revision: 1 } } as BehaviorSubmission;
  const calls: string[] = [];
  try {
    globalThis.fetch = (async (_url, options) => { calls.push(String(options?.body)); throw new Error('offline'); }) as typeof fetch;
    enqueueBehavior(initial);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(data.size).toBe(1);
    let release!: (value: Response) => void;
    globalThis.fetch = (async (_url, options) => {
      calls.push(String(options?.body));
      if (JSON.parse(String(options?.body)).event.eventId === 'event1') return new Promise<Response>(resolve => { release = resolve; });
      return Response.json({ eventId: 'event2' });
    }) as typeof fetch;
    const uploading = flushBehaviors();
    enqueueBehavior({ ...initial, event: { ...initial.event, eventId: 'event2', revision: 2 } });
    release(Response.json({ eventId: 'event1' }));
    await uploading;
    expect(JSON.parse([...data.values()][0]).event.eventId).toBe('event2');
    await flushBehaviors();
    expect(data.size).toBe(0);
    expect(calls[0]).toBe(calls[1]);
    data.set('widget-behavior:pending:v1:restored', JSON.stringify({ ...initial, event: { ...initial.event, recordId: 'restored', eventId: 'event2' } }));
    await flushBehaviors();
    expect(data.size).toBe(0);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldStorage) Object.defineProperty(globalThis, 'localStorage', oldStorage);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
