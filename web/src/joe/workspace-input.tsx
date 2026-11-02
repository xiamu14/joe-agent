import { useState } from 'react';
import { EditorContent, type JSONContent } from '@tiptap/react';
import { motion } from 'motion/react';
import { ArrowUp, Mic } from 'lucide-react';
import { WorkspaceTools } from '../components/rare-ui/workspace-tools';
import { ComposerAttachmentButton, ComposerButton, composerButtonClass } from '../components/rare-ui/composer-controls';
import { AttachmentList } from '../components/rare-ui/attachment-list';
import { ShortcutMenu } from '../components/rare-ui/shortcut-menu';
import { VoiceWave } from './voice-wave';
import { useVoiceLevel } from './use-voice-level';
import { useDictation } from './use-dictation';
import { useComposerEditor } from './composer/use-composer-editor';
import { appendText, draftCommand } from './composer/draft';
import { api, jsonBody } from './api';
import { dictationError } from './voice-input/errors';
import type { Attachment } from './types';
import type { useJoe } from './use-joe';

export function WorkspaceInput({ draft, onDraftChange, onSend, ready, busy, sessionId, voiceReady, onError, onSettings, layoutMode, onToggleLayout, attachments, uploading, onUpload, onRemoveAttachment }: {
  draft: JSONContent; onDraftChange(value: JSONContent): void;
  onSend: ReturnType<typeof useJoe>['send'];
  ready: boolean; busy: boolean; sessionId: string; voiceReady: boolean;
  onError(message: string): void; onSettings(): Promise<boolean>;
  layoutMode: 'free' | 'bento'; onToggleLayout(): void;
  attachments: Attachment[]; uploading: boolean; onUpload(file: File): Promise<void>; onRemoveAttachment(id: string): Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const { editor, menu } = useComposerEditor({ draft, onChange: onDraftChange, onSubmit: () => void submit(), onError, disabled: !ready || submitting });
  const voice = useDictation(sessionId, value => appendText(editor, value), onError);
  const recording = voice.state === 'recording' || voice.state === 'connecting';
  const level = useVoiceLevel(voice.state === 'recording', voice.inputStream);
  const canSend = ready && !busy && !uploading && !submitting && Boolean(editor?.getText().trim() || voice.preview || attachments.length);
  async function submit() {
    if (!canSend || !editor) return;
    const spoken = voice.preview;
    appendText(editor, spoken);
    voice.cancel();
    const content = editor.getJSON();
    const text = editor.getText({ blockSeparator: '\n' });
    const command = draftCommand(content);
    setSubmitting(true); onError('');
    editor.commands.clearContent();
    try {
      const validate = spoken ? async () => {
        const result = await api<{ text: string }>('/validate-transcript', jsonBody({ sessionId, text: spoken }));
        if (!result.text) onError('未识别到中文或英文');
        return Boolean(result.text);
      } : undefined;
      if (!await onSend(text, false, validate, command)) editor.commands.setContent(content);
    } catch (error) { editor.commands.setContent(content); onError(dictationError(error)); }
    finally { setSubmitting(false); }
  }
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mb-1 flex w-full max-w-[660px] shrink-0 flex-col gap-3 rounded-[28px] bg-[#151515] px-4 py-4 shadow-[0_8px_24px_rgba(0,0,0,0.15)] sm:px-5 lg:mb-[18px]" aria-label="输入区">
      <div className="relative grid" onPasteCapture={event => {
        const file = event.clipboardData.files[0];
        if (file) { event.preventDefault(); if (!busy && !uploading && !submitting) void onUpload(file); }
      }}>
        {editor?.isEmpty && !voice.preview && <div aria-hidden className="pointer-events-none absolute top-0 text-sm leading-7 tracking-wider text-[#8d8d8d] sm:text-base">有什么想和我分享的吗？</div>}
        <EditorContent editor={editor} className="col-start-1 row-start-1 min-w-0" />
        {voice.preview && <motion.p role="status" className={`${editor?.isEmpty ? 'pointer-events-none col-start-1 row-start-1 self-start' : 'mt-1'} min-w-0 max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-7 text-white/50 sm:text-base`}>{voice.preview}</motion.p>}
      </div>
      <ShortcutMenu menu={menu} />
      <motion.div className="flex h-[50px] w-full shrink-0 items-center justify-between">
        <motion.div className="flex min-w-0 items-center gap-2">
          <WorkspaceTools layoutMode={layoutMode} onToggleLayout={onToggleLayout} onSettings={onSettings} ready={ready} className={composerButtonClass} />
          <ComposerAttachmentButton disabled={!ready || busy || uploading || submitting || attachments.length >= 5} uploading={uploading} onUpload={onUpload} />
          {attachments.length > 0 && <AttachmentList files={attachments} sessionId={sessionId} disabled={busy || submitting} onRemove={id => void onRemoveAttachment(id)} />}
        </motion.div>
        <VoiceWave active={recording} level={level} />
        <motion.div className="flex shrink-0 items-center gap-2">
          <ComposerButton type="button" disabled={!(voiceReady || (sessionId && voice.browserSupported)) || busy || submitting || voice.state === 'transcribing'} onClick={voice.toggle} aria-label={recording ? '结束录音' : '开始录音'} aria-pressed={recording} whileTap={{ scale: 0.95 }} className={`${composerButtonClass} ${recording ? 'bg-[#FC4C01]' : ''}`}><Mic size={16} strokeWidth={1.75} /></ComposerButton>
          <ComposerButton type="button" disabled={!canSend} onClick={() => void submit()} aria-label="发送消息" whileTap={{ scale: 0.95 }} className={`${composerButtonClass} enabled:bg-[#FC4C01]`}><ArrowUp size={16} strokeWidth={canSend ? 3 : 1.75} /></ComposerButton>
        </motion.div>
      </motion.div>
      {uploading && <span role="status" className="sr-only">上传中…</span>}
    </motion.div>
  );
}
