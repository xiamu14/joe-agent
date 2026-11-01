import { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { Button } from '@base-ui/react/button';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';

const MotionButton = motion.create(Button);
export function MessageImage({ src, name, thumbnail = false }: { src: string; name: string; thumbnail?: boolean }) {
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState(160);
  const reduced = useReducedMotion();
  return <>
    <MotionButton aria-label={`预览${name}`} onClick={event => { event.stopPropagation(); setOpen(true); }}
      whileTap={{ scale: reduced ? 1 : 0.98 }} style={thumbnail ? undefined : { width }} className={`${thumbnail ? 'size-[34px] rounded-lg' : 'max-w-full rounded-xl [container-type:inline-size]'} block overflow-hidden outline-none focus-visible:outline-2 focus-visible:outline-white/60`}>
      <img src={src} alt={name} onLoad={event => { if (!thumbnail) setWidth(event.currentTarget.naturalWidth * 0.6); }} className={thumbnail ? 'block size-[34px] object-cover object-top' : 'block h-auto max-h-[150cqw] w-full object-cover object-top'} />
    </MotionButton>
    <AnimatePresence>{open && <Dialog static open={open} onClose={() => setOpen(false)} className="relative z-[300]" onClick={event => event.stopPropagation()}>
      <motion.div aria-hidden className="fixed inset-0 bg-black/80 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <div className="fixed inset-0 flex items-center justify-center p-5 sm:p-8">
        <DialogPanel as={motion.div} initial={{ opacity: 0, scale: reduced ? 1 : 0.94, y: reduced ? 0 : 12 }} animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: reduced ? 0 : 0.2 } }} exit={{ opacity: 0, scale: reduced ? 1 : 0.96 }}
          className="relative max-h-full max-w-full">
          <DialogTitle className="sr-only">图片预览：{name}</DialogTitle>
          <img src={src} alt={name} className="block max-h-[calc(100dvh-64px)] max-w-full rounded-2xl object-contain" />
          <MotionButton autoFocus aria-label="关闭预览" onClick={() => setOpen(false)} whileTap={{ scale: reduced ? 1 : 0.9 }} className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-[#252525]/90 text-white shadow-lg outline-none focus-visible:outline-2 focus-visible:outline-white/60"><X size={16} /></MotionButton>
        </DialogPanel>
      </div>
    </Dialog>}</AnimatePresence>
  </>;
}
