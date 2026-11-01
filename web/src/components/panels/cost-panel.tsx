import { motion } from 'motion/react';
import { memo } from 'react';
import type { Usage } from '../../joe/types';
import { CurrencyAmount } from './currency-amount';

const dollars = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', minimumFractionDigits: 4, maximumFractionDigits: 4,
});

export function money(value?: number | null) {
  if (value === undefined) return '—';
  if (value === null) return '查询失败';
  return dollars.format(value);
}

export const CostPanel = memo(function CostPanel({ usage, compact = false }: { usage?: Usage; compact?: boolean }) {
  const billing = usage?.billing;
  const periods = [{ key: 'today', label: '今日合计' }, { key: 'lifetime', label: '总计' }] as const;
  return <motion.section className={compact ? '' : 'px-5 pb-5'} aria-label="费用" aria-busy={!billing}>
    <motion.dl className="grid grid-cols-2 gap-3">
      {periods.map(({ key, label }) => (
        <motion.div key={key} className="min-w-0">
          <motion.dt className="text-xs text-white/60">{label}</motion.dt>
          <motion.dd className="mt-2 flex items-baseline gap-1 break-words text-xl font-semibold tabular-nums text-white">
            {typeof billing?.total[key] === 'number' ? <CurrencyAmount symbol="$">{money(billing.total[key]).slice(1)}</CurrencyAmount> : money(billing?.total[key])}
          </motion.dd>
        </motion.div>
      ))}
    </motion.dl>
    {!compact && <motion.div role="table" aria-label="费用明细" className="mt-5 grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-x-3 gap-y-3 text-xs tabular-nums">
      <motion.div role="row" className="contents text-white/50">
        <motion.span role="columnheader">费用明细</motion.span>
        {periods.map(({ key }) => <motion.span role="columnheader" key={key} className="text-right">{key === 'today' ? '今日' : '累计'}</motion.span>)}
      </motion.div>
      {([{ key: 'model', label: '思考模型' }, { key: 'voice', label: '语音生成' }] as const).map(({ key, label }) => (
        <motion.div role="row" key={key} className="contents text-white/90">
          <motion.span role="rowheader" className="whitespace-nowrap">{label}</motion.span>
          {periods.map(period => <motion.span role="cell" key={period.key} className="text-right">{money(billing?.[key][period.key])}</motion.span>)}
        </motion.div>
      ))}
      <motion.div role="row" className="contents font-semibold text-white">
        <motion.span role="rowheader">合计</motion.span>
        {periods.map(({ key }) => <motion.span role="cell" key={key} className="text-right">{money(billing?.total[key])}</motion.span>)}
      </motion.div>
    </motion.div>}
    <motion.p className="mt-4 text-[10px] text-white/50">美元 · UTC · 供应商账单</motion.p>
    {(billing?.model.error || billing?.voice.error) && <motion.p role="status" className="mt-2 text-[11px] text-white/60">
      {[billing.model.error, billing.voice.error].filter(Boolean).join(' · ')}
    </motion.p>}
  </motion.section>;
});
