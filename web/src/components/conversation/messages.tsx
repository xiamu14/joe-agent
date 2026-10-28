import { contentSurface } from '../workspace/material';
import { memo, useLayoutEffect, useRef } from 'react';
import type { Message } from '../../joe/types';
import type { TextStream } from '../../joe/text-stream';
import { MessageBody } from './message-body';
export const MessageList = memo(function MessageList({ messages, textStream }: { messages: Message[]; textStream: TextStream }) {
  const list = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  useLayoutEffect(() => {
    if (list.current && following.current) list.current.scrollTop = list.current.scrollHeight;
  }, [messages]);
  useLayoutEffect(() => {
    const element = list.current;
    if (!element) return;
    const observer = new ResizeObserver(() => { if (following.current) element.scrollTop = element.scrollHeight; });
    for (const child of element.children) observer.observe(child);
    return () => observer.disconnect();
  }, [messages]);
  return (
    <div ref={list} className="mr-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-6 pb-5"
      role="log" aria-label="当前会话" aria-live="off"
      onScroll={event => { const element = event.currentTarget; following.current = element.scrollHeight - element.clientHeight - element.scrollTop < 64; }}>
      {!messages.length && <div className="m-auto py-6 text-center text-base font-semibold text-white/90">你好，我是 Joe。</div>}
      {messages.map(message => <MessageRow key={message.id} message={message} textStream={textStream} />)}
    </div>
  );
});

const MessageRow = memo(function MessageRow({ message, textStream }: { message: Message; textStream: TextStream }) {
  return (<article aria-label={message.role === 'user' ? '你的消息' : 'Joe 的回答'}
        className={`flex max-w-[92%] shrink-0 flex-col ${message.role === 'user' ? 'self-end items-end' : 'self-start items-start'}`}>
        <div className={`max-w-full px-4 py-3 ${contentSurface}`}><MessageBody message={message} textStream={textStream} /></div>
        {message.sources?.length ? <div className="mt-2 flex flex-wrap gap-2">
          {message.sources.filter(source => /^https?:\/\//.test(source.url)).map((source, i) => <a key={`${source.url}-${i}`} href={source.url} target="_blank" rel="noopener noreferrer" className="rounded-lg text-xs text-white/90 underline underline-offset-4">{source.title}</a>)}
        </div> : null}
        {['interrupted', 'error'].includes(message.status) && <span className="mt-1 text-xs text-white/90">{message.status === 'interrupted' ? '已中断' : '回答失败，请重试'}</span>}
      </article>);
});
