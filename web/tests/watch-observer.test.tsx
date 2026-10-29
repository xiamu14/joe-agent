import { test, expect } from 'bun:test';
import { observeWatch } from '../src/joe/video/observe-watch';
import { flushBehaviors } from '../src/joe/behavior/delivery';

test('observer finalizes short play, freezes background time and removes timers on disposal', async () => {
  const names = ['window', 'document', 'localStorage', 'fetch', 'setInterval', 'clearInterval', 'performance'] as const;
  const saved = new Map(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const timers = new Map<number, { callback: () => void; delay: number }>(), listeners = new Map<string, () => void>();
  const disk = new Map<string, string>(), requests: any[] = [];
  let now = 0, position = 0, state = 1, hidden = false, nextTimer = 0;
  const install = (name: string, value: unknown) => Object.defineProperty(globalThis, name, { value, configurable: true });
  install('window', { addEventListener: (name: string, fn: () => void) => listeners.set(name, fn), removeEventListener: (name: string) => listeners.delete(name) });
  install('document', { get hidden() { return hidden; }, hasFocus: () => !hidden });
  install('performance', { now: () => now });
  install('setInterval', (callback: () => void, delay: number) => { timers.set(++nextTimer, { callback, delay }); return nextTimer; });
  install('clearInterval', (id: number) => timers.delete(id));
  install('localStorage', { get length() { return disk.size; }, key: (i: number) => [...disk.keys()][i],
    getItem: (k: string) => disk.get(k) ?? null, setItem: (k: string, v: string) => disk.set(k, v), removeItem: (k: string) => disk.delete(k) });
  install('fetch', async (_url: string, options: RequestInit) => { const value = JSON.parse(String(options.body)); requests.push(value); return Response.json({ eventId: value.event.eventId }); });
  const player = { getCurrentTime: () => position / 1000, getDuration: () => 10, getPlaybackRate: () => 1,
    getPlayerState: () => state, playVideo() {}, pauseVideo() {}, destroy() {}, getIframe: () => null as unknown as HTMLIFrameElement };
  try {
    const observer = observeWatch(player, 'BagZ55ac4xs', { sessionId: 'session', canvasId: 'canvas', instanceId: 'instance' });
    observer.state(true);
    now = 100; position = 100; state = 2; observer.state(false);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(requests.at(-1).event.payload.playedDurationMs).toBe(100);
    const recordId = requests.at(-1).event.recordId;
    hidden = true; now = 30000; position = 2000;
    for (const timer of timers.values()) if (timer.delay === 250) timer.callback();
    hidden = false; state = 1; observer.state(true);
    now = 30250; position = 2250;
    for (const timer of timers.values()) if (timer.delay === 250) timer.callback();
    observer.dispose();
    await new Promise(resolve => setTimeout(resolve, 0)); await flushBehaviors();
    expect(requests.at(-1).event.recordId).toBe(recordId);
    expect(requests.at(-1).event.payload.playedDurationMs).toBe(350);
    expect(requests.at(-1).event.payload.coveredRangesMs).toEqual([[0, 100], [2000, 2250]]);
    expect(requests.at(-1).event.payload.completeness).toBe('final');
    expect([...timers.values()].some(timer => timer.delay === 250 || timer.delay === 5000)).toBe(false);
    expect(listeners.has('pagehide')).toBe(false);
  } finally {
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  }
});
