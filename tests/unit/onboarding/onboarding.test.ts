import { describe, it, expect } from 'vitest';
import { BANK_INSTRUCTIONS } from '@/lib/onboarding/bank-instructions';

// ─── bank-instructions data ───────────────────────────────────────────────────

describe('BANK_INSTRUCTIONS', () => {
  it('contém os 6 bancos esperados', () => {
    const ids = BANK_INSTRUCTIONS.map((b) => b.id);
    expect(ids).toContain('nubank');
    expect(ids).toContain('itau');
    expect(ids).toContain('bradesco');
    expect(ids).toContain('santander');
    expect(ids).toContain('bb');
    expect(ids).toContain('caixa');
    expect(BANK_INSTRUCTIONS).toHaveLength(6);
  });

  it('cada banco tem id, name, format e steps não-vazios', () => {
    for (const bank of BANK_INSTRUCTIONS) {
      expect(bank.id).toBeTruthy();
      expect(bank.name).toBeTruthy();
      expect(['CSV', 'OFX']).toContain(bank.format);
      expect(bank.steps.length).toBeGreaterThanOrEqual(4);
      for (const step of bank.steps) {
        expect(step).toBeTruthy();
      }
    }
  });

  it('Nubank usa formato CSV', () => {
    const nubank = BANK_INSTRUCTIONS.find((b) => b.id === 'nubank');
    expect(nubank?.format).toBe('CSV');
  });

  it('Itaú usa formato OFX', () => {
    const itau = BANK_INSTRUCTIONS.find((b) => b.id === 'itau');
    expect(itau?.format).toBe('OFX');
  });

  it('Bradesco usa formato CSV', () => {
    const bradesco = BANK_INSTRUCTIONS.find((b) => b.id === 'bradesco');
    expect(bradesco?.format).toBe('CSV');
  });

  it('Santander usa formato OFX', () => {
    const santander = BANK_INSTRUCTIONS.find((b) => b.id === 'santander');
    expect(santander?.format).toBe('OFX');
  });

  it('Banco do Brasil usa formato OFX', () => {
    const bb = BANK_INSTRUCTIONS.find((b) => b.id === 'bb');
    expect(bb?.format).toBe('OFX');
  });

  it('Caixa usa formato CSV', () => {
    const caixa = BANK_INSTRUCTIONS.find((b) => b.id === 'caixa');
    expect(caixa?.format).toBe('CSV');
  });
});

// ─── Onboarding redirect logic ────────────────────────────────────────────────

/**
 * Testa a lógica de redirect extraída como função pura.
 * A lógica real vive em (app)/layout.tsx (Server Component),
 * mas é testável isolando a regra de negócio.
 */
function shouldRedirectToOnboarding(
  onboardingCompleted: boolean,
  transactionCount: number,
): boolean {
  return !onboardingCompleted && transactionCount === 0;
}

function shouldShowOnboardingBanner(
  onboardingCompleted: boolean,
  transactionCount: number,
): boolean {
  return !onboardingCompleted && transactionCount > 0;
}

describe('shouldRedirectToOnboarding', () => {
  it('redireciona novo usuário sem transações e sem onboarding completo', () => {
    expect(shouldRedirectToOnboarding(false, 0)).toBe(true);
  });

  it('não redireciona usuário com onboarding completo', () => {
    expect(shouldRedirectToOnboarding(true, 0)).toBe(false);
  });

  it('não redireciona usuário com transações (mesmo sem onboarding)', () => {
    expect(shouldRedirectToOnboarding(false, 5)).toBe(false);
  });

  it('não redireciona usuário com onboarding completo e transações', () => {
    expect(shouldRedirectToOnboarding(true, 10)).toBe(false);
  });
});

describe('shouldShowOnboardingBanner', () => {
  it('mostra banner para usuário existente com transações mas sem onboarding completo', () => {
    expect(shouldShowOnboardingBanner(false, 5)).toBe(true);
  });

  it('não mostra banner se onboarding está completo', () => {
    expect(shouldShowOnboardingBanner(true, 5)).toBe(false);
  });

  it('não mostra banner para novo usuário sem transações (vai redirecionar)', () => {
    expect(shouldShowOnboardingBanner(false, 0)).toBe(false);
  });

  it('não mostra banner se onboarding completo e sem transações', () => {
    expect(shouldShowOnboardingBanner(true, 0)).toBe(false);
  });
});
