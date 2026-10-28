import { useEffect, useRef, useState } from 'react';
import { startDictation } from './voice-input/dictation-capture';
import { startRealtimeDictation } from './voice-input/realtime-dictation';
import { api, jsonBody } from './api';
import { browserSpeechAvailable, startBrowserSpeech } from './voice-input/browser-speech';

export function useDictation(sessionId: string, onText: (text: string) => void) {
  const [state, setState] = useState<'idle' | 'connecting' | 'recording' | 'transcribing'>('idle');
  const [inputStream, setInputStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState('');
  const [browserSupported, setBrowserSupported] = useState(false);
  const current = useRef(0);
  const cancelCurrent = useRef<(() => void) | null>(null);
  const stopCurrent = useRef<(() => void) | null>(null);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;
  useEffect(() => { setBrowserSupported(browserSpeechAvailable()); }, []);
  useEffect(() => {
    setState('idle'); setPreview(''); setInputStream(null);
    return () => { current.current++; cancelCurrent.current?.(); };
  }, [sessionId]);

  async function start() {
    const token = ++current.current;
    const abort = new AbortController();
    let stream: MediaStream | undefined, context: AudioContext | undefined;
    let capture: ReturnType<typeof startDictation> | undefined;
    const release = () => { setInputStream(value => value === stream ? null : value); stream?.getTracks().forEach(track => track.stop()); void context?.close().catch(() => {}); };
    cancelCurrent.current = () => { abort.abort(); capture?.cancel(); release(); };
    stopCurrent.current = () => {
      if (capture) capture.finish();
      else { current.current++; cancelCurrent.current?.(); setState('idle'); }
    };
    setError(''); setState('connecting');
    try {
      if (browserSpeechAvailable()) {
        capture = startBrowserSpeech(sessionId, {
          text: value => { if (token === current.current) onTextRef.current(value); },
          preview: value => { if (token === current.current) setPreview(value); },
          stopped: () => { if (token === current.current) setState('transcribing'); },
          finished: () => { if (token === current.current) setState('idle'); },
          failed: () => { if (token === current.current) { current.current++; cancelCurrent.current?.(); setPreview(''); setState('idle'); setError('语音识别失败，请检查浏览器权限'); } },
        });
        setState('recording');
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('录音不可用');
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
      if (token !== current.current) { release(); return; }
      setInputStream(stream);
      context = new AudioContext();
      await context.resume();
      if (token !== current.current) { release(); return; }
      const config = await api<{ mode: 'batch' | 'elevenlabs-realtime'; token?: string }>('/voice-input', { ...jsonBody({ sessionId }), signal: abort.signal });
      if (token !== current.current) { release(); return; }
      const callbacks = {
        text: (value: string) => { if (token === current.current) onTextRef.current(value); },
        error: () => { if (token === current.current) setError('识别失败，请重试'); },
        stopped: () => { release(); if (token === current.current) setState('transcribing'); },
        failed: () => { if (token === current.current) { current.current++; cancelCurrent.current?.(); setPreview(''); setState('idle'); setError('录音失败，请重试'); } },
        finished: () => { release(); if (token === current.current) setState('idle'); },
        preview: (value: string) => { if (token === current.current) setPreview(value); },
      };
      capture = config.mode === 'elevenlabs-realtime' && config.token
        ? await startRealtimeDictation(stream, context, sessionId, config.token, { ...callbacks, error: callbacks.failed })
        : startDictation(stream, context, sessionId, callbacks);
      if (token !== current.current) { capture.cancel(); release(); return; }
      setState('recording');
    } catch {
      release();
      if (token === current.current) { setState('idle'); setError('无法录音，请检查麦克风权限'); }
    }
  }
  const cancel = () => { current.current++; cancelCurrent.current?.(); setPreview(''); setState('idle'); };
  return { state, inputStream, error, preview, setPreview, browserSupported, cancel, toggle: () => { if (state === 'recording' || state === 'connecting') stopCurrent.current?.(); else if (state === 'idle') void start(); } };
}
