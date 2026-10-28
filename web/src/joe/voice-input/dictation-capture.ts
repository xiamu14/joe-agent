import { api } from '../api';
import { SilenceDetector } from './turn';
import { VOICE_ACTIVITY_RMS } from './config';

export function startDictation(stream: MediaStream, context: AudioContext, sessionId: string, callbacks: {
  text(value: string): void; error(): void; stopped(): void; finished(): void; failed(): void;
}) {
  const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find(type => MediaRecorder.isTypeSupported(type));
  const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const source = context.createMediaStreamSource(stream), analyser = context.createAnalyser();
  analyser.fftSize = 2048; source.connect(analyser);
  const samples = new Float32Array(analyser.fftSize), abort = new AbortController();
  let detector = new SilenceDetector(), chunks: Blob[] = [], size = 0, start = performance.now(), lastSound = start;
  let cancelled = false, finishing = false, pending = Promise.resolve();
  const cleanup = () => { clearInterval(interval); clearTimeout(limit); source.disconnect(); analyser.disconnect(); };
  const finish = () => {
    if (finishing || cancelled) return;
    finishing = true; cleanup();
    if (recorder.state === 'recording') recorder.stop();
    callbacks.stopped();
  };
  const interval = setInterval(() => {
    analyser.getFloatTimeDomainData(samples);
    const now = performance.now();
    const rms = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
    if (rms >= VOICE_ACTIVITY_RMS) lastSound = now;
    if (now - lastSound >= 3000) { finish(); return; }
    const ended = detector.update(rms, now);
    if ((ended || now - start >= (detector.started ? 2500 : 15000)) && recorder.state === 'recording') recorder.stop();
  }, 50);
  const limit = setTimeout(finish, 120000);
  recorder.ondataavailable = event => {
    if (cancelled) return;
    size += event.data.size;
    if (size > 11 * 1024 * 1024) { cancel(); callbacks.failed(); }
    else chunks.push(event.data);
  };
  recorder.onerror = () => { cancel(); callbacks.failed(); };
  function cancel() {
    if (cancelled) return;
    cancelled = true; cleanup(); abort.abort();
    if (recorder.state === 'recording') recorder.stop();
  }
  recorder.onstop = () => {
    if (cancelled) return;
    if (detector.started && size) {
      const body = new FormData(), type = recorder.mimeType || 'audio/webm';
      body.set('sessionId', sessionId); body.set('supportedLanguages', 'zh,en');
      body.set('audio', new Blob(chunks, { type }), `recording.${type.includes('mp4') ? 'mp4' : type.includes('ogg') ? 'ogg' : 'webm'}`);
      pending = pending.then(async () => {
        if (cancelled) return;
        try {
          const result = await api<{ text: string }>('/transcribe', { method: 'POST', body, signal: abort.signal });
          if (!cancelled && result.text.trim()) callbacks.text(result.text.trim());
        } catch { if (!cancelled) callbacks.error(); }
      });
    }
    chunks = []; size = 0; detector = new SilenceDetector(); start = performance.now();
    if (finishing) void pending.then(() => { if (!cancelled) callbacks.finished(); });
    else recorder.start(250);
  };
  recorder.start(250);
  return { finish, cancel };
}
