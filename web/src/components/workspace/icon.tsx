type IconName = 'grid' | 'close' | 'settings' | 'send' | 'muted' | 'mic' | 'plus' | 'stop' | 'clock' | 'costs' | 'conversation';
const paths: Record<IconName, string> = {
  grid: 'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z',
  close: 'M6 6l12 12 M6 18L18 6',
  settings: 'M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  send: 'M12 19V5 M6 11l6-6 6 6',
  muted: 'M9 9v3a3 3 0 0 0 5 2 M15 9V5a3 3 0 0 0-5-2 M5 10v2a7 7 0 0 0 12 5 M19 10v2 M12 19v3 M8 22h8 M3 3l18 18',
  mic: 'M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0z M5 10v2a7 7 0 0 0 14 0v-2 M12 19v3 M8 22h8',
  plus: 'M12 5v14 M5 12h14',
  stop: 'M6 6h12v12H6z',
  clock: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M12 7v5l3 2',
  costs: 'M16 7c-1-2-8-2-8 2 0 4 8 2 8 6 0 4-7 4-8 2 M12 3v18',
  conversation: 'M21 11a9 9 0 0 1-9 9H4l1-5a9 9 0 1 1 16-4 M8 10h8 M8 14h5',
};
export function Icon({ name, className = 'size-5' }: { name: IconName; className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d={paths[name]} /></svg>;
}
