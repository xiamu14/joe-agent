export type BillingAmounts = {
  today: number | null;
  lifetime: number | null;
  error?: string;
};

export type ProviderBilling = {
  model: BillingAmounts;
  voice: BillingAmounts;
  total: BillingAmounts;
  currency: 'USD';
  timezone: 'UTC';
  updatedAt: number;
};
