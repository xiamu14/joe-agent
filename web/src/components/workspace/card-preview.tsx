import type { Bootstrap, Message } from '../../joe/types';
import type { CardId } from '../../joe/workspace-state';
import type { MotionValue } from 'motion/react';
import type { agentVisual } from '../../joe/visual';
import { money } from '../panels/cost-panel';
import { ThoughtOrb } from '../thought-orb';

export function CardPreview({ card, bootstrap, messages, visual, level }: { card: CardId; bootstrap: Bootstrap | null; messages: Message[]; visual: ReturnType<typeof agentVisual>; level: MotionValue<number> }) {
  const bars = <><span className="h-1.5 w-3/4 rounded-full bg-white/40" /><span className="h-1.5 w-1/2 rounded-full bg-white/20" /></>;
  return <div className="pointer-events-none flex min-h-0 w-full flex-1 flex-col justify-center gap-3 overflow-hidden p-4 sm:p-6" aria-hidden="true">
    {card === 'conversation' && <>
      <div className="relative mx-auto size-10 shrink-0 overflow-hidden rounded-full">
        <div className="absolute inset-2.5"><ThoughtOrb level={level} visual={visual} compact /></div>
      </div>
      <span className="line-clamp-2 text-[9px] leading-4 text-white/80">{messages.at(-1)?.speechText || messages.at(-1)?.text || '你好，我是 Joe。'}</span>
    </>}
    {card === 'costs' && <><span className="text-[9px] text-white/60">今日费用</span><span className="text-lg font-semibold tabular-nums">{money(bootstrap?.usage.billing?.total.today)}</span><span className="h-1.5 w-3/4 rounded-full bg-white/20" /></>}
    {card === 'settings' && <>{[true, bootstrap?.settings.defaultMuted ?? false, bootstrap?.settings.voice ?? true].map((enabled, i) => <span key={i} className="flex items-center justify-between gap-3"><span className="flex flex-1 flex-col gap-1.5">{bars}</span><span className={`h-3 w-5 rounded-full ${enabled ? 'bg-white/50' : 'bg-white/15'}`} /></span>)}</>}
  </div>;
}
