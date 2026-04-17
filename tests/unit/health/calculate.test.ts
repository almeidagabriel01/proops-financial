import { describe, it, expect } from 'vitest';
import {
  getSavingsRateScore,
  getBudgetComplianceScore,
  getGoalsProgressScore,
  getDiversificationScore,
  calculateFinalScore,
  getBadge,
  isClosedMonth,
} from '@/lib/health-score/calculate';

describe('getSavingsRateScore', () => {
  it('retorna 0 quando receita <= 0', () => {
    expect(getSavingsRateScore(0, 500)).toBe(0);
    expect(getSavingsRateScore(-100, 200)).toBe(0);
  });

  it('retorna 0 quando despesas >= receita', () => {
    expect(getSavingsRateScore(1000, 1000)).toBe(0);
    expect(getSavingsRateScore(1000, 1200)).toBe(0);
  });

  it('retorna 100 quando taxa >= 30%', () => {
    expect(getSavingsRateScore(1000, 700)).toBe(100);
    expect(getSavingsRateScore(1000, 500)).toBe(100);
  });

  it('mapeia linearmente entre 0% e 30%', () => {
    expect(getSavingsRateScore(1000, 850)).toBe(50); // 15% / 30% = 50
    expect(getSavingsRateScore(1000, 940)).toBe(20); // 6% / 30% ≈ 20
  });
});

describe('getBudgetComplianceScore', () => {
  it('retorna 50 pontos neutros sem orçamentos', () => {
    expect(getBudgetComplianceScore([])).toBe(50);
  });

  it('retorna 100 quando todos os orçamentos estão dentro do limite', () => {
    expect(getBudgetComplianceScore([
      { monthly_limit: 500, spent: 300 },
      { monthly_limit: 200, spent: 200 },
    ])).toBe(100);
  });

  it('retorna 0 quando todos estourados', () => {
    expect(getBudgetComplianceScore([
      { monthly_limit: 100, spent: 200 },
      { monthly_limit: 50, spent: 100 },
    ])).toBe(0);
  });

  it('retorna 50 quando metade estourada', () => {
    expect(getBudgetComplianceScore([
      { monthly_limit: 500, spent: 300 },
      { monthly_limit: 100, spent: 150 },
    ])).toBe(50);
  });
});

describe('getGoalsProgressScore', () => {
  it('retorna 50 pontos neutros sem metas', () => {
    expect(getGoalsProgressScore([])).toBe(50);
  });

  it('retorna 100 quando todas as metas atingidas', () => {
    expect(getGoalsProgressScore([
      { current_amount: 1000, target_amount: 1000 },
    ])).toBe(100);
  });

  it('calcula média do progresso', () => {
    expect(getGoalsProgressScore([
      { current_amount: 500, target_amount: 1000 }, // 50%
      { current_amount: 750, target_amount: 1000 }, // 75%
    ])).toBe(63); // média 62.5 → arredonda para 63
  });

  it('limita progresso a 100% por meta', () => {
    expect(getGoalsProgressScore([
      { current_amount: 2000, target_amount: 1000 }, // > 100%, capped
    ])).toBe(100);
  });
});

describe('getDiversificationScore', () => {
  it('retorna 100 quando sem despesas', () => {
    expect(getDiversificationScore({}, 0)).toBe(100);
  });

  it('retorna 100 quando maior categoria é <= 60%', () => {
    expect(getDiversificationScore(
      { alimentacao: 400, transporte: 300, lazer: 300 },
      1000,
    )).toBe(100);
  });

  it('penaliza quando maior categoria > 60%', () => {
    // maxShare = 800/1000 = 0.8 → (1 - (0.8 - 0.6) / 0.4) * 100 = 50
    expect(getDiversificationScore(
      { alimentacao: 800, transporte: 200 },
      1000,
    )).toBe(50);
  });

  it('retorna 0 quando categoria domina 100% das despesas', () => {
    // maxShare = 1.0 → (1 - (1.0 - 0.6) / 0.4) * 100 = 0
    expect(getDiversificationScore({ alimentacao: 1000 }, 1000)).toBe(0);
  });
});

describe('calculateFinalScore', () => {
  it('aplica pesos corretamente (40/30/20/10)', () => {
    expect(calculateFinalScore({
      savingsRateScore: 100,
      budgetComplianceScore: 0,
      goalsProgressScore: 0,
      diversificationScore: 0,
    })).toBe(40);

    expect(calculateFinalScore({
      savingsRateScore: 100,
      budgetComplianceScore: 100,
      goalsProgressScore: 100,
      diversificationScore: 100,
    })).toBe(100);
  });
});

describe('getBadge', () => {
  it.each([
    [0, 'critico'],
    [25, 'critico'],
    [26, 'regular'],
    [50, 'regular'],
    [51, 'bom'],
    [75, 'bom'],
    [76, 'excelente'],
    [100, 'excelente'],
  ])('score %i → badge %s', (score, badge) => {
    expect(getBadge(score)).toBe(badge);
  });
});

describe('isClosedMonth', () => {
  it('retorna true para meses anteriores ao atual', () => {
    expect(isClosedMonth('2020-01')).toBe(true);
    expect(isClosedMonth('2025-12')).toBe(true);
  });

  it('retorna false para o mês atual', () => {
    const now = new Date();
    const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    expect(isClosedMonth(current)).toBe(false);
  });

  it('retorna false para meses futuros', () => {
    expect(isClosedMonth('2099-12')).toBe(false);
  });
});
