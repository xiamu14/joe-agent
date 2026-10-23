import { useEffect, useRef, useState } from 'react';
import { createOrb } from '../orb.js';
import { emotions, visualState } from '../state.js';

type Visual = ReturnType<typeof visualState>;
type Orb = ReturnType<typeof createOrb>;

export function ThoughtOrb({ visual, compact = false }: { visual: Visual; compact?: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const orb = useRef<Orb | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!container.current || !canvas.current) return;
    const instance = createOrb(container.current, visualState(), canvas.current, setError);
    orb.current = instance;
    return () => {
      instance.dispose();
      orb.current = null;
    };
  }, []);
  useEffect(() => {
    orb.current?.update(visual);
  }, [visual]);

  const emotion = emotions[visual.emotion as keyof typeof emotions].label;
  return (
    <div
      className={`relative min-w-0 ${compact ? 'mx-auto h-full w-full max-w-[560px]' : 'h-[460px] max-lg:h-[440px] max-sm:h-[340px] max-sm:w-full min-[1500px]:h-[520px]'}`}
    >
      <div
        id="orb"
        className={`absolute mix-blend-screen before:pointer-events-none before:absolute before:inset-[13%] before:blur-[20px] before:bg-[radial-gradient(ellipse,color-mix(in_srgb,var(--accent)_12%,transparent),transparent_68%)] before:content-[''] ${compact ? '-inset-x-3 -inset-y-3' : '-inset-x-[45px] -inset-y-[35px] max-lg:-inset-x-[30px] max-lg:-inset-y-5 max-sm:-inset-x-5 max-sm:-inset-y-2.5'}`}
        ref={container}
        role="img"
        aria-label={`3D 粒子思维球：${visual.label}${visual.state === 'speaking' ? `，${emotion}` : ''}`}
      >
        <canvas
          className="relative block size-full outline-none [mask-image:radial-gradient(ellipse_closest-side,#000_68%,transparent_100%)]"
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
    </div>
  );
}
