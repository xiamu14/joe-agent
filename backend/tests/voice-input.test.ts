import test from 'node:test';
import assert from 'node:assert/strict';
import { TranscriptTurn, SilenceDetector } from '../../web/src/joe/voice-input/turn';
import { elevenLabsProvider } from '../src/joe/voice-providers/elevenlabs';
import { voiceConfig } from '../src/joe/voice-providers/config';

test('partial transcripts update without submitting; successive utterances are accepted', () => {
  const turn = new TranscriptTurn();
  assert.deepEqual(turn.accept('partial_transcript', '你'), {
    text: '你',
    final: false,
  });
  assert.deepEqual(turn.accept('partial_transcript', '你好'), {
    text: '你好',
    final: false,
  });
  assert.equal(turn.accept('committed_transcript', '  '), null);
  assert.deepEqual(turn.accept('committed_transcript', ' 你好。 '), {
    text: '你好。',
    final: true,
  });
  assert.deepEqual(turn.accept('committed_transcript', '下一句'), {
    text: '下一句',
    final: true,
  });
  assert.deepEqual(turn.accept('partial_transcript', '再说'), {
    text: '再说',
    final: false,
  });
});
test('invalid events and oversized input do not submit', () => {
  const turn = new TranscriptTurn();
  assert.equal(turn.accept('session_started', 'noise'), null);
  assert.equal(turn.accept('committed_transcript', null), null);
  assert.throws(() => turn.accept('committed_transcript', 'a'.repeat(12001)), /过长/);
});
test('silence needs actual speech first, tolerates short pauses and ends after 1 second', () => {
  const silence = new SilenceDetector();
  for (let t = 0; t <= 5000; t += 50) assert.equal(silence.update(0, t), false);
  const speech = new SilenceDetector();
  for (let t = 0; t <= 500; t += 50) assert.equal(speech.update(0.1, t), false);
  for (let t = 550; t < 1500; t += 50) assert.equal(speech.update(0, t), false);
  assert.equal(speech.update(0, 1500), true);
});
test('ElevenLabs realtime session returns only an ephemeral token, not the API key', async () => {
  const original = globalThis.fetch;
  const config = voiceConfig('asr', {
    JOE_VOICE_PROVIDER: 'elevenlabs',
    ELEVENLABS_API_KEY: 'private-key',
  });
  const provider = elevenLabsProvider(config),
    signal = new AbortController().signal;
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), 'https://api.elevenlabs.io/v1/single-use-token/realtime_scribe');
    assert.equal(new Headers(options?.headers).get('xi-api-key'), 'private-key');
    assert.equal(options?.signal, signal);
    return Response.json({ token: 'temporary-token' });
  };
  try {
    assert.deepEqual(await provider.createRealtimeSession!(signal), {
      mode: 'elevenlabs-realtime',
      token: 'temporary-token',
    });
  } finally {
    globalThis.fetch = original;
  }
});
