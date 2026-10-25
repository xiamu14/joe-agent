import { memo, useLayoutEffect, useRef } from 'react';
import type { Message } from '../../joe/types';
import { MessageBody } from './message-body';
export const MessageList = memo(function MessageList({ messages }: { messages: Message[] }) {
  const list = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  useLayoutEffect(() => {
    if (list.current && following.current) list.current.scrollTop = list.current.scrollHeight;
  }, [messages]);
  return (
    <div ref={list} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-6 pb-5 [scrollbar-width:thin] [scrollbar-color:#ffffff30_transparent]"
      role="log" aria-label="当前会话" aria-live="off"
      onScroll={event => { const element = event.currentTarget; following.current = element.scrollHeight - element.clientHeight - element.scrollTop < 64; }}>
      {!messages.length && <div className="m-auto py-6 text-center text-base font-semibold text-white/90">你好，我是 Joe。</div>}
      {messages.map(message => <MessageRow key={message.id} message={message} />)}
    </div>
  );
});

const MessageRow = memo(function MessageRow({ message }: { message: Message }) {
  return (<article aria-label={message.role === 'user' ? '你的消息' : 'Joe 的回答'}
        className={`flex max-w-[92%] shrink-0 flex-col ${message.role === 'user' ? 'self-end items-end' : 'self-start items-start'}`}>
        <div className={`max-w-full rounded-[24px] px-4 py-3 ${message.role === 'user' ? 'bg-white/10' : 'bg-white/5'}`}><MessageBody message={message} /></div>
        {message.sources?.length ? <div className="mt-2 flex flex-wrap gap-2">
          {message.sources.filter(source => /^https?:\/\//.test(source.url)).map((source, i) => <a key={`${source.url}-${i}`} href={source.url} target="_blank" rel="noopener noreferrer" className="rounded-lg text-xs text-white/80 underline underline-offset-4">{source.title}</a>)}
        </div> : null}
        {['interrupted', 'error'].includes(message.status) && <span className="mt-1 text-xs text-white/80">{message.status === 'interrupted' ? '已中断' : '回答失败，请重试'}</span>}
      </article>);
});
