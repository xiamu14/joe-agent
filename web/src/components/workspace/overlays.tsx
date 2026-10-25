import { Dialog } from '@base-ui/react/dialog';
import { Button } from '@base-ui/react/button';
import { motion } from 'motion/react';
import { cardNames, type CardId } from '../../joe/workspace-state';
import { glass, pillButton, roundButton } from './material';
import { Icon } from './icon';
import { useEffect, useState } from 'react';
import type { Bootstrap, Message } from '../../joe/types';
import { CardPreview } from './card-preview';

export function CardOverview({ open, onClose, onSelect, bootstrap, messages }: { open: boolean; onClose: () => void; onSelect: (card: CardId) => void; bootstrap: Bootstrap | null; messages: Message[] }) {
  const [time, setTime] = useState('—:—');
  useEffect(() => {
    if (!open) return;
    setTime(new Date().toLocaleTimeString('zh-CN', { timeZone: bootstrap?.settings.timezone || 'Asia/Shanghai', hour: '2-digit', minute: '2-digit' }));
  }, [open, bootstrap?.settings.timezone]);
  return (
    <Dialog.Root open={open} onOpenChange={value => { if (!value) onClose(); }} modal={false} disablePointerDismissal>
      <Dialog.Portal>
        {open && <Button className="fixed inset-0 z-40 cursor-default bg-black/10 backdrop-blur-sm" aria-label="关闭卡片总览" onClick={onClose} />}
        <Dialog.Popup render={<motion.div initial={{ opacity: 0, y: 15, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} />}
          className={`fixed left-1/2 top-[calc(50%-45px)] z-50 max-h-[calc(100dvh-170px)] w-[min(760px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[40px] p-6 text-white ${glass}`}>
          <div className="mb-5 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">卡片</Dialog.Title>
            <Dialog.Close className={roundButton} aria-label="关闭总览"><Icon name="close" /></Dialog.Close>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {(Object.keys(cardNames) as CardId[]).map(card => (
              <Button key={card} onClick={() => onSelect(card)} className="group flex min-h-36 flex-col rounded-3xl bg-white/10 p-4 text-left shadow-[inset_0_1px_1px_#ffffff40] transition-colors hover:bg-white/20">
                <CardPreview card={card} bootstrap={bootstrap} messages={messages} time={time} />
                <span className="text-sm font-semibold">{cardNames[card]}</span>
              </Button>
            ))}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function VoicePermission({ open, ready, onEnable, onSkip }: { open: boolean; ready: boolean; onEnable: () => void; onSkip: () => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={value => { if (!value) onSkip(); }} modal={false} disablePointerDismissal>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/15 backdrop-blur-md" />
        <Dialog.Popup className={`fixed left-1/2 top-1/2 z-50 w-[min(390px,calc(100vw-40px))] -translate-x-1/2 -translate-y-1/2 rounded-[40px] p-8 text-center text-white ${glass}`}>
          <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-white/15"><Icon name="mic" className="size-7" /></div>
          <Dialog.Title className="text-xl font-semibold">和 Joe 说话</Dialog.Title>
          <Dialog.Description className="mt-3 text-sm leading-6 text-white/80">开启麦克风与语音播放，随时开口。</Dialog.Description>
          <div className="mt-7 flex flex-col gap-3">
            <Button disabled={!ready} className={`${pillButton} bg-white/25`} onClick={onEnable}>{ready ? '开启语音' : '等待连接'}</Button>
            <Button className={pillButton} onClick={onSkip}>暂不开启</Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
