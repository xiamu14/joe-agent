import { useEffect, useRef, useState } from 'react';
import { useRecorder } from './use-recorder';
import type { useJoe } from './use-joe';

export function useVoiceInput(joe: ReturnType<typeof useJoe>) {
  const [access, setAccess] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [muted, setMuted] = useState<boolean | null>(null);
  const [unsent, setUnsent] = useState<{ id: string; text: string }[]>([]);
  const currentSession = useRef(joe.sessionId);
  currentSession.current = joe.sessionId;
  useEffect(() => setUnsent([]), [joe.sessionId]);
  const [state, setState] = useState<'idle' | 'listening' | 'transcribing' | 'error'>('idle');
  const recorder = useRecorder(
    joe.sessionId,
    (text) => {
      const session = joe.sessionId;
      void joe.send(text, true).then(accepted => {
        if (!accepted && currentSession.current === session) setUnsent(current => [...current, { id: crypto.randomUUID(), text }]);
      });
    },
    setState,
    joe.setError,
    () => { if (joe.busy || joe.voicePending) joe.stop(); },
  );
  const ready = Boolean(joe.sessionId && joe.bootstrap?.configured.asr && joe.bootstrap.configured.llm);

  useEffect(() => {
    const saved = localStorage.getItem('joe.voice-access');
    setAccess(saved || 'new');
    setAsking(!saved);
  }, []);
  useEffect(() => {
    if (joe.bootstrap && muted === null) setMuted(joe.bootstrap.settings.defaultMuted);
  }, [joe.bootstrap, muted]);
  useEffect(() => {
    if (access !== 'enabled' || muted !== false || !ready) return;
    void recorder.start();
    return () => recorder.cancel();
  }, [access, muted, ready, joe.sessionId]);

  function enable() {
    joe.unlock();
    localStorage.setItem('joe.voice-access', 'enabled');
    setAccess('enabled');
    setAsking(false);
    setMuted(false);
    if (ready) void recorder.start();
  }
  function skip() {
    localStorage.setItem('joe.voice-access', 'skipped');
    setAccess('skipped');
    setAsking(false);
    setMuted(true);
  }
  function toggleMuted() {
    if (recorder.recording || recorder.transcribing) {
      recorder.cancel();
      setMuted(true);
    } else enable();
  }
  return {
    ...recorder, asking, enable, skip, ready, state,
    muted: muted !== false || access !== 'enabled',
    toggleMuted,
    unsent,
    retry: async (id: string) => {
      const message = unsent.find(item => item.id === id);
      if (message && await joe.send(message.text, true)) setUnsent(current => current.filter(item => item.id !== id));
    },
    status: state === 'error' ? '接听故障' : recorder.recording
      ? recorder.mode ? recorder.transcribing ? '识别中' : '接听中' : '连接中'
      : '未接听',
  };
}
