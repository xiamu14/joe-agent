import { Switch } from '@base-ui/react/switch';
import { Select } from '@base-ui/react/select';
import type { useJoe } from '../../joe/use-joe';
export function SettingsPanel({ joe }: { joe: ReturnType<typeof useJoe> }) {
  const settings = joe.bootstrap?.settings;
  const voiceChoices = [
    { value: 'auto', label: '自动' },
    { value: 'en', label: 'English' },
    { value: 'zh', label: '中文' },
  ];
  const model = settings?.model || joe.bootstrap?.models[0]?.id || '';
  return (
    <section className="rounded-2xl border border-white/5 bg-[#0c101c]/80 p-5">
      <h2 className="mb-6 text-base">对话设置</h2>
      <div className="flex items-center justify-between">
        <div>
          <label htmlFor="voice-answer" className="text-sm">
            语音回答
          </label>
        </div>
        <Switch.Root
          id="voice-answer"
          checked={settings?.voice ?? true}
          disabled={!settings || joe.saving}
          onCheckedChange={(voice) => settings && void joe.saveSettings({ ...settings, voice })}
          className="h-6 w-10 rounded-full bg-white/10 p-0.5 data-checked:bg-blue-500/60"
        >
          <Switch.Thumb className="block size-5 rounded-full bg-slate-200 transition-transform data-checked:translate-x-4" />
        </Switch.Root>
      </div>
      <label id="voice-language-label" className="mt-6 mb-2 block text-xs text-slate-400">
        语音配置
      </label>
      <Select.Root
        value={settings?.voiceLanguage || 'auto'}
        items={voiceChoices}
        disabled={!settings || joe.saving}
        onValueChange={(value) => {
          if (settings && (value === 'auto' || value === 'en' || value === 'zh'))
            void joe.saveSettings({ ...settings, voiceLanguage: value });
        }}
      >
        <Select.Trigger
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#0a0f1c] px-3 py-2.5 text-xs text-slate-200 outline-none disabled:opacity-40"
          aria-labelledby="voice-language-label"
        >
          <Select.Value />
          <Select.Icon>⌄</Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner sideOffset={8} className="z-50">
            <Select.Popup className="rounded-xl border border-white/10 bg-[#101727] p-1 shadow-xl">
              {voiceChoices.map((choice) => (
                <Select.Item
                  key={choice.value}
                  value={choice.value}
                  className="cursor-pointer rounded-lg px-3 py-2 text-sm text-slate-200 data-highlighted:bg-white/10"
                >
                  <Select.ItemText>{choice.label}</Select.ItemText>
                  <Select.ItemIndicator className="ml-3">✓</Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
      <p className="mt-2 text-[10px] text-slate-400 hidden">
        English 音色{joe.bootstrap?.configured.voiceProfiles?.en ? '已配置' : '未配置'} · Chinese 音色
        {joe.bootstrap?.configured.voiceProfiles?.zh ? '已配置' : '未配置'}
      </p>
      <label id="model-label" className="mt-7 mb-2 block text-xs text-slate-400">
        思考模型
      </label>
      <Select.Root
        value={model}
        items={joe.bootstrap?.models.map((m) => ({ value: m.id, label: m.label })) || []}
        onValueChange={(value) => {
          if (value && settings) void joe.saveSettings({ ...settings, model: value });
        }}
        disabled={!joe.bootstrap?.models.length || joe.saving}
      >
        <Select.Trigger
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#0a0f1c] px-3 py-2.5 text-xs text-slate-200 outline-none disabled:opacity-40"
          aria-labelledby="model-label"
        >
          <Select.Value placeholder="等待配置模型列表" />
          <Select.Icon>⌄</Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner sideOffset={8} className="z-50">
            <Select.Popup className="max-h-64 min-w-56 overflow-auto rounded-xl border border-white/10 bg-[#101727] p-1 shadow-xl">
              {joe.bootstrap?.models.map((m) => (
                <Select.Item
                  className="cursor-pointer rounded-lg px-3 py-2 text-sm text-slate-200 data-highlighted:bg-white/10"
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
      <div className="my-6 border-t border-white/5" />
      <p className="font-mono text-[9px] tracking-[2px] text-slate-500">CONNECTIONS</p>
      <ul className="mt-3 space-y-2 text-[11px] text-slate-400">
        {[
          ['OpenRouter', joe.bootstrap?.configured.llm],
          [`${joe.bootstrap?.configured.voiceProviders?.asr || '语音'} 输入`, joe.bootstrap?.configured.asr],
          [`${joe.bootstrap?.configured.voiceProviders?.tts || '语音'} 输出`, joe.bootstrap?.configured.tts],
          ['Zendocs tool', joe.bootstrap?.configured.zendocs],
        ].map(([name, ready]) => (
          <li key={String(name)} className="flex justify-between">
            <span>{name}</span>
            <span className={ready ? 'text-teal-300' : 'text-slate-600'}>{ready ? '已配置' : '待配置'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
