import { useId } from 'react';
import { motion, useAnimationFrame, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from 'motion/react';
import { wavePath } from './voice-wave-shape';

const colors = ['#FC4C01', '#ffb649', '#ff765c', '#b57cff', '#ffd19a'];

function Ribbon({ index, level, reduced }: { index: number; level: MotionValue<number>; reduced: boolean }) {
  const path = useMotionValue(wavePath(0, 0, index));
  const band = useMotionValue(wavePath(0, 0, index, true));
  let wasQuiet = false;
  useAnimationFrame(time => {
    const quiet = level.get() < 0.001;
    if (quiet && wasQuiet) return;
    wasQuiet = quiet;
    band.set(wavePath(reduced ? 0 : time / 1000, level.get(), index, true));
    path.set(wavePath(reduced ? 0 : time / 1000, level.get(), index));
  });
  return <><motion.path d={band} fill={colors[index]} opacity={0.22} /><motion.path d={path} fill="none" stroke={colors[index]} strokeWidth={index === 0 ? 1.3 : 0.7} opacity={index === 0 ? 0.9 : 0.65} /></>;
}

export function VoiceWave({ active, level }: { active: boolean; level: MotionValue<number> }) {
  const id = useId().replaceAll(':', '');
  const reduced = Boolean(useReducedMotion());
  const loudness = useTransform(level, value => Math.sqrt(Math.max(0, value)));
  const amplitude = useSpring(loudness, { stiffness: 140, damping: 22, mass: 0.6 });
  const particles = useTransform(amplitude, value => reduced ? 0 : value * 0.5);
  return (
    <motion.svg viewBox="0 0 480 64" preserveAspectRatio="none" aria-hidden="true"
      initial={{ opacity: 0 }} animate={{ opacity: active ? 1 : 0 }} transition={{ duration: 0.4 }}
      className="pointer-events-none mx-3 h-9 min-w-0 flex-1 overflow-hidden">
      <defs>
        <linearGradient id={`${id}-fade`}><stop stopColor="white" stopOpacity="0" /><stop offset=".16" stopColor="white" /><stop offset=".84" stopColor="white" /><stop offset="1" stopColor="white" stopOpacity="0" /></linearGradient>
        <mask id={`${id}-mask`}><rect width="480" height="64" fill={`url(#${id}-fade)`} /></mask>
        <filter id={`${id}-glow`} x="-10%" y="-100%" width="120%" height="300%"><feGaussianBlur stdDeviation="2.3" /></filter>
        <g id={`${id}-ribbons`}>{colors.map((_, index) => <Ribbon key={index} index={index} level={amplitude} reduced={reduced} />)}</g>
      </defs>
      <g mask={`url(#${id}-mask)`}>
        <path d="M0 32H480" stroke="#FC4C01" strokeWidth=".5" opacity=".35" />
        <use href={`#${id}-ribbons`} filter={`url(#${id}-glow)`} opacity=".8" />
        <use href={`#${id}-ribbons`} transform="translate(0 69) scale(1 -.85)" filter={`url(#${id}-glow)`} opacity=".2" />
        <use href={`#${id}-ribbons`} />
        <motion.g style={{ opacity: particles }}>{Array.from({ length: 12 }, (_, index) => (
          <motion.circle key={index} cx={120 + (index * 71) % 240} cy={29} r={index % 3 === 0 ? 0.8 : 0.5} fill={colors[index % colors.length]}
            animate={active && !reduced ? { y: [0, -18 - index % 8], opacity: [0, 0.7, 0] } : { y: 0, opacity: 0 }}
            transition={{ duration: 1.8 + index % 3 * 0.3, repeat: Infinity, delay: index * 0.17, ease: 'linear' }} />
        ))}</motion.g>
      </g>
    </motion.svg>
  );
}
