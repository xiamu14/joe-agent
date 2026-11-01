import { useCallback, useEffect, useState } from 'react';
import type { JSONContent } from '@tiptap/react';
import { emptyDraft } from './composer/draft';
import { MotionConfig, motion } from 'motion/react';
import { BounceSidebar } from '../components/rare-ui/bounce-sidebar';
import { WorkspaceChat } from './workspace-chat';
import { workspaceOrbState } from './workspace-orb-state';
import { useJoe } from './use-joe';
import { Shdr01 } from '../components/shader-orb/shdr-01';
import { CanvasPreview } from './workspace-preview';
import { useCanvasModes } from './layouts/use-canvas-modes';
import { WorkspaceInput } from './workspace-input';
import { loadCanvas, saveCanvas, type CanvasSnapshot } from './canvas-storage';
import { createCanvasLayout } from './canvas-layout';
import { visibleWidgetCards, type WidgetCard } from './widget-visibility';

const initialCards: readonly WidgetCard[] = ['video', 'weather', 'costs', 'settings'];
const noCards: readonly WidgetCard[] = [];

export function StaticWorkspace() {
  const { view, setView, modes, toggle } = useCanvasModes();
  const first = useJoe({ workspaceSlot: 0, sessionKey: 'joe.canvas.example.session', initialCards });
  const second = useJoe({ workspaceSlot: 1, sessionKey: 'joe.canvas.empty.session', initialCards: noCards });
  const joe = [first, second][view];
  const hasCards = visibleWidgetCards(joe.widgetVisibility).length > 0;
  const [speech, setSpeech] = useState([false, false]);
  const onSpeakingChange = useCallback((playing: boolean) => {
    setSpeech(previous => previous.map((value, index) => index === view ? playing : value));
  }, [view]);
  const orbState = workspaceOrbState(joe.state, joe.busy, speech[view] || joe.playing);
  const [drafts, setDrafts] = useState<JSONContent[]>([emptyDraft(), emptyDraft()]);
  const setDraft = (value: JSONContent) => setDrafts(previous => previous.map((draft, index) => index === view ? value : draft));
  const [snapshot, setSnapshot] = useState<CanvasSnapshot | null>(null);
  const rememberCanvas = useCallback((value: CanvasSnapshot) => { setSnapshot(value); saveCanvas(value); }, []);
  useEffect(() => { const value = loadCanvas(createCanvasLayout(crypto.getRandomValues(new Uint32Array(1))[0])); setSnapshot(value); saveCanvas(value); }, []);
  return (
    <MotionConfig reducedMotion="user" transition={{ type: 'spring', stiffness: 240, damping: 28 }}>
      <motion.main className="relative min-h-dvh overflow-x-hidden bg-[#111114] p-5 pb-2.5 text-[#f5f5f3] [color-scheme:dark] sm:p-8 sm:pb-4 lg:flex lg:h-dvh lg:flex-col lg:overflow-hidden lg:pt-[34px]" aria-label="Joe 工作空间">
        <motion.div className="grid min-h-0 flex-1 gap-5 lg:[--chat-width:240px] lg:grid-cols-[160px_minmax(0,1fr)_var(--chat-width)] lg:grid-rows-[minmax(0,1fr)_auto] xl:[--chat-width:260px] xl:grid-cols-[180px_minmax(0,1fr)_var(--chat-width)] xl:gap-7">
        <motion.header initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-12 shrink-0 items-center lg:col-start-1 lg:row-start-1 lg:h-auto lg:self-start">
          <motion.div className="flex items-center gap-3">
            <motion.img src="/favicon.svg" alt="" width={30} height={30} className="size-[27px] shrink-0 sm:size-[30px]" />
            <motion.div className="flex items-baseline gap-3">
              <motion.span className="text-[20px] font-semibold tracking-tight sm:text-[24px]">Joe.</motion.span>
              <motion.span className="whitespace-nowrap text-[11px] text-white/40 sm:text-xs">智能助理</motion.span>
            </motion.div>
          </motion.div>
        </motion.header>
          <motion.aside initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col justify-center gap-8 py-4 lg:col-start-1 lg:row-start-1 lg:min-h-0 lg:self-stretch lg:overflow-y-auto lg:pb-0 lg:pt-20" aria-label="空间信息">
            <motion.div className="rounded-[24px] bg-[#151515] px-3 py-6 lg:shrink-0">
              <motion.p className="mb-3 pl-2 pr-4 text-xs text-white/35">我的空间</motion.p>
              <BounceSidebar items={[first.canvas?.name ?? '空间1', second.canvas?.name ?? '空间2']} value={view} onChange={setView} dotColor="#FC4C01" className="gap-1 text-white [&_[data-slot=bounce-sidebar-item]]:py-2 [&_[data-active=false]]:text-white/40 [&_[data-active=true]]:text-white" />
            </motion.div>

          </motion.aside>
          <motion.section className="flex min-h-0 flex-col gap-y-1 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:grid lg:grid-rows-subgrid" aria-label="画布与输入">
            <motion.div className="relative flex min-h-[540px] flex-1 items-center justify-center lg:min-h-0" aria-label="画布">
              {snapshot && <CanvasPreview mode={modes[view]} identity={joe.sessionId} key={view} layout={snapshot.cards} initialPan={snapshot.pan} onSave={rememberCanvas} joe={joe}
                emptyContent={<motion.div key="canvas-orb" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex h-full w-full items-center justify-center pb-10">
                  <Shdr01 size={280} state={orbState} className="max-h-full max-w-full" ariaLabel={`SHDR-01 光球 · ${orbState}`} />
                </motion.div>} /> }
            </motion.div>
            <WorkspaceInput layoutMode={modes[view]} onToggleLayout={() => toggle(view)} onSettings={joe.openSettingsWidget} key={`${view}-${joe.sessionId}`} draft={drafts[view]} onDraftChange={setDraft} onSend={joe.send} onError={joe.setError} ready={Boolean(joe.sessionId)} busy={joe.busy} sessionId={joe.sessionId} voiceReady={Boolean(joe.sessionId && joe.bootstrap?.configured.asr && joe.bootstrap.configured.llm)} attachments={joe.attachments} uploading={joe.uploading} onUpload={joe.upload} onRemoveAttachment={joe.removeAttachment} />
          </motion.section>
          <WorkspaceChat key={view} joe={joe} onSpeakingChange={onSpeakingChange} orbState={hasCards ? orbState : undefined} />
        </motion.div>
      </motion.main>
    </MotionConfig>
  );
}
