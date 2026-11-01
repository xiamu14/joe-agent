import { test, expect } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { WorkspaceChat } from '../src/joe/workspace-chat';
import { WorkspaceInput } from '../src/joe/workspace-input';

test('chat displays API failures once through inline status, including failed replies', () => {
  for (const state of ['idle', 'error'] as const) {
    const joe = { messages: [], state, error: '当前地区无法使用此模型', busy: false, bootstrap: {} } as unknown as Parameters<typeof WorkspaceChat>[0]['joe'];
    const html = renderToStaticMarkup(<WorkspaceChat joe={joe} onSpeakingChange={() => {}} />);
    expect(html).toContain('role="status"');
    expect(html.split('当前地区无法使用此模型')).toHaveLength(2);
    expect(html).not.toContain('再试一次，或检查服务连接');
  }
});

test('composer no longer renders an error status area', () => {
  const html = renderToStaticMarkup(<WorkspaceInput draft={{ type: 'doc', content: [{ type: 'paragraph' }] }} onDraftChange={() => {}} onSend={async () => true} ready busy={false} sessionId="session" voiceReady onError={() => {}} onSettings={async () => true} layoutMode="free" onToggleLayout={() => {}} attachments={[]} uploading={false} onUpload={async () => {}} onRemoveAttachment={async () => {}} />);
  expect(html).not.toContain('role="status"');
});

test('attachment upload states keep the toolbar space reserved and status out of flow', () => {
  for (const state of ['empty', 'uploading', 'attached'] as const) {
    const html = renderToStaticMarkup(<WorkspaceInput draft={{ type: 'doc', content: [{ type: 'paragraph' }] }} onDraftChange={() => {}} onSend={async () => true} ready busy={false} sessionId="session" voiceReady onError={() => {}} onSettings={async () => true} layoutMode="free" onToggleLayout={() => {}} attachments={state === 'attached' ? [{ id: 'image', name: 'bank.png', mime: 'image/png' }] : []} uploading={state === 'uploading'} onUpload={async () => {}} onRemoveAttachment={async () => {}} />);
    expect(html).toContain('flex h-[50px] w-full shrink-0 items-center justify-between');
    if (state === 'uploading') {
      expect(html).toContain('role="status" class="sr-only"');
      expect(html).toContain('aria-label="上传中" aria-busy="true"');
    } else expect(html).not.toContain('role="status"');
  }
});

test('reloaded failed tally uses the requested copy without a retry button', () => {
  const joe = { messages: [
    { id: 'user', turnId: 'turn', role: 'user', text: '/tally 信用卡1', command: 'tally', attachments: [{ id: 'image', name: 'bank.png', mime: 'image/png' }] },
    { id: 'answer', turnId: 'turn', role: 'assistant', text: '', status: 'error', error: '记账失败，可用原图重试。' },
  ], state: 'idle', error: '', busy: false, bootstrap: {} } as unknown as Parameters<typeof WorkspaceChat>[0]['joe'];
  const html = renderToStaticMarkup(<WorkspaceChat joe={joe} onSpeakingChange={() => {}} />);
  expect(html).toContain('记账失败了，让我重新试试');
  expect(html).not.toContain('重试记账');
  expect(html).not.toContain('回复失败');
  expect(html).toContain('has-[img]:p-4');
});
