import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Button } from '@base-ui/react/button';
import { MotionConfig } from 'motion/react';
import { ThoughtOrb } from '../components/thought-orb';
import { MessageList } from '../components/conversation/messages';
import { Composer } from '../components/conversation/composer';
import { SettingsPanel } from '../components/panels/settings-panel';
import { CostPanel } from '../components/panels/cost-panel';
import { Background } from '../components/workspace/background';
import { CardFrame } from '../components/workspace/card-frame';
import { VoicePermission } from '../components/workspace/overlays';
import { CardOverview } from '../components/workspace/card-overview';
import { Dock } from '../components/workspace/dock';
import { Icon } from '../components/workspace/icon';
import { roundButton } from '../components/workspace/material';
import { initialWorkspace, openCard, closeCard, swapCards, cardNames, type CardId } from './workspace-state';
import { useJoe } from './use-joe';
import { useVoiceInput } from './use-voice-input';
import { agentVisual } from './visual';
const panelBody = 'mr-1 h-full overflow-y-auto overscroll-contain';

export function JoePage() {
  const joe = useJoe({ isolatedStream: true });
  const voice = useVoiceInput(joe);
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [overview, setOverview] = useState(false);
  useEffect(() => {
    const card = joe.cardRequest?.card;
    if (card === 'costs' || card === 'settings') setWorkspace(current => openCard(current, card));
  }, [joe.cardRequest]);
  function open(card: CardId) { setOverview(false); setWorkspace(current => openCard(current, card)); }
  const conversationPrimary = workspace.primary === 'conversation';
  const idle = joe.state === 'idle' || joe.state === 'interrupted';
  const state = idle ? voice.state === 'error' ? 'error' : voice.transcribing ? 'transcribing' : voice.recording ? voice.mode ? 'listening' : 'blocked' : 'idle' : joe.state;
  const visual = useMemo(() => agentVisual(state, joe.expression, 0), [state, joe.expression]);
  const blocked = overview || voice.asking;
  const swap = () => setWorkspace(swapCards);


  return (
    <MotionConfig reducedMotion="user">
      <div className="relative h-dvh overflow-hidden font-semibold text-white [color-scheme:light]" style={{ '--accent': visual.color } as CSSProperties}>
        <Background />
        <main className="absolute inset-x-0 bottom-[max(152px,calc(138px+env(safe-area-inset-bottom)))] top-5" aria-label="交互空间">
          <CardFrame title="对话" primary={conversationPrimary} visible={!overview && workspace.conversation} blocked={blocked} onPromote={() => open('conversation')} onSwap={swap}
            actions={<Button className={roundButton} aria-label="新对话" disabled={!joe.sessionId || joe.uploading} onClick={() => void joe.newSession()}><Icon name="plus" /></Button>}>
            <div className="relative mx-auto -mt-4 h-[125px] w-[170px] shrink-0 scale-75 max-sm:h-[115px] [@media(max-height:500px)]:hidden" aria-label={voice.status}>
              <ThoughtOrb level={joe.level} visual={visual} compact active={conversationPrimary && !blocked} />
            </div>
            {!joe.bootstrap?.configured.llm && <div className="mx-6 mb-3 flex items-center justify-between gap-3 rounded-2xl bg-black/10 p-3 text-xs text-white/80" role="status">
              <span>{joe.state === 'offline' ? '服务未连接' : '等待模型配置'}</span>
              <Button className="rounded-lg px-2 py-1 text-white" onClick={() => void joe.reconnect()}>重新连接</Button>
            </div>}
            <MessageList key={`messages-${joe.sessionId}`} messages={joe.messages} textStream={joe.textStream} />
            {joe.error && <div role="alert" className="mx-5 mb-3 flex items-start gap-3 rounded-2xl bg-black/15 p-3 text-xs leading-5">
              <span className="flex-1">{joe.error}</span><Button aria-label="关闭提示" onClick={() => joe.setError('')}><Icon name="close" className="size-4" /></Button>
            </div>}
            <Composer key={`composer-${joe.sessionId}`} joe={joe} voice={voice} />
          </CardFrame>
          <CardFrame title={cardNames[workspace.ordinary || 'costs']} primary={!conversationPrimary} visible={!overview && Boolean(workspace.ordinary)} blocked={blocked}
            onPromote={() => workspace.ordinary && open(workspace.ordinary)} onSwap={swap}
            onClose={() => workspace.ordinary && setWorkspace(current => closeCard(current, workspace.ordinary!))}>
            <div className="min-h-0 flex-1">
              <div hidden={workspace.ordinary !== 'costs'} className={panelBody}><CostPanel usage={joe.bootstrap?.usage} /></div>
              <div hidden={workspace.ordinary !== 'settings'} className={panelBody}><SettingsPanel bootstrap={joe.bootstrap} saving={joe.saving} saveSettings={joe.saveSettings} /></div>
            </div>
          </CardFrame>
          <CardOverview open={overview} onClose={() => setOverview(false)} onSelect={open} bootstrap={joe.bootstrap} messages={joe.messages} visual={visual} level={joe.level} />
        </main>
        <Dock level={joe.level} timezone={joe.bootstrap?.settings.timezone || 'Asia/Shanghai'} visual={visual} active={!conversationPrimary && !voice.asking} status={voice.status}
          overview={overview} onOverview={() => setOverview(current => !current)} onConversation={() => open('conversation')} />
        <VoicePermission open={voice.asking} ready={voice.ready} onEnable={voice.enable} onSkip={voice.skip} />
      </div>
    </MotionConfig>
  );
}
