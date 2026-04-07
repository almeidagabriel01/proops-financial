import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

import {
  normalizeDescription,
  categorizeByKeywords,
  categorizeBatch,
  saveCategorizations,
} from '@/lib/ai/categorizer';
import { lookupUserDictionary, lookupGlobalCache } from '@/lib/ai/cache';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeMockFromQuery(returnValue: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnValue({ then: vi.fn() }),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue(returnValue),
    then: vi.fn().mockResolvedValue({ error: null }),
  };
  return query;
}

function makeMockSupabase() {
  const query = makeMockFromQuery({ data: [], error: null });
  return {
    from: vi.fn().mockReturnValue(query),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    _query: query,
  };
}

// ─── normalizeDescription ─────────────────────────────────────────────────────

describe('normalizeDescription', () => {
  it('converte para minúsculas', () => {
    expect(normalizeDescription('UBER TRIP')).toBe('uber trip');
  });

  it('remove acentos', () => {
    expect(normalizeDescription('Pão de Açúcar')).toBe('pao de acucar');
  });

  it('remove caracteres especiais sem substituir por espaço (igual ao SQL)', () => {
    // SQL: regexp_replace('[^a-z0-9 ]', '', 'g') — remove sem adicionar espaço
    expect(normalizeDescription('IFOOD*PIZZA 123!')).toBe('ifoodpizza 123');
  });

  it('colapsa múltiplos espaços', () => {
    expect(normalizeDescription('DROGA   RAIA  FARMA')).toBe('droga raia farma');
  });

  it('faz trim de espaços nas bordas', () => {
    expect(normalizeDescription('  netflix  ')).toBe('netflix');
  });
});

// ─── lookupUserDictionary ─────────────────────────────────────────────────────

describe('lookupUserDictionary', () => {
  it('retorna categoria do dicionário do usuário sem chamar IA', async () => {
    const supabase = makeMockSupabase();
    supabase._query.in.mockResolvedValueOnce({
      data: [{ description_pattern: 'pix joao silva', category: 'transferencias' }],
      error: null,
    });

    const transactions = [
      { id: 'tx1', description: 'PIX JOAO SILVA', normalizedDescription: 'pix joao silva' },
    ];

    const result = await lookupUserDictionary(supabase as never, 'user123', transactions);

    expect(result.size).toBe(1);
    expect(result.get('tx1')).toMatchObject({ category: 'transferencias', source: 'user' });
  });

  it('não retorna nada quando não há match no dicionário', async () => {
    const supabase = makeMockSupabase();
    supabase._query.in.mockResolvedValueOnce({ data: [], error: null });

    const transactions = [
      { id: 'tx1', description: 'AMAZON COMPRA', normalizedDescription: 'amazon compra' },
    ];

    const result = await lookupUserDictionary(supabase as never, 'user123', transactions);
    expect(result.size).toBe(0);
  });

  it('retorna mapa vazio quando transactions está vazio', async () => {
    const supabase = makeMockSupabase();
    const result = await lookupUserDictionary(supabase as never, 'user123', []);
    expect(result.size).toBe(0);
  });

  it('lida com erro do Supabase sem lançar exceção', async () => {
    const supabase = makeMockSupabase();
    supabase._query.in.mockResolvedValueOnce({ data: null, error: { message: 'db error' } });

    const transactions = [
      { id: 'tx1', description: 'NETFLIX', normalizedDescription: 'netflix' },
    ];

    const result = await lookupUserDictionary(supabase as never, 'user123', transactions);
    expect(result.size).toBe(0);
  });
});

// ─── lookupGlobalCache ────────────────────────────────────────────────────────

