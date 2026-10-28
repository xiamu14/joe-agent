import test from 'node:test';
import assert from 'node:assert/strict';
import { startDictation } from '../../web/src/joe/voice-input/dictation-capture';

test('dictation transcribes speech while recording, ignores silence and flushes the last segment', async t => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  let now = 0, volume = 0, calls = 0, finished = false;
  t.mock.method(performance, 'now', () => now);
  const original = globalThis.MediaRecorder;
  let recorder!: FakeRecorder;
  class FakeRecorder {
    static isTypeSupported() { return true; }
    state = 'inactive'; mimeType = 'audio/webm';
    ondataavailable?: (event: { data: Blob }) => void; onstop?: () => void;
    constructor() { recorder = this; }
    start() { this.state = 'recording'; }
    stop() { this.state = 'inactive'; this.ondataavailable?.({ data: new Blob(['audio']) }); this.onstop?.(); }
  }
  globalThis.MediaRecorder = FakeRecorder as unknown as typeof MediaRecorder;
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    assert.equal((options?.body as FormData).get('supportedLanguages'), 'zh,en');
    return Response.json({ text: `第${++calls}段` });
  });
  const node = { connect() {}, disconnect() {} };
  const context = { createMediaStreamSource: () => node, createAnalyser: () => ({ ...node, fftSize: 2048, getFloatTimeDomainData(samples: Float32Array) { samples.fill(volume); } }) } as unknown as AudioContext;
  const texts: string[] = [];
  const capture = startDictation({} as MediaStream, context, 'session', { text: value => texts.push(value), error: () => assert.fail(), failed: () => assert.fail(), stopped() {}, finished: () => { finished = true; } });
  const tick = (ms: number) => { for (let i = 0; i < ms; i += 50) { now += 50; t.mock.timers.tick(50); } };
  try {
    tick(2000); assert.equal(calls, 0);
    volume = 0.1; tick(400); volume = 0; tick(1100);
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(texts, ['第1段']); assert.equal(recorder.state, 'recording');
    volume = 0.1; tick(400); capture.finish();
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(texts, ['第1段', '第2段']); assert.equal(finished, true);
  } finally { capture.cancel(); globalThis.MediaRecorder = original; }
});
