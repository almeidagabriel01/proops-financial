import { describe, it, expect, vi } from 'vitest';
import { makeProTools } from '@/lib/ai/tools';
import type { SupabaseClient } from '@supabase/supabase-js';

const USER_ID = 'user-uuid-test';
const ABORT = new AbortController().signal;
const CTX = (id: string) => ({ messages: [] as never[], abortSignal: ABORT, toolCallId: id });

// ---------------------------------------------------------------------------
// Supabase mock factory — chainable: from().{insert|select|update|delete|upsert}
// ---------------------------------------------------------------------------
function makeDb(overrides: {
  insertData?: Record<string, unknown>;
  selectData?: Record<string, unknown> | null;
  updateError?: string;
  deleteError?: string;
} = {}) {
  const { insertData, selectData, updateError, deleteError } = overrides;

  const defaultSelect = selectData !== undefined
    ? selectData
    : { description: 'Test Tx', amount: -80, user_id: USER_ID };

  return {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: insertData ?? { id: 'new-uuid' },
            error: null,
          }),
        }),
      }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          // maybeSingle used when only one .eq() in chain (fallback)
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'mock-account-id' },
            error: null,
          }),
          // .in() chain — used by getOrCreateManualAccount (eq(user_id).in(bank_name,[...]))
          in: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'mock-account-id' },
                  error: null,
                }),
              }),
            }),
          }),
          // second .eq() — used by ownership checks (id + user_id) in update/delete
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'mock-account-id' },
              error: null,
            }),
            single: vi.fn().mockResolvedValue({
              data: defaultSelect,
              error: null,
            }),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: updateError ? { message: updateError } : null,
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: deleteError ? { message: deleteError } : null,
          }),
        }),
      }),
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'budget-uuid', category: 'delivery', monthly_limit: 600 },
            error: null,
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}

// ---------------------------------------------------------------------------
// Builder mock for search_transactions — supports chainable query builder
// The Supabase query builder is thenable: await q resolves directly.
// ---------------------------------------------------------------------------
function makeSearchDb(rows: Record<string, unknown>[], error: string | null = null) {
  // Each builder method returns `this` so the chain resolves at the end
  const query: Record<string, unknown> = {
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    // Thenable: when code does `const { data, error } = await q`, this runs
    then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
      return Promise.resolve({ data: rows, error: error ? { message: error } : null }).then(resolve, reject);
    },
  };

  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue(query),
    }),
  } as unknown as SupabaseClient;
}

// Helper to call execute (non-null assertion — execute always defined in our tools)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function run(tool: { execute?: (...a: any[]) => any }, args: Record<string, unknown>, ctxId: string) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return tool.execute!(args, CTX(ctxId)) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// search_transactions
// ---------------------------------------------------------------------------
describe('search_transactions', () => {
  it('retorna lista de transações do usuário', async () => {
    const rows = [
      { id: 'tx-1', date: '2026-04-08', description: 'iFood', amount: -50, type: 'debit', category: 'delivery' },
    ];
    const db = makeSearchDb(rows);
    const tools = makeProTools(USER_ID, db, db);

    const result = await run(tools.search_transactions, { query: 'iFood', limit: 10 }, 'sc-1');

    expect(result.success).toBe(true);
    expect(result.count).toBe(1);
    expect((result.transactions as { description: string }[])[0].description).toBe('iFood');
  });

  it('retorna lista vazia quando não há resultados', async () => {
    const db = makeSearchDb([]);
    const tools = makeProTools(USER_ID, db, db);

    const result = await run(tools.search_transactions, { query: 'inexistente', limit: 10 }, 'sc-2');

    expect(result.success).toBe(true);
    expect(result.count).toBe(0);
  });

  it('propaga erro do banco de dados', async () => {
    const db = makeSearchDb([], 'connection refused');
    const tools = makeProTools(USER_ID, db, db);

    const result = await run(tools.search_transactions, { limit: 10 }, 'sc-3');

    expect(result.success).toBe(false);
    expect(result.error as string).toContain('connection refused');
  });
});

