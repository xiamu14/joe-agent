import { AnimatePresence, motion } from 'motion/react';
import { SettingsSwitch } from '../components/rare-ui/settings-controls';
import { SettingsPanel } from '../components/panels/settings-panel';
import { CostPanel } from '../components/panels/cost-panel';
import { TiltCard } from './tilt-card';
import { useCanvasScene } from './canvas-scene';
import type { useJoe } from './use-joe';
import type { OrdinaryCard } from './workspace-state';

export type AccountCardProps = Pick<ReturnType<typeof useJoe>, 'bootstrap' | 'saving' | 'saveSettings'>;

export function AccountCards({ cards, ...joe }: AccountCardProps & { cards: OrdinaryCard[] }) {
  const scene = useCanvasScene();
  const settings = joe.bootstrap?.settings;
  const model = joe.bootstrap?.models.find(model => model.id === joe.bootstrap?.settings.model) ?? joe.bootstrap?.models[0];
  return <AnimatePresence initial={false}>{cards.map(id => {
    const expanded = scene.selection?.id === id && scene.selection.expanded;
    const title = id === 'costs' ? '费用' : '设置';
    return <TiltCard key={id} id={id} label={`${title}卡片`} expandedWidth="min(480px, calc(100% - 32px))" surfaceClassName={`overflow-hidden rounded-[26px] text-white ${id === 'costs' ? 'bg-[#7928f5]' : 'bg-[#232323]'}`}>
      <motion.div data-card-header className="flex h-14 items-center px-5 text-xs text-white/60">{title}</motion.div>
      {expanded ? id === 'costs'
        ? <CostPanel usage={joe.bootstrap?.usage} />
        : <SettingsPanel {...joe} />
        : <motion.div className="px-5 pb-5">
          {id === 'costs' ? <CostPanel usage={joe.bootstrap?.usage} compact /> : <>
            <motion.p className="text-xs text-white/50">思考模型</motion.p>
            <motion.p className="mt-2 truncate text-xl" title={model?.label}>{model?.label || '等待配置'}</motion.p>
            {([{ key: 'voice', label: '语音回答' }, { key: 'defaultMuted', label: '默认静音' }] as const).map(({ key, label }, index) => (
              <motion.div key={key} className={`${index === 0 ? 'mt-5' : 'mt-3'} flex items-center justify-between gap-3 text-xs text-white/50`}>
                <motion.span>{label}</motion.span>
                <SettingsSwitch aria-label={label} checked={settings?.[key] ?? false} disabled={!settings} busy={joe.saving}
                  onCheckedChange={checked => settings && void joe.saveSettings({ ...settings, [key]: checked })} />
              </motion.div>
            ))}
          </>}
        </motion.div>}
    </TiltCard>;
  })}</AnimatePresence>;
}
