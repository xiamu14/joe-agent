import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { AccountCards, type AccountCardProps } from '../src/joe/account-cards';
import { CanvasSceneContext, useCanvasSceneState } from '../src/joe/canvas-scene';
import { createCanvasLayout } from '../src/joe/canvas-layout';
import { SettingsPanel } from '../src/components/panels/settings-panel';
import { money } from '../src/components/panels/cost-panel';

const props: AccountCardProps = { bootstrap: null, saving: false, saveSettings: async () => {} };
function Fixture({ bootstrap = null, saving = false }: Partial<AccountCardProps> = {}) {
  const scene = useCanvasSceneState(createCanvasLayout(42), { x: 0, y: 0 }, () => {});
  return <CanvasSceneContext value={scene}><AccountCards cards={['costs', 'settings']} {...props} bootstrap={bootstrap} saving={saving} /></CanvasSceneContext>;
}

test('account cards share canvas controls and never display missing data as zero or enabled', () => {
  const html = renderToStaticMarkup(<Fixture />);
  assert.match(html, /aria-label="费用卡片"/);
  assert.match(html, /aria-label="设置卡片"/);
  assert.match(html, /aria-label="展开费用卡片"/);
  assert.match(html, /aria-label="展开设置卡片"/);
  assert.equal((html.match(/role="switch"/g) || []).length, 2);
  assert.equal((html.match(/aria-disabled="true"/g) || []).length, 2);
  assert.doesNotMatch(html, /已开启|已关闭|\$0\.0000|时间卡片/);
  assert.equal(money(undefined), '—');
  assert.equal(money(null), '查询失败');
  assert.equal(money(0.00001), '$0.0000');
  assert.equal(money(0.12), '$0.1200');
});

test('settings remain labelled and unavailable before bootstrap finishes', () => {
  const html = renderToStaticMarkup(<SettingsPanel {...props} />);
  assert.match(html, /语音回答/);
  assert.match(html, /默认静音/);
  assert.match(html, /语音语言/);
  assert.match(html, /思考模型/);
  assert.equal((html.match(/role="switch"/g) || []).length, 2);
  assert.match(html, /disabled/);
});

test('saving settings blocks repeated input without dimming controls; missing settings stay dimmed', () => {
  const bootstrap: NonNullable<AccountCardProps['bootstrap']> = {
    settings: { voice: true, defaultMuted: false, voiceLanguage: 'auto', model: 'model', city: '', timezone: 'Asia/Shanghai' },
    models: [{ id: 'model', label: '模型' }],
    configured: { llm: true, tts: true, asr: true, zendocs: false },
    usage: { input: 0, output: 0, tokensPending: 0, model: { known: 0, pending: 0 }, modelLifetime: { known: 0, pending: 0 }, voice: { known: 0, pending: 0 }, total: { known: 0, pending: 0 }, uptimeMs: 0, currency: 'USD', estimated: false },
  };
  const connectionStatus = (asr: string, tts: string, ttsReady = true) => renderToStaticMarkup(
    <SettingsPanel {...props} bootstrap={{ ...bootstrap, configured: {
      ...bootstrap.configured, tts: ttsReady, voiceProviders: { asr, tts },
    } }} />,
  );
  const unified = connectionStatus('ElevenLabs', 'ElevenLabs');
  assert.equal((unified.match(/ElevenLabs/g) || []).length, 1);
  assert.doesNotMatch(unified, /ElevenLabs 输入|ElevenLabs 输出/);
  assert.match(connectionStatus('ElevenLabs', 'ElevenLabs', false), /ElevenLabs<\/span><span[^>]*>待配置/);
  const mixed = connectionStatus('Fish', 'ElevenLabs');
  assert.match(mixed, /Fish 输入/);
  assert.match(mixed, /ElevenLabs 输出/);
  const folded = renderToStaticMarkup(<Fixture bootstrap={bootstrap} />);
  assert.doesNotMatch(folded, /已开启|已关闭/);
  const switches = folded.match(/<span\b[^>]*role="switch"[^>]*>/g) || [];
  assert.equal(switches.length, 2);
  assert.match(switches[0], /aria-label="语音回答"/);
  assert.match(switches[0], /aria-checked="true"/);
  assert.match(switches[1], /aria-label="默认静音"/);
  assert.match(switches[1], /aria-checked="false"/);
  assert.doesNotMatch(switches.join(''), /aria-disabled="true"/);
  const controls = (saving: boolean, loaded = true) =>
    (renderToStaticMarkup(<SettingsPanel {...props} bootstrap={loaded ? bootstrap : null} saving={saving} />)
      .match(/<(?:button|span)\b[^>]*>/g) || []).filter(tag => /role="(?:switch|combobox)"/.test(tag));
  const idle = controls(false);
  const pending = controls(true);
  assert.equal(pending.length, 4);
  pending.forEach((tag, index) => {
    assert.match(tag, /(?: disabled=""|aria-disabled="true")/);
    assert.match(tag, /aria-busy="true"/);
    assert.doesNotMatch(tag, /opacity-/);
    assert.equal(tag.match(/class="([^"]*)"/)?.[1], idle[index].match(/class="([^"]*)"/)?.[1]);
  });
  controls(false, false).forEach(tag => {
    assert.match(tag, /(?: disabled=""|aria-disabled="true")/);
    assert.match(tag, /opacity-/);
  });
});

test('cost details use only provider USD bills in both compact and expanded panels', async () => {
  const { CostPanel } = await import('../src/components/panels/cost-panel');
  const usage = {
    input: 0, output: 0, tokensPending: 0, uptimeMs: 0, currency: 'USD', estimated: true,
    model: { known: 9999, pending: 33 }, modelLifetime: { known: 9999, pending: 33 },
    voice: { known: 9999, pending: 15 }, total: { known: 19998, pending: 48 },
    billing: {
      model: { today: 0.00194494, lifetime: 0.020116545 },
      voice: { today: 0.002912, lifetime: 0.102648 },
      total: { today: 0.00485694, lifetime: 0.122764545 },
      currency: 'USD' as const, timezone: 'UTC' as const, updatedAt: 0,
    },
  };
  for (const compact of [true, false]) {
    const html = renderToStaticMarkup(<CostPanel usage={usage} compact={compact} />);
    for (const text of ['今日合计', '总计', '$0.0049', '$0.1228', 'UTC'])
      assert.ok(html.includes(text), text);
    assert.doesNotMatch(html, /9999|19,998|待确认|含估算|账户余额|credits|\$\d+\.\d{5}/);
    if (compact) {
      assert.doesNotMatch(html, /费用明细|思考模型|语音生成|role="table"/);
    } else {
      for (const text of ['费用明细', '思考模型', '语音生成', '累计', '$0.0201', '$0.1026'])
        assert.ok(html.includes(text), text);
    }
  }
  const failed = renderToStaticMarkup(<CostPanel usage={{ ...usage, billing: {
    ...usage.billing, voice: { today: null, lifetime: null, error: '语音账单查询失败' },
    total: { today: null, lifetime: null },
  } }} />);
  assert.match(failed, /语音账单查询失败/);
  assert.doesNotMatch(failed, /\$0\.0000|9999|待确认/);
});
