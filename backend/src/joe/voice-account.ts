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
};
const cache = new Map<string, { token: string; until: number; result: Promise<VoiceAccount> }>();
export async function voiceAccounts() {
  const configs = [voiceConfig('asr'), voiceConfig('tts')];
  return {
    pollMs: VOICE_ACCOUNT_POLL_MS,
    accounts: await Promise.all(
      [...new Map(configs.map((config) => [config.id, config])).values()].map((config) => {
        const existing = cache.get(config.id);
        if (existing && existing.token === config.token && existing.until > Date.now())
          return existing.result;
        const result = query(config.id, config.label, config.token);
        cache.set(config.id, { token: config.token, until: Date.now() + VOICE_ACCOUNT_POLL_MS, result });
        return result;
      }),
    ),
  };
}
async function query(id: string, provider: string, token: string): Promise<VoiceAccount> {
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
      };
    }
    return {
      provider,
      updatedAt: Date.now(),
      balance: z.object({ credit: z.string().regex(/^\d+(?:\.\d+)?$/) }).parse(data).credit,
    };
  } catch {
    return { provider, error: '账户查询暂不可用，稍后自动重试' };
  }
}
