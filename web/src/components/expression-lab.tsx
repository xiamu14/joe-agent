import { ToggleGroup } from '@base-ui/react/toggle-group';
import { Toggle } from '@base-ui/react/toggle';
import { Fieldset } from '@base-ui/react/fieldset';
import { states, emotions, visualState } from '../state.js';
import type { CSSProperties } from 'react';

export type MindState = keyof typeof states;
export type Emotion = keyof typeof emotions;

type Props = {
  visual: ReturnType<typeof visualState>;
  onState: (state: MindState) => void;
  onEmotion: (emotion: Emotion) => void;
};

export function ExpressionLab({ visual, onState, onEmotion }: Props) {
  return (
    <aside
      className="z-10 w-[217px] justify-self-end rounded-2xl border border-white/5 px-[19px] py-[21px] shadow-[0_20px_60px_#0002] max-lg:w-[205px] max-sm:mt-[3px] max-sm:grid max-sm:w-full max-sm:max-w-[390px] max-sm:grid-cols-[1.1fr_1fr] max-sm:gap-x-[18px] max-sm:rounded-xl max-sm:px-[18px] max-sm:py-4 bg-[linear-gradient(130deg,#151a2980,#0a0d1670)]"
      aria-label="视觉调试面板"
    >
      <Fieldset.Root className="mb-[22px] min-w-0 border-0 p-0 max-sm:mb-0">
        <Fieldset.Legend className="mb-[11px] w-full text-[10px] tracking-[1px] text-[#a1abc1]">
          思维状态
        </Fieldset.Legend>
        <ToggleGroup
          className="grid grid-cols-2 gap-1.5"
          aria-label="思维状态"
          value={[visual.state]}
          onValueChange={(values) => {
            if (values[0]) onState(values[0] as MindState);
          }}
        >
          {Object.entries(states)
            .filter(([key]) =>
              ['idle', 'listening', 'thinking', 'speaking', 'blocked', 'error'].includes(key),
            )
            .map(([key, state]) => (
              <Toggle
                key={key}
                value={key}
                data-state={key}
                className="flex items-center justify-center gap-2 rounded-md border border-white/5 bg-[#12172580] px-1 py-2 text-[10px] tracking-[1px] text-[#7e8aa4] hover:border-[#8fafff50] aria-pressed:border-[#8fafff50] aria-pressed:bg-[#789bff15] aria-pressed:text-[#bed0fc] max-sm:gap-[5px] max-sm:px-0.5 max-sm:py-[7px] max-sm:text-[9px]"
              >
                <span className="text-[15px] leading-3" aria-hidden="true">
                  {state.icon}
                </span>
                {state.label}
              </Toggle>
            ))}
        </ToggleGroup>
      </Fieldset.Root>
      <Fieldset.Root className="mb-[22px] min-w-0 border-0 p-0 max-sm:mb-0">
        <Fieldset.Legend className="mb-[11px] w-full text-[10px] tracking-[1px] text-[#a1abc1]">
          回答情绪
        </Fieldset.Legend>
        <ToggleGroup
          className="flex justify-between gap-[7px] max-sm:gap-[3px]"
          aria-label="回答情绪"
          value={[visual.emotion]}
          onValueChange={(values) => {
            if (values[0]) onEmotion(values[0] as Emotion);
          }}
        >
          {Object.entries(emotions)
            .filter(([key]) => ['calm', 'joy', 'curious', 'empathy', 'serious'].includes(key))
            .map(([key, emotion]) => (
              <Toggle
                key={key}
                value={key}
                data-emotion={key}
                style={{ '--swatch': emotion.color } as CSSProperties}
                className="group flex flex-col items-center gap-[9px] border-0 bg-transparent px-0 py-[3px] text-[9px] text-[#7b859c] aria-pressed:text-[#cbd2e3] max-sm:min-w-0 max-sm:flex-1 max-sm:text-[8px]"
              >
                <span
                  className="block size-[17px] rounded-full border-4 border-[#0b0e17] opacity-65 outline outline-transparent bg-(--swatch) group-aria-pressed:opacity-100 group-aria-pressed:outline-(--swatch)"
                  aria-hidden="true"
                />
                {emotion.label}
              </Toggle>
            ))}
        </ToggleGroup>
      </Fieldset.Root>
    </aside>
  );
}
