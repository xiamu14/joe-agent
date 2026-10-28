import { useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';
import { Icon } from '../components/workspace/icon';
import { cardTilt } from './card-tilt';
import { cardControls } from './card-expansion';
import { useCardFlip } from './use-card-flip';

const spring = { type: 'spring' as const, stiffness: 240, damping: 28 };

export function TiltCard({ children, className, surfaceClassName, label, expanded, blocked, onExpand, onClose }: {
  children: ReactNode;
  className: string;
  surfaceClassName: string;
  label: string;
  expanded: boolean;
  blocked: boolean;
  onExpand: () => void;
  onClose: () => void;
}) {
  const card = useRef<HTMLElement>(null);
  const { controls, reduced, layoutExpanded, flipping, bounds, rememberFocus } = useCardFlip(expanded, card);
  const [hovered, setHovered] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(x, spring);
  const rotateY = useSpring(y, spring);
  const raised = expanded || layoutExpanded || flipping;
  const active = hovered && !reduced && !raised && !blocked;

  function follow(event: PointerEvent<HTMLElement>) {
    if (!active || event.pointerType !== 'mouse') return;
    const tilt = cardTilt(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
    x.set(tilt.rotateX);
    y.set(tilt.rotateY);
  }

  function reset() {
    setHovered(false);
    x.set(0);
    y.set(0);
  }

  function open() {
    if (raised || blocked) return;
    reset();
    rememberFocus();
    onExpand();
  }

  return (
    <motion.article
      ref={card}
      tabIndex={-1}
      inert={blocked}
      className={`${className} ${layoutExpanded ? 'rotate-0!' : ''} outline-none [perspective:1000px]`}
      aria-label={label}
      data-expanded={expanded || layoutExpanded}
      data-flipping={flipping}
      style={{
        ...(layoutExpanded ? { ...bounds, right: 'auto', height: 'auto', translate: '0 -50%' } : {}),
        zIndex: raised ? 50 : undefined,
      }}
      onHoverStart={event => {
        if (!reduced && !raised && !blocked && event.pointerType === 'mouse' && window.matchMedia('(hover: hover) and (pointer: fine)').matches) setHovered(true);
      }}
      onHoverEnd={reset}
      onPointerCancel={reset}
      onPointerMove={follow}
      onClick={event => {
        if (raised || blocked || (event.target as Element).closest(cardControls)) return;
        open();
      }}
      whileHover={reduced || raised || blocked ? undefined : { zIndex: 30 }}
      transition={{ duration: 0 }}
    >
      <motion.div animate={controls} className="h-full [backface-visibility:hidden]">
        <motion.div
          className={`relative h-full ${layoutExpanded ? 'overflow-y-auto [&>div:first-of-type]:pr-10' : ''} ${surfaceClassName}`}
          style={{ maxHeight: layoutExpanded ? bounds?.maxHeight : undefined, rotateX: reduced || raised || blocked ? 0 : rotateX, rotateY: reduced || raised || blocked ? 0 : rotateY }}
          animate={raised
            ? { y: 0, scale: 1, boxShadow: '0 32px 96px rgba(0,0,0,0.4)' }
            : active ? { y: -6, scale: 1.01, boxShadow: '0 18px 55px rgba(0,0,0,0.22)' }
              : { y: 0, scale: 1, boxShadow: '0 0 0 rgba(0,0,0,0)' }}
          transition={reduced ? { duration: 0 } : spring}
        >
          <motion.button type="button" aria-label={`展开${label}`} aria-expanded={expanded} onClick={open} disabled={raised} className="sr-only focus:not-sr-only focus:absolute focus:right-3 focus:top-3 focus:z-10 focus:rounded-full focus:bg-black/10 focus:px-3 focus:py-2">展开</motion.button>
          {layoutExpanded && <motion.button type="button" data-close-card aria-label={`收起${label}`} onClick={onClose} disabled={flipping} className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-full bg-black/10" whileTap={{ scale: 0.95 }}><Icon name="close" className="size-4" /></motion.button>}
          {children}
        </motion.div>
      </motion.div>
    </motion.article>
  );
}
