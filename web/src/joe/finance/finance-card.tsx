import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { accountTotals, type FinanceSnapshot } from '../../../../shared/finance';
import { TiltCard } from '../tilt-card';
import { AccountAmount } from './account-amount';
import { AccountGallery } from './account-gallery';
import { BankLogo } from './bank-logo';

const colors = ['#333333', '#414141', '#515151', '#636363'];
export function FinanceCard({ data }: { data?: FinanceSnapshot }) {
  const [selected, setSelected] = useState<string>();
  const [hovered, setHovered] = useState(false);
  const reduced = useReducedMotion();
  const accounts = data?.accounts ?? [];
  const totals = accountTotals(accounts);
  const front = accounts.find(account => account.id === selected) ?? accounts[0];
  const stack = front ? [front, ...accounts.filter(account => account.id !== front.id)] : [];
  return <TiltCard id="finance" label="账户卡片" onHoverChange={setHovered} expandedWidth="min(540px, calc(100% - 32px))" surfaceClassName="overflow-hidden rounded-[26px] bg-[#232323] text-white">
    {expanded => <>
    <motion.div data-card-header className={`flex h-14 items-center px-5 text-xs text-white/60 ${expanded ? 'pr-20' : ''}`}>账户</motion.div>
    {expanded ? <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 pb-5">
      {totals.length > 0 && <motion.div className="mb-5">
        <p className="mb-2 text-xs text-white/40">账户余额</p>
        {totals.map(total => <motion.p key={total.currency} layout className="leading-tight">
          <AccountAmount minor={total.balanceMinor} currency={total.currency} />
          {totals.length > 1 && <span className="ml-2 text-xs font-normal tracking-normal text-white/40">{total.currency}</span>}
        </motion.p>)}
      </motion.div>}
      {!accounts.length && <p className="py-8 text-sm text-white/50">暂无账户</p>}
      <AccountGallery accounts={accounts} selected={selected} onSelect={id => setSelected(current => current === id ? undefined : id)} />
    </motion.div> : <motion.div className="px-5 pb-5">
      <motion.div className="relative h-[202px] [perspective:900px] [transform-style:preserve-3d]">
      {stack.slice(1, 4).reverse().map((account, index, backs) => {
        const depth = backs.length - index;
        return <motion.div aria-hidden key={account.id} className="absolute inset-x-0 h-[164px] rounded-[18px] shadow-lg"
          style={{ backgroundColor: colors[(accounts.indexOf(account)) % colors.length], transformOrigin: '50% 0%', top: 34 - depth * 10, scale: 1 - depth * 0.065 }}
          initial={false} animate={{ y: hovered && !reduced ? -depth * 6 : 0 }} transition={{ duration: reduced ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }} />;
      })}
      <motion.div className="absolute inset-x-0 top-[34px] flex h-[164px] flex-col justify-between rounded-[18px] bg-[#333333] p-4">
        <motion.div className="flex min-w-0 items-center justify-between gap-3 text-xs">
          <motion.span className="min-w-0">{front ? <BankLogo bank={front.bank} /> : '暂无账户'}</motion.span>
          {front && <motion.span className="max-w-[50%] truncate font-medium tracking-wider text-white/40">{front.last4 ? `**${front.last4}` : front.label}</motion.span>}
        </motion.div>
        <motion.div>
          <motion.p className="text-[30px] font-semibold leading-none tracking-tight text-white tabular-nums">
            ****
          </motion.p>
          <motion.div aria-hidden className="mt-4 h-1 w-6 rounded-full bg-[#FC4C01]" />
        </motion.div>
      </motion.div>
      </motion.div>
    </motion.div>}</>}
  </TiltCard>;
}
