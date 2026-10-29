import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Agent } from '@mastra/core/agent';
import type { Message } from '../src/joe/store';

const directory = mkdtempSync(join(tmpdir(), 'joe-speech-test-'));
process.env.JOE_DATA_DIR = directory;
process.env.OPENROUTER_API_TOKEN = 'test-token';
const { JOE_MODELS_JSON } = await import('../src/config/models');
JOE_MODELS_JSON.splice(0, JOE_MODELS_JSON.length, ...[
  { type: 'Think', id: 'openai/test', label: 'Test', inputPerMillion: 1, outputPerMillion: 2 },
]);
process.env.JOE_TTS_PROVIDER = 'elevenlabs';
process.env.ELEVENLABS_API_KEY = 'test-token';
process.env.ELEVENLABS_VOICE_ID_EN = 'english-voice';
process.env.ELEVENLABS_VOICE_ID_ZH = 'chinese-voice';
const { prepareSpeech } = await import('../src/joe/speech-text');
const { synthesize } = await import('../src/joe/voice');
const { store } = await import('../src/joe/store');
const { mastraStorage } = await import('../src/joe/memory');
const { settingsSchema } = await import('../src/joe/schema');

function conversation(user: string, answer: string, status = 'complete') {
  const sessionId = store.session(),
    turnId = randomUUID();
  const common = {
    sessionId,
    turnId,
    status,
    model: 'openai/test',
    attachments: [],
    expression: { emotion: 'calm' as const, intensity: 0.3 },
    createdAt: Date.now(),
  };
  const messages: Message[] = [
    { ...common, id: randomUUID(), role: 'user', text: user },
    { ...common, id: randomUUID(), role: 'assistant', text: answer },
  ];
  messages.forEach((message) => store.saveMessage(message));
  return { sessionId, turnId };
}

test('settings default to Chinese, persist a selected profile and reject invalid languages', () => {
  assert.equal(settingsSchema.parse({}).voiceLanguage, 'zh');
  assert.equal(store.saveSettings({ voiceLanguage: 'zh' }).voiceLanguage, 'zh');
  assert.equal(store.settings().voiceLanguage, 'zh');
  assert.throws(() => settingsSchema.parse({ voiceLanguage: 'invalid' }));
  assert.equal(store.settings().defaultMuted, false);
  assert.equal(store.saveSettings({ defaultMuted: true }).defaultMuted, true);
});

test('per-message reading translations support both roles without configured TTS voices', async () => {
  const original = Agent.prototype.generate;
  const ids = conversation('How are you?', 'I am here.');
  delete process.env.ELEVENLABS_VOICE_ID_ZH;
  Agent.prototype.generate = (async (message: string) => {
    const input = JSON.parse(message);
    assert.equal(input.requestedLanguage, 'auto');
    return { object: { language: 'zh', text: '中文译文' }, totalUsage: {} };
  }) as typeof Agent.prototype.generate;
  try {
    for (const message of store.messages(ids.sessionId)) {
      const result = await prepareSpeech({ ...ids, messageId: message.id, language: 'auto', purpose: 'translation' }, new AbortController().signal);
      assert.deepEqual(result, { language: 'zh', text: '中文译文' });
    }
    await assert.rejects(prepareSpeech({ ...ids, messageId: randomUUID(), language: 'auto', purpose: 'translation' }, new AbortController().signal), /未完成/);
    await assert.rejects(prepareSpeech({ ...ids, sessionId: store.session(), messageId: store.messages(ids.sessionId)[0].id, language: 'auto', purpose: 'translation' }, new AbortController().signal), /未完成/);
  } finally {
    Agent.prototype.generate = original;
    process.env.ELEVENLABS_VOICE_ID_ZH = 'chinese-voice';
  }
});

test('both translation directions use one generation and bind TTS to the selected voice', async () => {
  const originalGenerate = Agent.prototype.generate,
    originalFetch = globalThis.fetch;
  try {
    for (const [language, user, answer, translated, voice] of [
      ['en', '你好', '你好世界。', 'Hello world.', 'english-voice'],
      ['zh', 'Hello', 'Hello world.', '你好世界。', 'chinese-voice'],
    ] as const) {
      const ids = conversation(user, answer);
      let calls = 0;
      Agent.prototype.generate = (async (message: string, options: any) => {
        calls++;
        const input = JSON.parse(message);
        assert.equal(input.requestedLanguage, language);
        assert.deepEqual(input.recentUserMessages, [user]);
        assert.equal(input.answer, answer);
        assert.equal(options.memory, undefined);
        assert.equal(options.maxSteps, 1);
        assert.ok(options.abortSignal instanceof AbortSignal);
        return { object: { language, text: translated }, totalUsage: { inputTokens: 10, outputTokens: 5 } };
      }) as typeof Agent.prototype.generate;
      const result = await prepareSpeech({ ...ids, language }, new AbortController().signal);
      assert.deepEqual(result, { language, text: translated });
      assert.equal(calls, 1);
      globalThis.fetch = async (url, options) => {
        assert.match(String(url), new RegExp(`/text-to-speech/${voice}\\?`));
        assert.equal(JSON.parse(String(options?.body)).text, translated);
        return new Response(new Uint8Array([1, 2]), { headers: { 'Content-Type': 'audio/mpeg' } });
      };
      const audio = await synthesize({ ...ids, ...result }, new AbortController().signal);
      assert.equal(audio.headers.get('Content-Type'), 'audio/mpeg');
    }
    assert.equal(store.summary('UTC').input, 20);
    assert.ok(store.summary('UTC').model.known > 0);
  } finally {
    Agent.prototype.generate = originalGenerate;
    globalThis.fetch = originalFetch;
  }
});

