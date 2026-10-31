import { test, expect } from 'bun:test';
import { startBrowserSpeech } from '../src/joe/voice-input/browser-speech';
import { browserSpeechError, dictationError } from '../src/joe/voice-input/errors';

test('only microphone permission failures ask for microphone permission', () => {
  expect(dictationError(new DOMException('denied', 'NotAllowedError'))).toBe('请允许使用麦克风');
  expect(browserSpeechError('not-allowed').message).toBe('请允许使用麦克风');
  expect(browserSpeechError('network').message).toBe('语音连接失败，请检查网络');
  expect(dictationError(new Error('This model is not available in your region.'))).toBe('当前地区无法使用此模型');
});

test('browser transcript validation preserves API errors and cancellation suppresses stale failures', async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const originalFetch = globalThis.fetch;
  let recognition: any;
  class Recognition {
    onresult: any;
    start() { recognition = this; }
    stop() {}
    abort() {}
  }
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { SpeechRecognition: Recognition } });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { language: 'zh-CN' } });
  let resolveResponse!: (response: Response) => void;
  globalThis.fetch = (() => new Promise<Response>(resolve => { resolveResponse = resolve; })) as typeof fetch;
  const failures: unknown[] = [];
  const texts: string[] = [];
  let capture: ReturnType<typeof startBrowserSpeech> | undefined;
  const start = () => startBrowserSpeech('session', {
    text: text => texts.push(text), preview() {}, stopped() {}, finished() {}, failed: error => failures.push(error),
  });
  const result = () => recognition.onresult({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: '你好' } }] });
  try {
    capture = start(); result();
    await Promise.resolve();
    resolveResponse(Response.json({ error: '当前地区无法使用此模型' }, { status: 400 }));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(failures.map(dictationError)).toEqual(['当前地区无法使用此模型']);
    expect(texts).toEqual([]);
    capture.cancel();
    capture = start(); result();
    await Promise.resolve();
    capture.cancel();
    resolveResponse(Response.json({ error: 'late failure' }, { status: 400 }));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(failures).toHaveLength(1);
  } finally {
    capture?.cancel();
    globalThis.fetch = originalFetch;
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
    else Reflect.deleteProperty(globalThis, 'navigator');
  }
});
