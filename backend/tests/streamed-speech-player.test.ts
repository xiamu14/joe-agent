import test from 'node:test';
import assert from 'node:assert/strict';
import { playStreamedSpeech } from '../../web/src/joe/streamed-speech-player';

test('PCM plays before EOF, captions use absolute audio time, and abort stops scheduled audio', async () => {
  const originalFrame = globalThis.requestAnimationFrame, originalCancel = globalThis.cancelAnimationFrame;
  let frame!: FrameRequestCallback, source!: ReadableStreamDefaultController<Uint8Array>;
  let stopped = 0;
  const starts: number[] = [], captions: number[] = [];
  const context = {
    state: 'running', currentTime: 10, async resume() {},
    createAnalyser: () => ({ connect() {}, disconnect() {}, getByteTimeDomainData(samples: Uint8Array) { samples.fill(128); } }),
    createBuffer: (_channels: number, length: number, rate: number) => ({ duration: length / rate, copyToChannel() {} }),
    createBufferSource: () => ({ connect() {}, disconnect() {}, start(time: number) { starts.push(time); }, stop() { stopped++; } }),
  };
  globalThis.requestAnimationFrame = callback => { frame = callback; return 1; };
  globalThis.cancelAnimationFrame = () => {};
  const controller = new AbortController();
  const response = new Response(new ReadableStream({ start(c) { source = c; } }));
  const task = playStreamedSpeech(response, context as unknown as AudioContext, controller.signal,
    end => captions.push(end), () => {}, () => {});
  const failure = assert.rejects(task, { name: 'AbortError' });
  const push = (text: string, start: number) => source.enqueue(new TextEncoder().encode(JSON.stringify({
    audio_base64: Buffer.alloc(48000).toString('base64'),
    alignment: { characters: [text], character_start_times_seconds: [start], character_end_times_seconds: [start + 0.1] },
  }) + '\n'));
  try {
    push('你', 0.2);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(starts.length, 1, 'first chunk starts while response is still open');
    context.currentTime = 10.1; frame(0);
    assert.deepEqual(captions, []);
    context.currentTime = 10.4; frame(0);
    assert.deepEqual(captions, [1]);
    push('好', 1.2);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(starts[1], 11.08);
    context.currentTime = 11.4; frame(0);
    assert.deepEqual(captions, [1, 2], 'absolute timestamps must not add a second chunk offset');
    controller.abort(); source.error(controller.signal.reason);
    await failure;
    assert.equal(stopped, 2);
    context.currentTime = 20; frame(0);
    assert.deepEqual(captions, [1, 2]);
  } finally {
    controller.abort();
    globalThis.requestAnimationFrame = originalFrame;
    globalThis.cancelAnimationFrame = originalCancel;
  }
});
