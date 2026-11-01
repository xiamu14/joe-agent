import { test, expect } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { AccountGallery } from '../src/joe/finance/account-gallery';
import { AccountAmount } from '../src/joe/finance/account-amount';
import type { FinanceAccount } from '../../shared/finance';
import { BankLogo } from '../src/joe/finance/bank-logo';

test('account gallery uses bank logos and smaller split currency amounts', () => {
  const accounts = ['招商银行', '平安银行'].map((bank, index) => ({ id: String(index), bank, last4: index ? null : '8011', label: index ? '平安银行信用卡1' : '', currency: 'CNY',
    records: [{ id: 'record', balanceMinor: index ? -502976 : 22756336, observedAt: '2026-11-01T12:00:00Z' }],
  })) as FinanceAccount[];
  const html = renderToStaticMarkup(<AccountGallery accounts={accounts} selected="1" onSelect={() => {}} />);
  expect(html).toContain('账户画廊');
  expect(html).toContain('/banks/china-merchants.svg');
  expect(html).toContain('/banks/ping-an.svg');
  expect(html).toContain('**8011');
  expect(html).toContain('平安银行信用卡1');
  expect(html).toContain('text-[1.5em]');
  expect(html).toContain('text-base');
  expect(html).toContain('5,029.76');
  expect(html).not.toContain('−¥');
  expect(html).toMatch(/>¥<\/span><span[^>]*>−5,029\.76<\/span>/);
  expect(html).toContain('<time');
  expect(renderToStaticMarkup(<AccountAmount minor={22756336} currency="CNY" />)).toContain('text-[1.5em]');
});

test('Alipay and Yu’e Bao use the supplied logo with the same white backing', () => {
  for (const bank of ['支付宝', '余额宝']) {
    const html = renderToStaticMarkup(<BankLogo bank={bank} label="余额宝" />);
    expect(html).toContain('/banks/alipay.png');
    expect(html).toContain('bg-white');
    expect(html).toContain('余额宝');
  }
});
