import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { WeatherCard } from './weather/weather-card';
import { YouTubeCard } from './video/youtube-card';
import { CanvasSceneContext, useCanvasSceneState } from './canvas-scene';
import { useCanvasPan } from './use-canvas-pan';
import type { CanvasSnapshot } from './canvas-storage';
import type { CanvasLayout } from './canvas-layout';
import { AccountCards, type AccountCardProps } from './account-cards';
import type { OrdinaryCard } from './workspace-state';
import type { useJoe } from './use-joe';

export function CanvasPreview({ layout, initialPan, onSave, joe, example = true, emptyContent }: {
  layout: CanvasLayout; initialPan: CanvasSnapshot['pan']; onSave: (snapshot: CanvasSnapshot) => void;
  joe: AccountCardProps & Pick<ReturnType<typeof useJoe>, 'cardRequest'>; example?: boolean; emptyContent?: ReactNode;
}) {
  const scene = useCanvasSceneState(layout, initialPan, onSave);
  const pan = useCanvasPan(scene);
  const [accounts, setAccounts] = useState<OrdinaryCard[]>(example ? ['costs', 'settings'] : []);
  const handled = useRef('');
  useEffect(() => {
    const request = joe.cardRequest;
    if (!request || handled.current === request.turnId || scene.dragging) return;
    setAccounts(cards => cards.includes(request.card) ? cards : [...cards, request.card]);
    if (scene.selection && scene.selection.id !== request.card) {
      if (scene.selection.expanded) scene.close();
      return;
    }
    // Finish the previous close animation before promoting another card.
    if (scene.selection && !scene.selection.expanded) return;
    scene.open(request.card);
    handled.current = request.turnId;
  }, [joe.cardRequest, scene.selection, scene.dragging, scene.open, scene.close]);
  useEffect(() => {
    if (!scene.selection?.expanded) return;
    const close = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || scene.canvas.current?.querySelector('[data-flipping="true"]')) return;
      event.preventDefault(); scene.close();
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [scene.selection?.expanded, scene.close, scene.canvas]);
  return (
    <CanvasSceneContext value={scene}>
    <motion.div ref={scene.canvas} tabIndex={0} role="region" aria-label={example ? '示例卡片' : '对话卡片'}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className={`absolute inset-0 isolate [container-type:size] overflow-clip rounded-[28px] outline-none ${scene.selection ? 'touch-auto' : pan.dragging ? 'touch-none cursor-grabbing select-none' : 'touch-none cursor-grab'}`}
      onPointerDown={pan.down} onPointerMove={pan.move} onPointerUp={pan.finish} onPointerCancel={pan.finish} onLostPointerCapture={pan.finish}
      onKeyDown={pan.key} onFocusCapture={pan.focus}
      onClickCapture={event => {
        if (!scene.canvas.current?.contains(event.target as Node)) return;
        pan.click(event);
        if (event.isPropagationStopped()) return;
        if (scene.canvas.current?.querySelector('[data-flipping="true"]')) { event.stopPropagation(); return; }
        if (scene.selection && !(event.target as Element).closest('[data-expanded="true"]') && !(event.target as Element).closest('button')) {
          event.stopPropagation(); scene.close();
        }
      }}>
      {!example && !accounts.length && emptyContent}
      {example && <>
      <YouTubeCard />
      <WeatherCard />
      </>}
      <AccountCards cards={accounts} {...joe} />
      <motion.div aria-hidden="true" animate={{ opacity: scene.selection ? 0 : 1 }} className="pointer-events-none absolute inset-x-0 bottom-0 z-[70] h-5 backdrop-blur-md [mask-image:linear-gradient(to_bottom,transparent,black)] xl:h-7" />
      <motion.div aria-hidden="true" animate={{ opacity: scene.selection ? 0 : 1 }} className="pointer-events-none absolute inset-x-0 top-0 z-[70] h-5 backdrop-blur-md [mask-image:linear-gradient(to_top,transparent,black)] xl:h-7" />
      <motion.div aria-hidden="true" animate={{ opacity: scene.selection ? 0 : 1 }} className="pointer-events-none absolute inset-y-0 left-0 z-[70] w-5 backdrop-blur-md [mask-image:linear-gradient(to_left,transparent,black)] xl:w-7" />
      <motion.div aria-hidden="true" animate={{ opacity: scene.selection ? 0 : 1 }} className="pointer-events-none absolute inset-y-0 right-0 z-[70] w-5 backdrop-blur-md [mask-image:linear-gradient(to_right,transparent,black)] xl:w-7" />
    </motion.div>
    </CanvasSceneContext>
  );
}
