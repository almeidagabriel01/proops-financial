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
  basic_monthly: {
    name: 'Basic Mensal',
    price: 1990, // R$19,90 em centavos
    billingCycle: 'monthly' as const,
    features: {
      maxBankAccounts: 3,
      historyMonths: Infinity,
      aiChat: true,
      aiChatMonthly: 50,
      aiModel: 'gemini-2.0-flash',
      categoryComparison: true,
      audioEnabled: false,
      functionCalling: false,
    },
  },
  basic_annual: {
    name: 'Basic Anual',
    price: 19100, // R$191,00 (~2 meses grátis)
    billingCycle: 'annual' as const,
    features: {
      maxBankAccounts: 3,
      historyMonths: Infinity,
      aiChat: true,
      aiChatMonthly: 50,
      aiModel: 'gemini-2.0-flash',
      categoryComparison: true,
      audioEnabled: false,
      functionCalling: false,
    },
  },
  pro_monthly: {
    name: 'Pro Mensal',
    price: 4990, // R$49,90 em centavos
    billingCycle: 'monthly' as const,
    features: {
      maxBankAccounts: Infinity,
      historyMonths: Infinity,
      aiChat: true,
      aiChatMonthly: 200,
      aiModel: 'gemini-2.5-flash',
      categoryComparison: true,
      audioEnabled: true,
      functionCalling: true,
    },
  },
  pro_annual: {
    name: 'Pro Anual',
    price: 47900, // R$479,00 (~2 meses grátis)
    billingCycle: 'annual' as const,
    features: {
      maxBankAccounts: Infinity,
      historyMonths: Infinity,
      aiChat: true,
      aiChatMonthly: 200,
      aiModel: 'gemini-2.5-flash',
      categoryComparison: true,
      audioEnabled: true,
      functionCalling: true,
    },
  },
} as const;

export type PlanKey = keyof typeof PLANS;
export type PlanFeatures = (typeof PLANS)[PlanKey]['features'];

/** Planos que correspondem ao tier 'basic' no profiles.plan */
export const BASIC_PLAN_KEYS: PlanKey[] = ['basic_monthly', 'basic_annual'];
/** Planos que correspondem ao tier 'pro' no profiles.plan */
export const PRO_PLAN_KEYS: PlanKey[] = ['pro_monthly', 'pro_annual'];

/** Limites por tier de plano (para verificação server-side) */
export const PLAN_LIMITS = {
  basic: {
    aiChatMonthly: 50,
    maxBankAccounts: 3,
    aiModel: 'gemini-2.0-flash',
    audioEnabled: false,
    functionCalling: false,
    // Planejamento financeiro
    maxBudgetCategories: 3,
    maxRecurringRules: 5,
    maxGoals: 2,
    cashFlowMonthsAhead: 1,
    recurringAutoDetect: false,
    // Categorização
    maxCategorizationRules: 5,
  },
  pro: {
    aiChatMonthly: 200,
    maxBankAccounts: Infinity,
    aiModel: 'gemini-2.5-flash',
    audioEnabled: true,
    functionCalling: true,
    // Planejamento financeiro
    maxBudgetCategories: Infinity,
    maxRecurringRules: Infinity,
    maxGoals: Infinity,
    cashFlowMonthsAhead: 12,
    recurringAutoDetect: true,
    // Categorização
    maxCategorizationRules: Infinity,
  },
} as const;

export type PlanTier = keyof typeof PLAN_LIMITS;

/**
 * Retorna o tier efetivo considerando o trial.
 * IMPORTANTE: use apenas no servidor (API routes) para decisões críticas.
 * No cliente, use o hook usePlan() apenas para UX.
 */
export function getEffectiveTier(
  plan: PlanTier,
  trialEndsAt: string | null
): PlanTier {
  if (plan === 'pro') return 'pro';
  if (trialEndsAt && new Date(trialEndsAt) > new Date()) return 'pro';
  return 'basic';
}
