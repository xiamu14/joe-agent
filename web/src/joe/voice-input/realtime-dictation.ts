import { api, jsonBody } from '../api';
import { startRealtime } from './realtime';

export async function startRealtimeDictation(stream: MediaStream, context: AudioContext, sessionId: string, token: string, callbacks: {
  preview(value: string): void; text(value: string): void; error(error: unknown): void; stopped(): void; finished(): void;
}) {
  const abort = new AbortController();
  let closed = false, last = '', revision = 0, validating = false, timer: ReturnType<typeof setTimeout> | undefined;
  let pending = Promise.resolve();
  let silence: ReturnType<typeof setTimeout>;
  const validate = (value: string) => api<{ text: string }>('/validate-transcript', { ...jsonBody({ sessionId, text: value }), signal: abort.signal });
  const partial = (value: string) => {
    resetSilence();
    last = value;
    if (timer || validating) return;
    timer = setTimeout(() => {
      timer = undefined;
      const current = last, seq = revision;
      validating = true;
      void validate(current).then(result => { if (!closed && seq === revision) callbacks.preview(result.text); }).catch(() => {}).finally(() => {
        validating = false;
        if (!closed && last && last !== current) partial(last);
      });
    }, 500);
  };
  const commit = (value: string) => {
    resetSilence();
    last = ''; revision++; clearTimeout(timer); callbacks.preview('');
    pending = pending.then(async () => {
      try { const result = await validate(value); if (!closed && result.text) callbacks.text(result.text); }
      catch (error) { if (!closed) callbacks.error(error); }
    });
  };
  const cleanup = await startRealtime(stream, context, token, {
    partial, final: commit, transcribing() {}, error: message => { if (!closed) callbacks.error(message); },
  });
  const cancel = () => { if (closed) return; closed = true; clearTimeout(timer); clearTimeout(silence); abort.abort(); cleanup(); callbacks.preview(''); };
  const finish = () => {
    if (closed) return;
    clearTimeout(silence);
    if (last) commit(last);
    clearTimeout(silence);
    cleanup(); callbacks.stopped();
    void pending.then(() => { if (!closed) { cancel(); callbacks.finished(); } });
  };
  function resetSilence() { clearTimeout(silence); silence = setTimeout(finish, 3000); }
  resetSilence();
  return { finish, cancel };
}
