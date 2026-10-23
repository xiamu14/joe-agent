import { useEffect, useRef, useState } from 'react';
import { api, jsonBody } from './api';
import { startRealtime } from './voice-input/realtime';
import { startBatch } from './voice-input/batch';
import { startIdleTimeout } from './voice-input/idle-timeout';
export function useRecorder(
  sessionId: string,
  onText: (text: string) => void,
  onState: (state: 'idle' | 'listening' | 'transcribing' | 'error') => void,
  onError: (message: string) => void,
) {
  const [recording, setRecording] = useState(false),
    [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState(''),
    [mode, setMode] = useState('');
  const epoch = useRef(0),
    cleanup = useRef<(() => void) | null>(null),
    active = useRef(false);
  const callbacks = useRef({ onText, onState, onError });
  callbacks.current = { onText, onState, onError };
  function release() {
    epoch.current++;
    active.current = false;
    cleanup.current?.();
    cleanup.current = null;
  }
  function cancel() {
    release();
    setRecording(false);
    setTranscribing(false);
    setTranscript('');
    callbacks.current.onState('idle');
  }
  useEffect(() => () => release(), []);
  async function toggle() {
    if (active.current) {
      cancel();
      return;
    }
    active.current = true;
    const token = ++epoch.current;
    setRecording(true);
    setTranscript('');
    setMode('');
    callbacks.current.onState('listening');
    const abort = new AbortController();
    let stream: MediaStream | undefined,
      context: AudioContext | undefined,
      stopInput: (() => void) | undefined,
      stopIdleTimeout: (() => void) | undefined;
    cleanup.current = () => {
      abort.abort();
      stopIdleTimeout?.();
      stopInput?.();
      stream?.getTracks().forEach((track) => track.stop());
      void context?.close().catch(() => {});
    };
    const fail = (message: string) => {
      if (token !== epoch.current) return;
      release();
      setRecording(false);
      setTranscribing(false);
      callbacks.current.onState('error');
      callbacks.current.onError(message);
    };
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error('当前浏览器无法录音，请使用 localhost/HTTPS');
      context = new AudioContext({ sampleRate: 16000 });
      await context.resume();
      if (token !== epoch.current) return;
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
        },
      });
      if (token !== epoch.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const config = await api<{
        mode: 'batch' | 'elevenlabs-realtime';
        token?: string;
      }>('/voice-input', {
        ...jsonBody({ sessionId }),
        signal: abort.signal,
      });
      if (token !== epoch.current) return;
      const handlers = {
        ready: () => {
          if (token !== epoch.current) return;
          setMode(config.mode);
          stopIdleTimeout?.();
          stopIdleTimeout = startIdleTimeout(stream!, context!, () => {
            if (token === epoch.current) cancel();
          });
        },
        partial: (text: string) => {
          if (token === epoch.current) setTranscript(text);
        },
        final: (text: string) => {
          if (token !== epoch.current) return;
          setTranscribing(false);
          setTranscript('');
          callbacks.current.onState('listening');
          callbacks.current.onText(text);
        },
        error: fail,
        transcribing: () => {
          if (token === epoch.current) {
            setTranscribing(true);
            callbacks.current.onState('transcribing');
          }
        },
      };
      stopInput =
        config.mode === 'elevenlabs-realtime' && config.token
          ? await startRealtime(stream, context, config.token, handlers)
          : startBatch(stream, context, sessionId, handlers);
      if (token !== epoch.current) {
        stopInput();
        return;
      }
    } catch (error) {
      fail(error instanceof Error ? error.message : '无法开启语音输入');
    }
  }
  return { recording, transcribing, transcript, mode, toggle, cancel };
}
