import test from 'node:test';
import assert from 'node:assert/strict';
import { VoiceHttpError, voiceError } from '../src/joe/voice-errors';

test('Fish billing errors identify separate API credit instead of blaming configuration', () => {
  for (const action of ['语音识别', '语音合成']) {
    const message = voiceError(new VoiceHttpError(402), action).message;
    assert.match(message, /HTTP 402/);
    assert.match(message, /API 额度不足/);
    assert.match(message, /网站平台额度独立/);
    assert.match(message, /fish.audio\/app\/developers/);
    assert.doesNotMatch(message, /请检查 Fish 配置/);
  }
});
test('voice errors distinguish authentication, limits, timeout and transport without leaking raw errors', () => {
  assert.match(voiceError(new VoiceHttpError(401), '转写').message, /Token 无效/);
  assert.match(voiceError(new VoiceHttpError(429), '转写').message, /并发限制/);
  assert.match(voiceError(new VoiceHttpError(503), '转写').message, /暂不可用/);
  assert.match(voiceError(new DOMException('secret', 'TimeoutError'), '转写').message, /超时/);
  assert.doesNotMatch(voiceError(new Error('secret-token'), '转写').message, /secret-token/);
});