// ---------------------------------------------------------------------------
// create_transaction
// ---------------------------------------------------------------------------
describe('create_transaction', () => {
  it('insere transação e retorna sucesso com mensagem', async () => {
    const db = makeDb({ insertData: { id: 'tx-123' } });
    const tools = makeProTools(USER_ID, db, db);

    const result = await run(tools.create_transaction, {
      date: '2026-04-07', description: 'iFood', amount: -50, category: 'delivery',
    }, 'tc-1');

    expect(result.success).toBe(true);
    expect(result.transactionId).toBe('tx-123');
    expect(result.message as string).toContain('iFood');
  });

  it('seta type=debit para amount negativo e user_id do closure', async () => {
    const db = makeDb({ insertData: { id: 'tx-debit' } });
    const tools = makeProTools(USER_ID, db, db);

    await run(tools.create_transaction, {
      date: '2026-04-07', description: 'Compra', amount: -100, category: 'compras',
    }, 'tc-2');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insertCall = (db.from('transactions').insert as any).mock.calls[0][0];
    expect(insertCall.type).toBe('debit');
    expect(insertCall.user_id).toBe(USER_ID);
    expect(insertCall.category_source).toBe('user');
  });

  it('seta type=credit para amount positivo', async () => {
    const db = makeDb({ insertData: { id: 'tx-credit' } });
    const tools = makeProTools(USER_ID, db, db);

    await run(tools.create_transaction, {
      date: '2026-04-07', description: 'Salário', amount: 3000, category: 'salario',
    }, 'tc-3');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insertCall = (db.from('transactions').insert as any).mock.calls[0][0];
    expect(insertCall.type).toBe('credit');
  });

  it('inclui external_id no insert (coluna NOT NULL)', async () => {
    const db = makeDb({ insertData: { id: 'tx-ext' } });
    const tools = makeProTools(USER_ID, db, db);

    await run(tools.create_transaction, {
      date: '2026-04-08', description: 'Teste', amount: -10, category: 'outros',
    }, 'tc-ext');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insertCall = (db.from('transactions').insert as any).mock.calls[0][0];
    expect(insertCall.external_id).toMatch(/^manual-/);
  });
});

// ---------------------------------------------------------------------------
// update_transaction
// ---------------------------------------------------------------------------
describe('update_transaction', () => {
  it('atualiza campos fornecidos e retorna sucesso', async () => {
    const db = makeDb({ selectData: { description: 'iFood', user_id: USER_ID } });
    const tools = makeProTools(USER_ID, db, db);

    const result = await run(tools.update_transaction, {
      transactionId: 'aaaaaaaa-0000-0000-0000-000000000001',
      date: '2026-04-08',
      amount: -75,
    }, 'ut-1');

    expect(result.success).toBe(true);
    expect(result.message as string).toContain('iFood');
  });

  it('recalcula type ao atualizar amount', async () => {
    const db = makeDb({ selectData: { description: 'Salário', user_id: USER_ID } });
    const tools = makeProTools(USER_ID, db, db);

    await run(tools.update_transaction, {
      transactionId: 'aaaaaaaa-0000-0000-0000-000000000002',
      amount: 3000,
    }, 'ut-2');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateCall = (db.from('transactions').update as any).mock.calls[0][0];
    expect(updateCall.type).toBe('credit');
    expect(updateCall.amount).toBe(3000);
  });

  it('retorna erro quando nenhum campo é fornecido', async () => {
    const db = makeDb({ selectData: { description: 'Teste', user_id: USER_ID } });
    const tools = makeProTools(USER_ID, db, db);

    const result = await run(tools.update_transaction, {
      transactionId: 'aaaaaaaa-0000-0000-0000-000000000003',
    }, 'ut-3');

    expect(result.success).toBe(false);
    expect(result.error as string).toContain('Nenhum campo');
  });

  it('retorna erro quando transação não pertence ao usuário', async () => {
    const db = makeDb({ selectData: null });
    const tools = makeProTools(USER_ID, db, db);

    const result = await run(tools.update_transaction, {
      transactionId: 'aaaaaaaa-0000-0000-0000-000000000004',
      date: '2026-04-08',
    }, 'ut-4');

    expect(result.success).toBe(false);
    expect(result.error as string).toContain('não encontrada');
  });
});

