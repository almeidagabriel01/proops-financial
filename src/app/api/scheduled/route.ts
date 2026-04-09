import { createClient } from '@/lib/supabase/server';
import { sanitizeCategory } from '@/lib/utils/categories';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get('status'); // pending|paid|overdue|canceled
  const type = url.searchParams.get('type'); // credit|debit
  const from = url.searchParams.get('from'); // YYYY-MM-DD
  const to = url.searchParams.get('to'); // YYYY-MM-DD
  const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('scheduled_transactions')
    .select('*, installment_groups(description, installment_count)', { count: 'exact' })
    .eq('user_id', user.id)
    .order('due_date', { ascending: true })
    .range(offset, offset + limit - 1);

  if (status && ['pending', 'paid', 'overdue', 'canceled'].includes(status)) {
    query = query.eq('status', status as 'pending' | 'paid' | 'overdue' | 'canceled');
  }
  if (type && ['credit', 'debit'].includes(type)) {
    query = query.eq('type', type as 'credit' | 'debit');
  }
  if (from) query = query.gte('due_date', from);
  if (to) query = query.lte('due_date', to);

  const { data, error, count } = await query;
  if (error) {
    console.error('[scheduled GET]', error);
    return Response.json({ error: 'Erro ao buscar agendamentos' }, { status: 500 });
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
  const { description, amount, type, category, due_date, bank_account_id, notes, recurring_rule_id } = b;

  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    return Response.json({ error: 'Descrição obrigatória' }, { status: 400 });
  }
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return Response.json({ error: 'Valor inválido' }, { status: 400 });
  }
  if (!type || !['credit', 'debit'].includes(type as string)) {
    return Response.json({ error: 'Tipo inválido (credit ou debit)' }, { status: 400 });
  }
  if (!due_date || typeof due_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(due_date)) {
    return Response.json({ error: 'Data de vencimento inválida (YYYY-MM-DD)' }, { status: 400 });
  }
  if (!bank_account_id || typeof bank_account_id !== 'string') {
    return Response.json({ error: 'Conta bancária obrigatória' }, { status: 400 });
  }

  // Verificar que a conta pertence ao usuário
  const { data: account } = await supabase
    .from('bank_accounts')
    .select('id')
    .eq('id', bank_account_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!account) {
    return Response.json({ error: 'Conta bancária não encontrada' }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('scheduled_transactions')
    .insert({
      user_id: user.id,
      bank_account_id: bank_account_id as string,
      description: (description as string).trim().slice(0, 255),
      amount: amount as number,
      type: type as 'credit' | 'debit',
      category: sanitizeCategory(typeof category === 'string' ? category : 'outros'),
      due_date: due_date as string,
      status: 'pending',
      notes: notes ? (notes as string).slice(0, 500) : null,
      recurring_rule_id: recurring_rule_id ? (recurring_rule_id as string) : null,
    })
    .select()
    .single();

  if (error) {
    console.error('[scheduled POST]', error);
    return Response.json({ error: 'Erro ao criar agendamento' }, { status: 500 });
  }

  return Response.json({ data }, { status: 201 });
}
