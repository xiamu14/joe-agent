import React, { Profiler, useMemo, useState } from 'react';
import { Button } from '@base-ui/react/button';
import { createRoot } from 'react-dom/client';
import { motionValue } from 'motion/react';
import { CardFrame } from '../src/components/workspace/card-frame';
import { MessageList } from '../src/components/conversation/messages';
import { ThoughtOrb } from '../src/components/thought-orb';
import { visualState } from '../src/state.js';
import type { Message } from '../src/joe/types';
import '../src/style.css';

const level = motionValue(0);
let commits = 0;
function Fixture() {
  const [tick, setTick] = useState(0);
  const [primary, setPrimary] = useState(true);
  const visual = useMemo(() => visualState(), []);
  const [messages, setMessages] = useState(() => Array.from({ length: 80 }, (_, i) => ({
    id: String(i), role: 'assistant', text: `历史消息 ${i}：用于检查滚动和卡片位置。`,
    status: 'complete', attachments: [],
  } as Message)));
  async function check() {
    const output = document.getElementById('result')!;
    try {
      const mainCard = document.querySelector('[aria-label$="主卡片"]')!.getBoundingClientRect();
      const sideCard = document.querySelector('[aria-label$="次卡片"]')!.getBoundingClientRect();
      if (Math.abs(sideCard.height - mainCard.height * 0.9) > 1) throw new Error('次卡高度应为主卡的 90%');
      if (Math.abs(mainCard.width / sideCard.width - 1.618) > 0.02) throw new Error('主次卡宽度应接近黄金比例');
      if (!primary) throw new Error('请先将对话切换为主卡');
      const card = document.querySelector('[aria-label="费用次卡片"]')!;
      const log = document.querySelector('[role="log"]')!;
      const top = card.getBoundingClientRect().top;
      const before = commits;
      log.scrollTop -= 500;
      for (let i = 0; i < 120; i++) level.set(i / 120);
      await new Promise(requestAnimationFrame);
      if (commits !== before) throw new Error('滚动或音量触发了消息区提交');
      for (let i = 0; i < 30; i++) {
        setTick(t => t + 1);
        await new Promise(requestAnimationFrame);
        if (Math.abs(card.getBoundingClientRect().top - top) > 0.1) throw new Error('无关更新导致次卡跳动');
      }
      output.textContent = 'PASS：滚动、音量、30 次页面更新均未移动次卡';
    } catch (error) { output.textContent = String(error); }
  }
  return <div className="relative h-dvh overflow-hidden bg-slate-500 text-white">
    <div className="relative z-50 flex gap-3">
      <Button onClick={() => setTick(t => t + 1)}>无关更新</Button>
      <Button onClick={() => { for (let i = 0; i < 120; i++) level.set(i / 120); }}>音量更新</Button>
      <Button onClick={() => setMessages(old => old.map((m, i) => i === old.length - 1 ? { ...m, text: m.text + ' 新增文本' } : m))}>流式更新</Button>
      <Button onClick={() => setPrimary(p => !p)}>交换卡片</Button>
      <Button onClick={() => void check()}>运行检查</Button><output id="result" />
      <span>更新 {tick}</span>
      <output id="commits">0</output>
    </div>
    <main className="absolute inset-x-0 bottom-[112px] top-5">
      <CardFrame title="对话" primary={primary} visible blocked={false} onPromote={() => setPrimary(true)} onSwap={() => setPrimary(p => !p)}>
        <div className="h-[150px] w-[200px] shrink-0"><ThoughtOrb visual={visual} level={level} compact /></div>
        <Profiler id="history" onRender={() => { document.querySelector('#commits')!.textContent = String(++commits); }}>
          <MessageList messages={messages} />
        </Profiler>
      </CardFrame>
      <CardFrame title="费用" primary={!primary} visible blocked={false} onPromote={() => setPrimary(false)} onSwap={() => setPrimary(p => !p)}>
        <p>次卡位置应保持稳定</p>
      </CardFrame>
    </main>
  </div>;
}
const root = createRoot(document.getElementById('root')!);
root.render(<Fixture />);
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
