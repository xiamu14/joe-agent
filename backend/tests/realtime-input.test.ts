import test from 'node:test';
import assert from 'node:assert/strict';
import { startRealtime } from '../../web/src/joe/voice-input/realtime';

test('realtime transport streams PCM only after ready, keeps listening across submissions until explicitly stopped', async () => {
  const oldSocket = globalThis.WebSocket,
    oldNode = globalThis.AudioWorkletNode;
  let socket: FakeSocket, capture: FakeNode;
  class FakeSocket {
    static OPEN = 1;
    readyState = 1;
    bufferedAmount = 0;
    closed = false;
    sent: string[] = [];
    onmessage: ((event: { data: string }) => void) | null = null;
    onclose: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(readonly url: string) {
      socket = this;
    }
    close() {
      this.closed = true;
    }
    send(value: string) {
      this.sent.push(value);
    }
  }
  class FakeNode {
    port: { onmessage: ((event: { data: ArrayBuffer }) => void) | null } = {
      onmessage: null,
    };
    constructor() {
      capture = this;
    }
    connect() {}
    disconnect() {}
  }
  globalThis.WebSocket = FakeSocket as unknown as typeof WebSocket;
  globalThis.AudioWorkletNode = FakeNode as unknown as typeof AudioWorkletNode;
  const context = {
    sampleRate: 16000,
    state: 'running',
    audioWorklet: { addModule: async () => {} },
    createMediaStreamSource: () => ({ connect() {}, disconnect() {} }),
    createGain: () => ({ gain: { value: 1 }, connect() {}, disconnect() {} }),
    destination: {},
  } as unknown as AudioContext;
  const partials: string[] = [],
    finals: string[] = [],
    errors: string[] = [];
  let cleanup: (() => void) | undefined;
  try {
    cleanup = await startRealtime({} as MediaStream, context, 'ephemeral-token', {
      partial: (text) => partials.push(text),
      final: (text) => {
        assert.equal(socket.closed, false);
        finals.push(text);
      },
      error: (text) => errors.push(text),
      transcribing: () => {},
    });
    const query = new URL(socket!.url).searchParams;
    assert.equal(query.get('commit_strategy'), 'vad');
    assert.equal(query.get('vad_silence_threshold_secs'), '1');
    capture!.port.onmessage!({ data: new Int16Array([0, 32767]).buffer });
    assert.equal(socket!.sent.length, 0);
    const event = socket!.onmessage!;
    event({ data: JSON.stringify({ message_type: 'session_started' }) });
    capture!.port.onmessage!({ data: new Int16Array([0, 32767]).buffer });
    assert.equal(JSON.parse(socket!.sent[0]).sample_rate, 16000);
    event({
      data: JSON.stringify({
        message_type: 'partial_transcript',
        text: '你好',
      }),
    });
    assert.deepEqual(partials, ['你好']);
    assert.deepEqual(finals, []);
    event({
      data: JSON.stringify({
        message_type: 'committed_transcript',
        text: '你好。',
      }),
    });
    event({
      data: JSON.stringify({
        message_type: 'committed_transcript',
        text: '重复',
      }),
    });
    assert.deepEqual(finals, ['你好。', '重复']);
    assert.deepEqual(errors, []);
    assert.notEqual(capture!.port.onmessage, null);
    cleanup();
    assert.equal(socket!.closed, true);
    assert.equal(capture!.port.onmessage, null);
  } finally {
    cleanup?.();
    globalThis.WebSocket = oldSocket;
    globalThis.AudioWorkletNode = oldNode;
  }
});
