import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '@base-ui/react/button';
import { ThoughtOrb } from './thought-orb';
import { ExpressionLab, type MindState, type Emotion } from './expression-lab';
import { visualState } from '../state.js';

export function JoeExperience() {
  const [visual, setVisual] = useState(() => visualState());
  const [demo, setDemo] = useState(false);
  const [demoText, setDemoText] = useState('');

  useEffect(() => {
    if (!demo) return;
    const started = performance.now();
    setVisual(visualState('listening'));
    setDemoText('演示提问：“可以把复杂的想法，讲得简单一点吗？”');
    const timer = setInterval(() => {
      const t = (performance.now() - started) / 1000;
      if (t >= 16) {
        setDemo(false);
        setDemoText('');
        setVisual(visualState());
        return;
      }
      if (t < 3) return;
      if (t < 7) {
        setVisual(visualState('thinking'));
        setDemoText('');
        return;
      }
      setVisual(
        visualState(
          'speaking',
          t < 11 ? 'curious' : 'empathy',
          0.3 + 0.25 * Math.sin(t * 5) + 0.15 * Math.sin(t * 11),
        ),
      );
      setDemoText(
        t < 11 ? '演示回答：当然。我们可以先找到最重要的那条线索。' : '演示回答：然后，一起把它慢慢说清楚。',
      );
    }, 100);
    return () => clearInterval(timer);
  }, [demo]);

  function select(state: MindState, emotion: Emotion = visual.emotion as Emotion) {
    setDemo(false);
    setDemoText('');
    setVisual(visualState(state, emotion));
  }

  return (
    <div className="min-h-screen" style={{ '--accent': visual.color } as CSSProperties}>
      <header className="mx-[5%] flex h-[100px] items-center justify-between border-b border-white/5 max-sm:h-[76px]">
        <Link
          className="flex items-center gap-3 text-[35px] font-semibold tracking-[-2px] text-[#f0f2ff] no-underline max-sm:text-[29px]"
          to="/"
          aria-label="Joe 首页"
        >
          <span className="text-[32px] font-light tracking-normal text-[#b2bdff] max-sm:text-[27px]">✳</span>
          joe<span className="-ml-3 text-[#8198e5]">.</span>
        </Link>
        <span className="flex items-center gap-[9px] rounded-full border border-white/10 px-[13px] py-[9px] font-mono text-[10px] tracking-[1px] text-[#9ba5bd] max-sm:text-[9px]">
          <i className="size-[5px] rounded-full bg-[#9ca8c4]" />
          视觉预览
        </span>
      </header>
      <main>
        <div className="pt-[42px] text-center max-lg:pt-8 max-sm:pt-[30px] min-[1500px]:pt-[60px]">
          <h1 className="text-[clamp(25px,3vw,38px)] font-normal leading-normal tracking-[5px] max-sm:text-[26px] max-sm:tracking-[3px]">
            视觉实验室
          </h1>
        </div>
        <section
          className="mx-auto grid min-h-[440px] max-w-[1050px] grid-cols-[minmax(360px,650px)_217px] gap-8 items-center px-[5%] max-lg:grid-cols-[1fr_210px] max-lg:gap-2.5 max-sm:flex max-sm:flex-col max-sm:gap-0 max-sm:px-5 min-[1500px]:max-w-[1140px] min-[1500px]:grid-cols-[minmax(400px,740px)_217px]"
          aria-label="Joe 动态思维球预览"
        >
          <ThoughtOrb visual={visual} />
          <ExpressionLab
            visual={visual}
            onState={(state) => select(state)}
            onEmotion={(emotion) => select('speaking', emotion)}
          />
        </section>
        <section
          className="relative z-20 mx-auto -mt-1.5 text-center max-sm:mt-[26px] min-[1500px]:mt-0"
          aria-label="会话状态"
        >
          <div className="flex items-center justify-center gap-[9px] text-[13px] tracking-[2px]">
            <span className="size-[5px] rounded-full bg-(--accent) shadow-[0_0_12px_var(--accent)]" />
            <span id="status-label">{visual.title}</span>
          </div>
          {demoText && (
            <p
              className="mx-auto mt-3 mb-6 min-h-[18px] max-w-[85%] text-[11px] leading-[1.7] text-[#7f89a1]"
              aria-live="polite"
            >
              {demoText}
            </p>
          )}
          <div className="mt-6 mb-8 flex items-center justify-center gap-2.5">
            <Button
              id="demo"
              className="flex items-center gap-[13px] rounded-full border border-[#8498d84d] px-5 py-[13px] text-xs tracking-[1px] text-[#dce5ff] shadow-[0_0_25px_#537be810] hover:border-[#a2b6ef80] bg-[linear-gradient(110deg,#27325399,#172039aa)] hover:bg-[#2b3c65]"
              aria-pressed={demo}
              onClick={() => (demo ? select('idle', 'calm') : setDemo(true))}
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-[17px]" aria-hidden="true">
                <rect x="9" y="3" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M6 11a6 6 0 0 0 12 0M12 17v4m-3 0h6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <span>{demo ? '结束演示' : '开始演示'}</span>
              <span className="ml-2.5 text-[#8e9fca]">↗</span>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
