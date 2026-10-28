import test from 'node:test';
import assert from 'node:assert/strict';
import { workspaceOrbState } from '../src/joe/workspace-orb-state.ts';

test('real voice playback drives speaking and takes precedence over generation', () => {
  assert.equal(workspaceOrbState('idle', false, true), 'speaking');
  assert.equal(workspaceOrbState('thinking', true, true), 'speaking');
  assert.equal(workspaceOrbState('speaking', false, false), 'speaking');
});

test('all response stages think; completion, pause and failure restore idle', () => {
  for (const state of ['thinking', 'tool-running', 'responding']) assert.equal(workspaceOrbState(state, false, false), 'thinking');
  assert.equal(workspaceOrbState('idle', true, false), 'thinking');
  for (const state of ['idle', 'error', 'offline', 'interrupted']) assert.equal(workspaceOrbState(state, false, false), 'idle');
  assert.equal(workspaceOrbState('responding', true, false), 'thinking');
});
