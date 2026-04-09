import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CATEGORIES } from '@/lib/billing/plans';
import { formatCurrency } from '@/lib/utils/format';
import { sanitizeCategory } from '@/lib/utils/categories';

// Gets or creates the manual bank account for the user.
// Uses the user-session client so RLS (auth.uid() = user_id) is satisfied without
// needing to rely on service-role behaviour. Accepts both 'Manual' (legacy name
// created by the transactions form) and 'Lançamentos Manuais' so existing accounts
// are reused rather than duplicated.
async function getOrCreateManualAccount(userSupabase: SupabaseClient, userId: string): Promise<string> {
  const { data: existing } = await userSupabase
    .from('bank_accounts')
    .select('id')
    .eq('user_id', userId)
    .in('bank_name', ['Manual', 'Lançamentos Manuais'])
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing) return existing.id as string;

  const { data: created, error } = await userSupabase
    .from('bank_accounts')
    .insert({ user_id: userId, bank_name: 'Manual', account_label: 'Lançamentos manuais' })
    .select('id')
    .single();

  if (error || !created) throw new Error(`Falha ao criar conta manual: ${error?.message}`);

  return created.id as string;
}

// Factory function — userId and supabaseAdmin captured via closure.
// tool.execute only receives (args, options) per the Vercel AI SDK v6 API.
// supabaseAdmin is the service role client (writes bypass RLS, user_id WHERE enforced).
// userSupabase is the user-session client used for operations that must go through RLS
// (e.g., bank_account lookup/creation, where the user's JWT is required).
export function makeProTools(userId: string, supabaseAdmin: SupabaseClient, userSupabase: SupabaseClient) {
  // Accept predefined OR any custom string (max 50 chars, non-empty)
  // NOTE: no .transform() here — zodSchema() from AI SDK does not support Zod transforms.
  // Sanitization is applied manually inside each execute function.
  const categorySchema = z.string().min(1).max(50)
    .describe(`Categoria da transação. Predefinidas: ${CATEGORIES.join(', ')}. Ou qualquer categoria personalizada (ex: "loja", "pet", "beleza")`);
  type CategoryType = string;

  return {
    // ── Busca ──────────────────────────────────────────────────────────────────

    search_transactions: tool({
      description:
        'Busca transações do usuário por descrição, categoria, data ou valor. Use SEMPRE antes de editar ou excluir uma transação para obter o ID correto.',
      inputSchema: zodSchema(
        z.object({
          query: z.string().optional().describe('Texto para buscar na descrição (busca parcial, case-insensitive)'),
          category: categorySchema.optional().describe('Filtrar por categoria'),
          dateFrom: z.string().optional().describe('Data inicial no formato YYYY-MM-DD'),
          dateTo: z.string().optional().describe('Data final no formato YYYY-MM-DD'),
          limit: z.number().int().min(1).max(20).default(10).describe('Máximo de resultados (padrão 10, máximo 20)'),
        }),
      ),
      execute: async ({ query, category, dateFrom, dateTo, limit }: {
        query?: string;
        category?: CategoryType;
        dateFrom?: string;
        dateTo?: string;
        limit: number;
      }) => {
        // Always scope to this user — never allow cross-user data access
        let q = supabaseAdmin
          .from('transactions')
          .select('id, date, description, amount, type, category')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(limit);

        if (query) q = q.ilike('description', `%${query}%`);
        if (category) q = q.eq('category', category);
        if (dateFrom) q = q.gte('date', dateFrom);
        if (dateTo) q = q.lte('date', dateTo);

        const { data, error } = await q;

        if (error) return { success: false, error: error.message };

        const results = (data ?? []).map((t) => ({
          id: t.id as string,
          date: t.date as string,
          description: t.description as string,
          amount: formatCurrency(Math.abs(t.amount as number)),
          type: t.type as string,
          category: t.category as string,
        }));

        return {
          success: true,
          count: results.length,
          transactions: results,
        };
      },
    }),

    // ── Criação ────────────────────────────────────────────────────────────────

    create_transaction: tool({
      description:
        'Cria uma receita ou despesa manualmente para o usuário. Use para frases como "gastei R$80 no supermercado", "recebi R$3000 de salário".',
      inputSchema: zodSchema(
        z.object({
          date: z.string().describe('Data no formato YYYY-MM-DD'),
          description: z.string().describe('Descrição breve da transação'),
          amount: z
            .number()
            .describe('Valor: positivo para receita/crédito, negativo para despesa/débito'),
          category: categorySchema.describe('Categoria da transação'),
        }),
      ),
      execute: async ({ date, description, amount, category }: {
        date: string;
        description: string;
        amount: number;
        category: CategoryType;
      }) => {
        try {
          const bankAccountId = await getOrCreateManualAccount(userSupabase, userId);
          // external_id is NOT NULL with unique(user_id, bank_account_id, external_id)
          const externalId = `manual-${crypto.randomUUID()}`;
          const { data, error } = await supabaseAdmin
            .from('transactions')
            .insert({
              user_id: userId,
              bank_account_id: bankAccountId,
              external_id: externalId,
              date,
              description,
              amount,
              type: amount >= 0 ? 'credit' : 'debit',
              category: sanitizeCategory(category),
              category_source: 'user',
            })
            .select('id')
            .single();

          if (error) return { success: false, error: error.message };

          return {
            success: true,
            transactionId: data.id as string,
            message: `Transação criada: ${description} — ${formatCurrency(Math.abs(amount))}`,
          };
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : 'Erro ao criar transação' };
        }
      },
    }),

    // ── Edição ─────────────────────────────────────────────────────────────────

    update_transaction: tool({
      description:
        'Edita campos de uma transação existente (data, descrição, valor, categoria). Use search_transactions primeiro para obter o ID. Permite corrigir erros em transações já criadas.',
      inputSchema: zodSchema(
        z.object({
          transactionId: z.string().uuid().describe('ID UUID da transação a editar'),
          date: z.string().optional().describe('Nova data no formato YYYY-MM-DD'),
          description: z.string().min(1).optional().describe('Nova descrição'),
          amount: z.number().optional().describe('Novo valor: positivo para receita, negativo para despesa'),
          category: categorySchema.optional().describe('Nova categoria'),
        }),
      ),
      execute: async ({ transactionId, date, description, amount, category }: {
        transactionId: string;
        date?: string;
        description?: string;
        amount?: number;
        category?: CategoryType;
      }) => {
        // Ownership check — always enforce user_id to prevent cross-user edits
        const { data: existing } = await supabaseAdmin
          .from('transactions')
          .select('description, user_id')
          .eq('id', transactionId)
          .eq('user_id', userId)
          .single();

        if (!existing) {
          return { success: false, error: 'Transação não encontrada ou sem permissão' };
        }

        // Build partial update — only include fields explicitly provided
        const updates: Record<string, unknown> = {};
        if (date !== undefined) updates.date = date;
        if (description !== undefined) updates.description = description;
        if (amount !== undefined) {
          updates.amount = amount;
          updates.type = amount >= 0 ? 'credit' : 'debit';
        }
        if (category !== undefined) {
          updates.category = sanitizeCategory(category);
          updates.category_source = 'user';
        }

        if (Object.keys(updates).length === 0) {
          return { success: false, error: 'Nenhum campo para atualizar foi fornecido' };
        }

        const { error } = await supabaseAdmin
          .from('transactions')
          .update(updates)
          .eq('id', transactionId)
          .eq('user_id', userId); // second WHERE for defense-in-depth

        if (error) return { success: false, error: error.message };

        return {
          success: true,
          message: `Transação "${existing.description as string}" atualizada com sucesso`,
        };
      },
    }),

    update_transaction_category: tool({
      description:
        'Recategoriza uma transação existente. Use search_transactions primeiro para obter o ID. Alternativa mais direta ao update_transaction quando só a categoria muda.',
      inputSchema: zodSchema(
        z.object({
          transactionId: z.string().uuid().describe('ID UUID da transação a recategorizar'),
          newCategory: categorySchema.describe('Nova categoria'),
        }),
      ),
      execute: async ({ transactionId, newCategory }: { transactionId: string; newCategory: CategoryType }) => {
        // Ownership check: ensure the transaction belongs to this user
        const { data: existing } = await supabaseAdmin
          .from('transactions')
          .select('description, user_id')
          .eq('id', transactionId)
          .eq('user_id', userId)
          .single();

        if (!existing) {
          return { success: false, error: 'Transação não encontrada ou sem permissão' };
        }

        const sanitized = sanitizeCategory(newCategory);
        const { error } = await supabaseAdmin
          .from('transactions')
          .update({ category: sanitized, category_source: 'user' })
          .eq('id', transactionId)
          .eq('user_id', userId);

        if (error) return { success: false, error: error.message };

        return {
          success: true,
          message: `Categoria de "${existing.description as string}" atualizada para ${sanitized}`,
        };
      },
    }),

    // ── Exclusão ───────────────────────────────────────────────────────────────

    delete_transaction: tool({
      description:
        'Exclui uma transação. Use search_transactions primeiro para obter o ID. SEMPRE solicite confirmação do usuário antes de excluir.',
      inputSchema: zodSchema(
        z.object({
          transactionId: z.string().uuid().describe('ID UUID da transação a excluir'),
          confirmed: z
            .boolean()
            .describe(
              'false = mostrar detalhes e pedir confirmação ao usuário; true = excluir após confirmação recebida',
            ),
        }),
      ),
      execute: async ({ transactionId, confirmed }: { transactionId: string; confirmed: boolean }) => {
        // Ownership check
        const { data: existing } = await supabaseAdmin
          .from('transactions')
          .select('description, amount, user_id')
          .eq('id', transactionId)
          .eq('user_id', userId)
          .single();

        if (!existing) {
          return { success: false, error: 'Transação não encontrada ou sem permissão' };
        }

        if (!confirmed) {
          return {
            requiresConfirmation: true,
            transactionDescription: `${existing.description as string} — ${formatCurrency(Math.abs(existing.amount as number))}`,
          };
        }

        const { error } = await supabaseAdmin
          .from('transactions')
          .delete()
          .eq('id', transactionId)
          .eq('user_id', userId);

        if (error) return { success: false, error: error.message };

        return {
          success: true,
          message: `Transação "${existing.description as string}" excluída com sucesso`,
        };
      },
    }),

    // ── Orçamentos e Objetivos ─────────────────────────────────────────────────

    create_budget: tool({
      description:
        'Cria ou atualiza um orçamento mensal para uma categoria. Use para "quero gastar no máximo R$600 com alimentação", "limite R$200 para lazer".',
      inputSchema: zodSchema(
        z.object({
          category: categorySchema.describe('Categoria do orçamento'),
          monthlyLimit: z.number().positive().describe('Limite mensal em reais (valor positivo)'),
        }),
      ),
      execute: async ({ category, monthlyLimit }: { category: CategoryType; monthlyLimit: number }) => {
        const sanitizedCategory = sanitizeCategory(category);
        const { data, error } = await supabaseAdmin
          .from('budgets')
          .upsert(
            { user_id: userId, category: sanitizedCategory, monthly_limit: monthlyLimit },
            { onConflict: 'user_id,category' },
          )
          .select('id, category, monthly_limit')
          .single();

        if (error) return { success: false, error: error.message };

        return {
          success: true,
          message: `Orçamento de ${formatCurrency(monthlyLimit)}/mês criado para ${data.category as string}`,
        };
      },
    }),

    // ── Agendamentos e Fluxo de Caixa ─────────────────────────────────────────

    list_scheduled_transactions: tool({
      description:
        'Lista contas a pagar e a receber agendadas do usuário. Use para responder perguntas como "o que tenho para pagar este mês?", "quais contas estão atrasadas?", "quanto vence na próxima semana?".',
      inputSchema: zodSchema(
        z.object({
          status: z.enum(['pending', 'overdue', 'paid', 'canceled']).optional()
            .describe('Filtrar por status. Omitir para retornar pending + overdue.'),
          type: z.enum(['credit', 'debit']).optional()
            .describe('credit = receitas, debit = despesas. Omitir para ambos.'),
          from: z.string().optional().describe('Data inicial YYYY-MM-DD (padrão: hoje)'),
          to: z.string().optional().describe('Data final YYYY-MM-DD (padrão: fim do mês corrente)'),
        }),
      ),
      execute: async ({ status, type, from, to }: {
        status?: 'pending' | 'overdue' | 'paid' | 'canceled';
        type?: 'credit' | 'debit';
        from?: string;
        to?: string;
      }) => {
        const today = new Date().toISOString().slice(0, 10);
        const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
          .toISOString().slice(0, 10);

        const fromDate = from ?? today;
        const toDate = to ?? endOfMonth;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let q = (supabaseAdmin as any)
          .from('scheduled_transactions')
          .select('id, description, amount, type, due_date, status, category')
          .eq('user_id', userId)
          .gte('due_date', fromDate)
          .lte('due_date', toDate)
          .order('due_date', { ascending: true })
          .limit(20);

        if (status) {
          q = q.eq('status', status);
        } else {
          q = q.in('status', ['pending', 'overdue']);
        }
        if (type) q = q.eq('type', type);

        const { data, error } = await q as { data: Array<{
          id: string; description: string; amount: number;
          type: string; due_date: string; status: string; category: string;
        }> | null; error: { message: string } | null };

        if (error) return { success: false, error: error.message };

        const items = (data ?? []).map((t) => ({
          description: t.description,
          amount: formatCurrency(Math.abs(t.amount)),
          type: t.type === 'credit' ? 'receita' : 'despesa',
          dueDate: t.due_date,
          status: t.status,
          category: t.category,
        }));

        const totalAPagar = (data ?? [])
          .filter((t) => t.type === 'debit')
          .reduce((s, t) => s + Math.abs(t.amount), 0);
        const totalAReceber = (data ?? [])
          .filter((t) => t.type === 'credit')
          .reduce((s, t) => s + Math.abs(t.amount), 0);

        return {
          success: true,
          count: items.length,
          totalAPagar: formatCurrency(totalAPagar),
          totalAReceber: formatCurrency(totalAReceber),
          items,
        };
      },
    }),

    get_cash_flow_projection: tool({
      description:
        'Retorna a projeção de fluxo de caixa com base nas contas agendadas. Use para perguntas como "como fica meu saldo no fim do mês?", "tenho dinheiro sobrando nos próximos 30 dias?", "qual meu saldo projetado?".',
      inputSchema: zodSchema(
        z.object({
          months: z.number().int().min(1).max(3).default(1)
            .describe('Meses à frente para projetar (1-3, padrão 1)'),
        }),
      ),
      execute: async ({ months }: { months: number }) => {
        const today = new Date().toISOString().slice(0, 10);
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + months);
        const to = endDate.toISOString().slice(0, 10);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: scheduled, error: schedError } = await (supabaseAdmin as any)
          .from('scheduled_transactions')
          .select('due_date, amount, type, status')
          .eq('user_id', userId)
          .gte('due_date', today)
          .lte('due_date', to)
          .in('status', ['pending', 'overdue']) as {
            data: Array<{ due_date: string; amount: number; type: string; status: string }> | null;
            error: { message: string } | null;
          };

        if (schedError) return { success: false, error: schedError.message };

        const { data: balanceRows } = await supabaseAdmin
          .from('transactions')
          .select('amount')
          .eq('user_id', userId);

        const currentBalance = (balanceRows ?? []).reduce(
          (s: number, t: { amount: number }) => s + (t.amount as number),
          0,
        );

        const aPagar = (scheduled ?? [])
          .filter((t) => t.type === 'debit')
          .reduce((s, t) => s + Math.abs(t.amount), 0);
        const aReceber = (scheduled ?? [])
          .filter((t) => t.type === 'credit')
          .reduce((s, t) => s + Math.abs(t.amount), 0);
        const projetado = currentBalance + aReceber - aPagar;

        return {
          success: true,
          saldoAtual: formatCurrency(currentBalance),
          totalAPagar: formatCurrency(aPagar),
          totalAReceber: formatCurrency(aReceber),
          saldoProjetado: formatCurrency(projetado),
          periodo: `${today} a ${to}`,
          situacao: projetado >= 0 ? 'positivo' : 'negativo',
          items: (scheduled ?? []).slice(0, 10).map((t) => ({
            description: t.type === 'debit' ? `Despesa` : `Receita`,
            amount: formatCurrency(Math.abs(t.amount)),
            dueDate: t.due_date,
            type: t.type === 'credit' ? 'receita' : 'despesa',
          })),
        };
      },
    }),

    create_goal: tool({
      description:
        'Cria um objetivo financeiro com meta e prazo. Use para "quero juntar R$5000 até dezembro", "meta de R$10000 para viagem em junho".',
      inputSchema: zodSchema(
        z.object({
          name: z.string().describe('Nome do objetivo (ex: "Viagem para Europa")'),
          targetAmount: z.number().positive().describe('Valor alvo em reais'),
          targetDate: z.string().describe('Data alvo no formato YYYY-MM-DD'),
        }),
      ),
      execute: async ({ name, targetAmount, targetDate }: { name: string; targetAmount: number; targetDate: string }) => {
        const { data, error } = await supabaseAdmin
          .from('goals')
          .insert({
            user_id: userId,
            name,
            target_amount: targetAmount,
            deadline: targetDate,
          })
          .select('id, name, target_amount, deadline')
          .single();

        if (error) return { success: false, error: error.message };

        return {
          success: true,
          message: `Objetivo "${data.name as string}" criado — meta: ${formatCurrency(data.target_amount as number)} até ${data.deadline as string}`,
        };
      },
    }),
  };
}
