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
  const html = renderToStaticMarkup(<WorkspaceInput text="" onTextChange={() => {}} onSend={async () => true} ready busy={false} sessionId="session" voiceReady onError={() => {}} onSettings={async () => true} layoutMode="free" onToggleLayout={() => {}} />);
  expect(html).not.toContain('role="status"');
});
