import { useRef, useState } from 'react';
import { Button } from '@base-ui/react/button';
import { Input } from '@base-ui/react/input';
import type { useJoe } from '../../joe/use-joe';
import type { useVoiceInput } from '../../joe/use-voice-input';
import { Icon } from '../workspace/icon';
import { contentSurface, inputSurface, roundButton } from '../workspace/material';

type Props = { joe: ReturnType<typeof useJoe>; voice: ReturnType<typeof useVoiceInput> };
export function Composer({ joe, voice }: Props) {
  const [text, setText] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const canSend = Boolean(joe.bootstrap?.configured.llm && joe.sessionId && !joe.uploading && (text.trim() || joe.attachments.length));
  async function submit() {
    const value = text;
    setText('');
    if (!await joe.send(value)) setText(current => current || value);
  }
  return (
    <div className="shrink-0 px-4 pb-4">
      {voice.unsent.length > 0 && <div className={`mb-3 max-h-24 overflow-y-auto px-3 py-2 text-xs ${contentSurface}`} aria-label="未发送的语音">
        {voice.unsent.map(message => <div key={message.id} className="flex items-start gap-3 py-1">
          <span className="flex-1 whitespace-pre-wrap break-words">{message.text}</span>
          <Button disabled={!joe.sessionId || joe.uploading} onClick={() => void voice.retry(message.id)} className="shrink-0 rounded-lg px-2 py-1 text-white/90">重发</Button>
        </div>)}
      </div>}
      {joe.attachments.length > 0 && <div className="mb-3 flex flex-wrap gap-2">
        {joe.attachments.map(a => <span key={a.id} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-1.5 text-xs">
          {a.name}<Button disabled={joe.busy} onClick={() => void joe.removeAttachment(a.id)} aria-label={`移除 ${a.name}`}>×</Button>
        </span>)}
      </div>}
      {voice.transcript && <p className="mb-3 px-3 text-sm text-white/90" role="status">{voice.transcript}</p>}
      <div className={`flex items-center gap-1.5 rounded-full p-1.5 ${inputSurface}`}>
        <Input ref={file} type="file" accept=".md,.txt" className="sr-only" aria-label="上传文本附件" disabled={joe.busy || joe.uploading || !joe.sessionId}
          onChange={event => { const selected = event.target.files?.[0]; if (selected) void joe.upload(selected); event.target.value = ''; }} />
        <Button className={`${roundButton} bg-transparent`} aria-label="添加附件" disabled={!joe.sessionId || joe.busy || joe.uploading || joe.attachments.length >= 5} onClick={() => file.current?.click()}><Icon name="plus" /></Button>
        <Input className="min-w-0 flex-1 bg-transparent py-2 text-sm font-semibold text-white outline-none placeholder:text-white/60"
          value={text} onValueChange={setText} maxLength={12000} placeholder="说点什么…" aria-label="消息" onFocus={joe.unlock}
          onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing && canSend) { event.preventDefault(); void submit(); } }} />
        <Button className={`${roundButton} ${voice.muted || voice.state === 'error' ? 'bg-white/15' : 'bg-transparent'}`} disabled={!voice.ready}
          aria-label={voice.recording ? '静音麦克风' : voice.state === 'error' ? '重试语音' : '恢复接听'} aria-pressed={voice.muted} title={voice.status} onClick={voice.toggleMuted}>
          <Icon name={voice.recording ? 'mic' : 'muted'} />
        </Button>
        {!canSend && (joe.busy || joe.voicePending) ? <Button className={roundButton} aria-label="停止回答" onClick={joe.stop}><Icon name="stop" /></Button>
          : <Button className={`${roundButton} bg-white/25`} aria-label="发送消息" disabled={!canSend} onClick={() => void submit()}><Icon name="send" /></Button>}
      </div>
      {joe.uploading && <p className="mt-2 px-3 text-xs text-white/90" role="status">上传中…</p>}
    </div>
  );
}
