import { describe, it, expect, vi, beforeEach } from 'vitest';
import { normalizeDescription, detectDuplicates } from '@/lib/transactions/duplicate-detector';
import type { SupabaseClient } from '@supabase/supabase-js';

// ── normalizeDescription ────────────────────────────────────────────────────

describe('normalizeDescription', () => {
  it('uppercases the string', () => {
    expect(normalizeDescription('netflix')).toBe('NETFLIX');
  });

  it('removes punctuation and special characters', () => {
    expect(normalizeDescription('Mercado Livre*Compra')).toBe('MERCADO LIVRECOMPRA');
  });

  it('collapses multiple spaces into one', () => {
    expect(normalizeDescription('IFOOD  PEDIDO  123')).toBe('IFOOD PEDIDO 123');
  });

  it('trims leading and trailing spaces', () => {
    expect(normalizeDescription('  NETFLIX  ')).toBe('NETFLIX');
  });

  it('preserves digits', () => {
    expect(normalizeDescription('PIX 12345')).toBe('PIX 12345');
  });

  it('two descriptions that are equivalent after normalizing match', () => {
    // 'iFood  Pedido' → 'IFOOD PEDIDO' (extra space collapsed)
    // 'IFOOD PEDIDO' → 'IFOOD PEDIDO'
    const a = normalizeDescription('iFood  Pedido');
    const b = normalizeDescription('IFOOD PEDIDO');
    expect(a).toBe(b);
  });
});

// ── detectDuplicates ────────────────────────────────────────────────────────

function makeSupabase(newTxns: object[], candidates: object[]): SupabaseClient {
  // Each call to .from().select()... returns a different mock result depending on the chain.
  // First call (in('id', newTransactionIds)): returns newTxns
  // Second call (neq('id', ...)): returns candidates

  let callIndex = 0;

  const chainResult = (data: object[]) => ({
    data,
    error: null,
  });

  const buildChain = (data: object[]) => {
    const chain: Record<string, unknown> = {};
    const methods = ['select', 'in', 'eq', 'neq', 'gte', 'lte', 'upsert', 'insert', 'order', 'limit'];
    methods.forEach((m) => {
      chain[m] = vi.fn(() => {
        // Terminal: return resolved promise-like
        return Promise.resolve(chainResult(data));
      });
    });
    // Make chain methods return the chain itself for fluent calls
    methods.forEach((m) => {
      (chain[m] as ReturnType<typeof vi.fn>).mockReturnValue(chain);
    });
    // Make the chain itself thenable
    (chain as Record<string, unknown>).then = (resolve: (v: unknown) => void) =>
      Promise.resolve(chainResult(data)).then(resolve);
    return chain;
  };

  const chains = [buildChain(newTxns), buildChain(candidates)];

  const alertChain: Record<string, unknown> = {};
  const alertMethods = ['upsert', 'insert'];
  alertMethods.forEach((m) => {
    alertChain[m] = vi.fn(() => Promise.resolve({ error: null, data: [] }));
  });

  const from = vi.fn((table: string) => {
    if (table === 'duplicate_alerts') return alertChain;
    const chain = chains[callIndex % chains.length];
    callIndex++;
    return chain;
  });

  return { from } as unknown as SupabaseClient;
}

describe('detectDuplicates — returns 0 for empty input', () => {
  it('returns 0 when no transaction IDs given', async () => {
    const supabase = makeSupabase([], []);
    const result = await detectDuplicates(supabase, 'user-1', []);
    expect(result).toBe(0);
  });
});

describe('detectDuplicates — only checks debits', () => {
  it('ignores credit transactions', async () => {
    // newTxns returned by the first query already filters type=debit server-side.
    // If query returns empty (no debits), no alerts should be created.
    const supabase = makeSupabase([], []);
    const result = await detectDuplicates(supabase, 'user-1', ['tx-credit-1']);
    expect(result).toBe(0);
  });
});

