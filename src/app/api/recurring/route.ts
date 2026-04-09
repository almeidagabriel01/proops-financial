import { createClient } from '@/lib/supabase/server';
import { sanitizeCategory } from '@/lib/utils/categories';
import { addMonths } from '@/lib/installments/generator';

const VALID_FREQUENCIES = ['weekly', 'biweekly', 'monthly', 'annual'] as const;

function calcNextDueDate(startDate: string, frequency: string): string {
  const today = new Date().toISOString().slice(0, 10);
  if (startDate >= today) return startDate;

  // Avançar next_due_date até a próxima ocorrência futura
  let current = startDate;
  while (current < today) {
    switch (frequency) {
      case 'weekly':
        current = addDays(current, 7);
        break;
      case 'biweekly':
        current = addDays(current, 14);
        break;
      case 'annual':
        current = addMonths(current, 12);
        break;
      default: // monthly
        current = addMonths(current, 1);
    }
  }
  return current;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get('status'); // active|paused|canceled
  const limit = parseInt(url.searchParams.get('limit') ?? '100', 10);
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);

  let query = supabase
    .from('recurring_rules')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('next_due_date', { ascending: true })
    .range(offset, offset + limit - 1);

  if (status && ['active', 'paused', 'canceled'].includes(status)) {
    query = query.eq('status', status as 'active' | 'paused' | 'canceled');
  }

  const { data, error, count } = await query;
  if (error) {
    console.error('[recurring GET]', error);
    return Response.json({ error: 'Erro ao buscar recorrentes' }, { status: 500 });
  }

  return Response.json({ data, total: count });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const { description, amount, type, category, frequency, start_date, end_date, bank_account_id } = b;

  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    return Response.json({ error: 'Descrição obrigatória' }, { status: 400 });
  }
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return Response.json({ error: 'Valor inválido' }, { status: 400 });
  }
  if (!type || !['credit', 'debit'].includes(type as string)) {
    return Response.json({ error: 'Tipo inválido (credit ou debit)' }, { status: 400 });
  }
  if (!frequency || !VALID_FREQUENCIES.includes(frequency as typeof VALID_FREQUENCIES[number])) {
    return Response.json({ error: 'Frequência inválida (weekly, biweekly, monthly, annual)' }, { status: 400 });
  }
  if (!start_date || typeof start_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(start_date)) {
    return Response.json({ error: 'Data de início inválida (YYYY-MM-DD)' }, { status: 400 });
  }
  if (!bank_account_id || typeof bank_account_id !== 'string') {
    return Response.json({ error: 'Conta bancária obrigatória' }, { status: 400 });
  }

  const { data: account } = await supabase
    .from('bank_accounts')
    .select('id')
    .eq('id', bank_account_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!account) {
    return Response.json({ error: 'Conta bancária não encontrada' }, { status: 404 });
  }

  const nextDueDate = calcNextDueDate(start_date, frequency as string);

  const { data: rule, error: ruleError } = await supabase
    .from('recurring_rules')
    .insert({
      user_id: user.id,
      bank_account_id: bank_account_id as string,
      description: (description as string).trim().slice(0, 255),
      amount: amount as number,
      type: type as 'credit' | 'debit',
      category: sanitizeCategory(typeof category === 'string' ? category : 'outros'),
      frequency: frequency as 'weekly' | 'biweekly' | 'monthly' | 'annual',
      start_date: start_date as string,
      end_date: (end_date && typeof end_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(end_date)) ? end_date : null,
      next_due_date: nextDueDate,
      status: 'active',
      source: 'manual',
    })
    .select()
    .single();

  if (ruleError || !rule) {
    console.error('[recurring POST]', ruleError);
    return Response.json({ error: 'Erro ao criar recorrente' }, { status: 500 });
  }

  // Gerar próxima instância como scheduled_transaction
  const { error: schedError } = await supabase
    .from('scheduled_transactions')
    .insert({
      user_id: user.id,
      bank_account_id: bank_account_id as string,
      description: (description as string).trim().slice(0, 255),
      amount: amount as number,
      type: type as 'credit' | 'debit',
      category: sanitizeCategory(typeof category === 'string' ? category : 'outros'),
      due_date: nextDueDate,
      status: 'pending',
      recurring_rule_id: rule.id,
    });

  if (schedError) {
    console.error('[recurring POST] scheduled insert error:', schedError);
  }

  return Response.json({ data: rule }, { status: 201 });
}
