import { nanoid } from 'nanoid';
import { z } from 'zod';
import { createTool } from '@mastra/core/tools';
import { idSchema } from './id';

export const desktopStateSchema = z.object({
  cards: z.array(z.enum(['video', 'web'])).max(2),
  layout: z.enum(['stack', 'parallel']),
  immersive: z.enum(['video', 'web']).nullable(),
  playing: z.boolean(),
});
export const desktopActionSchema = z.object({
  action: z.enum(['open', 'close', 'closeAll', 'front', 'stack', 'parallel', 'immerse', 'exitImmersion', 'play', 'pause', 'resize']),
  card: z.enum(['video', 'web']).optional(),
  retain: z.boolean().optional(),
  width: z.number().min(400).max(2400).optional(),
  height: z.number().min(480).max(1800).optional(),
});
type Action = z.infer<typeof desktopActionSchema>;
const pending = new Map<string, { session: string; turn: string; finish: (result: unknown) => void }>();
export const desktopResultSchema = z.object({
  sessionId: idSchema, turnId: idSchema, id: idSchema,
  ok: z.boolean(), detail: z.string().max(500), state: desktopStateSchema,
});
export function finishDesktopAction(body: unknown) {
  const result = desktopResultSchema.parse(body);
  const entry = pending.get(result.id);
  if (!entry || entry.session !== result.sessionId || entry.turn !== result.turnId)
    throw new Error('桌面操作已失效');
  entry.finish({ ok: result.ok, detail: result.detail, state: result.state });
}
export function desktopExecutor(session: string, turn: string, signal: AbortSignal,
  emit: (type: string, data: Record<string, unknown>) => void) {
  return async (input: Action) => {
    const command = desktopActionSchema.parse(input);
    signal.throwIfAborted();
    const id = nanoid();
    return new Promise<unknown>((resolve) => {
      const finish = (result: unknown) => {
        clearTimeout(timer); signal.removeEventListener('abort', abort); pending.delete(id); resolve(result);
      };
      const abort = () => finish({ ok: false, detail: '操作已取消' });
      const timer = setTimeout(() => finish({ ok: false, detail: '桌面未确认执行结果' }), 20000);
      pending.set(id, { session, turn, finish });
      signal.addEventListener('abort', abort, { once: true });
      emit('desktop.action', { id, command });
    });
  };
}
export const controlDesktop = createTool({
  id: 'control-desktop',
  description: '控制原生桌面卡片、视频和窗口。必须等待执行结果，失败不得声称成功。',
  inputSchema: desktopActionSchema,
  execute: async (input, context) => {
    const execute = context?.requestContext?.get('desktop.execute') as ((input: Action) => Promise<unknown>) | undefined;
    if (!execute) return { ok: false, detail: '当前不是桌面客户端' };
    return execute(input);
  },
});
export const desktopInstructions = `当前为原生桌面客户端。优先使用 controlDesktop 工具，不能用 card 字段打开桌面卡片。
用户明确提到 YouTube、视频、video、X、x.com 或 Twitter 时，必须先调用 controlDesktop.open 打开对应卡片，再输出回答；不能只用文字声称已经打开。
只支持 video（固定 YouTube 视频）与 web（X 首页），不支持搜索、读取或操作 X 内容。
打开卡片用 open：明确保留旧卡片或内容相关则 retain=true，否则 false。重复打开不得重置。
默认堆叠；用户表达并排、比较或同时观看才用 parallel。用户明确指令优先于相关性判断，不确定关联则替换。
只有表达放大、专注观看才用 immerse。退出用 exitImmersion。关闭全部用 closeAll。
播放需 open video 后 play；暂停用 pause。卡片退场后回来不自动播放，除非明确要求继续。
窗口大小用 resize，宽高以逻辑点计。不操作其他应用，不编造网页或视频内容。
逐个等待工具结果，成功后再确认；失败说明真实原因。`;
