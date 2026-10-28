import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Faq } from '../components/rare-ui/faq';
import { WorkspaceGreeting } from './workspace-greeting';
import { chatTurns } from './chat-turns';
import type { useJoe } from './use-joe';
import { AiStatus } from '../components/rare-ui/ai-status';
import { chatStatus } from './chat-status';

export function WorkspaceChat({ joe, onSpeakingChange }: { joe: ReturnType<typeof useJoe>; onSpeakingChange: (playing: boolean) => void }) {
  const turns = chatTurns(joe.messages);
  const latest = turns.at(-1)?.id ?? null;
  const [open, setOpen] = useState<string | null>(latest);
  const scroll = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  useEffect(() => { setOpen(latest); follow.current = true; }, [latest]);
  useEffect(() => {
    if (follow.current && scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [joe.messages, joe.state, joe.error, open]);
  const awaitingText = joe.busy && !turns.at(-1)?.answer?.text;
  const status = chatStatus(joe.state, Boolean(joe.bootstrap));
  return (
    <motion.aside initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="flex min-h-[480px] flex-col rounded-[28px] bg-[#151515] p-6 lg:col-start-3 lg:row-start-1 lg:min-h-0" aria-label="聊天记录">
      <motion.div className="mb-8 flex items-center justify-between gap-3">
        <motion.h2 className="text-sm font-medium">对话</motion.h2>
      </motion.div>
      <motion.div ref={scroll} onScroll={() => { const el = scroll.current; if (el) follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48; }} className="min-h-0 flex-1 overflow-y-auto pb-4">
        {joe.messages.filter(message => message.kind === 'greeting').map(message => <WorkspaceGreeting key={message.id} message={message} autoplay={joe.greetingToPlay === message.id} onAutoplay={joe.acknowledgeGreeting} onPlayingChange={onSpeakingChange} />)}
        <Faq items={turns.map(turn => ({
          id: turn.id, question: turn.question,
          answer: <motion.div className="whitespace-pre-wrap break-words">{turn.answer?.text || (turn.answer?.status === 'error' ? '回复失败' : turn.answer?.status === 'interrupted' ? '已停止' : '暂无回复')}</motion.div>,
        }))} value={awaitingText && open === latest ? null : open} onValueChange={setOpen} accent="#FC4C01" avatar={null} className="gap-4 [&_[data-slot=faq-question]]:self-end [&_[data-slot=faq-question]]:rounded-bl-[18px] [&_[data-slot=faq-question]]:rounded-br-[6px] [&_[data-slot=faq-answer]]:justify-start [&_[data-slot=faq-answer]]:[transform-origin:0%_100%]! [&_[role=region]]:rounded-br-[18px] [&_[role=region]]:rounded-bl-[6px] [&_[data-slot=faq-question]]:whitespace-pre-wrap [&_[data-slot=faq-question]]:break-words [&_[data-slot=faq-question]]:bg-[#262626]! [&_[data-slot=faq-question]]:text-[13px] [&_[data-slot=faq-question]]:text-white/80! [&_[data-slot=faq-question]]:shadow-none! [&_[role=region]]:text-[13px] [&_[role=region]]:leading-6" />
        <AnimatePresence>
          {joe.busy && <motion.div key="ai-status" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4"><AiStatus state={status.state} label={status.label} /></motion.div>}
        </AnimatePresence>
        {joe.error && <motion.p role="alert" className="mt-4 break-words text-xs leading-5 text-[#ffa58c]">{joe.error}</motion.p>}
        {joe.state === 'offline' && <motion.button type="button" onClick={joe.reconnect} className="mt-3 rounded-full bg-white/10 px-3 py-2 text-xs" whileTap={{ scale: 0.95 }}>重连</motion.button>}
      </motion.div>
    </motion.aside>
  );
}