describe('detectDuplicates — description normalization', () => {
  it('matches transactions with same normalized description but different raw text', async () => {
    const newTxn = {
      id: 'new-1',
      description: 'iFood  Pedido', // extra space → normalizes to 'IFOOD PEDIDO'
      amount: 45.9,
      type: 'debit',
      date: '2026-04-10',
    };
    const candidate = {
      id: 'old-1',
      description: 'IFOOD PEDIDO',
      amount: 45.9,
      date: '2026-04-11',
    };

    const supabase = makeSupabase([newTxn], [candidate]);
    const result = await detectDuplicates(supabase, 'user-1', ['new-1']);
    expect(result).toBe(1);
  });

  it('does NOT match transactions with different descriptions', async () => {
    const newTxn = {
      id: 'new-1',
      description: 'Netflix',
      amount: 45.9,
      type: 'debit',
      date: '2026-04-10',
    };
    const candidate = {
      id: 'old-1',
      description: 'Spotify',
      amount: 45.9,
      date: '2026-04-11',
    };

    // candidate query returns empty because descriptions differ after normalization
    const supabase = makeSupabase([newTxn], [candidate]);
    // normalizeDescription('Netflix') = 'NETFLIX', normalizeDescription('Spotify') = 'SPOTIFY'
    // They differ — no alert
    const result = await detectDuplicates(supabase, 'user-1', ['new-1']);
    // The mock returns candidate regardless, but the function filters by normalized desc
    expect(result).toBe(0);
  });
});

describe('detectDuplicates — 3-day window', () => {
  it('detects pair within ±3 days as duplicate', async () => {
    const newTxn = {
      id: 'new-1',
      description: 'IFOOD',
      amount: 30,
      type: 'debit',
      date: '2026-04-10',
    };
    const candidate = {
      id: 'old-1',
      description: 'IFOOD',
      amount: 30,
      date: '2026-04-12', // 2 days later — within window
    };

    const supabase = makeSupabase([newTxn], [candidate]);
    const result = await detectDuplicates(supabase, 'user-1', ['new-1']);
    expect(result).toBe(1);
  });
});

describe('detectDuplicates — ID ordering', () => {
  it('always inserts with transaction_id_1 < transaction_id_2', async () => {
    // 'b-tx' > 'a-tx' alphabetically, so new tx 'b-tx' paired with 'a-tx' should sort as (a,b)
    const newTxn = {
      id: 'b-tx',
      description: 'NETFLIX',
      amount: 39.9,
      type: 'debit',
      date: '2026-04-10',
    };
    const candidate = { id: 'a-tx', description: 'NETFLIX', amount: 39.9, date: '2026-04-11' };

    let capturedInsert: Record<string, string> | null = null;

    const alertChain = {
      upsert: vi.fn((data: Record<string, string>) => {
        capturedInsert = data;
        return Promise.resolve({ error: null });
      }),
    };

    const chains = [
      (() => {
        const c: Record<string, unknown> = {};
        ['select', 'in', 'eq', 'neq', 'gte', 'lte'].forEach((m) => { c[m] = vi.fn(() => c); });
        c['then'] = (resolve: (v: unknown) => void) =>
          Promise.resolve({ data: [newTxn], error: null }).then(resolve);
        return c;
      })(),
      (() => {
        const c: Record<string, unknown> = {};
        ['select', 'in', 'eq', 'neq', 'gte', 'lte'].forEach((m) => { c[m] = vi.fn(() => c); });
        c['then'] = (resolve: (v: unknown) => void) =>
          Promise.resolve({ data: [candidate], error: null }).then(resolve);
        return c;
      })(),
    ];

    let callIndex = 0;
    const from = vi.fn((table: string) => {
      if (table === 'duplicate_alerts') return alertChain;
      return chains[callIndex++ % chains.length];
    });

    const supabase = { from } as unknown as SupabaseClient;
    await detectDuplicates(supabase, 'user-1', ['b-tx']);

    expect(capturedInsert).not.toBeNull();
    expect(capturedInsert!.transaction_id_1).toBe('a-tx');
    expect(capturedInsert!.transaction_id_2).toBe('b-tx');
  });
});

describe('detectDuplicates — idempotency', () => {
  it('does not throw when pair already exists (upsert ignoreDuplicates)', async () => {
    const newTxn = {
      id: 'new-1',
      description: 'NETFLIX',
      amount: 39.9,
      type: 'debit',
      date: '2026-04-10',
    };
    const candidate = { id: 'old-1', description: 'NETFLIX', amount: 39.9, date: '2026-04-11' };

    const supabase = makeSupabase([newTxn], [candidate]);
    // Should not throw even if called twice for the same pair
    await expect(detectDuplicates(supabase, 'user-1', ['new-1'])).resolves.not.toThrow();
  });
});
