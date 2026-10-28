import test from 'node:test';
import assert from 'node:assert/strict';
import { browserSpeechAvailable, startBrowserSpeech } from '../../web/src/joe/voice-input/browser-speech';

test('browser recognition previews live results, verifies final text and never sends a message', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  let recognition!: FakeRecognition;
  class FakeRecognition {
    lang = ''; continuous = false; interimResults = false;
    onresult: ((event: unknown) => void) | null = null;
    onend: (() => void) | null = null;
    onerror: ((event: unknown) => void) | null = null;
    constructor() { recognition = this; }
    start() {} stop() { this.onend?.(); } abort() {}
  }
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { webkitSpeechRecognition: FakeRecognition } });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { language: 'zh-CN' } });
  let requests = 0;
  let resolveValidation!: (response: Response) => void;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/joe-api/validate-transcript'); requests++;
    const text = JSON.parse(String(options?.body)).text;
    return new Promise<Response>(resolve => { resolveValidation = () => resolve(Response.json({ text })); });
  });
  const previews: string[] = [], texts: string[] = [];
  let done = false, stopped = false;
  try {
    assert.equal(browserSpeechAvailable(), true);
    startBrowserSpeech('session', { preview: value => previews.push(value), text: value => texts.push(value), stopped: () => { stopped = true; }, finished: () => { done = true; }, failed: () => assert.fail() });
    assert.equal(recognition.interimResults, true); assert.equal(recognition.continuous, true);
    recognition.onresult?.({ resultIndex: 0, results: [{ isFinal: false, 0: { transcript: '你好' } }] });
    assert.deepEqual(previews, ['你好']); assert.equal(requests, 0);
    recognition.onresult?.({ resultIndex: 0, results: [{ isFinal: false, 0: { transcript: 'こんにちは' } }] });
    assert.equal(previews.at(-1), '');
    recognition.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: '你好世界' } }] });
    assert.equal(previews.at(-1), '你好世界');
    t.mock.timers.tick(2999); assert.equal(stopped, false);
    t.mock.timers.tick(1); assert.equal(stopped, true);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(previews.at(-1), '你好世界');
    resolveValidation(Response.json({})); await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(texts, ['你好世界']); assert.equal(done, true); assert.equal(requests, 1);
  } finally {
    if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor); else Reflect.deleteProperty(globalThis, 'window');
    if (navigatorDescriptor) Object.defineProperty(globalThis, 'navigator', navigatorDescriptor); else Reflect.deleteProperty(globalThis, 'navigator');
  }
});
