import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const directory = mkdtempSync(join(tmpdir(), 'joe-input-language-test-'));
process.env.JOE_DATA_DIR = directory;
process.env.FISH_API_TOKEN = 'test-token';
process.env.OPENROUTER_API_TOKEN = 'test-token';
const { JOE_MODELS_JSON } = await import('../src/config/models');
JOE_MODELS_JSON.splice(0, JOE_MODELS_JSON.length, ...[{ type: 'Think', id: 'test/model', label: 'Test' }]);
const { supportedTranscript } = await import('../src/joe/input-language');
const { transcribe } = await import('../src/joe/voice');
const { store } = await import('../src/joe/store');
const { Agent } = await import('@mastra/core/agent');
test.after(() => rmSync(directory, { recursive: true, force: true }));

test('only confident Chinese and English transcripts enter the draft', async () => {
  const signal = new AbortController().signal;
  const language = (value: string) => async () => value;
  assert.equal(await supportedTranscript(' 你好 world ', signal, language('zh')), '你好 world');
  assert.equal(await supportedTranscript('hello', signal, language('en')), 'hello');
  assert.equal(await supportedTranscript('bonjour', signal, language('other')), '');
  assert.equal(await supportedTranscript('こんにちは', signal, language('zh')), '');
  assert.equal(await supportedTranscript('한국어', signal, language('en')), '');
  assert.equal(await supportedTranscript(' ', signal, async () => { throw new Error('should not classify silence'); }), '');
});

test('dictation transcribes without sending a chat and filters unsupported languages', async t => {
  let text = '你好';
  t.mock.method(globalThis, 'fetch', async () => Response.json({ text }));
  t.mock.method(Agent.prototype, 'generate', async () => ({ object: { language: text === '你好' ? 'zh' : 'other' } }) as never);
  const form = () => {
    const data = new FormData();
    data.set('sessionId', store.session());
    data.set('audio', new File(['audio'], 'audio.webm', { type: 'audio/webm' }));
    data.set('supportedLanguages', 'zh,en');
    return data;
  };
  assert.deepEqual(await transcribe(form(), new AbortController().signal), { text: '你好' });
  text = 'bonjour';
  assert.deepEqual(await transcribe(form(), new AbortController().signal), { text: '' });
});
