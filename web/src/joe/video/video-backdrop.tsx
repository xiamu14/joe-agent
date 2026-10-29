import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useCanvasScene } from '../canvas-scene';

export function VideoBackdrop({ active }: { active: boolean }) {
  const scene = useCanvasScene();
  const [clipPath, setClipPath] = useState<string>();
  useEffect(() => {
    setClipPath(undefined);
    if (!active) return;
    const card = scene.canvas.current?.querySelector<HTMLElement>('[data-card="video"]');
    if (!card) return;
    let timer: ReturnType<typeof setTimeout>;
    const measure = () => {
      const { left: x, top: y, width: w, height: h } = card.getBoundingClientRect();
      const r = Math.min(24, w / 2, h / 2);
      // Keep the live iframe in place; only the surrounding viewport is shaded.
      const viewport = `M0 0 H${window.innerWidth} V${window.innerHeight} H0 Z`;
      const hole = `M${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} H${x + r} Q${x} ${y + h} ${x} ${y + h - r} V${y + r} Q${x} ${y} ${x + r} ${y} Z`;
      setClipPath(`path(evenodd, "${viewport} ${hole}")`);
    };
    const settle = () => {
      clearTimeout(timer);
      // Avoid filtering/reclipping the full viewport during the card's flip and size animation.
      setClipPath(undefined);
      timer = setTimeout(measure, 300);
    };
    const observer = new ResizeObserver(settle);
    observer.observe(card);
    window.addEventListener('resize', settle);
    window.addEventListener('scroll', settle, true);
    settle();
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener('resize', settle);
      window.removeEventListener('scroll', settle, true);
    };
  }, [active, scene.canvas]);
  if (typeof document === 'undefined') return null;
  return createPortal(<AnimatePresence>
    {active && clipPath && <motion.div key="video-backdrop" aria-hidden data-video-backdrop
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
      style={{ clipPath }}
      className="pointer-events-none fixed inset-0 z-[1000] backdrop-blur-sm bg-[radial-gradient(ellipse_at_center,rgba(51,51,51,0.7)_0%,rgba(51,51,51,0.6)_100%)]" />}
  </AnimatePresence>, document.body);
}
