import { nanoid } from 'nanoid';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMotionValue } from 'motion/react';
import { api, jsonBody } from './api';
import { canvasSessionId } from './session-storage';
import { clientPublicIp } from './client-ip';
import { applyWidgetSnapshot, type WidgetVisibility, type WidgetCard } from './widget-visibility';
import { createWidgetDisplayGate } from './widget-display-gate';
import { applyResourceSnapshot, type WidgetResources } from './widget-resource-state';
import { readEvents, extractSpeech } from './stream';
import { VoiceQueue } from './voice-queue';
import { TextStream } from './text-stream';
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

const noInitialCards: readonly WidgetCard[] = [];

export function useJoe({ sessionKey = 'joe.session', initialCards = noInitialCards, voiceOutput = true, isolatedStream = false }: { sessionKey?: string; initialCards?: readonly WidgetCard[]; voiceOutput?: boolean; isolatedStream?: boolean } = {}) {
  const textStream = useRef(new TextStream()).current;
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null),
    [messages, setMessages] = useState<Message[]>([]);
  const [greetingToPlay, setGreetingToPlay] = useState('');
  const [sessionId, setSessionId] = useState(''),
    [state, setState] = useState<AgentState>('idle');
  const [expression, setExpression] = useState<Expression>({
    emotion: 'calm',
    intensity: 0.35,
  });
  const level = useMotionValue(0);
  const [playing, setPlaying] = useState(false),
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
  const [widgetCursor, setWidgetCursor] = useState(0);
  const [widgetResources, setWidgetResources] = useState<WidgetResources>({});
  const [widgetVisibility, setWidgetVisibility] = useState<WidgetVisibility>({});
  const [cardRequest, setCardRequest] = useState<{ card: NonNullable<AgentEvent['card']>; turnId: string } | null>(null);
  const displayGate = useRef(createWidgetDisplayGate(event => {
    if (event.type === 'widget.snapshot') setWidgetVisibility(current => applyWidgetSnapshot(current, event.instance));
    if (event.type === 'resource.snapshot') setWidgetResources(current => applyResourceSnapshot(current, event.resource));
    if (event.type === 'card.open' && (event.card === 'costs' || event.card === 'settings' || event.card === 'weather' || event.card === 'video') && event.turnId) setCardRequest({ card: event.card, turnId: event.turnId });
  })).current;
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
      const id = canvasSessionId(localStorage, sessionKey, () => nanoid());
      const session = await api<{ id: string; created?: boolean; messages: Message[]; widgetCursor?: number; widgets?: unknown[]; widgetResources?: unknown[] }>('/session', {
        ...jsonBody({ id, initialCards }),
        signal,
      });
      if (signal?.aborted || !mounted.current) return;
      localStorage.setItem(sessionKey, session.id);
      setWidgetCursor(session.widgetCursor ?? 0);
      setSessionId(session.id);
      setWidgetResources((session.widgetResources ?? []).reduce<WidgetResources>(applyResourceSnapshot, {}));
      setWidgetVisibility((session.widgets ?? []).reduce<WidgetVisibility>(applyWidgetSnapshot, {}));
      setMessages(session.messages);
      setGreetingToPlay(session.created ? session.messages.find(m => m.kind === 'greeting')?.id || '' : '');
      settingsRef.current = config.settings;
      setBootstrap(config);
      setState('idle');
      setError('');
    } catch (e) {
      if (signal?.aborted) return;
      setState('offline');
      setError(e instanceof Error ? e.message : '无法连接 Joe 服务');
    }
  }, [sessionKey, initialCards]);
  useEffect(() => {
    if (!sessionId) return;
    const source = new EventSource(`/joe-api/widget-events?sessionId=${encodeURIComponent(sessionId)}&cursor=${widgetCursor}`);
    const onWidget = (raw: Event) => {
      try {
        const event = JSON.parse((raw as MessageEvent).data);
        if (event.type === 'widget.snapshot' || event.type === 'resource.snapshot') displayGate.receive(event);
      } catch { /* Ignore malformed events and retain the last valid snapshot. */ }
    };
    source.addEventListener('widget', onWidget);
    return () => source.close();
  }, [sessionId, widgetCursor, displayGate]);
  useEffect(() => {
    void clientPublicIp();
    mounted.current = true;
    const controller = new AbortController();
    voice.current = new VoiceQueue(
      (value) => {
        if (mounted.current) setPlaying(value);
      },
      (value) => {
        if (mounted.current) level.set(value);
      },
      (message) => {
        if (mounted.current) {
          turnVoice.current = false;
          displayGate.release();
          setMessages((old) => old.map((m) => ({ ...m, visibleText: undefined })));
          setError(message);
        }
      },
      (value) => {
        if (mounted.current) setVoicePending(value);
      },
      (turnId, end) => {
        if (!mounted.current || turn.current !== turnId) return;
        if (end > 0) displayGate.release();
        setMessages(old => old.map(m => m.turnId === turnId && m.role === 'assistant'
          ? { ...m, visibleText: (m.speechText || '').slice(0, end) } : m));
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
      textStream.clear();
    };
  }, [connect, refreshUsage, level, displayGate]);
  function stop() {
    displayGate.release();
    const old = turn.current;
    const streamed = textStream.snapshot();
    turn.current = '';
    abort.current?.abort();
    speechAbort.current?.abort();
    voice.current?.stop();
    setBusy(false);
    setState('interrupted');
    setMessages((previous) =>
      previous.filter(m => !(m.turnId === old && m.status === 'pending')).map((m) =>
        m.turnId === old && m.role === 'assistant'
          ? { ...m, text: streamed.get(m.id) ?? m.text, visibleText: undefined, status: m.status === 'complete' ? 'complete' : 'interrupted' }
          : m,
      ),
    );
    if (old) cancellation.current = api('/cancel', jsonBody({ sessionId, turnId: old })).catch(() => {});
  }
  const saveSettings = useCallback(async (settings: Settings) => {
    if (saving) return;
    setSaving(true);
    setError('');
    if (!settings.voice) {
      turnVoice.current = false;
      displayGate.release();
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
  }, [saving, displayGate]);
  async function send(text: string, spoken = false, validate?: () => Promise<boolean>) {
    if (uploading || !sessionId || (!text.trim() && !attachments.length)) return false;
    const model = settingsRef.current?.model || bootstrap?.models[0]?.id;
    if (!bootstrap?.configured.llm || !model) {
      setError('请配置 OpenRouter API_TOKEN 和模型列表后开始对话');
      return false;
    }
    if (busy || voice.current?.pending) stop();
    voice.current?.stop();
    voice.current?.unlock();
    const id = nanoid();
    turn.current = id;
    displayGate.begin();
    abort.current = new AbortController();
    turnVoice.current = voiceOutput && Boolean(settingsRef.current?.voice) && Boolean(bootstrap?.configured.tts);
    setBusy(true);
    setState('thinking');
    setError('');
    setExpression({ emotion: 'calm', intensity: 0.35 });
    const language = settingsRef.current?.voiceLanguage || 'auto';
    const signal = abort.current.signal;
    const optimisticId = `pending-${id}`;
    setMessages(old => [...old, { id: optimisticId, sessionId, turnId: id, role: 'user', text, status: 'pending', model, expression: { emotion: 'calm', intensity: 0.35 }, attachments, createdAt: Date.now() }]);
    let completed = false;
    let assistantId = '',
      failed = false,
      accepted = false;
    const event = (event: AgentEvent) => {
      if (turn.current !== id || event.turnId !== id || !mounted.current) return;
      if (event.type === 'widget.snapshot' || event.type === 'resource.snapshot' || event.type === 'card.open') displayGate.receive(event);
      if (event.type === 'messages' && event.user && event.assistant) {
        assistantId = event.assistant.id;
        accepted = true;
        setAttachments([]);
        setMessages((old) => [...old.filter(m => m.id !== optimisticId), event.user!, { ...event.assistant!, visibleText: turnVoice.current ? '' : undefined }]);
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
        if (!turnVoice.current && event.text.trim()) displayGate.release();
        if (isolatedStream && !turnVoice.current) textStream.append(assistantId, event.text);
        else setMessages((old) =>
          old.map((m) => (m.id === assistantId ? { ...m, text: m.text + event.text } : m)),
        );
      }
      if (event.type === 'error') {
        displayGate.release();
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
          displayGate.release();
          voice.current?.stop();
          setMessages((old) => old.map((m) => (m.turnId === id ? { ...m, visibleText: undefined } : m)));
          setState(message.status === 'interrupted' ? 'interrupted' : 'error');
        }
      }
    };
    try {
      if (validate && !await validate()) { if (turn.current === id) setState('idle'); return false; }
      await cancellation.current;
      if (turn.current !== id) return false;
      const clientIp = await clientPublicIp();
      if (turn.current !== id || signal.aborted) return false;
      const response = await fetch('/joe-api/chat', {
        ...jsonBody({
          sessionId,
          turnId: id,
          text,
          model,
          attachmentIds: attachments.map((a) => a.id),
          clientIp,
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
            const [next, rest] = extractSpeech(remaining);
            if (next)
              voice.current?.enqueue(next, sessionId, id, offset + remaining.indexOf(next), speech.language);
            offset += remaining.length - rest.length;
            remaining = rest;
          }
        } catch (error) {
          if (turn.current === id && !speechSignal.aborted) {
            setVoicePending(false);
            displayGate.release();
            setMessages(old => old.map(m => m.turnId === id ? { ...m, visibleText: undefined } : m));
            setError(error instanceof Error ? error.message : '语音准备失败');
          }
        }
      }
      return accepted;
    } catch (e) {
      if (turn.current === id) {
        displayGate.release();
        voice.current?.stop();
        setError(e instanceof Error ? e.message : '连接失败');
        setState('error');
        setMessages((old) =>
          old.map((m) =>
            m.turnId === id && m.role === 'assistant' ? { ...m, text: textStream.get(m.id) ?? m.text, visibleText: undefined, status: 'error' } : m,
          ),
        );
      }
      return accepted;
    } finally {
      if (!completed && turn.current === id) displayGate.release();
      if (!accepted && mounted.current) setMessages(old => old.filter(m => m.id !== optimisticId));
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
  async function openSettingsWidget() {
    const current = generation.current;
    const result = await api<{ instance: unknown }>('/widget-visibility', jsonBody({ sessionId, card: 'settings', visible: true }));
    if (current !== generation.current) return false;
    setWidgetVisibility(previous => applyWidgetSnapshot(previous, result.instance));
    setCardRequest({ card: 'settings', turnId: nanoid() });
    return true;
  }
  async function removeWidget(card: WidgetCard) {
    try {
      const result = await api<{ instance: unknown }>('/widget-visibility', jsonBody({ sessionId, card, visible: false }));
      setWidgetVisibility(current => applyWidgetSnapshot(current, result.instance));
    } catch (error) {
      setError(error instanceof Error ? error.message : '卡片关闭失败');
    }
  }
  async function newSession() {
    setCardRequest(null);
    stop();
    textStream.clear();
    generation.current++;
    uploadAbort.current?.abort();
    setUploading(false);
    try {
      const session = await api<{ id: string; created?: boolean; messages: Message[]; widgetCursor?: number; widgets?: unknown[]; widgetResources?: unknown[] }>('/session', jsonBody({}));
      localStorage.setItem(sessionKey, session.id);
      setWidgetCursor(session.widgetCursor ?? 0);
      setWidgetVisibility((session.widgets ?? []).reduce<WidgetVisibility>(applyWidgetSnapshot, {}));
      setWidgetResources((session.widgetResources ?? []).reduce<WidgetResources>(applyResourceSnapshot, {}));
      setSessionId(session.id);
      setMessages(session.messages);
      setGreetingToPlay(session.messages.find(m => m.kind === 'greeting')?.id || '');
      setAttachments([]);
      setState('idle');
      setError('');
    } catch (e) {
      setError(String(e));
    }
  }
  return {
    bootstrap,
    textStream,
    greetingToPlay,
    acknowledgeGreeting: () => setGreetingToPlay(''),
    messages,
    sessionId,
    state: playing ? ('speaking' as const) : state,
    expression,
    level,
    busy,
    playing,
    voicePending,
    cardRequest,
    widgetVisibility,
    removeWidget,
    openSettingsWidget,
    widgetResources,
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
