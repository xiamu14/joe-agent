import { api } from '../api';
import { SilenceDetector, type InputCallbacks } from './turn';
export function startBatch(
  stream: MediaStream,
  context: AudioContext,
  sessionId: string,
  callbacks: InputCallbacks,
) {
  const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find((type) =>
    MediaRecorder.isTypeSupported(type),
  );
  const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const source = context.createMediaStreamSource(stream),
    analyser = context.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);
  const samples = new Float32Array(analyser.fftSize);
  let detector = new SilenceDetector();
  let chunks: Blob[] = [];
  const abort = new AbortController();
  let size = 0,
    closed = false;
  const interval = setInterval(() => {
    analyser.getFloatTimeDomainData(samples);
    const rms = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
    if (detector.update(rms, performance.now()) && recorder.state === 'recording') recorder.stop();
  }, 50);
  function cleanup() {
    if (closed) return;
    closed = true;
    clearInterval(interval);
    source.disconnect();
    analyser.disconnect();
    abort.abort();
    if (recorder.state === 'recording') recorder.stop();
  }
  recorder.ondataavailable = (event) => {
    if (closed) return;
    chunks.push(event.data);
    size += event.data.size;
    if (size > 11 * 1024 * 1024) {
      cleanup();
      callbacks.error('录音过长，请分段表达');
    }
  };
  recorder.onerror = () => {
    cleanup();
    callbacks.error('录音失败，请重试');
  };
  let pending = Promise.resolve();
  recorder.onstop = () => {
    if (closed) return;
    callbacks.transcribing();
    const body = new FormData();
    body.set('sessionId', sessionId);
    const ext = recorder.mimeType.includes('mp4')
      ? 'mp4'
      : recorder.mimeType.includes('ogg')
        ? 'ogg'
        : 'webm';
    body.set('audio', new Blob(chunks, { type: recorder.mimeType }), `recording.${ext}`);
    chunks = [];
    size = 0;
    detector = new SilenceDetector();
    recorder.start(250);
    pending = pending.then(async () => {
      if (closed) return;
      try {
        const result = await api<{ text: string }>('/transcribe', {
          method: 'POST',
          body,
          signal: abort.signal,
        });
        if (closed) return;
        if (result.text.trim()) callbacks.final(result.text.trim());
      } catch (error) {
        if (!closed) callbacks.error(error instanceof Error ? error.message : '转写失败');
      }
    });
  };
  recorder.start(250);
  callbacks.ready?.();
  return cleanup;
}