// ---------------------------------------------------------------------------
// update_transaction_category
// ---------------------------------------------------------------------------
describe('update_transaction_category', () => {
  it('recategoriza quando transação pertence ao usuário', async () => {
    const db = makeDb({ selectData: { description: 'Uber', user_id: USER_ID } });
    const tools = makeProTools(USER_ID, db, db);

    const result = await run(tools.update_transaction_category, {
      transactionId: 'aaaaaaaa-0000-0000-0000-000000000005', newCategory: 'transporte',
    }, 'tc-4');

    expect(result.success).toBe(true);
    expect(result.message as string).toContain('transporte');
  });

  it('retorna erro quando transação não pertence ao usuário (ownership check)', async () => {
    const db = makeDb({ selectData: null });
    const tools = makeProTools(USER_ID, db, db);

    const result = await run(tools.update_transaction_category, {
      transactionId: 'aaaaaaaa-0000-0000-0000-000000000006', newCategory: 'lazer',
    }, 'tc-5');

    expect(result.success).toBe(false);
    expect(result.error as string).toContain('não encontrada');
  });
});

// ---------------------------------------------------------------------------
// delete_transaction
// ---------------------------------------------------------------------------
describe('delete_transaction', () => {
  it('retorna requiresConfirmation quando confirmed=false', async () => {
    const db = makeDb({ selectData: { description: 'Amazon', amount: -120, user_id: USER_ID } });
    const tools = makeProTools(USER_ID, db, db);

    const result = await run(tools.delete_transaction, {
      transactionId: 'aaaaaaaa-0000-0000-0000-000000000007', confirmed: false,
    }, 'tc-6');

    expect(result.requiresConfirmation).toBe(true);
    expect(result.transactionDescription as string).toContain('Amazon');
  });

  it('exclui quando confirmed=true', async () => {
    const db = makeDb({ selectData: { description: 'Amazon', amount: -120, user_id: USER_ID } });
    const tools = makeProTools(USER_ID, db, db);

    const result = await run(tools.delete_transaction, {
      transactionId: 'aaaaaaaa-0000-0000-0000-000000000008', confirmed: true,
    }, 'tc-7');

    expect(result.success).toBe(true);
  });

  it('retorna erro quando transação não pertence ao usuário', async () => {
    const db = makeDb({ selectData: null });
    const tools = makeProTools(USER_ID, db, db);

    const result = await run(tools.delete_transaction, {
      transactionId: 'aaaaaaaa-0000-0000-0000-000000000009', confirmed: true,
    }, 'tc-8');

    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// create_budget
// ---------------------------------------------------------------------------
describe('create_budget', () => {
  it('faz upsert no budgets e retorna mensagem em BRL', async () => {
    const db = makeDb();
    const tools = makeProTools(USER_ID, db, db);

    const result = await run(tools.create_budget, {
      category: 'alimentacao', monthlyLimit: 600,
    }, 'tc-9');

    expect(result.success).toBe(true);
    expect(result.message as string).toContain('R$');
  });
});

// ---------------------------------------------------------------------------
// create_goal
// ---------------------------------------------------------------------------
describe('create_goal', () => {
  it('insere goal e retorna mensagem de confirmação', async () => {
    const db = makeDb({
      insertData: { id: 'goal-1', name: 'Viagem', target_amount: 5000, deadline: '2026-12-01' },
    });
    const tools = makeProTools(USER_ID, db, db);

    const result = await run(tools.create_goal, {
      name: 'Viagem', targetAmount: 5000, targetDate: '2026-12-01',
    }, 'tc-10');

    expect(result.success).toBe(true);
    expect(result.message as string).toContain('Viagem');
  });

  it('retorna erro quando insert falha', async () => {
    const db = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'db error' } }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;
    const tools = makeProTools(USER_ID, db, db);

    const result = await run(tools.create_goal, {
      name: 'Falha', targetAmount: 1000, targetDate: '2026-12-01',
    }, 'goal-err');

    expect(result.success).toBe(false);
    expect(result.error as string).toContain('db error');
  });
});

// ---------------------------------------------------------------------------
// Error paths — create_budget, update_transaction, update_transaction_category,
//               delete_transaction, create_transaction
// ---------------------------------------------------------------------------
describe('Error paths', () => {
  it('create_budget retorna erro quando upsert falha', async () => {
    const db = {
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'upsert fail' } }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;
    const tools = makeProTools(USER_ID, db, db);

    const result = await run(tools.create_budget, { category: 'alimentacao', monthlyLimit: 500 }, 'cb-err');
    expect(result.success).toBe(false);
    expect(result.error as string).toContain('upsert fail');
  });

  it('update_transaction atualiza categoria e propaga erro de banco', async () => {
    const db = makeDb({
      selectData: { description: 'Teste', user_id: USER_ID },
      updateError: 'update failed',
    });
    const tools = makeProTools(USER_ID, db, db);

    const result = await run(tools.update_transaction, {
      transactionId: 'aaaaaaaa-0000-0000-0000-000000000010',
      category: 'lazer',
    }, 'ut-err');

    expect(result.success).toBe(false);
    expect(result.error as string).toContain('update failed');
  });

  it('update_transaction_category retorna erro quando update falha', async () => {
    const db = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { description: 'Mercado', user_id: USER_ID },
                error: null,
              }),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'update error' } }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;
    const tools = makeProTools(USER_ID, db, db);

    const result = await run(tools.update_transaction_category, {
      transactionId: 'aaaaaaaa-0000-0000-0000-000000000011', newCategory: 'compras',
    }, 'utc-err');

    expect(result.success).toBe(false);
    expect(result.error as string).toContain('update error');
  });

  it('delete_transaction retorna erro quando delete falha', async () => {
    const db = makeDb({
      selectData: { description: 'Pix', amount: -200, user_id: USER_ID },
      deleteError: 'delete failed',
    });
    const tools = makeProTools(USER_ID, db, db);

    const result = await run(tools.delete_transaction, {
      transactionId: 'aaaaaaaa-0000-0000-0000-000000000012', confirmed: true,
    }, 'dt-err');

    expect(result.success).toBe(false);
    expect(result.error as string).toContain('delete failed');
  });

  it('create_transaction retorna erro quando insert principal falha', async () => {
    const db = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'bank_accounts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'acct-1' }, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        // transactions insert fails
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'insert fail' } }),
            }),
          }),
        };
      }),
    } as unknown as SupabaseClient;
    const tools = makeProTools(USER_ID, db, db);

    const result = await run(tools.create_transaction, {
      date: '2026-04-01', description: 'Erro', amount: -50, category: 'outros',
    }, 'ct-err');

    expect(result.success).toBe(false);
    expect(result.error as string).toContain('insert fail');
  });
});

