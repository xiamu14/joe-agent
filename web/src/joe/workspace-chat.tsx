import { MessagePrompt } from './composer/message-prompt';
import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Faq } from '../components/rare-ui/faq';
import { WorkspaceGreeting } from './workspace-greeting';
import { chatTurns } from './chat-turns';
import { chatTimes } from './chat-time';
import { MarkdownAnswer } from './markdown-answer';
import type { useJoe } from './use-joe';
import { AiStatus } from '../components/rare-ui/ai-status';
import { chatError, chatStatus } from './chat-status';
import { Shdr01 } from '../components/shader-orb/shdr-01';
import type { OrbState } from '../components/shader-orb/orb-state';

function TimeMarker({ label }: { label: string }) {
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="my-4 flex items-center justify-center gap-2 text-[11px] text-white/40">
    <span aria-hidden="true" className="h-px w-9 bg-gradient-to-r from-transparent to-white/30" />
    <time>{label}</time>
    <span aria-hidden="true" className="h-px w-9 bg-gradient-to-l from-transparent to-white/30" />
  </motion.div>;
}

export function WorkspaceChat({ joe, onSpeakingChange, orbState }: { joe: ReturnType<typeof useJoe>; onSpeakingChange: (playing: boolean) => void; orbState?: OrbState }) {
  const turns = chatTurns(joe.messages);
  const times = chatTimes(joe.messages);
  const users = new Map(joe.messages.filter(message => message.role === 'user').map(message => [message.turnId, message]));
  const scroll = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  useEffect(() => { follow.current = true; }, [turns.at(-1)?.id]);
  useEffect(() => {
    if (follow.current && scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [joe.messages, joe.state, joe.error]);
  const waitingForSpeech = turns.at(-1)?.answer?.visibleText === '' && (joe.busy || joe.voicePending);
  const status = chatStatus(waitingForSpeech ? 'thinking' : joe.state, Boolean(joe.bootstrap));
  const latest = turns.at(-1);
  const failedUser = latest ? users.get(latest.id) : undefined;
  const failedTally = latest?.answer?.status === 'error' && failedUser?.command === 'tally';
  const error = chatError(joe.state, joe.error, latest?.answer?.status);
  const errorText = failedTally ? '记账失败了，让我重新试试' : joe.error || latest?.answer?.error || '回复失败，请重试';
  return (
    <motion.aside initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="flex h-fit max-h-[540px] flex-col rounded-[28px] bg-[#151515] p-5 lg:col-start-3 lg:row-start-1 lg:max-h-full lg:min-h-[min(100%,calc(var(--chat-width)*1.618))] lg:self-start" aria-label="聊天记录">
      <motion.div className="mb-3 flex items-center justify-between gap-3">
        <motion.h2 className="text-xs font-normal text-white/35">对话</motion.h2>
      </motion.div>
      <motion.div className="relative grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] overflow-hidden rounded-lg">
      <motion.div ref={scroll} tabIndex={0} role="region" aria-label="聊天消息" onScroll={() => { const el = scroll.current; if (el) follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48; }} className="min-h-0 overflow-y-auto pb-4 pt-7 [scrollbar-width:none]! [&::-webkit-scrollbar]:hidden!">
        {joe.messages.filter(message => message.kind === 'greeting').map(message => <WorkspaceGreeting key={message.id} message={message} autoplay={joe.greetingToPlay === message.id} onAutoplay={joe.acknowledgeGreeting} onPlayingChange={onSpeakingChange} />)}
        {turns.map(turn => <motion.div key={turn.id} className="mb-4">
          {times.has(users.get(turn.id)?.id || '') && <TimeMarker label={times.get(users.get(turn.id)?.id!)!} />}
          {turn.answer?.text && turn.answer.visibleText !== '' && turn.answer.status !== 'error' ? <Faq items={[{ id: turn.id, question: turn.question, questionContent: users.has(turn.id) ? <MessagePrompt message={users.get(turn.id)!} /> : undefined, beforeAnswer: times.has(turn.answer.id) ? <TimeMarker label={times.get(turn.answer.id)!} /> : undefined, answer: <MarkdownAnswer message={turn.answer} voicePending={joe.voicePending && turn.id === turns.at(-1)?.id} /> }]} defaultValue={turn.id} accent="#FC4C01" avatar={null} className="gap-4 [&_[data-slot=faq-question]]:self-end [&_[data-slot=faq-question]]:rounded-bl-[18px] [&_[data-slot=faq-question]]:rounded-br-[6px] [&_[data-slot=faq-answer]]:justify-start [&_[data-slot=faq-answer]]:[transform-origin:0%_100%]! [&_[role=region]]:rounded-br-[18px] [&_[role=region]]:rounded-bl-[6px] [&_[data-slot=faq-question]]:whitespace-pre-wrap [&_[data-slot=faq-question]]:break-words [&_[data-slot=faq-question]]:bg-[#262626]! [&_[data-slot=faq-question]]:text-[12px] [&_[data-slot=faq-question]]:text-white/80! [&_[data-slot=faq-question]]:shadow-none! [&_[data-slot=faq-question]:has(img)]:p-4 [&_[role=region]]:text-[12px] [&_[role=region]]:leading-6" /> : <motion.div className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap break-words rounded-[18px] rounded-br-[6px] bg-[#262626] px-4 py-2.5 has-[img]:p-4 text-[12px] leading-[1.4] text-white/80">{users.has(turn.id) ? <MessagePrompt message={users.get(turn.id)!} /> : turn.question}</motion.div>}
        </motion.div>)}
        <AnimatePresence>
          {(joe.busy || waitingForSpeech) && <motion.div key="ai-status" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4"><AiStatus state={status.state} label={status.label} /></motion.div>}
        </AnimatePresence>
        {!joe.busy && error && <motion.div role="status" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-4"><AiStatus state="error" label={errorText} /></motion.div>}
        {joe.state === 'offline' && <motion.button type="button" onClick={joe.reconnect} className="mt-3 rounded-full bg-white/10 px-3 py-2 text-xs" whileTap={{ scale: 0.95 }}>重连</motion.button>}
      </motion.div>
      <motion.div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-5 backdrop-blur-md [mask-image:linear-gradient(to_top,transparent,black)] xl:h-7" />
      <motion.div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-5 backdrop-blur-md [mask-image:linear-gradient(to_bottom,transparent,black)] xl:h-7" />
      </motion.div>
      <AnimatePresence>{orbState && <motion.div key="chat-orb" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex shrink-0 justify-center pt-5">
        <Shdr01 size={60} state={orbState} className="max-w-full" ariaLabel={`Joe 光球 · ${orbState}`} />
      </motion.div>}</AnimatePresence>
    </motion.aside>
  );
}
