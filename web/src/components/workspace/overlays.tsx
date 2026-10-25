import { Dialog } from '@base-ui/react/dialog';
import { Button } from '@base-ui/react/button';
import { glass, pillButton } from './material';
import { Icon } from './icon';

export function VoicePermission({ open, ready, onEnable, onSkip }: { open: boolean; ready: boolean; onEnable: () => void; onSkip: () => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={value => { if (!value) onSkip(); }} modal={false} disablePointerDismissal>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/15 backdrop-blur-md" />
        <Dialog.Popup className={`fixed left-1/2 top-1/2 z-50 w-[min(390px,calc(100vw-40px))] -translate-x-1/2 -translate-y-1/2 rounded-[24px] p-8 text-center text-white ${glass}`}>
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
