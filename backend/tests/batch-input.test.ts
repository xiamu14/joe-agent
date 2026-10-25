import test from 'node:test';
import assert from 'node:assert/strict';
import { startBatch } from '../../web/src/joe/voice-input/batch';

test('continuous input discards silence, restarts before transcription and discards late results after cancellation', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  let now = 0, volume = 0, speechStarts = 0;
  t.mock.method(performance, 'now', () => now);
  const originals = { MediaRecorder: globalThis.MediaRecorder, fetch };
  let recorder: FakeRecorder, resolveResponse!: (response: Response) => void;
  class FakeRecorder {
    static isTypeSupported() {
      return true;
    }
    state = 'inactive';
    mimeType = 'audio/webm';
    starts = 0;
    ondataavailable?: (event: { data: Blob }) => void;
    onstop?: () => void;
    constructor() {
      recorder = this;
    }
    start() {
      this.state = 'recording';
      this.starts++;
    }
    stop() {
      this.state = 'inactive';
      this.ondataavailable?.({ data: new Blob(['audio']) });
      this.onstop?.();
    }
  }
  globalThis.MediaRecorder = FakeRecorder as unknown as typeof MediaRecorder;
  globalThis.fetch = async () =>
    new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
  const node = { connect() {}, disconnect() {} };
  const context = {
    createMediaStreamSource: () => node,
    createAnalyser: () => ({ ...node, fftSize: 2048, getFloatTimeDomainData(samples: Float32Array) { samples.fill(volume); } }),
  } as unknown as AudioContext;
  const finals: string[] = [];
  const cleanup = startBatch({} as MediaStream, context, 'session', {
    partial() {},
    final: (text) => finals.push(text),
    error: (message) => assert.fail(message),
    transcribing() {},
    speech() { speechStarts++; },
  });
  const speak = () => {
    volume = 0.1;
    for (let i = 0; i < 6; i++) { now += 50; t.mock.timers.tick(50); }
    volume = 0;
  };
  try {
    now = 45000;
    t.mock.timers.tick(45000);
    assert.equal(recorder!.state, 'recording');
    assert.equal(resolveResponse, undefined);
    assert.equal(speechStarts, 0);
    const initialStarts = recorder!.starts;
    speak();
    recorder!.stop();
    assert.equal(recorder!.starts, initialStarts + 1);
    assert.equal(speechStarts, 1);
    assert.equal(recorder!.state, 'recording');
    await new Promise((resolve) => setImmediate(resolve));
    resolveResponse(Response.json({ text: '第一句' }));
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(finals, ['第一句']);
    speak();
    recorder!.stop();
    assert.equal(recorder!.starts, initialStarts + 2);
    assert.equal(speechStarts, 2);
    await new Promise((resolve) => setImmediate(resolve));
    cleanup();
    resolveResponse(Response.json({ text: '不应发送' }));
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(finals, ['第一句']);
    assert.equal(recorder!.state, 'inactive');
  } finally {
    cleanup();
    Object.assign(globalThis, originals);
  }
});
