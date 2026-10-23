import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '@base-ui/react/button';
import { ThoughtOrb } from '../components/thought-orb';
import { MessageList } from '../components/conversation/messages';
import { Composer } from '../components/conversation/composer';
import { InfoPanel } from '../components/panels/info-panel';
import { SettingsPanel } from '../components/panels/settings-panel';
import { useJoe } from './use-joe';
import { agentVisual } from './visual';
import type { CSSProperties } from 'react';
export function JoePage() {
  const joe = useJoe(),
    [panel, setPanel] = useState<'info' | 'settings' | null>(null);
  const visual = agentVisual(joe.state, joe.expression, joe.level);
  return (
    <div
      className="flex h-dvh min-h-[560px] flex-col overflow-hidden bg-[#05070e]"
      style={{ '--accent': visual.color } as CSSProperties}
    >
      <header className="mx-[3%] flex h-20 shrink-0 items-center justify-between ">
        <Link
          to="/joe"
          className="flex items-center gap-3 text-[35px] font-semibold tracking-[-2px] text-[#f0f2ff] no-underline max-sm:text-[29px]"
        >
          <span className="text-[32px] font-light tracking-normal text-[#b2bdff] max-sm:text-[27px]">✳</span>
          Joe<span className="-ml-3 text-[#8198e5]">.</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/preview" className="text-xs text-slate-500">
            视觉实验室 ↗
          </Link>
          <Button
            className="text-xs text-sky-200"
            disabled={!joe.sessionId || joe.busy || joe.uploading}
            onClick={() => void joe.newSession()}
          >
            新会话 ＋
          </Button>
        </div>
      </header>
      <div className="flex justify-between px-5 pt-3 lg:hidden">
        <Button
          aria-expanded={panel === 'info'}
          onClick={() => setPanel(panel === 'info' ? null : 'info')}
          className="text-xs text-slate-400"
        >
          信息
        </Button>
        <Button
          aria-expanded={panel === 'settings'}
          onClick={() => setPanel(panel === 'settings' ? null : 'settings')}
          className="text-xs text-slate-400"
        >
          设置
        </Button>
      </div>
      <main className="mx-auto grid min-h-0 w-full max-w-[1800px] flex-1 grid-cols-[240px_minmax(0,1fr)_240px] gap-5 px-[3%] py-5 max-xl:grid-cols-[210px_minmax(0,1fr)_210px] max-lg:grid-cols-1 max-lg:px-3 max-lg:py-2">
        <aside
          className={`min-h-0 overflow-y-auto scrollbar-none ${panel === 'info' ? 'max-lg:fixed max-lg:inset-x-3 max-lg:top-28 max-lg:bottom-4 max-lg:z-40 max-lg:rounded-2xl max-lg:border max-lg:border-white/10 max-lg:bg-[#080c16] max-lg:p-4' : 'max-lg:hidden'}`}
          aria-label="信息面板"
        >
          {panel === 'info' && (
            <Button className="mb-3 text-sm lg:hidden" onClick={() => setPanel(null)}>
              关闭 ×
            </Button>
          )}
          <InfoPanel bootstrap={joe.bootstrap} />
        </aside>
        <section
          className="relative flex min-h-0 flex-col rounded-2xl "
          aria-label="Joe 会话"
        >
          <div className="relative h-[32vh] min-h-[190px] max-h-[340px] shrink-0">
            <ThoughtOrb visual={visual} compact />
          </div>
          {!joe.bootstrap?.configured.llm && (
            <div className="mx-4 rounded-xl border border-blue-300/10 bg-blue-300/5 p-3 text-xs leading-relaxed text-slate-400">
              {joe.state === 'offline' ? 'Joe 服务未连接。' : '等待模型配置。'}
              <Button className="ml-2 text-sky-300" disabled={joe.busy} onClick={() => void joe.reconnect()}>
                重新连接
              </Button>
            </div>
          )}
          <MessageList messages={joe.messages} />
          {joe.error && (
            <div
              role="alert"
              className="mx-4 mb-2 flex items-start justify-between gap-2 rounded-lg border border-amber-300/15 bg-amber-300/5 p-3 text-xs text-amber-200"
            >
              <span>{joe.error}</span>
              <Button aria-label="关闭提示" onClick={() => joe.setError('')}>
                ×
              </Button>
            </div>
          )}
          <Composer key={joe.sessionId} joe={joe} />
        </section>
        <aside
          className={`min-h-0 overflow-y-auto scrollbar-none ${panel === 'settings' ? 'max-lg:fixed max-lg:inset-x-3 max-lg:top-28 max-lg:bottom-4 max-lg:z-40 max-lg:rounded-2xl max-lg:border max-lg:border-white/10 max-lg:bg-[#080c16] max-lg:p-4' : 'max-lg:hidden'}`}
          aria-label="设置面板"
        >
          {panel === 'settings' && (
            <Button className="mb-3 text-sm lg:hidden" onClick={() => setPanel(null)}>
              关闭 ×
            </Button>
          )}
          <SettingsPanel joe={joe} />
        </aside>
      </main>
    </div>
  );
}
