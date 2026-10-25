import { z } from 'zod';
import { voiceConfig } from './voice-providers/config';

export const VOICE_ACCOUNT_POLL_MS = 15_000;
const amount = z.number().finite().nonnegative();
const subscription = z.object({
  tier: z.string(),
  character_count: amount,
  character_limit: amount,
  next_character_count_reset_unix: amount.nullish(),
  currency: z.string().nullish(),
  next_invoice: z.object({ amount_due_cents: amount }).nullish(),
});
export type VoiceAccount = {
  provider: string;
  updatedAt?: number;
  error?: string;
  used?: number;
  limit?: number;
  resetAt?: number | null;
  tier?: string;
  nextInvoice?: number | null;
  currency?: string | null;
  balance?: string;
  remainingCredits?: number;
};
const cache = new Map<string, { token: string; rate?: string; until: number; result: Promise<VoiceAccount> }>();
export async function voiceAccounts() {
  const configs = [voiceConfig('asr'), voiceConfig('tts')];
  return {
    pollMs: VOICE_ACCOUNT_POLL_MS,
    accounts: await Promise.all(
      [...new Map(configs.map((config) => [config.id, config])).values()].map((config) => {
        const existing = cache.get(config.id);
        const rate = config.id === 'elevenlabs' ? process.env.ELEVENLABS_USD_PER_1000_CREDITS : undefined;
        if (existing && existing.token === config.token && existing.rate === rate && existing.until > Date.now())
          return existing.result;
        const result = query(config.id, config.label, config.token, rate);
        cache.set(config.id, { token: config.token, rate, until: Date.now() + VOICE_ACCOUNT_POLL_MS, result });
        return result;
      }),
    ),
  };
}
async function query(id: string, provider: string, token: string, rate?: string): Promise<VoiceAccount> {
  if (!token) return { provider, error: '未配置 API 凭据' };
  try {
    const response = await fetch(
      id === 'elevenlabs'
        ? 'https://api.elevenlabs.io/v1/user/subscription'
        : 'https://api.fish.audio/wallet/self/api-credit',
      {
        headers: id === 'elevenlabs' ? { 'xi-api-key': token } : { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!response.ok)
      return {
        provider,
        error:
          response.status === 401 || response.status === 403
            ? '账户查询无权限，请检查 API Key 的账户读取权限'
            : `账户查询失败（${response.status}）`,
      };
    const data = await response.json();
    if (id === 'elevenlabs') {
      const value = subscription.parse(data);
      const remainingCredits =
        value.tier === 'payg' ? Math.max(0, value.character_limit - value.character_count) : undefined;
      let balance: string | undefined;
      if (remainingCredits !== undefined && rate?.trim()) {
        const price = z.coerce.number().finite().positive().safeParse(rate);
        if (!price.success) return { provider, error: 'credits 美元换算费率必须是正数' };
        // shortcut: quota credits are a USD equivalent, use a wallet API when one is available.
        const dollars = (remainingCredits * price.data) / 1000;
        if (!Number.isFinite(dollars)) return { provider, error: 'credits 美元换算金额超出范围' };
        balance = String(dollars);
      }
      return {
        provider,
        updatedAt: Date.now(),
        tier: value.tier,
        used: value.character_count,
        limit: value.character_limit,
        resetAt:
          value.next_character_count_reset_unix == null ? null : value.next_character_count_reset_unix * 1000,
        nextInvoice:
          value.next_invoice?.amount_due_cents == null ? null : value.next_invoice.amount_due_cents / 100,
        currency: value.currency ?? null,
        remainingCredits,
        balance,
      };
    }
    return {
      provider,
      updatedAt: Date.now(),
      balance: z.object({
        credit: z.string().regex(/^\d+(?:\.\d+)?$/).refine((value) => Number.isFinite(Number(value))),
      }).parse(data).credit,
      currency: 'usd',
    };
  } catch {
    return { provider, error: '账户查询暂不可用，稍后自动重试' };
  }
}
