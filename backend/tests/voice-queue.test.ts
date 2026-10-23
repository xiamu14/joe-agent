import test from 'node:test';
import assert from 'node:assert/strict';
import { VoiceQueue } from '../../web/src/joe/voice-queue';

test('stopping synthesis discards late audio and queued sentences', async () => {
  const originalFetch = globalThis.fetch;
  const originalCancel = globalThis.cancelAnimationFrame;
  let resolveResponse!: (response: Response) => void;
  let calls = 0;
  let signal: AbortSignal | undefined;
  const errors: string[] = [],
    pending: boolean[] = [],
    playing: boolean[] = [];
  globalThis.cancelAnimationFrame = () => {};
  globalThis.fetch = async (_url, init) => {
    calls++;
    signal = init?.signal ?? undefined;
    return new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
  };
  const queue = new VoiceQueue(
    (value) => playing.push(value),
    () => {},
    (error) => errors.push(error),
    (value) => pending.push(value),
  );
  try {
    queue.enqueue('第一句。', 'session', 'turn');
    queue.enqueue('第二句。', 'session', 'turn');
    assert.equal(queue.pending, true);
    queue.stop();
    assert.equal(signal?.aborted, true);
    resolveResponse(new Response(new Uint8Array([1, 2, 3])));
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(calls, 1);
    assert.equal(queue.pending, false);
    assert.equal(playing.includes(true), false);
    assert.equal(pending.at(-1), false);
    assert.deepEqual(errors, []);
  } finally {
    queue.dispose();
    globalThis.fetch = originalFetch;
    globalThis.cancelAnimationFrame = originalCancel;
  }
});

test('captions follow playback time across sentences and stop advancing after cancellation', async () => {
  const originals = {
    fetch,
    Audio: globalThis.Audio,
    AudioContext: globalThis.AudioContext,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
  };
  let audio: FakeAudio, frame: FrameRequestCallback;
  class FakeAudio {
    currentTime = 0;
    duration = 4;
    onended?: () => void;
    constructor() {
      audio = this;
    }
    async play() {}
    pause() {}
    removeAttribute() {}
  }
  const node = { connect() {}, disconnect() {} };
  globalThis.Audio = FakeAudio as unknown as typeof Audio;
  globalThis.AudioContext = class {
    resume() {
      return Promise.resolve();
    }
    close() {
      return Promise.resolve();
    }
    createMediaElementSource() {
      return node;
    }
    createAnalyser() {
      return {
        ...node,
        getByteTimeDomainData(samples: Uint8Array) {
          samples.fill(128);
        },
      };
    }
  } as unknown as typeof AudioContext;
  globalThis.requestAnimationFrame = (callback) => {
    frame = callback;
    return 1;
  };
  globalThis.cancelAnimationFrame = () => {};
  const languages: string[] = [];
  globalThis.fetch = async (_url, options) => {
    languages.push(JSON.parse(String(options?.body)).language);
    return new Response(new Uint8Array([1]));
  };
  const captions: number[] = [];
  const queue = new VoiceQueue(
    () => {},
    () => {},
    (error) => assert.fail(error),
    () => {},
    (turn, end) => {
      assert.equal(turn, 'turn');
      captions.push(end);
    },
  );
  try {
    queue.enqueue('你好世界', 'session', 'turn', 3);
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(captions, [3]);
    audio!.currentTime = 2;
    frame!(0);
    assert.deepEqual(captions, [3, 5]);
    audio!.onended!();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(captions.at(-1), 7);
    queue.enqueue('下一句', 'session', 'turn', 7, 'zh');
    await new Promise((resolve) => setImmediate(resolve));
    queue.stop();
    assert.deepEqual(languages, ['en', 'zh']);
    const count = captions.length;
    audio!.currentTime = 3;
    frame!(0);
    assert.equal(captions.length, count);
  } finally {
    queue.dispose();
    await new Promise((resolve) => setImmediate(resolve));
    Object.assign(globalThis, originals);
  }
});
