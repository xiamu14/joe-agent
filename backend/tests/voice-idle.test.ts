import test from 'node:test';
import assert from 'node:assert/strict';
import { startIdleTimeout } from '../../web/src/joe/voice-input/idle-timeout';
import { VOICE_INPUT_IDLE_TIMEOUT_MS } from '../../web/src/joe/voice-input/config';

for (const speaks of [false, true]) {
  test(`idle timeout ${speaks ? 'resets on speech' : 'also stops an initially silent microphone'}`, (t) => {
    t.mock.timers.enable({ apis: ['setInterval'] });
    let now = 0, volume = 0, stopped = 0, disconnected = 0;
    t.mock.method(performance, 'now', () => now);
    const source = { connect() {}, disconnect() { disconnected++; } };
    const analyser = { fftSize: 2048, disconnect() { disconnected++; },
      getFloatTimeDomainData(samples: Float32Array) { samples.fill(volume); } };
    const context = { createMediaStreamSource: () => source, createAnalyser: () => analyser } as unknown as AudioContext;
    const cleanup = startIdleTimeout({} as MediaStream, context, () => { stopped++; });
    const tick = (time: number) => { now = time; t.mock.timers.tick(100); };
    try {
      tick(VOICE_INPUT_IDLE_TIMEOUT_MS - 100);
      assert.equal(stopped, 0);
      let lastVoice = 0;
      if (speaks) {
        volume = 0.1;
        tick(VOICE_INPUT_IDLE_TIMEOUT_MS);
        assert.equal(stopped, 0);
        lastVoice = now;
        volume = 0;
        tick(lastVoice + VOICE_INPUT_IDLE_TIMEOUT_MS - 100);
        assert.equal(stopped, 0);
      }
      tick(lastVoice + VOICE_INPUT_IDLE_TIMEOUT_MS);
      assert.equal(stopped, 1);
      assert.equal(disconnected, 2);
      tick(now + VOICE_INPUT_IDLE_TIMEOUT_MS);
      assert.equal(stopped, 1);
    } finally { cleanup(); }
  });
}

test('manual cleanup prevents a later idle callback', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  let now = 0;
  t.mock.method(performance, 'now', () => now);
  const node = { connect() {}, disconnect() {}, fftSize: 2048,
    getFloatTimeDomainData(samples: Float32Array) { samples.fill(0); } };
  const context = { createMediaStreamSource: () => node, createAnalyser: () => node } as unknown as AudioContext;
  const cleanup = startIdleTimeout({} as MediaStream, context, () => assert.fail('cancelled timer fired'));
  cleanup();
  now = VOICE_INPUT_IDLE_TIMEOUT_MS;
  t.mock.timers.tick(VOICE_INPUT_IDLE_TIMEOUT_MS);
});
