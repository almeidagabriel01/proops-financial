import { describe, it, expect, vi } from 'vitest';
import { getActiveSeasonalities, getSeasonalityEstimate } from '@/lib/dashboard/seasonalities';
import type { SupabaseClient } from '@supabase/supabase-js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildMockSupabase(rows: object[]): SupabaseClient {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'gte', 'lte', 'order', 'limit'];
  methods.forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  (chain as Record<string, unknown>).then = (resolve: (v: unknown) => void) =>
    Promise.resolve({ data: rows, error: null }).then(resolve);

  return { from: vi.fn(() => chain) } as unknown as SupabaseClient;
}

// ── getActiveSeasonalities ────────────────────────────────────────────────────

describe('getActiveSeasonalities', () => {
  it('returns IPVA seasonality for January (month 1)', () => {
    const result = getActiveSeasonalities(1);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('IPVA e licenciamento do veículo');
  });

  it('returns IPTU + material escolar for February (month 2)', () => {
    const result = getActiveSeasonalities(2);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('IPTU e material escolar');
  });

  it('returns IRPF for March (month 3)', () => {
    const result = getActiveSeasonalities(3);
    expect(result).toHaveLength(1);
    expect(result[0].label).toContain('Imposto de Renda');
  });

  it('returns IRPF for April (month 4) — multi-month coverage', () => {
    const result = getActiveSeasonalities(4);
    expect(result).toHaveLength(1);
    expect(result[0].label).toContain('Imposto de Renda');
  });

  it('returns empty for May (month 5) — no seasonality', () => {
    expect(getActiveSeasonalities(5)).toHaveLength(0);
  });

  it('returns viagens for June (month 6)', () => {
    const result = getActiveSeasonalities(6);
    expect(result).toHaveLength(1);
    expect(result[0].label).toContain('viagens');
  });

  it('returns viagens for July (month 7) — multi-month coverage', () => {
    const result = getActiveSeasonalities(7);
    expect(result).toHaveLength(1);
    expect(result[0].label).toContain('viagens');
  });

  it('returns empty for August (month 8) — no seasonality', () => {
    expect(getActiveSeasonalities(8)).toHaveLength(0);
  });

  it('returns Black Friday for November (month 11)', () => {
    const result = getActiveSeasonalities(11);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('Black Friday');
  });

  it('Black Friday keywords use full strings — no standalone "black"', () => {
    const result = getActiveSeasonalities(11);
    const kws = result[0].keywords;
    expect(kws).toContain('black friday');
    expect(kws).toContain('blackfriday');
    expect(kws).not.toContain('black');
  });

  it('returns fim de ano for December (month 12)', () => {
    const result = getActiveSeasonalities(12);
    expect(result).toHaveLength(1);
    expect(result[0].label).toContain('fim de ano');
  });

  it('returns empty for month 0 (invalid)', () => {
    expect(getActiveSeasonalities(0)).toHaveLength(0);
  });
});

// ── getSeasonalityEstimate ────────────────────────────────────────────────────

describe('getSeasonalityEstimate', () => {
  it('returns total and count for matching debit transactions', async () => {
    const rows = [
      { amount: -1500, description: 'IPVA 2024 SP', date: '2024-01-15' },
      { amount: -200, description: 'Licenciamento veículo', date: '2024-01-20' },
      { amount: -50, description: 'Supermercado', date: '2024-01-05' }, // sem keyword match
    ];
    const supabase = buildMockSupabase(rows);
    const result = await getSeasonalityEstimate(
      supabase,
      'user-1',
      [1],
      ['ipva', 'licenciamento', 'veículo', 'crlv', 'detran'],
      2024,
    );
    expect(result).not.toBeNull();
    expect(result!.total).toBe(1700);
    expect(result!.transactionCount).toBe(2);
  });

  it('returns null when no matching transactions', async () => {
    const supabase = buildMockSupabase([]);
    const result = await getSeasonalityEstimate(supabase, 'user-1', [1], ['ipva'], 2024);
    expect(result).toBeNull();
  });

  it('returns null when transactions exist but no keyword match', async () => {
    const rows = [{ amount: -100, description: 'Supermercado Extra', date: '2024-01-10' }];
    const supabase = buildMockSupabase(rows);
    const result = await getSeasonalityEstimate(supabase, 'user-1', [1], ['ipva', 'licenciamento'], 2024);
    expect(result).toBeNull();
  });

  it('keyword matching is case-insensitive', async () => {
    const rows = [{ amount: -1500, description: 'IPVA SP 2024', date: '2024-01-15' }];
    const supabase = buildMockSupabase(rows);
    const result = await getSeasonalityEstimate(supabase, 'user-1', [1], ['ipva'], 2024);
    expect(result).not.toBeNull();
    expect(result!.transactionCount).toBe(1);
  });

  it('filters by month — ignores matching keyword in wrong month', async () => {
    // IPVA in March (month 3) should not count when querying for January (month 1)
    const rows = [{ amount: -1500, description: 'IPVA atrasado', date: '2024-03-15' }];
    const supabase = buildMockSupabase(rows);
    const result = await getSeasonalityEstimate(supabase, 'user-1', [1], ['ipva'], 2024);
    expect(result).toBeNull();
  });

  it('covers multi-month seasonalities — IRPF counts from both March and April', async () => {
    const rows = [
      { amount: -500, description: 'contador imposto de renda', date: '2024-03-10' },
      { amount: -300, description: 'IRPF declaração', date: '2024-04-20' },
    ];
    const supabase = buildMockSupabase(rows);
    const result = await getSeasonalityEstimate(
      supabase,
      'user-1',
      [3, 4],
      ['irpf', 'imposto de renda', 'receita federal', ' ir '],
      2024,
    );
    expect(result).not.toBeNull();
    expect(result!.transactionCount).toBe(2);
    expect(result!.total).toBe(800);
  });

  it('does NOT match standalone "black" — only full "black friday" / "blackfriday"', async () => {
    const rows = [
      { amount: -50, description: 'Black Bear Restaurant', date: '2024-11-10' }, // falso positivo
      { amount: -200, description: 'compra black friday samsung', date: '2024-11-25' }, // match correto
      { amount: -150, description: 'blackfriday shopee', date: '2024-11-29' }, // match correto
    ];
    const supabase = buildMockSupabase(rows);
    const result = await getSeasonalityEstimate(
      supabase,
      'user-1',
      [11],
      ['black friday', 'blackfriday'],
      2024,
    );
    expect(result).not.toBeNull();
    expect(result!.transactionCount).toBe(2); // "Black Bear" NÃO entra
    expect(result!.total).toBe(350);
  });

  it('uses absolute value of negative debit amounts for total', async () => {
    const rows = [{ amount: -250, description: 'hotel férias', date: '2024-07-10' }];
    const supabase = buildMockSupabase(rows);
    const result = await getSeasonalityEstimate(
      supabase,
      'user-1',
      [7],
      ['hotel', 'hospedagem', 'férias'],
      2024,
    );
    expect(result).not.toBeNull();
    expect(result!.total).toBe(250); // positivo, não -250
  });
});
