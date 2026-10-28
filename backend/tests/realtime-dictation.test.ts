import test from 'node:test';
import assert from 'node:assert/strict';
import { startRealtimeDictation } from '../../web/src/joe/voice-input/realtime-dictation';

test('live dictation previews verified partials while speech continues and commits once', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const oldSocket = globalThis.WebSocket, oldNode = globalThis.AudioWorkletNode;
  let socket!: FakeSocket;
  class FakeSocket {
    static OPEN = 1; readyState = 1; bufferedAmount = 0;
    onmessage: ((event: { data: string }) => void) | null = null;
    onclose: (() => void) | null = null; onerror: (() => void) | null = null;
    constructor() { socket = this; } close() {} send() {}
  }
  class FakeNode { port = { onmessage: null }; connect() {} disconnect() {} }
  globalThis.WebSocket = FakeSocket as unknown as typeof WebSocket;
  globalThis.AudioWorkletNode = FakeNode as unknown as typeof AudioWorkletNode;
  t.mock.method(globalThis, 'fetch', async (_url, options) => Response.json({ text: JSON.parse(String(options?.body)).text }));
  const context = { sampleRate: 16000, state: 'running', audioWorklet: { addModule: async () => {} }, createMediaStreamSource: () => ({ connect() {}, disconnect() {} }), createGain: () => ({ gain: { value: 1 }, connect() {}, disconnect() {} }), destination: {} } as unknown as AudioContext;
  const previews: string[] = [], texts: string[] = [];
  let finished = false;
  try {
    const capture = await startRealtimeDictation({} as MediaStream, context, 'session', 'token', { preview: value => previews.push(value), text: value => texts.push(value), error: () => assert.fail(), stopped() {}, finished: () => { finished = true; } });
    const event = (type: string, text = '') => socket.onmessage?.({ data: JSON.stringify({ message_type: type, text }) });
    event('session_started'); event('partial_transcript', '你好'); event('partial_transcript', '你好世界');
    t.mock.timers.tick(500); await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(previews, ['你好世界']); assert.deepEqual(texts, []);
    event('committed_transcript', '你好世界。'); await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(texts, ['你好世界。']);
    capture.finish(); await new Promise(resolve => setImmediate(resolve));
    assert.equal(finished, true); assert.deepEqual(texts, ['你好世界。']);
  } finally { globalThis.WebSocket = oldSocket; globalThis.AudioWorkletNode = oldNode; }
});
