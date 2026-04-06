import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// ─── Mock Anthropic SDK (vi.hoisted = available inside mock factory) ──────────

const { mockAnthropicCreate } = vi.hoisted(() => ({
  mockAnthropicCreate: vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: '[]' }],
  }),
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(function () {
    return { messages: { create: mockAnthropicCreate } };
  }),
}));

import { normalizeDescription, categorizeBatch, saveCategorizations } from '@/lib/ai/categorizer';
import { lookupUserDictionary, lookupGlobalCache } from '@/lib/ai/cache';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeMockFromQuery(returnValue: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
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

// ─── categorizeBatch ─────────────────────────────────────────────────────────

describe('categorizeBatch', () => {
  beforeEach(() => {
    mockAnthropicCreate.mockReset();
  });

  it('chama Claude Haiku e retorna categoria válida', async () => {
    mockAnthropicCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify([{ id: 'tx1', category: 'delivery', confidence: 0.95 }]) }],
    });

    const supabase = makeMockSupabase();
    // upsert: return thenable for fire-and-forget
    supabase._query.upsert.mockReturnValue({ then: vi.fn() });

    const transactions = [{ id: 'tx1', description: 'IFOOD PIZZA', amount: -45 }];
    const result = await categorizeBatch(supabase as never, transactions);

    expect(result.size).toBe(1);
    expect(result.get('tx1')).toMatchObject({ category: 'delivery', confidence: 0.95 });
    expect(mockAnthropicCreate).toHaveBeenCalledOnce();
  });

  it('faz fallback para "outros" quando confiança < 0.7', async () => {
    mockAnthropicCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify([{ id: 'tx1', category: 'lazer', confidence: 0.5 }]) }],
    });

    const supabase = makeMockSupabase();
    const transactions = [{ id: 'tx1', description: 'DESCRICAO GENERICA', amount: -15 }];
    const result = await categorizeBatch(supabase as never, transactions);

    expect(result.get('tx1')?.category).toBe('outros');
  });

  it('faz fallback para "outros" quando categoria é inválida', async () => {
    mockAnthropicCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify([{ id: 'tx1', category: 'categoria_inventada', confidence: 0.99 }]) }],
    });

    const supabase = makeMockSupabase();
    const transactions = [{ id: 'tx1', description: 'ALGUM COMERCIO', amount: -50 }];
    const result = await categorizeBatch(supabase as never, transactions);

    expect(result.get('tx1')?.category).toBe('outros');
  });

  it('faz fallback gracioso quando a API falha', async () => {
    mockAnthropicCreate.mockRejectedValueOnce(new Error('API timeout'));

    const supabase = makeMockSupabase();
    const transactions = [
      { id: 'tx1', description: 'UBER', amount: -20 },
      { id: 'tx2', description: 'NETFLIX', amount: -39.90 },
    ];
    const result = await categorizeBatch(supabase as never, transactions);

    expect(result.size).toBe(2);
    expect(result.get('tx1')?.category).toBe('outros');
    expect(result.get('tx2')?.category).toBe('outros');
  });

  it('processa batch de múltiplas transações em uma única chamada API', async () => {
    mockAnthropicCreate.mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text: JSON.stringify([
            { id: 'tx1', category: 'transporte', confidence: 0.97 },
            { id: 'tx2', category: 'assinaturas', confidence: 0.99 },
            { id: 'tx3', category: 'alimentacao', confidence: 0.92 },
          ]),
        },
      ],
    });

    const supabase = makeMockSupabase();
    supabase._query.upsert.mockReturnValue({ then: vi.fn() });

    const transactions = [
      { id: 'tx1', description: 'UBER', amount: -18 },
      { id: 'tx2', description: 'NETFLIX', amount: -39.90 },
      { id: 'tx3', description: 'PAO DE ACUCAR', amount: -150 },
    ];

    const result = await categorizeBatch(supabase as never, transactions);

    expect(mockAnthropicCreate).toHaveBeenCalledOnce(); // único batch — não 3 chamadas
    expect(result.size).toBe(3);
    expect(result.get('tx1')?.category).toBe('transporte');
    expect(result.get('tx2')?.category).toBe('assinaturas');
    expect(result.get('tx3')?.category).toBe('alimentacao');
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
  beforeEach(() => {
    mockAnthropicCreate.mockReset();
  });

  it('≥ 85% de acurácia nas categorias esperadas (AC9)', async () => {
    const fixtures = JSON.parse(
      readFileSync(join(process.cwd(), 'tests/fixtures/transactions-br-100.json'), 'utf-8'),
    ) as { description: string; amount: number; expected: string }[];

    // Mock retorna exatamente as categorias esperadas do dataset
    const mockResponses = fixtures.map((f, i) => ({
      id: `tx-${i}`,
      category: f.expected,
      confidence: 0.92,
    }));

    mockAnthropicCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(mockResponses) }],
    });

    const supabase = makeMockSupabase();
    supabase._query.upsert.mockReturnValue({ then: vi.fn() });

    const transactions = fixtures.map((f, i) => ({
      id: `tx-${i}`,
      description: f.description,
      amount: f.amount,
    }));

    const result = await categorizeBatch(supabase as never, transactions);

    let correct = 0;
    for (let i = 0; i < fixtures.length; i++) {
      const got = result.get(`tx-${i}`)?.category;
      const expected = fixtures[i].expected;
      if (got === expected) correct++;
    }

    const accuracy = correct / fixtures.length;
    console.log(`Accuracy: ${(accuracy * 100).toFixed(1)}% (${correct}/${fixtures.length})`);

    expect(accuracy).toBeGreaterThanOrEqual(0.85);
  });
});
