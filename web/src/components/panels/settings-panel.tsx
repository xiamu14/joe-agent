import { motion } from 'motion/react';
import { memo } from 'react';
import { SettingsSelect, SettingsSwitch } from '../rare-ui/settings-controls';
import type { useJoe } from '../../joe/use-joe';
export const SettingsPanel = memo(function SettingsPanel({ bootstrap, saving, saveSettings }: Pick<ReturnType<typeof useJoe>, 'bootstrap' | 'saving' | 'saveSettings'>) {
  const settings = bootstrap?.settings;
  const configured = bootstrap?.configured;
  const inputProvider = configured?.voiceProviders?.asr || '语音';
  const outputProvider = configured?.voiceProviders?.tts || '语音';
  const voiceConnections: [string, boolean | undefined][] = inputProvider === outputProvider
    ? [[inputProvider, configured?.asr && configured?.tts]]
    : [[`${inputProvider} 输入`, configured?.asr], [`${outputProvider} 输出`, configured?.tts]];
  const voiceChoices = [
    { value: 'auto', label: '自动' },
    { value: 'en', label: '英文' },
    { value: 'zh', label: '中文' },
  ];
  const model = settings?.model || bootstrap?.models[0]?.id || '';
  return (
    <motion.section className="px-5 pb-5">

      <motion.div className="flex items-center justify-between">
        <motion.div>
          <motion.label htmlFor="voice-answer" className="text-sm">
            语音回答
          </motion.label>
        </motion.div>
        <SettingsSwitch
          id="voice-answer"
          checked={settings?.voice ?? true}
          disabled={!settings}
          busy={saving}
          onCheckedChange={(voice) => settings && void saveSettings({ ...settings, voice })}
        />
      </motion.div>
      <motion.div className="mt-4 flex items-center justify-between">
        <motion.label htmlFor="default-muted" className="text-sm">默认静音</motion.label>
        <SettingsSwitch id="default-muted" checked={settings?.defaultMuted ?? false}
          disabled={!settings}
          busy={saving}
          onCheckedChange={defaultMuted => settings && void saveSettings({ ...settings, defaultMuted })}
        />
      </motion.div>
      <motion.label id="voice-language-label" className="mt-4 mb-2 block text-xs text-white/60">
        语音语言
      </motion.label>
      <SettingsSelect
        value={settings?.voiceLanguage || 'auto'}
        items={voiceChoices}
        disabled={!settings}
        busy={saving}
        onValueChange={(value) => {
          if (settings && (value === 'auto' || value === 'en' || value === 'zh'))
            void saveSettings({ ...settings, voiceLanguage: value });
        }}
        labelledBy="voice-language-label"
      />
      <motion.p className="mt-2 text-[10px] text-white/60 hidden">
        English 音色{bootstrap?.configured.voiceProfiles?.en ? '已配置' : '未配置'} · Chinese 音色
        {bootstrap?.configured.voiceProfiles?.zh ? '已配置' : '未配置'}
      </motion.p>
      <motion.label id="model-label" className="mt-4 mb-2 block text-xs text-white/60">
        思考模型
      </motion.label>
      <SettingsSelect
        value={model}
        items={bootstrap?.models.map((m) => ({ value: m.id, label: m.label })) || []}
        onValueChange={(value) => {
          if (value && settings) void saveSettings({ ...settings, model: value });
        }}
        disabled={!bootstrap?.models.length}
        busy={saving}
        labelledBy="model-label"
        placeholder="等待配置"
      />
      <motion.div className="my-4 h-px bg-white/10" />
      <motion.p className="text-xs text-white/60">连接状态</motion.p>
      <motion.ul className="mt-3 space-y-2 text-[11px] text-white/60">
        {[
          ['OpenRouter', bootstrap?.configured.llm],
          ...voiceConnections,
          ['知识库', bootstrap?.configured.zendocs],
        ].map(([name, ready]) => (
          <motion.li key={String(name)} className="flex justify-between">
            <motion.span>{name}</motion.span>
            <motion.span className={ready ? 'text-white' : 'text-white/50'}>{ready ? '已配置' : '待配置'}</motion.span>
          </motion.li>
        ))}
      </motion.ul>
    </motion.section>
  );
});
