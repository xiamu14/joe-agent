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
JOE_MODELS_JSON.splice(0, JOE_MODELS_JSON.length, ...[{ type: 'Think', id: 'test/model', label: 'Test' }, { type: 'Decision', id: 'typesafe/jev-1.14', label: 'Jev' }]);
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

test('model region failures remain errors for browser and batch dictation', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ text: '你好' }));
  t.mock.method(Agent.prototype, 'generate', async () => {
    throw new Error('Generation failed', { cause: new Error('This model is not available in your region.') });
  });
  const signal = new AbortController().signal;
  await assert.rejects(supportedTranscript('你好', signal), /当前地区无法使用此模型/);
  const data = new FormData();
  data.set('sessionId', store.session());
  data.set('audio', new File(['audio'], 'audio.webm', { type: 'audio/webm' }));
  data.set('supportedLanguages', 'zh,en');
  await assert.rejects(transcribe(data, signal), /当前地区无法使用此模型/);
});

test('unknown model failures do not become unsupported language or expose provider details', async t => {
  t.mock.method(Agent.prototype, 'generate', async () => { throw new Error('private provider response'); });
  await assert.rejects(supportedTranscript('hello', new AbortController().signal), { message: '语音校验失败，请稍后重试' });
});


test('validation uses Jev independently of the selected chat model with three choices', async t => {
  store.saveSettings({ ...store.settings(), model: 'test/model' });
  let request: any;
  t.mock.method(globalThis, 'fetch', async (_url, init) => {
    request = JSON.parse(String(init?.body));
    return Response.json({ id: 'gen-language-test', object: 'chat.completion', created: 1, model: 'typesafe/jev-1.14',
      choices: [{ index: 0, message: { role: 'assistant', content: JSON.stringify({ language: 'zh' }) }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 } });
  });
  assert.equal(await supportedTranscript('把 YouTube 留下', new AbortController().signal), '把 YouTube 留下');
  assert.equal(request.model, 'typesafe/jev-1.14');
  assert.match(JSON.stringify(request), /无法识别/);
  assert.doesNotMatch(JSON.stringify(request), /"mixed"/);
  const { decisionModels } = await import('../src/joe/config');
  const configured = decisionModels.splice(0);
  try {
    await assert.rejects(supportedTranscript('hello', new AbortController().signal), /请配置 Jev 判断模型/);
  } finally { decisionModels.push(...configured); }
});
