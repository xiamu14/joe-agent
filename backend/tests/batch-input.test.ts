import test from 'node:test';
import assert from 'node:assert/strict';
import { startBatch } from '../../web/src/joe/voice-input/batch';

test('batch recording restarts before transcription returns and cancellation discards late results', async () => {
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
    createAnalyser: () => ({ ...node, fftSize: 2048, getFloatTimeDomainData() {} }),
  } as unknown as AudioContext;
  const finals: string[] = [];
  const cleanup = startBatch({} as MediaStream, context, 'session', {
    partial() {},
    final: (text) => finals.push(text),
    error: (message) => assert.fail(message),
    transcribing() {},
  });
  try {
    recorder!.stop();
    assert.equal(recorder!.starts, 2);
    assert.equal(recorder!.state, 'recording');
    await new Promise((resolve) => setImmediate(resolve));
    resolveResponse(Response.json({ text: '第一句' }));
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(finals, ['第一句']);
    recorder!.stop();
    assert.equal(recorder!.starts, 3);
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
