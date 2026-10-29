import type { BehaviorSubmission } from '../../../../shared/widget-behavior';

const prefix = 'widget-behavior:pending:v1:';
const pending = new Map<string, BehaviorSubmission>();
let flushing = false;
let started = false;
function key(value: BehaviorSubmission) { return prefix + value.event.recordId; }
function restore() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const name = localStorage.key(i);
      if (!name?.startsWith(prefix)) continue;
      try {
        const value = JSON.parse(localStorage.getItem(name) ?? 'null') as BehaviorSubmission;
        if (value?.event?.recordId && value?.event?.eventId && value.sessionId) {
          const current = pending.get(name);
          if (!current || current.event.revision < value.event.revision) pending.set(name, value);
        }
      } catch { /* A malformed entry must not prevent other records from uploading. */ }
    }
  } catch { /* Keep the in-memory queue when browser storage is unavailable. */ }
}
export async function flushBehaviors() {
  if (flushing) return;
  flushing = true;
  try {
    restore();
    for (const [name, value] of pending) {
      try {
        const response = await fetch('/joe-api/behaviors', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(value), keepalive: true, signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) continue;
        const ack = await response.json();
        if (ack.eventId !== value.event.eventId) continue;
        if (pending.get(name)?.event.eventId === value.event.eventId) pending.delete(name);
        try {
          const saved = JSON.parse(localStorage.getItem(name) ?? 'null');
          if (saved?.event?.eventId === value.event.eventId) localStorage.removeItem(name);
        } catch { /* A newer checkpoint remains queued. */ }
      } catch { /* Retry the same event ID after the network recovers. */ }
    }
  } finally { flushing = false; }
}
export function enqueueBehavior(value: BehaviorSubmission) {
  pending.set(key(value), value);
  try { localStorage.setItem(key(value), JSON.stringify(value)); }
  catch { console.warn('观看记录暂存失败，页面关闭前将继续尝试上传'); }
  void flushBehaviors();
}
export function startBehaviorDelivery() {
  if (started || typeof window === 'undefined') return;
  started = true;
  window.addEventListener('online', () => void flushBehaviors());
  window.addEventListener('storage', () => void flushBehaviors());
  setInterval(() => void flushBehaviors(), 10000);
  void flushBehaviors();
}
