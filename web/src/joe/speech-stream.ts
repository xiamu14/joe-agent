export type SpeechChunk = {
  audio_base64: string;
  alignment?: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  } | null;
};

function parseChunk(line: string): SpeechChunk {
  const value = JSON.parse(line);
  if (!value || typeof value.audio_base64 !== 'string') throw new Error('语音数据格式错误');
  const a = value.alignment;
  if (a && (!Array.isArray(a.characters) || !a.characters.every((c: unknown) => typeof c === 'string') ||
    ![a.character_start_times_seconds, a.character_end_times_seconds].every(times =>
      Array.isArray(times) && times.length === a.characters.length && times.every(t => typeof t === 'number' && Number.isFinite(t) && t >= 0))))
    throw new Error('字幕时间戳格式错误');
  return value;
}

export async function* readSpeechStream(response: Response) {
  if (!response.body) throw new Error('语音服务没有返回音频');
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let pending = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      pending += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let end: number;
      while ((end = pending.indexOf('\n')) >= 0) {
        const line = pending.slice(0, end).trim();
        pending = pending.slice(end + 1);
        if (line) yield parseChunk(line);
      }
      if (pending.length > 4 * 1024 * 1024) throw new Error('语音数据过大');
      if (done) break;
    }
    if (pending.trim()) yield parseChunk(pending);
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export function decodePcm(base64: string) {
  const binary = atob(base64);
  if (binary.length % 2) throw new Error('语音数据不完整');
  const samples = new Float32Array(binary.length / 2);
  for (let i = 0; i < samples.length; i++) {
    const value = binary.charCodeAt(i * 2) | (binary.charCodeAt(i * 2 + 1) << 8);
    samples[i] = (value >= 32768 ? value - 65536 : value) / 32768;
  }
  return samples;
}
