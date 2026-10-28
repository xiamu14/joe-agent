import { useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { BounceSidebar } from '../components/rare-ui/bounce-sidebar';
import { Faq } from '../components/rare-ui/faq';
import { Shdr01 } from '../components/shader-orb/shdr-01';
import { CanvasPreview } from './workspace-preview';
import { WorkspaceInput } from './workspace-input';

const conversations = [
  { id: 'start', question: '帮我整理一下这些想法', answer: '当然。把零散的灵感，变成清晰的下一步。' },
  { id: 'files', question: '这份文件讲了什么？', answer: '重点已经放在画布上，随时接着聊。' },
  { id: 'todo', question: '接下来做什么？', answer: '先收集灵感，再把想做的事逐一展开。' },
  { id: 'voice', question: '我们聊聊新的方向', answer: '我在听，想到什么就说什么。' },
];

export function StaticWorkspace() {
  const [view, setView] = useState(0);
  return (
    <MotionConfig reducedMotion="user" transition={{ type: 'spring', stiffness: 240, damping: 28 }}>
      <motion.main className="relative min-h-dvh overflow-x-hidden bg-[#090909] p-5 text-[#f5f5f3] [color-scheme:dark] sm:p-8 lg:flex lg:h-dvh lg:flex-col lg:overflow-hidden" aria-label="Joe 工作空间">
        <motion.header initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 flex h-12 shrink-0 items-center justify-between lg:mb-8">
          <motion.div className="flex items-baseline gap-3">
            <motion.span className="text-[36px] font-semibold tracking-[-0.09em]">joe.</motion.span>
            <motion.span className="text-[11px] tracking-[0.18em] text-white/35">想法，自有空间</motion.span>
          </motion.div>
        </motion.header>
        <motion.div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[160px_minmax(0,1fr)_292px] lg:grid-rows-[minmax(0,1fr)_auto] xl:grid-cols-[180px_minmax(0,1fr)_320px] xl:gap-7">
          <motion.aside initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col justify-center gap-8 py-4 lg:col-start-1 lg:row-start-1 lg:min-h-0 lg:max-h-[66.666667%] lg:self-center lg:justify-start lg:overflow-y-auto lg:rounded-[24px] lg:py-0" aria-label="空间信息">
            <motion.div className="rounded-[24px] bg-[#151515] px-3 py-6 lg:shrink-0">
              <motion.p className="mb-5 px-4 text-xs text-white/35">我的空间</motion.p>
              <BounceSidebar items={['示例画布', '空白画布']} value={view} onChange={setView} dotColor="#d6ff79" className="gap-3 text-white [&_[data-slot=bounce-sidebar-item]]:py-2 [&_[data-active=false]]:text-white/40 [&_[data-active=true]]:text-white" />
            </motion.div>

          </motion.aside>
          <motion.section className="flex min-h-0 flex-col lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:grid lg:grid-rows-subgrid" aria-label="画布与输入">
            <motion.div className="relative flex min-h-[540px] flex-1 items-center justify-center lg:min-h-0" aria-label="画布">
              <AnimatePresence mode="wait" initial={false}>
                {view === 0 ? <CanvasPreview key="preview" /> : (
                  <motion.div key="empty" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex h-full w-full items-center justify-center pb-10">
                    <Shdr01 size={280} state="idle" className="max-h-full max-w-full" ariaLabel="SHDR-01 光球" />

                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            <WorkspaceInput />
          </motion.section>
          <motion.aside initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="flex min-h-[480px] flex-col rounded-[28px] bg-[#151515] p-6 lg:col-start-3 lg:row-start-1 lg:min-h-0" aria-label="聊天记录">
            <motion.div className="mb-8 flex items-center justify-between">
              <motion.h2 className="text-sm font-medium">对话</motion.h2>
              <motion.span className="font-mono text-[10px] tracking-widest text-white/25">04</motion.span>
            </motion.div>
            <motion.p className="mb-6 text-[10px] tracking-widest text-white/25">今天</motion.p>
            <motion.div className="min-h-0 flex-1 overflow-y-auto pb-4">
              <Faq items={conversations} defaultValue="start" accent="#7252e8" avatar={null} className="gap-4 [&_[data-slot=faq-question]]:bg-[#262626]! [&_[data-slot=faq-question]]:text-[13px] [&_[data-slot=faq-question]]:text-white/80! [&_[data-slot=faq-question]]:shadow-none! [&_[role=region]]:text-[13px] [&_[role=region]]:leading-6" />
            </motion.div>
          </motion.aside>
        </motion.div>
      </motion.main>
    </MotionConfig>
  );
}
