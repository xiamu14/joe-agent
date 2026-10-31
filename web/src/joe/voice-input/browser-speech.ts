import { api, jsonBody } from '../api';
import { browserSpeechError } from './errors';

type Result = { isFinal: boolean; 0: { transcript: string } };
interface Recognition {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<Result> }) => void) | null;
  onend: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start(): void; stop(): void; abort(): void;
}
type Constructor = new () => Recognition;
export function browserSpeechAvailable() {
  if (typeof window === 'undefined') return false;
  const browser = window as unknown as { SpeechRecognition?: Constructor; webkitSpeechRecognition?: Constructor };
  return Boolean(browser.SpeechRecognition || browser.webkitSpeechRecognition);
}
const allowed = (value: string) => /^[\p{Script=Han}\p{Script=Latin}\p{Number}\p{Punctuation}\p{Symbol}\s]+$/u.test(value);
export function startBrowserSpeech(sessionId: string, callbacks: {
  preview(value: string): void; text(value: string): void; stopped(): void; finished(): void; failed(error: unknown): void;
}) {
  const browser = window as unknown as { SpeechRecognition?: Constructor; webkitSpeechRecognition?: Constructor };
  const SpeechRecognition = browser.SpeechRecognition || browser.webkitSpeechRecognition;
  if (!SpeechRecognition) throw new Error('浏览器不支持语音识别');
  const recognition = new SpeechRecognition(), abort = new AbortController();
  recognition.lang = navigator.language.toLowerCase().startsWith('en') ? 'en-US' : 'zh-CN';
  recognition.continuous = true; recognition.interimResults = true;
  let cancelled = false, finishing = false, failed = false, speaking = false, interim = '';
  let silence: ReturnType<typeof setTimeout>;
  const unverified: string[] = [];
  let pending = Promise.resolve();
  const preview = () => callbacks.preview([...unverified, interim].filter(Boolean).join(' '));
  const finish = () => { if (!cancelled && !finishing) { finishing = true; clearTimeout(silence); callbacks.stopped(); recognition.stop(); } };
  const resetSilence = () => { clearTimeout(silence); silence = setTimeout(finish, 3000); };
  recognition.onspeechstart = () => { speaking = true; clearTimeout(silence); };
  recognition.onspeechend = () => { speaking = false; resetSilence(); };
  recognition.onresult = event => {
    if (cancelled || failed) return;
    if (!speaking) resetSilence();
    interim = '';
    for (let index = event.resultIndex; index < event.results.length; index++) {
      const result = event.results[index], value = result[0]?.transcript.trim();
      if (!value || !allowed(value)) continue;
      if (!result.isFinal) { interim += value; continue; }
      unverified.push(value);
      pending = pending.then(async () => {
        if (cancelled) return;
        try {
          const result = await api<{ text: string }>('/validate-transcript', { ...jsonBody({ sessionId, text: value }), signal: abort.signal });
          if (!cancelled && result.text) callbacks.text(result.text);
        } catch (error) { if (!cancelled) callbacks.failed(error); }
        finally { unverified.shift(); if (!cancelled) preview(); }
      });
    }
    preview();
  };
  recognition.onerror = event => {
    if (cancelled || event.error === 'no-speech' || event.error === 'aborted') return;
    failed = true; clearTimeout(silence); callbacks.preview(''); callbacks.failed(browserSpeechError(event.error));
  };
  recognition.onend = () => {
    if (cancelled || failed) return;
    if (!finishing) {
      if (speaking) { speaking = false; resetSilence(); }
      try { recognition.start(); } catch (error) { failed = true; callbacks.failed(error); }
      return;
    }
    void pending.then(() => { if (!cancelled) callbacks.finished(); });
  };
  recognition.start();
  resetSilence();
  return {
    finish,
    cancel() { if (!cancelled) { cancelled = true; clearTimeout(silence); abort.abort(); recognition.abort(); } },
  };
}
