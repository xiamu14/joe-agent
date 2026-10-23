import { useCallback, useEffect, useRef, useState } from 'react';
import { api, jsonBody } from './api';
import { readEvents, extractSentence } from './stream';
import { VoiceQueue } from './voice-queue';
import type {
  Bootstrap,
  Message,
  Settings,
  AgentState,
  Expression,
  Attachment,
  AgentEvent,
  Usage,
} from './types';

export function useJoe() {
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null),
    [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState(''),
    [state, setState] = useState<AgentState>('idle');
  const [expression, setExpression] = useState<Expression>({
    emotion: 'calm',
    intensity: 0.35,
  });
  const [level, setLevel] = useState(0),
    [playing, setPlaying] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]),
    [uploading, setUploading] = useState(false),
    [saving, setSaving] = useState(false);
  const turn = useRef(''),
    abort = useRef<AbortController | null>(null),
    voice = useRef<VoiceQueue | null>(null),
    settingsRef = useRef<Settings | null>(null),
    mounted = useRef(true);
  const speechAbort = useRef<AbortController | null>(null);
  const cancellation = useRef<Promise<unknown> | undefined>(undefined);
  const turnVoice = useRef(false);
  const [voicePending, setVoicePending] = useState(false);
  const uploadAbort = useRef<AbortController | null>(null),
    generation = useRef(0);
  const refreshUsage = useCallback(async () => {
    try {
      const usage = await api<Usage>('/usage');
      if (mounted.current) setBootstrap((old) => (old ? { ...old, usage } : old));
    } catch {}
  }, []);
  const connect = useCallback(async (signal?: AbortSignal) => {
    try {
      const config = await api<Bootstrap>('/bootstrap', { signal });
      const storedId = localStorage.getItem('joe.session');
      const id =
        storedId && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(storedId) ? storedId : undefined;
      const session = await api<{ id: string; messages: Message[] }>('/session', {
        ...jsonBody({ id }),
        signal,
      });
      if (signal?.aborted || !mounted.current) return;
      localStorage.setItem('joe.session', session.id);
      setSessionId(session.id);
      setMessages(session.messages);
      settingsRef.current = config.settings;
      setBootstrap(config);
      setState('idle');
      setError('');
    } catch (e) {
      if (signal?.aborted) return;
      setState('offline');
      setError(e instanceof Error ? e.message : '无法连接 Joe 服务');
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    voice.current = new VoiceQueue(
      (value) => {
        if (mounted.current) setPlaying(value);
      },
      (value) => {
        if (mounted.current) setLevel(value);
      },
      (message) => {
        if (mounted.current) {
          turnVoice.current = false;
          setMessages((old) => old.map((m) => ({ ...m, visibleText: undefined })));
          setError(message);
        }
      },
      (value) => {
        if (mounted.current) setVoicePending(value);
      },
      (turnId, end) => {
        if (mounted.current && turn.current === turnId)
          setMessages((old) =>
            old.map((m) =>
              m.turnId === turnId && m.role === 'assistant'
                ? { ...m, visibleText: (m.speechText || '').slice(0, end) }
                : m,
            ),
          );
      },
    );
    void connect(controller.signal);
    const poll = setInterval(() => void refreshUsage(), 30000);
    return () => {
      mounted.current = false;
      controller.abort();
      abort.current?.abort();
      speechAbort.current?.abort();
      uploadAbort.current?.abort();
      voice.current?.dispose();
      clearInterval(poll);
    };
  }, [connect, refreshUsage]);
  function stop() {
    const old = turn.current;
    turn.current = '';
    abort.current?.abort();
    speechAbort.current?.abort();
    voice.current?.stop();
    setBusy(false);
    setState('interrupted');
    setMessages((previous) =>
      previous.map((m) =>
        m.turnId === old && m.role === 'assistant'
          ? { ...m, visibleText: undefined, status: m.status === 'complete' ? 'complete' : 'interrupted' }
          : m,
      ),
    );
    if (old) cancellation.current = api('/cancel', jsonBody({ sessionId, turnId: old })).catch(() => {});
  }
  async function saveSettings(settings: Settings) {
    if (saving) return;
    setSaving(true);
    setError('');
    if (!settings.voice) {
      turnVoice.current = false;
      speechAbort.current?.abort();
      voice.current?.stop();
      setMessages((old) => old.map((m) => ({ ...m, visibleText: undefined })));
    }
    settingsRef.current = settings;
    setBootstrap((old) => (old ? { ...old, settings } : old));
    try {
      const stored = await api<Settings>('/settings', jsonBody(settings, 'PUT'));
      settingsRef.current = stored;
      setBootstrap((old) => (old ? { ...old, settings: stored } : old));
    } catch (e) {
      setError(e instanceof Error ? e.message : '设置保存失败');
      try {
        const config = await api<Bootstrap>('/bootstrap');
        settingsRef.current = config.settings;
        setBootstrap(config);
      } catch {
        setState('offline');
      }
    } finally {
      setSaving(false);
    }
  }
  async function send(text: string, spoken = false) {
    if ((!spoken && busy) || uploading || !sessionId || (!text.trim() && !attachments.length)) return false;
    const model = settingsRef.current?.model || bootstrap?.models[0]?.id;
    if (!bootstrap?.configured.llm || !model) {
      setError('请配置 OpenRouter API_TOKEN 和模型列表后开始对话');
      return false;
    }
    if (spoken && (busy || voice.current?.pending)) stop();
    voice.current?.stop();
    voice.current?.unlock();
    const id = crypto.randomUUID();
    turn.current = id;
    abort.current = new AbortController();
    turnVoice.current = Boolean(settingsRef.current?.voice);
    setBusy(true);
    setState('thinking');
    setError('');
    setExpression({ emotion: 'calm', intensity: 0.35 });
    const language = settingsRef.current?.voiceLanguage || 'auto';
    const signal = abort.current.signal;
    let completed = false;
    let assistantId = '',
      failed = false,
      accepted = false;
    const event = (event: AgentEvent) => {
      if (turn.current !== id || event.turnId !== id || !mounted.current) return;
      if (event.type === 'messages' && event.user && event.assistant) {
        assistantId = event.assistant.id;
        accepted = true;
        setAttachments([]);
        setMessages((old) => [...old, event.user!, event.assistant!]);
      }
      if (event.type === 'state' && event.state) setState(event.state);
      if (event.type === 'expression' && event.expression) {
        setExpression(event.expression);
        setMessages((old) =>
          old.map((m) => (m.id === assistantId ? { ...m, expression: event.expression! } : m)),
        );
      }
      if (event.type === 'sources')
        setMessages((old) => old.map((m) => (m.id === assistantId ? { ...m, sources: event.sources } : m)));
      if (event.type === 'text.delta' && event.text) {
        setMessages((old) =>
          old.map((m) => (m.id === assistantId ? { ...m, text: m.text + event.text } : m)),
        );
      }
      if (event.type === 'error') {
        failed = true;
        voice.current?.stop();
        setMessages((old) => old.map((m) => (m.turnId === id ? { ...m, visibleText: undefined } : m)));
        setError(String(event.message || '回答失败'));
        setState('error');
      }
      if (event.type === 'message.completed' && typeof event.message === 'object') {
        const message = event.message;
        setMessages((old) =>
          old.map((m) =>
            m.id === message.id ? { ...message, visibleText: m.visibleText, sources: m.sources } : m,
          ),
        );
        if (message.status === 'complete' && !failed) {
          completed = true;
          setState('idle');
        } else {
          voice.current?.stop();
          setMessages((old) => old.map((m) => (m.turnId === id ? { ...m, visibleText: undefined } : m)));
          setState(message.status === 'interrupted' ? 'interrupted' : 'error');
        }
      }
    };
    try {
      await cancellation.current;
      if (turn.current !== id) return false;
      const response = await fetch('/joe-api/chat', {
        ...jsonBody({
          sessionId,
          turnId: id,
          text,
          model,
          attachmentIds: attachments.map((a) => a.id),
        }),
        signal: abort.current.signal,
      });
      await readEvents(response, event);
      if (completed && !failed && turn.current === id && turnVoice.current && bootstrap?.configured.tts) {
        setVoicePending(true);
        speechAbort.current = new AbortController();
        const speechSignal = AbortSignal.any([signal, speechAbort.current.signal]);
        try {
          const speech = await api<{ text: string; language: 'en' | 'zh' }>('/speech-text', {
            ...jsonBody({ sessionId, turnId: id, language }),
            signal: speechSignal,
          });
          if (speechSignal.aborted || turn.current !== id || !turnVoice.current || !mounted.current)
            return true;
          setMessages((old) =>
            old.map((m) =>
              m.id === assistantId
                ? { ...m, speechText: speech.text, speechLanguage: speech.language, visibleText: '' }
                : m,
            ),
          );
          let remaining = speech.text,
            offset = 0;
          while (remaining) {
            const [next, rest] = extractSentence(remaining, true);
            if (next)
              voice.current?.enqueue(next, sessionId, id, offset + remaining.indexOf(next), speech.language);
            offset += remaining.length - rest.length;
            remaining = rest;
          }
        } catch (error) {
          if (turn.current === id && !speechSignal.aborted) {
            setVoicePending(false);
            setError(error instanceof Error ? error.message : '语音准备失败');
          }
        }
      }
      return true;
    } catch (e) {
      if (turn.current === id) {
        voice.current?.stop();
        setError(e instanceof Error ? e.message : '连接失败');
        setState('error');
        setMessages((old) =>
          old.map((m) =>
            m.turnId === id && m.role === 'assistant' ? { ...m, visibleText: undefined, status: 'error' } : m,
          ),
        );
      }
      return accepted;
    } finally {
      if (turn.current === id) {
        setBusy(false);
        void refreshUsage();
      }
    }
  }
  async function upload(file: File) {
    if (!sessionId || attachments.length >= 5 || uploading || busy) return;
    if (!/\.(txt|md)$/i.test(file.name) || file.size > 1024 * 1024) {
      setError('仅支持 1MB 以内的 .md / .txt 文件');
      return;
    }
    setUploading(true);
    setError('');
    const current = generation.current;
    uploadAbort.current = new AbortController();
    try {
      const form = new FormData();
      form.set('sessionId', sessionId);
      form.set('file', file);
      const attachment = await api<Attachment>('/attachments', {
        method: 'POST',
        body: form,
        signal: uploadAbort.current.signal,
      });
      if (current === generation.current) setAttachments((old) => [...old, attachment]);
    } catch (e) {
      if (current === generation.current) setError(e instanceof Error ? e.message : '上传失败');
    } finally {
      if (current === generation.current) setUploading(false);
    }
  }
  async function removeAttachment(id: string) {
    try {
      await api('/attachments', jsonBody({ id, sessionId }, 'DELETE'));
      setAttachments((old) => old.filter((a) => a.id !== id));
    } catch (e) {
      setError(String(e));
    }
  }
  async function newSession() {
    stop();
    generation.current++;
    uploadAbort.current?.abort();
    setUploading(false);
    try {
      const session = await api<{ id: string; messages: Message[] }>('/session', jsonBody({}));
      localStorage.setItem('joe.session', session.id);
      setSessionId(session.id);
      setMessages([]);
      setAttachments([]);
      setState('idle');
      setError('');
    } catch (e) {
      setError(String(e));
    }
  }
  return {
    bootstrap,
    messages,
    sessionId,
    state: playing ? ('speaking' as const) : state,
    expression,
    level,
    busy,
    playing,
    voicePending,
    error,
    attachments,
    uploading,
    saving,
    send,
    stop,
    saveSettings,
    upload,
    removeAttachment,
    newSession,
    setState,
    setError,
    reconnect: () => connect(),
    unlock: () => voice.current?.unlock(),
  };
}
