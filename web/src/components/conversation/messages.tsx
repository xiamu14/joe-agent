import { useLayoutEffect, useRef } from 'react';
import type { Message } from '../../joe/types';
export function MessageList({ messages }: { messages: Message[] }) {
  const list = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [messages]);
  return (
    <div
      ref={list}
      className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5 scrollbar-none"
      role="log"
      aria-label="当前会话"
      aria-live="off"
    >
      {!messages.length && (
        <div className="m-auto py-8 text-center text-sm text-slate-400">
          <p className="text-slate-200">你好，我是 Joe。</p>
        </div>
      )}
      {messages.map((message) => (
        <article
          key={message.id}
          className={`flex max-w-[88%] shrink-0 flex-col ${message.role === 'user' ? 'self-end items-end' : 'self-start items-start'}`}
        >
          <div className="mb-1.5 flex gap-2 font-mono text-[10px] text-slate-500">
            <span>{message.role === 'user' ? 'YOU' : 'JOE'}</span>
          </div>
          <div
            className={`whitespace-pre-wrap break-words rounded-2xl border px-4 py-3 text-sm leading-relaxed text-slate-200 [overflow-wrap:anywhere] ${message.role === 'user' ? 'rounded-tr-sm border-blue-300/10 bg-[#172442]' : 'rounded-tl-sm border-white/5 bg-[#151a29]'}`}
          >
            {message.text || (message.status === 'streaming' ? '正在思考…' : '未返回正文')}
            {message.speechText && (
              <div className="mt-3 border-t border-white/10 pt-2 text-sky-200" lang={message.speechLanguage}>
                {message.visibleText === undefined ? message.speechText : message.visibleText || '准备播报…'}
              </div>
            )}
            {message.attachments.map((file) => (
              <div className="mt-2 text-xs text-sky-200" key={file.id}>
                ↗ {file.name}
              </div>
            ))}
          </div>
          {message.sources?.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {message.sources
                .filter((s) => /^https?:\/\//.test(s.url))
                .map((source, i) => (
                  <a
                    key={`${source.url}-${i}`}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-sky-300 underline"
                  >
                    {source.title}
                  </a>
                ))}
            </div>
          ) : null}
          {['interrupted', 'error'].includes(message.status) && (
            <span className="mt-1 text-xs text-amber-300">
              {message.status === 'interrupted' ? '已中断 · 内容可能不完整' : '回答失败 · 可重新发送'}
            </span>
          )}
        </article>
      ))}
    </div>
  );
}