describe('lookupGlobalCache', () => {
  it('retorna categoria do cache global sem chamar IA', async () => {
    const supabase = makeMockSupabase();
    supabase._query.in.mockResolvedValueOnce({
      data: [{ description_normalized: 'uber trip', category: 'transporte', confidence: 0.97 }],
      error: null,
    });

    const transactions = [
      { id: 'tx2', description: 'UBER TRIP', normalizedDescription: 'uber trip' },
    ];

    const result = await lookupGlobalCache(supabase as never, transactions);

    expect(result.size).toBe(1);
    expect(result.get('tx2')).toMatchObject({ category: 'transporte', source: 'cache', confidence: 0.97 });
  });

  it('segundo usuário com mesma descrição obtém resultado do cache', async () => {
    const supabase = makeMockSupabase();
    supabase._query.in.mockResolvedValueOnce({
      data: [{ description_normalized: 'netflix', category: 'assinaturas', confidence: 0.99 }],
      error: null,
    });

    const transactions = [
      { id: 'tx-user2', description: 'NETFLIX', normalizedDescription: 'netflix' },
    ];

    const result = await lookupGlobalCache(supabase as never, transactions);
    expect(result.get('tx-user2')?.source).toBe('cache');
  });

  it('retorna mapa vazio quando transactions está vazio', async () => {
    const supabase = makeMockSupabase();
    const result = await lookupGlobalCache(supabase as never, []);
    expect(result.size).toBe(0);
  });

  it('lida com erro do Supabase sem lançar exceção', async () => {
    const supabase = makeMockSupabase();
    supabase._query.in.mockResolvedValueOnce({ data: null, error: { message: 'cache error' } });

    const transactions = [
      { id: 'tx1', description: 'SPOTIFY', normalizedDescription: 'spotify' },
    ];

    const result = await lookupGlobalCache(supabase as never, transactions);
    expect(result.size).toBe(0);
  });
});

// ─── categorizeByKeywords ─────────────────────────────────────────────────────

describe('categorizeByKeywords', () => {
  it('IFOOD → delivery', () => {
    expect(categorizeByKeywords('IFOOD*HAMBURGUER').category).toBe('delivery');
  });

  it('UBER → transporte', () => {
    expect(categorizeByKeywords('UBER TRIP').category).toBe('transporte');
  });

  it('UBER EATS → delivery (prioridade sobre transporte)', () => {
    expect(categorizeByKeywords('UBER EATS PAGAMENTO').category).toBe('delivery');
  });

  it('NETFLIX → assinaturas', () => {
    expect(categorizeByKeywords('NETFLIX.COM').category).toBe('assinaturas');
  });

  it('AMAZON PRIME → assinaturas (não compras)', () => {
    expect(categorizeByKeywords('AMAZON PRIME VIDEO').category).toBe('assinaturas');
  });

  it('AMAZON → compras (sem "prime")', () => {
    expect(categorizeByKeywords('AMAZON MARKETPLACE').category).toBe('compras');
  });

  it('XBOX → lazer (não assinaturas)', () => {
    expect(categorizeByKeywords('XBOX GAME PASS').category).toBe('lazer');
  });

  it('PIX TIM → transferencias (não moradia)', () => {
    expect(categorizeByKeywords('PIX RECARGA TIM CELULAR').category).toBe('transferencias');
  });

  it('IPTU → impostos (não moradia)', () => {
    expect(categorizeByKeywords('BOLETO IPTU 2024').category).toBe('impostos');
  });

  it('MERCADO LIVRE → compras (não alimentacao)', () => {
    expect(categorizeByKeywords('MERCADO LIVRE PAGAMENTO').category).toBe('compras');
  });

  it('descrição sem match → outros com confidence=0', () => {
    const result = categorizeByKeywords('XYZ COMERCIO LTDA 99999');
    expect(result.category).toBe('outros');
    expect(result.confidence).toBe(0);
  });

  it('resultado com match retorna confidence=0.8', () => {
    expect(categorizeByKeywords('SPOTIFY').confidence).toBe(0.8);
  });
});

// ─── categorizeBatch ─────────────────────────────────────────────────────────

