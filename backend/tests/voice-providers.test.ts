import { buffer } from 'node:stream/consumers';
import { MastraVoice } from '@mastra/core/voice';
import test from 'node:test';
import assert from 'node:assert/strict';
import { voiceConfig } from '../src/joe/voice-providers/config';
import { fishProvider } from '../src/joe/voice-providers/fish';
import { elevenLabsProvider } from '../src/joe/voice-providers/elevenlabs';
import { VoiceHttpError, voiceError } from '../src/joe/voice-errors';

test('provider selection preserves Fish by default and allows independent overrides', () => {
  assert.equal(voiceConfig('asr', {}).id, 'fish');
  const env = {
    JOE_VOICE_PROVIDER: 'elevenlabs',
    JOE_TTS_PROVIDER: 'fish',
    ELEVENLABS_API_KEY: 'test-key',
    FISH_API_TOKEN: 'fish-key',
  };
  assert.equal(voiceConfig('asr', env).id, 'elevenlabs');
  assert.equal(voiceConfig('tts', env).id, 'fish');
  assert.equal(voiceConfig('asr', env).token, 'test-key');
  assert.throws(() => voiceConfig('asr', { JOE_VOICE_PROVIDER: 'typo' }), /不支持/);
  assert.throws(() => voiceConfig('asr', { FISH_ASR_USD_PER_MINUTE: '-1' }), /非负/);
  assert.equal(voiceConfig('tts', env).ttsRate, null);
});

for (const id of ['fish', 'elevenlabs'] as const) {
  test(`${id} implements the shared audio contract with correct authentication, payload and abort signal`, async () => {
    const original = globalThis.fetch;
    const config = voiceConfig('asr', {
      JOE_VOICE_PROVIDER: id,
      FISH_API_TOKEN: 'fish-test',
      FISH_REFERENCE_ID: 'ref',
      ELEVENLABS_API_KEY: 'eleven-test',
      ELEVENLABS_VOICE_ID: 'voice/id',
    });
    const provider = id === 'fish' ? fishProvider(config) : elevenLabsProvider(config);
    const signal = new AbortController().signal;
    let calls = 0;
    globalThis.fetch = async (url, options) => {
      calls++;
      assert.equal(options?.signal, signal);
      const headers = new Headers(options?.headers);
      assert.equal(
        headers.get(id === 'fish' ? 'Authorization' : 'xi-api-key'),
        id === 'fish' ? 'Bearer fish-test' : 'eleven-test',
      );
      assert.equal(headers.get(id === 'fish' ? 'xi-api-key' : 'Authorization'), null);
      if (options?.body instanceof FormData) {
        assert.equal(
          String(url),
          id === 'fish' ? 'https://api.fish.audio/v1/asr' : 'https://api.elevenlabs.io/v1/speech-to-text',
        );
        assert.ok(options.body.get(id === 'fish' ? 'audio' : 'file') instanceof File);
        if (id === 'elevenlabs') assert.equal(options.body.get('model_id'), 'scribe_v2');
        return Response.json({
          text: '你好',
          duration: 2,
          words: [{ end: 1.5 }],
        });
      }
      const body = JSON.parse(String(options?.body));
      assert.equal(body.text, '你好');
      if (id === 'fish') {
        assert.equal(body.reference_id, 'ref');
        assert.equal(body.format, 'mp3');
      } else {
        assert.match(String(url), /voice%2Fid\?output_format=mp3_44100_128$/);
        assert.equal(body.model_id, 'eleven_flash_v2_5');
      }
      return new Response(new Uint8Array([1, 2, 3]), {
        headers: { 'Content-Type': 'audio/mpeg', 'request-id': 'voice-request', 'character-cost': '2' },
      });
    };
    try {
      let duration: number | undefined;
      assert.ok(provider instanceof MastraVoice);
      const result = await provider.listen(new File(['audio'], 'test.webm', { type: 'audio/webm' }), {
        signal,
        onDuration: (value) => {
          duration = value;
        },
      });
      assert.equal(result, '你好');
      assert.equal(duration, id === 'fish' ? 2 : undefined);
      let usage: unknown;
      const speech = await provider.speak('你好', {
        signal,
        onUsage: (value) => {
          usage = value;
        },
      });
      if (id === 'elevenlabs') assert.deepEqual(usage, { requestId: 'voice-request', credits: 2 });
      assert.equal((await buffer(speech)).byteLength, 3);
      assert.equal(calls, 2);
      globalThis.fetch = async () => new Response('secret provider body', { status: 403 });
      await assert.rejects(provider.speak('你好', { signal }), (error) => {
        assert.ok(error instanceof VoiceHttpError);
        assert.match(voiceError(error, '合成').message, /音色的权限/);
        assert.doesNotMatch(voiceError(error, '合成').message, /secret/);
        return true;
      });
      globalThis.fetch = async (_url, options) => {
        options?.signal?.throwIfAborted();
        return new Response();
      };
      await assert.rejects(provider.speak('你好', { signal: AbortSignal.abort() }), { name: 'AbortError' });
    } finally {
      globalThis.fetch = original;
    }
  });
}

