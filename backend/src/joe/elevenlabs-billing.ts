import { z } from 'zod';

const table = z.object({
  columns: z.array(z.string()),
  column_units: z.array(z.string().nullable()),
  rows: z.array(z.array(z.unknown())),
});
const amount = z.number().finite().nonnegative();
const beginning = Date.UTC(2020, 0, 1);

export async function elevenLabsBilling(token: string, start: number, end: number) {
  const response = await fetch('https://api.elevenlabs.io/v1/workspace/analytics/query/usage-by-product-over-time', {
    method: 'POST',
    headers: { 'xi-api-key': token, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(8000),
    body: JSON.stringify({
      start_time: start, end_time: end,
      interval_seconds: Math.max(86400, Math.ceil((end - start) / 86400000) * 86400),
      group_by: ['product_type'], time_zone: 'UTC',
      filters: [{ column: 'product_type', operation: 'eq', values: ['TTS'] }],
    }),
  });
  if (!response.ok) throw new Error('ElevenLabs 账单查询失败');
  const data = table.parse(await response.json());
  const cost = data.columns.indexOf('total_cost');
  const product = data.columns.indexOf('product_type');
  if (cost < 0 || product < 0 || data.column_units[cost] !== 'usd')
    throw new Error('ElevenLabs 未返回美元费用');
  return amount.parse(data.rows.reduce((sum, row) => {
    if (row[product] !== 'TTS') throw new Error('ElevenLabs 返回了其他产品费用');
    return sum + amount.parse(row[cost]);
  }, 0));
}

export async function elevenLabsTotals(token: string, now: number) {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  const [today, lifetime] = await Promise.all([
    elevenLabsBilling(token, start.getTime(), now),
    elevenLabsBilling(token, beginning, now),
  ]);
  return { today, lifetime };
}
