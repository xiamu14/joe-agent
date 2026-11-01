import { AnimatePresence, motion } from 'motion/react';
import { ComposerButton } from '../../components/rare-ui/composer-controls';
import type { FinanceAccount } from '../../../../shared/finance';
import { formatBalance } from '../../../../shared/finance';
import { AccountAmount } from './account-amount';
import { BankLogo } from './bank-logo';

export function AccountGallery({ accounts, selected, onSelect }: {
  accounts: FinanceAccount[]; selected?: string; onSelect(id: string): void;
}) {
  const active = accounts.find(account => account.id === selected);
  return <>
    <motion.div layout aria-label="账户画廊" className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,210px),1fr))] gap-3">
      {accounts.map(account => <ComposerButton key={account.id} onClick={() => onSelect(account.id)} aria-expanded={selected === account.id}
        aria-label={`${account.bank} ${account.last4 ? `尾号${account.last4}` : account.label ?? ''}`}
        className={`flex min-h-[152px] min-w-0 flex-col justify-between gap-6 rounded-[18px] p-4 text-left ${selected === account.id ? 'bg-[#383838]' : 'bg-[#2d2d2d]'}`} whileTap={{ scale: 0.98 }}>
        <span className="flex w-full min-w-0 items-center justify-between gap-3"><BankLogo bank={account.bank} label={account.label || account.bank} />
          {account.last4 && <span className="shrink-0 text-xs tracking-wider text-white/40">**{account.last4}</span>}
        </span>
        <span className="block w-full min-w-0">
          <AccountAmount minor={account.records[0]?.balanceMinor ?? null} currency={account.currency} compact />
          <span className="mt-2 block truncate text-[11px] text-white/40">{account.currency}</span>
        </span>
      </ComposerButton>)}
    </motion.div>
    <AnimatePresence initial={false}>{active && <motion.div key={active.id} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
      <div className="space-y-3 pt-5">{active.records.map(record => <div key={record.id} className="flex items-center justify-between gap-4 text-xs">
        <time dateTime={record.observedAt} className="text-white/40">{new Intl.DateTimeFormat('zh-CN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Shanghai' }).format(new Date(record.observedAt))}</time>
        <span className="tabular-nums text-white/75">{formatBalance(record.balanceMinor, active.currency)}</span>
      </div>)}</div>
    </motion.div>}</AnimatePresence>
  </>;
}
