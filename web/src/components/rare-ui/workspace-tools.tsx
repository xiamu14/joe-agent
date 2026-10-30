import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { Button } from '@base-ui/react/button';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { LayoutTemplate, PanelsTopLeft, PocketKnife, Settings, Sparkles, Toolbox } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const MotionButton = motion.create(Button);
const row = 'flex w-full items-center gap-2 rounded-xl px-2 py-2.5 text-left text-sm text-white/90 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white/60 disabled:cursor-default disabled:text-white/30 disabled:hover:bg-transparent';

export function WorkspaceTools({ onSettings, ready, className, layoutMode, onToggleLayout }: {
  onSettings(): Promise<boolean>; ready: boolean; className: string;
  layoutMode: 'free' | 'bento'; onToggleLayout(): void;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 12, bottom: 12 });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!open) return;
    function place() {
      const rect = trigger.current?.getBoundingClientRect();
      if (rect) setPosition({ left: Math.max(12, Math.min(rect.left, window.innerWidth - 146)), bottom: window.innerHeight - rect.top + 10 });
    }
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open]);
  async function settings() {
    setPending(true); setError('');
    try { if (await onSettings()) setOpen(false); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '设置打开失败'); }
    finally { setPending(false); }
  }
  return <>
    <MotionButton ref={trigger} type="button" aria-label="工具" aria-haspopup="dialog" aria-expanded={open} onClick={() => { setError(''); setOpen(true); }} className={className} whileTap={{ scale: 0.95 }}><Settings size={14} strokeWidth={1.75} /></MotionButton>
    <AnimatePresence>
      {open && <Dialog static open={open} onClose={() => setOpen(false)} className="relative z-[200]">
        <DialogPanel as={motion.div} initial={{ opacity: 0, y: reduced ? 0 : 8, scale: reduced ? 1 : 0.96 }} animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: reduced ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] } }} exit={{ opacity: 0, y: reduced ? 0 : 6, scale: reduced ? 1 : 0.96, transition: { duration: reduced ? 0 : 0.15 } }} style={position} className="fixed w-[134px] max-w-[calc(100vw-24px)] origin-bottom-left rounded-[20px] bg-[#252525] p-2 shadow-[0_12px_40px_rgba(0,0,0,0.3)]">
          <DialogTitle className="sr-only">工具</DialogTitle>
          <MotionButton type="button" disabled={!ready || pending} onClick={() => void settings()} className={row} whileTap={{ scale: 0.98 }}><Settings size={18} strokeWidth={1.75} />设置</MotionButton>
          <MotionButton type="button" onClick={() => { onToggleLayout(); setOpen(false); }} aria-label={`切换到${layoutMode === 'free' ? 'Bento' : '自由'}视图`} className={row} whileTap={{ scale: 0.98 }}><LayoutTemplate size={17} strokeWidth={1.75} /><span className="whitespace-nowrap">{layoutMode === 'free' ? '自由' : 'Bento'}</span></MotionButton>
          {error && <motion.p role="status" className="px-3 py-2 text-xs text-white/60">{error}</motion.p>}
        </DialogPanel>
      </Dialog>}
    </AnimatePresence>
  </>;
}
