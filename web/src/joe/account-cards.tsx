import { AnimatePresence, motion } from 'motion/react';
import { SettingsPanel } from '../components/panels/settings-panel';
import { VoiceAccountPanel, money } from '../components/panels/voice-account-panel';
import { TiltCard } from './tilt-card';
import { useCanvasScene } from './canvas-scene';
import type { useJoe } from './use-joe';
import type { OrdinaryCard } from './workspace-state';

export type AccountCardProps = Pick<ReturnType<typeof useJoe>, 'bootstrap' | 'saving' | 'saveSettings'>;

export function AccountCards({ cards, ...joe }: AccountCardProps & { cards: OrdinaryCard[] }) {
  const scene = useCanvasScene();
  const model = joe.bootstrap?.models.find(model => model.id === joe.bootstrap?.settings.model) ?? joe.bootstrap?.models[0];
  return <AnimatePresence initial={false}>{cards.map(id => {
    const expanded = scene.selection?.id === id && scene.selection.expanded;
    const title = id === 'costs' ? '费用' : '设置';
    return <TiltCard key={id} id={id} label={`${title}卡片`} expandedWidth="min(480px, calc(100% - 32px))" surfaceClassName={`overflow-hidden rounded-[26px] text-white ${id === 'costs' ? 'bg-[#7928f5]' : 'bg-[#232323]'}`}>
      <motion.div className="flex h-14 items-center px-5 text-xs text-white/60">{title}</motion.div>
      {expanded ? id === 'costs'
        ? <VoiceAccountPanel usage={joe.bootstrap?.usage} />
        : <SettingsPanel {...joe} />
        : <motion.div className="px-5 pb-5">
          {id === 'costs' ? <>
            <motion.p className="text-xs text-white/50">今日费用</motion.p>
            <motion.p className="mt-2 text-[28px] tracking-tight tabular-nums">{money(joe.bootstrap?.usage.model)}</motion.p>
            <motion.div className="mt-5 flex items-center justify-between gap-3 text-xs text-white/50"><motion.span>累计费用</motion.span><motion.span className="tabular-nums">{money(joe.bootstrap?.usage.modelLifetime)}</motion.span></motion.div>
            <motion.p className="mt-3 text-[11px] text-white/40">模型费用 · 美元 · 含估算</motion.p>
          </> : <>
            <motion.p className="text-xs text-white/50">思考模型</motion.p>
            <motion.p className="mt-2 truncate text-xl" title={model?.label}>{model?.label || '等待配置'}</motion.p>
            <motion.div className="mt-5 flex justify-between gap-3 text-xs text-white/50"><motion.span>语音回答</motion.span><motion.span>{!joe.bootstrap ? '加载中' : joe.bootstrap.settings.voice ? '已开启' : '已关闭'}</motion.span></motion.div>
            <motion.div className="mt-3 flex justify-between gap-3 text-xs text-white/50"><motion.span>默认静音</motion.span><motion.span>{!joe.bootstrap ? '加载中' : joe.bootstrap.settings.defaultMuted ? '已开启' : '已关闭'}</motion.span></motion.div>
          </>}
        </motion.div>}
    </TiltCard>;
  })}</AnimatePresence>;
}
