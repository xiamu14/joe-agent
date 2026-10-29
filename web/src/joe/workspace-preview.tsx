import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { WeatherCard } from './weather/weather-card';
import { YouTubeCard } from './video/youtube-card';
import { CanvasSceneContext, useCanvasSceneState } from './canvas-scene';
import { useCanvasPan } from './use-canvas-pan';
import type { CanvasSnapshot } from './canvas-storage';
import type { CanvasLayout } from './canvas-layout';
import { AccountCards, type AccountCardProps } from './account-cards';
import type { OrdinaryCard } from './workspace-state';
import { visibleWidgetCards, type WidgetCard } from './widget-visibility';
import type { useJoe } from './use-joe';

export function CanvasPreview({ layout, initialPan, onSave, joe, emptyContent }: {
  layout: CanvasLayout; initialPan: CanvasSnapshot['pan']; onSave: (snapshot: CanvasSnapshot) => void;
  joe: AccountCardProps & Pick<ReturnType<typeof useJoe>, 'widgetVisibility' | 'widgetResources' | 'removeWidget' | 'cardRequest'>; emptyContent?: ReactNode;
}) {
  const scene = useCanvasSceneState(layout, initialPan, onSave, joe.removeWidget);
  const pan = useCanvasPan(scene);
  const cards = visibleWidgetCards(joe.widgetVisibility);
  const visible = (card: WidgetCard) => cards.includes(card);
  const accounts = (['costs', 'settings'] as OrdinaryCard[]).filter(visible);
  const weatherId = joe.widgetVisibility.weather?.bindings.data?.resourceId ?? joe.widgetVisibility.weather?.bindings.weather?.resourceId;
  const weatherResource = weatherId ? joe.widgetResources[weatherId] : undefined;
  const videoId = joe.widgetVisibility.video?.bindings.data?.resourceId;
  const videoResource = videoId ? joe.widgetResources[videoId] : undefined;
  const handledRequest = useRef<typeof joe.cardRequest>(null);
  useEffect(() => {
    const request = joe.cardRequest;
    if (!request || handledRequest.current === request || !visible(request.card)) return;
    handledRequest.current = request;
    scene.open(request.card, true);
  }, [joe.cardRequest, joe.widgetVisibility, scene.open]);
  const selected = scene.selection?.id;
  useEffect(() => {
    if (selected && ['costs', 'settings', 'weather', 'video'].includes(selected) && !visible(selected as WidgetCard)) scene.dismiss(selected);
  }, [selected, joe.widgetVisibility, scene.dismiss]);
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
    <motion.div ref={scene.canvas} tabIndex={0} role="region" aria-label="画布卡片"
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
      <AnimatePresence>{!cards.length && emptyContent}</AnimatePresence>
      <AnimatePresence initial={false}>
      {visible('video') && <YouTubeCard key="video" results={videoResource?.schema === 'youtube.search@1' ? videoResource.data as import('./video/youtube-card').VideoResults : undefined} />}
      {visible('weather') && <WeatherCard key="weather" bound={Boolean(weatherId)} resource={weatherResource?.schema === 'weather@1' ? weatherResource.data as import('./types').Weather : undefined} />}
      </AnimatePresence>
      <AccountCards cards={accounts} {...joe} />
      <motion.div aria-hidden="true" animate={{ opacity: scene.selection ? 0 : 1 }} className="pointer-events-none absolute inset-x-0 bottom-0 z-[70] h-5 backdrop-blur-md [mask-image:linear-gradient(to_bottom,transparent,black)] xl:h-7" />
      <motion.div aria-hidden="true" animate={{ opacity: scene.selection ? 0 : 1 }} className="pointer-events-none absolute inset-x-0 top-0 z-[70] h-5 backdrop-blur-md [mask-image:linear-gradient(to_top,transparent,black)] xl:h-7" />
      <motion.div aria-hidden="true" animate={{ opacity: scene.selection ? 0 : 1 }} className="pointer-events-none absolute inset-y-0 left-0 z-[70] w-5 backdrop-blur-md [mask-image:linear-gradient(to_left,transparent,black)] xl:w-7" />
      <motion.div aria-hidden="true" animate={{ opacity: scene.selection ? 0 : 1 }} className="pointer-events-none absolute inset-y-0 right-0 z-[70] w-5 backdrop-blur-md [mask-image:linear-gradient(to_right,transparent,black)] xl:w-7" />
    </motion.div>
    </CanvasSceneContext>
  );
}
