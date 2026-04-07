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
          eq: vi.fn().mockReturnValue({
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

// Helper to call execute (non-null assertion — execute always defined in our tools)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function run(tool: { execute?: (...a: any[]) => any }, args: Record<string, unknown>, ctxId: string) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return tool.execute!(args, CTX(ctxId)) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// create_transaction
// ---------------------------------------------------------------------------
describe('create_transaction', () => {
  it('insere transação e retorna sucesso com mensagem', async () => {
    const db = makeDb({ insertData: { id: 'tx-123' } });
    const tools = makeProTools(USER_ID, db);

    const result = await run(tools.create_transaction, {
      date: '2026-04-07', description: 'iFood', amount: -50, category: 'delivery',
    }, 'tc-1');

    expect(result.success).toBe(true);
    expect(result.transactionId).toBe('tx-123');
    expect(result.message as string).toContain('iFood');
  });

  it('seta type=debit para amount negativo e user_id do closure', async () => {
    const db = makeDb({ insertData: { id: 'tx-debit' } });
    const tools = makeProTools(USER_ID, db);

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
    const tools = makeProTools(USER_ID, db);

    await run(tools.create_transaction, {
      date: '2026-04-07', description: 'Salário', amount: 3000, category: 'salario',
    }, 'tc-3');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insertCall = (db.from('transactions').insert as any).mock.calls[0][0];
    expect(insertCall.type).toBe('credit');
  });
});

// ---------------------------------------------------------------------------
// update_transaction_category
// ---------------------------------------------------------------------------
describe('update_transaction_category', () => {
  it('recategoriza quando transação pertence ao usuário', async () => {
    const db = makeDb({ selectData: { description: 'Uber', user_id: USER_ID } });
    const tools = makeProTools(USER_ID, db);

    const result = await run(tools.update_transaction_category, {
      transactionId: 'tx-999', newCategory: 'transporte',
    }, 'tc-4');

    expect(result.success).toBe(true);
    expect(result.message as string).toContain('transporte');
  });

  it('retorna erro quando transação não pertence ao usuário (ownership check)', async () => {
    const db = makeDb({ selectData: null });
    const tools = makeProTools(USER_ID, db);

    const result = await run(tools.update_transaction_category, {
      transactionId: 'tx-other', newCategory: 'lazer',
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
    const tools = makeProTools(USER_ID, db);

    const result = await run(tools.delete_transaction, {
      transactionId: 'tx-del', confirmed: false,
    }, 'tc-6');

    expect(result.requiresConfirmation).toBe(true);
    expect(result.transactionDescription as string).toContain('Amazon');
  });

  it('exclui quando confirmed=true', async () => {
    const db = makeDb({ selectData: { description: 'Amazon', amount: -120, user_id: USER_ID } });
    const tools = makeProTools(USER_ID, db);

    const result = await run(tools.delete_transaction, {
      transactionId: 'tx-del', confirmed: true,
    }, 'tc-7');

    expect(result.success).toBe(true);
  });

  it('retorna erro quando transação não pertence ao usuário', async () => {
    const db = makeDb({ selectData: null });
    const tools = makeProTools(USER_ID, db);

    const result = await run(tools.delete_transaction, {
      transactionId: 'tx-ghost', confirmed: true,
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
    const tools = makeProTools(USER_ID, db);

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
      insertData: { id: 'goal-1', name: 'Viagem', target_amount: 5000, target_date: '2026-12-01' },
    });
    const tools = makeProTools(USER_ID, db);

    const result = await run(tools.create_goal, {
      name: 'Viagem', targetAmount: 5000, targetDate: '2026-12-01',
    }, 'tc-10');

    expect(result.success).toBe(true);
    expect(result.message as string).toContain('Viagem');
  });
});