test('ElevenLabs quota and paid voice errors are not misreported as bad credentials', async () => {
  const original = globalThis.fetch;
  const provider = elevenLabsProvider(voiceConfig('tts', { JOE_VOICE_PROVIDER: 'elevenlabs' }));
  try {
    for (const code of ['quota_exceeded', 'paid_plan_required']) {
      globalThis.fetch = async () =>
        Response.json({ detail: { status: code, message: 'secret' } }, { status: 401 });
      await assert.rejects(provider.speak('test', { signal: new AbortController().signal }), (error) => {
        const message = voiceError(error, '合成').message;
        assert.match(message, code === 'quota_exceeded' ? /额度不足/ : /付费套餐/);
        assert.doesNotMatch(message, /Token 无效|secret/);
        return true;
      });
    }
  } finally {
    globalThis.fetch = original;
  }
});

test('ElevenLabs detail.code takes precedence over generic payment status and retains safe trace ID', async () => {
  const original = globalThis.fetch;
  const provider = elevenLabsProvider(voiceConfig('tts', { JOE_VOICE_PROVIDER: 'elevenlabs' }));
  const trace = '108b2a93c72705a457eea6f5a3af44e6';
  try {
    globalThis.fetch = async () =>
      Response.json(
        {
          detail: {
            type: 'payment_required',
            status: 'payment_required',
            code: 'paid_plan_required',
            message: 'private response',
            request_id: trace,
          },
        },
        { status: 402 },
      );
    await assert.rejects(provider.speak('test', { signal: new AbortController().signal }), (error) => {
      const message = voiceError(error, '语音合成').message;
      assert.match(message, /付费套餐/);
      assert.match(message, new RegExp(trace));
      assert.doesNotMatch(message, /额度不足|private response/);
      return true;
    });
  } finally {
    globalThis.fetch = original;
  }
});

test('language profiles preserve legacy English voices and never reuse them for Chinese', () => {
  for (const id of ['elevenlabs', 'fish'] as const) {
    const key = id === 'fish' ? 'FISH_REFERENCE_ID' : 'ELEVENLABS_VOICE_ID';
    const env = { JOE_VOICE_PROVIDER: id, [key]: 'legacy' };
    assert.deepEqual(voiceConfig('tts', env).voices, { en: 'legacy', zh: '' });
    assert.deepEqual(
      voiceConfig('tts', { ...env, [`${key}_EN`]: 'english', [`${key}_ZH`]: 'chinese' }).voices,
      { en: 'english', zh: 'chinese' },
    );
    assert.deepEqual(voiceConfig('tts', { JOE_VOICE_PROVIDER: id, [`${key}_ZH`]: 'chinese' }).voices, {
      en: '',
      zh: 'chinese',
    });
  }
});
