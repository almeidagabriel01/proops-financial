import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { collectReportData } from '@/lib/reports/collect-report-data';

// ---------------------------------------------------------------------------
// Supabase mock builder
// ---------------------------------------------------------------------------
type QueryChain = Record<string, unknown>;

function makeChain(resolvedData: unknown = null): QueryChain {
  const result = { data: resolvedData, error: null };
  const chain: QueryChain = {
    then: (fn?: (v: typeof result) => unknown) => Promise.resolve(result).then(fn),
  };
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.lte = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(result);
  return chain;
}

interface MockSupabase {
  from: ReturnType<typeof vi.fn>;
  _txChain: QueryChain;
  _budgetChain: QueryChain;
  _goalChain: QueryChain;
}

function makeSupabase(
  txData: unknown[] = [],
  budgetData: unknown[] = [],
  goalData: unknown[] = [],
): MockSupabase {
  const txChain = makeChain(txData);
  const budgetChain = makeChain(budgetData);
  const goalChain = makeChain(goalData);

  let callCount = 0;

  const supabase: MockSupabase = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'transactions') {
        callCount++;
        // First two calls are current + prev month transactions
        return txChain;
      }
      if (table === 'budgets') return budgetChain;
      if (table === 'goals') return goalChain;
      return makeChain(null);
    }),
    _txChain: txChain,
    _budgetChain: budgetChain,
    _goalChain: goalChain,
  };
  void callCount;
  return supabase;
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------
const SAMPLE_TXS = [
  { amount: 5000, type: 'credit', category: 'salario' },
  { amount: 500, type: 'debit', category: 'alimentacao' },
  { amount: 300, type: 'debit', category: 'transporte' },
  { amount: 200, type: 'debit', category: 'lazer' },
];

