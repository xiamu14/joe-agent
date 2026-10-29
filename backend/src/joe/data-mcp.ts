import { MCPClient } from '@mastra/mcp';
import type { ToolExecutionContext } from '@mastra/core/tools';
import { nanoid } from 'nanoid';
import { z } from 'zod';

const results = z.object({ ok: z.literal(true), items: z.array(z.object({
  title: z.string().nullable(), url: z.string().nullable(), author: z.string().nullable(),
  published_at: z.string().nullable(), raw: z.record(z.string(), z.unknown()).nullable(),
})).max(20) });

export async function searchVideoData(query: string, signal?: AbortSignal,
  context?: Pick<ToolExecutionContext, 'observe' | 'tracingContext'>) {
  const endpoint = process.env.DATA_MCP_URL?.trim();
  if (!endpoint) throw new Error('请先配置 DATA_MCP_URL');
  signal?.throwIfAborted();
  const client = new MCPClient<{ video: { tools: { youtube_search: {
    input: { query: string; limit: number }; output: unknown;
  } } } }>({
    id: nanoid(),
    registerProcessHooks: false,
    timeout: 60000,
    servers: { video: {
      url: new URL(endpoint),
      // FastMCP uses the initialize handshake; skip newer protocol discovery.
      protocolVersion: 'legacy',
      onToolError: 'return',
      requestInit: { headers: process.env.DATA_MCP_TOKEN ? { Authorization: `Bearer ${process.env.DATA_MCP_TOKEN}` } : {} },
      fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.any([
        ...(signal ? [signal] : []), ...(init?.signal ? [init.signal] : []),
      ]) }),
    } },
  });
  try {
    const { tools } = await client.listToolsWithErrors({ perServerTimeoutMs: 15000 });
    signal?.throwIfAborted();
    const search = tools.video_youtube_search;
    if (!search?.execute) throw new Error('视频搜索工具暂不可用');
    const result = await search.execute({ query, limit: 10 }, context ? {
      observe: context.observe, tracingContext: context.tracingContext, abortSignal: signal,
    } : undefined);
    signal?.throwIfAborted();
    const structured = results.safeParse(result);
    const envelope = structured.success ? undefined : z.object({
      isError: z.boolean().optional(),
      content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
    }).parse(result);
    if (envelope?.isError) throw new Error('视频搜索暂不可用');
    const data = structured.success ? structured.data : JSON.parse(envelope?.content.find(item => item.type === 'text')?.text ?? '{}');
    return results.parse(data).items.flatMap(item => {
      const id = typeof item.raw?.id === 'string' ? item.raw.id : '';
      if (!/^[\w-]{11}$/.test(id) || !item.title) return [];
      const views = item.raw?.view_count;
      const duration = item.raw?.duration;
      return [{ id, title: item.title.slice(0, 300), channel: item.author ?? '',
        thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        ...(typeof duration === 'number' && Number.isFinite(duration) && duration >= 0 ? { duration } : {}),
        ...(item.published_at ? { publishedAt: item.published_at } : {}),
        ...(typeof views === 'number' && Number.isFinite(views) && views >= 0 ? { views } : {}),
      }];
    });
  } finally { await client.disconnect(); }
}
