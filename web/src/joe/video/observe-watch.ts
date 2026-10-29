import type { BehaviorContext } from '../../../../shared/widget-behavior';
import { videoBehaviorDefinition } from '../../../../shared/widget-behavior';
import { bindBehavior } from '../behavior/recording';
import { startBehaviorDelivery } from '../behavior/delivery';
import { createWatchRecorder } from './watch-recorder';
import type { YouTubePlayer } from './youtube-api';

export function observeWatch(player: YouTubePlayer, videoId: string, context: BehaviorContext) {
  startBehaviorDelivery();
  const recorder = createWatchRecorder(videoId, bindBehavior(context, videoBehaviorDefinition));
  let playing = false;
  function sample(finishing = false) {
    if (!playing || document.hidden || !document.hasFocus()) { recorder.interrupt(); return; }
    try {
      recorder.sample({ now: performance.now(), positionMs: player.getCurrentTime() * 1000,
        durationMs: player.getDuration() * 1000, rate: player.getPlaybackRate(), playing: finishing || player.getPlayerState() === 1 });
    } catch { recorder.interrupt(); }
  }
  const samples = setInterval(() => sample(), 250);
  const checkpoints = setInterval(() => recorder.checkpoint(), 5000);
  const pagehide = () => { playing = false; recorder.finish(); };
  window.addEventListener('pagehide', pagehide);
  return {
    state(value: boolean) {
      if (!value) { sample(true); recorder.interrupt(); }
      playing = value;
      if (value) sample();
    },
    dispose() {
      sample(); playing = false; recorder.finish();
      clearInterval(samples); clearInterval(checkpoints); window.removeEventListener('pagehide', pagehide);
    },
  };
}
