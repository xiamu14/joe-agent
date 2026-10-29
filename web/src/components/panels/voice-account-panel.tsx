import { motion } from 'motion/react';
import { contentSurface } from '../workspace/material';
import { memo, useEffect, useState } from 'react';
import { api } from '../../joe/api';
import type { Cost, Usage, VoiceAccount } from '../../joe/types';

export function money(cost?: Cost) {
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
    <motion.section className="px-5 pb-5" aria-label="费用">

      <motion.dl className="mb-4 grid grid-cols-2 gap-4">
        <motion.div>
          <motion.dt className="text-xs text-white/60">今日费用</motion.dt>
          <motion.dd className="mt-3 text-xl font-semibold tabular-nums text-white">{money(usage?.model)}</motion.dd>
        </motion.div>
        <motion.div>
          <motion.dt className="text-xs text-white/60">累计费用</motion.dt>
          <motion.dd className="mt-3 text-xl font-semibold tabular-nums text-white">{money(usage?.modelLifetime)}</motion.dd>
        </motion.div>
      </motion.dl>
      <motion.p className="text-xs text-white/60">模型 · USD · 含估算</motion.p>
      <motion.div className={`mt-4 overflow-hidden ${contentSurface}`}>
        {!accounts.length && <motion.p className="px-4 py-3 text-sm text-white/60">{error || '语音账单查询中…'}</motion.p>}
        {accounts.map((account) => (
          <motion.div key={account.provider} className="flex items-baseline justify-between gap-3 px-4 py-3 text-sm">
            <motion.span className="text-white/60">
              {account.provider}
              <motion.span className="mt-1 block text-[11px]">
                {account.balance !== undefined || account.remainingCredits !== undefined
                  ? '账户余额'
                  : '下期账单'}
              </motion.span>
            </motion.span>
            {account.error ? (
              <motion.span className="text-right text-white" title={account.error}>
                查询失败
              </motion.span>
            ) : (
              <motion.span
                className="text-right font-mono text-white/60"
                title={account.remainingCredits === undefined ? undefined : `${account.remainingCredits} credits`}
              >
                {account.balance !== undefined
                  ? `${account.remainingCredits === undefined ? '' : '≈ '}USD ${Number(account.balance).toFixed(4)}`
                  : account.remainingCredits !== undefined
                    ? '待配置美元费率'
                    : account.nextInvoice != null && account.currency
                      ? `${account.currency.toUpperCase()} ${account.nextInvoice.toFixed(2)}`
                      : account.nextInvoice != null ? '账单币种未知' : '暂无下期账单'}
              </motion.span>
            )}
          </motion.div>
        ))}
        <motion.p className="px-4 py-3 text-[11px] text-white/60">语音账单含其他应用用量</motion.p>
      </motion.div>
    </motion.section>
  );
});
