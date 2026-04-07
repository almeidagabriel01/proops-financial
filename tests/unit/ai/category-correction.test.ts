import { describe, it, expect, vi } from 'vitest';
import { saveCorrection, findSameDescriptionIds } from '@/lib/ai/category-correction';
import { normalizeDescription } from '@/lib/utils/format';
import type { SupabaseClient } from '@supabase/supabase-js';

// ── normalizeDescription ─────────────────────────────────────────────────────

describe('normalizeDescription', () => {
  it('lowercases and trims', () => {
    expect(normalizeDescription('  UBER  ')).toBe('uber');
  });

  it('strips accents', () => {
    expect(normalizeDescription('Pão de Queijo')).toBe('pao de queijo');
  });

  it('removes special characters (non-alphanumeric non-space)', () => {
    expect(normalizeDescription('PIX*JOÃO-SILVA')).toBe('pixjoaosilva');
  });

  it('collapses multiple spaces to one', () => {
    expect(normalizeDescription('IFOOD   DELIVERY')).toBe('ifood delivery');
  });

  it('produces the same key for variations of the same merchant', () => {
    expect(normalizeDescription('UBER EATS *PEDIDO')).toBe(
      normalizeDescription('UBER EATS PEDIDO'),
    );
  });

  it('returns empty string for blank input', () => {
    expect(normalizeDescription('')).toBe('');
  });
});

// ── Mock factory ──────────────────────────────────────────────────────────────

function makeTxUpdateChain(error: unknown = null) {
  const inFn = vi.fn().mockResolvedValue({ error });
  const updateFn = vi.fn().mockReturnValue({ in: inFn });
  return { updateFn, inFn };
}

function makeSelectChain(data: Array<{ id: string; description: string }>, error: unknown = null) {
  const neqFn = vi.fn().mockResolvedValue({ data, error });
  const eqFn = vi.fn().mockReturnValue({ neq: neqFn });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  return { selectFn, eqFn, neqFn };
}

function makeSupabase({
  txUpdateError = null,
  dictUpsertError = null,
  selectData = [] as Array<{ id: string; description: string }>,
  selectError = null as unknown,
} = {}) {
  const { updateFn, inFn } = makeTxUpdateChain(txUpdateError);
  const { selectFn } = makeSelectChain(selectData, selectError);
  const upsertFn = vi.fn().mockResolvedValue({ error: dictUpsertError });

  const from = vi.fn((table: string) => {
    if (table === 'transactions') {
      return { update: updateFn, select: selectFn };
    }
    if (table === 'category_dictionary') {
      return { upsert: upsertFn };
    }
    return {};
  });

  return {
    client: { from } as unknown as SupabaseClient,
    from,
    updateFn,
    inFn,
    upsertFn,
    selectFn,
  };
}

// ── saveCorrection ────────────────────────────────────────────────────────────

describe('saveCorrection', () => {
  it('updates a single transaction and upserts dictionary', async () => {
    const { client, updateFn, inFn, upsertFn } = makeSupabase();

    await saveCorrection(client, {
      userId: 'user-1',
      transactionIds: ['tx-1'],
      description: 'UBER EATS',
      newCategory: 'delivery',
    });

    expect(updateFn).toHaveBeenCalledWith({ category: 'delivery', category_source: 'user' });
    expect(inFn).toHaveBeenCalledWith('id', ['tx-1']);
    expect(upsertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        description_pattern: 'uber eats',
        category: 'delivery',
      }),
      expect.objectContaining({ onConflict: 'user_id,description_pattern' }),
    );
  });

  it('updates multiple transactions in batch', async () => {
    const { client, inFn } = makeSupabase();

    await saveCorrection(client, {
      userId: 'user-1',
      transactionIds: ['tx-1', 'tx-2', 'tx-3'],
      description: 'NUBANK FATURA',
      newCategory: 'moradia',
    });

    expect(inFn).toHaveBeenCalledWith('id', ['tx-1', 'tx-2', 'tx-3']);
  });

  it('upserts normalized description pattern', async () => {
    const { client, upsertFn } = makeSupabase();

    await saveCorrection(client, {
      userId: 'user-1',
      transactionIds: ['tx-1'],
      description: 'NETFLIX*STREAMING',
      newCategory: 'assinaturas',
    });

    expect(upsertFn).toHaveBeenCalledWith(
      expect.objectContaining({ description_pattern: 'netflixstreaming' }),
      expect.anything(),
    );
  });

  it('throws when transaction update fails', async () => {
    const { client } = makeSupabase({ txUpdateError: { message: 'RLS violation' } });

    await expect(
      saveCorrection(client, {
        userId: 'user-1',
        transactionIds: ['tx-1'],
        description: 'UBER',
        newCategory: 'transporte',
      }),
    ).rejects.toEqual({ message: 'RLS violation' });
  });

  it('throws when dictionary upsert fails', async () => {
    const { client } = makeSupabase({ dictUpsertError: { message: 'dict error' } });

    await expect(
      saveCorrection(client, {
        userId: 'user-1',
        transactionIds: ['tx-1'],
        description: 'NETFLIX',
        newCategory: 'assinaturas',
      }),
    ).rejects.toEqual({ message: 'dict error' });
  });
});

// ── findSameDescriptionIds ─────────────────────────────────────────────────────

describe('findSameDescriptionIds', () => {
  it('returns ids of transactions with same normalized description', async () => {
    const { client } = makeSupabase({
      selectData: [
        { id: 'tx-2', description: 'UBER' },
        { id: 'tx-3', description: 'NETFLIX' },
        { id: 'tx-4', description: 'uber' }, // same after normalization
      ],
    });

    const ids = await findSameDescriptionIds(client, 'user-1', 'UBER', 'tx-1');

    expect(ids).toContain('tx-2');
    expect(ids).toContain('tx-4');
    expect(ids).not.toContain('tx-3');
    expect(ids).not.toContain('tx-1');
  });

  it('returns empty array when no matching transactions exist', async () => {
    const { client } = makeSupabase({
      selectData: [{ id: 'tx-2', description: 'NETFLIX' }],
    });

    const ids = await findSameDescriptionIds(client, 'user-1', 'UBER', 'tx-1');

    expect(ids).toEqual([]);
  });

  it('returns empty array on query error (non-blocking)', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { client } = makeSupabase({ selectError: { message: 'DB error' } });

    const ids = await findSameDescriptionIds(client, 'user-1', 'UBER', 'tx-1');

    expect(ids).toEqual([]);
    consoleSpy.mockRestore();
  });

  it('excludes the current transaction id via neq at query level', async () => {
    const { client, selectFn } = makeSupabase({ selectData: [] });

    await findSameDescriptionIds(client, 'user-1', 'UBER', 'tx-excluded');

    const eqChain = (selectFn as ReturnType<typeof vi.fn>).mock.results[0].value as {
      eq: ReturnType<typeof vi.fn>;
    };
    const neqChain = eqChain.eq.mock.results[0].value as { neq: ReturnType<typeof vi.fn> };
    expect(neqChain.neq).toHaveBeenCalledWith('id', 'tx-excluded');
  });
});
