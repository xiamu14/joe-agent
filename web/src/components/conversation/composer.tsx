import { useRef, useState } from 'react';
import { Button } from '@base-ui/react/button';
import { Input } from '@base-ui/react/input';
import { useRecorder } from '../../joe/use-recorder';
import type { useJoe } from '../../joe/use-joe';
type Joe = ReturnType<typeof useJoe>;
export function Composer({ joe }: { joe: Joe }) {
  const [text, setText] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const recorder = useRecorder(
    joe.sessionId,
    (value) => {
      const message = [text.trim(), value].filter(Boolean).join('\n');
      setText('');
      void joe.send(message, true).then((accepted) => {
        if (!accepted) setText((current) => current || message);
      });
    },
    joe.setState,
    joe.setError,
  );
  const canSend = Boolean(
    joe.bootstrap?.configured.llm && joe.sessionId && !recorder.recording && !recorder.transcribing,
  );
  async function submit() {
    const value = text;
    if (await joe.send(value)) setText((current) => (current === value ? '' : current));
  }
  return (
    <div className="mx-3 mb-3 shrink-0 rounded-2xl border border-white/10 bg-[#101625] px-3 py-2">
      {joe.attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {joe.attachments.map((a) => (
            <span key={a.id} className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1 text-xs">
              {a.name}
              <Button
                disabled={joe.busy}
                onClick={() => void joe.removeAttachment(a.id)}
                aria-label={`移除 ${a.name}`}
              >
                ×
              </Button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Input
          ref={file}
          type="file"
          accept=".md,.txt"
          className="sr-only"
          aria-label="上传文本附件"
          disabled={joe.busy || joe.uploading || !joe.sessionId}
          onChange={(e) => {
            const selected = e.target.files?.[0];
            if (selected) void joe.upload(selected);
            e.target.value = '';
          }}
        />
        <Button
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-xl text-slate-400 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="添加附件"
          disabled={
            !joe.sessionId || joe.busy || joe.uploading || recorder.recording || joe.attachments.length >= 5
          }
          onClick={() => file.current?.click()}
        >
          ＋
        </Button>
        <Input
          className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-slate-600"
          value={recorder.recording ? recorder.transcript || text : text}
          readOnly={recorder.recording || recorder.transcribing}
          onValueChange={setText}
          maxLength={12000}
          placeholder={
            recorder.recording ? (recorder.mode ? '正在倾听，停顿后自动发送…' : '正在连接…') : '输入消息…'
          }
          aria-label="消息"
          onFocus={joe.unlock}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing && !joe.busy && canSend) {
              e.preventDefault();
              void submit();
            }
          }}
        />
        <Button
          className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xl hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30 ${recorder.recording ? 'text-rose-300 ring-1 ring-rose-400/50' : 'text-slate-400'}`}
          disabled={
            !joe.bootstrap?.configured.asr ||
            !joe.bootstrap?.configured.llm ||
            joe.uploading ||
            !joe.sessionId
          }
          aria-label={recorder.recording || recorder.transcribing ? '停止语音输入' : '开启语音输入'}
          aria-pressed={recorder.recording || recorder.transcribing}
          onClick={() => {
            joe.unlock();
            if (!recorder.recording && (joe.busy || joe.voicePending)) joe.stop();
            void recorder.toggle();
          }}
        >
          {recorder.recording || recorder.transcribing ? '■' : '◉'}
        </Button>
        {recorder.recording || recorder.transcribing ? (
          <span className="px-2 text-xs text-sky-200">
            {recorder.transcribing ? '识别中…' : recorder.mode ? '倾听中…' : '连接中…'}
          </span>
        ) : joe.busy || joe.voicePending ? (
          <Button
            className="shrink-0 rounded-xl border border-blue-300/20 bg-blue-400/15 px-3 py-2 text-xs text-blue-100 disabled:cursor-not-allowed disabled:opacity-30"
            onClick={() => {
              recorder.cancel();
              joe.stop();
            }}
          >
            停止
          </Button>
        ) : (
          <Button
            className="shrink-0 rounded-xl border border-blue-300/20 bg-blue-400/15 px-3 py-2 text-xs text-blue-100 disabled:cursor-not-allowed disabled:opacity-30"
            disabled={!canSend || joe.uploading || (!text.trim() && !joe.attachments.length)}
            onClick={() => void submit()}
          >
            发送 ↑
          </Button>
        )}
      </div>
      {joe.uploading && (
        <p className="mt-2 text-xs text-slate-400" role="status">
          上传中…
        </p>
      )}
    </div>
  );
}
