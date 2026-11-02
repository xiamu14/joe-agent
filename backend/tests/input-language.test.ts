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
const decision = (choice: string) => ({ id: 'gen-dec-language-test', answers: { language: { type: 'choice', choice } }, usage: { input_tokens: 10, output_tokens: 4, cost: 0.00001 } });
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
  t.mock.method(globalThis, 'fetch', async url => Response.json(String(url).endsWith('/decisions') ? decision(text === '你好' ? 'zh' : 'other') : { text }));
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
  t.mock.method(globalThis, 'fetch', async url => String(url).endsWith('/decisions')
    ? Response.json({ error: { message: 'This model is not available in your region.' } }, { status: 403 })
    : Response.json({ text: '你好' }));
  const signal = new AbortController().signal;
  await assert.rejects(supportedTranscript('你好', signal), /当前地区无法使用此模型/);
  const data = new FormData();
  data.set('sessionId', store.session());
  data.set('audio', new File(['audio'], 'audio.webm', { type: 'audio/webm' }));
  data.set('supportedLanguages', 'zh,en');
  await assert.rejects(transcribe(data, signal), /当前地区无法使用此模型/);
});

test('unknown model failures do not become unsupported language or expose provider details', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: { message: 'private provider response' } }, { status: 502 }));
  await assert.rejects(supportedTranscript('hello', new AbortController().signal), { message: '语音校验失败，请稍后重试' });
});

test('chat-shaped responses cannot pass decision validation, and cancellation stays cancelled', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ choices: [{ message: { content: '{"language":"zh"}' } }] }));
  await assert.rejects(supportedTranscript('你好', new AbortController().signal), /语音校验失败/);
  const controller = new AbortController();
  controller.abort();
  t.mock.method(globalThis, 'fetch', async (_url, init) => {
    assert.equal(init?.signal?.aborted, true);
    throw controller.signal.reason;
  });
  await assert.rejects(supportedTranscript('你好', controller.signal), { name: 'AbortError' });
});


test('validation uses Jev independently of the selected chat model with three choices', async t => {
  store.saveSettings({ ...store.settings(), model: 'test/model' });
  let request: any;
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(String(url), 'https://openrouter.ai/api/alpha/decisions');
    assert.equal(init?.method, 'POST');
    assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer test-token');
    request = JSON.parse(String(init?.body));
    return Response.json(decision('zh'));
  });
  assert.equal(await supportedTranscript('把 YouTube 留下', new AbortController().signal), '把 YouTube 留下');
  assert.equal(request.model, 'typesafe/jev-1.14');
  assert.deepEqual(request.state, { transcription: '把 YouTube 留下' });
  assert.equal(request.questions.language.type, 'choice');
  assert.deepEqual(Object.keys(request.questions.language.criteria), ['zh', 'en', 'other']);
  assert.equal(request.messages, undefined);
  assert.equal(request.response_format, undefined);
  const usage = store.db.prepare('SELECT * FROM usage ORDER BY rowid DESC LIMIT 1').get()!;
  assert.equal(usage.input, 10); assert.equal(usage.output, 4); assert.equal(usage.cost, 0.00001);
  assert.match(JSON.stringify(request), /无法识别/);
  assert.doesNotMatch(JSON.stringify(request), /"mixed"/);
  const { decisionModels } = await import('../src/joe/config');
  const configured = decisionModels.splice(0);
  try {
    await assert.rejects(supportedTranscript('hello', new AbortController().signal), /请配置 Jev 判断模型/);
  } finally { decisionModels.push(...configured); }
});
