export const states = {
  transcribing: { label: '转写', icon: '⌁', title: '正在理解你的声音', description: '将声音转成文字。', field: '识别 · 转写', signal: '整理语音', speed: .4, energy: .3 },
  'tool-running': { label: '检索', icon: '✧', title: '正在查找依据', description: '正在调用知识库工具。', field: '检索 · 汇聚', signal: '连接文档', speed: .65, energy: .6 },
  responding: { label: '文字', icon: '≋', title: '正在回答', description: '思绪正在变成文字。', field: '表达 · 文字', signal: '流式回答', speed: .6, energy: .55 },
  interrupted: { label: '打断', icon: '⊘', title: '已停止回答', description: '可以继续说出你的想法。', field: '收束 · 等待', signal: '当前轮次已停止', speed: .12, energy: .15 },
  offline: { label: '离线', icon: '◌', title: 'Joe 暂时离线', description: '请检查服务连接。', field: '断开 · 离线', signal: '等待重连', speed: 0, energy: 0 },
  idle: { label: '待机', icon: '◌', title: '静静等你开口', description: '不急，我在这里。', field: '低频 · 自在', signal: '平缓的能量流动', speed: 0.18, energy: 0.12 },
  listening: { label: '倾听', icon: '⌁', title: '此刻，专注于你', description: '每一个想法，都值得被听见。', field: '感知 · 聚焦', signal: '向内聚拢的涟漪', speed: 0.5, energy: 0.35 },
  thinking: { label: '思考', icon: '✧', title: '正在连接这些想法', description: '让线索交汇，让答案慢慢清晰。', field: '推演 · 连接', signal: '活跃的思维涌动', speed: 0.95, energy: 0.85 },
  speaking: { label: '回答', icon: '≋', title: '把想法，说给你听', description: '有温度的回应，也有清晰的依据。', field: '表达 · 共鸣', signal: '随表达起伏的能量', speed: 0.75, energy: 0.7 },
  blocked: { label: '阻塞', icon: '⊘', title: '思路暂时遇到阻碍', description: '等待中的信号，尚未连成答案。', field: '等待 · 阻塞', signal: '局部凝滞，等待恢复', speed: 0.12, energy: 0.45 },
  error: { label: '故障', icon: '⌁', title: '连接暂时中断', description: '有些信号断开了。可以重新开始。', field: '断层 · 中断', signal: '信号断层，等待重连', speed: 0.25, energy: 0.6 },
};

export const emotions = {
  encouraging: { label: '鼓励', color: '#e5c477', secondary: '#7fd2aa' },
  concerned: { label: '关切', color: '#c3a47f', secondary: '#9b9ac4' },
  calm: { label: '平静', color: '#164bff', secondary: '#00ceff' },
  joy: { label: '愉悦', color: '#ffc975', secondary: '#ff8ab2' },
  curious: { label: '好奇', color: '#69e9df', secondary: '#74a0ff' },
  empathy: { label: '共情', color: '#dba4f3', secondary: '#ef9eae' },
  serious: { label: '认真', color: '#72acfa', secondary: '#bbc9ed' },
};

// Provider events and preview controls share the same validated visual state.
export function visualState(state = 'idle', emotion = 'calm', level = 0) {
  if (!Object.hasOwn(states, state)) throw new RangeError(`Unknown state: ${state}`);
  if (!Object.hasOwn(emotions, emotion)) throw new RangeError(`Unknown emotion: ${emotion}`);
  if (!Number.isFinite(level)) throw new TypeError('Audio level must be finite');
  const palette = state === 'error'
    ? { color: '#ff748a', secondary: '#af77d9' }
    : state === 'blocked'
      ? { color: '#d5a66d', secondary: '#8a80bc' }
      : emotions[(state === 'speaking' || state === 'responding') ? emotion : 'calm'];
  return { ...states[state], ...palette, state, emotion, level: Math.max(0, Math.min(1, level)) };
}
