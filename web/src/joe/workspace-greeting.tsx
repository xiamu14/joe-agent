import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import type { Message } from './types';

export function WorkspaceGreeting({ message, autoplay, onAutoplay, onPlayingChange }: {
  message: Message; autoplay: boolean; onAutoplay: () => void; onPlayingChange: (playing: boolean) => void;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');
  const onPlayingRef = useRef(onPlayingChange);
  onPlayingRef.current = onPlayingChange;
  function playback(value: boolean) { setPlaying(value); onPlayingRef.current(value); }
  const onAutoplayRef = useRef(onAutoplay);
  onAutoplayRef.current = onAutoplay;
  useEffect(() => {
    const player = audio.current;
    if (autoplay && player) {
      onAutoplayRef.current();
      void player.play().catch(() => {});
    }
    return () => { player?.pause(); onPlayingRef.current(false); };
  }, [message.id]);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-4 flex items-end justify-start gap-2" aria-label="Joe 的问候">
      <motion.div className="min-w-0 max-w-[85%]">
        <motion.div className="rounded-[18px] rounded-bl-[6px] bg-[#FC4C01] px-4 py-2.5 text-[12px] leading-6 text-white" data-playing={playing || undefined}>
          <motion.p>{message.text}</motion.p>
        </motion.div>
        <motion.audio ref={audio} src={message.audioUrl} preload="none" onPlay={() => playback(true)} onPause={() => playback(false)} onEnded={() => playback(false)} onError={() => { playback(false); setError('语音暂不可用'); }} />
        {error && <motion.p role="status" className="mt-1 text-xs text-white/70">{error}</motion.p>}
      </motion.div>
    </motion.div>
  );
}
