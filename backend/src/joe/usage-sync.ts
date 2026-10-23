import { z } from 'zod';
import { store } from './store';

const number = z.number().finite().nonnegative();
const generationSchema = z.object({
  data: z.object({
    id: z.string(),
    native_tokens_prompt: number.nullish(),
    native_tokens_completion: number.nullish(),
    total_cost: number.nullish(),
  }),
});
export function trackGeneration(usageId: string, step: { response?: { id?: string } }) {
  const id = step.response?.id;
  if (!id || !id.startsWith('gen-')) return;
  store.db
    .prepare('INSERT OR IGNORE INTO usage_lookup (usage_id,provider,reference) VALUES (?,?,?)')
    .run(usageId, 'openrouter', id);
}
let running: Promise<void> | undefined;
export function syncUsage() {
  if (!running)
    running = reconcile().finally(() => {
      running = undefined;
    });
  return running;
}
async function reconcile() {
  const now = Date.now();
  const rows = store.db
    .prepare(
      `SELECT l.*,u.time FROM usage_lookup l JOIN usage u ON u.id=l.usage_id
    WHERE l.provider='openrouter' AND l.complete=0 AND l.checked_at<? AND u.status!='pending' AND u.time>? ORDER BY l.checked_at LIMIT 8`,
    )
    .all(now - 30000, now - 48 * 3600000);
  await Promise.all(
    rows.map(async (row) => {
      const token = process.env.OPENROUTER_API_TOKEN;
      if (!token) return;
      store.db
        .prepare('UPDATE usage_lookup SET checked_at=? WHERE provider=? AND reference=?')
        .run(now, row.provider, row.reference);
      try {
        const response = await fetch(
          `https://openrouter.ai/api/v1/generation?id=${encodeURIComponent(String(row.reference))}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(5000),
          },
        );
        if (!response.ok) return;
        if (row.provider === 'openrouter') {
          const { data } = generationSchema.parse(await response.json());
          if (data.id !== row.reference) return;
          const complete =
            data.native_tokens_prompt != null &&
            data.native_tokens_completion != null &&
            data.total_cost != null;
          store.db
            .prepare(
              `UPDATE usage_lookup SET input=COALESCE(?,input),output=COALESCE(?,output),cost=COALESCE(?,cost),complete=?
          WHERE provider=? AND reference=?`,
            )
            .run(
              data.native_tokens_prompt ?? null,
              data.native_tokens_completion ?? null,
              data.total_cost ?? null,
              Number(complete),
              row.provider,
              row.reference,
            );
        }
      } catch {
        /* Retry delayed or unavailable provider records on a later refresh. */
      }
    }),
  );
  await estimateLegacyUsage(now);
  const totals = store.db
    .prepare(
      `SELECT usage_id,COUNT(*) AS count,COUNT(input) AS inputs,COUNT(output) AS outputs,
    COUNT(cost) AS costs,SUM(input) AS input,SUM(output) AS output,SUM(cost) AS cost
    FROM usage_lookup WHERE provider='openrouter' GROUP BY usage_id`,
    )
    .all();
  for (const total of totals) {
    store.db
      .prepare(
        `UPDATE usage SET input=COALESCE(?,input),output=COALESCE(?,output),cost=COALESCE(?,cost)
      WHERE id=? AND status!='pending'`,
      )
      .run(
        total.inputs === total.count ? total.input : null,
        total.outputs === total.count ? total.output : null,
        total.costs === total.count ? total.cost : null,
        total.usage_id,
      );
  }
}

let pricesChecked = 0;
async function estimateLegacyUsage(now: number) {
  const rows = store.db
    .prepare(
      `SELECT * FROM usage u WHERE kind='llm' AND input IS NOT NULL AND output IS NOT NULL
    AND cost IS NULL AND time>? AND NOT EXISTS (SELECT 1 FROM usage_lookup l WHERE l.usage_id=u.id)`,
    )
    .all(now - 48 * 3600000);
  if (!rows.length || now - pricesChecked < 3600000) return;
  pricesChecked = now;
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return;
    const { data } = z
      .object({
        data: z.array(
          z.object({ id: z.string(), pricing: z.object({ prompt: z.string(), completion: z.string() }) }),
        ),
      })
      .parse(await response.json());
    for (const row of rows) {
      const price = data.find((m) => m.id === row.model)?.pricing;
      if (!price || !price.prompt.trim() || !price.completion.trim()) continue;
      const input = Number(price.prompt),
        output = Number(price.completion);
      if (![input, output].every((n) => Number.isFinite(n) && n >= 0)) continue;
      store.db
        .prepare('UPDATE usage SET cost=? WHERE id=? AND cost IS NULL')
        .run(Number(row.input) * input + Number(row.output) * output, row.id);
    }
  } catch {
    /* Historical records without IDs can only use published price estimates. */
  }
}
