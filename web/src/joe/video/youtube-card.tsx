import type { VideoPlaybackRequest } from '../../../../shared/video-playback';
import { ChevronDown } from 'lucide-react';
import { nanoid } from 'nanoid';
import type { BehaviorContext } from '../../../../shared/widget-behavior';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@base-ui/react/button';
import { AnimatePresence, motion, useIsPresent } from 'motion/react';
import { TiltCard } from '../tilt-card';
import { useCanvasScene } from '../canvas-scene';
import { useYouTubePlayer } from './use-youtube-player';
import { VideoList, type VideoItem } from '../../components/rare-ui/video-list';
import { useVideoHistory } from './use-video-history';
import { VideoBackdrop } from './video-backdrop';
import { videoId, videoUrl } from './mount-youtube-player';

export type VideoResults = { query: string; videos: VideoItem[] };
export function YouTubeCard({ results, context, playback, onPlaybackHandled }: { results?: VideoResults; context?: BehaviorContext; playback?: VideoPlaybackRequest; onPlaybackHandled?(requestId: string): void }) {
  const scene = useCanvasScene();
  const present = useIsPresent();
  const expanded = present && scene.selection?.id === 'video' && scene.selection.expanded;
  const [recentExpanded, setRecentExpanded] = useState(false);
  const [selected, setSelected] = useState('');
  const [selectionId, setSelectionId] = useState('');
  const { recent, record } = useVideoHistory();
  const [selectedItem, setSelectedItem] = useState<VideoItem>();
  useEffect(() => { setSelected(''); setSelectedItem(undefined); }, [results]);
  const handledPlayback = useRef<string | undefined>(undefined);
  // Only a new command plays: remounts and restored search snapshots must stay quiet.
  useEffect(() => {
    if (!playback || handledPlayback.current === playback.requestId) return;
    handledPlayback.current = playback.requestId;
    choose(playback.video, playback.requestId);
    onPlaybackHandled?.(playback.requestId);
  }, [playback]);
  const video = useYouTubePlayer(Boolean(expanded && selected), selected || videoId, Boolean(selected), context && selectionId ? { ...context, selectionId } : undefined, () => { if (selectedItem) record(selectedItem); });
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  function choose(item: VideoItem, requestId = nanoid()) {
    const known = results?.videos.find(video => video.id === item.id) ?? recent.find(video => video.id === item.id);
    setSelectionId(requestId);
    setSelectedItem(item.title === `YouTube · ${item.id}` && known ? known : item);
    setSelected(item.id);
    setThumbnailFailed(false);
    scene.open('video');
  }

  const backToList = selected && <Button type="button" onClick={event => { event.stopPropagation(); video.pause(); setSelected(''); }} className="flex h-[21.333px] shrink-0 items-center rounded-full bg-black/5 px-3 text-xs leading-none text-black/70 hover:bg-black/10">返回列表</Button>;

  return (
    <TiltCard id="video" expandedActions={backToList} animateExpandedSize expandedScroll={false} expandedWidth={selected ? 'min(914px, calc(100cqw - 24px))' : 'min(630px, calc(100cqw - 24px))'}
      expandedHeight={selected ? 'min(1280px, calc(100cqh - 24px))' : 'min(900px, calc(100cqh - 24px))'}
      surfaceClassName={`flex flex-col overflow-hidden rounded-[24px] ${selected ? 'bg-black' : 'bg-white'} text-black`} label="视频卡片" onExpand={() => { if (selected) video.play(); }} onClose={video.pause}>
      {layoutExpanded => <>
      <motion.div className="flex h-14 shrink-0 items-center bg-white justify-between gap-3 px-5 text-xs">
        <motion.span className="flex items-center gap-2 text-black/60"><motion.img src="/logos/youtube.svg" alt="" draggable={false} className="h-4 w-auto shrink-0" />YouTube</motion.span>
        {!layoutExpanded && backToList}
      </motion.div>
      {!selected ? <motion.div className={`${layoutExpanded ? 'min-h-0 flex-1' : 'max-h-[360px]'} space-y-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden overscroll-contain px-3 pb-3`} onPointerDown={event => event.stopPropagation()}>
        {recent.length > 0 && <motion.section layout className="@container" aria-label="最近播放">
          <Button type="button" aria-label={recentExpanded ? '收起最近播放' : '展开最近播放'} aria-expanded={recentExpanded}
            onClick={event => { event.stopPropagation(); setRecentExpanded(value => !value); }}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-black/50 hover:bg-black/5">
            最近播放<motion.span animate={{ rotate: recentExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}><ChevronDown className="size-4" aria-hidden /></motion.span>
          </Button>
          <AnimatePresence initial={false}>
            {recentExpanded && <motion.div key="recent-videos" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <VideoList layout="grid" items={recent} onSelect={item => choose(item)} />
            </motion.div>}
          </AnimatePresence>
        </motion.section>}
        {results && <><motion.p className="flex items-center gap-1 px-2 text-xs text-black/50">搜索结果<motion.span>{results.videos.length}</motion.span></motion.p><VideoList items={results.videos} onSelect={item => choose(item)} /></>}
        {!recent.length && !results && <motion.p className="px-2 py-5 text-xs text-black/50">让 Joe 帮你找视频</motion.p>}
        {results?.videos.length === 0 && <motion.p className="px-2 py-4 text-xs text-black/50">没有找到视频</motion.p>}
      </motion.div> : <motion.div className={`relative w-full ${layoutExpanded ? 'min-h-0 flex-1' : 'min-h-[200px] aspect-video'} overflow-hidden bg-black`}>
        <motion.div ref={video.host} className={`absolute inset-0 [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:size-full [&_iframe]:border-0 ${layoutExpanded ? '' : 'pointer-events-none opacity-0'}`} aria-hidden={!layoutExpanded} inert={!layoutExpanded} />
        {!layoutExpanded && <motion.div className="absolute inset-0 grid cursor-pointer place-items-center bg-black/30" aria-hidden="true">
          {!thumbnailFailed && <motion.img src={`https://i.ytimg.com/vi/${selected || videoId}/hqdefault.jpg`} onError={() => setThumbnailFailed(true)} alt="" draggable={false} className="absolute inset-0 size-full object-contain opacity-70" />}
          <motion.span className="relative grid size-12 place-items-center rounded-full bg-white/90 text-lg text-black backdrop-blur-sm">▶</motion.span>
        </motion.div>}
        {layoutExpanded && !video.ready && !video.error && <motion.p role="status" className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs text-black/50">加载中…</motion.p>}
        {layoutExpanded && video.autoplayBlocked && !video.error && <Button type="button" onClick={video.play} className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-xs text-black">点击播放</Button>}
        {layoutExpanded && video.error && <motion.div role="status" className={`absolute flex items-center justify-center gap-4 text-xs text-black/70 inset-x-0 top-0 bg-white/95 p-3`}>
          <motion.p>{video.error}</motion.p>
          <motion.a href={selected ? `https://www.youtube.com/watch?v=${selected}` : videoUrl} target="_blank" rel="noopener noreferrer" className="rounded-full bg-black/5 px-4 py-2 text-black">前往观看 ↗</motion.a>
        </motion.div>}
      </motion.div>}
      <VideoBackdrop active={Boolean(expanded && layoutExpanded && selected)} />
      </>}
    </TiltCard>
  );
}
