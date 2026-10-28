import { motion } from 'motion/react';
import FluidOrb from '../components/rare-ui/fluid-orb';

export function WorkspaceInput() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mb-2 flex w-full max-w-[660px] shrink-0 items-center gap-4 rounded-full bg-[#151515] px-4 py-4 shadow-[0_8px_24px_rgba(0,0,0,0.15)] sm:gap-6 sm:px-5 lg:mb-9" aria-label="输入区预览">
      <FluidOrb size={44} color="#F75001" className="shrink-0" aria-label="橙色光球" />
      <motion.span className="min-w-0 flex-1 truncate text-sm tracking-wide text-[#8d8d8d] sm:text-base">说说你的想法…</motion.span>
      <motion.span className="flex shrink-0 items-center gap-2 rounded-full bg-[#ff914d]/10 px-2 py-1.5 pr-3 text-xs font-medium text-[#ffa264]" aria-label="Joe 助手">
        <motion.span className="grid size-6 place-items-center rounded-full bg-[#ff8b3d] text-[10px] font-semibold text-white">AI</motion.span>
        Joe 助手
      </motion.span>
    </motion.div>
  );
}
