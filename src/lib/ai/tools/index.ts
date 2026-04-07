import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CATEGORIES } from '@/lib/billing/plans';
import { formatCurrency } from '@/lib/utils/format';

// Factory function — userId and supabaseAdmin captured via closure.
// tool.execute only receives (args, options) per the Vercel AI SDK v6 API.
// supabaseAdmin must be the service role client so writes bypass RLS
// (defense-in-depth: user_id WHERE clause still enforced in every execute).
export function makeProTools(userId: string, supabaseAdmin: SupabaseClient) {
  const categorySchema = z.enum(CATEGORIES);
  type CategoryType = z.infer<typeof categorySchema>;

  return {
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
        const { data, error } = await supabaseAdmin
          .from('transactions')
          .insert({
            user_id: userId,
            date,
            description,
            amount,
            type: amount >= 0 ? 'credit' : 'debit',
            category,
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
      },
    }),

    update_transaction_category: tool({
      description:
        'Recategoriza uma transação existente. Use para "muda a categoria do Uber para transporte", "reclassifica aquela compra".',
      inputSchema: zodSchema(
        z.object({
          transactionId: z.string().describe('ID UUID da transação a recategorizar'),
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

        const { error } = await supabaseAdmin
          .from('transactions')
          .update({ category: newCategory, category_source: 'user' })
          .eq('id', transactionId)
          .eq('user_id', userId);

        if (error) return { success: false, error: error.message };

        return {
          success: true,
          message: `Categoria de "${existing.description as string}" atualizada para ${newCategory}`,
        };
      },
    }),

    delete_transaction: tool({
      description:
        'Exclui uma transação. SEMPRE pergunte confirmação antes de excluir — chame primeiro com confirmed=false para confirmar com o usuário.',
      inputSchema: zodSchema(
        z.object({
          transactionId: z.string().describe('ID UUID da transação a excluir'),
          confirmed: z
            .boolean()
            .describe(
              'false = pedir confirmação ao usuário; true = excluir após confirmação recebida',
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
        const { data, error } = await supabaseAdmin
          .from('budgets')
          .upsert(
            { user_id: userId, category, monthly_limit: monthlyLimit },
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
            target_date: targetDate,
          })
          .select('id, name, target_amount, target_date')
          .single();

        if (error) return { success: false, error: error.message };

        return {
          success: true,
          message: `Objetivo "${data.name as string}" criado — meta: ${formatCurrency(data.target_amount as number)} até ${data.target_date as string}`,
        };
      },
    }),
  };
}
