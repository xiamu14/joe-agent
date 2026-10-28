import { useState } from 'react';
import { motion } from 'motion/react';
import { TiltCard } from '../tilt-card';
import { useCanvasScene } from '../canvas-scene';
import { useYouTubePlayer } from './use-youtube-player';
import { videoId, videoUrl } from './mount-youtube-player';

export function YouTubeCard() {
  const scene = useCanvasScene();
  const expanded = scene.selection?.id === 'video' && scene.selection.expanded;
  const video = useYouTubePlayer(expanded);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  function open() { video.play(); scene.open('video'); }

  return (
    <TiltCard id="video" surfaceClassName="overflow-hidden rounded-[24px] bg-[#232323] text-white" label="视频卡片" onExpand={video.play} onClose={video.pause}>
      <motion.div className="flex h-14 items-center justify-between gap-3 px-5 text-xs">
        <motion.span className="flex items-center gap-2 text-white/60"><motion.img src="/logos/youtube.svg" alt="" draggable={false} className="h-4 w-auto shrink-0" />YouTube</motion.span>

      </motion.div>
      <motion.div className="relative w-full min-h-[200px] aspect-video overflow-hidden rounded-b-[24px] bg-black">
        <motion.div ref={video.host} className={`absolute inset-0 [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:size-full [&_iframe]:border-0 ${expanded ? '' : 'pointer-events-none opacity-0'}`} aria-hidden={!expanded} inert={!expanded} />
        {!expanded && <motion.div className="absolute inset-0 grid cursor-pointer place-items-center bg-black/30" aria-hidden="true">
          {!thumbnailFailed && <motion.img src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`} onError={() => setThumbnailFailed(true)} alt="" draggable={false} className="absolute inset-0 size-full object-cover opacity-70" />}
          <motion.span className="relative grid size-12 place-items-center rounded-full bg-white/15 text-lg backdrop-blur-sm">▶</motion.span>
        </motion.div>}
        {expanded && !video.ready && !video.error && <motion.p role="status" className="pointer-events-none absolute inset-0 grid place-items-center text-xs text-white/50">加载中…</motion.p>}
        {expanded && video.autoplayBlocked && !video.error && <motion.button type="button" onClick={video.play} className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-xs text-black" whileTap={{ scale: 0.95 }}>点击播放</motion.button>}
        {expanded && video.error && <motion.div role="status" className={`absolute flex items-center justify-center gap-4 text-xs text-white/70 ${video.ready ? 'inset-x-0 bottom-0 bg-black/85 p-3' : 'inset-0 flex-col bg-[#171717] p-5'}`}>
          <motion.p>{video.error}</motion.p>
          <motion.a href={videoUrl} target="_blank" rel="noopener noreferrer" className="rounded-full bg-white/10 px-4 py-2 text-white">前往观看 ↗</motion.a>
        </motion.div>}
      </motion.div>
    </TiltCard>
  );
}
