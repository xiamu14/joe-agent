import { AudioTimeline } from './audio-timeline';
import { decodePcm, readSpeechStream } from './speech-stream';

// Schedule PCM chunks on the audio clock; network stalls must also pause the captions.
export async function playStreamedSpeech(response: Response, context: AudioContext, signal: AbortSignal,
  onCaption: (end: number) => void, onPlaying: (playing: boolean) => void, onLevel: (level: number) => void) {
  const nodes = new Set<AudioBufferSourceNode>();
  const cues: { time: number; end: number }[] = [];
  const analyser = context.createAnalyser();
  analyser.fftSize = 256;
  analyser.connect(context.destination);
  const samples = new Uint8Array(256);
  const timeline = new AudioTimeline();
  let characters = 0, cueIndex = 0, frame = 0, received = false, duration = 0, expectedDuration = 0;
  let finish: (() => void) | undefined;
  const stop = () => {
    for (const node of nodes) { node.stop(); node.disconnect(); }
    nodes.clear();
    finish?.();
  };
  const meter = () => {
    if (signal.aborted) return;
    let end: number | undefined;
    while (cueIndex < cues.length && cues[cueIndex].time <= timeline.position(context.currentTime)) end = cues[cueIndex++].end;
    if (end !== undefined) onCaption(end);
    analyser.getByteTimeDomainData(samples);
    onLevel(Math.min(1, Math.sqrt(samples.reduce((sum, v) => sum + ((v - 128) / 128) ** 2, 0) / samples.length) * 5));
    frame = requestAnimationFrame(meter);
  };
  signal.addEventListener('abort', stop, { once: true });
  try {
    signal.throwIfAborted();
    await context.resume();
    if (context.state !== 'running') throw new Error('请点击输入区域后重试语音');
    meter();
    for await (const chunk of readSpeechStream(response)) {
      signal.throwIfAborted();
      const pcm = decodePcm(chunk.audio_base64);
      if (chunk.alignment) {
        const alignment = chunk.alignment;
        expectedDuration = Math.max(expectedDuration, ...alignment.character_end_times_seconds);
        alignment.characters.forEach((character, index) => {
          characters += character.length;
          cues.push({ time: alignment.character_start_times_seconds[index], end: characters });
        });
      }
      if (!pcm.length) continue;
      const buffer = context.createBuffer(1, pcm.length, 24000);
      buffer.copyToChannel(pcm, 0);
      duration += buffer.duration;
      const node = context.createBufferSource();
      node.buffer = buffer;
      node.connect(analyser);
      nodes.add(node);
      node.onended = () => { nodes.delete(node); node.disconnect(); if (!nodes.size) finish?.(); };
      node.start(timeline.schedule(context.currentTime, buffer.duration));
      received = true;
      onPlaying(true);
    }
    if (!received) throw new Error('语音服务没有返回音频');
    if (duration + 0.15 < expectedDuration) throw new Error('语音连接中断，请重试');
    if (nodes.size) await new Promise<void>(resolve => { finish = resolve; });
    signal.throwIfAborted();
  } finally {
    signal.removeEventListener('abort', stop);
    stop();
    cancelAnimationFrame(frame);
    analyser.disconnect();
    onLevel(0);
    onPlaying(false);
  }
}
