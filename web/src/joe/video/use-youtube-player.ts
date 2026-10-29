import { useEffect, useRef, useState } from 'react';
import type { YouTubePlayer } from './youtube-api';
import { mountYouTubePlayer, videoId } from './mount-youtube-player';

export function useYouTubePlayer(expanded: boolean, selectedId = videoId) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YouTubePlayer | null>(null);
  const expandedRef = useRef(expanded);
  const [started, setStarted] = useState(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  useEffect(() => {
    expandedRef.current = expanded;
    if (expanded) {
      setStarted(true);
      if (ready) player.current?.playVideo();
    } else player.current?.pauseVideo();
  }, [expanded, ready]);

  useEffect(() => {
    if (!started || !host.current) return;
    setReady(false);
    const dispose = mountYouTubePlayer(host.current, {
      isExpanded: () => expandedRef.current,
      onReady: instance => { player.current = instance; setReady(true); },
      onPlaying: setPlaying,
      onError: setError,
      onPlaybackStarted: () => { setAutoplayBlocked(false); setError(''); },
      onAutoplayBlocked: () => { setAutoplayBlocked(true); setPlaying(false); },
    }, selectedId);
    return () => { player.current = null; dispose(); };
  }, [started, selectedId]);

  function play() {
    setAutoplayBlocked(false);
    if (ready) { setError(''); player.current?.playVideo(); }
  }
  function pause() { player.current?.pauseVideo(); }
  function toggle() { if (playing) pause(); else play(); }

  return { host, ready, playing, error, autoplayBlocked, play, pause, toggle };
}
