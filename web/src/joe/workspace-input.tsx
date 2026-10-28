import { motion } from 'motion/react';
import { ArrowUp, Mic, Paperclip } from 'lucide-react';

const iconButton = 'grid size-[30px] shrink-0 place-items-center rounded-full bg-[#333333] text-white';

export function WorkspaceInput() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mb-2 flex w-full max-w-[660px] shrink-0 flex-col gap-3 rounded-[28px] bg-[#151515] px-4 py-4 shadow-[0_8px_24px_rgba(0,0,0,0.15)] sm:px-5 lg:mb-9" aria-label="输入区">
      <motion.textarea rows={2} aria-label="消息" placeholder="说说你的想法…" maxLength={12000} className="w-full min-w-0 resize-none border-0 bg-transparent p-0 text-sm leading-6 tracking-wide text-white outline-none placeholder:text-[#8d8d8d] sm:text-base" />
      <motion.div className="flex w-full items-center justify-between">
        <motion.button type="button" disabled aria-label="添加附件" className={iconButton}><Paperclip size={14} strokeWidth={1.75} /></motion.button>
        <motion.div className="flex shrink-0 items-center gap-2">
          <motion.button type="button" disabled aria-label="发送消息" className={iconButton}><ArrowUp size={14} strokeWidth={1.75} /></motion.button>
          <motion.button type="button" disabled aria-label="语音输入" className={iconButton}><Mic size={14} strokeWidth={1.75} /></motion.button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
