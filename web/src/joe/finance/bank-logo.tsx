export function BankLogo({ bank, label = bank }: { bank: string; label?: string }) {
  const alipay = /支付宝|余额宝/.test(bank);
  const logo = alipay ? '/banks/alipay.png' : bank.includes('招商') ? '/banks/china-merchants.svg' : bank.includes('平安') ? '/banks/ping-an.svg' : undefined;
  return <span className="inline-flex min-w-0 items-center gap-2">
    {logo && <span className="inline-flex shrink-0 items-center justify-center rounded-md bg-white px-1.5 py-1">
      {alipay ? <span className="relative block size-4 overflow-hidden"><img src={logo} alt="" className="absolute left-1/2 top-1/2 size-16 max-w-none -translate-x-1/2 -translate-y-1/2 object-contain" /></span>
        : <img src={logo} alt="" className="h-4 max-w-[64px] object-contain object-left" />}
    </span>}
    <span className="truncate text-xs text-white/80" title={label}>{label}</span>
  </span>;
}
