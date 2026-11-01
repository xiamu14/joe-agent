import { CurrencyAmount } from '../../components/panels/currency-amount';
import { formatBalance } from '../../../../shared/finance';

export function AccountAmount({ minor, currency, compact = false }: { minor: number | null; currency: string; compact?: boolean }) {
  if (minor === null) return <>—</>;
  const symbol = new Intl.NumberFormat('zh-CN', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' })
    .formatToParts(0).find(part => part.type === 'currency')?.value ?? currency;
  return <CurrencyAmount symbol={symbol} compact={compact}>
    {minor < 0 ? '−' : ''}{formatBalance(Math.abs(minor), currency).replace(/^[^\d]+/, '')}
  </CurrencyAmount>;
}
