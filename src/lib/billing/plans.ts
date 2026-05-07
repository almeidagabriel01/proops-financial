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
      aiModel: 'gemini-2.5-flash-lite',
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
      aiModel: 'gemini-2.5-flash-lite',
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
      aiModel: 'gemini-3.1-flash-lite-preview',
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
      aiModel: 'gemini-3.1-flash-lite-preview',
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
    aiModel: 'gemini-2.5-flash-lite',
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
    aiModel: 'gemini-3.1-flash-lite-preview',
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

// Tolerância máxima para delay de webhook após o trial vencer.
// Stripe processa em segundos/minutos; 24h cobre falhas transientes do endpoint.
// Após esse prazo sem confirmação de pagamento, o acesso é bloqueado.
const TRIAL_WEBHOOK_GRACE_MS = 24 * 60 * 60 * 1000;

/**
 * Retorna true se o trial venceu recentemente e ainda está dentro da janela de
 * tolerância (24h) para o webhook de confirmação de pagamento chegar.
 * Previne que cartão removido/recusado mantenha acesso indefinidamente.
 */
export function isTrialPaymentPending(trialEndsAt: string): boolean {
  const elapsed = Date.now() - new Date(trialEndsAt).getTime();
  return elapsed >= 0 && elapsed < TRIAL_WEBHOOK_GRACE_MS;
}

/**
 * Retorna o tier efetivo considerando trial e subscription_status.
 * IMPORTANTE: use apenas no servidor (API routes) para decisões críticas.
 * No cliente, use o hook usePlan() apenas para UX.
 *
 * Hierarquia de segurança:
 * 1. 'active' → Stripe confirmou pagamento → Pro
 * 2. 'trialing' → apenas se trial ainda não venceu OU dentro de 24h de grace
 *    (usuário que remove cartão perde acesso após trial + 24h, não indefinidamente)
 * 3. plan === 'pro' → assinatura legada sem subscription_status → Pro
 * 4. trial_ends_at no futuro → trial legado sem subscription_status → Pro
 * 5. fallback → Basic
 */
export function getEffectiveTier(
  plan: PlanTier,
  trialEndsAt: string | null,
  subscriptionStatus?: string | null
): PlanTier {
  if (subscriptionStatus === 'active') return plan === 'basic' ? 'basic' : 'pro';
  if (subscriptionStatus === 'trialing') {
    if (!trialEndsAt) return 'pro'; // sem data de fim: confiar no Stripe
    if (new Date(trialEndsAt) > new Date()) return 'pro'; // trial ativo
    if (isTrialPaymentPending(trialEndsAt)) return 'pro'; // dentro do grace de 24h
    return 'basic'; // trial vencido além do grace sem confirmação → bloquear
  }
  if (plan === 'pro') return 'pro';
  if (trialEndsAt && new Date(trialEndsAt) > new Date()) return 'pro';
  return 'basic';
}
