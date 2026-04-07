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
}

const defaults: PlanCapabilities = {
  isBasic: true,
  isPro: false,
  inTrial: false,
  trialDaysLeft: 0,
  canUseAudio: false,
  canUseFunctionCalling: false,
  aiModel: 'claude-haiku-4-5-20251001',
  aiMonthlyLimit: 50,
  maxBankAccounts: 3,
};

export function computePlanCapabilities(
  profile: Pick<Profile, 'plan' | 'trial_ends_at' | 'audio_enabled'>
): PlanCapabilities {
  const tier = getEffectiveTier(profile.plan, profile.trial_ends_at);
  const isPro = tier === 'pro';
  const inTrial =
    profile.plan === 'basic' &&
    !!profile.trial_ends_at &&
    new Date(profile.trial_ends_at) > new Date();
  const trialDaysLeft = inTrial
    ? Math.ceil((new Date(profile.trial_ends_at!).getTime() - Date.now()) / 86400000)
    : 0;

  return {
    isBasic: !isPro,
    isPro,
    inTrial,
    trialDaysLeft,
    canUseAudio: isPro && profile.audio_enabled,
    canUseFunctionCalling: isPro,
    aiModel: isPro ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001',
    aiMonthlyLimit: isPro ? 200 : 50,
    maxBankAccounts: isPro ? Infinity : 3,
  };
}

export function usePlan(): PlanCapabilities & { loading: boolean } {
  const { profile, loading } = useUser();

  if (!profile) {
    return { ...defaults, loading };
  }

  return { ...computePlanCapabilities(profile), loading };
}
