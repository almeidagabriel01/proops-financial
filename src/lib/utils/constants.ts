export const APP_NAME = 'Finansim';

export const CATEGORIES = [
  'alimentacao',
  'delivery',
  'transporte',
  'moradia',
  'saude',
  'educacao',
  'lazer',
  'compras',
  'assinaturas',
  'transferencias',
  'salario',
  'investimentos',
  'impostos',
  'outros',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const PLANS = {
  free: {
    name: 'Gratuito',
    maxBankAccounts: 1,
    historyMonths: 1,
    aiChat: false,
    categoryComparison: false,
  },
  premium: {
    name: 'Premium',
    maxBankAccounts: 10,
    historyMonths: Infinity,
    aiChat: true,
    categoryComparison: true,
  },
} as const;

export const AI_QUERIES_PER_DAY = 20;
