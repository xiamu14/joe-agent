import { memo } from 'react';
import { contentSurface, glass, switchTrack, switchThumb } from '../workspace/material';
import { Switch } from '@base-ui/react/switch';
import { Select } from '@base-ui/react/select';
import type { useJoe } from '../../joe/use-joe';
export const SettingsPanel = memo(function SettingsPanel({ bootstrap, saving, saveSettings }: Pick<ReturnType<typeof useJoe>, 'bootstrap' | 'saving' | 'saveSettings'>) {
  const settings = bootstrap?.settings;
  const voiceChoices = [
    { value: 'auto', label: '自动' },
    { value: 'en', label: 'English' },
    { value: 'zh', label: '中文' },
  ];
  const model = settings?.model || bootstrap?.models[0]?.id || '';
  return (
    <section className="p-7">

      <div className="flex items-center justify-between">
        <div>
          <label htmlFor="voice-answer" className="text-sm">
            语音回答
          </label>
        </div>
        <Switch.Root
          id="voice-answer"
          checked={settings?.voice ?? true}
          disabled={!settings || saving}
          onCheckedChange={(voice) => settings && void saveSettings({ ...settings, voice })}
          className={switchTrack}
        >
          <Switch.Thumb className={switchThumb} />
        </Switch.Root>
      </div>
      <div className="mt-6 flex items-center justify-between">
        <label htmlFor="default-muted" className="text-sm">默认静音</label>
        <Switch.Root id="default-muted" checked={settings?.defaultMuted ?? false}
          disabled={!settings || saving}
          onCheckedChange={defaultMuted => settings && void saveSettings({ ...settings, defaultMuted })}
          className={switchTrack}>
          <Switch.Thumb className={switchThumb} />
        </Switch.Root>
      </div>
      <label id="voice-language-label" className="mt-6 mb-2 block text-xs text-white/90">
        语音配置
      </label>
      <Select.Root
        value={settings?.voiceLanguage || 'auto'}
        items={voiceChoices}
        disabled={!settings || saving}
        onValueChange={(value) => {
          if (settings && (value === 'auto' || value === 'en' || value === 'zh'))
            void saveSettings({ ...settings, voiceLanguage: value });
        }}
      >
        <Select.Trigger
          className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-xs text-white outline-none disabled:opacity-40 ${contentSurface}`}
          aria-labelledby="voice-language-label"
        >
          <Select.Value />
          <Select.Icon>⌄</Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner sideOffset={8} className="z-90">
            <Select.Popup className={`rounded-2xl p-1 ${glass}`}>
              {voiceChoices.map((choice) => (
                <Select.Item
                  key={choice.value}
                  value={choice.value}
                  className="cursor-pointer rounded-lg px-3 py-2 text-sm text-white data-highlighted:bg-white/10"
                >
                  <Select.ItemText>{choice.label}</Select.ItemText>
                  <Select.ItemIndicator className="ml-3">✓</Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
      <p className="mt-2 text-[10px] text-white/90 hidden">
        English 音色{bootstrap?.configured.voiceProfiles?.en ? '已配置' : '未配置'} · Chinese 音色
        {bootstrap?.configured.voiceProfiles?.zh ? '已配置' : '未配置'}
      </p>
      <label id="model-label" className="mt-7 mb-2 block text-xs text-white/90">
        思考模型
      </label>
      <Select.Root
        value={model}
        items={bootstrap?.models.map((m) => ({ value: m.id, label: m.label })) || []}
        onValueChange={(value) => {
          if (value && settings) void saveSettings({ ...settings, model: value });
        }}
        disabled={!bootstrap?.models.length || saving}
      >
        <Select.Trigger
          className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-xs text-white outline-none disabled:opacity-40 ${contentSurface}`}
          aria-labelledby="model-label"
        >
          <Select.Value placeholder="等待配置模型列表" />
          <Select.Icon>⌄</Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner sideOffset={8} className="z-90">
            <Select.Popup className={`max-h-64 min-w-56 overflow-auto rounded-2xl p-1 ${glass}`}>
              {bootstrap?.models.map((m) => (
                <Select.Item
                  className="cursor-pointer rounded-lg px-3 py-2 text-sm text-white data-highlighted:bg-white/10"
                  key={m.id}
                  value={m.id}
                >
                  <Select.ItemText>{m.label}</Select.ItemText>
                  <Select.ItemIndicator className="ml-3">✓</Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
      <div className="my-6 h-px bg-white/15" />
      <p className="text-xs text-white/90">连接状态</p>
      <ul className="mt-3 space-y-2 text-[11px] text-white/90">
        {[
          ['OpenRouter', bootstrap?.configured.llm],
          [`${bootstrap?.configured.voiceProviders?.asr || '语音'} 输入`, bootstrap?.configured.asr],
          [`${bootstrap?.configured.voiceProviders?.tts || '语音'} 输出`, bootstrap?.configured.tts],
          ['知识库', bootstrap?.configured.zendocs],
        ].map(([name, ready]) => (
          <li key={String(name)} className="flex justify-between">
            <span>{name}</span>
            <span className={ready ? 'text-white' : 'text-white/50'}>{ready ? '已配置' : '待配置'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
});
