import { useCallback, useEffect, useRef, type PointerEvent, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { Icon } from '../components/workspace/icon';
import { cardTilt } from './card-tilt';
import { cardControls } from './card-expansion';
import { useCardFlip } from './use-card-flip';
import { useCanvasScene } from './canvas-scene';
import { cardLayer, cardWidths, type CanvasCardId } from './canvas-layout';

const spring = { type: 'spring' as const, stiffness: 240, damping: 28 };

export function TiltCard({ id, children, className = '', surfaceClassName, label, onExpand, onClose, expandedWidth = '66.666667%', expandedHeight = 'auto' }: {
  id: CanvasCardId;
  children: ReactNode;
  className?: string;
  surfaceClassName: string;
  label: string;
  onExpand?: () => void;
  onClose?: () => void;
  expandedWidth?: string;
  expandedHeight?: string;
}) {
  const scene = useCanvasScene();
  const card = useRef<HTMLElement>(null);
  const selected = scene.selection?.id === id;
  const expanded = selected && Boolean(scene.selection?.expanded);
  const blocked = scene.selection !== null && !selected;
  const onClosed = useCallback(() => scene.finishClose(id), [scene.finishClose, id]);
  const { controls, reduced, layoutExpanded, flipping, rememberFocus } = useCardFlip(expanded, card, onClosed);
  const x = useMotionValue(0), y = useMotionValue(0);
  const rotateX = useSpring(x, spring), rotateY = useSpring(y, spring);
  const panX = useTransform(() => layoutExpanded ? 0 : scene.panX.get());
  const panY = useTransform(() => layoutExpanded ? 0 : scene.panY.get());
  const active = scene.hovered === id && !reduced && !selected && !blocked;
  const position = scene.layout[id];
  useEffect(() => {
    if (!expanded) return;
    x.set(0); y.set(0);
  }, [expanded, x, y]);

  function follow(event: PointerEvent<HTMLElement>) {
    if (!active || event.pointerType !== 'mouse') return;
    const tilt = cardTilt(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
    x.set(tilt.rotateX); y.set(tilt.rotateY);
  }
  function reset() {
    scene.setHovered(current => current === id ? null : current);
    x.set(0); y.set(0);
  }
  function open() {
    if (selected || blocked) return;
    reset(); rememberFocus();
    onExpand?.();
    scene.open(id);
  }
  function close() { onClose?.(); scene.close(); }

  return (
    <motion.article ref={card} tabIndex={-1} inert={blocked} data-card={id}
      className={`absolute ${className} ${selected ? 'cursor-auto' : 'cursor-pointer'} outline-none [perspective:1000px]`}
      aria-label={label} data-expanded={expanded || layoutExpanded} data-flipping={flipping}
      style={{
        left: layoutExpanded ? '50%' : `calc(50% + ${position.x}px)`,
        top: layoutExpanded ? '50%' : `calc(50% + ${position.y}px)`,
        width: layoutExpanded ? expandedWidth : cardWidths[id],
        height: layoutExpanded ? expandedHeight : undefined,
        maxHeight: layoutExpanded ? '100cqh' : undefined,
        translate: '-50% -50%',
        x: panX, y: panY,
        zIndex: cardLayer(id, scene.selection?.id ?? null, scene.hovered),
      }}
      onHoverStart={event => {
        if (!reduced && !selected && !blocked && event.pointerType === 'mouse' && window.matchMedia('(hover: hover) and (pointer: fine)').matches) scene.setHovered(id);
      }}
      onClickCapture={() => { if (!selected) rememberFocus(); }} onHoverEnd={reset} onPointerCancel={reset} onPointerMove={follow}
      onClick={event => { if (!selected && !blocked && !(event.target as Element).closest(cardControls)) open(); }}
    >
      <motion.div animate={controls} className="h-full [backface-visibility:hidden] [transform-style:preserve-3d]">
        <motion.div className={`relative h-full ${layoutExpanded ? 'overflow-y-auto [&>div:first-of-type]:pr-10' : ''} ${surfaceClassName}`}
          style={{ maxHeight: layoutExpanded ? '100cqh' : undefined, rotateX: reduced || selected || blocked ? 0 : rotateX, rotateY: reduced || selected || blocked ? 0 : rotateY, rotateZ: layoutExpanded ? 0 : position.rotation }}
          animate={selected
            ? { y: 0, scale: 1, boxShadow: '0 32px 96px rgba(0,0,0,0.4)' }
            : active ? { y: -6, scale: 1.01, boxShadow: '0 18px 55px rgba(0,0,0,0.22)' }
              : { y: 0, scale: 1, boxShadow: '0 0 0 rgba(0,0,0,0)' }} transition={reduced ? { duration: 0 } : spring}>
          <motion.button type="button" aria-label={`展开${label}`} aria-expanded={expanded} onClick={open} disabled={selected} className="sr-only focus:not-sr-only focus:absolute focus:right-3 focus:top-3 focus:z-10 focus:rounded-full focus:bg-black/10 focus:px-3 focus:py-2">展开</motion.button>
          {layoutExpanded && <motion.button type="button" data-close-card aria-label={`收起${label}`} onClick={close} disabled={flipping} className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-full bg-black/10" whileTap={{ scale: 0.95 }}><Icon name="close" className="size-4" /></motion.button>}
          {children}
        </motion.div>
      </motion.div>
    </motion.article>
  );
}
