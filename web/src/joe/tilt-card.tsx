import { useCallback, useEffect, useRef, type PointerEvent, type ReactNode } from 'react';
import { motion, useIsPresent, useMotionValue, useSpring, useTransform } from 'motion/react';
import { Icon } from '../components/workspace/icon';
import { Button } from '@base-ui/react/button';
import { Minus } from 'lucide-react';
import type { WidgetCard } from './widget-visibility';
import { cardTilt } from './card-tilt';
import { cardControls } from './card-expansion';
import { useCardDrag } from './use-card-drag';
import { useCardFlip } from './use-card-flip';
import { useCanvasScene } from './canvas-scene';
import { cardLayer, cardWidths, type CanvasCardId } from './canvas-layout';

const MotionButton = motion.create(Button);
const spring = { type: 'spring' as const, stiffness: 240, damping: 28 };

export function TiltCard({ id, children, className = '', surfaceClassName, label, onExpand, onClose, expandedWidth = '66.666667%', expandedHeight = 'auto', expandedScroll = true, animateExpandedSize = false }: {
  id: CanvasCardId;
  children: ReactNode;
  className?: string;
  surfaceClassName: string;
  label: string;
  onExpand?: () => void;
  onClose?: () => void;
  expandedWidth?: string;
  expandedHeight?: string;
  expandedScroll?: boolean;
  animateExpandedSize?: boolean;
}) {
  const scene = useCanvasScene();
  const present = useIsPresent();
  const card = useRef<HTMLElement>(null);
  const selected = scene.selection?.id === id;
  const expanded = selected && Boolean(scene.selection?.expanded);
  const blocked = scene.selection !== null && !selected;
  const onClosed = useCallback(() => scene.finishClose(id), [scene.finishClose, id]);
  const { controls, reduced, layoutExpanded, flipping, rememberFocus } = useCardFlip(expanded, card, onClosed);
  const x = useMotionValue(0), y = useMotionValue(0);
  const rotateX = useSpring(x, spring), rotateY = useSpring(y, spring);
  const drag = useCardDrag(id, scene, !scene.placement.draggable || Boolean(scene.selection) || flipping, reset);
  const panX = useTransform(() => layoutExpanded ? scene.scrollX.get() : scene.placement.pannable ? scene.panX.get() + drag.dx.get() : 0);
  const panY = useTransform(() => layoutExpanded ? scene.scrollY.get() : scene.placement.pannable ? scene.panY.get() + drag.dy.get() : 0);
  const active = scene.hovered === id && !reduced && !selected && !blocked && !scene.dragging;
  const position = scene.layout[id];
  const width = layoutExpanded ? expandedWidth : cardWidths[id];
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
    scene.hoverIntent.leave(id);
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
    <motion.article layout="position" layoutId={`card-${id}`} ref={card} tabIndex={-1} inert={blocked || !present}
      initial={{ opacity: 0, scale: reduced || scene.placement.entry === 'slide' ? 1 : 0.92 }}
      animate={{ opacity: 1, scale: 1, ...(animateExpandedSize ? { width, height: layoutExpanded ? expandedHeight : 'auto' } : {}) }}
      exit={{ opacity: 0, scale: reduced || scene.placement.entry === 'slide' ? 1 : 0.94 }}
      transition={reduced ? { duration: 0 } : { duration: 0.3, ease: [0.22, 1, 0.36, 1], layout: { duration: 0.45, ease: [0.22, 1, 0.36, 1] }, width: { duration: layoutExpanded ? 0.45 : 0, ease: [0.22, 1, 0.36, 1] }, height: { duration: layoutExpanded ? 0.45 : 0, ease: [0.22, 1, 0.36, 1] } }} data-card={id}
      className={`absolute ${className} ${selected ? 'cursor-auto' : scene.dragging === id ? 'cursor-grabbing select-none touch-none' : scene.placement.draggable ? 'cursor-grab select-none touch-none' : 'cursor-pointer touch-auto'} outline-none [perspective:1000px]`}
      aria-label={label} data-expanded={expanded || layoutExpanded} data-flipping={flipping} data-dragging={scene.dragging === id || undefined}
      style={{
        left: layoutExpanded ? '50%' : `calc(50% + ${position.x}px)`,
        top: layoutExpanded ? '50%' : `calc(50% + ${position.y}px)`,
        width,
        height: animateExpandedSize ? undefined : layoutExpanded ? expandedHeight : undefined,
        maxHeight: layoutExpanded ? '100cqh' : undefined,
        translate: '-50% -50%',
        x: panX, y: panY,
        zIndex: cardLayer(id, scene.selection?.id ?? null, scene.foreground, scene.dragging),
      }}
      onClickCapture={() => { if (!selected) rememberFocus(); }} onHoverEnd={reset} onPointerDown={drag.down} onPointerUp={drag.end} onLostPointerCapture={drag.end} onPointerCancel={event => { drag.end(event); reset(); }} onPointerMove={event => {
        drag.move(event);
        if (!reduced && !selected && !blocked && !scene.dragging && event.buttons === 0 && event.pointerType === 'mouse' && window.matchMedia('(hover: hover) and (pointer: fine)').matches) scene.hoverIntent.move(id, { x: event.clientX, y: event.clientY });
        if (!scene.dragging) follow(event);
      }}
      onClick={event => { if (!selected && !blocked && !(event.target as Element).closest(cardControls)) open(); }}
    >
      <motion.div initial={{ y: reduced || scene.placement.entry === 'scale' ? 0 : 20 }} animate={{ y: 0 }} exit={{ y: reduced || scene.placement.entry === 'scale' ? 0 : 12 }} transition={{ duration: reduced ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }} className="h-full">
      <motion.div animate={controls} className="h-full [backface-visibility:hidden] [transform-style:preserve-3d]">
        <motion.div className={`relative h-full ${layoutExpanded ? `${expandedScroll ? 'overflow-y-auto' : 'overflow-hidden'} [&>div:nth-of-type(2)]:pr-20` : ''} ${surfaceClassName}`}
          style={{ maxHeight: layoutExpanded ? '100cqh' : undefined, rotateX: reduced || selected || blocked || scene.dragging ? 0 : rotateX, rotateY: reduced || selected || blocked || scene.dragging ? 0 : rotateY, rotateZ: layoutExpanded ? 0 : position.rotation }}
          animate={selected
            ? { y: 0, scale: 1, boxShadow: '0 32px 96px rgba(0,0,0,0.4)' }
            : scene.dragging === id ? { y: 0, scale: 1, boxShadow: '0 24px 65px rgba(0,0,0,0.3)' }
            : active ? { y: scene.foreground === id ? -6 : -2, scale: scene.foreground === id ? 1.015 : 1.005, boxShadow: '0 18px 55px rgba(0,0,0,0.22)' }
              : { y: 0, scale: 1, boxShadow: '0 0 0 rgba(0,0,0,0)' }} transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 32 }}>
          <motion.button type="button" aria-label={`展开${label}`} aria-expanded={expanded} onClick={open} disabled={selected} className="sr-only focus:not-sr-only focus:absolute focus:right-3 focus:top-3 focus:z-10 focus:rounded-full focus:bg-black/10 focus:px-3 focus:py-2">展开</motion.button>
          {layoutExpanded && <motion.div className="absolute right-3 top-3 z-10 flex gap-2">
            <MotionButton type="button" data-close-card aria-label={`关闭${label}`} onClick={() => { onClose?.(); scene.onRemove?.(id as WidgetCard); }} disabled={flipping || !scene.onRemove} className="grid size-8 place-items-center rounded-full bg-black/10" whileTap={{ scale: 0.95 }}><Icon name="close" className="size-4" /></MotionButton>
            <MotionButton type="button" data-collapse-card aria-label={`收起${label}`} onClick={close} disabled={flipping} className="grid size-8 place-items-center rounded-full bg-black/10" whileTap={{ scale: 0.95 }}><Minus className="size-4" aria-hidden="true" /></MotionButton>
          </motion.div>}
          {children}
        </motion.div>
      </motion.div>
      </motion.div>
    </motion.article>
  );
}
