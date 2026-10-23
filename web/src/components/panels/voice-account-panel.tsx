import { useEffect, useState } from 'react';
import { api } from '../../joe/api';
import type { Cost, Usage, VoiceAccount } from '../../joe/types';

function money(cost?: Cost) {
  if (!cost) return '—';
  if (cost.known === 0 && cost.pending) return '待确认';
  const amount = cost.known > 0 && cost.known < 0.0001 ? '< $0.0001' : `$${cost.known.toFixed(4)}`;
  return `${amount}${cost.pending ? ' + 待确认' : ''}`;
}
export function VoiceAccountPanel({ usage }: { usage?: Usage }) {
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
    <section className="rounded-2xl border border-white/5 bg-[#0c101c]/80 p-5" aria-label="费用">
      <h2 className="text-sm text-slate-200">费用</h2>
      <dl className="my-4 grid grid-cols-2 gap-3">
        <div>
          <dt className="text-[10px] text-slate-500">今日费用</dt>
          <dd className="mt-2 font-mono text-sm text-sky-200">{money(usage?.model)}</dd>
        </div>
        <div>
          <dt className="text-[10px] text-slate-500">总费用</dt>
          <dd className="mt-2 font-mono text-sm text-slate-200">{money(usage?.modelLifetime)}</dd>
        </div>
      </dl>
      <p className="text-[10px] text-slate-500">模型 · USD · 含估算</p>
      <div className="mt-4 space-y-3 border-t border-white/5 pt-4">
        {!accounts.length && <p className="text-[11px] text-slate-400">{error || '语音账单查询中…'}</p>}
        {accounts.map((account) => (
          <div key={account.provider} className="flex items-baseline justify-between gap-3 text-[11px]">
            <span className="text-slate-500">
              {account.provider}
              <span className="mt-1 block text-[9px]">
                {account.balance !== undefined ? '账户余额' : '下期账单'}
              </span>
            </span>
            {account.error ? (
              <span className="text-right text-amber-200" title={account.error}>
                查询失败
              </span>
            ) : (
              <span className="text-right font-mono text-slate-300">
                {account.balance !== undefined
                  ? `${account.balance} credits`
                  : account.nextInvoice != null && account.currency
                    ? `${account.currency.toUpperCase()} ${account.nextInvoice.toFixed(2)}`
                    : '未返回'}
              </span>
            )}
          </div>
        ))}
        <p className="text-[9px] text-slate-600">语音为账户账单，含其他应用用量</p>
      </div>
    </section>
  );
}
