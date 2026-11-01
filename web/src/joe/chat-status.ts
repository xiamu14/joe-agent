import type { AgentState } from './types';

const statuses = {
  idle: { state: 'done', label: '就绪' },
  listening: { state: 'analyzing', label: '聆听中' },
  transcribing: { state: 'analyzing', label: '识别中' },
  thinking: { state: 'thinking', label: '思考中' },
  'tool-running': { state: 'researching', label: '处理中' },
  responding: { state: 'writing', label: '回复中' },
  speaking: { state: 'writing', label: '回复中' },
  interrupted: { state: 'done', label: '已停止' },
  blocked: { state: 'thinking', label: '等待响应' },
  error: { state: 'error', label: '发生故障了' },
  offline: { state: 'error', label: '未连接' },
} as const;

export function chatStatus(state: AgentState, connected: boolean) {
  return !connected && state !== 'offline' ? { state: 'thinking', label: '连接中' } as const : statuses[state];
}

export function chatError(state: AgentState, error: string, answerStatus?: string) {
  if (answerStatus === 'error') return 'answer';
  if (state === 'error') return 'answer';
  return error ? 'notice' : null;
}
