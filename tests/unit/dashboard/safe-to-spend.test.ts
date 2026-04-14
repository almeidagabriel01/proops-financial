import { describe, it, expect } from 'vitest';
import { calculateSafeToSpend, daysUntilEndOfMonth } from '@/lib/dashboard/safe-to-spend';

// ── daysUntilEndOfMonth ───────────────────────────────────────────────────────

describe('daysUntilEndOfMonth', () => {
  it('returns 1 on the last day of the month', () => {
    const lastDay = new Date(2026, 3, 30, 12, 0, 0); // April 30
    expect(daysUntilEndOfMonth(lastDay)).toBe(1);
  });

  it('returns correct count mid-month', () => {
    const mid = new Date(2026, 3, 20, 0, 0, 0); // April 20
    // April has 30 days → 20..30 = 11 days (inclusive)
    expect(daysUntilEndOfMonth(mid)).toBe(11);
  });

  it('returns days for the first day of the month', () => {
    const first = new Date(2026, 0, 1, 0, 0, 0); // January 1
    // January has 31 days → 31 days remaining (inclusive)
    expect(daysUntilEndOfMonth(first)).toBe(31);
  });
});

// ── calculateSafeToSpend ──────────────────────────────────────────────────────

describe('calculateSafeToSpend', () => {
  it('retorna valor positivo quando sobra dinheiro após contas', () => {
    const ref = new Date(2026, 3, 15, 12, 0, 0); // April 15
    const result = calculateSafeToSpend({
      totalIncome: 5000,
      totalExpenses: 2000,
      pendingBills: [{ amount: 500, due_date: '2026-04-20' }],
      referenceDate: ref,
    });
    // balanceMonth = 3000, pendingTotal = 500, safeToSpend = 2500
    expect(result.balanceMonth).toBe(3000);
    expect(result.pendingTotal).toBe(500);
    expect(result.safeToSpend).toBe(2500);
    expect(result.safeToSpendDaily).toBeGreaterThan(0);
    expect(result.pendingBillsCount).toBe(1);
  });

  it('retorna valor negativo quando despesas superam receitas', () => {
    const ref = new Date(2026, 3, 15, 12, 0, 0);
    const result = calculateSafeToSpend({
      totalIncome: 1000,
      totalExpenses: 1500,
      pendingBills: [],
      referenceDate: ref,
    });
    expect(result.safeToSpend).toBe(-500);
    expect(result.safeToSpendDaily).toBeLessThan(0);
  });

  it('retorna negativo quando contas pendentes zeram o saldo', () => {
    const ref = new Date(2026, 3, 15, 12, 0, 0);
    const result = calculateSafeToSpend({
      totalIncome: 3000,
      totalExpenses: 1000,
      pendingBills: [
        { amount: 1500, due_date: '2026-04-20' },
        { amount: 800, due_date: '2026-04-25' },
      ],
      referenceDate: ref,
    });
    // balanceMonth = 2000, pendingTotal = 2300, safeToSpend = -300
    expect(result.safeToSpend).toBe(-300);
    expect(result.pendingBillsCount).toBe(2);
  });

  it('divide corretamente pelos dias restantes', () => {
    const ref = new Date(2026, 3, 20, 0, 0, 0); // April 20 → 11 days remaining
    const result = calculateSafeToSpend({
      totalIncome: 3000,
      totalExpenses: 1000,
      pendingBills: [],
      referenceDate: ref,
    });
    // safeToSpend = 2000, daysRemaining = 11
    expect(result.daysRemaining).toBe(11);
    expect(result.safeToSpendDaily).toBeCloseTo(2000 / 11, 5);
  });

  it('usa divisor mínimo de 1 no último dia do mês', () => {
    const ref = new Date(2026, 3, 30, 12, 0, 0); // April 30 — last day
    const result = calculateSafeToSpend({
      totalIncome: 3000,
      totalExpenses: 1000,
      pendingBills: [],
      referenceDate: ref,
    });
    expect(result.daysRemaining).toBe(1);
    expect(result.safeToSpendDaily).toBe(result.safeToSpend); // divided by 1
  });

  it('funciona sem contas pendentes (pendingBills vazio)', () => {
    const ref = new Date(2026, 3, 15, 12, 0, 0);
    const result = calculateSafeToSpend({
      totalIncome: 4000,
      totalExpenses: 1000,
      pendingBills: [],
      referenceDate: ref,
    });
    expect(result.pendingTotal).toBe(0);
    expect(result.safeToSpend).toBe(3000);
    expect(result.pendingBillsCount).toBe(0);
  });

  it('retorna safeToSpend = 0 quando income = 0 e expenses = 0', () => {
    const ref = new Date(2026, 3, 15, 12, 0, 0);
    const result = calculateSafeToSpend({
      totalIncome: 0,
      totalExpenses: 0,
      pendingBills: [],
      referenceDate: ref,
    });
    expect(result.safeToSpend).toBe(0);
    expect(result.safeToSpendDaily).toBe(0);
    expect(result.balanceMonth).toBe(0);
  });

  it('funciona quando income = 0 e expenses > 0 (gasto sem receita)', () => {
    const ref = new Date(2026, 3, 15, 12, 0, 0);
    const result = calculateSafeToSpend({
      totalIncome: 0,
      totalExpenses: 500,
      pendingBills: [],
      referenceDate: ref,
    });
    expect(result.safeToSpend).toBe(-500);
    expect(result.safeToSpendDaily).toBeLessThan(0);
  });

  it('usa new Date() como default quando referenceDate não é passado', () => {
    // Não deve lançar erro
    expect(() =>
      calculateSafeToSpend({
        totalIncome: 1000,
        totalExpenses: 500,
        pendingBills: [],
      }),
    ).not.toThrow();
  });

  it('soma corretamente múltiplas contas pendentes', () => {
    const ref = new Date(2026, 3, 10, 12, 0, 0);
    const result = calculateSafeToSpend({
      totalIncome: 5000,
      totalExpenses: 1000,
      pendingBills: [
        { amount: 300, due_date: '2026-04-15' },
        { amount: 700, due_date: '2026-04-20' },
        { amount: 200, due_date: '2026-04-28' },
      ],
      referenceDate: ref,
    });
    expect(result.pendingTotal).toBe(1200);
    expect(result.safeToSpend).toBe(2800); // 4000 - 1200
    expect(result.pendingBillsCount).toBe(3);
  });
});
