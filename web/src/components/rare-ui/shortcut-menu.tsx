import { createPortal } from 'react-dom';
import { Button } from '@base-ui/react/button';
import { AnimatePresence, motion } from 'motion/react';
import type { ShortcutMenuState } from '../../joe/composer/shortcut-suggestion';

const MotionButton = motion.create(Button);
export function ShortcutMenu({ menu }: { menu: ShortcutMenuState | null }) {
  if (typeof document === 'undefined') return null;
  return createPortal(<AnimatePresence>{menu && <motion.div
    id="shortcut-menu" role="listbox" aria-label="快捷指令"
    initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
    style={{ left: menu.left, top: menu.top }}
    className="fixed z-[250] w-[220px] -translate-y-full rounded-2xl bg-[#252525] p-1.5 text-white shadow-xl">
    {menu.items.map((item, index) => <MotionButton key={item.id} id={`shortcut-${item.id}`} role="option" aria-selected={index === menu.selected}
      onMouseDown={event => event.preventDefault()} onClick={() => menu.choose(item)} whileTap={{ scale: 0.98 }}
      className={`flex w-full items-center justify-between gap-4 rounded-xl px-3 py-2.5 text-sm ${index === menu.selected ? 'bg-white/10' : ''}`}>
      <span className="font-bold">{item.trigger}</span><span className="text-white/60">{item.label}</span>
    </MotionButton>)}
    {!menu.items.length && <div className="px-3 py-2 text-sm text-white/50">暂无指令</div>}
  </motion.div>}</AnimatePresence>, document.body);
}