describe('categorizeBatch', () => {
  it('categoriza "IFOOD*PIZZA" como delivery via keyword', async () => {
    const supabase = makeMockSupabase();
    const result = await categorizeBatch(supabase as never, [
      { id: 'tx1', description: 'IFOOD*PIZZA', amount: -45 },
    ]);
    expect(result.get('tx1')).toMatchObject({ category: 'delivery', confidence: 0.8 });
  });

  it('retorna "outros" com confidence=0 para descrição sem match', async () => {
    const supabase = makeMockSupabase();
    const result = await categorizeBatch(supabase as never, [
      { id: 'tx1', description: 'DESCRICAO GENERICA DESCONHECIDA', amount: -15 },
    ]);
    expect(result.get('tx1')).toMatchObject({ category: 'outros', confidence: 0 });
  });

  it('processa batch de múltiplas transações corretamente', async () => {
    const supabase = makeMockSupabase();
    const transactions = [
      { id: 'tx1', description: 'UBER', amount: -18 },
      { id: 'tx2', description: 'NETFLIX', amount: -39.9 },
      { id: 'tx3', description: 'PAO DE ACUCAR', amount: -150 },
    ];
    const result = await categorizeBatch(supabase as never, transactions);
    expect(result.size).toBe(3);
    expect(result.get('tx1')?.category).toBe('transporte');
    expect(result.get('tx2')?.category).toBe('assinaturas');
    expect(result.get('tx3')?.category).toBe('alimentacao');
  });

  it('salva no category_cache resultados com categoria não-outros', async () => {
    const supabase = makeMockSupabase();
    const mockThen = vi.fn();
    supabase._query.upsert.mockReturnValue({ then: mockThen });

    await categorizeBatch(supabase as never, [
      { id: 'tx1', description: 'IFOOD PIZZA', amount: -45 },
      { id: 'tx2', description: 'DESCRICAO DESCONHECIDA', amount: -10 },
    ]);

    expect(supabase._query.upsert).toHaveBeenCalledOnce();
    const upsertArg = supabase._query.upsert.mock.calls[0][0];
    expect(upsertArg).toHaveLength(1); // apenas ifood, não 'outros'
    expect(upsertArg[0]).toMatchObject({ category: 'delivery' });
  });

  it('não chama upsert quando todas as transações são "outros"', async () => {
    const supabase = makeMockSupabase();
    await categorizeBatch(supabase as never, [
      { id: 'tx1', description: 'XYZ DESCONHECIDO', amount: -10 },
    ]);
    expect(supabase._query.upsert).not.toHaveBeenCalled();
  });

  it('retorna mapa vazio para batch vazio', async () => {
    const supabase = makeMockSupabase();
    const result = await categorizeBatch(supabase as never, []);
    expect(result.size).toBe(0);
  });
});

// ─── saveCategorizations ──────────────────────────────────────────────────────

describe('saveCategorizations', () => {
  it('atualiza cada transação com categoria e source', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    const supabase = { from: vi.fn().mockReturnValue({ update: mockUpdate }) };

    await saveCategorizations(supabase as never, [
      { id: 'tx1', category: 'delivery', categorySource: 'ai', categoryConfidence: 0.95 },
      { id: 'tx2', category: 'transporte', categorySource: 'cache' },
    ]);

    expect(mockUpdate).toHaveBeenCalledTimes(2);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'delivery', category_source: 'ai', category_confidence: 0.95 }),
    );
  });

  it('não faz nada quando updates é vazio', async () => {
    const supabase = { from: vi.fn() };
    await saveCategorizations(supabase as never, []);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

// ─── Accuracy test com dataset brasileiro ─────────────────────────────────────

describe('Accuracy com dataset de 100 transações brasileiras', () => {
  it('≥ 85% de acurácia nas categorias esperadas via keyword rules (AC9)', async () => {
    const fixtures = JSON.parse(
      readFileSync(join(process.cwd(), 'tests/fixtures/transactions-br-100.json'), 'utf-8'),
    ) as { description: string; amount: number; expected: string }[];

    const supabase = makeMockSupabase();

    const transactions = fixtures.map((f, i) => ({
      id: `tx-${i}`,
      description: f.description,
      amount: f.amount,
    }));

    const result = await categorizeBatch(supabase as never, transactions);

    let correct = 0;
    const mismatches: string[] = [];
    for (let i = 0; i < fixtures.length; i++) {
      const got = result.get(`tx-${i}`)?.category;
      const expected = fixtures[i].expected;
      if (got === expected) {
        correct++;
      } else {
        mismatches.push(`  "${fixtures[i].description}" → got=${got}, expected=${expected}`);
      }
    }

    const accuracy = correct / fixtures.length;
    console.log(`Accuracy: ${(accuracy * 100).toFixed(1)}% (${correct}/${fixtures.length})`);
    if (mismatches.length > 0) {
      console.log('Mismatches:\n' + mismatches.join('\n'));
    }

    expect(accuracy).toBeGreaterThanOrEqual(0.85);
  });
});
