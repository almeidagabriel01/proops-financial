import { describe, it, expect } from 'vitest';
import { computePlanCapabilities } from '@/hooks/use-plan';

function futureDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function pastDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

describe('computePlanCapabilities', () => {
  describe('Basic sem trial', () => {
    const profile = { plan: 'basic' as const, trial_ends_at: null, audio_enabled: false };

    it('retorna isBasic=true, isPro=false', () => {
      const caps = computePlanCapabilities(profile);
      expect(caps.isBasic).toBe(true);
      expect(caps.isPro).toBe(false);
    });

    it('retorna inTrial=false, trialDaysLeft=0', () => {
      const caps = computePlanCapabilities(profile);
      expect(caps.inTrial).toBe(false);
      expect(caps.trialDaysLeft).toBe(0);
    });

    it('retorna canUseAudio=false, canUseFunctionCalling=false', () => {
      const caps = computePlanCapabilities(profile);
      expect(caps.canUseAudio).toBe(false);
      expect(caps.canUseFunctionCalling).toBe(false);
    });

    it('retorna modelo Haiku e limite 50/mês', () => {
      const caps = computePlanCapabilities(profile);
      expect(caps.aiModel).toBe('claude-haiku-4-5-20251001');
      expect(caps.aiMonthlyLimit).toBe(50);
    });

    it('retorna maxBankAccounts=3', () => {
      const caps = computePlanCapabilities(profile);
      expect(caps.maxBankAccounts).toBe(3);
    });
  });

  describe('Basic em trial ativo', () => {
    const profile = {
      plan: 'basic' as const,
      trial_ends_at: futureDate(3),
      audio_enabled: true,
    };

    it('retorna isPro=true durante trial', () => {
      const caps = computePlanCapabilities(profile);
      expect(caps.isPro).toBe(true);
      expect(caps.isBasic).toBe(false);
    });

    it('retorna inTrial=true', () => {
      const caps = computePlanCapabilities(profile);
      expect(caps.inTrial).toBe(true);
    });

    it('retorna trialDaysLeft >= 1 com 3 dias restantes', () => {
      const caps = computePlanCapabilities(profile);
      expect(caps.trialDaysLeft).toBeGreaterThanOrEqual(1);
      expect(caps.trialDaysLeft).toBeLessThanOrEqual(3);
    });

    it('retorna canUseAudio=true quando audio_enabled=true', () => {
      const caps = computePlanCapabilities(profile);
      expect(caps.canUseAudio).toBe(true);
    });

    it('retorna maxBankAccounts=Infinity', () => {
      const caps = computePlanCapabilities(profile);
      expect(caps.maxBankAccounts).toBe(Infinity);
    });

    it('retorna modelo Sonnet e limite 200/mês', () => {
      const caps = computePlanCapabilities(profile);
      expect(caps.aiModel).toBe('claude-sonnet-4-6');
      expect(caps.aiMonthlyLimit).toBe(200);
    });
  });

  describe('Trial expirado', () => {
    const profile = {
      plan: 'basic' as const,
      trial_ends_at: pastDate(1),
      audio_enabled: true,
    };

    it('retorna isPro=false após trial expirar', () => {
      const caps = computePlanCapabilities(profile);
      expect(caps.isPro).toBe(false);
      expect(caps.isBasic).toBe(true);
    });

    it('retorna inTrial=false, trialDaysLeft=0', () => {
      const caps = computePlanCapabilities(profile);
      expect(caps.inTrial).toBe(false);
      expect(caps.trialDaysLeft).toBe(0);
    });

    it('retorna canUseAudio=false mesmo com audio_enabled=true', () => {
      const caps = computePlanCapabilities(profile);
      expect(caps.canUseAudio).toBe(false);
    });
  });

  describe('Pro assinante', () => {
    const profile = {
      plan: 'pro' as const,
      trial_ends_at: null,
      audio_enabled: true,
    };

    it('retorna isPro=true, isBasic=false', () => {
      const caps = computePlanCapabilities(profile);
      expect(caps.isPro).toBe(true);
      expect(caps.isBasic).toBe(false);
    });

    it('retorna inTrial=false (Pro real não é trial)', () => {
      const caps = computePlanCapabilities(profile);
      expect(caps.inTrial).toBe(false);
      expect(caps.trialDaysLeft).toBe(0);
    });

    it('retorna canUseAudio=true com audio_enabled=true', () => {
      const caps = computePlanCapabilities(profile);
      expect(caps.canUseAudio).toBe(true);
    });

    it('retorna canUseFunctionCalling=true', () => {
      const caps = computePlanCapabilities(profile);
      expect(caps.canUseFunctionCalling).toBe(true);
    });

    it('retorna maxBankAccounts=Infinity', () => {
      const caps = computePlanCapabilities(profile);
      expect(caps.maxBankAccounts).toBe(Infinity);
    });

    it('Pro com audio_enabled=false não pode usar áudio', () => {
      const noAudio = { ...profile, audio_enabled: false };
      const caps = computePlanCapabilities(noAudio);
      expect(caps.canUseAudio).toBe(false);
    });
  });
});
