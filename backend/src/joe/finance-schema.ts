import { z } from 'zod';
import { idSchema } from './id';

export const extractedAccountSchema = z.object({
  attachmentId: idSchema,
  accountType: z.enum(['deposit', 'credit']).default('deposit'),
  bank: z.string().trim().min(1).max(100).nullable(),
  last4: z.string().regex(/^\d{4}$/).nullable(),
  label: z.string().trim().min(1).max(100).nullable().default(null),
  currency: z.string().regex(/^[A-Z]{3}$/).refine(value => Intl.supportedValuesOf('currency').includes(value)).nullable(),
  balance: z.union([z.string(), z.number().finite()]).nullable()
    .transform(value => typeof value === 'number' ? String(value) : value)
    .pipe(z.string().regex(/^-?\d+(?:\.\d+)?$/).max(30).nullable()),
  rawBalance: z.string().max(100),
  observedAt: z.iso.datetime({ offset: true }).nullable(),
}).transform(account => {
  if (account.bank !== '支付宝' && account.bank !== '余额宝') return account;
  return { ...account, bank: '支付宝', last4: null, accountType: 'deposit' as const,
    label: account.label || (account.bank === '余额宝' ? '余额宝' : '支付宝余额'),
  };
});
export const extractionSchema = z.object({
  accounts: z.array(extractedAccountSchema).max(50),
  questions: z.array(z.string().max(300)).max(10),
});
export type ExtractedAccount = z.input<typeof extractedAccountSchema>;
const recordSchema = z.object({ id: idSchema, balanceMinor: z.number().int().safe(), rawBalance: z.string(),
  observedAt: z.iso.datetime({ offset: true }), receivedAt: z.iso.datetime({ offset: true }), attachmentId: idSchema });
export const financeSnapshotSchema = z.object({ accounts: z.array(z.object({
  id: idSchema, bank: z.string(), last4: z.string().regex(/^\d{4}$/).nullable(), label: z.string().optional(), currency: z.string(), records: z.array(recordSchema),
})) });
