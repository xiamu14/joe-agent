import { Select } from '@base-ui/react/select';
import { Switch } from '@base-ui/react/switch';
import { Check, ChevronDown } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { ComponentProps } from 'react';
import { contentSurface, glass } from '../workspace/material';

const MotionThumb = motion.create(Switch.Thumb);
const MotionPopup = motion.create(Select.Popup);

export function SettingsSwitch({ checked, disabled, busy = false, ...props }: Omit<ComponentProps<typeof Switch.Root>, 'className'> & { busy?: boolean }) {
  const reduced = useReducedMotion();
  return <Switch.Root {...props} checked={checked} disabled={disabled || busy} aria-busy={busy}
    className={`flex h-5 w-8 shrink-0 items-center rounded-full bg-white/15 p-0.5 outline-none focus-visible:outline-2 focus-visible:outline-white/60 data-checked:bg-[#FC4C01] ${disabled ? 'opacity-35' : ''}`}>
    <MotionThumb className="block size-4 rounded-full bg-white shadow-sm" initial={false}
      animate={{ x: checked ? 12 : 0 }} transition={{ duration: reduced ? 0 : 0.18, ease: 'easeOut' }} />
  </Switch.Root>;
}

export function SettingsSelect({ value, items, disabled, busy = false, onValueChange, labelledBy, placeholder }: {
  value: string;
  items: { value: string; label: string }[];
  disabled: boolean;
  busy?: boolean;
  onValueChange(value: string | null): void;
  labelledBy: string;
  placeholder?: string;
}) {
  const reduced = useReducedMotion();
  return <Select.Root value={value} items={items} disabled={disabled || busy} onValueChange={onValueChange}>
    <Select.Trigger aria-labelledby={labelledBy} aria-busy={busy}
      className={`flex w-full min-w-0 items-center justify-between gap-2 px-3 py-2 text-xs text-white outline-none focus-visible:outline-2 focus-visible:outline-white/60 ${disabled ? 'opacity-40' : ''} ${contentSurface}`}>
      <Select.Value placeholder={placeholder} className="truncate" />
      <Select.Icon className="shrink-0"><ChevronDown size={14} aria-hidden /></Select.Icon>
    </Select.Trigger>
    <Select.Portal>
      <Select.Positioner sideOffset={6} alignItemWithTrigger={false} className="z-[120]">
        <MotionPopup initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: reduced ? 0 : 0.15 }}
          className={`max-h-[min(16rem,var(--available-height))] min-w-[var(--anchor-width)] max-w-[var(--available-width)] overflow-y-auto rounded-xl p-1 ${glass}`}>
          {items.map(item => <Select.Item key={item.value} value={item.value}
            className="relative flex cursor-pointer items-center rounded-lg py-2 pr-9 pl-3 text-xs text-white outline-none data-highlighted:bg-white/10 data-selected:bg-white/10">
            <Select.ItemText className="truncate whitespace-nowrap">{item.label}</Select.ItemText>
            <Select.ItemIndicator className="absolute right-3 flex size-4 items-center justify-center">
              <Check size={14} strokeWidth={2} aria-hidden />
            </Select.ItemIndicator>
          </Select.Item>)}
        </MotionPopup>
      </Select.Positioner>
    </Select.Portal>
  </Select.Root>;
}
