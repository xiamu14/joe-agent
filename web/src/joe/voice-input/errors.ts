export function dictationError(error: unknown, fallback = '语音识别失败，请重试'): string {
  if (error instanceof Error) {
    if (error.name === 'NotAllowedError') return '请允许使用麦克风';
    if (error.name === 'NotFoundError') return '未找到麦克风';
    if (error.name === 'NotReadableError') return '麦克风暂不可用';
    if (/not available in your region/i.test(error.message)) return '当前地区无法使用此模型';
    return error.message || fallback;
  }
  return typeof error === 'string' && error ? error : fallback;
}

export function browserSpeechError(code: string): Error {
  const messages: Record<string, string> = {
    'not-allowed': '请允许使用麦克风',
    'service-not-allowed': '浏览器语音服务不可用',
    'audio-capture': '麦克风暂不可用',
    network: '语音连接失败，请检查网络',
    'language-not-supported': '语音服务不支持当前语言',
  };
  return new Error(messages[code] || '语音识别失败，请重试');
}
