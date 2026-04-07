import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildFinancialContext } from '@/lib/ai/chat';

function makeSupabaseMock(currentRows: object[], prevRows: object[] = []) {
  const chainable = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  };

  let callCount = 0;
  const from = vi.fn(() => {
    callCount++;
    // First call = current month, subsequent = previous months
    if (callCount === 1) {
      return { ...chainable, then: undefined, [Symbol.iterator]: undefined };
    }
    return { ...chainable, then: undefined, [Symbol.iterator]: undefined };
  });

  // Override the entire chain to return data at the end
  const makeChain = (data: object[]) => {
    const chain: Record<string, unknown> = {};
    const methods = ['select', 'eq', 'gte', 'lte', 'order', 'limit'];
    methods.forEach((m) => {
      chain[m] = vi.fn().mockReturnValue(chain);
    });
    // Make it thenable (Promise-like)
    chain['then'] = (resolve: (v: { data: object[] }) => unknown) =>
      Promise.resolve({ data }).then(resolve);
    return chain;
  };

  let idx = 0;
  const allData = [currentRows, prevRows, prevRows, prevRows];
  const fromFn = vi.fn(() => {
    const data = allData[idx] ?? prevRows;
    idx++;
    return makeChain(data);
  });

  return { from: fromFn };
}

describe('buildFinancialContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna estrutura com current_month e previous_months', async () => {
    const rows = [
      { category: 'alimentacao', amount: 150, type: 'debit', description: 'Supermercado' },
      { category: 'salario', amount: 5000, type: 'credit', description: 'Salário' },
      { category: 'delivery', amount: 80, type: 'debit', description: 'iFood' },
    ];

    const supabase = makeSupabaseMock(rows);
    const ctx = await buildFinancialContext('user-1', supabase as never);

    expect(ctx).toHaveProperty('current_month');
    expect(ctx).toHaveProperty('previous_months');
    expect(Array.isArray(ctx.previous_months)).toBe(true);
    expect(ctx.previous_months).toHaveLength(3);
  });

  it('calcula income, expenses e balance corretamente', async () => {
    const rows = [
      { category: 'salario', amount: 5000, type: 'credit', description: 'Salário' },
      { category: 'alimentacao', amount: 200, type: 'debit', description: 'Mercado' },
      { category: 'transporte', amount: 100, type: 'debit', description: 'Uber' },
    ];

    const supabase = makeSupabaseMock(rows);
    const ctx = await buildFinancialContext('user-1', supabase as never);

    expect(ctx.current_month.income).toBe(5000);
    expect(ctx.current_month.expenses).toBe(300);
    expect(ctx.current_month.balance).toBe(4700);
    expect(ctx.current_month.transaction_count).toBe(3);
  });

  it('agrega top_categories corretamente (apenas débitos)', async () => {
    const rows = [
      { category: 'alimentacao', amount: 300, type: 'debit', description: 'Mercado' },
      { category: 'alimentacao', amount: 150, type: 'debit', description: 'Padaria' },
      { category: 'delivery', amount: 200, type: 'debit', description: 'iFood' },
      { category: 'salario', amount: 5000, type: 'credit', description: 'Salário' },
    ];

    const supabase = makeSupabaseMock(rows);
    const ctx = await buildFinancialContext('user-1', supabase as never);

    const alimentacaoEntry = ctx.current_month.top_categories.find(
      (c) => c.category === 'alimentacao'
    );
    expect(alimentacaoEntry).toBeDefined();
    expect(alimentacaoEntry?.total).toBe(450);
    expect(alimentacaoEntry?.count).toBe(2);

    // Crédito não deve aparecer em categorias
    const salarioEntry = ctx.current_month.top_categories.find((c) => c.category === 'salario');
    expect(salarioEntry).toBeUndefined();
  });

  it('retorna context vazio quando sem transações', async () => {
    const supabase = makeSupabaseMock([]);
    const ctx = await buildFinancialContext('user-1', supabase as never);

    expect(ctx.current_month.income).toBe(0);
    expect(ctx.current_month.expenses).toBe(0);
    expect(ctx.current_month.balance).toBe(0);
    expect(ctx.current_month.top_categories).toHaveLength(0);
    expect(ctx.current_month.top_merchants).toHaveLength(0);
    expect(ctx.current_month.transaction_count).toBe(0);
  });

  it('limita top_categories a 5 itens', async () => {
    const rows = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((cat) => ({
      category: cat,
      amount: Math.random() * 100,
      type: 'debit',
      description: `Desc ${cat}`,
    }));

    const supabase = makeSupabaseMock(rows);
    const ctx = await buildFinancialContext('user-1', supabase as never);

    expect(ctx.current_month.top_categories.length).toBeLessThanOrEqual(5);
  });

  it('retorna previous_months com formato YYYY-MM', async () => {
    const supabase = makeSupabaseMock([], []);
    const ctx = await buildFinancialContext('user-1', supabase as never);

    for (const month of ctx.previous_months) {
      expect(month.month).toMatch(/^\d{4}-\d{2}$/);
    }
  });
});
