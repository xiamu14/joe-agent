import { motion } from 'motion/react';
import { Button } from '@base-ui/react/button';
import { useRef, type ReactNode } from 'react';
import { glass, roundButton } from './material';
import { Icon } from './icon';

type Props = {
  title: string; primary: boolean; visible: boolean; blocked: boolean;
  onPromote: () => void; onSwap: () => void; onClose?: () => void; children: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
};
export function CardFrame({ title, primary, visible, blocked, onPromote, onSwap, onClose, children, actions, compact }: Props) {
  const gesture = useRef<{ x: number; y: number } | null>(null);
  const lastWheel = useRef(0);
  return (
    <motion.section aria-label={`${title}${primary ? '主卡片' : '次卡片'}`}
      aria-hidden={!visible || blocked} hidden={!visible} data-visible={visible}
      initial={false}
      animate={{ left: primary ? '50%' : 'calc(50% + 310px)', width: primary ? 'min(560px, calc(100vw - 32px))' : '280px', height: primary ? compact ? 440 : 560 : 520, x: primary ? '-50%' : '0%', y: '-50%', rotateY: primary ? 0 : -16, scale: primary ? 1 : 0.9, opacity: visible ? 1 : 0 }}
      transition={{ type: 'spring', stiffness: 240, damping: 30 }}
      className={`absolute top-1/2 flex max-h-[calc(100dvh-150px)] touch-pan-y flex-col rounded-[40px] text-white data-[visible=false]:!hidden ${glass} ${primary ? 'z-20' : 'z-10 hidden min-[1100px]:flex'}`}
      onPointerDown={event => {
        const target = event.target as HTMLElement;
        if (event.button !== 0 || target.closest('button,input,textarea,a,[role="switch"]') || (event.pointerType === 'mouse' && !target.closest('header'))) return;
        gesture.current = { x: event.clientX, y: event.clientY };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onWheel={event => {
        const now = performance.now();
        if (Math.abs(event.deltaX) > 35 && Math.abs(event.deltaX) > Math.abs(event.deltaY) && now - lastWheel.current > 800) {
          lastWheel.current = now;
          onSwap();
        }
      }}
      onPointerCancel={() => { gesture.current = null; }}
      onPointerUp={event => {
        const start = gesture.current;
        gesture.current = null;
        if (start && Math.abs(event.clientX - start.x) > 65 && Math.abs(event.clientY - start.y) < 45) onSwap();
      }}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[inherit]" inert={!primary || blocked}>
        <header className="flex h-[72px] shrink-0 items-center gap-3 px-7 [@media(max-height:500px)]:h-12">
          <h1 className="flex-1 text-lg font-semibold tracking-wide">{title}</h1>
          {primary && actions}
          {onClose && primary && <Button className={roundButton} aria-label={`关闭${title}`} onClick={onClose}><Icon name="close" /></Button>}
        </header>
        {children}
      </div>
      {!primary && !blocked && <Button className="absolute inset-0 z-30 rounded-[inherit] outline-offset-4" aria-label={`切换到${title}`} onClick={onPromote} />}
      <div className="pointer-events-none absolute -bottom-5 left-1/2 h-1 w-16 -translate-x-1/2 rounded-full bg-white/45" aria-hidden="true" />
    </motion.section>
  );
}
