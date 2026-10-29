import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { z } from 'zod';

const results = z.object({ ok: z.literal(true), items: z.array(z.object({
  title: z.string().nullable(), url: z.string().nullable(), author: z.string().nullable(),
  published_at: z.string().nullable(), raw: z.record(z.string(), z.unknown()).nullable(),
})).max(20) });

export async function searchVideoData(query: string, signal?: AbortSignal) {
  const endpoint = process.env.DATA_MCP_URL?.trim();
  if (!endpoint) throw new Error('请先配置 DATA_MCP_URL');
  const client = new Client({ name: 'video-data', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(endpoint), {
    requestInit: { headers: process.env.DATA_MCP_TOKEN ? { Authorization: `Bearer ${process.env.DATA_MCP_TOKEN}` } : {} },
  });
  try {
    await client.connect(transport, { signal, timeout: 15000 });
    const result = await client.callTool({ name: 'youtube_search', arguments: { query, limit: 10 } }, undefined, { signal, timeout: 60000 });
    if (result.isError) throw new Error('视频搜索暂不可用');
    const content = result.content as { type: string; text?: string }[];
    const data = result.structuredContent ?? JSON.parse(content.find(item => item.type === 'text')?.text ?? '{}');
    return results.parse(data).items.flatMap(item => {
      const id = typeof item.raw?.id === 'string' ? item.raw.id : '';
      if (!/^[\w-]{11}$/.test(id) || !item.title) return [];
      const views = item.raw?.view_count;
      return [{ id, title: item.title.slice(0, 300), channel: item.author ?? '',
        thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        ...(item.published_at ? { publishedAt: item.published_at } : {}),
        ...(typeof views === 'number' && Number.isFinite(views) && views >= 0 ? { views } : {}),
      }];
    });
  } finally { await client.close(); }
}
