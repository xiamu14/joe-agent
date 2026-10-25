import { useEffect, useState } from 'react';
import type { MotionValue } from 'motion/react';
import { Button } from '@base-ui/react/button';
import { ThoughtOrb } from '../thought-orb';
import { Icon } from './icon';
import { glass, roundButton } from './material';
import type { agentVisual } from '../../joe/visual';

type Props = {
  level: MotionValue<number>; timezone: string; visual: ReturnType<typeof agentVisual>; active: boolean; status: string;
  overview: boolean; onTime: () => void; onOverview: () => void; onBackground: () => void; onConversation: () => void;
};
export function Dock({ level, timezone, visual, active, status, overview, onTime, onOverview, onBackground, onConversation }: Props) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Math.floor(Date.now() / 60000) * 60000); const timer = setInterval(() => setNow(Math.floor(Date.now() / 60000) * 60000), 1000); return () => clearInterval(timer); }, []);
  return (
    <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-60 flex h-[122px] items-center justify-center pb-[max(14px,env(safe-area-inset-bottom))]">
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/10 to-transparent [mask-image:linear-gradient(transparent,#000_70%)] backdrop-blur-lg" aria-hidden="true" />
      <nav aria-label="常驻控制条" className={`pointer-events-auto flex h-[72px] items-center gap-2 rounded-full px-4 text-white ${glass}`}>
        <Button aria-label="时间与天气" className="min-w-[76px] rounded-full px-2 py-3 font-semibold tabular-nums hover:bg-white/10" onClick={onTime}>
          {(now === null ? null : new Date(now))?.toLocaleTimeString('zh-CN', { timeZone: timezone, hour: '2-digit', minute: '2-digit' }) || '—:—'}
        </Button>
        <span className="mx-1 h-6 w-px bg-white/15" aria-hidden="true" />
        <Button aria-label="卡片总览" aria-expanded={overview} onClick={onOverview} className={`${roundButton} ${overview ? 'bg-white/25' : 'bg-transparent'}`}><Icon name="grid" /></Button>
        <Button aria-label="切换背景" onClick={onBackground} className={`${roundButton} bg-transparent`}><Icon name="background" /></Button>
        <Button aria-label={`打开对话，${status}`} title={status} onClick={onConversation} className="relative ml-1 size-[58px] overflow-hidden rounded-full">
          <span className="pointer-events-none absolute inset-3"><ThoughtOrb level={level} visual={visual} compact active={active} /></span>
        </Button>
      </nav>
    </footer>
  );
}
