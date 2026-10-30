import { z } from 'zod';
import type { BillingAmounts, ProviderBilling } from '../../../shared/provider-billing';
import { elevenLabsTotals } from './elevenlabs-billing';
import { voiceConfig } from './voice-providers/config';

const amount = z.number().finite().nonnegative();
const keyUsage = z.object({ data: z.object({ usage: amount, usage_daily: amount }) });
const pollMs = 30000;
let cached: { identity: string; until: number; result: Promise<ProviderBilling> } | undefined;

async function checkedTotals(load: () => Promise<BillingAmounts>, error: string): Promise<BillingAmounts> {
  try { return await load(); }
  catch { return { today: null, lifetime: null, error }; }
}

// Read provider aggregates only. Local requests, token estimates and wallet balances are not bills.
export function providerBilling(now = Date.now()) {
  const modelToken = process.env.OPENROUTER_API_TOKEN || '';
  const voice = voiceConfig('tts');
  const day = new Date(now).toISOString().slice(0, 10);
  const identity = JSON.stringify([modelToken, voice.id, voice.token, day]);
  if (cached?.identity === identity && cached.until > now) return cached.result;
  const result = (async (): Promise<ProviderBilling> => {
    const [model, speech] = await Promise.all([
      checkedTotals(async () => {
        if (!modelToken) throw new Error('Missing credential');
        const response = await fetch('https://openrouter.ai/api/v1/key', {
          headers: { Authorization: `Bearer ${modelToken}` }, signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) throw new Error('OpenRouter billing failed');
        const { data } = keyUsage.parse(await response.json());
        return { today: data.usage_daily, lifetime: data.usage };
      }, '模型账单查询失败'),
      checkedTotals(async () => {
        if (voice.id !== 'elevenlabs' || !voice.token) throw new Error('Unsupported billing provider');
        return elevenLabsTotals(voice.token, now);
      }, voice.id === 'elevenlabs' ? '语音账单查询失败' : '语音账单暂不支持'),
    ]);
    const sum = (key: 'today' | 'lifetime') => model[key] === null || speech[key] === null
      ? null : model[key] + speech[key];
    return { model, voice: speech, total: { today: sum('today'), lifetime: sum('lifetime') },
      currency: 'USD', timezone: 'UTC', updatedAt: now };
  })();
  cached = { identity, until: now + pollMs, result };
  return result;
}