test('auto uses model-selected language, passes mixed input unchanged and does not rewrite matching text', async () => {
  const original = Agent.prototype.generate;
  const ids = conversation('解释一下这个 API please', '这是接口。');
  Agent.prototype.generate = (async (message: string) => {
    const input = JSON.parse(message);
    assert.equal(input.requestedLanguage, 'auto');
    assert.deepEqual(input.recentUserMessages, ['解释一下这个 API please']);
    return { object: { language: 'zh', text: input.answer }, totalUsage: {} };
  }) as typeof Agent.prototype.generate;
  try {
    assert.deepEqual(await prepareSpeech({ ...ids, language: 'auto' }, new AbortController().signal), {
      language: 'zh',
      text: '这是接口。',
    });
  } finally {
    Agent.prototype.generate = original;
  }
});

test('missing voice, mismatched output, failed generation and cancellation never yield speech', async () => {
  const original = Agent.prototype.generate;
  const ids = conversation('Hello', 'Hello world.');
  let calls = 0;
  Agent.prototype.generate = (async () => {
    calls++;
    throw new Error('private provider data');
  }) as typeof Agent.prototype.generate;
  try {
    delete process.env.ELEVENLABS_VOICE_ID_ZH;
    await assert.rejects(prepareSpeech({ ...ids, language: 'zh' }, new AbortController().signal), /Chinese/);
    assert.equal(calls, 0);
    await assert.rejects(
      synthesize({ ...ids, language: 'zh', text: '你好' }, new AbortController().signal),
      /Chinese/,
    );
    process.env.ELEVENLABS_VOICE_ID_ZH = 'chinese-voice';
    await assert.rejects(
      prepareSpeech({ ...ids, language: 'en' }, new AbortController().signal),
      /^Error: 语音翻译失败/,
    );
    Agent.prototype.generate = (async () => ({
      object: { language: 'zh', text: '你好' },
      totalUsage: {},
    })) as typeof Agent.prototype.generate;
    await assert.rejects(prepareSpeech({ ...ids, language: 'en' }, new AbortController().signal), /语种/);
    const controller = new AbortController();
    Agent.prototype.generate = (async () => {
      controller.abort();
      return { object: { language: 'en', text: 'Hello' }, totalUsage: {} };
    }) as typeof Agent.prototype.generate;
    await assert.rejects(prepareSpeech({ ...ids, language: 'en' }, controller.signal), /取消/);
    await assert.rejects(
      prepareSpeech({ ...ids, sessionId: store.session(), language: 'en' }, new AbortController().signal),
      /未完成/,
    );
    const interrupted = conversation('Hi', 'Partial', 'interrupted');
    await assert.rejects(
      prepareSpeech({ ...interrupted, language: 'en' }, new AbortController().signal),
      /未完成/,
    );
  } finally {
    Agent.prototype.generate = original;
    process.env.ELEVENLABS_VOICE_ID_ZH = 'chinese-voice';
  }
});

test('translation uses the real Mastra adapter with a simulated OpenRouter response', async () => {
  const original = globalThis.fetch;
  const ids = conversation('Hello', 'Good morning.');
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.equal(String(url), 'https://openrouter.ai/api/v1/chat/completions');
    const request = JSON.parse(String(options?.body));
    assert.equal(request.model, 'openai/test');
    const content = JSON.stringify({ language: 'zh', text: '早上好。' });
    if (!request.stream)
      return Response.json({
        id: 'test',
        object: 'chat.completion',
        created: 1,
        model: 'openai/test',
        choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      });
    const frames = [
      { choices: [{ index: 0, delta: { role: 'assistant', content }, finish_reason: null }] },
      {
        choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      },
    ];
    return new Response(
      frames
        .map(
          (frame) =>
            `data: ${JSON.stringify({ id: 'test', object: 'chat.completion.chunk', created: 1, model: 'openai/test', ...frame })}\n\n`,
        )
        .join('') + 'data: [DONE]\n\n',
      { headers: { 'Content-Type': 'text/event-stream' } },
    );
  };
  try {
    assert.deepEqual(await prepareSpeech({ ...ids, language: 'zh' }, new AbortController().signal), {
      language: 'zh',
      text: '早上好。',
    });
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = original;
  }
});

test.after(async () => {
  store.db.close();
  await mastraStorage.close();
  rmSync(directory, { recursive: true, force: true });
});
