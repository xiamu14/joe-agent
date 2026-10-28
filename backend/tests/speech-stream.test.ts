import test from 'node:test';
import assert from 'node:assert/strict';
import { readSpeechStream, decodePcm } from '../../web/src/joe/speech-stream';
import { AudioTimeline } from '../../web/src/joe/audio-timeline';
import { elevenLabsProvider } from '../src/joe/voice-providers/elevenlabs';
import { voiceConfig } from '../src/joe/voice-providers/config';

test('speech parser handles fragmented UTF-8, multiple lines and an unterminated last line', async () => {
  const chunk = { audio_base64: 'AAA=', alignment: { characters: ['你'], character_start_times_seconds: [0], character_end_times_seconds: [0.2] } };
  const bytes = new TextEncoder().encode(`${JSON.stringify(chunk)}\r\n\n${JSON.stringify(chunk)}`);
  const response = new Response(new ReadableStream({ start(controller) { for (const byte of bytes) controller.enqueue(Uint8Array.of(byte)); controller.close(); } }));
  const chunks = [];
  for await (const value of readSpeechStream(response)) chunks.push(value);
  assert.deepEqual(chunks, [chunk, chunk]);
  for (const bad of [{ error: 'failed' }, { ...chunk, alignment: { ...chunk.alignment, character_start_times_seconds: [] } }]) {
    await assert.rejects(async () => { for await (const _ of readSpeechStream(Response.json(bad))) {} }, /格式错误/);
  }
  assert.deepEqual([...decodePcm(Buffer.from([0, 0, 0, 128, 255, 127]).toString('base64'))], [0, -1, 32767 / 32768]);
  assert.throws(() => decodePcm('AA=='), /不完整/);
});

test('audio time follows scheduled playback and freezes during network gaps', () => {
  const clock = new AudioTimeline();
  assert.equal(clock.position(5), -1);
  assert.equal(clock.schedule(10, 1), 10.08);
  assert.equal(clock.position(10), -1);
  assert.ok(Math.abs(clock.position(10.58) - 0.5) < 1e-9);
  assert.equal(clock.position(13), 1);
  assert.equal(clock.schedule(13, 1), 13.08);
  assert.equal(clock.position(13.04), 1);
  assert.ok(Math.abs(clock.position(13.58) - 1.5) < 1e-9);
  assert.equal(clock.schedule(13.1, 1), 14.08);
});

test('timestamp endpoint forwards the body before the upstream finishes and propagates cancellation', async () => {
  const originalFetch = globalThis.fetch;
  let cancelled = false;
  const source = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new TextEncoder().encode('{"audio_base64":"AAA="}\n')); }, cancel() { cancelled = true; } });
  const signal = new AbortController().signal;
  globalThis.fetch = async (url, options) => {
    assert.match(String(url), /voice%2Fzh\/stream\/with-timestamps\?output_format=pcm_24000$/);
    assert.equal(options?.signal, signal);
    assert.equal(JSON.parse(String(options?.body)).language_code, 'zh');
    return new Response(source);
  };
  try {
    const provider = elevenLabsProvider(voiceConfig('tts', { JOE_VOICE_PROVIDER: 'elevenlabs' }));
    const response = await provider.speakStream('你好', { speaker: 'voice/zh', language: 'zh', signal });
    assert.equal(response.headers.get('Content-Type'), 'application/x-ndjson');
    const reader = response.body!.getReader();
    assert.equal((await reader.read()).done, false);
    await reader.cancel();
    assert.equal(cancelled, true);
  } finally { globalThis.fetch = originalFetch; }
});

test('speech requests keep normal answers together and split long answers without losing text', async () => {
  const { extractSpeech } = await import('../../web/src/joe/stream');
  const text = '你好。今天过得怎么样？';
  assert.deepEqual(extractSpeech(text), [text, '']);
  const long = '好'.repeat(1199) + '😀' + '世界。';
  const [first, rest] = extractSpeech(long);
  assert.equal(first.length, 1199);
  assert.equal(first + rest, long);
  const paragraphs = '第一段。' + '好'.repeat(1300);
  assert.deepEqual(extractSpeech(paragraphs), ['第一段。', '好'.repeat(1300)]);
});
