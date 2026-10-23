import { VOICE_ACTIVITY_RMS, VOICE_INPUT_IDLE_TIMEOUT_MS } from './config';

export function startIdleTimeout(stream: MediaStream, context: AudioContext, onIdle: () => void) {
  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);
  const samples = new Float32Array(analyser.fftSize);
  let lastVoice = performance.now();
  const timer = setInterval(() => {
    analyser.getFloatTimeDomainData(samples);
    const now = performance.now();
    const rms = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
    if (rms >= VOICE_ACTIVITY_RMS) lastVoice = now;
    if (now - lastVoice >= VOICE_INPUT_IDLE_TIMEOUT_MS) {
      stop();
      onIdle();
    }
  }, 100);
  function stop() {
    clearInterval(timer);
    source.disconnect();
    analyser.disconnect();
  }
  return stop;
}
