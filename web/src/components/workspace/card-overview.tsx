import { useEffect, useRef, useState } from 'react';
import { Button } from '@base-ui/react/button';
import { motion, type MotionValue } from 'motion/react';
import type { agentVisual } from '../../joe/visual';
import { cardNames, type CardId } from '../../joe/workspace-state';
import type { Bootstrap, Message } from '../../joe/types';
import { CardPreview } from './card-preview';
import { Icon } from './icon';
import { glass, roundButton } from './material';

type Props = {
  open: boolean; onClose: () => void; onSelect: (card: CardId) => void;
  bootstrap: Bootstrap | null; messages: Message[];
  visual: ReturnType<typeof agentVisual>; level: MotionValue<number>;
};

export function CardOverview({ open, onClose, onSelect, bootstrap, messages, visual, level }: Props) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const [time, setTime] = useState('—:—');
  useEffect(() => {
    if (!open) return;
    const update = () => setTime(new Date().toLocaleTimeString('zh-CN', {
      timeZone: bootstrap?.settings.timezone || 'Asia/Shanghai', hour: '2-digit', minute: '2-digit',
    }));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [open, bootstrap?.settings.timezone]);
  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    return () => {
      // Restore focus only when hiding the overview left it on the document body.
      if (document.activeElement === document.body) document.querySelector<HTMLButtonElement>('[aria-label="卡片总览"]')?.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <motion.section aria-label="卡片总览" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}
      initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 240, damping: 30 }}
      className="mx-auto flex h-full w-[min(844px,calc(100vw-32px))] flex-col justify-center gap-3 py-3">
      <Button ref={closeButton} className={`${roundButton} self-end`} aria-label="关闭总览" onClick={onClose}><Icon name="close" /></Button>
      <motion.div className="grid min-h-0 grid-cols-3 gap-x-3 gap-y-7 overflow-y-auto p-6 [perspective:1400px] max-sm:gap-x-2 max-sm:gap-y-4">
        {(Object.keys(cardNames) as CardId[]).map((card, index) => (
          <Button key={card} onClick={() => onSelect(card)}
            render={<motion.button initial={false} animate={{ rotateY: index % 3 === 0 ? 12 : index % 3 === 2 ? -12 : 0, scale: 1, y: 0 }} whileHover={{ scale: 1.025, y: -3 }} whileTap={{ scale: 0.98 }} />}
            className={`flex aspect-[1.14] min-w-0 flex-col overflow-hidden rounded-[20px] text-left text-white outline-offset-4 focus-visible:outline-2 focus-visible:outline-white max-sm:aspect-[0.75] max-sm:rounded-xl ${glass}`}>
            <span className="shrink-0 px-4 pt-4 text-sm font-semibold max-sm:px-2 max-sm:pt-3 max-sm:text-xs">{cardNames[card]}</span>
            <CardPreview card={card} bootstrap={bootstrap} messages={messages} time={time} visual={visual} level={level} />
          </Button>
        ))}
      </motion.div>
    </motion.section>
  );
}
