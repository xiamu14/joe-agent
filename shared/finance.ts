export type BalanceRecord = {
  id: string; balanceMinor: number; rawBalance: string; observedAt: string;
  receivedAt: string; attachmentId: string;
};
export type FinanceAccount = {
  id: string; bank: string; last4: string | null; label?: string; currency: string; records: BalanceRecord[];
};
export type FinanceSnapshot = { accounts: FinanceAccount[] };

export function accountTotals(accounts: FinanceAccount[]) {
  const totals = new Map<string, bigint>();
  for (const account of accounts) {
    const latest = account.records[0];
    if (latest) totals.set(account.currency, (totals.get(account.currency) ?? 0n) + BigInt(latest.balanceMinor));
  }
  return [...totals].map(([currency, minor]) => ({ currency,
    balanceMinor: minor <= BigInt(Number.MAX_SAFE_INTEGER) && minor >= BigInt(Number.MIN_SAFE_INTEGER) ? Number(minor) : null,
  }));
}

export function currencyDigits(currency: string) {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
}

export function balanceMinor(amount: string, currency: string) {
  if (!/^-?\d+(?:\.\d+)?$/.test(amount)) throw new Error('余额格式无效');
  const digits = currencyDigits(currency);
  const [whole, fraction = ''] = amount.replace(/^-/, '').split('.');
  if (fraction.length > digits) throw new Error('余额小数位与币种不符');
  const minor = BigInt(whole) * 10n ** BigInt(digits) + BigInt(fraction.padEnd(digits, '0') || '0');
  const signed = amount.startsWith('-') ? -minor : minor;
  if (signed > BigInt(Number.MAX_SAFE_INTEGER) || signed < BigInt(Number.MIN_SAFE_INTEGER)) throw new Error('余额超出范围');
  return Number(signed);
}

export function formatBalance(minor: number, currency: string) {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' })
    .format(minor / 10 ** currencyDigits(currency));
}
