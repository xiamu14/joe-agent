import { visualState } from '../state.js';
import type { AgentState, Expression } from './types';
const aliases: Record<AgentState, string> = {
  idle: 'idle',
  listening: 'listening',
  transcribing: 'transcribing',
  thinking: 'thinking',
  'tool-running': 'tool-running',
  responding: 'responding',
  speaking: 'speaking',
  interrupted: 'interrupted',
  blocked: 'blocked',
  error: 'error',
  offline: 'offline',
};
export function agentVisual(state: AgentState, expression: Expression, level: number) {
  const visual = visualState(aliases[state], expression.emotion, level);
  if (state === 'speaking' || state === 'responding')
    return { ...visual, energy: visual.energy * (0.55 + 0.45 * expression.intensity) };
  return visual;
}
