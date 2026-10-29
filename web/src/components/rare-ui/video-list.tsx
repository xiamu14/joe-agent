import { useRef, useState } from 'react';
import { Button } from '@base-ui/react/button';
import { motion, useReducedMotion } from 'motion/react';

export type VideoItem = { id: string; title: string; channel: string; thumbnail: string; publishedAt?: string; views?: number; duration?: number };
const MotionButton = motion.create(Button);
function VideoTitle({ title }: { title: string }) {
  const host = useRef<HTMLSpanElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const [distance, setDistance] = useState(0);
  const reduced = useReducedMotion();
  function measure() { setDistance(Math.max(0, (text.current?.scrollWidth ?? 0) - (host.current?.clientWidth ?? 0))); }
  return <motion.span ref={host} onHoverStart={measure} onHoverEnd={() => setDistance(0)} className="block overflow-hidden text-sm font-semibold" title={title}>
    <motion.span ref={text} className={`block whitespace-nowrap ${distance ? 'w-max' : 'truncate'}`} animate={{ x: reduced ? 0 : -distance }} transition={{ duration: distance ? distance / 28 : 0.2, delay: distance ? 0.6 : 0, ease: 'linear' }}>{title}</motion.span>
  </motion.span>;
}
export function VideoList({ items, onSelect }: { items: VideoItem[]; onSelect(item: VideoItem): void }) {
  return <motion.div className="space-y-1">{items.map(item => <MotionButton key={item.id} type="button" onClick={event => { event.stopPropagation(); onSelect(item); }} whileTap={{ scale: 0.98 }} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-black/60">
    <motion.img src={item.thumbnail} alt="" loading="lazy" className="aspect-video w-28 shrink-0 rounded-lg object-cover" />
    <motion.span className="min-w-0 flex-1"><VideoTitle title={item.title} />
      {(item.channel || item.views !== undefined) && <motion.span className="mt-1 flex items-center justify-between gap-3 text-xs text-black/65">
        <motion.span className="min-w-0 truncate">{item.channel}</motion.span>
        {item.views !== undefined && <motion.span className="shrink-0 text-[10px] text-black/50">{new Intl.NumberFormat('zh-CN', { notation: 'compact', maximumFractionDigits: 1 }).format(item.views)} 次观看</motion.span>}
      </motion.span>}
      {(item.duration !== undefined || item.publishedAt) && <motion.span className="mt-1 flex justify-between gap-2 text-[10px] text-black/50">
        {item.duration !== undefined && <span>{formatDuration(item.duration)}</span>}
        {item.publishedAt && <span>{item.publishedAt}</span>}
      </motion.span>}
    </motion.span>
  </MotionButton>)}</motion.div>;
}

function formatDuration(seconds: number) {
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(total / 60) % 60;
  const remainder = String(total % 60).padStart(2, '0');
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${remainder}` : `${minutes}:${remainder}`;
}
