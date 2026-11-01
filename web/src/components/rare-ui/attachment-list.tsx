import { Button } from '@base-ui/react/button';
import { AnimatePresence, motion } from 'motion/react';
import { Paperclip, X } from 'lucide-react';
import type { Attachment } from '../../joe/types';
import { MessageImage } from './message-image';

const MotionButton = motion.create(Button);
export const attachmentUrl = (sessionId: string, id: string) => `/joe-api/attachments/content?sessionId=${encodeURIComponent(sessionId)}&id=${encodeURIComponent(id)}`;
export function AttachmentList({ files, sessionId, disabled, onRemove }: {
  files: Attachment[]; sessionId: string; disabled: boolean; onRemove(id: string): void;
}) {
  return <motion.div layout role="region" aria-label="附件" tabIndex={0} className="flex min-w-0 max-w-[113px] gap-2 overflow-x-auto overscroll-x-contain py-2 pl-1 pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"><AnimatePresence initial={false}>{files.map(file => <motion.div
    key={file.id} layout initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
    className="relative size-[34px] shrink-0 rounded-lg bg-[#282828]">
    {file.mime?.startsWith('image/') ? <MessageImage src={attachmentUrl(sessionId, file.id)} name={file.name} thumbnail /> : <span title={file.name} className="grid size-[34px] place-items-center"><Paperclip size={16} /><span className="sr-only">{file.name}</span></span>}
    <MotionButton aria-label={`移除${file.name}`} disabled={disabled} onClick={() => onRemove(file.id)} whileTap={{ scale: 0.9 }} className="absolute -right-1.5 -top-1.5 z-10 grid size-4 place-items-center rounded-full bg-[#444444] text-white shadow-sm hover:bg-[#555555] disabled:opacity-40"><X size={10} strokeWidth={2.5} /></MotionButton>
  </motion.div>)}</AnimatePresence></motion.div>;
}