// ---------------------------------------------------------------------------
// list_scheduled_transactions
// ---------------------------------------------------------------------------

function makeScheduledDb(
  rows: Record<string, unknown>[],
  error: string | null = null,
) {
  const query: Record<string, unknown> = {
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
      return Promise.resolve({ data: rows, error: error ? { message: error } : null }).then(resolve, reject);
    },
  };

  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue(query),
    }),
  } as unknown as SupabaseClient;
}

describe('list_scheduled_transactions', () => {
  it('retorna pending + overdue por padrão (sem filtro de status)', async () => {
    const rows = [
      { id: 's1', description: 'Aluguel', amount: -1500, type: 'debit', due_date: '2026-04-10', status: 'pending', category: 'moradia' },
    ];
    const db = makeScheduledDb(rows);
    const tools = makeProTools(USER_ID, db, db);

    const result = await run(tools.list_scheduled_transactions, { limit: 10 }, 'ls-1');

    expect(result.success).toBe(true);
    expect(result.count).toBe(1);
  });

  it('filtra por status quando fornecido', async () => {
    const rows = [
      { id: 's2', description: 'Conta de luz', amount: -200, type: 'debit', due_date: '2026-04-05', status: 'overdue', category: 'moradia' },
    ];
    const db = makeScheduledDb(rows);
    const tools = makeProTools(USER_ID, db, db);

    const result = await run(tools.list_scheduled_transactions, { status: 'overdue' }, 'ls-2');

    expect(result.success).toBe(true);
  });

  it('filtra por type=credit (receitas)', async () => {
    const rows = [
      { id: 's3', description: 'Salário', amount: 5000, type: 'credit', due_date: '2026-04-30', status: 'pending', category: 'salario' },
    ];
    const db = makeScheduledDb(rows);
    const tools = makeProTools(USER_ID, db, db);

    const result = await run(tools.list_scheduled_transactions, { type: 'credit' }, 'ls-3');

    expect(result.success).toBe(true);
    expect(result.count).toBe(1);
  });

  it('calcula totalAPagar e totalAReceber corretamente', async () => {
    const rows = [
      { id: 's4', description: 'Aluguel', amount: -2000, type: 'debit', due_date: '2026-04-10', status: 'pending', category: 'moradia' },
      { id: 's5', description: 'Salário', amount: 5000, type: 'credit', due_date: '2026-04-30', status: 'pending', category: 'salario' },
    ];
    const db = makeScheduledDb(rows);
    const tools = makeProTools(USER_ID, db, db);

    const result = await run(tools.list_scheduled_transactions, {}, 'ls-4');

    expect(result.success).toBe(true);
    expect(result.totalAPagar as string).toContain('2.000');
    expect(result.totalAReceber as string).toContain('5.000');
  });

  it('retorna erro quando query falha', async () => {
    const db = makeScheduledDb([], 'timeout');
    const tools = makeProTools(USER_ID, db, db);

    const result = await run(tools.list_scheduled_transactions, {}, 'ls-err');

    expect(result.success).toBe(false);
    expect(result.error as string).toContain('timeout');
  });

  it('retorna lista vazia quando não há agendamentos', async () => {
    const db = makeScheduledDb([]);
    const tools = makeProTools(USER_ID, db, db);

    const result = await run(tools.list_scheduled_transactions, {}, 'ls-empty');

    expect(result.success).toBe(true);
    expect(result.count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// get_cash_flow_projection
// ---------------------------------------------------------------------------

function makeCashFlowDb(
  scheduledRows: Record<string, unknown>[],
  balanceRows: { amount: number }[],
  scheduledError: string | null = null,
) {
  const scheduledQuery: Record<string, unknown> = {
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
      return Promise.resolve({
        data: scheduledRows,
        error: scheduledError ? { message: scheduledError } : null,
      }).then(resolve, reject);
    },
  };

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'scheduled_transactions') {
        return { select: vi.fn().mockReturnValue(scheduledQuery) };
      }
      // transactions table for current balance
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: balanceRows, error: null }),
        }),
      };
    }),
  } as unknown as SupabaseClient;
}

