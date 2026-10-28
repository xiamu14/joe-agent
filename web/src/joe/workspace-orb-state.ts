import type { AgentState } from './types';
import type { OrbState } from '../components/shader-orb/orb-state';

export function workspaceOrbState(state: AgentState, busy: boolean, playing: boolean): OrbState {
  if (playing || state === 'speaking') return 'speaking';
  if (busy || ['thinking', 'tool-running', 'responding'].includes(state)) return 'thinking';
  return 'idle';
}
