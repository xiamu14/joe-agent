import type { Bootstrap, Message } from '../../joe/types';
import type { CardId } from '../../joe/workspace-state';

export function CardPreview({ card, bootstrap, messages, time }: { card: CardId; bootstrap: Bootstrap | null; messages: Message[]; time: string }) {
  const bars = <><span className="h-1.5 w-3/4 rounded-full bg-white/40" /><span className="h-1.5 w-1/2 rounded-full bg-white/20" /></>;
  return <div className="pointer-events-none flex min-h-0 w-full flex-1 flex-col justify-center gap-3 overflow-hidden p-4 sm:p-6" aria-hidden="true">
    {card === 'conversation' && <>
      <span className="mx-auto size-9 shrink-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,#c4edff,#7bb6e6_40%,#6c80bb_70%,transparent)] shadow-[0_0_18px_#b4dfff55]" />
      <span className="line-clamp-2 text-[9px] leading-4 text-white/80">{messages.at(-1)?.speechText || messages.at(-1)?.text || '你好，我是 Joe。'}</span>
    </>}
    {card === 'costs' && <><span className="text-[9px] text-white/60">今日费用</span><span className="text-lg font-semibold tabular-nums">{bootstrap ? `$${bootstrap.usage.model.known.toFixed(4)}` : '—'}</span><span className="h-1.5 w-3/4 rounded-full bg-white/20" /></>}
    {card === 'time' && <><span className="text-3xl font-semibold tabular-nums">{time}</span><span className="h-1.5 w-1/2 rounded-full bg-white/25" /></>}
    {card === 'settings' && <>{[true, bootstrap?.settings.defaultMuted ?? false, bootstrap?.settings.voice ?? true].map((enabled, i) => <span key={i} className="flex items-center justify-between gap-3"><span className="flex flex-1 flex-col gap-1.5">{bars}</span><span className={`h-3 w-5 rounded-full ${enabled ? 'bg-white/50' : 'bg-white/15'}`} /></span>)}</>}
  </div>;
}
