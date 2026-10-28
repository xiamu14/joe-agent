import { contentSurface } from '../workspace/material';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { TextStream } from '../../joe/text-stream';
import { Button } from '@base-ui/react/button';
import { AnimatePresence, motion } from 'motion/react';
import { api, jsonBody } from '../../joe/api';
import type { Message } from '../../joe/types';

export function MessageBody({ message, textStream }: { message: Message; textStream: TextStream }) {
  const streamed = useSyncExternalStore(
    (listener) => textStream.subscribe(message.id, listener),
    () => textStream.get(message.id),
  );
  const [shown, setShown] = useState('');
  const active = streamed !== undefined;
  const target = active ? (message.status === 'streaming' ? streamed : message.text) : message.text;
  useEffect(() => {
    if (!active) return;
    if (message.status === 'error' || message.status === 'interrupted') {
      textStream.delete(message.id);
      setShown(target);
      return;
    }
    if (shown === target) {
      if (message.status !== 'streaming') textStream.delete(message.id);
      return;
    }
    const segments = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(target)];
    const next = segments.find(segment => segment.index >= shown.length);
    if (!next) { setShown(target); return; }
    const timer = setTimeout(() => setShown(target.slice(0, next.index + next.segment.length)), 20);
    return () => clearTimeout(timer);
  }, [active, message.id, message.status, shown, target, textStream]);
  const [expanded, setExpanded] = useState(false);
  const [translation, setTranslation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const main = message.visibleText ?? message.speechText ?? (active ? shown : message.text);
  const original = message.speechText && message.speechText.trim() !== message.text.trim() ? message.text : '';
  async function toggleTranslation() {
    setExpanded(!expanded);
    if (expanded || original || translation || loading) return;
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError('');
    try {
      const result = await api<{ text: string }>('/speech-text', {
        ...jsonBody({ sessionId: message.sessionId, turnId: message.turnId, messageId: message.id, language: 'auto', purpose: 'translation' }),
        signal: controller.signal,
      });
      if (!controller.signal.aborted) setTranslation(result.text);
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : '翻译失败，请重试');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  return <>
    <div className="whitespace-pre-wrap break-words text-[15px] font-semibold leading-[1.75] [overflow-wrap:anywhere]">
      {main || (message.visibleText !== undefined ? '准备语音…' : message.status === 'streaming' || active ? '正在思考…' : '未返回正文')}
    </div>
    {message.attachments.map(file => <div className="mt-2 text-xs text-white/90" key={file.id}>↗ {file.name}</div>)}
    {message.status === 'complete' && main && <Button className="mt-2 rounded-lg py-1 text-[11px] font-semibold text-white/90 hover:text-white" aria-expanded={expanded} onClick={() => void toggleTranslation()}>{expanded ? '收起译文' : '查看译文'}</Button>}
    <AnimatePresence initial={false}>
      {expanded && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
        <div className={`mt-2 whitespace-pre-wrap break-words p-3 text-sm leading-7 text-white/85 ${contentSurface}`} role={error ? 'alert' : 'status'}>
          {loading ? '翻译中…' : error || original || (translation.trim() === main.trim() ? '无需翻译' : translation)}
        </div>
      </motion.div>}
    </AnimatePresence>
  </>;
}
