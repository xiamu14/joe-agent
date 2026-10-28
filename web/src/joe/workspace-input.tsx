import { useState, type Dispatch, type SetStateAction } from 'react';
import { motion } from 'motion/react';
import { ArrowUp, Mic, Paperclip } from 'lucide-react';
import { VoiceWave } from './voice-wave';
import { useVoiceLevel } from './use-voice-level';
import { useDictation } from './use-dictation';
import { api, jsonBody } from './api';

const iconButton = 'grid size-[30px] shrink-0 place-items-center rounded-full bg-[#333333] text-white';

export function WorkspaceInput({ text, onTextChange, onSend, ready, busy, sessionId, voiceReady }: {
  text: string;
  onTextChange: Dispatch<SetStateAction<string>>;
  onSend: (text: string) => Promise<boolean>;
  ready: boolean;
  busy: boolean;
  sessionId: string;
  voiceReady: boolean;
}) {
  const voice = useDictation(sessionId, value => onTextChange(current => `${current}${current && !/\s$/.test(current) ? ' ' : ''}${value}`.slice(0, 12000)));
  const [submitting, setSubmitting] = useState(false);
  const [sendError, setSendError] = useState('');
  const recording = voice.state === 'recording' || voice.state === 'connecting';
  const level = useVoiceLevel(voice.state === 'recording', voice.inputStream);
  const preview = voice.preview ? `${text && !/\s$/.test(text) ? ' ' : ''}${voice.preview}` : '';
  const canSend = ready && !busy && !submitting && Boolean((text + preview).trim());
  async function submit() {
    if (!canSend) return;
    const draft = `${text}${preview}`.slice(0, 12000);
    const spoken = voice.preview;
    voice.cancel();
    onTextChange(draft);
    setSubmitting(true); setSendError('');
    try {
      if (spoken) {
        const result = await api<{ text: string }>('/validate-transcript', jsonBody({ sessionId, text: spoken }));
        if (!result.text) { onTextChange(current => current === draft ? text : current); setSendError('未识别到中文或英文'); return; }
      }
      onTextChange(current => current === draft ? '' : current);
      if (!await onSend(draft)) onTextChange(current => current || draft);
    } catch { setSendError('识别失败，请重试'); }
    finally { setSubmitting(false); }
  }
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mb-1 flex w-full max-w-[660px] shrink-0 flex-col gap-3 rounded-[28px] bg-[#151515] px-4 py-4 shadow-[0_8px_24px_rgba(0,0,0,0.15)] sm:px-5 lg:mb-[18px]" aria-label="输入区">
      <motion.textarea value={`${text}${preview}`.slice(0, 12000)} onChange={event => { const value = event.target.value; if (preview && value.endsWith(preview)) onTextChange(value.slice(0, -preview.length)); else { onTextChange(value); voice.setPreview(''); } }} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void submit(); } }} rows={2} aria-label="消息" placeholder="有什么想和我分享的吗？" maxLength={12000} className="w-full min-w-0 resize-none border-0 bg-transparent p-0 text-sm leading-6 tracking-wider text-white outline-none placeholder:text-[#8d8d8d] sm:text-base" />
      <motion.div className="flex w-full items-center justify-between">
        <motion.button type="button" disabled aria-label="添加附件" className={iconButton}><Paperclip size={14} strokeWidth={1.75} /></motion.button>
        <VoiceWave active={recording} level={level} />
        <motion.div className="flex shrink-0 items-center gap-2">
          <motion.button type="button" disabled={!(voiceReady || (sessionId && voice.browserSupported)) || busy || submitting || voice.state === 'transcribing'} onClick={voice.toggle} aria-label={recording ? '结束录音' : '开始录音'} aria-pressed={recording} whileTap={{ scale: 0.95 }} className={`${iconButton} ${recording ? 'bg-[#FC4C01]' : ''} disabled:opacity-40`}><Mic size={14} strokeWidth={1.75} /></motion.button>
          <motion.button type="button" disabled={!canSend} onClick={() => void submit()} aria-label="发送消息" whileTap={{ scale: 0.95 }} className={`${iconButton} enabled:bg-[#FC4C01] disabled:opacity-40`}><ArrowUp size={14} strokeWidth={canSend ? 3 : 1.75} /></motion.button>
        </motion.div>
      </motion.div>
      {(voice.error || sendError) && <motion.span role="status" className="text-[11px] text-white/60">{voice.error || sendError}</motion.span>}
    </motion.div>
  );
}
