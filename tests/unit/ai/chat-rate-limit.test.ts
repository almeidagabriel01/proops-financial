import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkAndResetRateLimit } from '@/lib/ai/chat';

function makeProfile(overrides: Partial<{
  plan: 'basic' | 'pro';
  trial_ends_at: string | null;
  ai_queries_this_month: number;
  ai_queries_reset_at: string;
}> = {}) {
  const now = new Date();
  return {
    plan: 'basic' as const,
    trial_ends_at: null,
    ai_queries_this_month: 0,
    ai_queries_reset_at: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
    ...overrides,
  };
}

function makeSuperbaseMock(updateFn?: () => void) {
  const updateChain = {
    eq: vi.fn().mockResolvedValue({ error: null }),
  };
  const update = vi.fn(() => {
    updateFn?.();
    return updateChain;
  });
  return { from: vi.fn(() => ({ update })) };
}

describe('checkAndResetRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('permite quando queries < limite Basic (50)', async () => {
    const profile = makeProfile({ ai_queries_this_month: 10 });
    const supabase = makeSuperbaseMock();

    const result = await checkAndResetRateLimit('user-1', profile, supabase as never);

    expect(result.allowed).toBe(true);
    expect(result.queriesUsed).toBe(10);
    expect(result.limit).toBe(50);
  });

  it('bloqueia quando queries >= limite Basic (50)', async () => {
    const profile = makeProfile({ ai_queries_this_month: 50 });
    const supabase = makeSuperbaseMock();

    const result = await checkAndResetRateLimit('user-1', profile, supabase as never);

    expect(result.allowed).toBe(false);
    expect(result.queriesUsed).toBe(50);
    expect(result.limit).toBe(50);
  });

  it('permite quando queries < limite Pro (200)', async () => {
    const profile = makeProfile({ plan: 'pro', ai_queries_this_month: 150 });
    const supabase = makeSuperbaseMock();

    const result = await checkAndResetRateLimit('user-1', profile, supabase as never);

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(200);
  });

  it('bloqueia quando queries >= limite Pro (200)', async () => {
    const profile = makeProfile({ plan: 'pro', ai_queries_this_month: 200 });
    const supabase = makeSuperbaseMock();

    const result = await checkAndResetRateLimit('user-1', profile, supabase as never);

    expect(result.allowed).toBe(false);
    expect(result.limit).toBe(200);
  });

  it('reseta contador quando reset_at é de mês anterior', async () => {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const resetAt = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-01`;

    const profile = makeProfile({
      ai_queries_this_month: 45,
      ai_queries_reset_at: resetAt,
    });

    let updated = false;
    const supabase = makeSuperbaseMock(() => { updated = true; });

    const result = await checkAndResetRateLimit('user-1', profile, supabase as never);

    expect(updated).toBe(true);
    expect(result.queriesUsed).toBe(0); // reset
    expect(result.allowed).toBe(true);
  });

  it('Basic em trial usa limite Pro (200)', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const profile = makeProfile({
      plan: 'basic',
      trial_ends_at: futureDate.toISOString(),
      ai_queries_this_month: 100,
    });

    const supabase = makeSuperbaseMock();
    const result = await checkAndResetRateLimit('user-1', profile, supabase as never);

    expect(result.limit).toBe(200); // trial = pro tier
    expect(result.allowed).toBe(true);
  });

  it('Basic com trial expirado usa limite Basic (50)', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    const profile = makeProfile({
      plan: 'basic',
      trial_ends_at: pastDate.toISOString(),
      ai_queries_this_month: 50,
    });

    const supabase = makeSuperbaseMock();
    const result = await checkAndResetRateLimit('user-1', profile, supabase as never);

    expect(result.limit).toBe(50);
    expect(result.allowed).toBe(false);
  });
});
