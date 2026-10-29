import { motion } from 'motion/react';
import { Faq } from '../components/rare-ui/faq';
import { TaskList } from '../components/rare-ui/task-list';
import { TiltCard } from './tilt-card';

export function ExampleCards() {
  return <>
      <TiltCard id="idea" className="h-[355px]" surfaceClassName="flex flex-col rounded-[30px] bg-[#f5f5f2] p-7 text-[#232323] max-sm:p-4" label="灵感卡片">
        <motion.div className="flex items-center justify-between text-[10px] text-black/40">
          <motion.span className="rounded-full bg-black/5 px-3 py-1.5">灵感</motion.span>
          <motion.span>01</motion.span>
        </motion.div>
        <motion.h1 className="mt-7 text-[clamp(28px,3.3vw,52px)] max-sm:text-[23px] leading-[1.15] font-medium tracking-[-0.06em]">把想法<motion.span className="block">铺开来说。</motion.span></motion.h1>
        <motion.p className="mt-5 text-xs leading-6 text-black/40">不必想好，从这里开始。</motion.p>

      </TiltCard>
      <TiltCard id="question" surfaceClassName="rounded-[25px] bg-[#7928f5] p-5 pb-7 max-sm:p-3" label="问答卡片">
        <motion.div className="mb-5 flex items-center justify-between text-[10px] text-white/60">
          <motion.span>换个角度</motion.span><motion.span>↗</motion.span>
        </motion.div>
        <Faq items={[{ id: 'idea', question: '如果再大胆一点？', answer: '让灵感先发生，答案慢慢来。' }]} defaultValue="idea" accent="#5b16cd" avatar={null} className="[&_[data-slot=faq-question]]:max-w-full [&_[data-slot=faq-question]]:bg-white/15! [&_[data-slot=faq-question]]:text-[13px] [&_[data-slot=faq-question]]:text-white! [&_[data-slot=faq-question]]:shadow-none! [&_[role=region]]:text-xs" />
      </TiltCard>
      <TiltCard id="tasks" surfaceClassName="rounded-[26px] bg-[#f4ff85] p-5 text-[#22251b] max-sm:p-4" label="待办卡片">
        <motion.div className="mb-6 flex items-center justify-between text-[10px] text-black/45">
          <motion.span>下一步</motion.span><motion.span>03</motion.span>
        </motion.div>
        <motion.h2 className="mb-5 text-[29px] max-sm:text-[23px] leading-tight font-medium tracking-tight">好想法，<motion.span className="block">慢慢落地。</motion.span></motion.h2>
        <TaskList size="sm" accent="#343a20" defaultTasks={[{ id: 'gather', label: '收集灵感', done: true }, { id: 'sort', label: '理清思路' }, { id: 'start', label: '开始动手' }]} className="[&_[data-slot=task-item]]:bg-black/5! [&_[data-slot=task-item]]:text-[#343a20]! [&_[data-slot=task-item]]:shadow-none! [&_[data-slot=task-item]_span]:text-[#343a20]! [&_[data-state=checked]_span]:text-[#343a20]/40!" />
      </TiltCard>
  </>;
}
