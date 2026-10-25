import { memo } from 'react';
import { motion } from 'motion/react';
import { Button } from '@base-ui/react/button';

export const backgrounds = {
  sky: { name: '浅蓝', color: "bg-[url('/backgrounds/blue-gauze.jpg')] [@media(min-aspect-ratio:1/1)]:bg-[url('/backgrounds/blue-gauze-landscape.png')] bg-cover bg-center", glow: 'bg-[#7096c3]/65' },
  mist: { name: '雾灰', color: 'bg-[linear-gradient(145deg,#d5d5d1,#929da4_48%,#bac6cb)]', glow: 'bg-[#a1b2bf]/60' },
  dawn: { name: '晨光', color: 'bg-[linear-gradient(145deg,#d7c9bc,#b1a6ad_48%,#a3b9ca)]', glow: 'bg-[#a3b3ca]/65' },
};
export type BackgroundId = keyof typeof backgrounds;

export const Background = memo(function Background({ selected }: { selected: BackgroundId }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${backgrounds[selected].color}`} aria-hidden="true">
      {selected !== 'sky' && <motion.div key={selected}
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_25%_30%,#ffffff40,transparent_65%),radial-gradient(ellipse_at_80%_70%,#7096c340,transparent_65%)]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
      />}
      {selected !== 'sky' && <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.045] mix-blend-soft-light" />}
    </div>
  );
});

export function BackgroundPicker({ selected, onSelect }: { selected: BackgroundId; onSelect: (id: BackgroundId) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4 p-7">
      {(Object.keys(backgrounds) as BackgroundId[]).map(id => (
        <Button key={id} aria-pressed={selected === id} onClick={() => onSelect(id)}
          className={`relative h-36 rounded-3xl p-5 text-left shadow-[inset_0_1px_1px_#ffffff80] ${backgrounds[id].color} ${selected === id ? 'outline-2 outline-offset-4 outline-white/80' : ''}`}>
          <span className="absolute inset-x-5 bottom-4 text-sm font-semibold text-white drop-shadow">{backgrounds[id].name}</span>
          {selected === id && <span className="absolute right-4 top-3 text-white" aria-hidden="true">✓</span>}
        </Button>
      ))}
    </div>
  );
}
