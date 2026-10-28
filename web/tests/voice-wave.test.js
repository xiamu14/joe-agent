import test from 'node:test';
import assert from 'node:assert/strict';
import { audioLevel } from '../src/joe/voice-input/audio-level.ts';
import { wavePath } from '../src/joe/voice-wave-shape.ts';

test('meter rejects silence and background noise, scales speech and caps loud input', () => {
  assert.equal(audioLevel(new Float32Array()), 0);
  assert.equal(audioLevel(new Float32Array(1024)), 0);
  assert.equal(audioLevel(new Float32Array(1024).fill(0.01)), 0);
  assert.ok(audioLevel(new Float32Array(1024).fill(0.05)) > 0.4);
  assert.equal(audioLevel(new Float32Array(1024).fill(1)), 1);
  assert.equal(audioLevel(new Float32Array([-0.05, 0.05])), audioLevel(new Float32Array([0.05, 0.05])));
});

test('silent wave is flat, speech moves, and every ribbon tapers to baseline', () => {
  for (let layer = 0; layer < 5; layer++) {
    const quiet = wavePath(0, 0, layer);
    assert.equal(quiet, wavePath(10, 0, layer));
    assert.ok(quiet.split(' ').every(point => point.endsWith(',32.00')));
    const loud = wavePath(0, 1, layer);
    assert.notEqual(loud, quiet);
    assert.notEqual(loud, wavePath(1, 1, layer));
    assert.ok(loud.startsWith('M0.00,32.00'));
    assert.ok(loud.endsWith('L480.00,32.00'));
    assert.ok(wavePath(0, 1, layer, true).endsWith('Z'));
    for (const point of loud.split(' ')) {
      const y = Number(point.split(',')[1]);
      assert.ok(y >= 4 && y <= 60);
    }
  }
});
