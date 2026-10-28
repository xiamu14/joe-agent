import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { createParticleOrb } from './renderer.js';
import { visualState } from '../../state.js';

export function ParticleOrb() {
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const orb = useRef<ReturnType<typeof createParticleOrb> | null>(null);
  const reduced = useReducedMotion();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!container.current || !canvas.current) return;
    const instance = createParticleOrb(container.current, { ...visualState(), color: '#164bff' }, canvas.current, setError);
    orb.current = instance;
    return () => { instance.dispose(); orb.current = null; };
  }, []);
  useEffect(() => { orb.current?.pause(Boolean(reduced)); }, [reduced]);

  return (
    <motion.div ref={container} role="img" aria-label="粒子光球" className="relative h-[340px] max-h-full w-full max-w-[420px]">
      <motion.canvas ref={canvas} aria-hidden="true" className="block size-full" />
      {error && <motion.p role="status" className="absolute inset-0 grid place-items-center p-6 text-center text-xs text-white/50">{error}</motion.p>}
    </motion.div>
  );
}
