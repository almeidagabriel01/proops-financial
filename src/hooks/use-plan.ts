'use client';

import { useUser } from '@/hooks/use-user';
import { getEffectiveTier } from '@/lib/billing/plans';
import type { Database } from '@/lib/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];

export interface PlanCapabilities {
  isBasic: boolean;
  isPro: boolean;
  inTrial: boolean;
  trialDaysLeft: number;
  canUseAudio: boolean;
  canUseFunctionCalling: boolean;
  aiModel: string;
  aiMonthlyLimit: number;
  maxBankAccounts: number;
  // Planejamento financeiro
  maxBudgetCategories: number;
  maxRecurringRules: number;
  maxGoals: number;
  cashFlowMonthsAhead: number;
  canUseRecurringAutoDetect: boolean;
}

const defaults: PlanCapabilities = {
  isBasic: true,
  isPro: false,
  inTrial: false,
  trialDaysLeft: 0,
  canUseAudio: false,
  canUseFunctionCalling: false,
  aiModel: 'gemini-2.0-flash',
  aiMonthlyLimit: 50,
  maxBankAccounts: 3,
  maxBudgetCategories: 3,
  maxRecurringRules: 5,
  maxGoals: 2,
  cashFlowMonthsAhead: 1,
  canUseRecurringAutoDetect: false,
};

export function computePlanCapabilities(
  profile: Pick<Profile, 'plan' | 'trial_ends_at' | 'audio_enabled' | 'subscription_status'>
): PlanCapabilities {
  const tier = getEffectiveTier(profile.plan, profile.trial_ends_at, profile.subscription_status);
  const isPro = tier === 'pro';

  // inTrial: subscription_status é a fonte primária; trial_ends_at é o fallback para
  // usuários sem subscription_status (migração ou trial legado).
  const inTrial =
    profile.subscription_status === 'trialing' ||
    (
      !profile.subscription_status &&
      !!profile.trial_ends_at &&
      new Date(profile.trial_ends_at) > new Date()
    );

  const trialDaysLeft = inTrial && profile.trial_ends_at
    ? Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / 86400000)
    : 0;

  return {
    isBasic: !isPro,
    isPro,
    inTrial,
    trialDaysLeft,
    canUseAudio: isPro && profile.audio_enabled,
    canUseFunctionCalling: isPro,
    aiModel: isPro ? 'gemini-2.5-flash' : 'gemini-2.0-flash',
    aiMonthlyLimit: isPro ? 200 : 50,
    maxBankAccounts: isPro ? Infinity : 3,
    maxBudgetCategories: isPro ? Infinity : 3,
    maxRecurringRules: isPro ? Infinity : 5,
    maxGoals: isPro ? Infinity : 2,
    cashFlowMonthsAhead: isPro ? 12 : 1,
    canUseRecurringAutoDetect: isPro,
  };
}

export function usePlan(): PlanCapabilities & { loading: boolean } {
  const { profile, loading } = useUser();

  if (!profile) {
    return { ...defaults, loading };
  }

  return { ...computePlanCapabilities(profile), loading };
}
