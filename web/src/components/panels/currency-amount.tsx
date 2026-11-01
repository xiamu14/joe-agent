import { motion } from 'motion/react';
import type { ReactNode } from 'react';

export function CurrencyAmount({ symbol, children, compact = false }: { symbol: string; children: ReactNode; compact?: boolean }) {
  return <motion.span className={`inline-flex min-w-0 items-baseline gap-1 font-semibold tabular-nums text-white ${compact ? 'text-base' : 'text-xl'}`}>
    <motion.span>{symbol}</motion.span><motion.span className="min-w-0 break-all text-[1.5em]">{children}</motion.span>
  </motion.span>;
}
