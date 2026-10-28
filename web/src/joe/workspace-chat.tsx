import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Faq } from '../components/rare-ui/faq';
import { WorkspaceGreeting } from './workspace-greeting';
import { chatTurns } from './chat-turns';
import type { useJoe } from './use-joe';
import { AiStatus } from '../components/rare-ui/ai-status';
import { chatStatus } from './chat-status';
import { Shdr01 } from '../components/shader-orb/shdr-01';
import type { OrbState } from '../components/shader-orb/orb-state';

function ErrorReply() {
  return <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex flex-col items-start gap-1.5">
    <AiStatus state="error" label="发生故障了" />
    <motion.div className="max-w-[85%] rounded-[18px] rounded-bl-[6px] bg-[#FC4C01] px-4 py-2.5 text-[11px] leading-6 text-white">再试一次，或检查服务连接。</motion.div>
  </motion.div>;
}

export function WorkspaceChat({ joe, onSpeakingChange, orbState }: { joe: ReturnType<typeof useJoe>; onSpeakingChange: (playing: boolean) => void; orbState?: OrbState }) {
  const turns = chatTurns(joe.messages);
  const scroll = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  useEffect(() => { follow.current = true; }, [turns.at(-1)?.id]);
  useEffect(() => {
    if (follow.current && scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [joe.messages, joe.state, joe.error]);
  const status = chatStatus(joe.state, Boolean(joe.bootstrap));
  return (
    <motion.aside initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="flex h-fit max-h-[540px] flex-col rounded-[28px] bg-[#151515] p-5 lg:col-start-3 lg:row-start-1 lg:max-h-full lg:min-h-[min(100%,calc(var(--chat-width)*1.618))] lg:self-start" aria-label="聊天记录">
      <motion.div className="mb-3 flex items-center justify-between gap-3">
        <motion.h2 className="text-xs font-normal text-white/35">对话</motion.h2>
      </motion.div>
      <motion.div className="relative grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] overflow-hidden rounded-lg">
      <motion.div ref={scroll} tabIndex={0} role="region" aria-label="聊天消息" onScroll={() => { const el = scroll.current; if (el) follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48; }} className="min-h-0 overflow-y-auto pb-4 pt-7 [scrollbar-width:none]! [&::-webkit-scrollbar]:hidden!">
        {joe.messages.filter(message => message.kind === 'greeting').map(message => <WorkspaceGreeting key={message.id} message={message} autoplay={joe.greetingToPlay === message.id} onAutoplay={joe.acknowledgeGreeting} onPlayingChange={onSpeakingChange} />)}
        {turns.map(turn => <motion.div key={turn.id} className="mb-4">
          {turn.answer?.text && turn.answer.status !== 'error' ? <Faq items={[{ id: turn.id, question: turn.question, answer: <motion.div className="whitespace-pre-wrap break-words">{turn.answer.visibleText === '' ? '准备语音…' : turn.answer.visibleText ?? turn.answer.speechText ?? turn.answer.text}</motion.div> }]} defaultValue={turn.id} accent="#FC4C01" avatar={null} className="gap-4 [&_[data-slot=faq-question]]:self-end [&_[data-slot=faq-question]]:rounded-bl-[18px] [&_[data-slot=faq-question]]:rounded-br-[6px] [&_[data-slot=faq-answer]]:justify-start [&_[data-slot=faq-answer]]:[transform-origin:0%_100%]! [&_[role=region]]:rounded-br-[18px] [&_[role=region]]:rounded-bl-[6px] [&_[data-slot=faq-question]]:whitespace-pre-wrap [&_[data-slot=faq-question]]:break-words [&_[data-slot=faq-question]]:bg-[#262626]! [&_[data-slot=faq-question]]:text-[11px] [&_[data-slot=faq-question]]:text-white/80! [&_[data-slot=faq-question]]:shadow-none! [&_[role=region]]:text-[11px] [&_[role=region]]:leading-6" /> : <motion.div className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap break-words rounded-[18px] rounded-br-[6px] bg-[#262626] px-4 py-2.5 text-[11px] leading-[1.4] text-white/80">{turn.question}</motion.div>}
          {turn.answer?.status === 'error' && turn.id === turns.at(-1)?.id && <ErrorReply />}
        </motion.div>)}
        <AnimatePresence>
          {joe.busy && <motion.div key="ai-status" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4"><AiStatus state={status.state} label={status.label} /></motion.div>}
        </AnimatePresence>
        {!joe.busy && (joe.state === 'error' || joe.error) && turns.at(-1)?.answer?.status !== 'error' && <ErrorReply />}
        {joe.state === 'offline' && <motion.button type="button" onClick={joe.reconnect} className="mt-3 rounded-full bg-white/10 px-3 py-2 text-xs" whileTap={{ scale: 0.95 }}>重连</motion.button>}
      </motion.div>
      <motion.div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-5 backdrop-blur-md [mask-image:linear-gradient(to_top,transparent,black)] xl:h-7" />
      <motion.div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-5 backdrop-blur-md [mask-image:linear-gradient(to_bottom,transparent,black)] xl:h-7" />
      </motion.div>
      {orbState && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex shrink-0 justify-center pt-5">
        <Shdr01 size={60} state={orbState} className="max-w-full" ariaLabel={`Joe 光球 · ${orbState}`} />
      </motion.div>}
    </motion.aside>
  );
}