// ---------------------------------------------------------------------------
// collectReportData
// ---------------------------------------------------------------------------
describe('collectReportData', () => {
  it('returns null when no transactions exist for the month', async () => {
    const supabase = makeSupabase([]); // empty transactions
    const result = await collectReportData(
      supabase as unknown as SupabaseClient,
      'user-1',
      '2024-03',
      'João',
    );
    expect(result).toBeNull();
  });

  it('returns ReportData with correct income and expenses', async () => {
    const supabase = makeSupabase(SAMPLE_TXS, [], []);
    const result = await collectReportData(
      supabase as unknown as SupabaseClient,
      'user-1',
      '2024-03',
      'João',
    );
    expect(result).not.toBeNull();
    expect(result!.income).toBe(5000);
    expect(result!.expenses).toBe(1000); // 500+300+200
  });

  it('includes user name in result', async () => {
    const supabase = makeSupabase(SAMPLE_TXS, [], []);
    const result = await collectReportData(
      supabase as unknown as SupabaseClient,
      'user-1',
      '2024-03',
      'Maria Santos',
    );
    expect(result!.userName).toBe('Maria Santos');
  });

  it('includes the correct month string', async () => {
    const supabase = makeSupabase(SAMPLE_TXS, [], []);
    const result = await collectReportData(
      supabase as unknown as SupabaseClient,
      'user-1',
      '2024-03',
      'Test',
    );
    expect(result!.month).toBe('2024-03');
  });

  it('formats monthLabel correctly for March 2024', async () => {
    const supabase = makeSupabase(SAMPLE_TXS, [], []);
    const result = await collectReportData(
      supabase as unknown as SupabaseClient,
      'user-1',
      '2024-03',
      'Test',
    );
    expect(result!.monthLabel).toBe('Março 2024');
  });

  it('formats monthLabel correctly for January', async () => {
    const supabase = makeSupabase(SAMPLE_TXS, [], []);
    const result = await collectReportData(
      supabase as unknown as SupabaseClient,
      'user-1',
      '2024-01',
      'Test',
    );
    expect(result!.monthLabel).toBe('Janeiro 2024');
  });

  it('calculates balance correctly', async () => {
    const supabase = makeSupabase(SAMPLE_TXS, [], []);
    const result = await collectReportData(
      supabase as unknown as SupabaseClient,
      'user-1',
      '2024-03',
      'Test',
    );
    expect(result!.balance).toBe(4000); // 5000 - 1000
  });

  it('calculates savingsRate correctly', async () => {
    const supabase = makeSupabase(SAMPLE_TXS, [], []);
    const result = await collectReportData(
      supabase as unknown as SupabaseClient,
      'user-1',
      '2024-03',
      'Test',
    );
    // savingsRate = round((5000-1000)/5000 * 100) = 80
    expect(result!.savingsRate).toBe(80);
  });

  it('returns savingsRate 0 when no income', async () => {
    const txs = [{ amount: 100, type: 'debit', category: 'alimentacao' }];
    const supabase = makeSupabase(txs, [], []);
    const result = await collectReportData(
      supabase as unknown as SupabaseClient,
      'user-1',
      '2024-03',
      'Test',
    );
    expect(result!.savingsRate).toBe(0);
  });

  it('returns top categories sorted by expense amount', async () => {
    const txs = [
      { amount: 5000, type: 'credit', category: 'salario' },
      { amount: 800, type: 'debit', category: 'moradia' },
      { amount: 300, type: 'debit', category: 'alimentacao' },
      { amount: 100, type: 'debit', category: 'transporte' },
    ];
    const supabase = makeSupabase(txs, [], []);
    const result = await collectReportData(
      supabase as unknown as SupabaseClient,
      'user-1',
      '2024-03',
      'Test',
    );
    expect(result!.topCategories[0].category).toBe('moradia');
    expect(result!.topCategories[0].total).toBe(800);
  });

  it('limits topCategories to 5', async () => {
    const txs = [
      { amount: 5000, type: 'credit', category: 'salario' },
      ...['a', 'b', 'c', 'd', 'e', 'f'].map((cat, i) => ({
        amount: (6 - i) * 100,
        type: 'debit',
        category: cat,
      })),
    ];
    const supabase = makeSupabase(txs, [], []);
    const result = await collectReportData(
      supabase as unknown as SupabaseClient,
      'user-1',
      '2024-03',
      'Test',
    );
    expect(result!.topCategories.length).toBeLessThanOrEqual(5);
  });

  it('includes goals with progressPct', async () => {
    const goalData = [
      { name: 'Fundo emergência', current_amount: 5000, target_amount: 10000, status: 'active' },
    ];
    const supabase = makeSupabase(SAMPLE_TXS, [], goalData);
    const result = await collectReportData(
      supabase as unknown as SupabaseClient,
      'user-1',
      '2024-03',
      'Test',
    );
    expect(result!.goals).toHaveLength(1);
    expect(result!.goals[0].progressPct).toBe(50);
  });

  it('caps goal progressPct at 100', async () => {
    const goalData = [
      { name: 'Meta concluída', current_amount: 15000, target_amount: 10000, status: 'active' },
    ];
    const supabase = makeSupabase(SAMPLE_TXS, [], goalData);
    const result = await collectReportData(
      supabase as unknown as SupabaseClient,
      'user-1',
      '2024-03',
      'Test',
    );
    expect(result!.goals[0].progressPct).toBe(100);
  });

  it('sets prevMonth to null when no prev-month transactions', async () => {
    // First tx query returns data, second (prev month) returns empty
    let callIndex = 0;
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'transactions') {
          const data = callIndex === 0 ? SAMPLE_TXS : [];
          callIndex++;
          return makeChain(data);
        }
        return makeChain([]);
      }),
    };
    const result = await collectReportData(
      supabase as unknown as SupabaseClient,
      'user-1',
      '2024-03',
      'Test',
    );
    expect(result!.prevMonth).toBeNull();
  });

  it('includes non-null prevMonth when previous transactions exist', async () => {
    const supabase = makeSupabase(SAMPLE_TXS, [], []);
    // Both current and prev-month calls return SAMPLE_TXS
    const result = await collectReportData(
      supabase as unknown as SupabaseClient,
      'user-1',
      '2024-03',
      'Test',
    );
    // prevMonth is non-null since txChain always returns SAMPLE_TXS
    expect(result!.prevMonth).not.toBeNull();
    expect(result!.prevMonth!.income).toBe(5000);
  });
});
