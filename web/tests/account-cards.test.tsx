import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { AccountCards, type AccountCardProps } from '../src/joe/account-cards';
import { CanvasSceneContext, useCanvasSceneState } from '../src/joe/canvas-scene';
import { createCanvasLayout } from '../src/joe/canvas-layout';
import { SettingsPanel } from '../src/components/panels/settings-panel';
import { money } from '../src/components/panels/voice-account-panel';

const props: AccountCardProps = { bootstrap: null, saving: false, saveSettings: async () => {} };
function Fixture() {
  const scene = useCanvasSceneState(createCanvasLayout(42), { x: 0, y: 0 }, () => {});
  return <CanvasSceneContext value={scene}><AccountCards cards={['costs', 'settings']} {...props} /></CanvasSceneContext>;
}

test('account cards share canvas controls and never display missing data as zero or enabled', () => {
  const html = renderToStaticMarkup(<Fixture />);
  assert.match(html, /aria-label="费用卡片"/);
  assert.match(html, /aria-label="设置卡片"/);
  assert.match(html, /aria-label="展开费用卡片"/);
  assert.match(html, /aria-label="展开设置卡片"/);
  assert.match(html, /加载中/);
  assert.doesNotMatch(html, /已开启|\$0\.0000|时间卡片/);
  assert.equal(money({ known: 0, pending: 1 }), '待确认');
  assert.equal(money({ known: 0.00001, pending: 0 }), '< $0.0001');
  assert.equal(money({ known: 0.12, pending: 1 }), '$0.1200 + 待确认');
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
