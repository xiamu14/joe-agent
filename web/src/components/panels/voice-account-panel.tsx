import { contentSurface } from '../workspace/material';
import { memo, useEffect, useState } from 'react';
import { api } from '../../joe/api';
import type { Cost, Usage, VoiceAccount } from '../../joe/types';

function money(cost?: Cost) {
  if (!cost) return '—';
  if (cost.known === 0 && cost.pending) return '待确认';
  const amount = cost.known > 0 && cost.known < 0.0001 ? '< $0.0001' : `$${cost.known.toFixed(4)}`;
  return `${amount}${cost.pending ? ' + 待确认' : ''}`;
}
export const VoiceAccountPanel = memo(function VoiceAccountPanel({ usage }: { usage?: Usage }) {
  const [accounts, setAccounts] = useState<VoiceAccount[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let interval = 15_000;
    async function load() {
      try {
        const result = await api<{ accounts: VoiceAccount[]; pollMs: number }>('/voice-account', {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setAccounts(result.accounts);
        setError('');
        interval = result.pollMs;
      } catch {
        if (!controller.signal.aborted) {
          setAccounts([]);
          setError('账户查询失败，稍后自动重试');
        }
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(() => void load(), interval);
      }
    }
    void load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, []);
  return (
    <section className="p-5" aria-label="费用">

      <dl className="mb-8 grid grid-cols-2 gap-4">
        <div>
          <dt className="text-xs text-white/90">今日费用</dt>
          <dd className="mt-3 text-xl font-semibold tabular-nums text-white">{money(usage?.model)}</dd>
        </div>
        <div>
          <dt className="text-xs text-white/90">总费用</dt>
          <dd className="mt-3 text-xl font-semibold tabular-nums text-white">{money(usage?.modelLifetime)}</dd>
        </div>
      </dl>
      <p className="text-xs text-white/90">模型 · USD · 含估算</p>
      <div className={`mt-7 overflow-hidden divide-y divide-white/20 ${contentSurface}`}>
        {!accounts.length && <p className="px-4 py-3 text-sm text-white/90">{error || '语音账单查询中…'}</p>}
        {accounts.map((account) => (
          <div key={account.provider} className="flex items-baseline justify-between gap-3 px-4 py-3 text-sm">
            <span className="text-white/90">
              {account.provider}
              <span className="mt-1 block text-[11px]">
                {account.balance !== undefined || account.remainingCredits !== undefined
                  ? '账户余额'
                  : '下期账单'}
              </span>
            </span>
            {account.error ? (
              <span className="text-right text-white" title={account.error}>
                查询失败
              </span>
            ) : (
              <span
                className="text-right font-mono text-white/90"
                title={account.remainingCredits === undefined ? undefined : `${account.remainingCredits} credits`}
              >
                {account.balance !== undefined
                  ? `${account.remainingCredits === undefined ? '' : '≈ '}USD ${Number(account.balance).toFixed(4)}`
                  : account.remainingCredits !== undefined
                    ? '待配置美元费率'
                    : account.nextInvoice != null && account.currency
                      ? `${account.currency.toUpperCase()} ${account.nextInvoice.toFixed(2)}`
                      : account.nextInvoice != null ? '账单币种未知' : '暂无下期账单'}
              </span>
            )}
          </div>
        ))}
        <p className="px-4 py-3 text-[11px] text-white/90">语音为账户账单，含其他应用用量</p>
      </div>
    </section>
  );
});