describe('get_cash_flow_projection', () => {
  it('retorna projeção positiva com saldo atual e agendados', async () => {
    const scheduled = [
      { due_date: '2026-04-30', amount: 5000, type: 'credit', status: 'pending' },
      { due_date: '2026-04-15', amount: -1500, type: 'debit', status: 'pending' },
    ];
    const balance = [{ amount: 1000 }, { amount: -200 }];
    const db = makeCashFlowDb(scheduled, balance);
    const tools = makeProTools(USER_ID, db, db);

    const result = await run(tools.get_cash_flow_projection, { months: 1 }, 'cf-1');

    expect(result.success).toBe(true);
    expect(result.situacao).toBe('positivo');
    expect(result.saldoAtual as string).toBeTruthy();
    expect(result.saldoProjetado as string).toBeTruthy();
  });

  it('retorna situacao=negativo quando saldo projetado é negativo', async () => {
    const scheduled = [
      { due_date: '2026-04-15', amount: -10000, type: 'debit', status: 'pending' },
    ];
    const balance = [{ amount: 500 }];
    const db = makeCashFlowDb(scheduled, balance);
    const tools = makeProTools(USER_ID, db, db);

    const result = await run(tools.get_cash_flow_projection, { months: 1 }, 'cf-2');

    expect(result.success).toBe(true);
    expect(result.situacao).toBe('negativo');
  });

  it('retorna erro quando query de agendamentos falha', async () => {
    const db = makeCashFlowDb([], [], 'db timeout');
    const tools = makeProTools(USER_ID, db, db);

    const result = await run(tools.get_cash_flow_projection, { months: 1 }, 'cf-err');

    expect(result.success).toBe(false);
    expect(result.error as string).toContain('db timeout');
  });

  it('projeta múltiplos meses corretamente', async () => {
    const scheduled = [
      { due_date: '2026-05-01', amount: 3000, type: 'credit', status: 'pending' },
    ];
    const db = makeCashFlowDb(scheduled, [{ amount: 2000 }]);
    const tools = makeProTools(USER_ID, db, db);

    const result = await run(tools.get_cash_flow_projection, { months: 3 }, 'cf-3');

    expect(result.success).toBe(true);
    expect(result.periodo as string).toBeTruthy();
  });
});
