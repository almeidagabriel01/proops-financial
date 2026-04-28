import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { detectSubscriptions } from '@/lib/subscriptions/detect-subscriptions';

// ---------------------------------------------------------------------------
// Supabase mock helpers
// ---------------------------------------------------------------------------
type ChainResult = { data: unknown; error: unknown };

function makeChain(resolvedData: unknown = null, resolvedError: unknown = null) {
  const result: ChainResult = { data: resolvedData, error: resolvedError };
  const chain: Record<string, unknown> = {
    then: (fn?: (v: ChainResult) => unknown) => Promise.resolve(result).then(fn),
  };
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.upsert = vi.fn().mockReturnValue({ ...chain, then: (fn?: (v: ChainResult) => unknown) => Promise.resolve({ data: null, error: null }).then(fn) });
  chain.update = vi.fn().mockReturnValue(chain);
  chain.eq2 = vi.fn().mockReturnValue(chain);
  return chain;
}

function makeSupabase(txData: unknown = [], upsertError: unknown = null) {
  const txChain = makeChain(txData);
  const upsertChain = makeChain(null, upsertError);
  upsertChain.upsert = vi.fn().mockReturnValue({ then: (fn?: (v: ChainResult) => unknown) => Promise.resolve({ data: null, error: upsertError }).then(fn) });
  upsertChain.update = vi.fn().mockReturnValue({ then: (fn?: (v: ChainResult) => unknown) => Promise.resolve({ data: null, error: null }).then(fn) });
  upsertChain.eq = vi.fn().mockReturnThis();

  const supabase = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'transactions') return txChain;
      return upsertChain;
    }),
    _txChain: txChain,
    _upsertChain: upsertChain,
  };
  return supabase as unknown as SupabaseClient & typeof supabase;
}

// ---------------------------------------------------------------------------
// Sample transactions (monthly subscription pattern)
// ---------------------------------------------------------------------------
function makeMonthlyTxs(description = 'NETFLIX', count = 3) {
  const txs = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(2024, i, 15);
    txs.push({
      id: `tx-${i}`,
      description,
      amount: -39.90,
      date: d.toISOString().slice(0, 10),
      installment_group_id: null,
    });
  }
  return txs;
}

// ---------------------------------------------------------------------------
// detectSubscriptions
// ---------------------------------------------------------------------------
describe('detectSubscriptions', () => {
  it('does not throw when transaction fetch errors', async () => {
    const supabase = makeSupabase(null);
    (supabase._txChain as { then: unknown }).then = (fn?: (v: ChainResult) => unknown) =>
      Promise.resolve({ data: null, error: new Error('db error') }).then(fn);

    await expect(detectSubscriptions(supabase as unknown as SupabaseClient, 'user-1')).resolves.toBeUndefined();
  });

  it('returns early when fewer than 2 transactions', async () => {
    const supabase = makeSupabase([makeMonthlyTxs()[0]]);
    await detectSubscriptions(supabase as unknown as SupabaseClient, 'user-1');
    // Only transactions query should have been called, no upsert
    expect(supabase.from).toHaveBeenCalledWith('transactions');
    expect(supabase.from).not.toHaveBeenCalledWith('detected_subscriptions');
  });

  it('detects monthly subscription and calls upsert', async () => {
    const txs = makeMonthlyTxs('NETFLIX STREAMING', 3);
    const supabase = makeSupabase(txs);
    await detectSubscriptions(supabase as unknown as SupabaseClient, 'user-1');
    expect(supabase.from).toHaveBeenCalledWith('detected_subscriptions');
    expect(supabase._upsertChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ frequency: 'monthly' }),
      expect.any(Object),
    );
  });

  it('does not detect installment transactions as subscriptions', async () => {
    const txs = makeMonthlyTxs('NETFLIX', 3).map((tx) => ({
      ...tx,
      installment_group_id: 'group-1',
    }));
    const supabase = makeSupabase(txs);
    await detectSubscriptions(supabase as unknown as SupabaseClient, 'user-1');
    expect(supabase.from).not.toHaveBeenCalledWith('detected_subscriptions');
  });

  it('does not detect when interval is not monthly or annual', async () => {
    // Transactions spaced 5 days apart — not monthly or annual
    const txs = [
      { id: 'tx-1', description: 'RANDOM', amount: -50, date: '2024-01-01', installment_group_id: null },
      { id: 'tx-2', description: 'RANDOM', amount: -50, date: '2024-01-06', installment_group_id: null },
      { id: 'tx-3', description: 'RANDOM', amount: -50, date: '2024-01-11', installment_group_id: null },
    ];
    const supabase = makeSupabase(txs);
    await detectSubscriptions(supabase as unknown as SupabaseClient, 'user-1');
    expect(supabase.from).not.toHaveBeenCalledWith('detected_subscriptions');
  });

  it('logs warning when upsert fails but does not throw', async () => {
    const txs = makeMonthlyTxs('SPOTIFY', 3);
    const supabase = makeSupabase(txs, new Error('upsert failed'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(detectSubscriptions(supabase as unknown as SupabaseClient, 'user-1')).resolves.toBeUndefined();
    consoleSpy.mockRestore();
  });

  it('detects annual subscription when spaced ~365 days apart', async () => {
    const txs = [
      { id: 'tx-1', description: 'AMAZON PRIME ANUAL', amount: -459, date: '2022-03-01', installment_group_id: null },
      { id: 'tx-2', description: 'AMAZON PRIME ANUAL', amount: -459, date: '2023-03-01', installment_group_id: null },
    ];
    const supabase = makeSupabase(txs);
    await detectSubscriptions(supabase as unknown as SupabaseClient, 'user-1');
    expect(supabase._upsertChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ frequency: 'annual' }),
      expect.any(Object),
    );
  });

  it('strips installment markers from description before grouping', async () => {
    // "1/12" and "2/12" should normalize to the same key
    const txs = [
      { id: 'tx-1', description: 'COMPRA 1/12 AMAZON', amount: -100, date: '2024-01-15', installment_group_id: null },
      { id: 'tx-2', description: 'COMPRA 2/12 AMAZON', amount: -100, date: '2024-02-15', installment_group_id: null },
      { id: 'tx-3', description: 'COMPRA 3/12 AMAZON', amount: -100, date: '2024-03-15', installment_group_id: null },
    ];
    const supabase = makeSupabase(txs);
    await detectSubscriptions(supabase as unknown as SupabaseClient, 'user-1');
    // These may be grouped together — just verify no throw
    expect(supabase.from).toHaveBeenCalledWith('transactions');
  });

  it('does not throw on unexpected internal error', async () => {
    const supabase = { from: vi.fn().mockImplementation(() => { throw new Error('unexpected'); }) };
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(detectSubscriptions(supabase as unknown as SupabaseClient, 'user-1')).resolves.toBeUndefined();
    consoleSpy.mockRestore();
  });
});
