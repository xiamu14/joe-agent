import { useEffect, useState } from 'react';
import { Button } from '@base-ui/react/button';
import { motion, useIsPresent } from 'motion/react';
import { TiltCard } from '../tilt-card';
import { useCanvasScene } from '../canvas-scene';
import { useYouTubePlayer } from './use-youtube-player';
import { VideoList, type VideoItem } from '../../components/rare-ui/video-list';
import { useVideoHistory } from './use-video-history';
import { videoId, videoUrl } from './mount-youtube-player';

export type VideoResults = { query: string; videos: VideoItem[] };
export function YouTubeCard({ results }: { results?: VideoResults }) {
  const scene = useCanvasScene();
  const present = useIsPresent();
  const expanded = present && scene.selection?.id === 'video' && scene.selection.expanded;
  const [selected, setSelected] = useState('');
  const { recent, record } = useVideoHistory();
  const [selectedItem, setSelectedItem] = useState<VideoItem>();
  useEffect(() => { setSelected(''); setSelectedItem(undefined); }, [results]);
  const video = useYouTubePlayer(Boolean(expanded && selected), selected || videoId, Boolean(selected));
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  useEffect(() => { if (video.playing && selectedItem) record(selectedItem); }, [video.playing, selectedItem]);
  function choose(item: VideoItem) { setSelectedItem(item); setSelected(item.id); scene.open('video'); }

  return (
    <TiltCard id="video" expandedScroll={false} expandedWidth={selected ? 'min(914px, calc(100cqw - 24px))' : 'min(630px, calc(100cqw - 24px))'}
      expandedHeight={selected ? 'min(1280px, calc(100cqh - 24px))' : 'min(900px, calc(100cqh - 24px))'}
      surfaceClassName="flex flex-col overflow-hidden rounded-[24px] bg-white text-black" label="视频卡片" onExpand={() => { if (selected) video.play(); }} onClose={video.pause}>
      <motion.div className="flex h-14 shrink-0 items-center justify-between gap-3 px-5 text-xs">
        <motion.span className="flex items-center gap-2 text-black/60"><motion.img src="/logos/youtube.svg" alt="" draggable={false} className="h-4 w-auto shrink-0" />YouTube</motion.span>
        {selected && <Button onClick={event => { event.stopPropagation(); video.pause(); setSelected(''); }} className="rounded-full px-3 py-1 text-black/70 hover:bg-black/5">返回列表</Button>}
      </motion.div>
      {!selected ? <motion.div className={`${expanded ? 'min-h-0 flex-1' : 'max-h-[360px]'} space-y-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden overscroll-contain px-3 pb-3`} onPointerDown={event => event.stopPropagation()}>
        {recent.length > 0 && <><motion.p className="px-2 text-xs text-black/50">最近播放</motion.p><VideoList items={recent} onSelect={choose} /></>}
        {results && <><motion.p className="px-2 text-xs text-black/50">搜索结果</motion.p><VideoList items={results.videos} onSelect={choose} /></>}
        {!recent.length && !results && <motion.p className="px-2 py-5 text-xs text-black/50">让 Joe 帮你找视频</motion.p>}
        {results?.videos.length === 0 && <motion.p className="px-2 py-4 text-xs text-black/50">没有找到视频</motion.p>}
      </motion.div> : <motion.div className={`relative w-full ${expanded ? 'min-h-0 flex-1' : 'min-h-[200px] aspect-video'} overflow-hidden rounded-b-[24px] bg-black`}>
        <motion.div ref={video.host} className={`absolute inset-0 [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:size-full [&_iframe]:border-0 ${expanded ? '' : 'pointer-events-none opacity-0'}`} aria-hidden={!expanded} inert={!expanded} />
        {!expanded && <motion.div className="absolute inset-0 grid cursor-pointer place-items-center bg-black/30" aria-hidden="true">
          {!thumbnailFailed && <motion.img src={`https://i.ytimg.com/vi/${selected || videoId}/hqdefault.jpg`} onError={() => setThumbnailFailed(true)} alt="" draggable={false} className="absolute inset-0 size-full object-contain opacity-70" />}
          <motion.span className="relative grid size-12 place-items-center rounded-full bg-white/90 text-lg text-black backdrop-blur-sm">▶</motion.span>
        </motion.div>}
        {expanded && !video.ready && !video.error && <motion.p role="status" className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs text-black/50">加载中…</motion.p>}
        {expanded && video.autoplayBlocked && !video.error && <Button type="button" onClick={video.play} className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-xs text-black">点击播放</Button>}
        {expanded && video.error && <motion.div role="status" className={`absolute flex items-center justify-center gap-4 text-xs text-black/70 inset-x-0 top-0 bg-white/95 p-3`}>
          <motion.p>{video.error}</motion.p>
          <motion.a href={selected ? `https://www.youtube.com/watch?v=${selected}` : videoUrl} target="_blank" rel="noopener noreferrer" className="rounded-full bg-black/5 px-4 py-2 text-black">前往观看 ↗</motion.a>
        </motion.div>}
      </motion.div>}
    </TiltCard>
  );
}
