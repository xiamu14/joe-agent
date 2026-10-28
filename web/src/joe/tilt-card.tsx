import { useState, type PointerEvent, type ReactNode } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import { cardTilt } from './card-tilt';

const spring = { type: 'spring' as const, stiffness: 240, damping: 28 };

export function TiltCard({ children, className, surfaceClassName, label }: {
  children: ReactNode;
  className: string;
  surfaceClassName: string;
  label: string;
}) {
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(x, spring);
  const rotateY = useSpring(y, spring);
  const active = hovered && !reduced;

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

  return (
    <motion.article
      className={`${className} [perspective:1000px]`}
      aria-label={label}
      onHoverStart={event => {
        if (!reduced && event.pointerType === 'mouse' && window.matchMedia('(hover: hover) and (pointer: fine)').matches) setHovered(true);
      }}
      onHoverEnd={reset}
      onPointerCancel={reset}
      onPointerMove={follow}
      whileHover={reduced ? undefined : { zIndex: 30 }}
      transition={{ duration: 0 }}
    >
      <motion.div
        className={`h-full ${surfaceClassName}`}
        style={{ rotateX: reduced ? 0 : rotateX, rotateY: reduced ? 0 : rotateY }}
        animate={active
          ? { y: -6, scale: 1.01, boxShadow: '0 18px 55px rgba(0,0,0,0.22)' }
          : { y: 0, scale: 1, boxShadow: '0 0 0 rgba(0,0,0,0)' }}
        transition={reduced ? { duration: 0 } : spring}
      >
        {children}
      </motion.div>
    </motion.article>
  );
}
