import { memo, useEffect, useRef, useState } from 'react';
import { createOrb } from '../orb.js';
import { emotions, visualState } from '../state.js';
import { motion, useReducedMotion, type MotionValue } from 'motion/react';

type Visual = ReturnType<typeof visualState>;
type Orb = ReturnType<typeof createOrb>;

export const ThoughtOrb = memo(function ThoughtOrb({ visual, compact = false, active = true, level }: { visual: Visual; compact?: boolean; active?: boolean; level?: MotionValue<number> }) {
  const reduced = useReducedMotion();
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const orb = useRef<Orb | null>(null);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!container.current || !canvas.current) return;
    const instance = createOrb(container.current, visualState(), canvas.current, setError);
    orb.current = instance;
    return () => {
      instance.dispose();
      orb.current = null;
    };
  }, [compact]);
  useEffect(() => {
    if (!container.current) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!active || !visible) return;
    const update = () => orb.current?.update(level ? { ...visual, level: level.get() } : visual);
    update();
    return reduced ? undefined : level?.on('change', update);
  }, [visual, active, visible, reduced, level, compact]);
  useEffect(() => { orb.current?.pause(!active || !visible || Boolean(reduced)); }, [active, visible, reduced]);

  const emotion = emotions[visual.emotion as keyof typeof emotions].label;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduced ? 0 : .35 }}
      className={`relative min-w-0 ${compact ? 'mx-auto h-full w-full max-w-[560px]' : 'h-[460px] max-lg:h-[440px] max-sm:h-[340px] max-sm:w-full min-[1500px]:h-[520px]'}`}
    >
      <div
        className={`absolute ${compact ? '-inset-x-3 -inset-y-3' : '-inset-x-[45px] -inset-y-[35px] max-lg:-inset-x-[30px] max-lg:-inset-y-5 max-sm:-inset-x-5 max-sm:-inset-y-2.5'}`}
        ref={container}
        role="img"
        aria-label={`流体球：${visual.label}${visual.state === 'speaking' ? `，${emotion}` : ''}`}
      >
        <canvas
          className="relative block size-full outline-none"
          ref={canvas}
          aria-hidden="true"
        />
        {error && (
          <div
            className="absolute inset-[20%] flex items-center justify-center rounded-full border p-[30px] text-center text-xs leading-[1.8] text-[#acb6ce] border-(--accent) bg-[radial-gradient(circle,#789bff20,transparent)]"
            role="status"
          >
            {error}
          </div>
        )}
      </div>
      {!compact && (
        <>
          <div className="pointer-events-none absolute left-[5%] top-[16%] font-mono text-[17px] font-extralight text-[#59688766] max-sm:text-sm">
            +
          </div>
          <div className="pointer-events-none absolute bottom-[13%] right-[5%] font-mono text-[17px] font-extralight text-[#59688766] max-sm:text-sm">
            +
          </div>
        </>
      )}
    </motion.div>
  );
});
