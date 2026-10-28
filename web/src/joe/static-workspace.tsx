import { useCallback, useEffect, useState, type SetStateAction } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { BounceSidebar } from '../components/rare-ui/bounce-sidebar';
import { WorkspaceChat } from './workspace-chat';
import { workspaceOrbState } from './workspace-orb-state';
import { useJoe } from './use-joe';
import { Shdr01 } from '../components/shader-orb/shdr-01';
import { CanvasPreview } from './workspace-preview';
import { WorkspaceInput } from './workspace-input';
import { loadCanvas, saveCanvas, type CanvasSnapshot } from './canvas-storage';
import { createCanvasLayout } from './canvas-layout';

export function StaticWorkspace() {
  const [view, setView] = useState(0);
  const example = useJoe({ sessionKey: 'joe.canvas.example.session', voiceOutput: false });
  const empty = useJoe({ sessionKey: 'joe.canvas.empty.session', voiceOutput: false });
  const joe = view === 0 ? example : empty;
  const [speech, setSpeech] = useState([false, false]);
  const onSpeakingChange = useCallback((playing: boolean) => {
    setSpeech(previous => previous.map((value, index) => index === view ? playing : value));
  }, [view]);
  const orbState = workspaceOrbState(joe.state, joe.busy, speech[view] || joe.playing);
  const [drafts, setDrafts] = useState(['', '']);
  const setDraft = (text: SetStateAction<string>) => setDrafts(previous => previous.map((draft, index) => index === view ? typeof text === 'function' ? text(draft) : text : draft));
  const [snapshot, setSnapshot] = useState<CanvasSnapshot | null>(null);
  const rememberCanvas = useCallback((value: CanvasSnapshot) => { setSnapshot(value); saveCanvas(value); }, []);
  useEffect(() => { const value = loadCanvas(createCanvasLayout(crypto.getRandomValues(new Uint32Array(1))[0])); setSnapshot(value); saveCanvas(value); }, []);
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
              <motion.p className="mb-3 pl-2 pr-4 text-xs text-white/35">我的空间</motion.p>
              <BounceSidebar items={['示例画布', '空白画布']} value={view} onChange={setView} dotColor="#FC4C01" className="gap-1 text-white [&_[data-slot=bounce-sidebar-item]]:py-2 [&_[data-active=false]]:text-white/40 [&_[data-active=true]]:text-white" />
            </motion.div>

          </motion.aside>
          <motion.section className="flex min-h-0 flex-col lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:grid lg:grid-rows-subgrid" aria-label="画布与输入">
            <motion.div className="relative flex min-h-[540px] flex-1 items-center justify-center lg:min-h-0" aria-label="画布">
              <AnimatePresence mode="wait" initial={false}>
                {view === 0 ? snapshot && <CanvasPreview key="preview" layout={snapshot.cards} initialPan={snapshot.pan} onSave={rememberCanvas} /> : (
                  <motion.div key="empty" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex h-full w-full items-center justify-center pb-10">
                    <Shdr01 size={280} state={orbState} className="max-h-full max-w-full" ariaLabel={`SHDR-01 光球 · ${orbState}`} />

                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            <WorkspaceInput text={drafts[view]} onTextChange={setDraft} onSend={joe.send} ready={Boolean(joe.sessionId)} busy={joe.busy} />
          </motion.section>
          <WorkspaceChat key={view} joe={joe} onSpeakingChange={onSpeakingChange} />
        </motion.div>
      </motion.main>
    </MotionConfig>
  );
}
