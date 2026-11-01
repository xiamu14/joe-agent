import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import { WorkspaceInput } from '../src/joe/workspace-input';
import { emptyDraft } from '../src/joe/composer/draft';
import { CanvasSceneContext, useCanvasSceneState } from '../src/joe/canvas-scene';
import { createCanvasLayout } from '../src/joe/canvas-layout';
import { FinanceCard } from '../src/joe/finance/finance-card';
import type { Attachment } from '../src/joe/types';
import '../src/style.css';

function Fixture() {
  const [draft, setDraft] = useState(emptyDraft);
  const [files, setFiles] = useState<Attachment[]>([]);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const scene = useCanvasSceneState({ ...createCanvasLayout(42), finance: { x: 0, y: 0, rotation: -3 } }, { x: 0, y: 0 }, () => {});
  const data = { accounts: ['招商银行', '中国银行', '建设银行', '工商银行'].map((bank, i) => ({
    id: `account-${i}`, bank, last4: '1234', currency: 'CNY', records: [{
      id: `balance-${i}`, balanceMinor: 123456 + i * 10000, rawBalance: '1,234.56', observedAt: '2026-11-01T12:00:00Z', receivedAt: '2026-11-01T12:00:00Z', attachmentId: 'fixture',
    }],
  })) };
  return <MotionConfig reducedMotion="always"><main className="flex h-dvh flex-col bg-[#111114] p-8 text-white">
    <div ref={scene.canvas} className="relative min-h-0 flex-1 [container-type:size]">
      <CanvasSceneContext value={scene}>{sent && <FinanceCard data={data} />}</CanvasSceneContext>
    </div>
    <output id="result">{error || (sent ? 'PASS: tally received one shortcut and its attachment' : '')}</output>
    <WorkspaceInput draft={draft} onDraftChange={setDraft} onSend={async (text, _spoken, _validate, command) => {
      if (command !== 'tally' || !text.includes('/tally') || files.length !== 1) throw new Error('FAIL: command or attachment missing');
      setSent(true); setFiles([]); return true;
    }} ready busy={false} sessionId="fixture" voiceReady={false} onError={setError}
      onSettings={async () => true} layoutMode="free" onToggleLayout={() => {}}
      attachments={files} uploading={false} onUpload={async file => setFiles([{ id: 'fixture', name: file.name }])}
      onRemoveAttachment={async () => setFiles([])} />
  </main></MotionConfig>;
}
const root = createRoot(document.getElementById('root')!);
root.render(<Fixture />);
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
