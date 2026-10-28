import { useEffect } from 'react';
import { useMotionValue } from 'motion/react';
import { audioLevel } from './voice-input/audio-level';

export function useVoiceLevel(active: boolean, input: MediaStream | null) {
  const level = useMotionValue(0);
  useEffect(() => {
    level.set(0);
    if (!active) return;
    let disposed = false, frame = 0;
    let stream: MediaStream | undefined, context: AudioContext | undefined;
    let source: MediaStreamAudioSourceNode | undefined;
    const release = () => {
      cancelAnimationFrame(frame);
      source?.disconnect();
      if (!input) stream?.getTracks().forEach(track => track.stop());
      void context?.close().catch(() => {});
    };
    void (async () => {
      try {
        // Browser speech recognition owns its stream; request a separate meter only there.
        stream = input ?? await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        if (disposed) { release(); return; }
        context = new AudioContext();
        await context.resume();
        if (disposed) { release(); return; }
        const analyser = context.createAnalyser();
        analyser.fftSize = 1024;
        source = context.createMediaStreamSource(stream);
        source.connect(analyser);
        const samples = new Float32Array(analyser.fftSize);
        const sample = () => {
          analyser.getFloatTimeDomainData(samples);
          level.set(audioLevel(samples));
          frame = requestAnimationFrame(sample);
        };
        sample();
      } catch {
        // Meter failure must not interrupt the existing transcription service.
        release();
        level.set(0);
      }
    })();
    return () => { disposed = true; release(); level.set(0); };
  }, [active, input, level]);
  return level;
}
