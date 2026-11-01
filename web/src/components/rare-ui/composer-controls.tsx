import { useRef } from 'react';
import { Button } from '@base-ui/react/button';
import { Input } from '@base-ui/react/input';
import { motion } from 'motion/react';
import { LoaderCircle, Paperclip } from 'lucide-react';

export const ComposerButton = motion.create(Button);
export const composerButtonClass = 'grid size-[34px] shrink-0 place-items-center rounded-full bg-[#333333] text-white disabled:opacity-40';
export function ComposerAttachmentButton({ disabled, uploading = false, onUpload }: { disabled: boolean; uploading?: boolean; onUpload(file: File): Promise<void> }) {
  const file = useRef<HTMLInputElement>(null);
  return <>
    <Input ref={file} type="file" accept="image/png,image/jpeg,image/webp,.md,.txt" aria-label="上传附件" className="sr-only" disabled={disabled}
      onChange={event => { const selected = event.target.files?.[0]; event.target.value = ''; if (selected) void onUpload(selected); }} />
    <ComposerButton type="button" disabled={disabled} aria-label={uploading ? '上传中' : '添加附件'} aria-busy={uploading} className={composerButtonClass} whileTap={{ scale: 0.95 }} onClick={() => file.current?.click()}>{uploading ? <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><LoaderCircle size={16} strokeWidth={1.75} /></motion.span> : <Paperclip size={16} strokeWidth={1.75} />}</ComposerButton>
  </>;
}
